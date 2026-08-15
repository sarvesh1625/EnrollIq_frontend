import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const GRADES_LIST = ['Pre-LKG','Nursery','LKG','UKG','Pre-KG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']

const feesApi = {
  getStats:      ()        => api.get('/fees/stats'),
  getPayments:   (p)       => api.get('/fees/payments', { params: p }),
  getStructures: ()        => api.get('/fees/structures'),
  createPayment: (d)       => api.post('/fees/payments', d),
  recordPayment: (id, d)   => api.patch(`/fees/payments/${id}/pay`, d),
  createStructure:(d)      => api.post('/fees/structures', d),
  getStudents:   ()        => api.get('/students', { params:{ limit:500 } }),
}

const STATUS_STYLE = {
  Paid:    'bg-green-50 text-green-700',
  Pending: 'bg-amber-50 text-amber-700',
  Overdue: 'bg-red-50 text-red-500',
  Partial: 'bg-blue-50 text-blue-600',
}
const FEE_TYPES = ['Tuition Fee','Transport Fee','Lab Fee','Sports Fee','Library Fee','Exam Fee','Annual Fee','Activity Fee','Other']

function fmtRupee(n) {
  if (!n) return '₹0'
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n/1000).toFixed(0)}K`
  return `₹${n}`
}

// ── Create Invoice Modal ──────────────────────────────────────────────────────
function CreateInvoiceModal({ students, onClose, onSaved }) {
  const [form, setForm] = useState({ student_id:'', fee_type:'Tuition Fee', amount:'', due_date:'', payment_mode:'' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await feesApi.createPayment({ ...form, student_id: parseInt(form.student_id), amount: parseFloat(form.amount) })
      onSaved('Invoice created successfully!')
    } catch (err) { setError(err.response?.data?.message || 'Failed to create invoice') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-serif text-xl font-bold text-ink">Create Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <div>
            <label className="label">Student *</label>
            <select className="input" value={form.student_id} onChange={set('student_id')} required>
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.class} ({s.roll_number})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fee type *</label>
            <select className="input" value={form.fee_type} onChange={set('fee_type')}>
              {FEE_TYPES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 g-2">
            <div>
              <label className="label">Amount (₹) *</label>
              <input className="input" type="number" value={form.amount} onChange={set('amount')} required placeholder="e.g. 15000" min="1" />
            </div>
            <div>
              <label className="label">Due date</label>
              <input className="input" type="date" value={form.due_date} onChange={set('due_date')} />
            </div>
          </div>
          <div>
            <label className="label">Payment mode</label>
            <select className="input" value={form.payment_mode} onChange={set('payment_mode')}>
              <option value="">Not yet paid</option>
              <option>Cash</option><option>UPI</option><option>Online Transfer</option>
              <option>Cheque</option><option>DD</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Record Payment Modal ──────────────────────────────────────────────────────
function RecordPaymentModal({ payment, onClose, onSaved }) {
  const remaining = parseFloat(payment.amount) - parseFloat(payment.paid_amount || 0)
  const [form, setForm] = useState({ paid_amount: remaining.toString(), payment_mode:'Cash', reference_no:'' })
  const [saving, setSaving] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await feesApi.recordPayment(payment.id, { ...form, paid_amount: parseFloat(form.paid_amount) })
      onSaved('Payment recorded!')
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-serif text-lg font-bold text-ink">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="bg-paper rounded-xl p-4">
            <p className="text-sm font-medium text-ink">{payment.student_name}</p>
            <p className="text-xs text-gray-400">{payment.fee_type} · {payment.class}</p>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-400">Total</span>
              <span className="text-sm font-bold text-ink">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Already paid</span>
              <span className="text-sm text-green-600">₹{parseFloat(payment.paid_amount||0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
              <span className="text-xs font-semibold text-gray-500">Remaining</span>
              <span className="text-sm font-bold text-red-500">₹{remaining.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div>
            <label className="label">Amount receiving (₹) *</label>
            <input className="input" type="number" value={form.paid_amount} onChange={set('paid_amount')}
              required min="1" max={remaining} />
          </div>
          <div>
            <label className="label">Payment mode *</label>
            <select className="input" value={form.payment_mode} onChange={set('payment_mode')}>
              {['Cash','UPI','Online Transfer','Cheque','DD'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference / Receipt no.</label>
            <input className="input" value={form.reference_no} onChange={set('reference_no')} placeholder="Optional" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'Recording...' : '✓ Record Payment'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Fee Structure Modal ───────────────────────────────────────────────────────
function FeeStructureModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ class_name:'Grade 1', fee_type:'Tuition Fee', amount:'', term:'Annual', due_day:10 })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const GRADES = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','All']

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await feesApi.createStructure({ ...form, amount: parseFloat(form.amount) })
      onSaved('Fee structure saved!')
    } catch (err) { setError(err.response?.data?.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">Add Fee Structure</h2>
            <p className="text-xs text-gray-400 mt-0.5">Define fee amounts per class per term</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3 g-2">
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class_name} onChange={set('class_name')}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fee type *</label>
              <select className="input" value={form.fee_type} onChange={set('fee_type')}>
                {FEE_TYPES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input className="input" type="number" value={form.amount} onChange={set('amount')} required placeholder="e.g. 25000" />
            </div>
            <div>
              <label className="label">Term</label>
              <select className="input" value={form.term} onChange={set('term')}>
                {['Annual','Term 1','Term 2','Term 3','Monthly','Quarterly'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due day of month</label>
              <input className="input" type="number" value={form.due_day} onChange={set('due_day')} min={1} max={28} />
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            💡 Fee structures define the standard amount per class. Individual invoices can be created from this template.
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Fee Structure'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Fees Page ────────────────────────────────────────────────────────────
const STATUS_DOT = {
  Paid:    { bg:'var(--c-green-lt)', c:'var(--c-green)' },
  Pending: { bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
  Overdue: { bg:'var(--c-red-lt)',   c:'var(--c-red)' },
  Partial: { bg:'var(--c-blue-lt)',  c:'var(--c-blue)' },
}

export default function Fees() {
  const [tab,        setTab]       = useState('invoices')
  const [stats,      setStats]     = useState({ total_collected:0, total_pending:0, total_overdue:0, students_owing:0 })
  const [payments,   setPayments]  = useState([])
  const [structures, setStructures]= useState([])
  const [students,   setStudents]  = useState([])
  const [total,      setTotal]     = useState(0)
  const [loading,    setLoading]   = useState(true)
  const [statusFilter,setStatusFilter] = useState('All')
  const [classFilter, setClassFilter]  = useState('All')
  const [search,     setSearch]    = useState('')
  const [toast,      setToast]     = useState('')
  const [showCreate,    setShowCreate]    = useState(false)
  const [showRecord,    setShowRecord]    = useState(null)
  const [showStructure, setShowStructure] = useState(false)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadAll = async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      if (classFilter !== 'All')  params.class  = classFilter
      if (search.trim())         params.search  = search.trim()
      const [statsRes, paymentsRes, structsRes, studsRes] = await Promise.allSettled([
        feesApi.getStats(), feesApi.getPayments(params), feesApi.getStructures(), feesApi.getStudents(),
      ])
      if (statsRes.status    === 'fulfilled') setStats(statsRes.value.data)
      if (paymentsRes.status === 'fulfilled') { setPayments(paymentsRes.value.data.payments || []); setTotal(paymentsRes.value.data.total || 0) }
      if (structsRes.status  === 'fulfilled') setStructures(structsRes.value.data || [])
      if (studsRes.status    === 'fulfilled') setStudents(studsRes.value.data.students || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [statusFilter, classFilter])
  useEffect(() => { const t = setTimeout(loadAll, 400); return () => clearTimeout(t) }, [search])

  const handleSaved = msg => { showToast(msg); setShowCreate(false); setShowRecord(null); setShowStructure(false); loadAll() }

  const denom = stats.total_collected + stats.total_pending + stats.total_overdue
  const collectionPct = denom > 0 ? Math.round((stats.total_collected / denom) * 100) : 0

  return (
    <Layout>
      <div className="page">
        {toast && (
          <div style={{ position:'fixed', top:20, right:20, zIndex:99, background:'var(--c-ink)', color:'white', fontSize:13, padding:'10px 18px', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0 }}>Fees</h1>
            <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>Track payments, dues and overdue accounts</p>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button className="btn-ghost" onClick={() => setShowStructure(true)}>⚙ Fee structure</button>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Create invoice</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }} className="g-4">
          <div className="stat-card">
            <p className="label">Collected</p>
            <p className="value" style={{ color:'var(--c-green)' }}>{fmtRupee(stats.total_collected)}</p>
            <p className="sublabel">This year</p>
          </div>
          <div className="stat-card">
            <p className="label">Pending</p>
            <p className="value" style={{ color:'var(--c-amber)' }}>{fmtRupee(stats.total_pending)}</p>
            <p className="sublabel">{stats.students_owing} students</p>
          </div>
          <div className="stat-card">
            <p className="label">Overdue</p>
            <p className="value" style={{ color:'var(--c-red)' }}>{fmtRupee(stats.total_overdue)}</p>
            <p className="sublabel" style={{ color:'var(--c-red)' }}>Action needed</p>
          </div>
          <div className="stat-card">
            <p className="label">Collection rate</p>
            <p className="value">{collectionPct}%</p>
            <div style={{ height:6, background:'#f0ede8', borderRadius:99, marginTop:8, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${collectionPct}%`, background:'var(--c-green)', borderRadius:99 }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:3, background:'white', border:'1px solid var(--c-border-2)', borderRadius:8, padding:3, width:'fit-content', marginBottom:16 }}>
          {[{ key:'invoices', label:'Invoices & Payments' }, { key:'structure', label:'Fee Structure' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ fontSize:12, fontWeight:500, padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
                background: tab === t.key ? 'var(--c-ink)' : 'transparent', color: tab === t.key ? 'white' : 'var(--c-ink-2)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* INVOICES TAB */}
        {tab === 'invoices' && (
          <>
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
              <input className="input" style={{ maxWidth:240 }} placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
              <select className="input" style={{ maxWidth:150 }} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                {['All', ...GRADES_LIST].map(g => <option key={g} value={g}>{g === 'All' ? 'All classes' : g}</option>)}
              </select>
              <div style={{ display:'flex', gap:3, background:'white', border:'1px solid var(--c-border-2)', borderRadius:8, padding:3, overflowX:'auto' }}>
                {['All','Paid','Pending','Overdue','Partial'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    style={{ fontSize:11, fontWeight:500, padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer', whiteSpace:'nowrap',
                      background: statusFilter === s ? 'var(--c-ink)' : 'transparent', color: statusFilter === s ? 'white' : 'var(--c-ink-2)' }}>
                    {s}
                  </button>
                ))}
              </div>
              <span style={{ fontSize:12, color:'var(--c-muted)', marginLeft:'auto' }}>{total} invoices</span>
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'2fr 80px 1.2fr 1fr 1fr 100px 90px 70px', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
                {['Student','Class','Fee type','Amount','Paid','Due','Status',''].map((h,i) => (
                  <span key={i} style={{ fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</span>
                ))}
              </div>

              {loading ? (
                <div style={{ textAlign:'center', padding:56, color:'var(--c-muted)' }}>
                  <div style={{ width:28, height:28, border:'3px solid #f0ede8', borderTop:'3px solid var(--c-brand)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
                  Loading invoices...
                </div>
              ) : payments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">◎</div>
                  <p className="empty-title">No invoices found</p>
                  <p className="empty-sub">{search || statusFilter !== 'All' ? 'Try clearing filters' : 'Create your first invoice'}</p>
                  {!search && statusFilter === 'All' && <button className="btn-primary" style={{ marginTop:14 }} onClick={() => setShowCreate(true)}>+ Create invoice</button>}
                </div>
              ) : (
                <div>
                  {payments.map((p, i) => {
                    const st = STATUS_DOT[p.status] || STATUS_DOT.Pending
                    return (
                      <div key={p.id} className="fee-row"
                        style={{ display:'grid', gridTemplateColumns:'2fr 80px 1.2fr 1fr 1fr 100px 90px 70px', gap:12, alignItems:'center',
                          padding:'14px 20px', borderBottom: i < payments.length-1 ? '1px solid #faf9f7' : 'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--c-ink-2)', flexShrink:0 }}>{p.student_name?.[0]}</div>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.student_name}</p>
                            <p className="show-md-only" style={{ fontSize:11, color:'var(--c-muted)', margin:'2px 0 0', display:'none' }}>{p.fee_type} · ₹{parseFloat(p.amount).toLocaleString('en-IN')} · {p.status}</p>
                          </div>
                        </div>
                        <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{p.class}</span>
                        <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{p.fee_type}</span>
                        <span className="hide-md" style={{ fontSize:12, fontWeight:600, color:'var(--c-ink)' }}>₹{parseFloat(p.amount).toLocaleString('en-IN')}</span>
                        <span className="hide-md" style={{ fontSize:12, color:'var(--c-green)', fontWeight:500 }}>{parseFloat(p.paid_amount||0) > 0 ? `₹${parseFloat(p.paid_amount).toLocaleString('en-IN')}` : '—'}</span>
                        <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)' }}>{p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</span>
                        <span className="badge" style={{ background:st.bg, color:st.c, justifySelf:'start' }}>{p.status}</span>
                        <span style={{ textAlign:'right' }}>
                          {p.status !== 'Paid' && (
                            <button onClick={() => setShowRecord(p)} style={{ fontSize:12, color:'var(--c-brand)', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>Record</button>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* STRUCTURE TAB */}
        {tab === 'structure' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr 1fr 90px 100px', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
              {['Class','Fee type','Amount','Term','Due day','Created'].map((h,i) => (
                <span key={i} style={{ fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</span>
              ))}
            </div>
            {structures.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⚙</div>
                <p className="empty-title">No fee structure yet</p>
                <p className="empty-sub">Define fee amounts per class</p>
                <button className="btn-primary" style={{ marginTop:14 }} onClick={() => setShowStructure(true)}>+ Add fee structure</button>
              </div>
            ) : (
              <div>
                {structures.map((s, i) => (
                  <div key={s.id} className="fee-row"
                    style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr 1fr 90px 100px', gap:12, alignItems:'center', padding:'14px 20px', borderBottom: i < structures.length-1 ? '1px solid #faf9f7' : 'none' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)' }}>{s.class_name}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{s.fee_type}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)' }}>₹{parseFloat(s.amount).toLocaleString('en-IN')}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{s.term}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)' }}>Day {s.due_day}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate    && <CreateInvoiceModal students={students} onClose={() => setShowCreate(false)} onSaved={handleSaved} />}
      {showRecord    && <RecordPaymentModal payment={showRecord} onClose={() => setShowRecord(null)} onSaved={handleSaved} />}
      {showStructure && <FeeStructureModal onClose={() => setShowStructure(false)} onSaved={handleSaved} />}

      <style>{`
        @media (max-width: 768px) {
          .fee-row { grid-template-columns: 1fr auto !important; }
          .fee-row .show-md-only { display: block !important; }
        }
      `}</style>
    </Layout>
  )
}