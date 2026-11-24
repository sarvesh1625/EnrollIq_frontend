import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* EnrollIQ — Exam duties: build exam sessions, assign invigilators / evaluators, see workload.
   Teachers confirm or request a swap in the EnrollTeach app (More → My Exam Duties). */

const TYPE_LABEL = { invigilation: 'Invigilation', evaluation: 'Evaluation', paper_setter: 'Paper setter', reviewer: 'Reviewer', relieving: 'Relieving' }
const ST = {
  assigned:       { t: 'Not confirmed',  bg: 'var(--c-amber-lt)', c: 'var(--c-amber)' },
  acknowledged:   { t: 'Confirmed',      bg: 'var(--c-green-lt)', c: 'var(--c-green)' },
  swap_requested: { t: 'Wants a swap',   bg: 'var(--c-red-lt)',   c: 'var(--c-red)' },
}
const day = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

function Modal({ title, sub, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div><h2 className="font-serif text-lg font-bold text-ink">{title}</h2>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function SessionModal({ exam, session, onClose, onSaved }) {
  const [f, setF] = useState(session ? { ...session } : { session_date: '', start_time: '09:30', end_time: '12:30', class_name: exam.class_name && exam.class_name !== 'All' ? exam.class_name : '', section: '', subject: '', room: '', invigilators_needed: 2, notes: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { session ? await api.put(`/exam-duties/sessions/${session.id}`, f) : await api.post('/exam-duties/sessions', { ...f, exam_id: exam.id }); onSaved() }
    catch (x) { setErr(x.response?.data?.message || 'Could not save'); setBusy(false) }
  }
  return (
    <Modal title={session ? 'Edit session' : 'Add exam session'} sub={exam.name} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{err}</div>}
        <div className="grid grid-cols-3 gap-3 g-2">
          <div><label className="label">Date *</label><input className="input" type="date" value={f.session_date} onChange={set('session_date')} required /></div>
          <div><label className="label">From *</label><input className="input" type="time" value={f.start_time} onChange={set('start_time')} required /></div>
          <div><label className="label">To *</label><input className="input" type="time" value={f.end_time} onChange={set('end_time')} required /></div>
        </div>
        <div className="grid grid-cols-3 gap-3 g-2">
          <div><label className="label">Class</label><input className="input" value={f.class_name || ''} onChange={set('class_name')} placeholder="Grade 5" /></div>
          <div><label className="label">Section</label><input className="input" value={f.section || ''} onChange={set('section')} placeholder="A" /></div>
          <div><label className="label">Room</label><input className="input" value={f.room || ''} onChange={set('room')} placeholder="Hall 1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 g-2">
          <div><label className="label">Subject / paper</label><input className="input" value={f.subject || ''} onChange={set('subject')} placeholder="Mathematics" /></div>
          <div><label className="label">Invigilators needed</label><input className="input" type="number" min="0" max="20" value={f.invigilators_needed} onChange={set('invigilators_needed')} /></div>
        </div>
        <div><label className="label">Notes</label><input className="input" value={f.notes || ''} onChange={set('notes')} placeholder="Optional" /></div>
        <div className="flex gap-3 pt-1"><button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save session'}</button><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button></div>
      </form>
    </Modal>
  )
}

function AssignModal({ session, staff, workload, onClose, onDone, reassign }) {
  const [uid, setUid] = useState(''); const [type, setType] = useState('invigilation')
  const [err, setErr] = useState(''); const [conf, setConf] = useState(null); const [busy, setBusy] = useState(false)
  const load = useMemo(() => Object.fromEntries((workload || []).map((w) => [w.id, w])), [workload])
  const go = async (force) => {
    setBusy(true); setErr('')
    try {
      const r = reassign ? await api.post(`/exam-duties/duties/${reassign.id}/reassign`, { user_id: Number(uid), force })
                         : await api.post(`/exam-duties/sessions/${session.id}/assign`, { user_id: Number(uid), duty_type: type, force })
      onDone(r.data.warnings || [])
    } catch (x) {
      const d = x.response?.data
      if (x.response?.status === 409 && d?.can_force) setConf(d); else setErr(d?.message || 'Could not assign')
      setBusy(false)
    }
  }
  return (
    <Modal title={reassign ? 'Give this duty to someone else' : 'Assign a teacher'} sub={`${day(session.session_date)} · ${session.start_time}–${session.end_time}${session.room ? ' · ' + session.room : ''}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {err && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{err}</div>}
        {conf && (
          <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-lg">
            <b>{conf.message}</b>
            {conf.conflicts.map((c) => <div key={c.id} className="text-xs mt-1">{c.exam_name || 'Exam'} · {c.start_time}–{c.end_time}{c.room ? ' · ' + c.room : ''}</div>)}
            <button className="btn-ghost mt-2" onClick={() => go(true)} disabled={busy}>Assign anyway</button>
          </div>
        )}
        <div>
          <label className="label">Teacher</label>
          <select className="input" value={uid} onChange={(e) => { setUid(e.target.value); setConf(null) }}>
            <option value="">Choose…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.subject ? ` (${s.subject})` : ''} — {load[s.id]?.duties || 0} duties</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">The number is how many exam duties they already have. Pick the lowest to keep it fair.</p>
        </div>
        {!reassign && (
          <div><label className="label">Duty</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
        )}
        <div className="flex gap-3"><button className="btn-primary flex-1" disabled={!uid || busy} onClick={() => go(false)}>{busy ? 'Working…' : (reassign ? 'Give duty' : 'Assign')}</button><button className="btn-ghost" onClick={onClose}>Cancel</button></div>
      </div>
    </Modal>
  )
}

export default function ExamDuties() {
  const [exams, setExams] = useState([]); const [examId, setExamId] = useState('')
  const [sessions, setSessions] = useState([]); const [workload, setWorkload] = useState([]); const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false); const [toast, setToast] = useState(''); const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)       // {} new | session
  const [assigning, setAssigning] = useState(null)   // { session, reassign? }
  const [tab, setTab] = useState('sessions')
  const note = (m) => { setToast(m); setTimeout(() => setToast(''), 3500) }
  const exam = exams.find((e) => String(e.id) === String(examId))

  useEffect(() => {
    api.get('/exams').then((r) => { setExams(r.data || []); if (r.data?.[0]) setExamId(String(r.data[0].id)) }).catch(() => {})
    api.get('/exam-duties/staff').then((r) => setStaff(r.data.staff || [])).catch((e) => setError(e.response?.data?.message || ''))
  }, [])
  const load = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    try {
      const [s, w] = await Promise.all([api.get('/exam-duties/sessions', { params: { exam_id: examId } }), api.get('/exam-duties/workload', { params: { exam_id: examId } })])
      setSessions(s.data); setWorkload(w.data); setError('')
    } catch (e) { setError(e.response?.data?.message || 'Could not load') } finally { setLoading(false) }
  }, [examId])
  useEffect(() => { load() }, [load])

  const removeDuty = async (d) => { if (!confirm(`Remove ${d.teacher_name} from this duty?`)) return; try { await api.delete(`/exam-duties/duties/${d.id}`); load() } catch (e) { note(e.response?.data?.message || 'Could not remove') } }
  const removeSession = async (s) => { if (!confirm('Delete this session and all its duties? Teachers will be told.')) return; try { await api.delete(`/exam-duties/sessions/${s.id}`); load() } catch (e) { note(e.response?.data?.message || 'Could not delete') } }
  const swaps = sessions.flatMap((s) => s.duties.filter((d) => d.status === 'swap_requested').map((d) => ({ ...d, session: s })))
  const short = sessions.filter((s) => s.duties.filter((d) => d.duty_type === 'invigilation').length < s.invigilators_needed).length

  return (
    <Layout>
      <div className="page">
        {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99, background: 'var(--c-ink)', color: 'white', fontSize: 13, padding: '10px 18px', borderRadius: 12 }}>{toast}</div>}
        <div className="page-head">
          <div><h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Exam duties</h1>
            <p className="text-gray-400 text-sm mt-1">Plan sessions, assign invigilators and evaluators. Teachers are notified and confirm in the app.</p></div>
          <div className="actions"><button className="btn-primary" disabled={!exam} onClick={() => setEditing({})}>+ Add session</button></div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <select className="input" style={{ maxWidth: 320 }} value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.length === 0 && <option value="">No exams yet — create one in Exams</option>}
            {exams.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.class_name}</option>)}
          </select>
          <div className="tabs-strip">{[['sessions', 'Sessions'], ['workload', 'Workload']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`text-xs px-4 py-2 rounded-md font-medium ${tab === k ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream'}`}>{l}</button>))}
          </div>
          {sessions.length > 0 && <span className="text-xs" style={{ color: short ? 'var(--c-amber)' : 'var(--c-green)' }}>{short ? `${short} session(s) still need invigilators` : 'All sessions are covered'}</span>}
        </div>

        {error && <div className="card" style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</div>}

        {swaps.length > 0 && tab === 'sessions' && (
          <div className="card" style={{ marginBottom: 14, borderColor: 'var(--c-red)' }}>
            <p className="text-sm font-semibold text-ink">Swap requests ({swaps.length})</p>
            {swaps.map((d) => (
              <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid var(--c-border)', marginTop: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}><b className="text-sm">{d.teacher_name}</b> <span className="text-xs text-gray-400">· {day(d.session.session_date)} {d.session.start_time}</span>
                  <p className="text-xs text-gray-500" style={{ margin: '2px 0 0' }}>“{d.swap_reason}”</p></div>
                <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setAssigning({ session: d.session, reassign: d })}>Give to someone else</button>
              </div>))}
          </div>
        )}

        {tab === 'sessions' && (loading ? <div className="card empty-state"><p className="empty-sub">Loading…</p></div>
          : sessions.length === 0 ? (<div className="card empty-state"><div className="empty-icon">🗓</div><p className="empty-title">No sessions yet</p><p className="empty-sub">Add the dates, times and rooms of this exam.</p></div>)
          : (<div className="flex flex-col gap-3">{sessions.map((s) => {
              const inv = s.duties.filter((d) => d.duty_type === 'invigilation').length
              return (
                <div key={s.id} className="card">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 130 }}><p className="text-sm font-bold text-ink" style={{ margin: 0 }}>{day(s.session_date)}</p><p className="text-xs text-gray-500" style={{ margin: '2px 0 0' }}>{s.start_time}–{s.end_time}</p></div>
                    <div style={{ flex: 1, minWidth: 180 }}><p className="text-sm text-ink" style={{ margin: 0, fontWeight: 600 }}>{s.subject || 'Exam'}{s.class_name ? ` · ${s.class_name}${s.section ? '-' + s.section : ''}` : ''}</p>
                      <p className="text-xs text-gray-400" style={{ margin: '2px 0 0' }}>{s.room ? `Room ${s.room} · ` : ''}Invigilators {inv}/{s.invigilators_needed}</p></div>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setAssigning({ session: s })}>+ Assign</button>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditing(s)}>Edit</button>
                    <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--c-red)' }} onClick={() => removeSession(s)}>Delete</button>
                  </div>
                  {s.duties.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {s.duties.map((d) => { const st = ST[d.status] || ST.assigned; return (
                      <span key={d.id} className="badge" style={{ background: st.bg, color: st.c, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {d.teacher_name} · {TYPE_LABEL[d.duty_type]} · {st.t}
                        <button onClick={() => removeDuty(d)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
                      </span>) })}
                  </div>}
                </div>) })}</div>))}

        {tab === 'workload' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', background: 'var(--c-surface-2)', fontSize: 11, fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase' }}>
              <span>Teacher</span><span>Duties</span><span>Hours</span><span>Unconfirmed</span><span>Swap asks</span></div>
            {workload.map((w, i) => (
              <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', fontSize: 13, borderTop: i ? '1px solid #faf9f7' : 'none' }}>
                <b>{w.name}</b><span>{w.duties}</span><span>{w.hours}</span><span>{w.unconfirmed || '—'}</span><span style={{ color: w.swaps ? 'var(--c-red)' : undefined }}>{w.swaps || '—'}</span></div>))}
            {workload.length === 0 && <p className="empty-sub" style={{ padding: 24 }}>No teachers found.</p>}
          </div>
        )}
      </div>

      {editing && exam && <SessionModal exam={exam} session={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); note('Saved ✓') }} />}
      {assigning && <AssignModal session={assigning.session} reassign={assigning.reassign} staff={staff} workload={workload} onClose={() => setAssigning(null)}
        onDone={(w) => { setAssigning(null); load(); note(w.length ? `Assigned — note: they teach ${w[0].subject} (${w[0].class_name}) at this time` : 'Assigned — teacher notified ✓') }} />}
    </Layout>
  )
}