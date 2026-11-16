import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* Class timetable — the admin sets, for every class, who teaches what in each period.
   Teachers then see their own periods in the EnrollTeach app. */

const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat']]
const DEFAULT_TIMES = [['09:00', '09:45'], ['09:45', '10:30'], ['10:45', '11:30'], ['11:30', '12:15'], ['13:00', '13:45'], ['13:45', '14:30'], ['14:30', '15:15'], ['15:15', '16:00']]
const label = (c) => `Class ${c.class}${c.section ? ' - ' + c.section : ''}`
const key = (c) => `${c.class}|${c.section}`
const cellKey = (p, d) => `${p}-${d}`

export default function Timetable() {
  const [opts, setOpts] = useState({ classes: [], teachers: [], subjects: [] })
  const [sel, setSel] = useState('')
  const [periods, setPeriods] = useState(8)
  const [times, setTimes] = useState(() => DEFAULT_TIMES.map(([s, e]) => ({ start: s, end: e })))
  const [cells, setCells] = useState({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => { api.get('/timetable/options').then((r) => { setOpts(r.data); if (r.data.classes[0]) setSel(key(r.data.classes[0])) }).catch(() => setMsg({ ok: false, text: 'Could not load classes.' })) }, [])

  const load = useCallback(async () => {
    if (!sel) return
    const [cls, section] = sel.split('|')
    setLoading(true); setMsg(null)
    try {
      const r = await api.get('/timetable', { params: { class: cls, section } })
      const next = {}, t = DEFAULT_TIMES.map(([s, e]) => ({ start: s, end: e })); let max = 0
      r.data.forEach((x) => {
        next[cellKey(x.period_no, x.day_of_week)] = { subject: x.subject, teacher_id: x.teacher_id || '', room: x.room || '' }
        max = Math.max(max, x.period_no)
        if (x.start_time) { while (t.length < x.period_no) t.push({ start: '', end: '' }); t[x.period_no - 1] = { start: x.start_time, end: x.end_time || '' } }
      })
      setCells(next); setTimes(t); setPeriods(Math.max(max, r.data.length ? max : 8))
    } catch { setMsg({ ok: false, text: 'Could not load this timetable.' }) } finally { setLoading(false) }
  }, [sel])
  useEffect(() => { load() }, [load])

  const setCell = (p, d, patch) => setCells((c) => ({ ...c, [cellKey(p, d)]: { subject: '', teacher_id: '', room: '', ...c[cellKey(p, d)], ...patch } }))
  const setTime = (p, patch) => setTimes((t) => { const n = [...t]; while (n.length < p) n.push({ start: '', end: '' }); n[p - 1] = { ...n[p - 1], ...patch }; return n })

  const save = async () => {
    const [cls, section] = sel.split('|'); const rows = []
    for (let p = 1; p <= periods; p++) for (const [d] of DAYS) {
      const c = cells[cellKey(p, d)]
      if (c && c.subject.trim()) rows.push({ day: d, period: p, subject: c.subject.trim(), teacher_id: c.teacher_id || null, room: c.room, start_time: times[p - 1]?.start || '', end_time: times[p - 1]?.end || '' })
    }
    setBusy(true); setMsg(null)
    try { const r = await api.put('/timetable/class', { class: cls, section, rows }); setMsg({ ok: true, text: r.data.message }) }
    catch (e) { setMsg({ ok: false, text: e.response?.data?.message || 'Could not save.' }) } finally { setBusy(false) }
  }
  const clear = async () => {
    if (!window.confirm('Remove the whole timetable of this class?')) return
    const [cls, section] = sel.split('|')
    try { await api.delete('/timetable/class', { params: { class: cls, section } }); setCells({}); setMsg({ ok: true, text: 'Timetable cleared.' }) } catch (e) { setMsg({ ok: false, text: e.response?.data?.message || 'Could not clear.' }) }
  }

  const inp = { width: '100%', padding: '6px 8px', border: '1px solid var(--c-border, #e5e7eb)', borderRadius: 8, fontSize: 12.5, background: '#fff' }

  return (
    <Layout>
      <div style={{ maxWidth: 1180 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Timetable</h1>
        <p style={{ color: '#6b7280', fontSize: 13.5, marginBottom: 18 }}>Set each class's weekly periods. Teachers see their own periods in the EnrollTeach app. A teacher can't be given two classes in the same period.</p>

        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ ...inp, width: 200, fontSize: 14, padding: '9px 10px' }}>
            {opts.classes.length === 0 && <option value="">No classes yet</option>}
            {opts.classes.map((c) => <option key={key(c)} value={key(c)}>{label(c)}</option>)}
          </select>
          <label style={{ fontSize: 13, color: '#6b7280' }}>Periods per day&nbsp;
            <select value={periods} onChange={(e) => setPeriods(Number(e.target.value))} style={{ ...inp, width: 70, display: 'inline-block' }}>
              {[4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={clear} disabled={!sel} style={{ background: '#fff', border: '1px solid #e5e7eb' }}>Clear</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !sel}>{busy ? 'Saving…' : 'Save timetable'}</button>
        </div>
        {msg && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13.5, background: msg.ok ? '#dcfce7' : '#fee2e2', color: msg.ok ? '#15803d' : '#b91c1c' }}>{msg.text}</div>}

        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          {loading ? <p style={{ padding: 24, color: '#9ca3af' }}>Loading…</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: 10, textAlign: 'left', fontSize: 12, color: '#6b7280', width: 130 }}>Period / time</th>
                  {DAYS.map(([d, n]) => <th key={d} style={{ padding: 10, textAlign: 'left', fontSize: 12, color: '#6b7280' }}>{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: periods }, (_, i) => i + 1).map((p) => (
                  <tr key={p} style={{ borderTop: '1px solid #f1f1f4' }}>
                    <td style={{ padding: 8, verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Period {p}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input type="time" value={times[p - 1]?.start || ''} onChange={(e) => setTime(p, { start: e.target.value })} style={{ ...inp, padding: '4px 5px', fontSize: 11.5 }} />
                        <input type="time" value={times[p - 1]?.end || ''} onChange={(e) => setTime(p, { end: e.target.value })} style={{ ...inp, padding: '4px 5px', fontSize: 11.5 }} />
                      </div>
                    </td>
                    {DAYS.map(([d]) => {
                      const c = cells[cellKey(p, d)] || { subject: '', teacher_id: '', room: '' }
                      return (
                        <td key={d} style={{ padding: 6, verticalAlign: 'top' }}>
                          <input list="tt-subjects" placeholder="Subject" value={c.subject} onChange={(e) => setCell(p, d, { subject: e.target.value })} style={{ ...inp, fontWeight: 600, marginBottom: 4 }} />
                          <select value={c.teacher_id} onChange={(e) => setCell(p, d, { teacher_id: e.target.value })} style={{ ...inp, marginBottom: 4 }}>
                            <option value="">Teacher…</option>
                            {opts.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <input placeholder="Room" value={c.room} onChange={(e) => setCell(p, d, { room: e.target.value })} style={inp} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <datalist id="tt-subjects">{opts.subjects.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 12.5, marginTop: 12 }}>Leave a subject empty for a free period.</p>
      </div>
    </Layout>
  )
}