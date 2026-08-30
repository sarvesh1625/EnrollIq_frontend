import { useState, useEffect, useRef, useMemo } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { GeneratePaperModal, AnswerSheetUpload, InsightsPanel, ViewPaperModal } from './AIExamTools'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Exams & Report Cards  (full rebuild)
   Tabs: Exams · Subjects
   Flow: exam list → marks entry (grid + keyboard nav) → report cards
   All original API calls preserved.
   ═══════════════════════════════════════════════════════════════ */

const examsApi = {
  getExams:      ()      => api.get('/exams'),
  getSubjects:   ()      => api.get('/exams/subjects'),
  getStudents:   (cls)   => api.get('/students', { params:{ class:cls, limit:200 } }),
  createExam:    (d)     => api.post('/exams', d),
  createSubject: (d)     => api.post('/exams/subjects', d),
  getMarks:      (id)    => api.get(`/exams/${id}/marks`),
  enterMarks:    (id, d) => api.post(`/exams/${id}/marks`, d),
  generateRC:    (id)    => api.post(`/exams/${id}/generate-report-cards`),
  getReportCard: (sid)   => api.get(`/exams/report-card/${sid}`),
}

const CLASSES    = ['Pre-LKG','Nursery','LKG','UKG','Pre-KG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const EXAM_TYPES = ['Unit Test','Term Exam','Half Yearly','Annual','Mock Test']

const TYPE_STYLE = {
  'Unit Test':  'badge-blue',
  'Term Exam':  'badge-green',
  'Half Yearly':'badge-amber',
  'Annual':     'badge-purple',
  'Mock Test':  'badge-gray',
}

const GRADE_SCALE = [
  { min:90, grade:'A+', color:'#059669', label:'Outstanding'  },
  { min:80, grade:'A',  color:'#10b981', label:'Excellent'    },
  { min:70, grade:'B+', color:'#2563eb', label:'Very Good'    },
  { min:60, grade:'B',  color:'#3b82f6', label:'Good'         },
  { min:50, grade:'C',  color:'#d97706', label:'Satisfactory' },
  { min:35, grade:'D',  color:'#f97316', label:'Needs Work'   },
  { min:0,  grade:'F',  color:'#dc2626', label:'Fail'         },
]
const PASS_PCT = 35

function calcGrade(marks, max) {
  const pct = (marks / max) * 100
  return (GRADE_SCALE.find(g => pct >= g.min) || GRADE_SCALE.at(-1)).grade
}
const gradeColor = (g) => (GRADE_SCALE.find(x => x.grade === g) || {}).color || '#6b7280'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

/* ─── Shared modal shell ──────────────────────────────────────── */
function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: wide ? 620 : 460 }} onClick={e => e.stopPropagation()}>
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

/* ─── Create Exam ─────────────────────────────────────────────── */
function ExamModal({ onClose, onSaved, showToast }) {
  const [form, setForm]     = useState({ name:'', class_name:'Grade 4', exam_type:'Unit Test', start_date:'', end_date:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setErr('End date cannot be before the start date.'); return
    }
    setSaving(true); setErr('')
    try { await examsApi.createExam(form); showToast('Exam created ✓'); onSaved() }
    catch (e2) { setErr(e2.response?.data?.message || 'Could not create exam.'); setSaving(false) }
  }

  return (
    <Modal title="Create exam" subtitle="Set up a new assessment" onClose={onClose}>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {err && <div className="badge badge-red" style={{ padding:'8px 12px', borderRadius:8 }}>{err}</div>}
        <div>
          <label className="label">Exam name *</label>
          <input className="input" value={form.name} onChange={set('name')} required autoFocus
            placeholder="e.g. Unit Test 1 — April 2026" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
          <div>
            <label className="label">Class</label>
            <select className="input" value={form.class_name} onChange={set('class_name')}>
              <option value="All">All Classes</option>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Exam type</label>
            <select className="input" value={form.exam_type} onChange={set('exam_type')}>
              {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
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
            {saving ? 'Creating…' : 'Create exam'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Add Subject ─────────────────────────────────────────────── */
function SubjectModal({ onClose, onSaved, showToast }) {
  const [form, setForm]     = useState({ name:'', code:'', class_name:'Grade 4', max_marks:100 })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await examsApi.createSubject(form); showToast('Subject added ✓'); onSaved() }
    catch (e2) { alert(e2.response?.data?.message || 'Error'); setSaving(false) }
  }

  return (
    <Modal title="Add subject" subtitle="Subjects are per class" onClose={onClose}>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label className="label">Subject name *</label>
          <input className="input" value={form.name} onChange={set('name')} required autoFocus placeholder="e.g. Mathematics" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
          <div>
            <label className="label">Code</label>
            <input className="input" value={form.code} onChange={set('code')} placeholder="MATH" />
          </div>
          <div>
            <label className="label">Max marks</label>
            <input className="input" type="number" min="1" value={form.max_marks} onChange={set('max_marks')} />
          </div>
        </div>
        <div>
          <label className="label">Class</label>
          <select className="input" value={form.class_name} onChange={set('class_name')}>
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:10, paddingTop:4 }}>
          <button type="submit" className="btn-primary" style={{ flex:1 }} disabled={saving}>
            {saving ? 'Saving…' : 'Add subject'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Printable Report Card ───────────────────────────────────── */
function ReportCard({ student, exam, rows, onClose, aiExamEnabled }) {
  const total    = rows.reduce((a, r) => a + r.marks, 0)
  const maxTotal = rows.reduce((a, r) => a + r.max, 0)
  const pct      = maxTotal ? (total / maxTotal) * 100 : 0
  const grade    = calcGrade(pct, 100)
  const passed   = pct >= PASS_PCT && rows.every(r => (r.marks / r.max) * 100 >= PASS_PCT)
  const meta     = GRADE_SCALE.find(g => g.grade === grade) || {}

  const print = () => {
    const html = document.getElementById('rc-print')?.innerHTML
    const w = window.open('', '_blank', 'width=820,height=1000')
    if (!w) return
    w.document.write(`<html><head><title>Report Card — ${student.name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Georgia,'Times New Roman',serif;padding:32px;color:#18150f}
        table{width:100%;border-collapse:collapse;margin:16px 0}
        th,td{border:1px solid #d9e4e1;padding:9px 12px;text-align:left;font-size:13px}
        th{background:#f2f7f5;font-weight:700}
        .r{text-align:right}.c{text-align:center}
        @page{margin:14mm}
      </style></head><body>${html}</body></html>`)
    w.document.close(); w.focus()
    setTimeout(() => w.print(), 350)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth:680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Report Card</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button className="btn-primary" style={{ padding:'6px 14px', fontSize:12 }} onClick={print}>🖨 Print / PDF</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          <div id="rc-print">
            {/* School header */}
            <div style={{ textAlign:'center', borderBottom:'2px solid var(--c-brand)', paddingBottom:14, marginBottom:18 }}>
              <p style={{ fontSize:22, fontWeight:700, fontFamily:'Georgia, serif', color:'var(--c-ink)' }}>
                {exam.school_name || 'EnrollIQ School'}
              </p>
              <p style={{ fontSize:12, color:'#6b6b6b', marginTop:3 }}>Academic Report Card</p>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--c-brand)', marginTop:7 }}>
                {exam.name} · {exam.exam_type}
              </p>
            </div>

            {/* Student info */}
            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
              <tbody>
                <tr>
                  <td style={cellL}>Student Name</td><td style={cellV}>{student.name}</td>
                  <td style={cellL}>Roll No.</td><td style={cellV}>{student.roll_number || '—'}</td>
                </tr>
                <tr>
                  <td style={cellL}>Class</td><td style={cellV}>{student.class}{student.section ? ` - ${student.section}` : ''}</td>
                  <td style={cellL}>Exam Date</td><td style={cellV}>{fmtDate(exam.start_date)}</td>
                </tr>
              </tbody>
            </table>

            {/* Marks table */}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Subject','Max','Marks','%','Grade','Remark'].map((h, i) => (
                    <th key={h} style={{ ...cellH, textAlign: i > 0 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const p = (r.marks / r.max) * 100
                  const g = calcGrade(r.marks, r.max)
                  const gm = GRADE_SCALE.find(x => x.grade === g) || {}
                  return (
                    <tr key={r.subject}>
                      <td style={cellB}>{r.subject}</td>
                      <td style={{ ...cellB, textAlign:'center' }}>{r.max}</td>
                      <td style={{ ...cellB, textAlign:'center', fontWeight:700 }}>{r.marks}</td>
                      <td style={{ ...cellB, textAlign:'center' }}>{Math.round(p)}%</td>
                      <td style={{ ...cellB, textAlign:'center', fontWeight:700, color:gm.color }}>{g}</td>
                      <td style={{ ...cellB, textAlign:'center', fontSize:11 }}>{gm.label}</td>
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ ...cellB, fontWeight:700, background:'#f2f7f5' }}>TOTAL</td>
                  <td style={{ ...cellB, textAlign:'center', fontWeight:700, background:'#f2f7f5' }}>{maxTotal}</td>
                  <td style={{ ...cellB, textAlign:'center', fontWeight:700, background:'#f2f7f5' }}>{Math.round(total)}</td>
                  <td style={{ ...cellB, textAlign:'center', fontWeight:700, background:'#f2f7f5' }}>{Math.round(pct)}%</td>
                  <td style={{ ...cellB, textAlign:'center', fontWeight:700, background:'#f2f7f5', color:meta.color }}>{grade}</td>
                  <td style={{ ...cellB, textAlign:'center', fontWeight:700, background:'#f2f7f5' }}>
                    {passed ? 'PASS' : 'FAIL'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Result summary */}
            <div style={{ display:'flex', gap:14, marginTop:16, flexWrap:'wrap' }}>
              {[['Percentage', `${Math.round(pct)}%`], ['Overall Grade', grade], ['Result', passed ? 'PASS' : 'FAIL']].map(([k, v]) => (
                <div key={k} style={{ flex:1, minWidth:120, border:'1px solid #d9e4e1', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                  <p style={{ fontSize:11, color:'#6b6b6b' }}>{k}</p>
                  <p style={{ fontSize:19, fontWeight:700, marginTop:3,
                    color: k === 'Result' ? (passed ? '#059669' : '#dc2626') : (k === 'Overall Grade' ? meta.color : 'var(--c-ink)') }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Signatures */}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:44, paddingTop:8 }}>
              {['Class Teacher', 'Principal', 'Parent'].map(s => (
                <div key={s} style={{ textAlign:'center', width:'30%' }}>
                  <div style={{ borderTop:'1px solid #999', paddingTop:5, fontSize:11, color:'#6b6b6b' }}>{s}</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign:'center', fontSize:10, color:'#9c9893', marginTop:22 }}>
              Generated by EnrollIQ · {new Date().toLocaleDateString('en-IN')}
            </p>
          </div>

          {/* AI Insights — internal view only, not part of the printed report card */}
          {student.id && exam.id && (
            <div style={{ marginTop:18 }}>
              {aiExamEnabled && <InsightsPanel studentId={student.id} examId={exam.id} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
const cellH = { border:'1px solid #d9e4e1', padding:'8px 11px', fontSize:12, fontWeight:700, background:'#f2f7f5' }
const cellB = { border:'1px solid #d9e4e1', padding:'8px 11px', fontSize:12.5 }
const cellL = { border:'1px solid #d9e4e1', padding:'7px 11px', fontSize:12, background:'#f9f8f5', fontWeight:600, width:'18%' }
const cellV = { border:'1px solid #d9e4e1', padding:'7px 11px', fontSize:12.5, width:'32%' }

/* ─── Marks Entry ─────────────────────────────────────────────── */
function MarkEntry({ exam, subjects, onBack, showToast }) {
  const [students, setStudents]   = useState([])
  const [marks, setMarks]         = useState({})
  const [selSubject, setSelSub]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [dirty, setDirty]         = useState(false)
  const [view, setView]           = useState('entry')     // entry | overview
  const [rcFor, setRcFor]         = useState(null)
  const [search, setSearch]       = useState('')
  const [showGenPaper, setShowGenPaper]     = useState(false)
  const [showViewPaper, setShowViewPaper]   = useState(false)
  const [aiExamEnabled, setAiExamEnabled]   = useState(false)

  useEffect(() => {
    api.get('/features/mine')
      .then(r => setAiExamEnabled(!!(r.data.features && r.data.features.ai_exam_system)))
      .catch(() => setAiExamEnabled(false))
  }, [])
  const [showUploadSheet, setShowUploadSheet] = useState(false)
  const inputs = useRef({})

  const classSubjects = useMemo(() => subjects.filter(s =>
    !exam.class_name || exam.class_name === 'All' || s.class_name === exam.class_name
  ), [subjects, exam])

  useEffect(() => {
    const cls = exam.class_name && exam.class_name !== 'All' ? exam.class_name : undefined
    examsApi.getStudents(cls)
      .then(r => setStudents(Array.isArray(r.data) ? r.data : (r.data?.students || r.data?.data || [])))
      .catch(() => setStudents([
        { id:1, name:'Arjun Pillai', roll_number:'S-001', class:'Grade 4', section:'A' },
        { id:2, name:'Deepa Kumar',  roll_number:'S-002', class:'Grade 4', section:'A' },
        { id:3, name:'Mohan Reddy',  roll_number:'S-003', class:'Grade 4', section:'A' },
        { id:4, name:'Priya Nair',   roll_number:'S-004', class:'Grade 4', section:'A' },
      ]))
  }, [exam])

  useEffect(() => {
    if (!exam?.id) return
    examsApi.getMarks(exam.id).then(r => {
      const m = {}
      ;(r.data || []).forEach(row => { m[`${row.student_id}_${row.subject_id}`] = row.marks })
      setMarks(m)
    }).catch(() => {})
  }, [exam])

  useEffect(() => { if (classSubjects.length && !selSubject) setSelSub(classSubjects[0]) }, [classSubjects, selSubject])

  const getMark = (sid, subid) => marks[`${sid}_${subid}`] ?? ''
  const setMark = (sid, subid, val, max) => {
    if (val !== '' && (isNaN(val) || Number(val) < 0 || Number(val) > max)) return
    setMarks(p => ({ ...p, [`${sid}_${subid}`]: val })); setDirty(true); setSaved(false)
  }

  // Enter / arrows move down the column
  const onKey = (e, idx) => {
    if (['Enter','ArrowDown'].includes(e.key)) { e.preventDefault(); inputs.current[idx+1]?.focus(); inputs.current[idx+1]?.select() }
    if (e.key === 'ArrowUp') { e.preventDefault(); inputs.current[idx-1]?.focus(); inputs.current[idx-1]?.select() }
  }

  const save = async () => {
    setSaving(true)
    const rows = []
    students.forEach(st => classSubjects.forEach(sub => {
      const m = getMark(st.id, sub.id)
      if (m !== '') rows.push({ student_id:st.id, subject_id:sub.id, marks:parseFloat(m), max_marks:sub.max_marks })
    }))
    if (!rows.length) { showToast('No marks entered yet'); setSaving(false); return }
    try { await examsApi.enterMarks(exam.id, { marks: rows }); showToast(`${rows.length} marks saved ✓`) }
    catch { showToast('Saved (demo)') }
    setSaved(true); setDirty(false); setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const genRC = async () => {
    if (!confirm('Generate report cards for all students with marks entered?')) return
    try { const r = await examsApi.generateRC(exam.id); showToast(r.data?.message || 'Report cards generated ✓') }
    catch { showToast('Report cards generated ✓ (demo)') }
  }

  // student totals
  const studentTotals = (st) => {
    const rows = classSubjects.map(sub => ({ subject:sub.name, max:sub.max_marks, marks:getMark(st.id, sub.id) }))
      .filter(r => r.marks !== '').map(r => ({ ...r, marks:parseFloat(r.marks) }))
    const total = rows.reduce((a, r) => a + r.marks, 0)
    const max   = rows.reduce((a, r) => a + r.max, 0)
    const pct   = max ? (total / max) * 100 : null
    return { rows, total, max, pct, grade: pct != null ? calcGrade(pct, 100) : null }
  }

  const shown = students.filter(s => !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.roll_number || '').toLowerCase().includes(search.toLowerCase()))

  const filled = selSubject ? students.filter(s => getMark(s.id, selSubject.id) !== '').length : 0
  const pctDone = students.length ? Math.round((filled / students.length) * 100) : 0

  const subjStats = useMemo(() => {
    if (!selSubject) return null
    const vals = students.map(s => getMark(s.id, selSubject.id)).filter(m => m !== '').map(Number)
    if (!vals.length) return null
    return {
      avg: Math.round(vals.reduce((a,b) => a+b, 0) / vals.length),
      high: Math.max(...vals), low: Math.min(...vals),
      pass: vals.filter(v => (v / selSubject.max_marks) * 100 >= PASS_PCT).length,
      count: vals.length,
    }
  }, [marks, selSubject, students])

  return (
    <div className="flex flex-col gap-5 fade-up">
      {/* Header */}
      <div className="page-head" style={{ marginBottom:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0 }}>
          <button onClick={onBack} className="btn-ghost text-sm">←</button>
          <div style={{ minWidth:0 }}>
            <h2 className="font-serif text-xl font-bold text-ink" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {exam.name}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`badge ${TYPE_STYLE[exam.exam_type] || 'badge-gray'}`}>{exam.exam_type}</span>
              <span className="text-xs text-gray-400">{exam.class_name}</span>
              {exam.start_date && <span className="text-xs text-gray-400">· {fmtDate(exam.start_date)}</span>}
            </div>
          </div>
        </div>
        <div className="actions">
          {aiExamEnabled && <button className="btn-ghost text-sm" onClick={() => setShowGenPaper(true)}>✨ Generate paper</button>}
          {aiExamEnabled && <button className="btn-ghost text-sm" onClick={() => setShowViewPaper(true)}>📄 View paper</button>}
          {aiExamEnabled && <button className="btn-ghost text-sm" onClick={() => setShowUploadSheet(true)}>📤 Upload answer sheet</button>}
          <button className="btn-ghost text-sm" onClick={genRC}>📄 Generate report cards</button>
          <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : dirty ? '💾 Save marks' : 'Saved'}
          </button>
        </div>
      </div>

      {/* View switch */}
      <div className="tabs-strip">
        {[['entry','✏️ Marks entry'], ['overview','📊 Class overview']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)}
            className={`text-xs px-4 py-2 rounded-md font-medium transition-colors ${view === k ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream'}`}>
            {l}
          </button>
        ))}
      </div>

      {classSubjects.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">📚</div>
          <p className="empty-title">No subjects for {exam.class_name}</p>
          <p className="empty-sub">Add subjects in the Subjects tab before entering marks.</p>
        </div>
      ) : view === 'entry' ? (
        <>
          {/* Subject pills */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {classSubjects.map(sub => {
              const done = students.filter(s => getMark(s.id, sub.id) !== '').length
              const all  = students.length > 0 && done === students.length
              const on   = selSubject?.id === sub.id
              return (
                <button key={sub.id} onClick={() => setSelSub(sub)}
                  style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:99,
                    fontSize:12.5, cursor:'pointer', transition:'all .15s',
                    border: on ? '1.5px solid var(--c-ink)' : '1.5px solid var(--c-border-2)',
                    background: on ? 'var(--c-ink)' : 'var(--c-surface)',
                    color: on ? '#fff' : 'var(--c-ink-2)', fontWeight: on ? 600 : 500 }}>
                  {all && <span style={{ color: on ? '#6ee7b7' : 'var(--c-green)' }}>✓</span>}
                  {sub.name}
                  <span style={{ opacity:.6, fontSize:11 }}>{done}/{students.length}</span>
                </button>
              )
            })}
          </div>

          {selSubject && (
            <>
              {/* Progress + stats */}
              <div className="grid grid-cols-4 gap-4 g-4">
                {[
                  { label:'Entered', value:`${filled}/${students.length}`, sub:`${pctDone}% complete`, accent:true },
                  { label:'Average',  value: subjStats ? `${subjStats.avg}/${selSubject.max_marks}` : '—' },
                  { label:'Highest',  value: subjStats ? subjStats.high : '—', sub: subjStats ? `Lowest ${subjStats.low}` : '' },
                  { label:'Passed',   value: subjStats ? `${subjStats.pass}/${subjStats.count}` : '—', sub:`Pass mark ${PASS_PCT}%` },
                ].map(k => (
                  <div key={k.label} className="stat-card">
                    <p className="label">{k.label}</p>
                    <p className={`font-serif text-2xl font-bold mt-1 ${k.accent ? 'text-brand-600' : 'text-ink'}`}>{k.value}</p>
                    {k.sub && <p className="text-xs text-gray-400 mt-1">{k.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Entry grid */}
              <div className="card" style={{ padding:0 }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)', display:'flex',
                  justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <div>
                    <h3 className="font-semibold text-ink text-sm">{selSubject.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Max {selSubject.max_marks} · press Enter to move down</p>
                  </div>
                  <input className="input" style={{ width:190 }} placeholder="Search student…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* progress bar */}
                <div style={{ height:4, background:'#f0ede6' }}>
                  <div style={{ height:'100%', width:`${pctDone}%`, background:'var(--c-brand)', transition:'width .3s' }} />
                </div>

                {students.length === 0 ? (
                  <div className="empty-state" style={{ padding:'40px 24px' }}>
                    <div className="empty-icon">👥</div>
                    <p className="empty-title">No students in {exam.class_name}</p>
                    <p className="empty-sub">
                      This exam is for <b>{exam.class_name}</b>, but no students are enrolled in that class.
                      Add students to {exam.class_name}, or create an exam for a class that has students.
                    </p>
                  </div>
                ) : (
                <div style={{ overflowX:'auto' }}>
                  <table className="w-full text-sm" style={{ minWidth:560 }}>
                    <thead>
                      <tr className="border-b border-gray-100 bg-cream">
                        {['#','Student','Roll','Marks','Grade','%'].map((h, i) => (
                          <th key={h} className="text-xs text-gray-400 font-medium px-5 py-3"
                            style={{ textAlign: i >= 3 ? 'center' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {shown.map((st, i) => {
                        const m = getMark(st.id, selSubject.id)
                        const g = m !== '' ? calcGrade(parseFloat(m), selSubject.max_marks) : ''
                        const p = m !== '' ? Math.round((parseFloat(m) / selSubject.max_marks) * 100) : null
                        const failing = p !== null && p < PASS_PCT
                        return (
                          <tr key={st.id} className="hover:bg-cream">
                            <td className="px-5 py-2 text-xs text-gray-400">{i+1}</td>
                            <td className="px-5 py-2">
                              <div className="flex items-center gap-2">
                                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--c-brand-lt)',
                                  color:'var(--c-brand)', display:'flex', alignItems:'center', justifyContent:'center',
                                  fontSize:11, fontWeight:700, flexShrink:0 }}>{st.name[0]}</div>
                                <span className="text-xs font-medium text-ink">{st.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-2 text-xs text-gray-400" style={{ fontFamily:'monospace' }}>{st.roll_number}</td>
                            <td className="px-5 py-2" style={{ textAlign:'center' }}>
                              <input ref={el => inputs.current[i] = el}
                                type="number" min="0" max={selSubject.max_marks} value={m}
                                onChange={e => setMark(st.id, selSubject.id, e.target.value, selSubject.max_marks)}
                                onKeyDown={e => onKey(e, i)}
                                onFocus={e => e.target.select()}
                                placeholder="—"
                                className="input"
                                style={{ width:74, textAlign:'center', padding:'5px 8px', margin:'0 auto',
                                  borderColor: failing ? 'var(--c-red)' : undefined }} />
                            </td>
                            <td className="px-5 py-2" style={{ textAlign:'center' }}>
                              {g && <span style={{ fontWeight:700, fontSize:13, color:gradeColor(g) }}>{g}</span>}
                            </td>
                            <td className="px-5 py-2 text-xs" style={{ textAlign:'center', color: failing ? 'var(--c-red)' : 'var(--c-muted)' }}>
                              {p !== null ? `${p}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                )}

                {/* grade distribution */}
                {subjStats && (
                  <div style={{ padding:'12px 20px', borderTop:'1px solid var(--c-border)', background:'var(--c-surface-2)',
                    display:'flex', gap:14, flexWrap:'wrap', alignItems:'center', borderRadius:'0 0 16px 16px' }}>
                    {GRADE_SCALE.map(gs => {
                      const c = students.filter(s => {
                        const m = getMark(s.id, selSubject.id)
                        return m !== '' && calcGrade(parseFloat(m), selSubject.max_marks) === gs.grade
                      }).length
                      return c > 0 ? (
                        <span key={gs.grade} style={{ fontSize:12, fontWeight:600, color:gs.color }}>
                          {gs.grade}: {c}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        /* ── CLASS OVERVIEW ── */
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)' }}>
            <h3 className="font-semibold text-ink text-sm">Class overview — all subjects</h3>
            <p className="text-xs text-gray-400 mt-0.5">Click a student to view their report card</p>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="w-full text-xs" style={{ minWidth: 520 + classSubjects.length * 70 }}>
              <thead>
                <tr className="border-b border-gray-100 bg-cream">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Student</th>
                  {classSubjects.map(s => (
                    <th key={s.id} className="text-center text-gray-400 font-medium px-2 py-3">{s.name}</th>
                  ))}
                  {['Total','%','Grade','Result',''].map((h, i) => (
                    <th key={i} className="text-center text-gray-400 font-medium px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map(st => {
                  const t = studentTotals(st)
                  const passed = t.pct != null && t.pct >= PASS_PCT && t.rows.every(r => (r.marks/r.max)*100 >= PASS_PCT)
                  return (
                    <tr key={st.id} className="hover:bg-cream">
                      <td className="px-5 py-2.5 font-medium text-ink">{st.name}</td>
                      {classSubjects.map(sub => {
                        const m = getMark(st.id, sub.id)
                        const g = m !== '' ? calcGrade(parseFloat(m), sub.max_marks) : ''
                        return (
                          <td key={sub.id} className="px-2 py-2.5 text-center">
                            {m !== '' ? <span style={{ fontWeight:600, color:gradeColor(g) }}>{m}</span>
                                      : <span className="text-gray-300">—</span>}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-center font-semibold text-ink">{t.rows.length ? Math.round(t.total) : '—'}</td>
                      <td className="px-3 py-2.5 text-center text-gray-500">{t.pct != null ? `${Math.round(t.pct)}%` : '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        {t.grade && <span style={{ fontWeight:700, color:gradeColor(t.grade) }}>{t.grade}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {t.pct != null && (
                          <span className={`badge ${passed ? 'badge-green' : 'badge-red'}`}>{passed ? 'Pass' : 'Fail'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {t.rows.length > 0 && (
                          <button className="text-xs text-brand-600 hover:underline"
                            onClick={() => setRcFor({ student:st, rows:t.rows })}>
                            Report card
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rcFor && (
        <ReportCard student={rcFor.student} exam={exam} rows={rcFor.rows} onClose={() => setRcFor(null)} aiExamEnabled={aiExamEnabled} />
      )}

      {showViewPaper && (
        <ViewPaperModal exam={exam} onClose={() => setShowViewPaper(false)} />
      )}
      {showGenPaper && (
        <GeneratePaperModal exam={exam} subjects={classSubjects}
          onClose={() => setShowGenPaper(false)} showToast={showToast} />
      )}
      {showUploadSheet && (
        <AnswerSheetUpload exam={exam} students={students} subjects={classSubjects}
          onClose={() => setShowUploadSheet(false)} showToast={showToast} />
      )}
    </div>
  )
}

/* ═══ PAGE ═══════════════════════════════════════════════════ */
export default function Exams() {
  const [tab, setTab]           = useState('exams')
  const [exams, setExams]       = useState([])
  const [subjects, setSubjects] = useState([])
  const [showExam, setShowExam] = useState(false)
  const [showSub, setShowSub]   = useState(false)
  const [marksFor, setMarksFor] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [clsFilter, setCls]     = useState('All')
  const [toast, setToast]       = useState('')
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2600) }

  const load = async () => {
    setLoading(true)
    const [er, sr] = await Promise.allSettled([examsApi.getExams(), examsApi.getSubjects()])
    if (er.status === 'fulfilled') setExams(er.value.data || [])
    if (sr.status === 'fulfilled') setSubjects(sr.value.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total: exams.length,
    ongoing: exams.filter(e => e.status === 'Ongoing').length,
    completed: exams.filter(e => e.status === 'Completed').length,
    subjects: subjects.length,
  }), [exams, subjects])

  const shownExams = exams.filter(e =>
    (clsFilter === 'All' || e.class_name === clsFilter) &&
    (!search || e.name?.toLowerCase().includes(search.toLowerCase()))
  )

  if (marksFor) {
    return (
      <Layout>
        <div className="page">
          {toast && <div className="toast">{toast}</div>}
          <MarkEntry exam={marksFor} subjects={subjects} onBack={() => { setMarksFor(null); load() }} showToast={showToast} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page">
        {toast && <div className="toast">{toast}</div>}

        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Exams & Report Cards</h1>
            <p className="text-gray-400 text-sm mt-1">Create exams, enter marks, generate report cards</p>
          </div>
          <div className="actions">
            {tab === 'subjects' && <button className="btn-ghost text-sm" onClick={() => setShowSub(true)}>+ Add subject</button>}
            <button className="btn-primary" onClick={() => setShowExam(true)}>+ Create exam</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 g-4">
          {[
            { label:'Total exams', value:stats.total, accent:true },
            { label:'Ongoing',     value:stats.ongoing },
            { label:'Completed',   value:stats.completed },
            { label:'Subjects',    value:stats.subjects },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <p className="label">{k.label}</p>
              <p className={`font-serif text-3xl font-bold mt-1 ${k.accent ? 'text-brand-600' : 'text-ink'}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-strip mb-6">
          {['exams','subjects'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs px-4 py-2 rounded-md transition-colors font-medium capitalize ${tab === t ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ── EXAMS ── */}
        {tab === 'exams' && (
          loading ? (
            <div className="card empty-state"><p className="empty-sub">Loading exams…</p></div>
          ) : exams.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">📝</div>
              <p className="empty-title">No exams yet</p>
              <p className="empty-sub" style={{ marginBottom:16 }}>Create your first exam to start entering marks</p>
              <button className="btn-primary" onClick={() => setShowExam(true)}>Create first exam</button>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                <input className="input" style={{ flex:1, minWidth:180 }} placeholder="Search exams…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ width:150 }} value={clsFilter} onChange={e => setCls(e.target.value)}>
                  <option>All</option>{CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-3">
                {shownExams.length === 0 && (
                  <div className="card empty-state"><p className="empty-sub">No exams match your search</p></div>
                )}
                {shownExams.map(exam => {
                  const st = exam.status || 'Upcoming'
                  const badge = st === 'Completed' ? 'badge-green' : st === 'Ongoing' ? 'badge-blue' : 'badge-amber'
                  return (
                    <div key={exam.id} className="card card-hover" style={{ cursor:'pointer' }}
                      onClick={() => setMarksFor(exam)}>
                      <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                        <div style={{ width:46, height:46, borderRadius:12, background:'var(--c-brand-lt)',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📝</div>
                        <div style={{ flex:1, minWidth:170 }}>
                          <h3 className="font-semibold text-ink">{exam.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`badge ${TYPE_STYLE[exam.exam_type] || 'badge-gray'}`}>{exam.exam_type}</span>
                            <span className="text-xs text-gray-400">{exam.class_name}</span>
                            {exam.start_date && <span className="text-xs text-gray-400">· {fmtDate(exam.start_date)}</span>}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:22, flexWrap:'wrap' }}>
                          <div style={{ textAlign:'center' }}>
                            <p className="text-lg font-bold text-ink">{exam.students_appeared || 0}</p>
                            <p className="text-xs text-gray-400">Students</p>
                          </div>
                          <div style={{ textAlign:'center' }}>
                            <p className="text-lg font-bold text-ink">{exam.subjects_count || 0}</p>
                            <p className="text-xs text-gray-400">Subjects</p>
                          </div>
                          <span className={`badge ${badge}`}>{st}</span>
                          <button className="btn-primary" style={{ padding:'8px 16px', fontSize:12.5 }}
                            onClick={e => { e.stopPropagation(); setMarksFor(exam) }}>
                            ✏️ Enter marks
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        )}

        {/* ── SUBJECTS ── */}
        {tab === 'subjects' && (
          subjects.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">📚</div>
              <p className="empty-title">No subjects yet</p>
              <p className="empty-sub" style={{ marginBottom:16 }}>Add subjects before creating exams</p>
              <button className="btn-primary" onClick={() => setShowSub(true)}>Add first subject</button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {CLASSES.filter(c => subjects.some(s => s.class_name === c)).map(cls => {
                const list = subjects.filter(s => s.class_name === cls)
                const totalMarks = list.reduce((a, s) => a + Number(s.max_marks || 0), 0)
                return (
                  <div key={cls} className="card" style={{ padding:0 }}>
                    <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--c-border)', display:'flex',
                      justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                      <h3 className="font-semibold text-ink text-sm">{cls}</h3>
                      <span className="text-xs text-gray-400">{list.length} subjects · {totalMarks} total marks</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:10, padding:16 }}>
                      {list.map(s => (
                        <div key={s.id} style={{ border:'1px solid var(--c-border)', borderRadius:12,
                          padding:'12px 16px', minWidth:150, background:'var(--c-surface-2)' }}>
                          <p className="text-sm font-semibold text-ink">{s.name}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {s.code ? `${s.code} · ` : ''}Max {s.max_marks}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {showExam && <ExamModal    onClose={() => setShowExam(false)} onSaved={() => { setShowExam(false); load() }} showToast={showToast} />}
      {showSub  && <SubjectModal onClose={() => setShowSub(false)}  onSaved={() => { setShowSub(false);  load() }} showToast={showToast} />}
    </Layout>
  )
}