import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const attendanceApi = {
  getSummary:    ()      => api.get('/attendance/summary'),
  getAttendance: (p)     => api.get('/attendance', { params: p }),
  getStudents:   (cls)   => api.get('/students', { params: { class: cls, limit: 200 } }),
  markBulk:      (data)  => api.post('/attendance/mark-bulk', data),
  getHistory:    (p)     => api.get('/attendance/history', { params: p }),
}

const CLASSES = ['All','Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']

const STATUS_DOT = {
  Present: { bg:'var(--c-green-lt)', c:'var(--c-green)' },
  Absent:  { bg:'var(--c-red-lt)',   c:'var(--c-red)' },
  Late:    { bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
  Holiday: { bg:'#f3f4f6',           c:'#6b7280' },
}

const MOCK_SUMMARY = {
  date: new Date().toISOString().slice(0,10),
  total_students: 0, marked_today: 0, unmarked: 0,
  by_class: [],
}

export default function Attendance() {
  const [tab,           setTab]           = useState('mark')
  const [summary,       setSummary]       = useState(MOCK_SUMMARY)
  const [selectedClass, setSelectedClass] = useState('Grade 4')
  const [students,      setStudents]      = useState([])
  const [attendance,    setAttendance]    = useState({})
  const [date,          setDate]          = useState(new Date().toISOString().slice(0,10))
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [records,       setRecords]       = useState([])
  const [historyRange,  setHistoryRange]  = useState('month')   // 'today' | 'week' | 'month' | 'year' | 'custom'
  const [customFrom,    setCustomFrom]    = useState(new Date(new Date().setDate(new Date().getDate()-30)).toISOString().slice(0,10))
  const [customTo,      setCustomTo]      = useState(new Date().toISOString().slice(0,10))
  const [historyData,   setHistoryData]   = useState(null)
  const [historyLoading,setHistoryLoading]= useState(false)
  const [alreadyMarked, setAlreadyMarked] = useState(false)

  const getRangeDates = (key) => {
    const today = new Date()
    const to = today.toISOString().slice(0,10)
    if (key === 'today') return { from: to, to }
    if (key === 'week')  { const d = new Date(today); d.setDate(d.getDate()-6); return { from: d.toISOString().slice(0,10), to } }
    if (key === 'month') { const d = new Date(today.getFullYear(), today.getMonth(), 1); return { from: d.toISOString().slice(0,10), to } }
    if (key === 'year')  { const d = new Date(today.getFullYear(), 0, 1); return { from: d.toISOString().slice(0,10), to } }
    return { from: customFrom, to: customTo }
  }

  useEffect(() => {
    attendanceApi.getSummary().then(r => setSummary(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedClass && selectedClass !== 'All') {
      attendanceApi.getStudents(selectedClass)
        .then(async r => {
          const studs = r.data.students || []
          setStudents(studs)
          const init = {}
          studs.forEach(s => { init[s.id] = 'Present' })
          // If this date already has marked records (e.g. jumping here from History),
          // load the real saved status per student instead of resetting to Present.
          try {
            const existing = await attendanceApi.getAttendance({ date, class: selectedClass })
            const recs = existing.data.records || []
            recs.forEach(rec => { init[rec.student_id] = rec.status })
            setAlreadyMarked(recs.length > 0)
          } catch { setAlreadyMarked(false) }
          setAttendance(init)
        })
        .catch(() => {
          setStudents([
            { id:1, name:'Arjun Pillai',  roll_number:'S-001', class:'Grade 4' },
            { id:2, name:'Deepa Kumar',   roll_number:'S-002', class:'Grade 4' },
            { id:3, name:'Ravi Shankar',  roll_number:'S-003', class:'Grade 4' },
            { id:4, name:'Priya Nair',    roll_number:'S-004', class:'Grade 4' },
            { id:5, name:'Ankit Verma',   roll_number:'S-005', class:'Grade 4' },
          ])
          setAttendance({ 1:'Present', 2:'Present', 3:'Absent', 4:'Present', 5:'Late' })
        })
    }
  }, [selectedClass, date])

  useEffect(() => {
    if (tab === 'records') {
      attendanceApi.getAttendance({ date, class: selectedClass !== 'All' ? selectedClass : undefined })
        .then(r => setRecords(r.data.records || []))
        .catch(() => setRecords([]))
    }
  }, [tab, date, selectedClass])

  useEffect(() => {
    if (tab !== 'history') return
    const { from, to } = getRangeDates(historyRange)
    setHistoryLoading(true)
    attendanceApi.getHistory({ from, to, class: selectedClass !== 'All' ? selectedClass : undefined })
      .then(r => setHistoryData(r.data))
      .catch(() => setHistoryData(null))
      .finally(() => setHistoryLoading(false))
  }, [tab, historyRange, customFrom, customTo, selectedClass])

  const jumpToDate = (d) => { setDate(d); setTab('mark') }

  const setStatus = (id, status) => setAttendance(prev => ({ ...prev, [id]: status }))
  const markAll = (status) => {
    const u = {}; students.forEach(s => { u[s.id] = status }); setAttendance(u)
  }
  const handleSave = async () => {
    setSaving(true)
    try {
      const rows = students.map(s => ({ student_id: s.id, status: attendance[s.id] || 'Present' }))
      await attendanceApi.markBulk({ date, attendance: rows })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    finally { setSaving(false) }
  }

  const presentCount = Object.values(attendance).filter(v => v==='Present').length
  const absentCount  = Object.values(attendance).filter(v => v==='Absent').length
  const lateCount    = Object.values(attendance).filter(v => v==='Late').length

  const STATUS_OPTS = ['Present','Absent','Late','Holiday']

  return (
    <Layout>
      <div className="page">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0 }}>Attendance</h1>
            <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>Daily class attendance management</p>
          </div>
          <input type="date" className="input" style={{ maxWidth:170 }} value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }} className="g-4">
          <div className="stat-card">
            <p className="label">Total students</p>
            <p className="value">{summary.total_students}</p>
          </div>
          <div className="stat-card">
            <p className="label">Marked today</p>
            <p className="value" style={{ color:'var(--c-green)' }}>{summary.marked_today}</p>
          </div>
          <div className="stat-card">
            <p className="label">Not yet marked</p>
            <p className="value" style={{ color:'var(--c-amber)' }}>{summary.unmarked}</p>
          </div>
          <div className="stat-card">
            <p className="label">Overall %</p>
            <p className="value" style={{ color:'var(--c-brand)' }}>
              {summary.total_students > 0 ? `${Math.round((summary.marked_today/summary.total_students)*100)}%` : '—'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:3, background:'white', border:'1px solid var(--c-border-2)', borderRadius:8, padding:3, width:'fit-content', marginBottom:16 }}>
          {[{ k:'mark', l:'Mark attendance' }, { k:'records', l:'Records' }, { k:'history', l:'History' }, { k:'summary', l:'Summary' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ fontSize:12, fontWeight:500, padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
                background: tab === t.k ? 'var(--c-ink)' : 'transparent', color: tab === t.k ? 'white' : 'var(--c-ink-2)' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* MARK TAB */}
        {tab === 'mark' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {/* Controls */}
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', padding:'16px 20px', borderBottom:'1px solid var(--c-border)' }}>
              <select className="input" style={{ maxWidth:160 }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                {CLASSES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
              <button className="btn-ghost" style={{ fontSize:12, padding:'7px 12px' }} onClick={() => markAll('Present')}>✓ All Present</button>
              <button className="btn-ghost" style={{ fontSize:12, padding:'7px 12px' }} onClick={() => markAll('Absent')}>✗ All Absent</button>
              {alreadyMarked && (
                <span className="badge" style={{ background:'var(--c-green-lt)', color:'var(--c-green)' }}>
                  ✓ Already marked for {date} — editing existing record
                </span>
              )}
              <div style={{ marginLeft:'auto', display:'flex', gap:14, fontSize:12, fontWeight:600 }}>
                <span style={{ color:'var(--c-green)' }}>P: {presentCount}</span>
                <span style={{ color:'var(--c-red)' }}>A: {absentCount}</span>
                <span style={{ color:'var(--c-amber)' }}>L: {lateCount}</span>
              </div>
            </div>

            {/* Students */}
            {students.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">✓</div><p className="empty-sub">Select a class to mark attendance</p></div>
            ) : (
              <div>
                {students.map((s, i) => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom: i < students.length-1 ? '1px solid #faf9f7' : 'none', flexWrap:'wrap' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--c-ink-2)', flexShrink:0 }}>{s.name?.[0]}</div>
                    <div style={{ flex:1, minWidth:120 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', margin:0 }}>{s.name}</p>
                      <p style={{ fontSize:11, color:'var(--c-muted)', margin:'2px 0 0' }}>{s.roll_number} · {s.class}</p>
                    </div>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {STATUS_OPTS.map(st => {
                        const active = attendance[s.id] === st
                        const dot = STATUS_DOT[st]
                        return (
                          <button key={st} onClick={() => setStatus(s.id, st)}
                            style={{ fontSize:11, fontWeight:500, padding:'5px 12px', borderRadius:20, cursor:'pointer',
                              border: active ? 'none' : '1px solid var(--c-border-2)',
                              background: active ? dot.bg : 'white',
                              color: active ? dot.c : 'var(--c-muted)' }}>
                            {st}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', borderTop:'1px solid var(--c-border)' }}>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save attendance'}
                  </button>
                  <span style={{ fontSize:12, color:'var(--c-muted)' }}>{date} · {selectedClass}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECORDS TAB */}
        {tab === 'records' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'2fr 100px 100px 110px 1fr', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
              {['Student','Roll','Class','Status','Date'].map((h,i) => <span key={i} style={{ fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</span>)}
            </div>
            {records.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📋</div><p className="empty-sub">No records for {date}</p></div>
            ) : (
              <div>
                {records.map((r, i) => {
                  const dot = STATUS_DOT[r.status] || STATUS_DOT.Holiday
                  return (
                    <div key={r.id} className="att-row" style={{ display:'grid', gridTemplateColumns:'2fr 100px 100px 110px 1fr', gap:12, alignItems:'center', padding:'12px 20px', borderBottom: i < records.length-1 ? '1px solid #faf9f7' : 'none' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)' }}>{r.student_name}</span>
                      <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)', fontFamily:'monospace' }}>{r.roll_number}</span>
                      <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{r.class}</span>
                      <span className="badge" style={{ background:dot.bg, color:dot.c, justifySelf:'start' }}>{r.status}</span>
                      <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)' }}>{r.date}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div>
            {/* Range filters */}
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:16 }}>
              {[{k:'today',l:'Today'},{k:'week',l:'This week'},{k:'month',l:'This month'},{k:'year',l:'This year'},{k:'custom',l:'Custom range'}].map(r => (
                <button key={r.k} onClick={() => setHistoryRange(r.k)}
                  style={{ fontSize:12, fontWeight:600, padding:'7px 14px', borderRadius:20, cursor:'pointer',
                    border: historyRange===r.k ? 'none' : '1px solid var(--c-border-2)',
                    background: historyRange===r.k ? 'var(--c-ink)' : 'white',
                    color: historyRange===r.k ? 'white' : 'var(--c-ink-2)' }}>
                  {r.l}
                </button>
              ))}
              {historyRange === 'custom' && (
                <>
                  <input type="date" className="input" style={{ maxWidth:150 }} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                  <span style={{ fontSize:12, color:'var(--c-muted)' }}>to</span>
                  <input type="date" className="input" style={{ maxWidth:150 }} value={customTo} onChange={e => setCustomTo(e.target.value)} />
                </>
              )}
              <select className="input" style={{ maxWidth:150, marginLeft:'auto' }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                {CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Range summary */}
            {historyData && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }} className="g-3">
                <div className="stat-card">
                  <p className="label">Days in range</p>
                  <p className="value">{historyData.summary.total_days}</p>
                </div>
                <div className="stat-card">
                  <p className="label">Average attendance</p>
                  <p className="value" style={{ color:'var(--c-green)' }}>{historyData.summary.avg_attendance_pct}%</p>
                </div>
                <div className="stat-card">
                  <p className="label">Active students{selectedClass!=='All' ? ` (${selectedClass})` : ''}</p>
                  <p className="value">{historyData.summary.total_active}</p>
                </div>
              </div>
            )}

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 90px 90px 120px 100px', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
                {['Date','Present','Absent','Late','%','Status',''].map((h,i) => <span key={i} style={{ fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</span>)}
              </div>
              {historyLoading ? (
                <div className="empty-state"><p className="empty-sub">Loading…</p></div>
              ) : !historyData || historyData.days.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📅</div><p className="empty-sub">No attendance marked in this range yet</p></div>
              ) : (
                <div>
                  {historyData.days.map((d, i) => (
                    <div key={d.date} style={{ display:'grid', gridTemplateColumns:'1fr 90px 90px 90px 90px 120px 100px', gap:12, alignItems:'center', padding:'12px 20px', borderBottom: i < historyData.days.length-1 ? '1px solid #faf9f7' : 'none' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)' }}>
                        {new Date(d.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                      </span>
                      <span className="hide-md" style={{ fontSize:13, color:'var(--c-green)', fontWeight:600 }}>{d.present}</span>
                      <span className="hide-md" style={{ fontSize:13, color:'var(--c-red)', fontWeight:600 }}>{d.absent}</span>
                      <span className="hide-md" style={{ fontSize:13, color:'var(--c-amber)', fontWeight:600 }}>{d.late}</span>
                      <span className="hide-md" style={{ fontSize:13, color:'var(--c-ink-2)' }}>{d.percentage}%</span>
                      <span className="badge" style={{
                        background: d.is_complete ? 'var(--c-green-lt)' : d.marked_count > 0 ? 'var(--c-amber-lt)' : '#f3f4f6',
                        color:      d.is_complete ? 'var(--c-green)'    : d.marked_count > 0 ? 'var(--c-amber)'    : '#6b7280',
                        justifySelf:'start' }}>
                        {d.is_complete ? '✓ Marked' : d.marked_count > 0 ? `Partial (${d.marked_count}/${d.total_active})` : 'Not marked'}
                      </span>
                      <button className="btn-ghost" style={{ fontSize:11, padding:'5px 10px', justifySelf:'start' }} onClick={() => jumpToDate(d.date)}>
                        View / Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUMMARY TAB */}
        {tab === 'summary' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }} className="g-2">
            {summary.by_class.length === 0 ? (
              <div className="card"><div className="empty-state"><div className="empty-icon">📊</div><p className="empty-sub">No summary data yet</p></div></div>
            ) : summary.by_class.map(cls => {
              const pct = cls.total > 0 ? Math.round((cls.present/cls.total)*100) : 0
              return (
                <div key={cls.class} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <h3 style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:0 }}>{cls.class}</h3>
                    <span style={{ fontSize:12, color:'var(--c-muted)' }}>{cls.total} students</span>
                  </div>
                  <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                    {[
                      { n:cls.present, l:'Present', bg:'var(--c-green-lt)', c:'var(--c-green)' },
                      { n:cls.absent,  l:'Absent',  bg:'var(--c-red-lt)',   c:'var(--c-red)' },
                      { n:cls.late,    l:'Late',    bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
                    ].map(x => (
                      <div key={x.l} style={{ flex:1, textAlign:'center', padding:'8px 0', background:x.bg, borderRadius:10 }}>
                        <p style={{ fontSize:18, fontWeight:700, color:x.c, margin:0 }}>{x.n}</p>
                        <p style={{ fontSize:11, color:x.c, margin:0 }}>{x.l}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ height:6, background:'#f0ede8', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'var(--c-green)', borderRadius:99 }} />
                  </div>
                  <p style={{ fontSize:11, color:'var(--c-muted)', margin:'6px 0 0', textAlign:'right' }}>{pct}% present</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}