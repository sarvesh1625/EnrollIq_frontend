import { useState, useEffect } from 'react'
import api from '../api/axios'

const pApi = {
  login:       (d)       => api.post('/parent/login', d),
  getChildren: (tok)     => api.get('/parent/children',      { headers:{ Authorization:`Bearer ${tok}` } }),
  getStudent:  (id, tok) => api.get(`/parent/student/${id}`, { headers:{ Authorization:`Bearer ${tok}` } }),
  getNotifs:   (tok)     => api.get('/parent/notifications',  { headers:{ Authorization:`Bearer ${tok}` } }),
}

function fmtMoney(n) {
  if (!n || n == 0) return '₹0'
  return `₹${parseFloat(n).toLocaleString('en-IN')}`
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}

const GRADE_COLOR = {
  'A+': '#15803d', 'A': '#16a34a',
  'B+': '#2563eb', 'B': '#3b82f6',
  'C':  '#d97706', 'D': '#ea580c', 'F': '#dc2626',
}
const GRADE_BG = {
  'A+': '#f0fdf4', 'A': '#f0fdf4',
  'B+': '#eff6ff', 'B': '#eff6ff',
  'C':  '#fffbeb', 'D': '#fff7ed', 'F': '#fef2f2',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  card:  { background:'white', borderRadius:16, padding:20, marginBottom:14, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  label: { fontSize:10, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, display:'block' },
  tab:   (active) => ({
    flex:1, padding:'9px 4px', borderRadius:8, border:'none', cursor:'pointer',
    background: active ? '#1a1814' : 'transparent',
    color: active ? 'white' : '#9ca3af',
    fontSize:11, fontWeight:600, textTransform:'capitalize',
  }),
  badge: (status) => {
    const map = {
      Paid:    { bg:'#f0fdf4', color:'#15803d' },
      Overdue: { bg:'#fef2f2', color:'#dc2626' },
      Partial: { bg:'#eff6ff', color:'#2563eb' },
      Pending: { bg:'#fffbeb', color:'#b45309' },
    }
    const s = map[status] || { bg:'#f3f4f6', color:'#6b7280' }
    return { fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:s.bg, color:s.color }
  },
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color='#22c55e', height=6 }) {
  const pct = max > 0 ? Math.min(100, (value/max)*100) : 0
  return (
    <div style={{ height, background:'#f3f4f6', borderRadius:height, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:height, transition:'width 0.4s' }} />
    </div>
  )
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function ParentLogin({ onLogin }) {
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleLogin = async e => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await pApi.login({ phone })
      onLogin(res.data.token, res.data.students, res.data.school_name)
    } catch (err) {
      setError(err.response?.data?.message || 'Phone number not found. Contact your school office.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #f8f6f1 0%, #fdf0e8 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'white', borderRadius:24, padding:36, width:'100%', maxWidth:400, boxShadow:'0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h1 style={{ fontFamily:'serif', fontSize:32, fontWeight:700, color:'#1a1814' }}>
            Enroll<span style={{ color:'#d4521a' }}>IQ</span>
          </h1>
          <div style={{ display:'inline-block', background:'#fdf0ea', borderRadius:20, padding:'4px 14px', marginTop:8 }}>
            <span style={{ fontSize:12, color:'#d4521a', fontWeight:600 }}>Parent Portal</span>
          </div>
        </div>

        <h2 style={{ fontSize:22, fontWeight:700, color:'#1a1814', marginBottom:6 }}>Good morning! 👋</h2>
        <p style={{ fontSize:13, color:'#9ca3af', marginBottom:28, lineHeight:1.5 }}>
          Enter your registered phone number to view your child's academic progress, fees, attendance and more.
        </p>

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#dc2626', lineHeight:1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={S.label}>Phone number</label>
          <div style={{ position:'relative', marginBottom:20 }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'#9ca3af' }}>📞</span>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
              placeholder="10-digit mobile number" required
              style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:12, padding:'13px 14px 13px 40px', fontSize:15, outline:'none', boxSizing:'border-box',
                borderColor: phone.length === 10 ? '#d4521a' : '#e5e7eb' }} />
          </div>
          <button type="submit" disabled={loading || phone.length < 10}
            style={{ width:'100%', background: phone.length===10 ? '#1a1814' : '#e5e7eb', color: phone.length===10?'white':'#9ca3af',
              border:'none', borderRadius:12, padding:'14px', fontSize:15, fontWeight:600, cursor: phone.length===10?'pointer':'not-allowed', transition:'all 0.2s' }}>
            {loading ? 'Verifying...' : 'View my child\'s portal →'}
          </button>
        </form>

        <p style={{ fontSize:11, color:'#9ca3af', textAlign:'center', marginTop:20, lineHeight:1.6 }}>
          This is the phone number you gave to the school during admission.
          <br />If you can't login, contact school office.
        </p>
      </div>
    </div>
  )
}

// ── Exam Results Section ──────────────────────────────────────────────────────
function ExamResults({ examResults, reportCards }) {
  const [expanded, setExpanded] = useState(null)

  if (!examResults?.length && !reportCards?.length) {
    return (
      <div style={{ ...S.card, textAlign:'center' }}>
        <p style={{ fontSize:32, marginBottom:10 }}>📝</p>
        <p style={{ fontSize:14, fontWeight:600, color:'#1a1814', marginBottom:6 }}>No exam results yet</p>
        <p style={{ fontSize:12, color:'#9ca3af' }}>Results will appear here once exams are conducted and marks are entered by school</p>
      </div>
    )
  }

  const rcMap = {}
  reportCards?.forEach(rc => { rcMap[rc.exam_id] = rc })

  return (
    <div>
      {/* Overall performance card */}
      {reportCards?.length > 0 && (
        <div style={{ ...S.card, background:'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', color:'white', marginBottom:14 }}>
          <span style={{ fontSize:10, opacity:0.6, fontWeight:700, letterSpacing:'0.08em' }}>BEST RESULT</span>
          {(() => {
            const best = [...reportCards].sort((a,b) => b.percentage - a.percentage)[0]
            return (
              <div style={{ marginTop:8 }}>
                <p style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{best.exam_name}</p>
                <div style={{ display:'flex', gap:16, marginTop:12 }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:32, fontWeight:800, fontFamily:'serif' }}>{Math.round(best.percentage)}%</p>
                    <p style={{ fontSize:11, opacity:0.6 }}>Score</p>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:32, fontWeight:800, fontFamily:'serif', color: GRADE_COLOR[best.grade] || 'white' }}>{best.grade}</p>
                    <p style={{ fontSize:11, opacity:0.6 }}>Grade</p>
                  </div>
                  {best.rank_in_class && (
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:32, fontWeight:800, fontFamily:'serif' }}>#{best.rank_in_class}</p>
                      <p style={{ fontSize:11, opacity:0.6 }}>Rank</p>
                    </div>
                  )}
                </div>
                <ProgressBar value={best.percentage} max={100} color='rgba(255,255,255,0.8)' height={6} />
              </div>
            )
          })()}
        </div>
      )}

      {/* Each exam */}
      {examResults?.map((exam, i) => {
        const rc        = rcMap[exam.exam_id]
        const isOpen    = expanded === exam.exam_id
        const totalPct  = exam.max_total > 0 ? Math.round((exam.total_marks / exam.max_total) * 100) : 0
        const grade     = rc?.grade || (totalPct>=90?'A+':totalPct>=80?'A':totalPct>=70?'B+':totalPct>=60?'B':totalPct>=50?'C':totalPct>=35?'D':'F')
        const EXAM_TYPE_COLOR = { 'Unit Test':'#2563eb', 'Term Exam':'#15803d', 'Half Yearly':'#b45309', 'Annual':'#7c3aed', 'Mock Test':'#6b7280' }

        return (
          <div key={exam.exam_id} style={{ ...S.card, padding:0, overflow:'hidden', cursor:'pointer' }}
            onClick={() => setExpanded(isOpen ? null : exam.exam_id)}>

            {/* Exam header */}
            <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color: EXAM_TYPE_COLOR[exam.exam_type]||'#6b7280',
                    background: GRADE_BG[grade]||'#f3f4f6', padding:'2px 8px', borderRadius:12 }}>
                    {exam.exam_type}
                  </span>
                  {exam.start_date && <span style={{ fontSize:11, color:'#9ca3af' }}>{fmtDate(exam.start_date)}</span>}
                </div>
                <p style={{ fontSize:15, fontWeight:700, color:'#1a1814' }}>{exam.exam_name}</p>
              </div>

              {/* Grade + score badges */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22, fontWeight:800, fontFamily:'serif', color: GRADE_COLOR[grade]||'#6b7280',
                    background: GRADE_BG[grade]||'#f3f4f6', width:48, height:48, borderRadius:12,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {grade}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:18, fontWeight:700, color:'#1a1814' }}>{Math.round(exam.total_marks)}/{exam.max_total}</p>
                  <p style={{ fontSize:12, color:'#9ca3af' }}>{totalPct}%</p>
                </div>
                <span style={{ fontSize:16, color:'#9ca3af', transform: isOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.2s' }}>▾</span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ padding:'0 20px 12px' }}>
              <ProgressBar value={totalPct} max={100}
                color={totalPct>=75?'#22c55e':totalPct>=50?'#f59e0b':'#f87171'} />
            </div>

            {/* Subject breakdown (expanded) */}
            {isOpen && (
              <div style={{ borderTop:'1px solid #f3f4f6', padding:'16px 20px' }}>
                <span style={S.label}>Subject-wise marks</span>

                {exam.subjects.map((sub, j) => {
                  const subPct = sub.max_marks > 0 ? Math.round((sub.marks / sub.max_marks) * 100) : 0
                  return (
                    <div key={j} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background: GRADE_BG[sub.grade]||'#f3f4f6',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:13, fontWeight:800, color: GRADE_COLOR[sub.grade]||'#6b7280' }}>
                            {sub.grade}
                          </div>
                          <span style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>{sub.name}</span>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'#1a1814' }}>
                            {sub.marks}/{sub.max_marks}
                          </span>
                          <span style={{ fontSize:11, color:'#9ca3af', marginLeft:6 }}>{subPct}%</span>
                        </div>
                      </div>
                      <ProgressBar value={subPct} max={100}
                        color={subPct>=75?'#22c55e':subPct>=50?'#f59e0b':'#f87171'} height={5} />
                    </div>
                  )
                })}

                {/* Rank from report card */}
                {rc && (
                  <div style={{ background:'#f8f6f1', borderRadius:12, padding:'12px 16px', marginTop:8, display:'flex', gap:16 }}>
                    {rc.rank_in_class && (
                      <div style={{ textAlign:'center' }}>
                        <p style={{ fontSize:22, fontWeight:800, color:'#1a1814', fontFamily:'serif' }}>#{rc.rank_in_class}</p>
                        <p style={{ fontSize:11, color:'#9ca3af' }}>Class rank</p>
                      </div>
                    )}
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:22, fontWeight:800, color:'#1a1814', fontFamily:'serif' }}>{Math.round(rc.attendance_pct)}%</p>
                      <p style={{ fontSize:11, color:'#9ca3af' }}>Attendance</p>
                    </div>
                    {rc.remarks && (
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:11, color:'#9ca3af', marginBottom:2 }}>Teacher's remark</p>
                        <p style={{ fontSize:13, color:'#1a1814', fontStyle:'italic' }}>"{rc.remarks}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function ParentDashboard({ token, children, schoolName, onLogout }) {
  const [selected, setSelected]  = useState(children[0])
  const [data,     setData]      = useState(null)
  const [notifs,   setNotifs]    = useState([])
  const [tab,      setTab]       = useState('overview')
  const [loading,  setLoading]   = useState(true)

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    Promise.allSettled([
      pApi.getStudent(selected.id, token),
      pApi.getNotifs(token),
    ]).then(([dr, nr]) => {
      if (dr.status === 'fulfilled') setData(dr.value.data)
      if (nr.status === 'fulfilled') setNotifs(nr.value.data)
    }).finally(() => setLoading(false))
  }, [selected, token])

  const attPct      = data?.attendance_stats?.percentage || 0
  const totalFees   = (data?.payments||[]).reduce((s,p) => s + parseFloat(p.amount||0), 0)
  const paidFees    = (data?.payments||[]).reduce((s,p) => s + parseFloat(p.paid_amount||0), 0)
  const pendingFees = totalFees - paidFees
  const overdueList = (data?.payments||[]).filter(p => p.status === 'Overdue')
  const todayPickup = (data?.today_scans||[]).find(s => s.trip_type === 'Pickup')
  const todayDrop   = (data?.today_scans||[]).find(s => s.trip_type === 'Drop')
  const latestRC    = (data?.report_cards||[])[0]

  const TABS = ['overview','exams','fees','attendance','transport']

  return (
    <div style={{ minHeight:'100vh', background:'#f8f6f1' }}>
      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #f3f4f6', padding:'14px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:20 }}>
        <h1 style={{ fontFamily:'serif', fontSize:20, fontWeight:700, color:'#1a1814' }}>
          Enroll<span style={{ color:'#d4521a' }}>IQ</span>
        </h1>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:11, color:'#9ca3af' }}>{schoolName}</span>
          <button onClick={onLogout} style={{ fontSize:12, color:'#9ca3af', background:'none', border:'1px solid #e5e7eb', borderRadius:8, padding:'4px 10px', cursor:'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth:500, margin:'0 auto', padding:16 }}>

        {/* Child selector */}
        {children.length > 1 && (
          <div style={{ display:'flex', gap:8, marginBottom:14, overflowX:'auto', paddingBottom:4 }}>
            {children.map(c => (
              <button key={c.id} onClick={() => { setSelected(c); setTab('overview') }}
                style={{ padding:'8px 16px', borderRadius:20, border:'1.5px solid',
                  borderColor: selected?.id===c.id ? '#1a1814' : '#e5e7eb',
                  background:  selected?.id===c.id ? '#1a1814' : 'white',
                  color:       selected?.id===c.id ? 'white' : '#6b7280',
                  fontSize:13, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap' }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Student hero card */}
        <div style={{ background:'linear-gradient(135deg, #1a1814 0%, #3d3830 100%)', borderRadius:20, padding:22, color:'white', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, fontFamily:'serif', flexShrink:0 }}>
              {selected?.name[0]}
            </div>
            <div>
              <p style={{ fontFamily:'serif', fontSize:20, fontWeight:700 }}>{selected?.name}</p>
              <p style={{ fontSize:12, opacity:0.6, marginTop:2 }}>
                {selected?.class}{selected?.section ? `-${selected.section}` : ''} · {selected?.roll_number}
              </p>
            </div>
          </div>

          {/* Quick stat pills */}
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <div style={{ flex:1, background:'rgba(255,255,255,0.10)', borderRadius:12, padding:'10px 14px', textAlign:'center' }}>
              <p style={{ fontSize:18, fontWeight:800, color: attPct>=75?'#86efac':'#fca5a5' }}>{attPct}%</p>
              <p style={{ fontSize:10, opacity:0.6, marginTop:2 }}>Attendance</p>
            </div>
            <div style={{ flex:1, background:'rgba(255,255,255,0.10)', borderRadius:12, padding:'10px 14px', textAlign:'center' }}>
              <p style={{ fontSize:18, fontWeight:800, color: pendingFees>0?'#fcd34d':'#86efac' }}>
                {pendingFees > 0 ? fmtMoney(pendingFees) : '✓ Clear'}
              </p>
              <p style={{ fontSize:10, opacity:0.6, marginTop:2 }}>Fees</p>
            </div>
            {latestRC && (
              <div style={{ flex:1, background:'rgba(255,255,255,0.10)', borderRadius:12, padding:'10px 14px', textAlign:'center' }}>
                <p style={{ fontSize:18, fontWeight:800 }}>{latestRC.grade}</p>
                <p style={{ fontSize:10, opacity:0.6, marginTop:2 }}>Last grade</p>
              </div>
            )}
          </div>

          {/* Today transport */}
          {(todayPickup || todayDrop) && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.15)', display:'flex', gap:10 }}>
              {todayPickup && (
                <div style={{ flex:1, background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'8px 12px' }}>
                  <p style={{ fontSize:10, opacity:0.5, marginBottom:3 }}>PICKED UP AT</p>
                  <p style={{ fontSize:14, fontWeight:700 }}>{fmtTime(todayPickup.scanned_at)}</p>
                  <p style={{ fontSize:11, opacity:0.5 }}>{todayPickup.bus_number}</p>
                </div>
              )}
              {todayDrop && (
                <div style={{ flex:1, background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'8px 12px' }}>
                  <p style={{ fontSize:10, opacity:0.5, marginBottom:3 }}>DROPPED AT</p>
                  <p style={{ fontSize:14, fontWeight:700 }}>{fmtTime(todayDrop.scanned_at)}</p>
                  <p style={{ fontSize:11, opacity:0.5 }}>{todayDrop.bus_number}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'white', borderRadius:14, padding:4, marginBottom:14,
          border:'1px solid #f3f4f6', overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={S.tab(tab===t)}>
              {t === 'overview' ? '🏠' : t === 'exams' ? '📝' : t === 'fees' ? '💰' : t === 'attendance' ? '✓' : '🚌'}
              {' '}{t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:48, color:'#9ca3af' }}>
            <div style={{ width:28, height:28, border:'3px solid #f3f4f6', borderTop:'3px solid #d4521a',
              borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            Loading...
          </div>
        ) : !data ? null : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <>
                {/* Overdue alert */}
                {overdueList.length > 0 && (
                  <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:14, padding:16, marginBottom:14 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:6 }}>⚠️ Fee payment overdue</p>
                    {overdueList.map(p => (
                      <p key={p.id} style={{ fontSize:12, color:'#dc2626', lineHeight:1.6 }}>
                        {p.fee_type}: {fmtMoney(parseFloat(p.amount)-parseFloat(p.paid_amount||0))}
                        {p.due_date && ` — Due ${fmtDate(p.due_date)}`}
                      </p>
                    ))}
                    <p style={{ fontSize:11, color:'#9ca3af', marginTop:8 }}>Contact the school office to make payment</p>
                  </div>
                )}

                {/* Latest exam result */}
                {data.exam_results?.length > 0 && (() => {
                  const latest = data.exam_results[0]
                  const rc = (data.report_cards||[]).find(r => r.exam_id === latest.exam_id)
                  const pct = latest.max_total > 0 ? Math.round((latest.total_marks/latest.max_total)*100) : 0
                  const grade = rc?.grade || (pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=35?'D':'F')
                  return (
                    <div style={S.card} onClick={() => setTab('exams')} role="button">
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                        <div>
                          <span style={S.label}>Latest exam result</span>
                          <p style={{ fontSize:15, fontWeight:700, color:'#1a1814' }}>{latest.exam_name}</p>
                        </div>
                        <div style={{ textAlign:'center', background:GRADE_BG[grade]||'#f3f4f6', borderRadius:12, padding:'8px 14px' }}>
                          <p style={{ fontSize:22, fontWeight:800, color:GRADE_COLOR[grade]||'#6b7280', fontFamily:'serif', lineHeight:1 }}>{grade}</p>
                          <p style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>{pct}%</p>
                        </div>
                      </div>
                      {/* Subject mini bars */}
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {latest.subjects.slice(0,4).map((sub,i) => {
                          const sp = sub.max_marks > 0 ? Math.round((sub.marks/sub.max_marks)*100) : 0
                          return (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <span style={{ fontSize:11, color:'#6b7280', width:80, flexShrink:0 }}>{sub.name}</span>
                              <div style={{ flex:1 }}><ProgressBar value={sp} max={100} color={sp>=75?'#22c55e':sp>=50?'#f59e0b':'#f87171'} height={5} /></div>
                              <span style={{ fontSize:11, fontWeight:700, color:GRADE_COLOR[sub.grade]||'#6b7280', width:24, textAlign:'right' }}>{sub.grade}</span>
                            </div>
                          )
                        })}
                      </div>
                      <p style={{ fontSize:11, color:'#d4521a', marginTop:12 }}>Tap to see all exam results →</p>
                    </div>
                  )
                })()}

                {/* Attendance summary */}
                <div style={S.card} onClick={() => setTab('attendance')} role="button">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <div>
                      <span style={S.label}>Attendance</span>
                      <p style={{ fontSize:24, fontWeight:800, fontFamily:'serif', color: attPct>=75?'#15803d':'#dc2626' }}>{attPct}%</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontSize:13, color:'#6b7280' }}>{data.attendance_stats?.present || 0} present</p>
                      <p style={{ fontSize:12, color:'#9ca3af' }}>of {data.attendance_stats?.total || 0} days</p>
                    </div>
                  </div>
                  <ProgressBar value={attPct} max={100} color={attPct>=75?'#22c55e':'#f87171'} />
                  {attPct < 75 && <p style={{ fontSize:12, color:'#dc2626', marginTop:8 }}>⚠️ Below 75% — please improve attendance</p>}
                </div>

                {/* Recent notifications */}
                {notifs.length > 0 && (
                  <div style={S.card}>
                    <span style={S.label}>Recent notifications</span>
                    {notifs.slice(0,3).map((n,i) => (
                      <div key={i} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom: i<2?'1px solid #f9f9f9':'none' }}>
                        <span style={{ fontSize:20, flexShrink:0 }}>🚌</span>
                        <div>
                          <p style={{ fontSize:12, color:'#1a1814', lineHeight:1.5 }}>{n.message}</p>
                          <p style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>
                            {new Date(n.sent_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── EXAMS ── */}
            {tab === 'exams' && (
              <ExamResults examResults={data.exam_results} reportCards={data.report_cards} />
            )}

            {/* ── FEES ── */}
            {tab === 'fees' && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                  {[
                    { label:'Total billed',  value: fmtMoney(totalFees),   color:'#1a1814' },
                    { label:'Paid',          value: fmtMoney(paidFees),    color:'#15803d' },
                    { label:'Pending',       value: fmtMoney(pendingFees), color: pendingFees>0?'#b45309':'#15803d' },
                    { label:'Overdue',       value: fmtMoney(overdueList.reduce((s,p)=>s+parseFloat(p.amount)-parseFloat(p.paid_amount||0),0)), color:'#dc2626' },
                  ].map(s => (
                    <div key={s.label} style={{ ...S.card, marginBottom:0 }}>
                      <span style={S.label}>{s.label}</span>
                      <p style={{ fontSize:18, fontWeight:800, color:s.color, fontFamily:'serif' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {(data.payments||[]).map((p,i) => (
                  <div key={i} style={{ ...S.card, marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <p style={{ fontSize:14, fontWeight:700, color:'#1a1814' }}>{p.fee_type}</p>
                        {p.due_date && <p style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>Due: {fmtDate(p.due_date)}</p>}
                      </div>
                      <span style={S.badge(p.status)}>{p.status}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:10 }}>
                      <span style={{ color:'#6b7280' }}>Total: <strong style={{ color:'#1a1814' }}>{fmtMoney(p.amount)}</strong></span>
                      <span style={{ color:'#6b7280' }}>Paid: <strong style={{ color:'#15803d' }}>{fmtMoney(p.paid_amount||0)}</strong></span>
                    </div>
                    <ProgressBar value={parseFloat(p.paid_amount||0)} max={parseFloat(p.amount)} color='#22c55e' />
                    {p.payment_mode && <p style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>Mode: {p.payment_mode}{p.reference_no ? ` · Ref: ${p.reference_no}` : ''}</p>}
                  </div>
                ))}
                {!(data.payments||[]).length && (
                  <div style={{ ...S.card, textAlign:'center' }}>
                    <p style={{ fontSize:32, marginBottom:10 }}>💰</p>
                    <p style={{ fontSize:13, color:'#9ca3af' }}>No fee records yet</p>
                  </div>
                )}
              </>
            )}

            {/* ── ATTENDANCE ── */}
            {tab === 'attendance' && (
              <>
                <div style={S.card}>
                  <span style={S.label}>Overall attendance</span>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
                    <p style={{ fontSize:36, fontWeight:800, fontFamily:'serif', color: attPct>=75?'#15803d':'#dc2626' }}>{attPct}%</p>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>{data.attendance_stats?.present} / {data.attendance_stats?.total} days</p>
                      <p style={{ fontSize:11, color:'#9ca3af' }}>Present / Total</p>
                    </div>
                  </div>
                  <ProgressBar value={attPct} max={100} color={attPct>=75?'#22c55e':'#f87171'} height={8} />
                  {attPct < 75
                    ? <p style={{ fontSize:12, color:'#dc2626', marginTop:10, padding:'8px 12px', background:'#fef2f2', borderRadius:8 }}>
                        ⚠️ Attendance below 75%. Regular attendance is mandatory. Please contact school if there are issues.
                      </p>
                    : <p style={{ fontSize:12, color:'#15803d', marginTop:10 }}>✓ Good attendance! Keep it up.</p>}
                </div>
                <div style={S.card}>
                  <span style={S.label}>This month</span>
                  {(data.attendance||[]).length === 0 ? (
                    <p style={{ fontSize:13, color:'#9ca3af', textAlign:'center', padding:20 }}>No records this month</p>
                  ) : (data.attendance||[]).map((r,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'9px 0', borderBottom: i<data.attendance.length-1?'1px solid #f9f9f9':'none' }}>
                      <p style={{ fontSize:13, color:'#1a1814' }}>
                        {new Date(r.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
                      </p>
                      <span style={S.badge(r.status === 'Present' ? 'Paid' : r.status === 'Late' ? 'Partial' : 'Overdue')}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── TRANSPORT ── */}
            {tab === 'transport' && (
              <>
                {data.transport ? (
                  <>
                    <div style={{ background:'linear-gradient(135deg, #1e3a5f, #2563eb)', borderRadius:20, padding:22, color:'white', marginBottom:14 }}>
                      <span style={{ fontSize:10, opacity:0.6, fontWeight:700, letterSpacing:'0.08em' }}>BUS DETAILS</span>
                      <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:10 }}>
                        <span style={{ fontSize:40 }}>🚌</span>
                        <div>
                          <p style={{ fontSize:22, fontWeight:800 }}>{data.transport.bus_number}</p>
                          <p style={{ fontSize:13, opacity:0.6 }}>{data.transport.route_name || 'Route not assigned'}</p>
                        </div>
                      </div>
                      <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.2)' }}>
                        <p style={{ fontSize:10, opacity:0.5, marginBottom:6, fontWeight:700, letterSpacing:'0.08em' }}>QR CODE (for bus scanner)</p>
                        <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 14px', fontFamily:'monospace', fontSize:12, wordBreak:'break-all' }}>
                          {data.transport.qr_code}
                        </div>
                        <p style={{ fontSize:10, opacity:0.4, marginTop:6 }}>Show this to the driver or scan at bus entry</p>
                      </div>
                    </div>
                    <div style={S.card}>
                      <span style={S.label}>Today's activity</span>
                      {(data.today_scans||[]).length === 0 ? (
                        <p style={{ fontSize:13, color:'#9ca3af', textAlign:'center', padding:20 }}>No activity recorded today</p>
                      ) : (data.today_scans||[]).map((s,i) => (
                        <div key={i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom: i<data.today_scans.length-1?'1px solid #f9f9f9':'none' }}>
                          <div style={{ width:40, height:40, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                            background: s.trip_type==='Pickup'?'#f0fdf4':'#fffbeb', fontSize:20, flexShrink:0 }}>
                            {s.trip_type==='Pickup' ? '⬆' : '⬇'}
                          </div>
                          <div>
                            <p style={{ fontSize:14, fontWeight:700, color:'#1a1814' }}>{s.trip_type}</p>
                            <p style={{ fontSize:12, color:'#6b7280' }}>{fmtTime(s.scanned_at)} · {s.bus_number}</p>
                            <p style={{ fontSize:11, color: s.notified?'#15803d':'#9ca3af', marginTop:2 }}>
                              {s.notified ? '📱 You were notified' : '⏳ Notification pending'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ ...S.card, textAlign:'center' }}>
                    <p style={{ fontSize:36, marginBottom:12 }}>🚌</p>
                    <p style={{ fontSize:14, fontWeight:700, color:'#1a1814', marginBottom:6 }}>Not enrolled in transport</p>
                    <p style={{ fontSize:12, color:'#9ca3af' }}>Contact school to enroll in bus service</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Entry Point ───────────────────────────────────────────────────────────────
export default function ParentPortal() {
  const [token,      setToken]      = useState(() => localStorage.getItem('parent_token'))
  const [children,   setChildren]   = useState(() => { try { return JSON.parse(localStorage.getItem('parent_children') || '[]') } catch { return [] } })
  const [schoolName, setSchoolName] = useState(() => localStorage.getItem('parent_school') || '')

  const handleLogin = (tok, kids, school) => {
    setToken(tok); setChildren(kids); setSchoolName(school)
    localStorage.setItem('parent_token',    tok)
    localStorage.setItem('parent_children', JSON.stringify(kids))
    localStorage.setItem('parent_school',   school)
  }

  const handleLogout = () => {
    setToken(null); setChildren([])
    localStorage.removeItem('parent_token')
    localStorage.removeItem('parent_children')
    localStorage.removeItem('parent_school')
  }

  if (!token || !children.length) return <ParentLogin onLogin={handleLogin} />
  return <ParentDashboard token={token} children={children} schoolName={schoolName} onLogout={handleLogout} />
}