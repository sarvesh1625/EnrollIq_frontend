import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AIScoreBadge from '../components/AIScoreBadge'
import { getLeadStats, getLeads } from '../api/leads'
import { getAdmissionStats } from '../api/admissions'
import { getFeeStats } from '../api/fees'
import { getNotifications } from '../api/communication'
import { useAuth } from '../context/AuthContext'

const MOCK_STATS  = { today_leads:0, hot_leads:0, visits_booked:0, admissions:0, total_leads:0, conversion_rate:0 }
const MOCK_FEE    = { total_collected:0, total_pending:0, total_overdue:0 }

function fmtRupee(n) {
  if (!n || n === 0) return '₹0'
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n/1000).toFixed(0)}K`
  return `₹${n}`
}
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 3600)  return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const STATUS_STYLE = {
  New:            { bg:'#f3f4f6', c:'#6b7280' },
  Contacted:      { bg:'var(--c-blue-lt)', c:'var(--c-blue)' },
  'Campus Visit': { bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
  Admission:      { bg:'var(--c-green-lt)', c:'var(--c-green)' },
  Lost:           { bg:'var(--c-red-lt)', c:'var(--c-red)' },
}
const NOTIF_ICON = {
  lead_alert:       { bg:'#fff1ea', c:'#d4521a', s:'⚡' },
  fee_reminder:     { bg:'var(--c-amber-lt)', c:'var(--c-amber)', s:'₹' },
  admission_update: { bg:'var(--c-green-lt)', c:'var(--c-green)', s:'✓' },
  system:           { bg:'#f3f4f6', c:'#6b7280', s:'ℹ' },
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  const [stats,    setStats]    = useState(MOCK_STATS)
  const [feeStats, setFeeStats] = useState(MOCK_FEE)
  const [recent,   setRecent]   = useState([])
  const [notifs,   setNotifs]   = useState([])
  const [pipeline, setPipeline] = useState([
    { label:'New',          count:0, color:'#9ca3af' },
    { label:'Contacted',    count:0, color:'#60a5fa' },
    { label:'Visit',        count:0, color:'#fbbf24' },
    { label:'Admission',    count:0, color:'#22c55e' },
    { label:'Lost',         count:0, color:'#f87171' },
  ])
  const [loading,   setLoading]   = useState(true)
  const [apiOnline, setApiOnline] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      const r = await Promise.allSettled([
        getLeadStats(), getFeeStats(), getLeads({ limit:5 }), getNotifications(), getAdmissionStats(),
      ])
      let ok = false
      if (r[0].status === 'fulfilled') {
        const ls = r[0].value.data; setStats(ls); ok = true
        setPipeline([
          { label:'New',       count: ls.today_leads || 0,                          color:'#9ca3af' },
          { label:'Contacted', count: Math.round((ls.total_leads||0)*0.25) || 0,   color:'#60a5fa' },
          { label:'Visit',     count: ls.visits_booked || 0,                        color:'#fbbf24' },
          { label:'Admission', count: ls.admissions || 0,                           color:'#22c55e' },
          { label:'Lost',      count: Math.round((ls.total_leads||0)*0.08) || 0,    color:'#f87171' },
        ])
      }
      if (r[1].status === 'fulfilled') setFeeStats(r[1].value.data)
      if (r[2].status === 'fulfilled') { const l = r[2].value.data.leads || []; if (l.length) setRecent(l) }
      if (r[3].status === 'fulfilled') { const n = r[3].value.data.notifications || []; if (n.length) setNotifs(n) }
      setApiOnline(ok)
    } catch { setApiOnline(false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadAll()
    const i = setInterval(loadAll, 120000)
    return () => clearInterval(i)
  }, [loadAll])

  const unread = notifs.filter(n => !n.is_read).length
  const pMax   = Math.max(...pipeline.map(p => p.count), 1)
  const collPct = feeStats.total_collected
    ? Math.round((feeStats.total_collected / (feeStats.total_collected + feeStats.total_pending + feeStats.total_overdue)) * 100)
    : 0

  return (
    <Layout>
      <div className="page">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0, lineHeight:1.2 }}>
              {greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>{today}</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span className={`badge ${apiOnline ? 'badge-green' : 'badge-gray'}`}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: apiOnline ? 'var(--c-green)' : '#9ca3af', marginRight:6, display:'inline-block' }} />
              {apiOnline ? 'Live' : 'Demo'}
            </span>
            <button className="btn-primary" onClick={() => navigate('/leads/new')}>+ Add lead</button>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }} className="g-4">
          {[
            { label:"Today's leads", value: loading ? '—' : stats.today_leads,   sub:'Since 12 AM',   accent:true },
            { label:'Hot leads',     value: loading ? '—' : stats.hot_leads,     sub:'Needs callback' },
            { label:'Visits booked', value: loading ? '—' : stats.visits_booked, sub:'This week' },
            { label:'Admissions',    value: loading ? '—' : stats.admissions,    sub:'This month' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="label">{s.label}</p>
              <p className="value" style={{ color: s.accent ? 'var(--c-brand)' : 'var(--c-ink)', fontSize:32 }}>{s.value}</p>
              <p className="sublabel">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Pipeline + Fee */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }} className="g-2">

          {/* Pipeline */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <h2 style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:0 }}>Pipeline overview</h2>
              <button onClick={() => navigate('/pipeline')} style={{ fontSize:12, color:'var(--c-brand)', background:'none', border:'none', cursor:'pointer' }}>View all →</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {pipeline.map(p => (
                <div key={p.label}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, color:'var(--c-ink-2)' }}>{p.label}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:'var(--c-ink)' }}>{p.count}</span>
                  </div>
                  <div style={{ height:6, background:'#f0ede8', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(p.count/pMax)*100}%`, background:p.color, borderRadius:99, transition:'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:18, paddingTop:16, borderTop:'1px solid var(--c-border)', display:'flex', alignItems:'center', gap:14 }}>
              <div>
                <p style={{ fontSize:11, color:'var(--c-muted)', margin:0 }}>Total leads</p>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--c-ink)', margin:'2px 0 0' }}>{(stats.total_leads||0).toLocaleString()}</p>
              </div>
              <div style={{ flex:1, height:8, background:'#f0ede8', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${stats.conversion_rate||0}%`, background:'var(--c-brand)', borderRadius:99 }} />
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:11, color:'var(--c-muted)', margin:0 }}>Conversion</p>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--c-green)', margin:'2px 0 0' }}>{stats.conversion_rate||0}%</p>
              </div>
            </div>
          </div>

          {/* Fee collection */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:0 }}>Fee collection</h2>
              <button onClick={() => navigate('/fees')} style={{ fontSize:12, color:'var(--c-brand)', background:'none', border:'none', cursor:'pointer' }}>View →</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'Collected', value: fmtRupee(feeStats.total_collected), bg:'var(--c-green-lt)', c:'var(--c-green)' },
                { label:'Pending',   value: fmtRupee(feeStats.total_pending),   bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
                { label:'Overdue',   value: fmtRupee(feeStats.total_overdue),   bg:'var(--c-red-lt)',   c:'var(--c-red)' },
              ].map(f => (
                <div key={f.label} style={{ background:f.bg, borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'var(--c-ink-2)' }}>{f.label}</span>
                  <span style={{ fontSize:15, fontWeight:700, color:f.c }}>{f.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--c-muted)', marginBottom:5 }}>
                <span>Collection rate</span><span>{collPct}%</span>
              </div>
              <div style={{ height:8, background:'#f0ede8', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${collPct}%`, background:'var(--c-green)', borderRadius:99 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent leads + Notifications */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }} className="g-2">

          {/* Recent leads */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--c-border)' }}>
              <h2 style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:0 }}>Recent leads</h2>
              <button onClick={() => navigate('/leads')} style={{ fontSize:12, color:'var(--c-brand)', background:'none', border:'none', cursor:'pointer' }}>View all →</button>
            </div>

            {recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◈</div>
                <p className="empty-title">No leads yet</p>
                <p className="empty-sub">New enquiries will appear here</p>
              </div>
            ) : (
              <div>
                {recent.map((lead, i) => {
                  const st = STATUS_STYLE[lead.status] || STATUS_STYLE.New
                  return (
                    <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', cursor:'pointer', borderBottom: i < recent.length-1 ? '1px solid #faf9f7' : 'none', transition:'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--c-surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--c-ink-2)', flexShrink:0 }}>
                        {lead.parent_name?.[0]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.parent_name}</p>
                        <p style={{ fontSize:11, color:'var(--c-muted)', margin:'2px 0 0' }}>{lead.child_grade} · {lead.lead_source}</p>
                      </div>
                      <div style={{ flexShrink:0 }} className="hide-sm">
                        <AIScoreBadge score={lead.ai_score} label={lead.ai_label} />
                      </div>
                      <span className="badge" style={{ background:st.bg, color:st.c, flexShrink:0 }}>{lead.status}</span>
                      <span style={{ fontSize:11, color:'var(--c-muted)', flexShrink:0, minWidth:28, textAlign:'right' }} className="hide-sm">{timeAgo(lead.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--c-border)' }}>
              <h2 style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:0 }}>
                Notifications
                {unread > 0 && <span style={{ marginLeft:8, fontSize:11, fontWeight:700, color:'white', background:'var(--c-brand)', borderRadius:99, padding:'1px 7px' }}>{unread}</span>}
              </h2>
              <button onClick={() => navigate('/communication')} style={{ fontSize:12, color:'var(--c-brand)', background:'none', border:'none', cursor:'pointer' }}>All →</button>
            </div>
            {notifs.length === 0 ? (
              <div className="empty-state" style={{ padding:'40px 24px' }}>
                <div className="empty-icon" style={{ fontSize:32 }}>🔔</div>
                <p className="empty-sub">No notifications</p>
              </div>
            ) : (
              <div style={{ padding:8 }}>
                {notifs.slice(0,5).map(n => {
                  const ic = NOTIF_ICON[n.type] || NOTIF_ICON.system
                  return (
                    <div key={n.id} style={{ display:'flex', gap:10, padding:'10px 12px', borderRadius:10, background: !n.is_read ? 'var(--c-brand-lt)' : 'transparent' }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:ic.bg, color:ic.c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{ic.s}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:500, color:'var(--c-ink)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</p>
                        <p style={{ fontSize:11, color:'var(--c-muted)', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}