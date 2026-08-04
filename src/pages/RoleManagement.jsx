import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* ═══════════════ CONFIG (edit these lists freely) ═══════════════ */
const ROLE_META = {
  admin:             { label:'Admin',          color:'#7c3aed', bg:'#f5f3ff', desc:'Full access to all modules'    },
  staff:             { label:'Staff',          color:'#2563eb', bg:'#eff6ff', desc:'Leads · Students · Attendance' },
  teacher:           { label:'Teacher',        color:'#059669', bg:'#f0fdf4', desc:'Attendance · Exams · Students' },
  accountant:        { label:'Accountant',     color:'#d97706', bg:'#fffbeb', desc:'Fees · Analytics'              },
  receptionist:      { label:'Receptionist',   color:'#db2777', bg:'#fdf2f8', desc:'Leads · Admissions'            },
  transport_manager: { label:'Transport Mgr',  color:'#0891b2', bg:'#f0f9ff', desc:'Transport module only'         },
}
const PERMS = {
  admin:             ['leads','students','fees','transport','attendance','exams','communication','analytics','import','roles'],
  staff:             ['leads','students','attendance','exams','communication'],
  teacher:           ['attendance','exams','students'],
  accountant:        ['fees','analytics'],
  receptionist:      ['leads','admissions'],
  transport_manager: ['transport'],
}
const ALL_ROLES   = Object.keys(ROLE_META)
const SUBJECTS    = ['English','Telugu','Hindi','Mathematics','Science','Physics','Chemistry','Biology','Social Studies','Computer Science','EVS','General Knowledge','Arts & Craft','Physical Education','Music']
const CLASSES     = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const SECTIONS    = ['A','B','C','D']
const DEPARTMENTS = ['Academic','Administration','Accounts','Transport','Front Office','Support Staff']
const EMP_TYPES   = ['Full-time','Part-time','Contract','Probation']
const BLOOD       = ['A+','A-','B+','B-','O+','O-','AB+','AB-']
const DOC_TYPES   = ['Aadhaar Card','PAN Card','Degree Certificate','B.Ed Certificate','Experience Letter','Police Verification','Offer Letter','Other']

const EMPTY_FORM = {
  name:'', email:'', phone:'', role:'staff', photo_url:'', gender:'', dob:'',
  employee_id:'', date_of_joining:'', employment_type:'Full-time', department:'Academic',
  designation:'', reporting_to:'', qualification:'', experience_years:'', previous_school:'',
  address:'', emergency_contact_name:'', emergency_contact_phone:'', blood_group:'',
  aadhaar_number:'', pan_number:'', police_verification:'Pending',
  bank_account:'', bank_ifsc:'', pf_uan:'', esi_number:'',
  password:'', must_change_password:true,
  class_teacher_of:'', subjects:[], assignments:[],
}

const MOCK_USERS = [
  { id:1, name:'Admin User',    email:'admin@school.com',   phone:'9876500001', role:'admin',   employee_id:'EMP-001', designation:'Principal',        department:'Administration', date_of_joining:'2024-06-01', employment_type:'Full-time', is_active:1, must_change_password:0, assignments_summary:'' },
  { id:2, name:'Lakshmi Devi',  email:'lakshmi@school.com', phone:'9876500002', role:'teacher', employee_id:'TCH-001', designation:'PGT Mathematics',  department:'Academic',       date_of_joining:'2025-06-10', employment_type:'Full-time', is_active:1, must_change_password:1, class_teacher_of:'Grade 4|A', qualification:'M.Sc, B.Ed', experience_years:6, blood_group:'O+', assignments_summary:'Grade 4-A Mathematics, Grade 5-A Mathematics', assignments:[{class:'Grade 4',section:'A',subject:'Mathematics'},{class:'Grade 5',section:'A',subject:'Mathematics'}] },
  { id:3, name:'Ramesh Kumar',  email:'ramesh@school.com',  phone:'9876500003', role:'staff',   employee_id:'EMP-002', designation:'Office Executive', department:'Front Office',   date_of_joining:'2025-01-15', employment_type:'Full-time', is_active:1, must_change_password:0, assignments_summary:'' },
]

/* ═══════════════ SMALL HELPERS ═══════════════ */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.staff
  return <span className="badge" style={{ background:m.bg, color:m.color }}>{m.label}</span>
}

function Field({ label, required, children, span }) {
  return (
    <div style={span ? { gridColumn:'1 / -1' } : undefined}>
      <label className="label">{label}{required && <span style={{ color:'var(--c-red)' }}> *</span>}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: wide ? 640 : 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/* ═══════════════ ONBOARDING WIZARD ═══════════════ */
function CredentialsModal({ cred, onClose, showToast }) {
  const loginUrl = `${window.location.origin}/login`
  const text = `Welcome to EnrollIQ, ${cred.name}! 🎉\n\nYour ${cred.role} account is ready.\n\n🔗 Login: ${loginUrl}\n📧 Email: ${cred.email}\n🔑 Password: ${cred.password}\n🆔 Employee ID: ${cred.employee_id}\n\nPlease change your password after first login.`

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); showToast('Login details copied ✓') }
    catch { showToast('Could not copy — select and copy manually') }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign:'center', paddingTop: 28 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--c-green-lt)', color:'var(--c-green)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px' }}>✓</div>
          <p style={{ fontFamily:'Georgia, serif', fontSize:19, fontWeight:700, color:'var(--c-ink)' }}>
            {cred.name} onboarded!
          </p>
          <p style={{ fontSize:13, color:'var(--c-muted)', margin:'6px 0 18px' }}>
            Share these login details with them — shown only once.
          </p>

          <div style={{ background:'var(--c-surface-2)', border:'1px solid var(--c-border)', borderRadius:12,
            padding:'14px 16px', textAlign:'left', display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['Employee ID', cred.employee_id],
              ['Login URL',   loginUrl],
              ['Email',       cred.email],
              ['Password',    cred.password],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'var(--c-muted)' }}>{k}</span>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--c-ink)', wordBreak:'break-all', fontFamily: k==='Password' ? 'monospace' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:10, marginTop:18 }}>
            <button className="btn-primary" style={{ flex:1 }} onClick={copy}>📋 Copy details</button>
            <a className="btn-ghost" style={{ flex:1 }} target="_blank" rel="noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}>💬 WhatsApp</a>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--c-muted)', fontSize:13, marginTop:14, cursor:'pointer' }}>
            Done, close
          </button>
        </div>
      </div>
    </div>
  )
}

function OnboardWizard({ initial, allUsers, onClose, onSaved, showToast }) {
  const isEdit = !!initial
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)   // credentials handoff after create
  const [error, setError]   = useState('')
  const [form, setForm]     = useState(() => isEdit
    ? { ...EMPTY_FORM, ...initial, password:'', must_change_password: !!initial.must_change_password,
        subjects: initial.subjects || [...new Set((initial.assignments||[]).map(a => a.subject))],
        assignments: initial.assignments || [] }
    : { ...EMPTY_FORM })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }))
  const isTeacher = form.role === 'teacher'
  const meta = ROLE_META[form.role] || ROLE_META.staff

  if (created) {
    return <CredentialsModal cred={created} onClose={onClose} showToast={showToast} />
  }

  const STEPS = isTeacher
    ? ['Basics', 'Employment', 'Teaching', 'Compliance & Account']
    : ['Basics', 'Employment', 'Compliance & Account']
  const stepName = STEPS[Math.min(step, STEPS.length - 1)]

  /* — assignment rows — */
  const addAssignment = () => setForm(f => ({ ...f, assignments:[...f.assignments, { class:'Grade 1', section:'A', subject: f.subjects[0] || 'Mathematics' }] }))
  const setAssignment = (i, k, v) => setForm(f => ({ ...f, assignments: f.assignments.map((a, idx) => idx === i ? { ...a, [k]: v } : a) }))
  const rmAssignment  = (i) => setForm(f => ({ ...f, assignments: f.assignments.filter((_, idx) => idx !== i) }))
  const toggleSubject = (s) => setForm(f => ({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s] }))

  const validateStep = () => {
    setError('')
    if (stepName === 'Basics') {
      if (!form.name.trim())  { setError('Full name is required'); return false }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('A valid email is required'); return false }
      if (!/^\d{10}$/.test(form.phone)) { setError('Phone must be 10 digits'); return false }
    }
    if (stepName === 'Compliance & Account') {
      if (!isEdit && form.password.length < 6) { setError('Password must be at least 6 characters'); return false }
      if (isEdit && form.password && form.password.length < 6) { setError('New password must be at least 6 characters'); return false }
      if (form.aadhaar_number && !/^\d{12}$/.test(form.aadhaar_number)) { setError('Aadhaar must be 12 digits'); return false }
      if (form.pan_number && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(form.pan_number)) { setError('PAN format looks invalid (e.g. ABCDE1234F)'); return false }
    }
    return true
  }

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  const back = () => { setError(''); setStep(s => Math.max(s - 1, 0)) }

  const submit = async () => {
    if (!validateStep()) return
    setSaving(true); setError('')
    const payload = { ...form, pan_number: form.pan_number ? form.pan_number.toUpperCase() : '' }
    if (!isTeacher) { payload.assignments = []; payload.class_teacher_of = '' }
    if (isEdit && !payload.password) delete payload.password
    try {
      if (isEdit) {
        await api.put(`/roles/users/${initial.id}`, payload)
        showToast(`${form.name} updated ✓`)
        onSaved(); onClose()
      } else {
        const res = await api.post('/roles/users', payload)
        showToast(`${form.name} onboarded successfully 🎉`)
        onSaved()
        setCreated({
          name: form.name,
          email: form.email,
          employee_id: res?.data?.employee_id || 'Auto-assigned',
          password: form.password,
          role: (ROLE_META[form.role] || {}).label || form.role,
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save — is the backend running?')
    } finally { setSaving(false) }
  }

  const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }

  return (
    <Modal title={isEdit ? `Edit — ${initial.name}` : 'Onboard Staff Member'} onClose={onClose} wide>
      {/* Step indicator */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex:1, textAlign:'center' }}>
            <div style={{ height:4, borderRadius:99, background: i <= step ? 'var(--c-brand)' : 'var(--c-border)', transition:'background .2s' }} />
            <span style={{ fontSize:10, fontWeight:600, color: i === step ? 'var(--c-brand)' : 'var(--c-muted)', textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginTop:6 }}>{s}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background:'var(--c-red-lt)', color:'var(--c-red)', fontSize:13, padding:'10px 14px', borderRadius:8, marginBottom:16 }}>{error}</div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14, minHeight:300 }}>

        {/* ── STEP: BASICS ── */}
        {stepName === 'Basics' && (<>
          <Field label="Full name" required>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Lakshmi Devi" autoFocus />
          </Field>
          <div style={grid2} className="g-2-wiz">
            <Field label="Email (login ID)" required>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="staff@school.com" autoComplete="off" />
            </Field>
            <Field label="Phone" required>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" maxLength={10} />
            </Field>
          </div>
          <div style={grid2} className="g-2-wiz">
            <Field label="Role" required>
              <select className="input" value={form.role} onChange={set('role')}>
                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
              </select>
            </Field>
            <Field label="Gender">
              <select className="input" value={form.gender || ''} onChange={set('gender')}>
                <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
          </div>
          <div style={grid2} className="g-2-wiz">
            <Field label="Date of birth">
              <input className="input" type="date" value={form.dob || ''} onChange={set('dob')} />
            </Field>
            <Field label="Blood group">
              <select className="input" value={form.blood_group || ''} onChange={set('blood_group')}>
                <option value="">—</option>{BLOOD.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>
          </div>
          {/* Role permission preview */}
          <div style={{ background: meta.bg, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color: meta.color }}>{meta.label}</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>— {meta.desc}</span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {(PERMS[form.role] || []).map(p => (
                <span key={p} style={{ fontSize:11, fontWeight:600, background:'white', color:'#374151', padding:'2px 9px', borderRadius:20, border:'1px solid #e5e7eb', textTransform:'capitalize' }}>{p.replace('_',' ')}</span>
              ))}
            </div>
          </div>
        </>)}

        {/* ── STEP: EMPLOYMENT ── */}
        {stepName === 'Employment' && (<>
          <div style={grid2} className="g-2-wiz">
            <Field label="Employee ID">
              <input className="input" value={form.employee_id || ''} onChange={set('employee_id')}
                placeholder={isTeacher ? 'Auto: TCH-00X' : 'Auto: EMP-00X'} />
            </Field>
            <Field label="Date of joining">
              <input className="input" type="date" value={form.date_of_joining ? String(form.date_of_joining).slice(0,10) : ''} onChange={set('date_of_joining')} />
            </Field>
          </div>
          <div style={grid2} className="g-2-wiz">
            <Field label="Employment type">
              <select className="input" value={form.employment_type || 'Full-time'} onChange={set('employment_type')}>
                {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select className="input" value={form.department || 'Academic'} onChange={set('department')}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Designation">
            <input className="input" value={form.designation || ''} onChange={set('designation')} placeholder='e.g. "PGT Mathematics", "Front Office Executive"' />
          </Field>
          <div style={grid2} className="g-2-wiz">
            <Field label="Reporting to">
              <select className="input" value={form.reporting_to || ''} onChange={set('reporting_to')}>
                <option value="">—</option>
                {allUsers.filter(u => u.id !== (initial && initial.id)).map(u => <option key={u.id} value={u.id}>{u.name} ({(ROLE_META[u.role] || {}).label || u.role})</option>)}
              </select>
            </Field>
            <Field label="Highest qualification">
              <input className="input" value={form.qualification || ''} onChange={set('qualification')} placeholder="e.g. M.Sc, B.Ed" />
            </Field>
          </div>
          <div style={grid2} className="g-2-wiz">
            <Field label="Experience (years)">
              <input className="input" type="number" min="0" step="0.5" value={form.experience_years || ''} onChange={set('experience_years')} placeholder="e.g. 5" />
            </Field>
            <Field label="Previous school">
              <input className="input" value={form.previous_school || ''} onChange={set('previous_school')} placeholder="Optional" />
            </Field>
          </div>
        </>)}

        {/* ── STEP: TEACHING (teachers only) ── */}
        {stepName === 'Teaching' && (<>
          <Field label="Subjects taught">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:2 }}>
              {SUBJECTS.map(s => {
                const on = form.subjects.includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggleSubject(s)}
                    style={{ fontSize:12, fontWeight:500, padding:'5px 12px', borderRadius:20, cursor:'pointer',
                      border:`1.5px solid ${on ? 'var(--c-brand)' : 'var(--c-border-2)'}`,
                      background: on ? 'var(--c-brand-lt)' : 'white',
                      color: on ? 'var(--c-brand)' : 'var(--c-ink-2)', transition:'all .12s' }}>
                    {on ? '✓ ' : ''}{s}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Class & subject assignments">
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:2 }}>
              {form.assignments.map((a, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <select className="input" style={{ flex:1.2 }} value={a.class} onChange={e => setAssignment(i,'class',e.target.value)}>
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select className="input" style={{ width:70, flexShrink:0 }} value={a.section} onChange={e => setAssignment(i,'section',e.target.value)}>
                    {SECTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="input" style={{ flex:1.4 }} value={a.subject} onChange={e => setAssignment(i,'subject',e.target.value)}>
                    {(form.subjects.length ? form.subjects : SUBJECTS).map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={() => rmAssignment(i)} className="modal-close" title="Remove">×</button>
                </div>
              ))}
              <button type="button" onClick={addAssignment} className="btn-ghost" style={{ alignSelf:'flex-start' }}>+ Add class assignment</button>
              {form.assignments.length === 0 && (
                <p style={{ fontSize:12, color:'var(--c-muted)' }}>e.g. Grade 4 · Section A · Mathematics — used to scope Attendance & Exams to this teacher's classes.</p>
              )}
            </div>
          </Field>

          <Field label="Class teacher of (optional)">
            <select className="input" value={form.class_teacher_of || ''} onChange={set('class_teacher_of')}>
              <option value="">Not a class teacher</option>
              {CLASSES.flatMap(c => SECTIONS.map(s => `${c}|${s}`)).map(v => (
                <option key={v} value={v}>{v.replace('|', ' - ')}</option>
              ))}
            </select>
          </Field>
        </>)}

        {/* ── STEP: COMPLIANCE & ACCOUNT ── */}
        {stepName === 'Compliance & Account' && (<>
          <Field label="Current address">
            <textarea className="input" rows={2} value={form.address || ''} onChange={set('address')} placeholder="House no, street, area, city" />
          </Field>
          <div style={grid2} className="g-2-wiz">
            <Field label="Emergency contact name">
              <input className="input" value={form.emergency_contact_name || ''} onChange={set('emergency_contact_name')} />
            </Field>
            <Field label="Emergency contact phone">
              <input className="input" value={form.emergency_contact_phone || ''} onChange={set('emergency_contact_phone')} maxLength={10} />
            </Field>
          </div>
          <div style={grid2} className="g-2-wiz">
            <Field label="Aadhaar number">
              <input className="input" value={form.aadhaar_number || ''} onChange={set('aadhaar_number')} placeholder="12 digits" maxLength={12} />
            </Field>
            <Field label="PAN number">
              <input className="input" value={form.pan_number || ''} onChange={set('pan_number')} placeholder="ABCDE1234F" maxLength={10} style={{ textTransform:'uppercase' }} />
            </Field>
          </div>
          <div style={grid2} className="g-2-wiz">
            <Field label="Police verification">
              <select className="input" value={form.police_verification || 'Pending'} onChange={set('police_verification')}>
                <option>Pending</option><option>Submitted</option><option>Verified</option>
              </select>
            </Field>
            <Field label="Bank account no. (payroll)">
              <input className="input" value={form.bank_account || ''} onChange={set('bank_account')} placeholder="Optional" />
            </Field>
          </div>
          <div style={grid2} className="g-2-wiz">
            <Field label="IFSC code">
              <input className="input" value={form.bank_ifsc || ''} onChange={set('bank_ifsc')} placeholder="Optional" />
            </Field>
            <Field label="PF UAN / ESI no.">
              <input className="input" value={form.pf_uan || ''} onChange={set('pf_uan')} placeholder="Optional" />
            </Field>
          </div>

          <div className="divider" />

          <Field label={isEdit ? 'New password (leave blank to keep current)' : 'Login password'} required={!isEdit}>
            <input className="input" type="password" value={form.password} onChange={set('password')}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'} autoComplete="new-password" />
          </Field>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--c-ink-2)', cursor:'pointer' }}>
            <input type="checkbox" checked={!!form.must_change_password}
              onChange={e => setForm(f => ({ ...f, must_change_password: e.target.checked }))} />
            Require password change on first login (recommended)
          </label>
        </>)}
      </div>

      {/* Footer nav */}
      <div style={{ display:'flex', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid var(--c-border)' }}>
        {step > 0 && <button className="btn-ghost" onClick={back}>← Back</button>}
        <div style={{ flex:1 }} />
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        {step < STEPS.length - 1
          ? <button className="btn-primary" onClick={next}>Continue →</button>
          : <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : '✓ Complete onboarding'}
            </button>}
      </div>

      <style>{`@media (max-width: 560px) { .g-2-wiz { grid-template-columns: 1fr !important; } }`}</style>
    </Modal>
  )
}

/* ═══════════════ RESET PASSWORD MODAL ═══════════════ */
function ResetPasswordModal({ user, onClose, showToast }) {
  const [pw, setPw]         = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 6) { setError('Minimum 6 characters'); return }
    setSaving(true)
    try {
      await api.post(`/roles/users/${user.id}/reset-password`, { new_password: pw })
      showToast(`Password reset for ${user.name} ✓`)
      onClose()
    } catch (err) { setError((err.response && err.response.data && err.response.data.message) || 'Reset failed — backend running?') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Reset password" onClose={onClose}>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {error && <div style={{ background:'var(--c-red-lt)', color:'var(--c-red)', fontSize:13, padding:'10px 14px', borderRadius:8 }}>{error}</div>}
        <p style={{ fontSize:13, color:'var(--c-ink-2)' }}>Setting a new password for <strong>{user.name}</strong>. They'll be asked to change it on next login.</p>
        <input className="input" type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="New password (min 6 characters)" autoFocus />
        <div style={{ display:'flex', gap:10 }}>
          <button type="submit" className="btn-primary" style={{ flex:1 }} disabled={saving}>{saving ? 'Resetting...' : 'Reset password'}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

/* ═══════════════ STAFF PROFILE DRAWER ═══════════════ */
function DrawerSection({ title, children }) {
  return (
    <div style={{ marginBottom:22 }}>
      <p style={{ fontSize:11, fontWeight:700, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>{title}</p>
      {children}
    </div>
  )
}
function DrawerRow({ k, v }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'7px 0', borderBottom:'1px solid var(--c-border)' }}>
      <span style={{ fontSize:12, color:'var(--c-muted)', flexShrink:0 }}>{k}</span>
      <span style={{ fontSize:13, color:'var(--c-ink)', fontWeight:500, textAlign:'right', wordBreak:'break-word' }}>{v || '—'}</span>
    </div>
  )
}

function StaffDrawer({ user, onClose, onEdit, onResetPw, onToggle, onDelete, showToast }) {
  const [detail, setDetail]       = useState(user)
  const [docType, setDocType]     = useState(DOC_TYPES[0])
  const [uploading, setUploading] = useState(false)

  const load = () => api.get(`/roles/users/${user.id}`).then(r => setDetail(d => ({ ...d, ...r.data }))).catch(() => {})
  useEffect(() => { setDetail(user); load() }, [user.id]) // eslint-disable-line

  const uploadDoc = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('doc_type', docType)
    try {
      await api.post(`/roles/users/${user.id}/documents`, fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      showToast(`${docType} uploaded ✓`); load()
    } catch (err) { showToast((err.response && err.response.data && err.response.data.message) || 'Upload failed — backend running?') }
    finally { setUploading(false); e.target.value = '' }
  }

  const verifyDoc = async (d) => {
    try { await api.put(`/roles/documents/${d.id}/verify`); showToast('Document verified ✓'); load() } catch { showToast('Verify failed') }
  }
  const removeDoc = async (d) => {
    if (!window.confirm(`Remove ${d.doc_type}?`)) return
    try { await api.delete(`/roles/documents/${d.id}`); showToast('Document removed'); load() } catch { showToast('Remove failed') }
  }

  const m = ROLE_META[detail.role] || ROLE_META.staff

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(24,21,15,0.4)', zIndex:45 }} />
      <div style={{ position:'fixed', top:0, right:0, height:'100vh', width:'min(440px, 100vw)', background:'var(--c-surface)', zIndex:46, overflowY:'auto', boxShadow:'-12px 0 40px rgba(0,0,0,0.12)', animation:'fade-up .2s ease' }}>
        {/* Head */}
        <div style={{ padding:20, borderBottom:'1px solid var(--c-border)', position:'sticky', top:0, background:'var(--c-surface)', zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:m.bg, color:m.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:18, fontFamily:'Georgia, serif', flexShrink:0 }}>
                {detail.name && detail.name[0]}
              </div>
              <div>
                <p style={{ fontFamily:'Georgia, serif', fontSize:18, fontWeight:700, color:'var(--c-ink)' }}>{detail.name}</p>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:3 }}>
                  <RoleBadge role={detail.role} />
                  <span style={{ fontSize:12, color:'var(--c-muted)' }}>{detail.employee_id}</span>
                  {!!detail.must_change_password && <span className="badge badge-amber">First login pending</span>}
                  {!detail.is_active && <span className="badge badge-red">Inactive</span>}
                </div>
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
            <button className="btn-primary" style={{ flex:1 }} onClick={() => onEdit(detail)}>✎ Edit</button>
            <button className="btn-ghost" onClick={() => onResetPw(detail)}>Reset password</button>
            <button className="btn-ghost" onClick={() => onToggle(detail)}>{detail.is_active ? 'Deactivate' : 'Activate'}</button>
          </div>
        </div>

        <div style={{ padding:20 }}>
          <DrawerSection title="Contact">
            <DrawerRow k="Email" v={detail.email} />
            <DrawerRow k="Phone" v={detail.phone} />
            <DrawerRow k="Address" v={detail.address} />
            <DrawerRow k="Emergency contact" v={detail.emergency_contact_name ? `${detail.emergency_contact_name} · ${detail.emergency_contact_phone || ''}` : null} />
            <DrawerRow k="Blood group" v={detail.blood_group} />
          </DrawerSection>

          <DrawerSection title="Employment">
            <DrawerRow k="Designation" v={detail.designation} />
            <DrawerRow k="Department" v={detail.department} />
            <DrawerRow k="Type" v={detail.employment_type} />
            <DrawerRow k="Date of joining" v={fmtDate(detail.date_of_joining)} />
            <DrawerRow k="Qualification" v={detail.qualification} />
            <DrawerRow k="Experience" v={detail.experience_years ? `${detail.experience_years} years` : null} />
            <DrawerRow k="Previous school" v={detail.previous_school} />
          </DrawerSection>

          {detail.role === 'teacher' && (
            <DrawerSection title="Teaching">
              {detail.class_teacher_of && (
                <div style={{ background:'var(--c-green-lt)', color:'var(--c-green)', fontSize:12, fontWeight:600, padding:'8px 12px', borderRadius:8, marginBottom:10 }}>
                  ★ Class teacher — {String(detail.class_teacher_of).replace('|', ' - ')}
                </div>
              )}
              {(detail.assignments && detail.assignments.length > 0) ? (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {detail.assignments.map((a, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'8px 12px', background:'var(--c-surface-2)', borderRadius:8 }}>
                      <span style={{ fontWeight:600, color:'var(--c-ink)' }}>{a.class} - {a.section}</span>
                      <span style={{ color:'var(--c-ink-2)' }}>{a.subject}</span>
                    </div>
                  ))}
                </div>
              ) : detail.assignments_summary
                ? <p style={{ fontSize:13, color:'var(--c-ink-2)' }}>{detail.assignments_summary}</p>
                : <p style={{ fontSize:13, color:'var(--c-muted)' }}>No class assignments yet</p>}
            </DrawerSection>
          )}

          <DrawerSection title="Compliance">
            <DrawerRow k="Aadhaar" v={detail.aadhaar_number ? `•••• •••• ${String(detail.aadhaar_number).slice(-4)}` : null} />
            <DrawerRow k="PAN" v={detail.pan_number} />
            <DrawerRow k="Police verification" v={detail.police_verification} />
            <DrawerRow k="Bank account" v={detail.bank_account ? `••••${String(detail.bank_account).slice(-4)}` : null} />
            <DrawerRow k="IFSC" v={detail.bank_ifsc} />
            <DrawerRow k="PF / ESI" v={detail.pf_uan || detail.esi_number} />
          </DrawerSection>

          <DrawerSection title="Documents">
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <select className="input" style={{ flex:1 }} value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
              </select>
              <label className="btn-ghost" style={{ cursor:'pointer', flexShrink:0 }}>
                {uploading ? 'Uploading...' : '⬆ Upload'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:'none' }} onChange={uploadDoc} disabled={uploading} />
              </label>
            </div>
            {(detail.documents && detail.documents.length > 0) ? (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {detail.documents.map(d => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--c-surface-2)', borderRadius:8 }}>
                    <span style={{ fontSize:16 }}>📄</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'var(--c-ink)' }}>{d.doc_type}</p>
                      <p style={{ fontSize:11, color:'var(--c-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.original_name}</p>
                    </div>
                    {d.status === 'Verified'
                      ? <span className="badge badge-green">Verified</span>
                      : <button className="badge badge-amber" style={{ border:'none', cursor:'pointer' }} onClick={() => verifyDoc(d)}>Mark verified</button>}
                    <a href={d.file_path} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'var(--c-blue)', textDecoration:'none' }}>View</a>
                    <button className="modal-close" style={{ fontSize:16 }} onClick={() => removeDoc(d)}>×</button>
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize:13, color:'var(--c-muted)' }}>No documents uploaded yet — Aadhaar, certificates, police verification etc.</p>}
          </DrawerSection>

          <button className="btn-ghost" style={{ color:'var(--c-red)', borderColor:'#fecaca', width:'100%' }}
            onClick={() => onDelete(detail)}>
            Delete staff member
          </button>
        </div>
      </div>
    </>
  )
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function RoleManagement() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [showAdd, setShowAdd]       = useState(false)
  const [editing, setEditing]       = useState(null)
  const [resetFor, setResetFor]     = useState(null)
  const [viewing, setViewing]       = useState(null)
  const [toast, setToast]           = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    try { const r = await api.get('/roles/users'); setUsers(r.data || []) }
    catch { setUsers(prev => prev.length ? prev : MOCK_USERS) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const toggleActive = async (u) => {
    try { await api.put(`/roles/users/${u.id}`, { is_active: u.is_active ? 0 : 1 }) } catch {}
    showToast(`${u.name} ${u.is_active ? 'deactivated' : 'activated'}`)
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: u.is_active ? 0 : 1 } : x))
    setViewing(v => v && v.id === u.id ? { ...v, is_active: u.is_active ? 0 : 1 } : v)
  }

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return
    try { await api.delete(`/roles/users/${u.id}`) } catch {}
    showToast(`${u.name} deleted`)
    setUsers(prev => prev.filter(x => x.id !== u.id))
    setViewing(null)
  }

  const q = search.toLowerCase()
  const filtered = users.filter(u =>
    (roleFilter === 'All' || u.role === roleFilter) &&
    ((u.name || '').toLowerCase().includes(q) ||
     (u.email || '').toLowerCase().includes(q) ||
     (u.employee_id || '').toLowerCase().includes(q))
  )

  return (
    <Layout>
      <div className="page">
        {toast && <div className="toast">{toast}</div>}

        {/* Header */}
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Staff & Roles</h1>
            <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>Onboard staff and teachers · Control access by role</p>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Onboard staff member</button>
          </div>
        </div>

        {/* Role stat tiles (click to filter) */}
        <div className="g-4" style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:12, marginBottom:24 }}>
          {ALL_ROLES.map(role => {
            const m = ROLE_META[role]
            const count = users.filter(u => u.role === role).length
            const active = roleFilter === role
            return (
              <button key={role} onClick={() => setRoleFilter(active ? 'All' : role)}
                className="stat-card" style={{ cursor:'pointer', textAlign:'left', border:`${active ? 2 : 1}px solid ${active ? m.color : 'var(--c-border)'}` }}>
                <p className="label" style={{ color: m.color }}>{m.label}</p>
                <p className="value" style={{ fontSize:24 }}>{count}</p>
                <p className="sublabel" style={{ fontSize:11 }}>{m.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Search + count row */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" style={{ maxWidth:300 }} placeholder="Search name, email or employee ID..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {roleFilter !== 'All' && (
            <button className="btn-ghost" onClick={() => setRoleFilter('All')}>✕ {ROLE_META[roleFilter] && ROLE_META[roleFilter].label} filter</button>
          )}
          <div style={{ flex:1 }} />
          <span style={{ fontSize:13, color:'var(--c-muted)' }}>{filtered.length} of {users.length} staff</span>
        </div>

        {/* Staff table */}
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Staff member</th><th>Role</th><th>Designation</th><th>Teaching</th>
                <th>Joined</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'48px 0', color:'var(--c-muted)' }}>Loading staff...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <p className="empty-title">No staff found</p>
                    <p className="empty-sub">Onboard your first staff member to get started</p>
                  </div>
                </td></tr>
              ) : filtered.map(u => {
                const m = ROLE_META[u.role] || ROLE_META.staff
                return (
                  <tr key={u.id} style={{ cursor:'pointer', opacity: u.is_active ? 1 : 0.55 }} onClick={() => setViewing(u)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:m.bg, color:m.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                          {u.name && u.name[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight:600, color:'var(--c-ink)', fontSize:13 }}>{u.name}</p>
                          <p style={{ fontSize:11, color:'var(--c-muted)' }}>{u.employee_id || '—'} · {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td style={{ color:'var(--c-ink-2)' }}>
                      {u.designation || '—'}
                      {u.department ? <span style={{ display:'block', fontSize:11, color:'var(--c-muted)' }}>{u.department}</span> : null}
                    </td>
                    <td style={{ maxWidth:180 }}>
                      {u.role === 'teacher'
                        ? <span style={{ fontSize:12, color:'var(--c-ink-2)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={u.assignments_summary}>{u.assignments_summary || 'Not assigned'}</span>
                        : <span style={{ color:'var(--c-muted)' }}>—</span>}
                    </td>
                    <td style={{ color:'var(--c-ink-2)', whiteSpace:'nowrap' }}>{fmtDate(u.date_of_joining)}</td>
                    <td>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {u.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}
                        {!!u.must_change_password && <span className="badge badge-amber" title="Hasn't set their own password yet">Invited</span>}
                      </div>
                    </td>
                    <td style={{ textAlign:'right', whiteSpace:'nowrap' }} onClick={e => e.stopPropagation()}>
                      <button className="btn-ghost" style={{ padding:'6px 12px', fontSize:12, marginRight:6 }} onClick={() => setViewing(u)}>View</button>
                      <button className="btn-ghost" style={{ padding:'6px 12px', fontSize:12 }} onClick={() => setEditing(u)}>Edit</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & drawer */}
      {showAdd && (
        <OnboardWizard allUsers={users} onClose={() => setShowAdd(false)} onSaved={load} showToast={showToast} />
      )}
      {editing && (
        <OnboardWizard initial={editing} allUsers={users}
          onClose={() => setEditing(null)} onSaved={() => { load(); setViewing(null) }} showToast={showToast} />
      )}
      {resetFor && <ResetPasswordModal user={resetFor} onClose={() => setResetFor(null)} showToast={showToast} />}
      {viewing && (
        <StaffDrawer user={viewing} showToast={showToast}
          onClose={() => setViewing(null)}
          onEdit={(u) => { setViewing(null); setEditing(u) }}
          onResetPw={(u) => setResetFor(u)}
          onToggle={toggleActive}
          onDelete={deleteUser} />
      )}
    </Layout>
  )
}