import { useState, useEffect } from 'react'

function safeBreakdown(v) {
  if (Array.isArray(v)) return v
  try { return JSON.parse(v || '[]') } catch { return [] }
}
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   AI Exam Tools — plugs into Exams.jsx
   Three pieces:
     1. <GeneratePaperModal>   — AI question paper generation
     2. <AnswerSheetUpload>    — OCR + AI grading of answer sheets
     3. <InsightsPanel>        — AI insights on a student's report card

   Usage inside Exams.jsx:
     import { GeneratePaperModal, AnswerSheetUpload, InsightsPanel } from './AIExamTools'
   ═══════════════════════════════════════════════════════════════ */

const aiApi = {
  extractTopics:     (formData) => api.post('/ai-exams/extract-topics', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  generatePaper:     (d)      => api.post('/ai-exams/papers', d),
  listPapers:        (examId) => api.get(`/ai-exams/papers/${examId}`),
  getPaperQuestions: (id)     => api.get(`/ai-exams/papers/${id}/questions`),
  approvePaper:      (id)     => api.put(`/ai-exams/papers/${id}/approve`),
  uploadAnswerSheet: (formData) => api.post('/ai-exams/answer-sheets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  listAnswerSheets:  (examId) => api.get(`/ai-exams/answer-sheets/${examId}`),
  approveSheet:      (id, marks_override) => api.post(`/ai-exams/answer-sheets/${id}/approve`, { marks_override }),
  allowRetake:       (id) => api.delete(`/ai-exams/answer-sheets/${id}`),
  getInsights:       (studentId, examId, refresh) => api.get(`/ai-exams/insights/${studentId}/${examId}`, { params: refresh ? { refresh: true } : {} }),
}

/* ─── 1. Generate question paper ─────────────────────────────── */
export function GeneratePaperModal({ exam, subjects, onClose, showToast }) {
  const [form, setForm] = useState({
    subject_id: subjects[0]?.id || '', topics: '', difficulty: 'Medium', total_marks: 100, question_mix: '',
  })
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState(null)
  const [paperId, setPaperId] = useState(null)
  const [err, setErr] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [pdfName, setPdfName] = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handlePdf = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPdfName(file.name)
    setExtracting(true); setErr('')
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await aiApi.extractTopics(formData)
      setForm(p => ({ ...p, topics: res.data.topics }))
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not read this PDF. Try typing the topics instead.')
      setPdfName('')
    } finally { setExtracting(false) }
  }

  const generate = async () => {
    if (!form.subject_id || !form.topics.trim()) { setErr('Pick a subject and enter topics.'); return }
    setLoading(true); setErr('')
    try {
      const res = await aiApi.generatePaper({ ...form, exam_id: exam.id, class_name: exam.class_name })
      setQuestions(res.data.questions)
      setPaperId(res.data.paper_id)
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not generate paper. Try again.')
    } finally { setLoading(false) }
  }

  const approve = async () => {
    try { await aiApi.approvePaper(paperId); showToast('Paper approved ✓'); onClose() }
    catch { setErr('Could not approve paper.') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-title">Generate question paper with AI</span>
            <p className="text-xs text-gray-400 mt-0.5">{exam.name} · {exam.class_name}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {err && <div className="badge badge-red" style={{ padding:'8px 12px', borderRadius:8 }}>{err}</div>}

          {!questions ? (
            <>
              <div>
                <label className="label">Subject *</label>
                <select className="input" value={form.subject_id} onChange={set('subject_id')}>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Topics to cover *</label>
                <label className="block border-2 border-dashed rounded-lg p-3 text-center cursor-pointer mb-2"
                  style={{ borderColor:'var(--c-border-2)', fontSize:12.5 }}>
                  <input type="file" accept="application/pdf" className="hidden" onChange={handlePdf} />
                  {extracting ? 'Reading PDF…' : pdfName ? `📄 ${pdfName} — topics filled in below (edit freely)` : '📄 Or upload a lesson/topic PDF to auto-fill topics'}
                </label>
                <textarea className="input" rows={3} value={form.topics} onChange={set('topics')}
                  placeholder="e.g. Fractions, decimals, basic geometry — chapters 3-5" />
                <p className="text-xs text-gray-400 mt-1">PDF must contain real text (not a scanned image) — edit the extracted text if it needs trimming.</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
                <div>
                  <label className="label">Difficulty</label>
                  <select className="input" value={form.difficulty} onChange={set('difficulty')}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label">Total marks</label>
                  <input className="input" type="number" value={form.total_marks} onChange={set('total_marks')} />
                </div>
              </div>
              <div>
                <label className="label">Question mix (optional)</label>
                <input className="input" value={form.question_mix} onChange={set('question_mix')}
                  placeholder="e.g. mostly MCQ with 2 long-answer questions" />
              </div>
              <button className="btn-primary" onClick={generate} disabled={loading}>
                {loading ? 'Generating…' : '✨ Generate paper'}
              </button>
            </>
          ) : (
            <>
              <div style={{ maxHeight: 380, overflowY:'auto', display:'flex', flexDirection:'column', gap:10 }}>
                {questions.map(q => (
                  <div key={q.question_number} style={{ border:'1px solid var(--c-border)', borderRadius:10, padding:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                      <p className="text-sm font-medium text-ink">Q{q.question_number}. {q.question_text}</p>
                      <span className="badge badge-gray" style={{ flexShrink:0 }}>{q.marks} marks</span>
                    </div>
                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:2 }}>
                        {q.options.map((o, i) => <p key={i} className="text-xs text-gray-500">{o}</p>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-primary" style={{ flex:1 }} onClick={approve}>Approve & save paper</button>
                <button className="btn-ghost" onClick={() => { setQuestions(null); setPaperId(null) }}>Regenerate</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── 2. Answer sheet upload + AI grading ────────────────────── */
export function AnswerSheetUpload({ exam, students, subjects, onClose, showToast }) {
  const [studentId, setStudentId] = useState(students[0]?.id || '')
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [submissions, setSubmissions] = useState([])
  const [viewing, setViewing] = useState(null)  // a submitted sheet being reviewed
  const [view, setView] = useState('submissions')  // 'submissions' | 'upload'

  const loadSubmissions = async () => {
    try { const res = await aiApi.listAnswerSheets(exam.id); setSubmissions(res.data || []) } catch {}
  }
  useEffect(() => { loadSubmissions() }, [])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  const grade = async () => {
    if (!file || !studentId || !subjectId) { setErr('Pick a student, subject, and upload an image.'); return }
    setLoading(true); setErr('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('exam_id', exam.id)
      formData.append('student_id', studentId)
      formData.append('subject_id', subjectId)
      const res = await aiApi.uploadAnswerSheet(formData)
      setResult(res.data)
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not grade this sheet.')
    } finally { setLoading(false) }
  }

  const [override, setOverride] = useState(null)
  const approve = async () => {
    try {
      await aiApi.approveSheet(result.id, override)
      showToast('Marks saved ✓')
      onClose()
    } catch { setErr('Could not save marks.') }
  }

  const [viewOverride, setViewOverride] = useState(null)
  const approveViewed = async () => {
    try {
      await aiApi.approveSheet(viewing.id, viewOverride)
      showToast('Marks saved ✓')
      setViewing(null); loadSubmissions()
    } catch { setErr('Could not save marks.') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-title">Upload answer sheet — AI grading</span>
            <p className="text-xs text-gray-400 mt-0.5">{exam.name}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {err && <div className="badge badge-red" style={{ padding:'8px 12px', borderRadius:8 }}>{err}</div>}

          {/* tabs: submitted tests vs manual upload */}
          <div style={{ display:'flex', gap:8 }}>
            <button className={view==='submissions'?'btn-primary':'btn-ghost'} style={{ flex:1, fontSize:13 }}
              onClick={() => { setView('submissions'); setViewing(null) }}>📥 Submitted Tests ({submissions.length})</button>
            <button className={view==='upload'?'btn-primary':'btn-ghost'} style={{ flex:1, fontSize:13 }}
              onClick={() => setView('upload')}>⬆ Upload Manually</button>
          </div>

          {/* ── SUBMITTED TESTS LIST ── */}
          {view==='submissions' && !viewing && (
            submissions.length === 0
              ? <p className="text-sm text-gray-400" style={{ textAlign:'center', padding:20 }}>No student submissions yet.</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {submissions.map(s => (
                    <div key={s.id} onClick={() => { setViewing({ ...s, question_breakdown: safeBreakdown(s.question_breakdown) }); setViewOverride(null) }}
                      style={{ border:'1px solid var(--c-border)', borderRadius:10, padding:'10px 12px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <p className="text-sm font-medium text-ink">{s.student_name} <span className="text-xs text-gray-400">({s.roll_number})</span></p>
                        <p className="text-xs text-gray-500">{s.subject_name} · {s.image_path === 'typed' ? '⌨ Typed' : '📷 Photo'}</p>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p className="text-sm font-semibold text-ink">{s.ai_marks}/{s.max_marks}</p>
                        <span className={'badge ' + (s.status==='Approved'?'badge-green':'badge-gray')} style={{ fontSize:10 }}>{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {/* ── VIEW ONE SUBMISSION (student's answers) ── */}
          {view==='submissions' && viewing && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <button className="btn-ghost" style={{ alignSelf:'flex-start', fontSize:12 }} onClick={() => setViewing(null)}>← Back to list</button>
              <div>
                <p className="text-sm font-semibold text-ink">{viewing.student_name} · {viewing.subject_name}</p>
                <p className="text-xs text-gray-500">{viewing.ai_feedback}</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
                {(viewing.question_breakdown || []).map((q, i) => (
                  <div key={i} style={{ border:'1px solid var(--c-border)', borderRadius:8, padding:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span className="text-xs font-semibold text-ink">Q{q.question_number}</span>
                      <span className="text-xs text-gray-500">{q.marks_awarded}/{q.max_marks}</span>
                    </div>
                    <p className="text-xs text-gray-600" style={{ marginTop:4 }}><b>Answer:</b> {q.extracted_answer || '—'}</p>
                    {q.reasoning && <p className="text-xs text-gray-400" style={{ marginTop:2 }}>{q.reasoning}</p>}
                  </div>
                ))}
              </div>
              {viewing.status !== 'Approved' && (
                <>
                  <div>
                    <label className="label">Adjust total marks (optional)</label>
                    <input className="input" type="number" placeholder={viewing.ai_marks}
                      onChange={e => setViewOverride(e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <button className="btn-primary" onClick={approveViewed}>Approve & save to marksheet</button>
                </>
              )}
              {viewing.status === 'Approved' && <p className="badge badge-green" style={{ alignSelf:'flex-start' }}>Already approved ✓</p>}
              {viewing.status !== 'Approved' && (
                <button className="btn-ghost" style={{ color:'#dc2626', alignSelf:'flex-start', fontSize:12 }}
                  onClick={async () => {
                    if (!confirm('Allow this student to retake the test? Their current submission will be removed.')) return
                    try { await aiApi.allowRetake(viewing.id); showToast('Retake allowed'); setViewing(null); loadSubmissions() }
                    catch (e) { setErr(e.response?.data?.message || 'Could not allow retake.') }
                  }}>↺ Allow retake (removes this submission)</button>
              )}
            </div>
          )}

          {/* ── MANUAL UPLOAD (existing) ── */}
          {view==='upload' && (
          <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
            <div>
              <label className="label">Student</label>
              <select className="input" value={studentId} onChange={e => setStudentId(e.target.value)}>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {!result && (
            <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer" style={{ borderColor:'var(--c-border-2)' }}>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              {preview ? <img src={preview} alt="preview" style={{ maxHeight:180, margin:'0 auto', borderRadius:8 }} />
                : <><span style={{ fontSize:32, display:'block', marginBottom:8 }}>📄</span>
                    <p className="text-sm font-medium text-ink">Click to upload a photo of the answer sheet</p></>}
            </label>
          )}

          {file && !result && (
            <button className="btn-primary" onClick={grade} disabled={loading}>
              {loading ? 'Reading & grading…' : '✨ Grade with AI'}
            </button>
          )}

          {result && (
            <>
              <div style={{ background:'var(--c-brand-lt)', borderRadius:10, padding:14 }}>
                <p className="text-2xl font-bold text-ink">{result.ai_marks} / {result.max_marks}</p>
                <p className="text-xs text-gray-500 mt-1">{result.ai_feedback}</p>
              </div>
              <div style={{ maxHeight:240, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
                {(result.question_breakdown || []).map(q => (
                  <div key={q.question_number} style={{ border:'1px solid var(--c-border)', borderRadius:8, padding:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <p className="text-xs font-medium text-ink">Q{q.question_number}</p>
                      <span className="text-xs text-gray-500">{q.marks_awarded}/{q.max_marks}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{q.reasoning}</p>
                  </div>
                ))}
              </div>
              <div>
                <label className="label">Adjust total marks (optional)</label>
                <input className="input" type="number" placeholder={result.ai_marks}
                  onChange={e => setOverride(e.target.value === '' ? null : Number(e.target.value))} />
              </div>
              <button className="btn-primary" onClick={approve}>Approve & save to marksheet</button>
            </>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── 2c. View saved question papers ─────────────────────────── */
export function ViewPaperModal({ exam, onClose }) {
  const [papers, setPapers]     = useState([])
  const [selected, setSelected] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    aiApi.listPapers(exam.id)
      .then(res => setPapers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openPaper = async (p) => {
    setSelected(p)
    try {
      const res = await aiApi.getPaperQuestions(p.id)
      setQuestions((res.data || []).map(q => ({ ...q, options: safeBreakdown(q.options) })))
    } catch { setQuestions([]) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-title">Question Papers</span>
            <p className="text-xs text-gray-400 mt-0.5">{exam.name}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {loading ? <p className="text-sm text-gray-400" style={{ textAlign:'center', padding:20 }}>Loading…</p>
           : !selected ? (
            papers.length === 0
              ? <p className="text-sm text-gray-400" style={{ textAlign:'center', padding:20 }}>No papers generated yet for this exam.</p>
              : papers.map(p => (
                <div key={p.id} onClick={() => openPaper(p)}
                  style={{ border:'1px solid var(--c-border)', borderRadius:10, padding:'10px 12px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p className="text-sm font-medium text-ink">{p.subject_name || 'Paper'} · {p.difficulty}</p>
                    <p className="text-xs text-gray-500">{p.total_marks} marks · {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={'badge ' + (p.status==='Approved'?'badge-green':'badge-gray')} style={{ fontSize:10 }}>{p.status}</span>
                </div>
              ))
          ) : (
            <>
              <button className="btn-ghost" style={{ alignSelf:'flex-start', fontSize:12 }} onClick={() => { setSelected(null); setQuestions([]) }}>← All papers</button>
              <div>
                <p className="text-sm font-semibold text-ink">{selected.subject_name} · {selected.difficulty} · {selected.total_marks} marks</p>
              </div>
              <p className="text-xs text-gray-400">Edit any question, then Save changes.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:340, overflowY:'auto' }}>
                {questions.map((q, i) => (
                  <div key={q.id || i} style={{ border:'1px solid var(--c-border)', borderRadius:8, padding:10 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                      <span className="text-sm text-ink" style={{ fontWeight:600, flexShrink:0 }}>Q{i+1}.</span>
                      <textarea className="input" style={{ fontSize:13, minHeight:40, flex:1, resize:'vertical' }}
                        value={q.question_text}
                        onChange={e => { const v=e.target.value; setQuestions(qs => qs.map(x => x.id===q.id ? {...x, question_text:v} : x)) }} />
                      <button title="Delete" onClick={async () => {
                          if (q.id) { try { await aiApi.deleteQuestion(q.id) } catch {} }
                          setQuestions(qs => qs.filter(x => x.id !== q.id))
                        }} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:15, flexShrink:0 }}>🗑</button>
                    </div>
                    {q.options && Array.isArray(q.options) && (
                      <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
                        {q.options.map((o, j) => (
                          <input key={j} className="input" style={{ fontSize:12, padding:'4px 8px' }} value={o}
                            onChange={e => { const v=e.target.value; setQuestions(qs => qs.map(x => x.id===q.id ? {...x, options: x.options.map((oo,oi)=> oi===j?v:oo)} : x)) }} />
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
                      <label className="text-xs text-gray-400">Marks:</label>
                      <input type="number" className="input" style={{ width:70, fontSize:12, padding:'4px 8px' }} value={q.marks}
                        onChange={e => { const v=e.target.value; setQuestions(qs => qs.map(x => x.id===q.id ? {...x, marks:v} : x)) }} />
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary" disabled={saving} onClick={async () => {
                setSaving(true)
                try {
                  for (const q of questions) {
                    if (q.id) await aiApi.updateQuestion(q.id, { question_text:q.question_text, marks:q.marks,
                      options: Array.isArray(q.options)?q.options:null, correct_answer:q.correct_answer||null })
                  }
                  alert('Changes saved ✓')
                } catch { alert('Could not save some changes.') }
                finally { setSaving(false) }
              }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── 3. AI Insights panel (embed in report card view) ───────── */
export function InsightsPanel({ studentId, examId }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  const load = async (refresh = false) => {
    setLoading(true); setErr('')
    try {
      const res = await aiApi.getInsights(studentId, examId, refresh)
      setInsights(res.data)
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load insights.')
    } finally { setLoading(false) }
  }

  const ALERT_STYLE = {
    None:   { bg:'#f0fdf4', c:'#16a34a', label:'On track' },
    Watch:  { bg:'#fffbeb', c:'#d97706', label:'Needs attention' },
    Urgent: { bg:'#fef2f2', c:'#dc2626', label:'Urgent' },
  }

  if (!insights && !loading) {
    return (
      <div className="card" style={{ textAlign:'center', padding:24 }}>
        <p className="text-sm text-gray-500 mb-3">AI insights not generated yet for this report card.</p>
        <button className="btn-primary" onClick={() => load(false)}>✨ Generate AI insights</button>
        {err && <p className="text-xs" style={{ color:'#dc2626', marginTop:8 }}>{err}</p>}
      </div>
    )
  }

  if (loading) {
    return <div className="card" style={{ textAlign:'center', padding:24 }}><p className="text-sm text-gray-400">Analyzing…</p></div>
  }

  const alert = ALERT_STYLE[insights.alert_level] || ALERT_STYLE.None

  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3 className="font-semibold text-ink text-sm">✨ AI Insights</h3>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="badge" style={{ background:alert.bg, color:alert.c }}>{alert.label}</span>
          <button className="btn-ghost" style={{ fontSize:11, padding:'4px 8px' }} onClick={() => load(true)}>Refresh</button>
        </div>
      </div>
      <p className="text-sm text-gray-600">{insights.summary}</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Weak subjects</p>
          {insights.weak_subjects?.length
            ? insights.weak_subjects.map(s => <span key={s} className="badge badge-red" style={{ marginRight:4, marginBottom:4 }}>{s}</span>)
            : <p className="text-xs text-gray-400">None</p>}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Strong subjects</p>
          {insights.strong_subjects?.length
            ? insights.strong_subjects.map(s => <span key={s} className="badge badge-green" style={{ marginRight:4, marginBottom:4 }}>{s}</span>)
            : <p className="text-xs text-gray-400">None</p>}
        </div>
      </div>
      <p className="text-xs text-gray-400">Trend: <strong>{insights.trend}</strong></p>
    </div>
  )
}