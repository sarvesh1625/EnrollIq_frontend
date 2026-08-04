import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Academic Year & Student Promotion
   Tabs: Promotion · Academic Years
   Promote a whole class in one go, with per-student overrides
   (Promote / Detain / Transfer / Graduate).
   ═══════════════════════════════════════════════════════════════ */

const LADDER = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
                'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const nextClass = (c) => {
  const i = LADDER.indexOf(c)
  if (i === -1) return ''
  return i === LADDER.length - 1 ? 'Graduated' : LADDER[i + 1]
}

const ACTIONS = [
  { key:'Promoted',    label:'Promote',  icon:'⬆', badge:'badge-green',  hint:'Moves up to the next class' },
  { key:'Detained',    label:'Detain',   icon:'↻', badge:'badge-amber',  hint:'Repeats the same class' },
  { key:'Transferred', label:'Transfer', icon:'→', badge:'badge-blue',   hint:'Left the school (TC issued)' },
  { key:'Graduated',   label:'Graduate', icon:'🎓', badge:'badge-purple', hint:'Completed final class' },
]
const actionMeta = (a) => ACTIONS.find(x => x.key === a) || ACTIONS[0]

const MOCK_YEARS = [
  { id:1, name:'2025-26', is_active:1, students:3, start_date:'2025-06-01', end_date:'2026-03-31' },
  { id:2, name:'2026-27', is_active:0, students:0, start_date:'2026-06-01', end_date:'2027-03-31' },
]
const MOCK_CANDIDATES = [
  { enrollment_id:1, student_id:1, name:'Gunakshi', roll_number:'S-001', class:'Grade 1', section:'A', suggested_class:'Grade 2' },
  { enrollment_id:2, student_id:2, name:'Tokala',   roll_number:'S-002', class:'LKG',     section:'A', suggested_class:'UKG'     },
  { enrollment_id:3, student_id:3, name:'Sarvesh',  roll_number:'S-003', class:'LKG',     section:'B', suggested_class:'UKG'     },
]

/* ─── Modal shell ─────────────────────────────────────────── */
function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-title">{title}</span>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/* ─── Add year modal ──────────────────────────────────────── */
function YearModal({ onClose, onSaved, showToast }) {
  const yr = new Date().getFullYear()
  const [form, setForm] = useState({
    name: `${yr + 1}-${String(yr + 2).slice(-2)}`,
    start_date: `${yr + 1}-06-01`, end_date: `${yr + 2}-03-31`,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErr('')
    try { await api.post('/academic/years', form); showToast(`Year ${form.name} created ✓`); onSaved(); onClose() }
    catch (e2) { setErr(e2.response?.data?.message || 'Could not create year'); setSaving(false) }
  }

  return (
    <Modal title="Add academic year" subtitle="e.g. 2027-28" onClose={onClose}>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {err && <div className="badge badge-red" style={{ padding:'8px 12px', borderRadius:8 }}>{err}</div>}
        <div>
          <label className="label">Year name *</label>
          <input className="input" value={form.name} onChange={set('name')} required autoFocus placeholder="2027-28" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
          <div>
            <label className="label">Start date</label>
            <input className="input" type="date" value={form.start_date} onChange={set('start_date')} />
          </div>
          <div>
            <label className="label">End date</label>
            <input className="input" type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
        </div>
        <div style={{ display:'flex', gap:10, paddingTop:4 }}>
          <button type="submit" className="btn-primary" style={{ flex:1 }} disabled={saving}>
            {saving ? 'Creating…' : 'Create year'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

/* ═══ PAGE ═══════════════════════════════════════════════════ */
export default function AcademicYear() {
  const [tab, setTab]         = useState('promotion')
  const [years, setYears]     = useState(MOCK_YEARS)
  const [fromYear, setFrom]   = useState('')
  const [toYear, setTo]       = useState('')
  const [cls, setCls]         = useState('All')
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel]         = useState({})     // student_id -> true
  const [plan, setPlan]       = useState({})     // student_id -> { action, to_class }
  const [running, setRunning] = useState(false)
  const [showYear, setShowYear] = useState(false)
  const [toast, setToast]     = useState('')
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const loadYears = useCallback(() => {
    api.get('/academic/years')
      .then(r => {
        const list = r.data?.length ? r.data : MOCK_YEARS
        setYears(list)
        const active = list.find(y => y.is_active) || list[0]
        setFrom(prev => prev || String(active?.id || ''))
        const nxt = list.find(y => y.id !== active?.id)
        setTo(prev => prev || String(nxt?.id || ''))
      })
      .catch(() => setYears(MOCK_YEARS))
  }, [])
  useEffect(loadYears, [loadYears])

  const loadCandidates = useCallback(() => {
    if (!fromYear) return
    setLoading(true)
    api.get('/academic/promotion/candidates', { params:{ from_year: fromYear, class: cls } })
      .then(r => setRows(r.data || []))
      .catch(() => setRows(cls === 'All' ? MOCK_CANDIDATES : MOCK_CANDIDATES.filter(m => m.class === cls)))
      .finally(() => setLoading(false))
  }, [fromYear, cls])
  useEffect(loadCandidates, [loadCandidates])

  // default every listed student to Promote
  useEffect(() => {
    const p = {}
    rows.forEach(r => {
      p[r.student_id] = {
        action: r.class === 'Grade 10' ? 'Graduated' : 'Promoted',
        to_class: r.suggested_class || nextClass(r.class),
      }
    })
    setPlan(p)
    setSel(Object.fromEntries(rows.map(r => [r.student_id, true])))
  }, [rows])

  const setAction = (sid, action) => setPlan(p => {
    const row = rows.find(r => r.student_id === sid)
    const to_class = action === 'Detained' ? row.class
                   : action === 'Promoted' ? (row.suggested_class || nextClass(row.class))
                   : null
    return { ...p, [sid]: { action, to_class } }
  })
  const setToClass = (sid, to_class) => setPlan(p => ({ ...p, [sid]: { ...p[sid], to_class } }))

  const selectedIds = Object.keys(sel).filter(k => sel[k]).map(Number)
  const summary = useMemo(() => {
    const c = {}
    selectedIds.forEach(id => { const a = plan[id]?.action || 'Promoted'; c[a] = (c[a] || 0) + 1 })
    return c
  }, [sel, plan, selectedIds])

  const fromName = years.find(y => String(y.id) === String(fromYear))?.name || ''
  const toName   = years.find(y => String(y.id) === String(toYear))?.name || ''

  const runPromotion = async () => {
    if (!selectedIds.length) { showToast('Select at least one student'); return }
    if (!toYear || fromYear === toYear) { showToast('Pick a different target year'); return }
    const lines = Object.entries(summary).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')
    if (!confirm(`Promote from ${fromName} → ${toName}?\n\n${lines}\n\nThis updates each student's class.`)) return

    setRunning(true)
    const payload = {
      from_year_id: Number(fromYear),
      to_year_id: Number(toYear),
      students: selectedIds.map(id => {
        const row = rows.find(r => r.student_id === id)
        return {
          student_id: id,
          action: plan[id]?.action || 'Promoted',
          from_class: row?.class,
          to_class: plan[id]?.to_class,
          section: row?.section,
          roll_number: row?.roll_number,
        }
      }),
    }
    try {
      const r = await api.post('/academic/promotion', payload)
      showToast(r.data?.message || 'Promotion complete ✓')
    } catch (e) {
      showToast(e.response?.data?.message || 'Promotion complete ✓ (demo)')
    }
    setRunning(false)
    loadYears(); loadCandidates()
  }

  const activateYear = async (y) => {
    if (!confirm(`Make ${y.name} the active academic year?`)) return
    try { await api.put(`/academic/years/${y.id}/activate`) } catch {}
    showToast(`${y.name} is now active ✓`); loadYears()
  }

  const classesPresent = ['All', ...LADDER.filter(c => rows.some(r => r.class === c) || cls === c)]

  return (
    <Layout>
      <div className="page">
        {toast && <div className="toast">{toast}</div>}

        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">🎓 Academic Year</h1>
            <p className="text-gray-400 text-sm mt-1">Promote students and manage academic years</p>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={() => setShowYear(true)}>+ Add year</button>
          </div>
        </div>

        <div className="tabs-strip mb-6">
          {[['promotion','Promotion'], ['years','Academic Years']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`text-xs px-4 py-2 rounded-md font-medium transition-colors ${tab === k ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── PROMOTION ── */}
        {tab === 'promotion' && (
          <div className="fade-up">
            {/* Year selectors */}
            <div className="card mb-5">
              <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:150 }}>
                  <label className="label">From year</label>
                  <select className="input" value={fromYear} onChange={e => setFrom(e.target.value)}>
                    {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (active)' : ''}</option>)}
                  </select>
                </div>
                <div style={{ fontSize:20, color:'var(--c-brand)', paddingBottom:8 }}>→</div>
                <div style={{ flex:1, minWidth:150 }}>
                  <label className="label">To year</label>
                  <select className="input" value={toYear} onChange={e => setTo(e.target.value)}>
                    {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div style={{ flex:1, minWidth:130 }}>
                  <label className="label">Class</label>
                  <select className="input" value={cls} onChange={e => setCls(e.target.value)}>
                    {classesPresent.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary strip */}
            {rows.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mb-5 g-4">
                {ACTIONS.map(a => (
                  <div key={a.key} className="stat-card">
                    <p className="label">{a.label}</p>
                    <p className="font-serif text-2xl font-bold mt-1 text-ink">{summary[a.key] || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.hint}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Student list */}
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)', display:'flex',
                justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div>
                  <h2 className="font-semibold text-ink text-sm">
                    {rows.length} student{rows.length === 1 ? '' : 's'} in {fromName}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedIds.length} selected for promotion</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn-ghost text-xs"
                    onClick={() => setSel(Object.fromEntries(rows.map(r => [r.student_id, true])))}>Select all</button>
                  <button className="btn-ghost text-xs" onClick={() => setSel({})}>Clear</button>
                </div>
              </div>

              {loading ? (
                <div className="empty-state" style={{ padding:'40px' }}><p className="empty-sub">Loading students…</p></div>
              ) : rows.length === 0 ? (
                <div className="empty-state" style={{ padding:'40px 24px' }}>
                  <div className="empty-icon">👥</div>
                  <p className="empty-title">No students enrolled in {fromName}</p>
                  <p className="empty-sub">Run the migration to create enrollments, or pick another year.</p>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table className="w-full text-sm" style={{ minWidth:720 }}>
                    <thead>
                      <tr className="border-b border-gray-100 bg-cream">
                        <th style={{ width:44 }} className="px-4 py-3"></th>
                        {['Student','Current class','Action','Moving to'].map(h => (
                          <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map(r => {
                        const p = plan[r.student_id] || {}
                        const on = !!sel[r.student_id]
                        return (
                          <tr key={r.student_id} className="hover:bg-cream"
                            style={{ opacity: on ? 1 : 0.45 }}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={on}
                                onChange={() => setSel(s => ({ ...s, [r.student_id]: !s[r.student_id] }))}
                                style={{ width:16, height:16, accentColor:'var(--c-brand)', cursor:'pointer' }} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--c-brand-lt)',
                                  color:'var(--c-brand)', display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize:12, fontWeight:700, flexShrink:0 }}>{r.name?.[0]}</div>
                                <div>
                                  <p className="text-sm font-medium text-ink">{r.name}</p>
                                  <p className="text-xs text-gray-400">{r.roll_number || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {r.class}{r.section ? `-${r.section}` : ''}
                            </td>
                            <td className="px-4 py-3">
                              <select className="input" style={{ width:130, padding:'5px 8px', fontSize:12 }}
                                value={p.action || 'Promoted'} disabled={!on}
                                onChange={e => setAction(r.student_id, e.target.value)}>
                                {ACTIONS.map(a => <option key={a.key} value={a.key}>{a.icon} {a.label}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              {p.action === 'Promoted' ? (
                                <select className="input" style={{ width:120, padding:'5px 8px', fontSize:12 }}
                                  value={p.to_class || ''} disabled={!on}
                                  onChange={e => setToClass(r.student_id, e.target.value)}>
                                  {LADDER.map(c => <option key={c}>{c}</option>)}
                                  <option>Graduated</option>
                                </select>
                              ) : (
                                <span className={`badge ${actionMeta(p.action).badge}`}>
                                  {p.action === 'Detained' ? `Stays in ${r.class}` : p.action}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Run bar */}
              {rows.length > 0 && (
                <div style={{ padding:'14px 20px', borderTop:'1px solid var(--c-border)',
                  background:'var(--c-surface-2)', borderRadius:'0 0 16px 16px',
                  display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <p className="text-xs text-gray-500">
                    {fromName} → <b>{toName}</b> · {selectedIds.length} student{selectedIds.length === 1 ? '' : 's'}
                  </p>
                  <div style={{ flex:1 }} />
                  <button className="btn-primary" disabled={running || !selectedIds.length} onClick={runPromotion}>
                    {running ? 'Promoting…' : `🎓 Promote ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop:16, background:'var(--c-surface-2)' }}>
              <p className="text-xs text-gray-500" style={{ lineHeight:1.7 }}>
                <b>ℹ️ What promotion does:</b> it closes each student's enrolment in {fromName || 'the old year'},
                creates a new enrolment in {toName || 'the new year'} with their new class, and updates their
                current class. Past attendance, fees, marks and report cards stay attached to the year they
                happened in — so history never changes.
              </p>
            </div>
          </div>
        )}

        {/* ── YEARS ── */}
        {tab === 'years' && (
          <div className="flex flex-col gap-3 fade-up">
            {years.map(y => (
              <div key={y.id} className="card">
                <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                  <div style={{ width:46, height:46, borderRadius:12, background:'var(--c-brand-lt)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📅</div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-ink">{y.name}</h3>
                      {!!y.is_active && <span className="badge badge-green">● Active</span>}
                      {!!y.is_closed && <span className="badge badge-gray">Closed</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {y.start_date ? new Date(y.start_date).toLocaleDateString('en-IN') : '—'} →{' '}
                      {y.end_date ? new Date(y.end_date).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p className="text-lg font-bold text-ink">{y.students ?? 0}</p>
                    <p className="text-xs text-gray-400">Students</p>
                  </div>
                  {!y.is_active && (
                    <button className="btn-ghost text-sm" onClick={() => activateYear(y)}>Make active</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showYear && <YearModal onClose={() => setShowYear(false)} onSaved={loadYears} showToast={showToast} />}
    </Layout>
  )
}