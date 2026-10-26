import { useState, useEffect, useMemo } from 'react'
import api from '../api/axios'
import SchoolPackPanel from './SchoolPackPanel'

/* ═══════════════════════════════════════════════════════════════
   Super Admin → Data tools
   Import students / leads from CSV and export a school's records.
   Only the platform Super Admin sees this; school admins and
   chairmen have no import or export anywhere.
   ═══════════════════════════════════════════════════════════════ */

const CHUNK = 1000

const STUDENT_TEMPLATE = [
  { name: 'Arjun Pillai', roll_number: 'S-010', class: 'Grade 4', section: 'A', dob: '2016-03-12', parent_name: 'Suresh Pillai', phone: '9876500007', email: 'suresh@gmail.com', area: 'Madhapur' },
  { name: 'Deepa Kumar', roll_number: 'S-011', class: 'Grade 2', section: 'B', dob: '2018-07-22', parent_name: 'Rakesh Kumar', phone: '9876500008', email: '', area: 'Gachibowli' },
]
const LEAD_TEMPLATE = [
  { parent_name: 'Sunita Reddy', phone: '9876543210', email: 'sunita@gmail.com', child_grade: 'Grade 4', area: 'Madhapur', lead_source: 'Google Ads', keyword: 'best school', notes: '' },
  { parent_name: 'Mohan Kumar', phone: '9812345678', email: '', child_grade: 'Grade 1', area: 'Gachibowli', lead_source: 'WhatsApp', keyword: '', notes: '' },
]
const SPEC = {
  students: { label: 'Students', required: ['name'], optional: ['roll_number', 'class', 'section', 'dob', 'parent_name', 'phone', 'email', 'area'], template: STUDENT_TEMPLATE,
              note: 'Roll number is made up if blank. A student whose roll number already exists in that school is updated, not duplicated.' },
  leads: { label: 'Leads', required: ['parent_name', 'phone'], optional: ['email', 'child_grade', 'area', 'lead_source', 'keyword', 'notes'], template: LEAD_TEMPLATE,
           note: 'Each lead is scored automatically, and a phone number seen in the last 30 days is flagged as a duplicate. Leads go into the school\'s active academic year.' },
}
const EXPORTS = [
  { key: 'students', icon: '🎓', title: 'Students', text: 'Every student with parent details and status.' },
  { key: 'leads', icon: '📣', title: 'Leads', text: 'All admission leads with stage, source and AI score.' },
  { key: 'fees', icon: '💰', title: 'Fees', text: 'Every fee instalment: amount, paid, dates, mode, status.' },
  { key: 'attendance', icon: '✓', title: 'Attendance', text: 'Daily attendance records for the dates you choose.', dates: true },
]

/* Reads a CSV properly: quoted commas, doubled quotes, Excel's BOM, Windows line endings. */
export function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false
  const src = String(text).replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cur); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cur); cur = ''
      if (row.some(c => c.trim() !== '')) rows.push(row)
      row = []
    } else cur += ch
  }
  row.push(cur); if (row.some(c => c.trim() !== '')) rows.push(row)
  if (!rows.length) return { headers: [], rows: [] }
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const out = rows.slice(1).map(r => { const o = {}; headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim() }); return o })
  return { headers, rows: out }
}

function toCSV(data) {
  const heads = Object.keys(data[0])
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  return [heads.join(','), ...data.map(r => heads.map(h => q(r[h])).join(','))].join('\r\n')
}
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

export default function DataTools({ token, schools, showToast }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } }
  const [schoolId, setSchoolId] = useState('')
  const [mode, setMode] = useState('import')            // import | export
  const [type, setType] = useState('students')
  const [parsed, setParsed] = useState(null)             // { headers, rows, fileName }
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [history, setHistory] = useState([])
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 8) + '01')
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [downloading, setDownloading] = useState('')

  const school = schools.find(s => String(s.id) === String(schoolId))
  const spec = SPEC[type]

  const loadHistory = async () => {
    if (!schoolId) { setHistory([]); return }
    try { const r = await api.get('/superadmin/data/history', { ...auth, params: { school_id: schoolId } }); setHistory(r.data || []) } catch { setHistory([]) }
  }
  useEffect(() => { loadHistory() }, [schoolId])
  useEffect(() => { setParsed(null); setResult(null); setErr('') }, [schoolId, type])

  const problems = useMemo(() => {
    if (!parsed) return []
    const p = []
    const missing = spec.required.filter(c => !parsed.headers.includes(c))
    if (missing.length) p.push(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`)
    if (!parsed.rows.length) p.push('The file has no data rows.')
    return p
  }, [parsed, spec])
  const unknownCols = parsed ? parsed.headers.filter(h => h && ![...spec.required, ...spec.optional, 'grade', 'parent_phone', 'parent_email'].includes(h)) : []

  const onFile = (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setResult(null); setErr('')
    const reader = new FileReader()
    reader.onload = ev => {
      try { setParsed({ ...parseCSV(ev.target.result), fileName: f.name }) }
      catch { setErr('Could not read that file. Please save it as CSV and try again.') }
    }
    reader.readAsText(f)
  }

  const runImport = async () => {
    if (!school || !parsed?.rows.length || problems.length) return
    if (!window.confirm(`Import ${parsed.rows.length.toLocaleString()} ${spec.label.toLowerCase()} into "${school.name}"?\n\nThis adds the data to that school's live records.`)) return
    setBusy(true); setErr(''); setResult(null)
    let success = 0, failed = 0, created = 0, updated = 0; const errors = []; let done = 0
    try {
      for (let i = 0; i < parsed.rows.length; i += CHUNK) {
        const chunk = parsed.rows.slice(i, i + CHUNK)
        setProgress({ done, total: parsed.rows.length })
        const r = await api.post(`/superadmin/data/import/${type}`, { school_id: Number(schoolId), rows: chunk, offset: i }, auth)
        success += r.data.success || 0; failed += r.data.failed || 0; created += r.data.created || 0; updated += r.data.updated || 0
        if (r.data.errors) errors.push(...r.data.errors)
        done += chunk.length
      }
      setResult({ success, failed, created, updated, errors })
      showToast && showToast(`✅ Imported ${success.toLocaleString()} ${spec.label.toLowerCase()} into ${school.name}`)
      setParsed(null); loadHistory()
    } catch (e) {
      setErr((e.response?.data?.message || 'Import stopped.') + (success ? ` ${success.toLocaleString()} rows were already added before it stopped; re-uploading is safe for students (matched by roll number).` : ''))
      if (success) setResult({ success, failed, created, updated, errors })
    } finally { setBusy(false); setProgress(null) }
  }

  const download = async (key) => {
    if (!school) { setErr('Choose a school first.'); return }
    setErr(''); setDownloading(key)
    try {
      const params = { school_id: schoolId }
      if (key === 'attendance') { params.from = from; params.to = to }
      const r = await api.get(`/superadmin/data/export/${key}`, { ...auth, params, responseType: 'blob' })
      const cd = r.headers?.['content-disposition'] || ''
      const name = (cd.match(/filename="?([^";]+)"?/) || [])[1] || `${key}.csv`
      saveBlob(new Blob([r.data], { type: 'text/csv' }), name)
      showToast && showToast(`⬇ ${name}`)
    } catch (e) {
      let msg = 'Export failed.'
      try { msg = JSON.parse(await e.response.data.text()).message || msg } catch { msg = e.response?.data?.message || msg }
      setErr(msg)
    } finally { setDownloading('') }
  }

  const chip = (on) => ({ padding: '7px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--c-brand, #0f9d84)' : '#e5e7eb'), background: on ? 'var(--c-brand-lt, #e6f6f2)' : '#fff', fontWeight: on ? 600 : 400 })

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Data tools</h2>
        <p className="text-gray-400 text-sm mt-1">Import and export are available only here. School admins and chairmen cannot import or export.</p>
      </div>

      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <label className="label" htmlFor="dt-school">School</label>
        <select id="dt-school" className="input" value={schoolId} onChange={e => setSchoolId(e.target.value)}>
          <option value="">— Choose a school —</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ''}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" style={chip(mode === 'import')} onClick={() => setMode('import')}>⬆ Import</button>
          <button type="button" style={chip(mode === 'export')} onClick={() => setMode('export')}>⬇ Export</button>
          <button type="button" style={chip(mode === 'pack')} onClick={() => setMode('pack')}>🗂️ Full school pack</button>
        </div>
      </div>

      {mode === 'pack' && <SchoolPackPanel token={token} school={school} parseCSV={parseCSV} showToast={showToast} />}

      {mode === 'import' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {Object.entries(SPEC).map(([k, v]) => <button key={k} type="button" style={chip(type === k)} onClick={() => setType(k)}>{v.label}</button>)}
              <button type="button" className="btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }}
                onClick={() => saveBlob(new Blob([toCSV(spec.template)], { type: 'text/csv' }), `${type}_template.csv`)}>⬇ Download template</button>
            </div>
            <p className="text-xs text-gray-500" style={{ marginBottom: 4 }}><b>Required:</b> {spec.required.join(', ')} · <b>Optional:</b> {spec.optional.join(', ')}</p>
            <p className="text-xs text-gray-400" style={{ marginBottom: 12 }}>{spec.note}</p>

            <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer" style={{ borderColor: 'var(--c-border-2, #e5e7eb)', opacity: school ? 1 : .5 }}>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={!school || busy} />
              <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>📄</span>
              <p className="text-sm font-medium text-ink">{school ? 'Click to choose a CSV file' : 'Choose a school first'}</p>
            </label>
          </div>

          {parsed && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="text-sm font-semibold text-ink">{parsed.fileName} · {parsed.rows.length.toLocaleString()} rows</p>
              {problems.map(p => <p key={p} className="text-sm" style={{ color: '#dc2626', marginTop: 6 }}>⚠ {p}</p>)}
              {unknownCols.length > 0 && <p className="text-xs text-gray-400" style={{ marginTop: 6 }}>These columns will be ignored: {unknownCols.join(', ')}</p>}
              {parsed.rows.length > 0 && (
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table style={{ fontSize: 12, borderCollapse: 'collapse', minWidth: '100%' }}>
                    <thead><tr>{parsed.headers.map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #eee', color: '#6b7280' }}>{h}</th>)}</tr></thead>
                    <tbody>{parsed.rows.slice(0, 5).map((r, i) => <tr key={i}>{parsed.headers.map(h => <td key={h} style={{ padding: '4px 8px', borderBottom: '1px solid #f5f5f5' }}>{r[h]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
              <button className="btn-primary" style={{ marginTop: 14 }} disabled={busy || problems.length > 0} onClick={runImport}>
                {busy ? `Importing… ${progress ? Math.min(progress.done + CHUNK, progress.total).toLocaleString() : ''} / ${parsed.rows.length.toLocaleString()}`
                      : `Import ${parsed.rows.length.toLocaleString()} ${spec.label.toLowerCase()} into ${school?.name}`}
              </button>
            </div>
          )}

          {result && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid ' + (result.failed ? '#f59e0b' : '#10b981') }}>
              <p className="text-sm font-semibold text-ink">{result.created !== undefined && type === 'students' ? `${result.created.toLocaleString()} added · ${result.updated.toLocaleString()} updated` : `${result.success.toLocaleString()} added`}{result.failed ? ` · ${result.failed.toLocaleString()} failed` : ''}</p>
              {result.errors?.length > 0 && <ul className="text-xs text-gray-500" style={{ marginTop: 6, paddingLeft: 16, listStyle: 'disc' }}>{result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>}
            </div>
          )}

          {school && history.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold text-ink" style={{ marginBottom: 8 }}>Recent imports · {school.name}</p>
              {history.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <span>{h.import_type} · {h.success_rows}/{h.total_rows} ok{h.failed_rows ? `, ${h.failed_rows} failed` : ''}</span>
                  <span className="text-gray-400">{h.imported_by_name} · {new Date(h.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {EXPORTS.map(x => (
            <div key={x.key} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 26 }}>{x.icon}</div>
              <p className="text-sm font-semibold text-ink">{x.title}</p>
              <p className="text-xs text-gray-500" style={{ flex: 1 }}>{x.text}</p>
              {x.dates && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input aria-label="From date" type="date" className="input" style={{ fontSize: 12, padding: '4px 6px' }} value={from} onChange={e => setFrom(e.target.value)} />
                  <input aria-label="To date" type="date" className="input" style={{ fontSize: 12, padding: '4px 6px' }} value={to} onChange={e => setTo(e.target.value)} />
                </div>
              )}
              <button className="btn-primary" style={{ justifyContent: 'center' }} disabled={!school || downloading === x.key} onClick={() => download(x.key)}>
                {downloading === x.key ? 'Preparing…' : `⬇ Download ${x.title} CSV`}
              </button>
            </div>
          ))}
          {!school && <p className="text-xs text-gray-400" style={{ gridColumn: '1 / -1' }}>Choose a school above to enable the downloads.</p>}
        </div>
      )}
    </div>
  )
}