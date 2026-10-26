import { useState, useRef, useEffect } from 'react'
import api from '../api/axios'

/* Super Admin → Data tools → Full school pack
   Upload the pack's CSV files in small pieces, preview what will be added, then import — all running on the server. */

const REQUIRED = ['students.csv', 'guardians.csv', 'student_enrollments.csv', 'fee_transactions.csv', 'admission_leads.csv', 'academic_years.csv', 'branches.csv']
const CHUNK = 900 * 1024            // stays under common 1 MB proxy limits
const mb = (n) => (n / 1048576).toFixed(n > 10485760 ? 0 : 1) + ' MB'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export default function SchoolPackPanel({ token, school, parseCSV, showToast }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } }
  const [files, setFiles] = useState({})            // name -> File
  const [ignored, setIgnored] = useState(0)
  const [branches, setBranches] = useState([])
  const [branch, setBranch] = useState('ALL')
  const [history, setHistory] = useState(false)
  const [phase, setPhase] = useState('idle')        // idle | uploading | working | previewed | done | error
  const [upl, setUpl] = useState(null)              // { done, total }
  const [status, setStatus] = useState(null)
  const [err, setErr] = useState('')
  const sid = useRef(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { reset() }, [school?.id])        // eslint-disable-line

  const reset = () => { sid.current = null; setFiles({}); setIgnored(0); setBranches([]); setBranch('ALL'); setHistory(false); setPhase('idle'); setUpl(null); setStatus(null); setErr('') }

  const pick = async (e) => {
    const list = [...(e.target.files || [])]; e.target.value = ''
    const map = {}; let skipped = 0
    for (const f of list) { if (REQUIRED.includes(f.name)) map[f.name] = f; else skipped++ }
    setFiles(map); setIgnored(skipped); setErr(''); setPhase('idle'); setStatus(null); sid.current = null
    if (map['branches.csv']) {
      try { const p = parseCSV(await map['branches.csv'].text()); setBranches(p.rows.filter(r => r.branch_id)); setBranch('ALL') } catch { setBranches([]) }
    } else setBranches([])
  }
  const missing = REQUIRED.filter(n => !files[n])
  const totalBytes = REQUIRED.reduce((a, n) => a + (files[n]?.size || 0), 0)

  const uploadChunk = async (name, offset, buf) => {
    let last
    for (let attempt = 0; attempt < 4; attempt++) {
      try { await api.post(`/superadmin/data/pack/${sid.current}/chunk`, buf, { ...auth, headers: { ...auth.headers, 'Content-Type': 'application/octet-stream' }, params: { name, offset } }); return }
      catch (e) { last = e; if (e.response && e.response.status < 500 && e.response.status !== 409) break; await sleep(600 * (attempt + 1)) }
    }
    throw last
  }
  const poll = async () => {
    for (;;) {
      await sleep(1500)
      if (!alive.current) return null
      const r = await api.get(`/superadmin/data/pack/${sid.current}/status`, auth)
      setStatus(r.data)
      if (r.data.state === 'done' || r.data.state === 'error') return r.data
    }
  }
  const run = async (mode) => {
    await api.post(`/superadmin/data/pack/${sid.current}/run`, { mode, branch, history, sizes: Object.fromEntries(REQUIRED.map(n => [n, files[n].size])) }, auth)
    setPhase('working')
    const s = await poll()
    if (!s) return
    if (s.state === 'error') { setErr(s.error); setPhase('error'); return }
    setPhase(mode === 'preview' ? 'previewed' : 'done')
    if (mode === 'import') showToast && showToast(`✅ School pack imported into ${school.name}`)
  }

  const start = async () => {
    if (!school || missing.length) return
    setErr(''); setStatus(null); setPhase('uploading')
    try {
      if (!sid.current) {
        const r = await api.post('/superadmin/data/pack/session', { school_id: school.id }, auth); sid.current = r.data.id
        let done = 0; setUpl({ done, total: totalBytes })
        for (const name of REQUIRED) {
          const f = files[name]
          for (let off = 0; off < f.size; off += CHUNK) {
            const buf = await f.slice(off, Math.min(off + CHUNK, f.size)).arrayBuffer()
            await uploadChunk(name, off, buf)
            done += buf.byteLength; if (alive.current) setUpl({ done, total: totalBytes })
          }
        }
      }
      setUpl(null)
      await run('preview')
    } catch (e) { setErr(e.response?.data?.message || 'Upload stopped. Check your connection and press the button again — it continues where it stopped.'); setPhase('error') }
  }
  const doImport = async () => {
    if (!window.confirm(`Import this pack into "${school.name}"?\n\nIt adds students, class history, fees and leads to that school's live records.`)) return
    setErr('')
    try { await run('import') } catch (e) { setErr(e.response?.data?.message || 'Could not start the import.'); setPhase('error') }
  }

  const busy = phase === 'uploading' || phase === 'working'
  const sum = status?.summary
  const pct = upl ? Math.round((upl.done / Math.max(1, upl.total)) * 100) : 0
  const logText = (status?.log || []).join('\n')

  return (
    <div>
      {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4" role="alert">{err}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="text-sm font-semibold text-ink" style={{ marginBottom: 4 }}>Full school pack</p>
        <p className="text-xs text-gray-500" style={{ marginBottom: 12 }}>
          Imports students, parent details, class history, fee instalments and admission leads into the school chosen above. It does not need
          to be a new school, but the school must have no students yet. Select these {REQUIRED.length} files from the unzipped pack (select them all at once; other files are ignored):
        </p>
        <p className="text-xs text-gray-400" style={{ marginBottom: 12 }}>{REQUIRED.join(' · ')}</p>
        <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer" style={{ borderColor: '#e5e7eb', opacity: school && !busy ? 1 : .5 }}>
          <input type="file" multiple accept=".csv,text/csv" className="hidden" onChange={pick} disabled={!school || busy} />
          <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>🗂️</span>
          <p className="text-sm font-medium text-ink">{school ? 'Click to choose the CSV files' : 'Choose a school first'}</p>
        </label>

        {Object.keys(files).length > 0 && (
          <div style={{ marginTop: 12 }}>
            {REQUIRED.map(n => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                <span>{files[n] ? '✅' : '❌'} {n}</span><span className="text-gray-400">{files[n] ? mb(files[n].size) : 'missing'}</span>
              </div>
            ))}
            {ignored > 0 && <p className="text-xs text-gray-400" style={{ marginTop: 6 }}>{ignored} other file{ignored > 1 ? 's' : ''} ignored (not needed).</p>}
            {missing.length > 0 && <p className="text-sm" style={{ color: '#dc2626', marginTop: 8 }}>⚠ Missing: {missing.join(', ')}</p>}
          </div>
        )}

        {missing.length === 0 && Object.keys(files).length > 0 && (
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <div>
              <label className="label" htmlFor="pk-branch">Which branches</label>
              <select id="pk-branch" className="input" value={branch} onChange={e => setBranch(e.target.value)} disabled={busy || phase === 'previewed' || phase === 'done'}>
                <option value="ALL">All branches (merged into this one school)</option>
                {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_id} · {b.branch_name || b.city}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={history} onChange={e => setHistory(e.target.checked)} disabled={busy || phase === 'previewed' || phase === 'done'} style={{ marginTop: 3 }} />
              <span>Include past years (class history, old fees, old leads). <span className="text-gray-400">This creates the missing academic years, and the year list is shared by all schools — leave it off unless this is a test system.</span></span>
            </label>
            {(phase === 'idle' || phase === 'error') && (
              <button className="btn-primary" onClick={start} disabled={busy}>Upload {mb(totalBytes)} &amp; preview</button>
            )}
          </div>
        )}
      </div>

      {phase === 'uploading' && upl && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="text-sm font-semibold text-ink">Uploading… {pct}% <span className="text-gray-400 font-normal">({mb(upl.done)} of {mb(upl.total)})</span></p>
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, marginTop: 8 }}><div style={{ height: 8, width: pct + '%', background: 'var(--c-brand, #0f9d84)', borderRadius: 99 }} /></div>
          <p className="text-xs text-gray-400" style={{ marginTop: 8 }}>Keep this page open until the upload finishes.</p>
        </div>
      )}

      {(phase === 'working' || phase === 'previewed' || phase === 'done' || (phase === 'error' && status)) && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid ' + (phase === 'done' ? '#10b981' : phase === 'error' ? '#ef4444' : '#6366f1') }}>
          <p className="text-sm font-semibold text-ink">
            {phase === 'working' && (status?.mode === 'import' ? 'Importing… keep this page open to see the result (the import itself keeps running on the server even if the page closes).' : 'Checking the files…')}
            {phase === 'previewed' && 'Preview ready — nothing has been written yet.'}
            {phase === 'done' && 'Import finished.'}
            {phase === 'error' && 'Stopped.'}
          </p>
          {phase === 'working' && status?.progress?.label && <p className="text-xs text-gray-500" style={{ marginTop: 4 }}>{status.progress.label}{status.progress.total ? `: ${status.progress.done?.toLocaleString()} / ${status.progress.total.toLocaleString()}` : status.progress.done ? `: ${status.progress.done.toLocaleString()} rows` : '…'}</p>}
          {logText && <pre style={{ fontSize: 12, background: '#f9fafb', padding: 10, borderRadius: 8, marginTop: 8, whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto' }}>{logText}</pre>}
          {phase === 'previewed' && sum && (
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={doImport}>Import into {school.name}</button>
          )}
          {phase === 'done' && sum && (
            <div className="text-sm" style={{ marginTop: 10 }}>
              <p>Students added: <b>{sum.students?.new?.toLocaleString()}</b></p>
              {sum.enrollments !== undefined && <p>Class history rows: <b>{sum.enrollments.toLocaleString()}</b></p>}
              {sum.fees && <p>Fee instalments: <b>{sum.fees.total.toLocaleString()}</b> ({sum.fees.paid.toLocaleString()} paid)</p>}
              {sum.leads && <p>Leads: <b>{sum.leads.new.toLocaleString()}</b></p>}
              <button className="btn-ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={reset}>Import another pack</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}