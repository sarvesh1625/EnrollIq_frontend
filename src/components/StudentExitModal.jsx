import { useState, useEffect } from 'react'
import api from '../api/axios'

const EXIT_TYPES = ['Dropout', 'Withdrawn', 'School Transfer', 'Branch Transfer', 'Graduated', 'Expelled']
const TEAL = '#12a38a'

const CLEARANCES = [
  { key: 'fees_cleared',       note: 'fees_note',       label: 'Fees Cleared',        hint: 'All pending fees paid / settled' },
  { key: 'library_cleared',    note: 'library_note',    label: 'Library Clearance',   hint: 'All library books returned' },
  { key: 'transport_cleared',  note: 'transport_note',  label: 'Transport Clearance', hint: 'Transport dues cleared, pass returned' },
  { key: 'books_returned',     note: 'books_note',      label: 'Books / Device Return', hint: 'School books and devices returned' },
]

export default function StudentExitModal({ student, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const [clearance, setClearance] = useState({})
  const [form, setForm] = useState({ exit_type: '', exit_reason: '', exit_date: new Date().toISOString().slice(0,10), exit_notes: '', transfer_to: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/students/${student.id}/exit`).then(res => setClearance(res.data.clearance || {})).catch(()=>{})
  }, [student.id])

  const saveClearance = async (patch) => {
    const next = { ...clearance, ...patch }
    setClearance(next)
    await api.put(`/students/${student.id}/exit`, next).catch(()=>{})
  }

  const isTransfer = form.exit_type === 'School Transfer' || form.exit_type === 'Branch Transfer'
  const TOTAL_STEPS = 7

  const finalize = async () => {
    setError(''); setLoading(true)
    try {
      const res = await api.post(`/students/${student.id}/exit/finalize`, form)
      onDone && onDone(res.data.student)
    } catch (e) {
      setError(e.response?.data?.message || 'Could not finalize exit')
    } finally { setLoading(false) }
  }

  const canFinalize = form.exit_type && clearance.principal_approved

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }
  const panel = { background:'#fff', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }
  const head = { padding:'20px 24px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }
  const body = { padding:'24px' }
  const label = { fontSize:12, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:6 }
  const input = { width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'10px 14px', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const btn = { background:TEAL, color:'#fff', border:'none', borderRadius:10, padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }
  const btnGhost = { background:'#fff', color:'#374151', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 22px', fontSize:14, fontWeight:600, cursor:'pointer' }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e=>e.stopPropagation()}>
        <div style={head}>
          <div>
            <p style={{ margin:0, fontSize:18, fontWeight:700, color:'#1a1814' }}>Manage Student Exit</p>
            <p style={{ margin:'2px 0 0', fontSize:13, color:'#6b7280' }}>{student.name} · {student.class}{student.section?`-${student.section}`:''} · Step {step} of {TOTAL_STEPS}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#9ca3af' }}>×</button>
        </div>

        {/* progress bar */}
        <div style={{ height:4, background:'#f0f0f0' }}>
          <div style={{ height:'100%', width:`${(step/TOTAL_STEPS)*100}%`, background:TEAL, transition:'width .2s' }} />
        </div>

        <div style={body}>
          {error && <div style={{ background:'#fef2f2', color:'#b91c1c', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>{error}</div>}

          {/* STEP 1 — Reason */}
          {step === 1 && (
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#1a1814', marginTop:0 }}>Reason for Exit</p>
              <label style={label}>Exit Type *</label>
              <select style={{ ...input, marginBottom:16 }} value={form.exit_type} onChange={e=>setForm(f=>({...f, exit_type:e.target.value}))}>
                <option value="">Select…</option>
                {EXIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {isTransfer && (
                <>
                  <label style={label}>Transfer To (school / branch)</label>
                  <input style={{ ...input, marginBottom:16 }} value={form.transfer_to} onChange={e=>setForm(f=>({...f, transfer_to:e.target.value}))} placeholder="Destination name" />
                </>
              )}
              <label style={label}>Exit Date</label>
              <input type="date" style={{ ...input, marginBottom:16 }} value={form.exit_date} onChange={e=>setForm(f=>({...f, exit_date:e.target.value}))} />
              <label style={label}>Reason / Remarks</label>
              <textarea style={{ ...input, minHeight:80, resize:'vertical' }} value={form.exit_reason} onChange={e=>setForm(f=>({...f, exit_reason:e.target.value}))} placeholder="Why is the student leaving?" />
            </div>
          )}

          {/* STEPS 2–5 — Clearances */}
          {step >= 2 && step <= 5 && (() => {
            const cl = CLEARANCES[step - 2]
            return (
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:'#1a1814', marginTop:0 }}>{cl.label}</p>
                <p style={{ fontSize:13, color:'#6b7280', marginTop:-6, marginBottom:18 }}>{cl.hint}</p>
                <label style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', border:`2px solid ${clearance[cl.key]?TEAL:'#e5e7eb'}`, borderRadius:12, cursor:'pointer', background:clearance[cl.key]?'#e7f7f2':'#fff', marginBottom:16 }}>
                  <input type="checkbox" checked={!!clearance[cl.key]} onChange={e=>saveClearance({ [cl.key]: e.target.checked })} style={{ width:18, height:18, accentColor:TEAL }} />
                  <span style={{ fontSize:14, fontWeight:600, color:'#1a1814' }}>{cl.label} — Confirmed</span>
                </label>
                <label style={label}>Note (optional)</label>
                <input style={input} value={clearance[cl.note]||''} onChange={e=>saveClearance({ [cl.note]: e.target.value })} placeholder="Any remarks about this clearance" />
              </div>
            )
          })()}

          {/* STEP 6 — Principal approval */}
          {step === 6 && (
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#1a1814', marginTop:0 }}>Principal Approval</p>
              <p style={{ fontSize:13, color:'#6b7280', marginTop:-6, marginBottom:18 }}>Final sign-off required before the student can be exited.</p>
              <label style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', border:`2px solid ${clearance.principal_approved?TEAL:'#e5e7eb'}`, borderRadius:12, cursor:'pointer', background:clearance.principal_approved?'#e7f7f2':'#fff', marginBottom:16 }}>
                <input type="checkbox" checked={!!clearance.principal_approved} onChange={e=>saveClearance({ principal_approved: e.target.checked })} style={{ width:18, height:18, accentColor:TEAL }} />
                <span style={{ fontSize:14, fontWeight:600, color:'#1a1814' }}>Approved by Principal</span>
              </label>
              <label style={label}>Approval note (optional)</label>
              <input style={input} value={clearance.principal_note||''} onChange={e=>saveClearance({ principal_note: e.target.value })} placeholder="e.g. approved on condition of…" />
            </div>
          )}

          {/* STEP 7 — Confirm */}
          {step === 7 && (
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#1a1814', marginTop:0 }}>Confirm & Archive</p>
              <div style={{ background:'#faf9f7', borderRadius:12, padding:16, fontSize:13, color:'#374151', lineHeight:1.8 }}>
                <div><b>Student:</b> {student.name}</div>
                <div><b>Exit type:</b> {form.exit_type || <span style={{color:'#b91c1c'}}>not set</span>}</div>
                {isTransfer && <div><b>Transfer to:</b> {form.transfer_to || '—'}</div>}
                <div><b>Exit date:</b> {form.exit_date}</div>
                <div><b>Clearances:</b> {CLEARANCES.filter(c=>clearance[c.key]).length}/{CLEARANCES.length} done</div>
                <div><b>Principal approval:</b> {clearance.principal_approved ? '✓ Approved' : <span style={{color:'#b91c1c'}}>pending</span>}</div>
              </div>
              {!canFinalize && (
                <p style={{ fontSize:13, color:'#b91c1c', marginTop:14 }}>
                  {!form.exit_type ? 'Set an exit type (Step 1). ' : ''}
                  {!clearance.principal_approved ? 'Principal approval is required (Step 6).' : ''}
                </p>
              )}
              <p style={{ fontSize:12, color:'#9ca3af', marginTop:14 }}>The student will be archived and moved to the Alumni list. This can be undone later.</p>
            </div>
          )}
        </div>

        {/* footer nav */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #eee', display:'flex', justifyContent:'space-between' }}>
          <button style={btnGhost} onClick={() => step > 1 ? setStep(step-1) : onClose()}>{step > 1 ? '← Back' : 'Cancel'}</button>
          {step < TOTAL_STEPS
            ? <button style={btn} onClick={() => setStep(step+1)} disabled={step===1 && !form.exit_type}>Next →</button>
            : <button style={{ ...btn, opacity: (canFinalize && !loading)?1:0.5 }} onClick={finalize} disabled={!canFinalize || loading}>{loading ? 'Archiving…' : 'Finalize & Archive'}</button>
          }
        </div>
      </div>
    </div>
  )
}