import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'var(--c-ink)', sub = '' }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <p className="value" style={{ color }}>{value}</p>
      {sub && <p className="sublabel">{sub}</p>}
    </div>
  )
}

// ── Quick action button ────────────────────────────────────────────────────────
function QuickAction({ icon, label, onClick, color = 'var(--c-ink)' }) {
  return (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'white',
        border:'1px solid var(--c-border)', borderRadius:12, cursor:'pointer', width:'100%', textAlign:'left', transition:'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <span style={{ fontSize:18, width:24, textAlign:'center' }}>{icon}</span>
      <span style={{ fontSize:13, fontWeight:500, color }}>{label}</span>
      <span style={{ marginLeft:'auto', color:'#d1d5db', fontSize:14 }}>→</span>
    </button>
  )
}

// ── TODAY section ──────────────────────────────────────────────────────────────
function TodaySection({ title, items, emptyMsg }) {
  return (
    <div style={{ background:'white', borderRadius:14, border:'1px solid #f0ede8', overflow:'hidden' }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid #f0ede8' }}>
        <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', margin:0 }}>{title}</p>
      </div>
      {items.length === 0 ? (
        <p style={{ textAlign:'center', color:'#9ca3af', fontSize:13, padding:'30px 20px' }}>{emptyMsg}</p>
      ) : (
        <div style={{ padding:'8px 0' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px',
              borderBottom: i < items.length-1 ? '1px solid #f8f6f1' : 'none' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#f8f6f1',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#6b7280', flexShrink:0 }}>
                {item.avatar}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:500, color:'#1a1814', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</p>
                <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0' }}>{item.sub}</p>
              </div>
              {item.badge && (
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:10,
                  background: item.badgeBg || '#f3f4f6', color: item.badgeColor || '#6b7280' }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── STAFF DASHBOARD ────────────────────────────────────────────────────────────
function StaffDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get('/leads/stats'),
      api.get('/leads?limit=5&status=New'),
    ]).then(([statsRes, leadsRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {})
      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value.data?.leads || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:700, color:'#1a1814', margin:0 }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color:'#9ca3af', fontSize:13, margin:'6px 0 0' }}>
          {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="g-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Total leads"    value={stats.total || 0}                 />
        <StatCard label="New today"      value={stats.today || 0}  color='#2563eb' />
        <StatCard label="Hot leads"      value={stats.hot || 0}    color='#dc2626' />
        <StatCard label="Follow ups due" value={stats.warm || 0}   color='#d97706' />
      </div>

      <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Recent leads */}
        <TodaySection
          title="Recent leads"
          emptyMsg="No leads yet today"
          items={leads.map(l => ({
            avatar: l.name?.[0] || 'L',
            title: l.name,
            sub: `${l.grade_interest} · ${l.source || 'Walk-in'}`,
            badge: l.status,
            badgeBg: l.status === 'Hot' ? '#fef2f2' : '#fffbeb',
            badgeColor: l.status === 'Hot' ? '#dc2626' : '#d97706',
          }))}
        />

        {/* Quick actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', margin:'0 0 8px' }}>Quick actions</p>
          <QuickAction icon="◈" label="Add new lead"         onClick={() => navigate('/leads/new')} />
          <QuickAction icon="⊞" label="View all students"   onClick={() => navigate('/students')} />
          <QuickAction icon="✓" label="Mark attendance"     onClick={() => navigate('/attendance')} />
          <QuickAction icon="✎" label="Enter exam marks"    onClick={() => navigate('/exams')} />
          <QuickAction icon="✉" label="Send communication"  onClick={() => navigate('/communication')} />
        </div>
      </div>
    </div>
  )
}

// ── TEACHER DASHBOARD ──────────────────────────────────────────────────────────
function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/students?limit=5').then(res => {
      setStudents(res.data?.students || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div className="page">
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:700, color:'#1a1814', margin:0 }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color:'#9ca3af', fontSize:13, margin:'6px 0 0' }}>{today}</p>
      </div>

      {/* Today's tasks */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #f0ede8', padding:20, marginBottom:20 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', margin:'0 0 14px' }}>Today's checklist</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { done: false, label:'Mark attendance for your class' },
            { done: false, label:'Enter exam marks (if exam today)' },
            { done: false, label:'Review student performance' },
          ].map((task, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:18, height:18, borderRadius:5, border:'2px solid #e5e7eb',
                background: task.done ? '#059669' : 'white', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {task.done && <span style={{ color:'white', fontSize:11 }}>✓</span>}
              </div>
              <span style={{ fontSize:13, color: task.done ? '#9ca3af' : '#1a1814',
                textDecoration: task.done ? 'line-through' : 'none' }}>{task.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Recent students */}
        <TodaySection
          title="My students"
          emptyMsg="No students yet"
          items={students.map(s => ({
            avatar: s.name?.[0] || 'S',
            title: s.name,
            sub: `${s.class} · Roll ${s.roll_number || '—'}`,
            badge: s.status,
            badgeBg: '#f0fdf4',
            badgeColor: '#059669',
          }))}
        />

        {/* Quick actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', margin:'0 0 8px' }}>Quick actions</p>
          <QuickAction icon="✓" label="Mark today's attendance" onClick={() => navigate('/attendance')} color='#059669' />
          <QuickAction icon="✎" label="Enter exam marks"        onClick={() => navigate('/exams')} color='#059669' />
          <QuickAction icon="⊞" label="View all students"       onClick={() => navigate('/students')} />
        </div>
      </div>
    </div>
  )
}

// ── ACCOUNTANT DASHBOARD ───────────────────────────────────────────────────────
function AccountantDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})

  useEffect(() => {
    api.get('/fees/stats').then(res => setStats(res.data || {})).catch(() => {})
  }, [])

  const fmt = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n || 0}`

  return (
    <div className="page">
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:700, color:'#1a1814', margin:0 }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color:'#9ca3af', fontSize:13, margin:'6px 0 0' }}>
          Fee collections overview — {new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
        </p>
      </div>

      {/* Fee stats */}
      <div className="g-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Total collected" value={fmt(stats.total_collected)} color='#059669' />
        <StatCard label="Pending"         value={fmt(stats.total_pending)}   color='#d97706' />
        <StatCard label="Overdue"         value={fmt(stats.total_overdue)}   color='#dc2626' />
        <StatCard label="This month"      value={fmt(stats.month_collected)} color='#7c3aed' />
      </div>

      {/* Summary card */}
      <div style={{ background:'white', borderRadius:14, border:'1px solid #f0ede8', padding:20, marginBottom:20 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', margin:'0 0 14px' }}>Collection summary</p>
        <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[
            { label:'Total invoices',  value: stats.total_invoices || 0 },
            { label:'Paid invoices',   value: stats.paid_invoices || 0 },
            { label:'Pending invoices',value: stats.pending_invoices || 0 },
            { label:'Overdue invoices',value: stats.overdue_invoices || 0 },
          ].map(r => (
            <div key={r.label} style={{ padding:'12px 16px', background:'#f8f6f1', borderRadius:10 }}>
              <p style={{ fontSize:11, color:'#9ca3af', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{r.label}</p>
              <p style={{ fontSize:20, fontWeight:700, color:'#1a1814', margin:0, fontFamily:'Georgia,serif' }}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <QuickAction icon="◎" label="Manage fees"       onClick={() => navigate('/fees')}     color='#7c3aed' />
        <QuickAction icon="◇" label="View analytics"    onClick={() => navigate('/analytics')} color='#7c3aed' />
      </div>
    </div>
  )
}

// ── RECEPTIONIST DASHBOARD ─────────────────────────────────────────────────────
function ReceptionistDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({})

  useEffect(() => {
    Promise.allSettled([
      api.get('/leads/stats'),
      api.get('/leads?limit=8&sort=latest'),
    ]).then(([statsRes, leadsRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {})
      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value.data?.leads || [])
    })
  }, [])

  return (
    <div className="page">
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:700, color:'#1a1814', margin:0 }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color:'#9ca3af', fontSize:13, margin:'6px 0 0' }}>Today's enquiries and admissions</p>
      </div>

      {/* Stats */}
      <div className="g-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Total enquiries" value={stats.total || 0}        />
        <StatCard label="Today's leads"   value={stats.today || 0}  color='#0891b2' />
        <StatCard label="Hot leads"       value={stats.hot || 0}    color='#dc2626' />
      </div>

      <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>
        {/* Recent leads */}
        <TodaySection
          title="Recent enquiries"
          emptyMsg="No enquiries today"
          items={leads.map(l => ({
            avatar: l.name?.[0] || 'L',
            title: l.name,
            sub: `${l.phone} · ${l.grade_interest} · ${l.source || 'Walk-in'}`,
            badge: l.status,
            badgeBg: l.status === 'Hot' ? '#fef2f2' : l.status === 'Warm' ? '#fffbeb' : '#f3f4f6',
            badgeColor: l.status === 'Hot' ? '#dc2626' : l.status === 'Warm' ? '#d97706' : '#6b7280',
          }))}
        />

        {/* Quick actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', margin:'0 0 8px' }}>Quick actions</p>
          <QuickAction icon="◈" label="New enquiry"      onClick={() => navigate('/leads/new')} color='#0891b2' />
          <QuickAction icon="◈" label="All leads"        onClick={() => navigate('/leads')}     />
          <QuickAction icon="✦" label="Admissions"       onClick={() => navigate('/admissions')} />
        </div>
      </div>
    </div>
  )
}

// ── TRANSPORT MANAGER DASHBOARD ────────────────────────────────────────────────
function TransportManagerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [buses, setBuses] = useState([])
  const [attendance, setAttendance] = useState([])

  useEffect(() => {
    Promise.allSettled([
      api.get('/transport/buses'),
      api.get('/transport/attendance'),
    ]).then(([busRes, attRes]) => {
      if (busRes.status === 'fulfilled') setBuses(busRes.value.data || [])
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.data?.records || [])
    })
  }, [])

  const activeBuses = buses.filter(b => b.status === 'Active').length
  const pickups = attendance.filter(a => a.trip_type === 'Pickup').length
  const drops   = attendance.filter(a => a.trip_type === 'Drop').length

  return (
    <div className="page">
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:700, color:'#1a1814', margin:0 }}>
          Good morning, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p style={{ color:'#9ca3af', fontSize:13, margin:'6px 0 0' }}>Transport overview for today</p>
      </div>

      {/* Stats */}
      <div className="g-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Total buses"    value={buses.length}  />
        <StatCard label="Active buses"   value={activeBuses}   color='#059669' />
        <StatCard label="Pickups today"  value={pickups}       color='#2563eb' />
        <StatCard label="Drops today"    value={drops}         color='#d97706' />
      </div>

      <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>
        {/* Bus status */}
        <TodaySection
          title="Bus fleet status"
          emptyMsg="No buses added yet"
          items={buses.map(b => ({
            avatar: '🚌',
            title: b.bus_number,
            sub: `${b.plate_number || 'No plate'} · ${b.driver_name || 'No driver'} · Capacity: ${b.capacity}`,
            badge: b.status,
            badgeBg: b.status === 'Active' ? '#f0fdf4' : '#f3f4f6',
            badgeColor: b.status === 'Active' ? '#059669' : '#6b7280',
          }))}
        />

        {/* Quick actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', margin:'0 0 8px' }}>Quick actions</p>
          <QuickAction icon="🚌" label="Manage transport"      onClick={() => navigate('/transport')} color='#d97706' />
          <QuickAction icon="📱" label="Scan student QR"       onClick={() => navigate('/transport')} />
          <QuickAction icon="📍" label="View routes"           onClick={() => navigate('/transport')} />
        </div>
      </div>

      {/* Attendance log */}
      {attendance.length > 0 && (
        <div style={{ marginTop:16 }}>
          <TodaySection
            title={`Today's scan log (${attendance.length} scans)`}
            emptyMsg="No scans today"
            items={attendance.slice(0,8).map(a => ({
              avatar: a.trip_type === 'Pickup' ? '⬆' : '⬇',
              title: a.student_name,
              sub: `${a.class} · ${a.bus_number} · ${new Date(a.scanned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`,
              badge: a.trip_type,
              badgeBg: a.trip_type === 'Pickup' ? '#f0fdf4' : '#fffbeb',
              badgeColor: a.trip_type === 'Pickup' ? '#059669' : '#d97706',
            }))}
          />
        </div>
      )}
    </div>
  )
}

// ── Main RoleDashboard component ───────────────────────────────────────────────
export default function RoleDashboard() {
  const { user } = useAuth()
  const role = user?.role || 'staff'

  const dashboardMap = {
    staff:             <StaffDashboard />,
    teacher:           <TeacherDashboard />,
    accountant:        <AccountantDashboard />,
    receptionist:      <ReceptionistDashboard />,
    transport_manager: <TransportManagerDashboard />,
  }

  return (
    <Layout>
      {dashboardMap[role] || <StaffDashboard />}
    </Layout>
  )
}