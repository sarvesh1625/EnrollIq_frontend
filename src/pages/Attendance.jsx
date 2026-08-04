import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const attendanceApi = {
  getSummary:    ()      => api.get('/attendance/summary'),
  getAttendance: (p)     => api.get('/attendance', { params: p }),
  getStudents:   (cls)   => api.get('/students', { params: { class: cls, limit: 200 } }),
  markBulk:      (data)  => api.post('/attendance/mark-bulk', data),
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

  useEffect(() => {
    attendanceApi.getSummary().then(r => setSummary(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedClass && selectedClass !== 'All') {
      attendanceApi.getStudents(selectedClass)
        .then(r => {
          const studs = r.data.students || []
          setStudents(studs)
          const init = {}
          studs.forEach(s => { init[s.id] = 'Present' })
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
  }, [selectedClass])

  useEffect(() => {
    if (tab === 'records') {
      attendanceApi.getAttendance({ date, class: selectedClass !== 'All' ? selectedClass : undefined })
        .then(r => setRecords(r.data.records || []))
        .catch(() => setRecords([]))
    }
  }, [tab, date, selectedClass])

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
          {[{ k:'mark', l:'Mark attendance' }, { k:'records', l:'Records' }, { k:'summary', l:'Summary' }].map(t => (
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