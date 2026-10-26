/**
 * EnrollIQ — Attendance page (v2)
 * Save as:  frontend/src/pages/Attendance.jsx   (replaces the old file)
 *
 * Tabs:  Mark attendance · Report (week / month / year / date-to-date) · Records · Leave requests
 * No fake data anywhere: if something can't be loaded the page says so and offers Retry.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const attendanceApi = {
  getSummary:  ()      => api.get('/attendance/summary'),
  getRecords:  (p)     => api.get('/attendance', { params: p }),
  getRoster:   (p)     => api.get('/attendance/roster', { params: p }),
  markBulk:    (data)  => api.post('/attendance/mark-bulk', data),
  getReport:   (p)     => api.get('/attendance/report', { params: p }),
  getLeaves:   (status)=> api.get('/attendance/leaves', { params: { status } }),
  decideLeave: (id, b) => api.patch(`/attendance/leaves/${id}`, b),
}

const CLASSES = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']
const STATUS_OPTS = ['Present','Absent','Late','Half Day','Leave','Holiday']
const STATUS_DOT = {
  'Present':  { bg:'var(--c-green-lt)', c:'var(--c-green)' },
  'Absent':   { bg:'var(--c-red-lt)',   c:'var(--c-red)' },
  'Late':     { bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
  'Half Day': { bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
  'Leave':    { bg:'#dbeafe',           c:'#1d4ed8' },
  'Holiday':  { bg:'#f3f4f6',           c:'#6b7280' },
}
const RANGES = [
  { k:'today',  l:'Day' }, { k:'week', l:'Week' }, { k:'month', l:'Month' }, { k:'year', l:'Year' }, { k:'custom', l:'Date to date' },
]
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── date helpers (all in India time; dates are plain "YYYY-MM-DD" strings) ──
const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10)
const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
const ymd = (dt) => dt.toISOString().slice(0, 10)
const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d) }
const fmt = (s) => { const d = parse(s); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
const fmtDay = (s) => { const d = parse(s); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]}, ${d.getUTCDate()} ${MON[d.getUTCMonth()]}` }
const daysIn = (a, b) => Math.round((parse(b) - parse(a)) / 86400e3) + 1
function shiftAnchor(range, anchor, dir) {
  const d = parse(anchor)
  if (range === 'today') d.setUTCDate(d.getUTCDate() + dir)
  else if (range === 'week') d.setUTCDate(d.getUTCDate() + 7 * dir)
  else if (range === 'month') { d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + dir) }
  else if (range === 'year') d.setUTCFullYear(d.getUTCFullYear() + dir)
  return ymd(d)
}
const errText = (e, fallback) => e?.response?.data?.message || fallback

const pctColor = (p) => p == null ? 'var(--c-muted)' : p >= 85 ? 'var(--c-green)' : p >= 75 ? 'var(--c-amber)' : 'var(--c-red)'
const pctText = (p) => p == null ? '—' : `${p}%`

function Pill({ status }) {
  const s = STATUS_DOT[status] || STATUS_DOT.Holiday
  return <span className="badge" style={{ background:s.bg, color:s.c, justifySelf:'start' }}>{status}</span>
}
function ErrorBox({ text, onRetry }) {
  return (
    <div role="alert" style={{ background:'var(--c-red-lt)', color:'var(--c-red)', border:'1px solid var(--c-red)', borderRadius:10, padding:'12px 16px', fontSize:13, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
      <span style={{ flex:1 }}>{text}</span>
      {onRetry && <button className="btn-ghost" style={{ fontSize:12, padding:'5px 12px' }} onClick={onRetry}>Retry</button>}
    </div>
  )
}
function Empty({ icon, text }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><p className="empty-sub">{text}</p></div>
}
function PctBar({ pct }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'#f0ede8', borderRadius:99, overflow:'hidden', minWidth:40 }}>
        <div style={{ height:'100%', width:`${pct || 0}%`, background:pctColor(pct), borderRadius:99 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:pctColor(pct), minWidth:44, textAlign:'right' }}>{pctText(pct)}</span>
    </div>
  )
}

export default function Attendance() {
  const today = todayIST()
  const [tab, setTab] = useState('mark')
  const [summary, setSummary] = useState(null)
  const [summaryErr, setSummaryErr] = useState('')
  const [pendingLeaves, setPendingLeaves] = useState(0)

  // ── Mark ──
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(today)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [alreadyMarked, setAlreadyMarked] = useState(false)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterErr, setRosterErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)       // { ok, text }
  const rosterSeq = useRef(0)

  // ── Records ──
  const [records, setRecords] = useState([])
  const [recordsErr, setRecordsErr] = useState('')

  // ── Report ──
  const [range, setRange] = useState('month')
  const [anchor, setAnchor] = useState(today)
  const [customFrom, setCustomFrom] = useState(addDays(today, -29))
  const [customTo, setCustomTo] = useState(today)
  const [rClass, setRClass] = useState('All')
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportErr, setReportErr] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [search, setSearch] = useState('')
  const reportSeq = useRef(0)

  // ── Leaves ──
  const [leaveFilter, setLeaveFilter] = useState('Pending')
  const [leaves, setLeaves] = useState([])
  const [leavesLoading, setLeavesLoading] = useState(false)
  const [leavesErr, setLeavesErr] = useState('')
  const [remarks, setRemarks] = useState({})
  const [busyLeave, setBusyLeave] = useState(null)

  const loadSummary = useCallback(() => {
    setSummaryErr('')
    attendanceApi.getSummary().then(r => setSummary(r.data)).catch(e => setSummaryErr(errText(e, "Couldn't load today's numbers")))
  }, [])
  useEffect(() => { loadSummary() }, [loadSummary])

  const loadLeaves = useCallback((status) => {
    setLeavesLoading(true); setLeavesErr('')
    return attendanceApi.getLeaves(status)
      .then(r => { setLeaves(r.data.leaves || []); setPendingLeaves(r.data.pending_count || 0) })
      .catch(e => setLeavesErr(errText(e, "Couldn't load leave requests")))
      .finally(() => setLeavesLoading(false))
  }, [])
  useEffect(() => { loadLeaves(leaveFilter) }, [leaveFilter, loadLeaves])

  // ── roster ──
  const loadRoster = useCallback(() => {
    if (!selectedClass) { setStudents([]); setAttendance({}); setAlreadyMarked(false); setRosterErr(''); return }
    const seq = ++rosterSeq.current
    setRosterLoading(true); setRosterErr('')
    attendanceApi.getRoster({ class: selectedClass, date })
      .then(r => {
        if (seq !== rosterSeq.current) return
        const studs = r.data.students || []
        const init = {}
        studs.forEach(s => { init[s.id] = s.status || (s.on_leave ? 'Leave' : 'Present') })
        setStudents(studs); setAttendance(init); setAlreadyMarked(!!r.data.already_marked)
      })
      .catch(e => { if (seq === rosterSeq.current) { setStudents([]); setAttendance({}); setRosterErr(errText(e, "Couldn't load this class")) } })
      .finally(() => { if (seq === rosterSeq.current) setRosterLoading(false) })
  }, [selectedClass, date])
  useEffect(() => { if (tab === 'mark') { setSaveMsg(null); loadRoster() } }, [tab, loadRoster])

  const setStatus = (id, status) => setAttendance(prev => ({ ...prev, [id]: status }))
  const markAll = (status) => { const u = {}; students.forEach(s => { u[s.id] = status }); setAttendance(u) }

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const rows = students.map(s => ({ student_id: s.id, status: attendance[s.id] || 'Present' }))
      const r = await attendanceApi.markBulk({ date, attendance: rows })
      const n = r.data.parents_notified
      setSaveMsg({ ok: true, text: `Saved for ${r.data.saved} students${n ? ` · ${n} parent${n > 1 ? 's' : ''} told about absence` : ''}` })
      setAlreadyMarked(true); loadSummary()
    } catch (e) {
      setSaveMsg({ ok: false, text: errText(e, 'Could not save attendance. Nothing was saved — please try again.') })
    } finally { setSaving(false) }
  }

  // ── records ──
  const loadRecords = useCallback(() => {
    setRecordsErr('')
    attendanceApi.getRecords({ date, class: selectedClass || undefined })
      .then(r => setRecords(r.data.records || []))
      .catch(e => { setRecords([]); setRecordsErr(errText(e, "Couldn't load records")) })
  }, [date, selectedClass])
  useEffect(() => { if (tab === 'records') loadRecords() }, [tab, loadRecords])

  // ── report ──
  const customError = range !== 'custom' ? '' :
    (!customFrom || !customTo) ? 'Choose both dates' :
    customFrom > customTo ? '"From" must be on or before "To"' :
    daysIn(customFrom, customTo) > 366 ? 'Pick a range of 366 days or less' : ''
  const reportParams = useCallback(() => {
    const p = { range, class: rClass === 'All' ? undefined : rClass }
    if (range === 'custom') { p.from = customFrom; p.to = customTo } else p.date = anchor
    return p
  }, [range, anchor, customFrom, customTo, rClass])

  const loadReport = useCallback(() => {
    if (customError) { setReport(null); return }
    const seq = ++reportSeq.current
    setReportLoading(true); setReportErr('')
    attendanceApi.getReport(reportParams())
      .then(r => { if (seq === reportSeq.current) setReport(r.data) })
      .catch(e => { if (seq === reportSeq.current) { setReport(null); setReportErr(errText(e, "Couldn't load the report")) } })
      .finally(() => { if (seq === reportSeq.current) setReportLoading(false) })
  }, [customError, reportParams])
  useEffect(() => { if (tab === 'report') loadReport() }, [tab, loadReport])

  const jumpToDay = (d) => { setDate(d); if (rClass !== 'All') setSelectedClass(rClass); setTab('mark') }

  const decide = async (id, status) => {
    setBusyLeave(id); setLeavesErr('')
    try {
      await attendanceApi.decideLeave(id, { status, remark: (remarks[id] || '').trim() || undefined })
      await loadLeaves(leaveFilter); loadSummary()
    } catch (e) { setLeavesErr(errText(e, "Couldn't update this request")); loadLeaves(leaveFilter) }
    finally { setBusyLeave(null) }
  }

  const presentCount = Object.values(attendance).filter(v => v === 'Present').length
  const absentCount  = Object.values(attendance).filter(v => v === 'Absent').length
  const lateCount    = Object.values(attendance).filter(v => v === 'Late' || v === 'Half Day').length
  const leaveCount   = Object.values(attendance).filter(v => v === 'Leave').length
  const t = summary?.today
  const canNext = report ? report.to < today : false

  const visibleStudents = (report?.students || []).filter(s =>
    (!lowOnly || (s.percentage != null && s.percentage < report.threshold)) &&
    (!search || `${s.name} ${s.roll_number || ''}`.toLowerCase().includes(search.toLowerCase())))

  const TABS = [
    { k:'mark', l:'Mark attendance' }, { k:'report', l:'Report' }, { k:'records', l:'Records' },
    { k:'leaves', l:pendingLeaves ? `Leave requests (${pendingLeaves})` : 'Leave requests' },
  ]
  const chip = (active) => ({ fontSize:12, fontWeight:600, padding:'7px 14px', borderRadius:20, cursor:'pointer',
    border: active ? 'none' : '1px solid var(--c-border-2)', background: active ? 'var(--c-ink)' : 'white', color: active ? 'white' : 'var(--c-ink-2)' })
  const th = { fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }

  return (
    <Layout>
      <div className="page">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0 }}>Attendance</h1>
            <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>Daily marking, reports by week, month, year or any dates, and parent leave requests</p>
          </div>
          {(tab === 'mark' || tab === 'records') && (
            <input type="date" aria-label="Attendance date" className="input" style={{ maxWidth:170 }} value={date} max={today}
              onChange={e => e.target.value && setDate(e.target.value)} />
          )}
        </div>

        {/* Today's numbers */}
        {summaryErr ? <div style={{ marginBottom:20 }}><ErrorBox text={summaryErr} onRetry={loadSummary} /></div> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }} className="g-4">
            <div className="stat-card"><p className="label">Active students</p><p className="value">{summary ? summary.total_students : '…'}</p></div>
            <div className="stat-card"><p className="label">Marked today</p><p className="value" style={{ color:'var(--c-green)' }}>{summary ? summary.marked_today : '…'}</p></div>
            <div className="stat-card"><p className="label">Not yet marked today</p><p className="value" style={{ color:'var(--c-amber)' }}>{summary ? summary.unmarked : '…'}</p></div>
            <div className="stat-card"><p className="label">Attendance today</p><p className="value" style={{ color:pctColor(t?.percentage) }}>{t ? pctText(t.percentage) : '…'}</p></div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:3, background:'white', border:'1px solid var(--c-border-2)', borderRadius:8, padding:3, width:'fit-content', maxWidth:'100%', flexWrap:'wrap', marginBottom:16 }}>
          {TABS.map(x => (
            <button key={x.k} onClick={() => setTab(x.k)}
              style={{ fontSize:12, fontWeight:500, padding:'6px 14px', borderRadius:6, border:'none', cursor:'pointer',
                background: tab === x.k ? 'var(--c-ink)' : 'transparent', color: tab === x.k ? 'white' : 'var(--c-ink-2)' }}>
              {x.l}
            </button>
          ))}
        </div>

        {/* ═══════════ MARK ═══════════ */}
        {tab === 'mark' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', padding:'16px 20px', borderBottom:'1px solid var(--c-border)' }}>
              <select aria-label="Class" className="input" style={{ maxWidth:170 }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">Select class…</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn-ghost" style={{ fontSize:12, padding:'7px 12px' }} disabled={!students.length} onClick={() => markAll('Present')}>✓ All Present</button>
              <button className="btn-ghost" style={{ fontSize:12, padding:'7px 12px' }} disabled={!students.length} onClick={() => markAll('Absent')}>✗ All Absent</button>
              {alreadyMarked && (
                <span className="badge" style={{ background:'var(--c-green-lt)', color:'var(--c-green)' }}>✓ Already marked for {fmt(date)} — you are editing it</span>
              )}
              <div style={{ marginLeft:'auto', display:'flex', gap:14, fontSize:12, fontWeight:600 }}>
                <span style={{ color:'var(--c-green)' }}>P: {presentCount}</span>
                <span style={{ color:'var(--c-red)' }}>A: {absentCount}</span>
                <span style={{ color:'var(--c-amber)' }}>L: {lateCount}</span>
                <span style={{ color:'#1d4ed8' }}>Leave: {leaveCount}</span>
              </div>
            </div>

            {rosterErr ? <div style={{ padding:20 }}><ErrorBox text={rosterErr} onRetry={loadRoster} /></div>
              : !selectedClass ? <Empty icon="✓" text="Select a class to mark attendance" />
              : rosterLoading ? <Empty icon="⏳" text="Loading students…" />
              : students.length === 0 ? <Empty icon="👥" text={`No active students in ${selectedClass}`} />
              : (
              <div>
                {students.map((s, i) => (
                  <div key={s.id} data-testid={`row-${s.id}`} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom: i < students.length-1 ? '1px solid #faf9f7' : 'none', flexWrap:'wrap' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--c-ink-2)', flexShrink:0 }}>{s.name?.[0]}</div>
                    <div style={{ flex:1, minWidth:130 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', margin:0 }}>{s.name}</p>
                      <p style={{ fontSize:11, color:'var(--c-muted)', margin:'2px 0 0' }}>
                        {s.roll_number} · {s.class}
                        {s.on_leave && <span style={{ color:'#1d4ed8', fontWeight:600 }}> · approved leave</span>}
                      </p>
                    </div>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {STATUS_OPTS.map(st => {
                        const active = attendance[s.id] === st
                        const dot = STATUS_DOT[st]
                        return (
                          <button key={st} aria-pressed={active} onClick={() => setStatus(s.id, st)}
                            style={{ fontSize:11, fontWeight:500, padding:'5px 12px', borderRadius:20, cursor:'pointer',
                              border: active ? 'none' : '1px solid var(--c-border-2)', background: active ? dot.bg : 'white', color: active ? dot.c : 'var(--c-muted)' }}>
                            {st}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', borderTop:'1px solid var(--c-border)', flexWrap:'wrap' }}>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save attendance'}</button>
                  <span style={{ fontSize:12, color:'var(--c-muted)' }}>{fmt(date)} · {selectedClass}</span>
                  {saveMsg && (
                    <span role="status" style={{ fontSize:12.5, fontWeight:600, color: saveMsg.ok ? 'var(--c-green)' : 'var(--c-red)' }}>
                      {saveMsg.ok ? '✓ ' : '✗ '}{saveMsg.text}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ REPORT ═══════════ */}
        {tab === 'report' && (
          <div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
              {RANGES.map(r => <button key={r.k} onClick={() => { setRange(r.k); if (r.k !== 'custom') setAnchor(today) }} style={chip(range === r.k)}>{r.l}</button>)}
              <select aria-label="Report class" className="input" style={{ maxWidth:160, marginLeft:'auto' }} value={rClass} onChange={e => setRClass(e.target.value)}>
                <option value="All">All classes</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {range === 'custom' ? (
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:16 }}>
                <input type="date" aria-label="From date" className="input" style={{ maxWidth:160 }} value={customFrom} max={today} onChange={e => setCustomFrom(e.target.value)} />
                <span style={{ fontSize:12, color:'var(--c-muted)' }}>to</span>
                <input type="date" aria-label="To date" className="input" style={{ maxWidth:160 }} value={customTo} max={today} onChange={e => setCustomTo(e.target.value)} />
                {customError && <span role="alert" style={{ fontSize:12, color:'var(--c-red)', fontWeight:600 }}>{customError}</span>}
              </div>
            ) : (
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
                <button aria-label="Previous" className="btn-ghost" style={{ padding:'6px 12px' }} onClick={() => setAnchor(a => shiftAnchor(range, a, -1))}>‹</button>
                <span style={{ fontSize:15, fontWeight:700, color:'var(--c-ink)', minWidth:180, textAlign:'center' }} data-testid="range-label">{report?.label || '…'}</span>
                <button aria-label="Next" className="btn-ghost" style={{ padding:'6px 12px' }} disabled={!canNext} onClick={() => setAnchor(a => shiftAnchor(range, a, 1))}>›</button>
                {report && <span style={{ fontSize:12, color:'var(--c-muted)' }}>{fmt(report.from)}{report.from !== report.to ? ` – ${fmt(report.to)}` : ''}</span>}
              </div>
            )}

            {reportErr && <div style={{ marginBottom:16 }}><ErrorBox text={reportErr} onRetry={loadReport} /></div>}
            {reportLoading && !report && <div className="card"><Empty icon="⏳" text="Loading report…" /></div>}

            {report && (
              <div style={{ opacity: reportLoading ? 0.55 : 1, transition:'opacity .15s' }}>
                {/* KPIs */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }} className="g-4">
                  <div className="stat-card"><p className="label">Attendance</p><p className="value" data-testid="kpi-pct" style={{ color:pctColor(report.totals.percentage) }}>{pctText(report.totals.percentage)}</p></div>
                  <div className="stat-card"><p className="label">Present</p><p className="value" style={{ color:'var(--c-green)' }}>{report.totals.present}</p></div>
                  <div className="stat-card"><p className="label">Absent</p><p className="value" style={{ color:'var(--c-red)' }}>{report.totals.absent}</p></div>
                  <div className="stat-card"><p className="label">Late / Half day</p><p className="value" style={{ color:'var(--c-amber)' }}>{report.totals.late + report.totals.half_day}</p></div>
                  <div className="stat-card"><p className="label">On leave</p><p className="value" style={{ color:'#1d4ed8' }}>{report.totals.leave}</p></div>
                </div>
                <p style={{ fontSize:11.5, color:'var(--c-muted)', margin:'-6px 0 16px' }}>
                  {report.totals.days_marked} day{report.totals.days_marked === 1 ? '' : 's'} with attendance taken · {report.low_count} student{report.low_count === 1 ? '' : 's'} below {report.threshold}% ·
                  Attendance % = (present + late + ½ half-day) ÷ days counted; approved leave and holidays are not counted.
                </p>

                {/* Trend chart */}
                <div className="card" style={{ marginBottom:16 }}>
                  <h3 style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:'0 0 12px' }}>
                    {report.granularity === 'day' ? 'Attendance by day' : 'Attendance by month'}
                  </h3>
                  {report.buckets.length === 0 ? <Empty icon="📅" text="No attendance has been marked in this period" /> : (
                    <div style={{ display:'flex', alignItems:'flex-end', gap: report.buckets.length > 31 ? 2 : 6, height:140, overflowX:'auto', paddingBottom:2 }} data-testid="trend">
                      {report.buckets.map(b => {
                        const label = report.granularity === 'day' ? String(Number(b.bucket.slice(8, 10))) : MON[Number(b.bucket.slice(5, 7)) - 1]
                        return (
                          <div key={b.bucket} title={`${report.granularity === 'day' ? fmtDay(b.bucket) : label}: ${pctText(b.percentage)} (P ${b.present} · A ${b.absent} · L ${b.late + b.half_day} · Leave ${b.leave})`}
                            style={{ flex:'1 0 18px', maxWidth:46, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%' }}>
                            <span style={{ fontSize:9.5, color:'var(--c-muted)', marginBottom:2 }}>{b.percentage == null ? '' : Math.round(b.percentage)}</span>
                            <div style={{ width:'100%', height:`${Math.max(b.percentage ?? 0, 3) * 0.95}px`, background: pctColor(b.percentage), borderRadius:'4px 4px 0 0', opacity: b.percentage == null ? 0.25 : 1 }} />
                            <span style={{ fontSize:10, color:'var(--c-muted)', marginTop:4 }}>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Breakdown table */}
                {report.buckets.length > 0 && (
                  <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
                    <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'1.4fr 70px 70px 90px 70px 130px 120px 90px', gap:10, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
                      {[report.granularity === 'day' ? 'Date' : 'Month', 'Present', 'Absent', 'Late/Half', 'Leave', '%', 'Marking', ''].map((h, i) => <span key={i} style={th}>{h}</span>)}
                    </div>
                    {[...report.buckets].reverse().map((b, i, arr) => (
                      <div key={b.bucket} style={{ display:'grid', gridTemplateColumns:'1.4fr 70px 70px 90px 70px 130px 120px 90px', gap:10, alignItems:'center', padding:'11px 20px', borderBottom: i < arr.length-1 ? '1px solid #faf9f7' : 'none' }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)' }}>
                          {report.granularity === 'day' ? fmtDay(b.bucket) : `${MON[Number(b.bucket.slice(5, 7)) - 1]} ${b.bucket.slice(0, 4)}`}
                        </span>
                        <span style={{ fontSize:13, color:'var(--c-green)', fontWeight:600 }}>{b.present}</span>
                        <span style={{ fontSize:13, color:'var(--c-red)', fontWeight:600 }}>{b.absent}</span>
                        <span style={{ fontSize:13, color:'var(--c-amber)', fontWeight:600 }}>{b.late + b.half_day}</span>
                        <span style={{ fontSize:13, color:'#1d4ed8', fontWeight:600 }}>{b.leave}</span>
                        <PctBar pct={b.percentage} />
                        <span>{report.granularity === 'day' && (
                          <span className="badge" style={{ background: b.is_complete ? 'var(--c-green-lt)' : 'var(--c-amber-lt)', color: b.is_complete ? 'var(--c-green)' : 'var(--c-amber)' }}>
                            {b.is_complete ? '✓ Complete' : `Partial (${b.marked}/${report.total_active})`}
                          </span>)}</span>
                        {report.granularity === 'day'
                          ? <button className="btn-ghost" style={{ fontSize:11, padding:'5px 10px' }} onClick={() => jumpToDay(b.bucket)}>View / Edit</button>
                          : <span />}
                      </div>
                    ))}
                  </div>
                )}

                {/* By class */}
                {report.class === 'All' && report.by_class.length > 1 && (
                  <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
                    <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)' }}><h3 style={{ fontSize:14, fontWeight:600, margin:0, color:'var(--c-ink)' }}>By class</h3></div>
                    {report.by_class.map((c, i) => (
                      <div key={c.class} style={{ display:'grid', gridTemplateColumns:'1fr 90px 70px 70px 70px 1.2fr', gap:10, alignItems:'center', padding:'11px 20px', borderBottom: i < report.by_class.length-1 ? '1px solid #faf9f7' : 'none' }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', cursor:'pointer' }} onClick={() => setRClass(c.class)}>{c.class}</span>
                        <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)' }}>{c.students} students</span>
                        <span className="hide-md" style={{ fontSize:13, color:'var(--c-green)', fontWeight:600 }}>{c.present}</span>
                        <span className="hide-md" style={{ fontSize:13, color:'var(--c-red)', fontWeight:600 }}>{c.absent}</span>
                        <span className="hide-md" style={{ fontSize:13, color:'var(--c-amber)', fontWeight:600 }}>{c.late + c.half_day}</span>
                        <PctBar pct={c.percentage} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Students */}
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', padding:'14px 20px', borderBottom:'1px solid var(--c-border)' }}>
                    <h3 style={{ fontSize:14, fontWeight:600, margin:0, color:'var(--c-ink)' }}>Students</h3>
                    <input className="input" aria-label="Search students" placeholder="Search name or roll no." style={{ maxWidth:220 }} value={search} onChange={e => setSearch(e.target.value)} />
                    <label style={{ fontSize:12, color:'var(--c-ink-2)', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                      <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} /> Below {report.threshold}% only
                    </label>
                    <span style={{ marginLeft:'auto', fontSize:11.5, color:'var(--c-muted)' }}>
                      {report.student_total > report.students.length ? `Lowest ${report.students.length} of ${report.student_total}` : `${report.student_total} students`}
                    </span>
                  </div>
                  {visibleStudents.length === 0 ? <Empty icon="👥" text={lowOnly ? 'No students below the threshold 🎉' : 'No students found'} /> : (
                    <>
                      <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'2fr 90px 60px 60px 60px 60px 60px 1.3fr', gap:10, padding:'10px 20px', background:'var(--c-surface-2)', borderBottom:'1px solid var(--c-border)' }}>
                        {['Student','Class','P','A','Late','Half','Leave','Attendance'].map((h, i) => <span key={i} style={th}>{h}</span>)}
                      </div>
                      {visibleStudents.map((s, i) => (
                        <div key={s.id} data-testid={`stu-${s.id}`} style={{ display:'grid', gridTemplateColumns:'2fr 90px 60px 60px 60px 60px 60px 1.3fr', gap:10, alignItems:'center', padding:'10px 20px', borderBottom: i < visibleStudents.length-1 ? '1px solid #faf9f7' : 'none' }}>
                          <span><span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)' }}>{s.name}</span><span style={{ fontSize:11, color:'var(--c-muted)', marginLeft:8 }}>{s.roll_number}</span></span>
                          <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{s.class}</span>
                          <span className="hide-md" style={{ fontSize:13, color:'var(--c-green)', fontWeight:600 }}>{s.present}</span>
                          <span className="hide-md" style={{ fontSize:13, color:'var(--c-red)', fontWeight:600 }}>{s.absent}</span>
                          <span className="hide-md" style={{ fontSize:13, color:'var(--c-amber)' }}>{s.late}</span>
                          <span className="hide-md" style={{ fontSize:13, color:'var(--c-amber)' }}>{s.half_day}</span>
                          <span className="hide-md" style={{ fontSize:13, color:'#1d4ed8' }}>{s.leave}</span>
                          <PctBar pct={s.percentage} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ RECORDS ═══════════ */}
        {tab === 'records' && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', padding:'14px 20px', borderBottom:'1px solid var(--c-border)' }}>
              <select aria-label="Records class" className="input" style={{ maxWidth:170 }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">All classes</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{ fontSize:12, color:'var(--c-muted)' }}>{fmt(date)}</span>
            </div>
            {recordsErr ? <div style={{ padding:20 }}><ErrorBox text={recordsErr} onRetry={loadRecords} /></div> : (
              <>
                <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'2fr 100px 100px 110px 1fr', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
                  {['Student','Roll','Class','Status','Date'].map((h, i) => <span key={i} style={th}>{h}</span>)}
                </div>
                {records.length === 0 ? <Empty icon="📋" text={`No records for ${fmt(date)}`} /> : records.map((r, i) => (
                  <div key={r.id} className="att-row" style={{ display:'grid', gridTemplateColumns:'2fr 100px 100px 110px 1fr', gap:12, alignItems:'center', padding:'12px 20px', borderBottom: i < records.length-1 ? '1px solid #faf9f7' : 'none' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)' }}>{r.student_name}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)', fontFamily:'monospace' }}>{r.roll_number}</span>
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{r.class}</span>
                    <Pill status={r.status} />
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-muted)' }}>{r.date ? fmt(r.date) : ''}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ═══════════ LEAVES ═══════════ */}
        {tab === 'leaves' && (
          <div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
              {['Pending','Approved','Rejected','All'].map(s => <button key={s} onClick={() => setLeaveFilter(s)} style={chip(leaveFilter === s)}>{s}</button>)}
            </div>
            {leavesErr && <div style={{ marginBottom:14 }}><ErrorBox text={leavesErr} onRetry={() => loadLeaves(leaveFilter)} /></div>}
            {leavesLoading && !leaves.length ? <div className="card"><Empty icon="⏳" text="Loading…" /></div>
              : leaves.length === 0 ? <div className="card"><Empty icon="🌿" text={leaveFilter === 'Pending' ? 'No leave requests waiting for you' : `No ${leaveFilter.toLowerCase()} requests`} /></div>
              : leaves.map(l => {
                const n = daysIn(l.from_date, l.to_date)
                return (
                  <div key={l.id} className="card" data-testid={`leave-${l.id}`} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
                      <div>
                        <p style={{ fontSize:14, fontWeight:700, color:'var(--c-ink)', margin:0 }}>{l.student_name} <span style={{ fontSize:12, fontWeight:500, color:'var(--c-muted)' }}>· {l.class} · {l.roll_number}</span></p>
                        <p style={{ fontSize:13, color:'var(--c-ink-2)', margin:'4px 0 0' }}>
                          {fmt(l.from_date)}{l.from_date !== l.to_date ? ` – ${fmt(l.to_date)}` : ''} <span style={{ color:'var(--c-muted)' }}>({n} day{n > 1 ? 's' : ''})</span>
                        </p>
                      </div>
                      <span className="badge" style={{
                        background: l.status === 'Approved' ? 'var(--c-green-lt)' : l.status === 'Rejected' ? 'var(--c-red-lt)' : 'var(--c-amber-lt)',
                        color: l.status === 'Approved' ? 'var(--c-green)' : l.status === 'Rejected' ? 'var(--c-red)' : 'var(--c-amber)' }}>{l.status}</span>
                    </div>
                    <p style={{ fontSize:13, color:'var(--c-ink)', margin:'10px 0 0', lineHeight:1.5 }}>“{l.reason}”</p>
                    {l.remark && l.status !== 'Pending' && <p style={{ fontSize:12, color:'var(--c-muted)', margin:'6px 0 0' }}>Your note: {l.remark}</p>}
                    {l.status === 'Pending' && (
                      <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                        <input className="input" aria-label={`Note for ${l.student_name}`} placeholder="Optional note to the parent" style={{ flex:1, minWidth:180 }}
                          value={remarks[l.id] || ''} onChange={e => setRemarks(r => ({ ...r, [l.id]: e.target.value }))} />
                        <button className="btn-primary" disabled={busyLeave === l.id} onClick={() => decide(l.id, 'Approved')}>Approve</button>
                        <button className="btn-ghost" disabled={busyLeave === l.id} onClick={() => decide(l.id, 'Rejected')}>Reject</button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </Layout>
  )
}