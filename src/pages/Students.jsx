import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getStudents, getStudentStats, createStudent, updateStudent, deleteStudent } from '../api/students'
import api from '../api/axios'
import StudentExitModal from '../components/StudentExitModal'

const GRADES   = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const SECTIONS = ['A','B','C','D','E']

// ── Student Detail Drawer ─────────────────────────────────────────────────────
function StudentDrawer({ student, onClose, onEdit, onDelete, onExit, onReactivate }) {
  const [transport, setTransport] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [payments, setPayments]   = useState([])
  const [tab, setTab]             = useState('profile')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!student) return
    setLoading(true)

    Promise.allSettled([
      api.get(`/students/${student.id}`),
      api.get('/transport/attendance', { params:{ date: new Date().toISOString().slice(0,10) } }),
      api.get('/attendance/student/' + student.id, { params:{ month: new Date().toISOString().slice(0,7) } }),
    ]).then(([studRes, transRes, attRes]) => {
      if (studRes.status === 'fulfilled') {
        setPayments(studRes.value.data.payments || [])
        // Check if student is in transport
        if (transRes.status === 'fulfilled') {
          const todayScans = (transRes.value.data.records || []).filter(r => r.student_id === student.id || r.student_name === student.name)
          setTransport({ today_scans: todayScans })
        }
      }
      if (attRes.status === 'fulfilled') {
        setAttendance(attRes.value.data)
      }
    }).finally(() => setLoading(false))
  }, [student])

  if (!student) return null

  const attPct = attendance?.summary
    ? Math.round((attendance.summary.present / attendance.summary.total) * 100) || 0
    : 0

  const paidTotal   = payments.filter(p => p.status === 'Paid').reduce((s,p) => s + parseFloat(p.paid_amount||0), 0)
  const pendingTotal = payments.filter(p => p.status !== 'Paid').reduce((s,p) => s + parseFloat(p.amount||0) - parseFloat(p.paid_amount||0), 0)

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="bg-white h-full shadow-2xl overflow-y-auto flex flex-col" style={{width:"min(480px,100vw)"}}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-ink">Student Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl leading-none">×</button>
        </div>

        {/* Avatar + name */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-2xl font-bold text-brand-600 font-serif flex-shrink-0">
              {student.name[0]}
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold text-ink">{student.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-gray-400">{student.roll_number}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{student.class}{student.section ? `-${student.section}` : ''}</span>
                <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' +
                  (student.status==='Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {student.status}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          {!loading && (
            <div className="grid grid-cols-3 gap-3 g-3 mt-4">
              <div className="bg-paper rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-ink">{attPct}%</p>
                <p className="text-xs text-gray-400">Attendance</p>
              </div>
              <div className="bg-paper rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-600">₹{paidTotal.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400">Fees paid</p>
              </div>
              <div className="bg-paper rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-amber-600">₹{pendingTotal.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-gray-100 flex-shrink-0">
          {['profile','attendance','fees','transport'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={'text-xs px-3 py-1.5 rounded-md transition-colors font-medium capitalize flex-1 ' +
                (tab===t ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream')}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <div className="flex flex-col gap-4">
              <div className="card !p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Student Info</p>
                {[
                  { label:'Date of birth', value: student.dob ? new Date(student.dob).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—' },
                  { label:'Class',         value: `${student.class}${student.section ? ` — Section ${student.section}` : ''}` },
                  { label:'Roll number',   value: student.roll_number },
                  { label:'Area',          value: student.area || '—' },
                  { label:'Status',        value: student.status },
                  { label:'Admitted',      value: student.created_at ? new Date(student.created_at).toLocaleDateString('en-IN') : '—' },
                ].map(f => (
                  <div key={f.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400">{f.label}</span>
                    <span className="text-xs text-ink font-medium">{f.value}</span>
                  </div>
                ))}
              </div>

              <div className="card !p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Parent / Guardian</p>
                {[
                  { label:'Name',  value: student.parent_name  || '—' },
                  { label:'Phone', value: student.parent_phone || '—' },
                  { label:'Email', value: student.parent_email || '—' },
                ].map(f => (
                  <div key={f.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400">{f.label}</span>
                    <span className="text-xs text-ink font-medium">{f.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {student.parent_phone && (
                  <>
                    <a href={`tel:${student.parent_phone}`} className="btn-ghost flex-1 text-center text-sm">📞 Call</a>
                    <a href={`https://wa.me/91${student.parent_phone}`} target="_blank" rel="noreferrer"
                      className="btn-ghost flex-1 text-center text-sm">💬 WhatsApp</a>
                  </>
                )}
                {student.parent_email && (
                  <a href={`mailto:${student.parent_email}`} className="btn-ghost flex-1 text-center text-sm">✉️ Email</a>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => onEdit(student)} className="btn-primary flex-1">Edit student</button>
                <button onClick={() => onDelete(student)}
                  className="btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600 flex-1">
                  Deactivate
                </button>
              </div>
              {student.archived ? (
                <div className="mt-2" style={{ background:'#fbf3dd', border:'1px solid #ebd9a8', borderRadius:10, padding:'12px 14px' }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#9A6A00', margin:'0 0 2px' }}>
                    Exited: {student.exit_type || 'Archived'}{student.exit_date ? ` · ${student.exit_date}` : ''}
                  </p>
                  {student.exit_reason && <p style={{ fontSize:12, color:'#6b7280', margin:'0 0 10px' }}>{student.exit_reason}</p>}
                  <button onClick={() => onReactivate && onReactivate(student)}
                    className="btn-primary w-full">↩ Reactivate Student (Undo Exit)</button>
                </div>
              ) : (
                <button onClick={() => onExit && onExit(student)}
                  className="btn-ghost w-full mt-2" style={{ borderColor:'#f0c000', color:'#9A6A00' }}>
                  🎓 Manage Exit (Dropout / Transfer / Graduate)
                </button>
              )}
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div className="flex flex-col gap-4">
              {loading ? (
                <p className="text-center text-gray-400 py-8 text-sm">Loading attendance...</p>
              ) : attendance ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3 g-3">
                    {[
                      { label:'Present', value: attendance.summary?.present || 0, color:'text-green-600', bg:'bg-green-50' },
                      { label:'Absent',  value: (attendance.summary?.total||0) - (attendance.summary?.present||0), color:'text-red-500', bg:'bg-red-50' },
                      { label:'%',       value: `${attPct}%`, color: attPct>=75?'text-green-600':'text-red-500', bg:'bg-paper' },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-400">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {attPct < 75 && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
                      ⚠️ Below 75% attendance. Parent should be notified.
                    </div>
                  )}

                  {/* Records */}
                  <div className="card !p-0 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-paper">
                      <p className="text-xs font-semibold text-ink">This month's records</p>
                    </div>
                    {(attendance.records || []).length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-6">No records this month</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {(attendance.records || []).slice(0,20).map((r,i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</span>
                            <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + (
                              r.status==='Present' ? 'bg-green-50 text-green-700' :
                              r.status==='Late'    ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-500'
                            )}>{r.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-400 py-8 text-sm">No attendance data yet</p>
              )}
            </div>
          )}

          {/* ── FEES ── */}
          {tab === 'fees' && (
            <div className="flex flex-col gap-4">
              {loading ? (
                <p className="text-center text-gray-400 py-8 text-sm">Loading fees...</p>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">💰</p>
                  <p className="text-gray-400 text-sm">No fee records yet</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 g-2">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-green-700">₹{paidTotal.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400">Total paid</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-amber-700">₹{pendingTotal.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-gray-400">Pending</p>
                    </div>
                  </div>
                  <div className="card !p-0 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="border-b border-gray-100 bg-paper">
                        <tr>
                          {['Fee type','Amount','Status','Due date'].map(h => (
                            <th key={h} className="text-left text-gray-400 font-medium px-4 py-2.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {payments.map((p,i) => (
                          <tr key={i} className="hover:bg-paper">
                            <td className="px-4 py-2.5 font-medium text-ink">{p.fee_type}</td>
                            <td className="px-4 py-2.5 text-gray-600">₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5">
                              <span className={'font-medium px-1.5 py-0.5 rounded-full ' + (
                                p.status==='Paid'    ? 'bg-green-50 text-green-700' :
                                p.status==='Overdue' ? 'bg-red-50 text-red-500' :
                                'bg-amber-50 text-amber-700'
                              )}>{p.status}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-400">
                              {p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TRANSPORT ── */}
          {tab === 'transport' && (
            <div className="flex flex-col gap-4">
              {loading ? (
                <p className="text-center text-gray-400 py-8 text-sm">Loading transport info...</p>
              ) : transport?.today_scans?.length > 0 ? (
                <>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-700 mb-1">✅ Enrolled in Transport</p>
                    <p className="text-xs text-green-600">{transport.today_scans.length} scan(s) today</p>
                  </div>
                  <div className="card !p-0 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 bg-paper">
                      <p className="text-xs font-semibold text-ink">Today's transport activity</p>
                    </div>
                    {transport.today_scans.map((s,i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            s.trip_type==='Pickup' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                            {s.trip_type==='Pickup' ? '↑' : '↓'}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-ink">{s.trip_type}</p>
                            <p className="text-xs text-gray-400">{s.bus_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(s.scanned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                          </p>
                          <p className="text-xs">{s.notified ? '📱 Notified' : '⏳ Pending'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <p className="text-4xl mb-3">🚌</p>
                  <p className="text-gray-400 text-sm mb-1">Not enrolled in transport</p>
                  <p className="text-xs text-gray-400 mb-4">Go to Transport → Enroll Students to assign this student to a bus</p>
                  <a href="/transport" className="btn-primary text-sm">Go to Transport →</a>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function StudentModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:         initial?.name         || '',
    roll_number:  initial?.roll_number  || '',
    class:        initial?.class        || '',
    section:      initial?.section      || 'A',
    dob:          initial?.dob?.slice(0,10) || '',
    parent_name:  initial?.parent_name  || '',
    parent_phone: initial?.parent_phone || '',
    parent_email: initial?.parent_email || '',
    area:         initial?.area         || '',
    status:       initial?.status       || 'Active',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (initial?.id) await updateStudent(initial.id, form)
      else             await createStudent(form)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save student')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-serif text-xl font-bold text-ink">
            {initial ? 'Edit student' : 'Add new student'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Student details</p>
            <div className="grid grid-cols-2 gap-3 g-2">
              <div className="col-span-2">
                <label className="label">Full name *</label>
                <input className="input" value={form.name} onChange={set('name')} required placeholder="Student's full name" />
              </div>
              <div>
                <label className="label">Class *</label>
                <select className="input" value={form.class} onChange={set('class')} required>
                  <option value="">Select grade</option>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Section</label>
                <select className="input" value={form.section} onChange={set('section')}>
                  {SECTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Roll number</label>
                <input className="input" value={form.roll_number} onChange={set('roll_number')} placeholder="Auto-generated if blank" />
              </div>
              <div>
                <label className="label">Date of birth</label>
                <input className="input" type="date" value={form.dob} onChange={set('dob')} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Parent details</p>
            <div className="grid grid-cols-2 gap-3 g-2">
              <div>
                <label className="label">Parent name</label>
                <input className="input" value={form.parent_name} onChange={set('parent_name')} placeholder="Guardian name" />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input" value={form.parent_phone} onChange={set('parent_phone')} placeholder="10-digit" maxLength={10} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.parent_email} onChange={set('parent_email')} placeholder="parent@gmail.com" />
              </div>
              <div>
                <label className="label">Area</label>
                <input className="input" value={form.area} onChange={set('area')} placeholder="Locality / area" />
              </div>
            </div>
          </div>

          {initial && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                <option>Active</option>
                <option>Inactive</option>
                <option>Transferred</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'Saving...' : initial ? 'Update student' : 'Add student'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Students Page ────────────────────────────────────────────────────────
export default function Students() {
  const [stats,   setStats]   = useState({ total:0, active:0, new_this_month:0 })
  const [students,setStudents]= useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [showModal,   setShowModal]   = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [drawer,      setDrawer]      = useState(null)
  const [exitStudent, setExitStudent] = useState(null)
  const [showAlumni,  setShowAlumni]  = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (classFilter !== 'All') params.class = classFilter
      if (search.trim())         params.search = search.trim()
      if (showAlumni)            params.archived = 1
      const [statsRes, listRes] = await Promise.allSettled([
        getStudentStats(),
        getStudents({ ...params, limit:200 }),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (listRes.status  === 'fulfilled') {
        setStudents(listRes.value.data.students || [])
        setTotal(listRes.value.data.total || 0)
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [classFilter, showAlumni])
  useEffect(() => {
    const t = setTimeout(() => load(), 400)
    return () => clearTimeout(t)
  }, [search])

  const handleSaved = () => { setShowModal(false); setEditItem(null); load() }
  const handleDelete = async (student) => {
    if (!confirm(`Deactivate ${student.name}?`)) return
    try { await updateStudent(student.id, { status:'Inactive' }); setDrawer(null); load() }
    catch (err) { alert(err.response?.data?.message || 'Failed') }
  }
  const handleReactivate = async (student) => {
    if (!confirm(`Reactivate ${student.name}? This undoes the exit and returns them to the active list.`)) return
    try { await api.post(`/students/${student.id}/reactivate`); setDrawer(null); load() }
    catch (err) { alert(err.response?.data?.message || 'Failed to reactivate') }
  }

  const uniqueClasses = ['All', ...new Set(students.map(s => s.class).filter(Boolean).sort())]

  const statusStyle = s =>
    s === 'Active'   ? { bg:'var(--c-green-lt)', c:'var(--c-green)' } :
    s === 'Inactive' ? { bg:'#f3f4f6', c:'#6b7280' } :
                       { bg:'var(--c-amber-lt)', c:'var(--c-amber)' }

  return (
    <Layout>
      <div className="page">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0 }}>Students</h1>
            <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>{total} enrolled {total === 1 ? 'student' : 'students'}</p>
          </div>
          <button className="btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>+ Add student</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }} className="g-3">
          <div className="stat-card">
            <p className="label">Total students</p>
            <p className="value" style={{ color:'var(--c-brand)' }}>{stats.total}</p>
          </div>
          <div className="stat-card">
            <p className="label">Active</p>
            <p className="value">{stats.active}</p>
            <p className="sublabel">{stats.total - stats.active} inactive</p>
          </div>
          <div className="stat-card">
            <p className="label">Joined this month</p>
            <p className="value">{stats.new_this_month}</p>
            <p className="sublabel" style={{ color:'var(--c-green)' }}>New admissions</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" style={{ maxWidth:260 }}
            placeholder="Search name, roll, parent..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input" style={{ width:160 }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            {uniqueClasses.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display:'inline-flex', border:'1.5px solid #e5e7eb', borderRadius:10, overflow:'hidden' }}>
            <button onClick={() => setShowAlumni(false)}
              style={{ padding:'8px 14px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
                background: !showAlumni ? '#12a38a' : '#fff', color: !showAlumni ? '#fff' : '#6b7280' }}>Active</button>
            <button onClick={() => setShowAlumni(true)}
              style={{ padding:'8px 14px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
                background: showAlumni ? '#12a38a' : '#fff', color: showAlumni ? '#fff' : '#6b7280' }}>Alumni / Exited</button>
          </div>
          <span style={{ fontSize:12, color:'var(--c-muted)', marginLeft:'auto' }}>{total} shown</span>
        </div>

        {/* Student list — row cards */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {/* Desktop column header */}
          <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'90px 2fr 1fr 1.4fr 110px 90px 30px', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
            {['Roll','Name','Class','Parent','Phone','Status',''].map(h => (
              <span key={h} style={{ fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:56, color:'var(--c-muted)' }}>
              <div style={{ width:28, height:28, border:'3px solid #f0ede8', borderTop:'3px solid var(--c-brand)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◉</div>
              <p className="empty-title">No students found</p>
              <p className="empty-sub">{search || classFilter !== 'All' ? 'Try clearing filters' : 'Add your first student'}</p>
              {!search && classFilter === 'All' && (
                <button className="btn-primary" style={{ marginTop:14 }} onClick={() => setShowModal(true)}>+ Add first student</button>
              )}
            </div>
          ) : (
            <div>
              {students.map((s, i) => {
                const st = statusStyle(s.status)
                return (
                  <div key={s.id} onClick={() => setDrawer(s)}
                    className="student-row"
                    style={{ display:'grid', gridTemplateColumns:'90px 2fr 1fr 1.4fr 110px 90px 30px', gap:12, alignItems:'center',
                      padding:'14px 20px', cursor:'pointer', borderBottom: i < students.length-1 ? '1px solid #faf9f7' : 'none', transition:'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--c-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                    {/* Roll */}
                    <span className="hide-md" style={{ fontSize:12, fontFamily:'monospace', color:'var(--c-muted)' }}>{s.roll_number || '—'}</span>

                    {/* Name (always visible) */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--c-brand-lt)', color:'var(--c-brand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {s.name?.[0]}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</p>
                        <p className="show-md-only" style={{ fontSize:11, color:'var(--c-muted)', margin:'2px 0 0', display:'none' }}>
                          {s.class}{s.section ? `-${s.section}` : ''} · {s.parent_phone || 'no phone'}
                        </p>
                      </div>
                    </div>

                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{s.class}{s.section ? `-${s.section}` : ''}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.parent_name || '—'}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)' }}>{s.parent_phone || '—'}</span>
                    <span className="badge" style={{ background:st.bg, color:st.c, justifySelf:'start' }}>{s.status}</span>
                    <span className="hide-md" style={{ color:'#d1d5db' }}>→</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <StudentDrawer student={drawer} onClose={() => setDrawer(null)}
          onEdit={s => { setDrawer(null); setEditItem(s); setShowModal(true) }}
          onExit={s => { setDrawer(null); setExitStudent(s) }}
          onReactivate={handleReactivate}
          onDelete={handleDelete} />
      )}
      {showModal && (
        <StudentModal initial={editItem} onClose={() => { setShowModal(false); setEditItem(null) }} onSaved={handleSaved} />
      )}
      {exitStudent && (
        <StudentExitModal student={exitStudent}
          onClose={() => setExitStudent(null)}
          onDone={() => { setExitStudent(null); load() }} />
      )}

      <style>{`
        @media (max-width: 768px) {
          .student-row { grid-template-columns: 1fr auto !important; }
          .student-row .show-md-only { display: block !important; }
        }
      `}</style>
    </Layout>
  )
}