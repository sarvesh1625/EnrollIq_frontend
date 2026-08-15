import { useState, useEffect } from 'react'
import api from '../api/axios'

const saApi = {
  login:        (d)      => api.post('/superadmin/login', d),
  getDashboard: (tok)    => api.get('/superadmin/dashboard',    { headers:{ Authorization:`Bearer ${tok}` } }),
  getSchools:   (tok)    => api.get('/superadmin/schools',      { headers:{ Authorization:`Bearer ${tok}` } }),
  getSchool:    (id,tok) => api.get(`/superadmin/school/${id}`, { headers:{ Authorization:`Bearer ${tok}` } }),
  createSchool: (d,tok)  => api.post('/superadmin/schools', d,  { headers:{ Authorization:`Bearer ${tok}` } }),
  updateSchool: (id,d,tok)=>api.patch(`/superadmin/school/${id}`,d,{ headers:{ Authorization:`Bearer ${tok}` } }),
  impersonate:  (id,tok) => api.post(`/superadmin/impersonate/${id}`,{},{ headers:{ Authorization:`Bearer ${tok}` } }),
  resetPass:    (uid,pw,tok)=>api.post(`/superadmin/reset-password/${uid}`,{new_password:pw},{ headers:{ Authorization:`Bearer ${tok}` } }),
}

const PLAN_STYLE   = { basic:{ bg:'#f3f4f6',text:'#6b7280' }, premium:{ bg:'#eff6ff',text:'#2563eb' }, enterprise:{ bg:'#fdf4ff',text:'#7c3aed' } }
const STATUS_STYLE = { Active:{ bg:'#f0fdf4',text:'#15803d' }, Suspended:{ bg:'#fef2f2',text:'#dc2626' }, Trial:{ bg:'#fffbeb',text:'#b45309' } }

function fmtMoney(n) {
  if (!n) return '₹0'
  if (n>=10000000) return `₹${(n/10000000).toFixed(1)}Cr`
  if (n>=100000)   return `₹${(n/100000).toFixed(1)}L`
  if (n>=1000)     return `₹${(n/1000).toFixed(0)}K`
  return `₹${n}`
}

// ── Super Admin Login ─────────────────────────────────────────────────────────
function SuperLogin({ onLogin }) {
  const [form,    setForm]    = useState({ email:'superadmin@enrolliq.com', password:'' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await saApi.login(form)
      onLogin(res.data.token, res.data.admin)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Check email and password.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-ink">
            Enroll<span className="text-brand-600">IQ</span>
          </h1>
          <div className="inline-block bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full mt-2">
            ⚡ Super Admin
          </div>
        </div>

        <h2 className="font-semibold text-ink text-lg mb-1">Platform Control</h2>
        <p className="text-gray-400 text-sm mb-6">Manage all schools from one place</p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email}
              onChange={set('email')} required autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password}
              onChange={set('password')} placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center mt-1 disabled:opacity-60">
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <div className="mt-5 bg-paper rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Email: <span className="font-mono text-ink">superadmin@enrolliq.com</span></p>
          <p className="text-xs text-gray-400">Password: <span className="font-mono text-ink">SuperAdmin@123</span></p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <a href="/login" className="text-brand-600 hover:underline">← School admin login</a>
        </p>
      </div>
    </div>
  )
}

// ── Add School Modal ──────────────────────────────────────────────────────────
function AddSchoolModal({ token, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', city:'Hyderabad', board:'CBSE', phone:'', email:'', plan:'Basic',
    admin_name:'', admin_email:'', admin_password:'',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await saApi.createSchool(form, token)
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create school. Check all fields.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-ink">Add New School</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">School Details</p>
            <div className="grid grid-cols-2 gap-3 g-2">
              <div className="col-span-2">
                <label className="label">School name *</label>
                <input className="input" value={form.name} onChange={set('name')} required
                  placeholder="e.g. CMR School Madhapur" />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={set('city')} placeholder="Hyderabad" />
              </div>
              <div>
                <label className="label">Board</label>
                <select className="input" value={form.board} onChange={set('board')}>
                  {['CBSE','ICSE','State Board','IB','IGCSE'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={set('phone')} placeholder="School phone" />
              </div>
              <div>
                <label className="label">Plan</label>
                <select className="input" value={form.plan} onChange={set('plan')}>
                  {['Basic','Pro','Enterprise'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Admin Account</p>
            <div className="grid grid-cols-2 gap-3 g-2">
              <div>
                <label className="label">Admin name</label>
                <input className="input" value={form.admin_name} onChange={set('admin_name')}
                  placeholder="Principal name" />
              </div>
              <div>
                <label className="label">Admin email *</label>
                <input className="input" type="email" value={form.admin_email} onChange={set('admin_email')}
                  required placeholder="admin@school.com" />
              </div>
              <div className="col-span-2">
                <label className="label">Admin password *</label>
                <input className="input" type="password" value={form.admin_password}
                  onChange={set('admin_password')} required minLength={6} placeholder="Min 6 characters" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            💡 An admin login will be created. Share the email and password with the school principal.
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'Creating...' : 'Create School'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── School Drawer ─────────────────────────────────────────────────────────────
const FEATURE_LABELS = { ai_assistant:'AI Assistant (chatbot)', ai_exam_system:'AI Exam System' }

function FeatureToggles({ schoolId, token, onToast }) {
  const [state, setState] = useState(null)
  const load = () => api.get(`/features/school/${schoolId}`, { headers:{ Authorization:`Bearer ${token}` } })
    .then(r => setState(r.data)).catch(()=>setState({ features:{}, all_features:[] }))
  useEffect(() => { load() }, [schoolId])

  const toggle = async (key, val) => {
    try {
      await api.put(`/features/school/${schoolId}/override`,
        { feature_key:key, enabled:val }, { headers:{ Authorization:`Bearer ${token}` } })
      onToast && onToast(`${FEATURE_LABELS[key]||key} ${val?'enabled':'disabled'}`)
      load()
    } catch { onToast && onToast('Could not update feature') }
  }
  const clearOverride = async (key) => {
    try {
      await api.put(`/features/school/${schoolId}/override`,
        { feature_key:key, enabled:null }, { headers:{ Authorization:`Bearer ${token}` } })
      onToast && onToast('Reverted to plan default')
      load()
    } catch {}
  }

  if (!state) return null
  const feats = state.all_features?.length ? state.all_features : Object.keys(state.features||{})
  return (
    <div className="card !p-4">
      <p className="text-xs font-bold text-gray-400 uppercase mb-3">Features</p>
      <p className="text-xs text-gray-400 mb-3">Plan sets defaults. Toggle to override for this school.</p>
      {feats.map(key => {
        const on = !!state.features?.[key]
        return (
          <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-ink font-medium">{FEATURE_LABELS[key] || key}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(key, !on)}
                className={`w-11 h-6 rounded-full transition-all relative ${on?'bg-brand-600':'bg-gray-200'}`}
                style={{ background: on ? '#12a38a' : '#e5e7eb' }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all"
                  style={{ left: on ? '22px' : '2px' }} />
              </button>
              <button onClick={() => clearOverride(key)} title="Revert to plan default"
                className="text-xs text-gray-400 hover:text-gray-600">reset</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SchoolDrawer({ school, token, onClose, onUpdated }) {
  const [data,   setData]   = useState(null)
  const [loading,setLoading]= useState(true)
  const [tab,    setTab]    = useState('overview')
  const [toast,  setToast]  = useState('')
  const [showReset, setShowReset] = useState(null)
  const [newPass,   setNewPass]   = useState('')

  useEffect(() => {
    saApi.getSchool(school.id, token)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [school.id])

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSuspend = async () => {
    const newStatus = school.status === 'Active' ? 'Suspended' : 'Active'
    if (!confirm(`${newStatus === 'Suspended' ? 'Suspend' : 'Activate'} ${school.name}?`)) return
    await saApi.updateSchool(school.id, { status: newStatus }, token)
    showToast(`School ${newStatus === 'Suspended' ? 'suspended' : 'activated'}`)
    onUpdated()
  }

  const handleImpersonate = async () => {
    if (!confirm(`Open ${school.name} admin dashboard in a new tab?`)) return
    try {
      const res = await saApi.impersonate(school.id, token)
      // Open in new tab with token
      const url = `/dashboard?impersonate=${res.data.token}`
      window.open(url, '_blank')
      showToast('✅ Opening school dashboard...')
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || 'Failed')) }
  }

  const handlePlan = async plan => {
    await saApi.updateSchool(school.id, { subscription_plan: plan.toLowerCase() }, token)
    showToast(`Plan updated to ${plan}`)
    onUpdated()
  }

  const handleReset = async uid => {
    if (!newPass || newPass.length < 6) return alert('Min 6 characters')
    await saApi.resetPass(uid, newPass, token)
    setShowReset(null); setNewPass('')
    showToast('Password reset!')
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="bg-white h-full shadow-2xl overflow-y-auto flex flex-col" style={{width:"min(520px,100vw)"}}
        onClick={e => e.stopPropagation()}>

        {toast && <div className="fixed top-5 right-5 z-50 bg-ink text-white text-sm px-5 py-3 rounded-xl shadow-xl">{toast}</div>}

        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">School Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none">×</button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-2xl font-bold text-brand-600 font-serif flex-shrink-0">
              {school.name[0]}
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold text-ink">{school.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {school.city && <span className="text-xs text-gray-400">📍 {school.city}</span>}
                {school.board && <span className="text-xs text-gray-400">· {school.board}</span>}
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12,
                  background:(STATUS_STYLE[school.status]||STATUS_STYLE.Active).bg,
                  color:(STATUS_STYLE[school.status]||STATUS_STYLE.Active).text }}>
                  {school.status || 'Active'}
                </span>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12,
                  background:(PLAN_STYLE[school.subscription_plan]||PLAN_STYLE.Basic).bg,
                  color:(PLAN_STYLE[school.subscription_plan]||PLAN_STYLE.Basic).text }}>
                  {school.subscription_plan || 'Basic'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleImpersonate} className="btn-primary flex-1 text-sm justify-center">
              🔐 Login as Admin
            </button>
            <button onClick={handleSuspend}
              className={`btn-ghost flex-1 text-sm ${school.status==='Active'?'text-red-500 hover:bg-red-50':'text-green-600 hover:bg-green-50'}`}>
              {school.status==='Active' ? '⛔ Suspend' : '✓ Activate'}
            </button>
            <a href={`/discover?school=${school.id}`} target="_blank" rel="noreferrer"
              className="btn-ghost text-sm">
              🌐 View page
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-gray-100 flex-shrink-0">
          {['overview','plan','staff'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={'text-xs px-3 py-1.5 rounded-md transition-colors font-medium capitalize flex-1 ' +
                (tab===t ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream')}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-gray-400 py-12 text-sm">Loading...</p>
          ) : !data ? null : (
            <>
              {/* Overview */}
              {tab === 'overview' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3 g-2">
                    {[
                      { label:'Students',  value: data.stats?.students||0,    color:'text-brand-600' },
                      { label:'Leads',     value: data.stats?.leads||0,       color:'text-ink'       },
                      { label:'Hot leads', value: data.stats?.hot_leads||0,   color:'text-red-500'   },
                      { label:'Collected', value: fmtMoney(data.stats?.total_collected), color:'text-green-600' },
                    ].map(s => (
                      <div key={s.label} className="stat-card">
                        <p className="label">{s.label}</p>
                        <p className={`font-serif text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="card !p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Info</p>
                    {[
                      { label:'Name',    value: data.school.name },
                      { label:'City',    value: data.school.city||'—' },
                      { label:'Board',   value: data.school.board||'—' },
                      { label:'Phone',   value: data.school.phone||'—' },
                      { label:'Email',   value: data.school.email||'—' },
                      { label:'Joined',  value: new Date(data.school.created_at).toLocaleDateString('en-IN') },
                    ].map(f => (
                      <div key={f.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-xs text-gray-400">{f.label}</span>
                        <span className="text-xs text-ink font-medium">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan */}
              {tab === 'plan' && (
                <div className="flex flex-col gap-4">
                  <div className="card !p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Current plan</p>
                    <div className="flex gap-2">
                      {['basic','premium','enterprise'].map(plan => (
                        <button key={plan} onClick={() => handlePlan(plan)}
                          className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all capitalize ${
                            (data.school.subscription_plan||'basic').toLowerCase() === plan
                              ? 'bg-ink text-white border-ink'
                              : 'border-gray-100 text-gray-500 hover:border-gray-300'
                          }`}>{plan}</button>
                      ))}
                    </div>
                  </div>
                  <FeatureToggles schoolId={school.id} token={token} onToast={showToast} />
                  <div className="card !p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Set rating</p>
                    <div className="flex gap-2">
                      {[3.5,4.0,4.2,4.5,4.8,5.0].map(r => (
                        <button key={r} onClick={async () => {
                          await saApi.updateSchool(data.school.id, { rating: r }, token)
                          showToast(`Rating set to ${r} ⭐`)
                        }}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                            parseFloat(data.school.rating) === r
                              ? 'bg-amber-400 text-white border-amber-400'
                              : 'border-gray-100 text-gray-500 hover:border-amber-200'
                          }`}>⭐ {r}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Staff */}
              {tab === 'staff' && (
                <div className="flex flex-col gap-3">
                  {(data.staff||[]).map(user => (
                    <div key={user.id} className="card !p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-sm font-bold text-brand-600 flex-shrink-0">
                        {user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize flex-shrink-0">{user.role}</span>
                      {showReset === user.id ? (
                        <div className="flex gap-1">
                          <input type="password" className="input text-xs py-1 px-2 w-24"
                            placeholder="New password" value={newPass}
                            onChange={e => setNewPass(e.target.value)} minLength={6} />
                          <button onClick={() => handleReset(user.id)}
                            className="text-xs bg-ink text-white px-2 py-1 rounded-lg">Set</button>
                          <button onClick={() => setShowReset(null)} className="text-xs text-gray-400">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowReset(user.id)}
                          className="text-xs text-brand-600 hover:underline flex-shrink-0">Reset pwd</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Super Admin App ──────────────────────────────────────────────────────
function SuperDashboard({ token, admin, onLogout }) {
  const [tab,     setTab]     = useState('dashboard')
  const [dash,    setDash]    = useState(null)
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [drawer,  setDrawer]  = useState(null)
  const [toast,   setToast]   = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [d, s] = await Promise.allSettled([
        saApi.getDashboard(token),
        saApi.getSchools(token),
      ])
      if (d.status === 'fulfilled') setDash(d.value.data)
      if (s.status === 'fulfilled') setSchools(s.value.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city||'').toLowerCase().includes(search.toLowerCase())
  )

  const ps = dash?.platform_stats || {}

  return (
    <div className="min-h-screen bg-paper">
      {toast && <div className="fixed top-5 right-5 z-50 bg-ink text-white text-sm px-5 py-3 rounded-xl shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20" style={{padding:"14px 20px"}}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink whitespace-nowrap">Enroll<span className="text-brand-600">IQ</span></h1>
          <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">⚡ Super Admin</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-sm text-gray-400 hidden md:inline">👋 {admin.name}</span>
          <a href="/discover" target="_blank" className="btn-ghost text-sm hidden sm:inline-flex">🌐 Discovery</a>
          <button onClick={onLogout} className="btn-ghost text-sm">Logout</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar — horizontal tab bar on mobile, vertical on desktop */}
        <div className="sa-sidebar bg-white border-b md:border-b-0 md:border-r border-gray-100 flex-shrink-0 flex md:flex-col gap-1 md:gap-0 md:w-52 md:min-h-screen px-3 py-2 md:py-6">
          {[
            { key:'dashboard', icon:'▦', label:'Dashboard' },
            { key:'schools',   icon:'🏫', label:'Schools'   },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={'sidebar-link flex-1 md:w-full ' + (tab===t.key ? 'active' : '')}>
              <span className="text-sm w-5 text-center">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6" style={{minWidth:0}}>

          {/* Dashboard */}
          {tab === 'dashboard' && (
            <>
              <div className="mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Platform Overview</h2>
                <p className="text-gray-400 text-sm mt-1">All schools · live data</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
                {[
                  { label:'Schools',    value: ps.total_schools||0,            color:'text-ink'       },
                  { label:'Students',   value: ps.total_students||0,           color:'text-brand-600' },
                  { label:'Total leads',value: ps.total_leads||0,              color:'text-ink'       },
                  { label:'Today leads',value: ps.today_leads||0,              color:'text-green-600' },
                  { label:'Hot leads',  value: ps.hot_leads||0,                color:'text-red-500'   },
                  { label:'Collected',  value: fmtMoney(ps.total_collected),   color:'text-green-600' },
                ].map(s => (
                  <div key={s.label} className="stat-card text-center">
                    <p className="label text-xs text-center">{s.label}</p>
                    <p className={`font-serif text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Schools preview table */}
              <div className="card" style={{padding:0,overflowX:"auto"}}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-ink text-sm">Schools</h3>
                  <button onClick={() => setTab('schools')} className="text-xs text-brand-600 hover:underline">View all →</button>
                </div>
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-paper">
                    <tr>{['School','City','Students','Leads','Collected','Plan','Status'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(dash?.schools||[]).map(sc => (
                      <tr key={sc.id} className="hover:bg-paper cursor-pointer" onClick={() => setDrawer(sc)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-600">{sc.name[0]}</div>
                            <span className="text-xs font-semibold text-ink">{sc.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{sc.city||'—'}</td>
                        <td className="px-5 py-3 text-xs font-semibold text-ink">{sc.total_students||0}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{sc.total_leads||0}</td>
                        <td className="px-5 py-3 text-xs text-green-600 font-semibold">{fmtMoney(sc.total_collected)}</td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12, background:(PLAN_STYLE[(sc.subscription_plan||'basic').toLowerCase()]||PLAN_STYLE.basic).bg, color:(PLAN_STYLE[(sc.subscription_plan||'basic').toLowerCase()]||PLAN_STYLE.basic).text }}>{sc.subscription_plan||'Basic'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12, background:(STATUS_STYLE[sc.status]||STATUS_STYLE.Active).bg, color:(STATUS_STYLE[sc.status]||STATUS_STYLE.Active).text }}>{sc.status||'Active'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Schools */}
          {tab === 'schools' && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Schools</h2>
                  <p className="text-gray-400 text-sm mt-1">{schools.length} schools on platform</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add School</button>
              </div>

              <div className="flex gap-3 mb-5">
                <input type="text" className="input max-w-xs"
                  placeholder="Search by name or city..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              <div className="card" style={{padding:0,overflowX:"auto"}}>
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-paper">
                    <tr>{['School','City','Board','Students','Leads','Collected','Plan','Status',''].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                          No schools yet.{' '}
                          <button onClick={() => setShowAdd(true)} className="text-brand-600 hover:underline">Add first school →</button>
                        </td>
                      </tr>
                    ) : filtered.map(sc => (
                      <tr key={sc.id} className="hover:bg-paper cursor-pointer" onClick={() => setDrawer(sc)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-sm font-bold text-brand-600">{sc.name[0]}</div>
                            <div>
                              <p className="text-xs font-semibold text-ink">{sc.name}</p>
                              <p className="text-xs text-gray-400">{sc.email||''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{sc.city||'—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{sc.board||'—'}</td>
                        <td className="px-5 py-3 text-xs font-semibold text-ink">{sc.total_students||0}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{sc.total_leads||0}</td>
                        <td className="px-5 py-3 text-xs text-green-600 font-semibold">{fmtMoney(sc.total_collected)}</td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12, background:(PLAN_STYLE[(sc.subscription_plan||'basic').toLowerCase()]||PLAN_STYLE.basic).bg, color:(PLAN_STYLE[(sc.subscription_plan||'basic').toLowerCase()]||PLAN_STYLE.basic).text }}>{sc.subscription_plan||'Basic'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12, background:(STATUS_STYLE[sc.status]||STATUS_STYLE.Active).bg, color:(STATUS_STYLE[sc.status]||STATUS_STYLE.Active).text }}>{sc.status||'Active'}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-300 text-sm">→</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {drawer && (
        <SchoolDrawer school={drawer} token={token}
          onClose={() => setDrawer(null)}
          onUpdated={() => { loadAll(); setDrawer(null) }} />
      )}

      {showAdd && (
        <AddSchoolModal token={token}
          onClose={() => setShowAdd(false)}
          onSaved={data => {
            showToast(`✅ ${data.school?.name} created!`)
            setShowAdd(false)
            loadAll()
          }} />
      )}
    
      <style>{`
        @media (max-width: 768px) {
          .sa-sidebar { width: 100% !important; min-height: auto !important; display: flex; overflow-x: auto; border-right: none !important; border-bottom: 1px solid #f0ede8; padding: 8px !important; }
          .sa-sidebar .sidebar-link { white-space: nowrap; width: auto !important; }
        }
      `}</style>

      </div>
  )
}

// ── Entry Point ───────────────────────────────────────────────────────────────
export default function SuperAdmin() {
  const [token, setToken] = useState(() => localStorage.getItem('sa_token'))
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sa_admin') || 'null') } catch { return null }
  })

  const handleLogin = (tok, adm) => {
    setToken(tok); setAdmin(adm)
    localStorage.setItem('sa_token', tok)
    localStorage.setItem('sa_admin', JSON.stringify(adm))
  }

  const handleLogout = () => {
    setToken(null); setAdmin(null)
    localStorage.removeItem('sa_token')
    localStorage.removeItem('sa_admin')
  }

  if (!token || !admin) return <SuperLogin onLogin={handleLogin} />
  return <SuperDashboard token={token} admin={admin} onLogout={handleLogout} />
}