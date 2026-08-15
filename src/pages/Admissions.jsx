import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'

const GRADES   = ['Pre-LKG','Nursery','LKG','UKG','Pre-KG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const SECTIONS = ['A','B','C','D']
const STATUSES = ['New','Under Review','Interview Scheduled','Admitted','Rejected']

const STATUS_STYLE = {
  'New':                 { bg:'#f3f4f6', text:'#6b7280' },
  'Under Review':        { bg:'#eff6ff', text:'#2563eb' },
  'Interview Scheduled': { bg:'#fffbeb', text:'#b45309' },
  'Admitted':            { bg:'#f0fdf4', text:'#15803d' },
  'Rejected':            { bg:'#fef2f2', text:'#dc2626' },
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
}

// ── Convert to Student Modal ──────────────────────────────────────────────────
function ConvertModal({ admission, onClose, onConverted }) {
  const [form,    setForm]    = useState({
    class:        admission.grade_applied || '',
    section:      'A',
    roll_number:  '',
    dob:          admission.date_of_birth?.slice(0,10) || '',
    parent_email: '',
  })
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(null)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleConvert = async () => {
    // confirm before creating the student record, to avoid accidental double-enrollment
    const ok = window.confirm(
      `Enroll ${admission.student_name} as a student?\n\nThis creates a permanent student record. Do this only once per admission.`
    )
    if (!ok) return
    setLoading(true); setError('')
    try {
      const res = await api.post(`/admissions/${admission.id}/convert-to-student`, form)
      setSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Conversion failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="font-serif text-2xl font-bold text-ink mb-2">Student Created!</h3>
            <p className="text-gray-500 text-sm mb-6">
              <strong>{admission.student_name}</strong> is now enrolled as a student.
            </p>
            <div className="bg-green-50 rounded-xl p-4 text-left mb-6">
              <div className="flex justify-between py-1.5 border-b border-green-100">
                <span className="text-xs text-gray-500">Name</span>
                <span className="text-xs font-semibold text-ink">{success.student?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-green-100">
                <span className="text-xs text-gray-500">Roll number</span>
                <span className="text-xs font-bold text-green-700 font-mono">{success.student?.roll_number}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-green-100">
                <span className="text-xs text-gray-500">Class</span>
                <span className="text-xs font-semibold text-ink">{success.student?.class} — {success.student?.section}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-xs text-gray-500">Admission status</span>
                <span className="text-xs font-semibold text-green-700">✓ Admitted</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => onConverted()} className="btn-primary flex-1 justify-center">
                View in Students →
              </button>
              <button onClick={onClose} className="btn-ghost">Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-ink">Convert to Student</h2>
                <p className="text-xs text-gray-400 mt-0.5">Create a student record for {admission.student_name}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none">×</button>
            </div>

            <div className="p-5">
              {/* Admission summary */}
              <div className="bg-paper rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-lg font-bold text-brand-600 font-serif">
                    {admission.student_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{admission.student_name}</p>
                    <p className="text-xs text-gray-400">{admission.parent_name} · {admission.parent_phone}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Applied for: <span className="font-medium text-ink">{admission.grade_applied}</span></p>
              </div>

              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 g-2">
                  <div>
                    <label className="label">Assign class *</label>
                    <select className="input" value={form.class} onChange={set('class')}>
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
                </div>
                <div>
                  <label className="label">Roll number (auto-generated if blank)</label>
                  <input className="input" value={form.roll_number} onChange={set('roll_number')}
                    placeholder="Leave blank to auto-generate" />
                </div>
                <div>
                  <label className="label">Date of birth</label>
                  <input className="input" type="date" value={form.dob} onChange={set('dob')} />
                </div>
                <div>
                  <label className="label">Parent email (optional)</label>
                  <input className="input" type="email" value={form.parent_email}
                    onChange={set('parent_email')} placeholder="parent@email.com" />
                </div>

                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                  📋 This will: create a student record, set admission status to "Admitted", and auto-generate a roll number if not provided.
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={handleConvert} disabled={loading || !form.class}
                    className="btn-primary flex-1 justify-center disabled:opacity-60">
                    {loading ? 'Creating student...' : '✓ Convert to Student'}
                  </button>
                  <button onClick={onClose} className="btn-ghost">Cancel</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function AdmissionModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    student_name:  initial?.student_name  || '',
    date_of_birth: initial?.date_of_birth?.slice(0,10) || '',
    grade_applied: initial?.grade_applied || '',
    parent_name:   initial?.parent_name   || '',
    parent_phone:  initial?.parent_phone  || '',
    parent_email:  initial?.parent_email  || '',
    address:       initial?.address       || '',
    notes:         initial?.notes         || '',
    status:        initial?.status        || 'New',
    docs_complete: initial?.docs_complete || false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (initial?.id) await api.put(`/admissions/${initial.id}`, form)
      else             await api.post('/admissions', form)
      onSaved()
    } catch (err) { setError(err.response?.data?.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-serif text-xl font-bold text-ink">
            {initial ? 'Edit Application' : 'New Application'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Student Details</p>
            <div className="grid grid-cols-2 gap-3 g-2">
              <div className="col-span-2">
                <label className="label">Student name *</label>
                <input className="input" value={form.student_name} onChange={set('student_name')} required placeholder="Full name" />
              </div>
              <div>
                <label className="label">Grade applying for *</label>
                <select className="input" value={form.grade_applied} onChange={set('grade_applied')} required>
                  <option value="">Select grade</option>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date of birth</label>
                <input className="input" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Parent Details</p>
            <div className="grid grid-cols-2 gap-3 g-2">
              <div>
                <label className="label">Parent name *</label>
                <input className="input" value={form.parent_name} onChange={set('parent_name')} required placeholder="Guardian name" />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input" value={form.parent_phone} onChange={set('parent_phone')} required placeholder="10-digit" maxLength={10} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.parent_email} onChange={set('parent_email')} placeholder="parent@email.com" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Application Status</p>
            <div className="grid grid-cols-2 gap-3 g-2">
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.docs_complete}
                    onChange={e => setForm(p => ({ ...p, docs_complete: e.target.checked }))}
                    className="w-4 h-4 accent-ink" />
                  <span className="text-sm text-gray-600">Documents complete</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')}
              placeholder="Any notes about this application..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'Saving...' : initial ? 'Update Application' : 'Create Application'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Admissions Page ──────────────────────────────────────────────────────
export default function Admissions() {
  const navigate = useNavigate()
  const [admissions, setAdmissions] = useState([])
  const [stats,      setStats]      = useState({ total_applications:0, pending_review:0, admitted_this_year:0, this_month:0, conversion_rate:0 })
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showAdd,    setShowAdd]    = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [convertItem,setConvertItem]= useState(null)
  const [toast,      setToast]      = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, lRes] = await Promise.allSettled([
        api.get('/admissions/stats'),
        api.get('/admissions', { params:{ status: statusFilter !== 'All' ? statusFilter : undefined } }),
      ])
      if (sRes.status === 'fulfilled') setStats(sRes.value.data)
      if (lRes.status === 'fulfilled') setAdmissions(lRes.value.data.admissions || lRes.value.data || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const filtered = admissions.filter(a => {
    const q = search.toLowerCase()
    return !q || a.student_name?.toLowerCase().includes(q) || a.parent_name?.toLowerCase().includes(q) || a.parent_phone?.includes(q)
  })

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/admissions/${id}`, { status })
      showToast(`Status updated to ${status}`)
      load()
    } catch { showToast('❌ Failed to update status') }
  }

  return (
    <Layout>
      <div className="page">
        {toast && (
          <div className="fixed top-5 right-5 z-50 bg-ink text-white text-sm px-5 py-3 rounded-xl shadow-xl">{toast}</div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Admissions</h1>
            <p className="text-gray-400 text-sm mt-1">Manage applications · Convert to student when admitted</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">+ New Application</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8 g-3">
          {[
            { label:'Total applications', value: stats.total_applications, color:'text-ink'       },
            { label:'Pending review',     value: stats.pending_review,     color:'text-blue-600'  },
            { label:'Admitted this year', value: stats.admitted_this_year, color:'text-green-600' },
            { label:'This month',         value: stats.this_month,         color:'text-ink'       },
            { label:'Conversion rate',    value: `${stats.conversion_rate||0}%`, color:'text-brand-600' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="label">{s.label}</p>
              <p className={`font-serif text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5" style={{ alignItems:"center" }}>
          <input type="text" className="input max-w-xs"
            placeholder="Search by name or phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1" style={{ overflowX:"auto", maxWidth:"100%" }}>
            {['All', ...STATUSES].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={'text-xs px-3 py-1.5 rounded-md transition-colors ' +
                  (statusFilter===s ? 'bg-ink text-white font-medium' : 'text-gray-500 hover:bg-cream')}
                style={{ whiteSpace:"nowrap" }}>
                {s}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 self-center ml-auto">{filtered.length} applications</span>
        </div>

        {/* Table */}
        <div className="card" style={{padding:0,overflowX:"auto"}}>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-paper">
              <tr>
                {['Student','Grade','Parent','Phone','Docs','Applied on','Status','Action'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <p className="text-gray-400 text-sm mb-3">No applications found</p>
                    <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
                      + New Application
                    </button>
                  </td>
                </tr>
              ) : filtered.map(a => {
                const ss = STATUS_STYLE[a.status] || STATUS_STYLE['New']
                const isAdmitted   = a.status === 'Admitted'
                const isConverted  = a.student_id != null
                return (
                  <tr key={a.id} className="hover:bg-paper">
                    {/* Student */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-sm font-bold text-brand-600 flex-shrink-0">
                          {a.student_name?.[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ink">{a.student_name}</p>
                          {isConverted && (
                            <span className="text-xs text-green-600">✓ Enrolled</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Grade */}
                    <td className="px-5 py-3 text-xs text-gray-600">{a.grade_applied}</td>
                    {/* Parent */}
                    <td className="px-5 py-3 text-xs text-gray-500">{a.parent_name}</td>
                    {/* Phone */}
                    <td className="px-5 py-3">
                      <a href={`tel:${a.parent_phone}`} className="text-xs text-brand-600 hover:underline">
                        {a.parent_phone}
                      </a>
                    </td>
                    {/* Docs */}
                    <td className="px-5 py-3">
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' +
                        (a.docs_complete ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                        {a.docs_complete ? '✓ Complete' : '⏳ Pending'}
                      </span>
                    </td>
                    {/* Date */}
                    <td className="px-5 py-3 text-xs text-gray-400">{fmtDate(a.created_at)}</td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      <select
                        value={a.status}
                        onChange={e => handleStatusChange(a.id, e.target.value)}
                        style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20,
                          background:ss.bg, color:ss.text, border:'none', cursor:'pointer', outline:'none' }}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    {/* Action */}
                    <td className="px-5 py-3" style={{ minWidth:200 }}>
                      <div className="flex items-center gap-2" style={{ whiteSpace:"nowrap" }}>
                        {isConverted ? (
                          <button onClick={() => navigate('/students')}
                            className="text-xs text-green-600 hover:underline font-medium whitespace-nowrap">
                            View student →
                          </button>
                        ) : isAdmitted ? (
                          <button onClick={() => setConvertItem(a)}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-semibold whitespace-nowrap">
                            ✓ Enroll as Student
                          </button>
                        ) : (
                          <button onClick={() => setEditItem(a)}
                            className="text-xs text-brand-600 hover:underline font-medium">
                            Edit
                          </button>
                        )}
                        {!isConverted && (
                          <>
                            <span className="text-gray-200">|</span>
                            <button onClick={() => setEditItem(a)}
                              className="text-xs text-gray-400 hover:underline">
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* How it works banner */}
        <div className="card mt-5 bg-blue-50 border-blue-100">
          <p className="text-sm font-semibold text-ink mb-3">How Admissions → Students works</p>
          <div className="flex gap-0">
            {[
              { n:'1', label:'New application',    desc:'Parent applies, docs submitted', color:'#6b7280' },
              { n:'2', label:'Under review',        desc:'Team reviews documents', color:'#2563eb' },
              { n:'3', label:'Interview scheduled', desc:'Campus visit / interview', color:'#b45309' },
              { n:'4', label:'Admitted',            desc:'Approval given', color:'#15803d' },
              { n:'5', label:'Enroll as Student',  desc:'Click button → student record created', color:'#d4521a' },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center">
                <div className="text-center px-3">
                  <div style={{ width:28, height:28, borderRadius:'50%', background:step.color, color:'white', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px' }}>
                    {step.n}
                  </div>
                  <p style={{ fontSize:11, fontWeight:600, color:step.color }}>{step.label}</p>
                  <p style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>{step.desc}</p>
                </div>
                {i < 4 && <div style={{ fontSize:16, color:'#e5e7eb', margin:'0 4px', marginBottom:12 }}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAdd    && <AdmissionModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); showToast('✅ Application created!') }} />}
      {editItem   && <AdmissionModal initial={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load(); showToast('✅ Application updated!') }} />}
      {convertItem && (
        <ConvertModal
          admission={convertItem}
          onClose={() => setConvertItem(null)}
          onConverted={() => { setConvertItem(null); load(); navigate('/students'); }}
        />
      )}
    </Layout>
  )
}