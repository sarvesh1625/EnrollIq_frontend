import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'
import ChairmanAssistantWidget from '../components/ChairmanAssistantWidget'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Group Dashboard (Chairman)
   One consolidated view across every branch in the group, plus a
   branch-by-branch table and per-branch counsellor breakdown.
   "View & edit" switches the chairman's active branch and drops
   them into that branch's normal admin dashboard — read-only here,
   editing always happens through the real branch screens.
   ═══════════════════════════════════════════════════════════════ */

const COLORS = ['#12a38a', '#7c3aed', '#f59e0b', '#2563eb', '#db2777', '#0891b2', '#65a30d', '#dc2626']

// ₹ in lakh / crore so big numbers never overflow a tile
const inr = (n) => {
  n = Number(n || 0)
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L'
  return '₹' + n.toLocaleString('en-IN')
}
const num = (n) => Number(n || 0).toLocaleString('en-IN')
const pct = (n) => (n == null ? '—' : n + '%')

const METRICS = [
  { key: 'students',        label: 'Students',        fmt: num },
  { key: 'leads',           label: 'Leads',           fmt: num },
  { key: 'leads_30d',       label: 'Leads (30 days)', fmt: num },
  { key: 'admitted',        label: 'Admitted',        fmt: num },
  { key: 'conversion',      label: 'Conversion',      fmt: pct },
  { key: 'fee_collected',   label: 'Fees collected',  fmt: inr },
  { key: 'fee_pending',     label: 'Fees pending',    fmt: inr, lowerBetter: true },
  { key: 'collection_rate', label: 'Collection rate', fmt: pct },
]


const h2 = { margin: '0 0 12px', fontSize: 15, fontWeight: 700 }
const card = { background: 'white', borderRadius: 16, border: '1px solid #f0ede8', padding: 18 }

function StatCard({ label, value, sub }) {
  return (
    <div style={card}>
      <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#1a1814', marginTop: 4, whiteSpace: 'nowrap' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function ConversionBar({ pct }) {
  const color = pct >= 40 ? '#15803d' : pct >= 20 ? '#b45309' : '#b91c1c'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function Pills({ items, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
      {items.map(m => (
        <button key={m.key} onClick={() => onChange(m.key)}
          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
            border: '1px solid ' + (value === m.key ? '#12a38a' : '#e5e7eb'),
            background: value === m.key ? '#e7f7f2' : '#fff', color: value === m.key ? '#0d8571' : '#4b5563',
            fontWeight: value === m.key ? 600 : 400 }}>{m.label}</button>
      ))}
    </div>
  )
}

// horizontal bars, one per branch
function Bars({ rows, metric, colorOf }) {
  const vals = rows.map(r => Number(r[metric.key]) || 0)
  const max = Math.max(...vals, 1)
  const order = [...rows].sort((a, b) => (Number(b[metric.key]) || 0) - (Number(a[metric.key]) || 0))
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {order.map(r => (
        <div key={r.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 600 }}>{r.name}</span>
            <span style={{ fontWeight: 700 }}>{metric.fmt(r[metric.key])}</span>
          </div>
          <div style={{ height: 12, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: Math.max(2, ((Number(r[metric.key]) || 0) / max) * 100) + '%', height: '100%', background: colorOf(r.id), borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// multi-line trend chart (inline SVG, no library)
function Trend({ months, series, fmt, colorOf }) {
  const W = 560, H = 200, P = { l: 44, r: 12, t: 12, b: 26 }
  const max = Math.max(...series.flatMap(s => s.values), 1)
  const x = i => P.l + (i * (W - P.l - P.r)) / Math.max(months.length - 1, 1)
  const y = v => P.t + (1 - v / max) * (H - P.t - P.b)
  const label = m => new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short' })
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 360, height: 'auto' }}>
        {[0, 0.5, 1].map(t => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(max * t)} y2={y(max * t)} stroke="#eee" />
            <text x={P.l - 6} y={y(max * t) + 4} fontSize="10" textAnchor="end" fill="#9ca3af">{fmt(Math.round(max * t))}</text>
          </g>
        ))}
        {months.map((m, i) => <text key={m} x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="#9ca3af">{label(m)}</text>)}
        {series.map(s => (
          <g key={s.id}>
            <polyline fill="none" stroke={colorOf(s.id)} strokeWidth="2.5" strokeLinejoin="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={colorOf(s.id)}><title>{s.name}: {fmt(v)}</title></circle>)}
          </g>
        ))}
      </svg>
    </div>
  )
}

const STAGES = ['New', 'Contacted', 'Campus Visit', 'Admission', 'Admitted', 'Lost']
const STAGE_COLOR = { New: '#94a3b8', Contacted: '#2563eb', 'Campus Visit': '#f59e0b', Admission: '#12a38a', Admitted: '#12a38a', Lost: '#dc2626' }

export default function GroupDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [switching, setSwitching] = useState(null)
  const navigate = useNavigate()
  const [cmp, setCmp] = useState(null)          // all-time numbers + 6-month trends per branch
  const [metricKey, setMetricKey] = useState('leads')
  const [trendKey, setTrendKey] = useState('leads_by_month')

  useEffect(() => {
    api.get('/group/overview')
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.message || 'Could not load the group dashboard'))
      .finally(() => setLoading(false))
    api.get('/branches/overview').then(r => setCmp(r.data)).catch(() => {})
  }, [])

  const viewBranch = async (schoolId) => {
    setSwitching(schoolId)
    try {
      await api.put('/branches/switch', { school_id: schoolId })
      navigate('/dashboard')
      window.location.reload()   // same pattern as the sidebar's own branch switcher — refreshes every screen's data for the new branch
    } catch {
      setSwitching(null)
      alert('Could not switch to that branch.')
    }
  }

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading group dashboard…</div></Layout>
  if (error) return <Layout><div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>{error}</div></Layout>
  if (!data?.branches?.length) return <Layout><div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No branches found for your group yet.</div></Layout>

  const { branches, totals } = data

  return (
    <Layout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: '#1a1814', marginBottom: 4 }}>Chairman Dashboard</h1>
        <p style={{ color: '#9ca3af', marginBottom: 20 }}>
          {totals.branch_count} branch{totals.branch_count !== 1 ? 'es' : ''} · consolidated view, last 30 days
        </p>

        {/* Group totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Enquiries (30d)" value={totals.enquiries_30d} />
          <StatCard label="Admissions (30d)" value={totals.admissions_30d} />
          <StatCard label="Conversion" value={`${totals.conversion_pct}%`} />
          <StatCard label="Active students" value={totals.active_students} />
          <StatCard label="Fees collected (MTD)" value={inr(totals.fees_collected_mtd)} />
          <StatCard label="Fees pending" value={inr(totals.fees_pending)} />
        </div>

        {/* Branch comparison table */}
        <h2 className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: '#1a1814', marginBottom: 12 }}>Branches</h2>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1fr 0.8fr 1fr 1fr 90px', gap: 10, padding: '10px 16px', background: '#faf9f7', borderBottom: '1px solid #f0ede8' }}>
            {['Branch', 'Enquiries', 'Admissions', 'Conversion', 'Students', 'Collected', 'Pending', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
            ))}
          </div>
          {branches.map((b, i) => (
            <div key={b.school_id}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1fr 0.8fr 1fr 1fr 90px', gap: 10, padding: '12px 16px',
                alignItems: 'center', borderBottom: i < branches.length - 1 || expanded === b.school_id ? '1px solid #f5f3f0' : 'none' }}>
                <div>
                  <button onClick={() => setExpanded(expanded === b.school_id ? null : b.school_id)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, color: '#1a1814', fontSize: 14 }}>{b.name}</span>
                    {b.is_main_branch ? <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 6px', borderRadius: 6 }}>MAIN</span> : null}
                  </button>
                  {b.city && <p style={{ fontSize: 11, color: '#9ca3af' }}>{b.city}</p>}
                </div>
                <span style={{ fontSize: 14, color: '#1a1814' }}>{b.enquiries_30d}</span>
                <span style={{ fontSize: 14, color: '#1a1814' }}>{b.admissions_30d}</span>
                <ConversionBar pct={b.conversion_pct} />
                <span style={{ fontSize: 14, color: '#1a1814' }}>{b.active_students}</span>
                <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>{inr(b.fees_collected_mtd)}</span>
                <span style={{ fontSize: 13, color: b.fees_pending > 0 ? '#b91c1c' : '#9ca3af', fontWeight: 600 }}>{inr(b.fees_pending)}</span>
                <button onClick={() => viewBranch(b.school_id)} disabled={switching === b.school_id}
                  className="btn-ghost" style={{ fontSize: 11, padding: '6px 10px', opacity: switching === b.school_id ? 0.6 : 1 }}>
                  {switching === b.school_id ? '…' : 'View & Edit →'}
                </button>
              </div>

              {expanded === b.school_id && (
                <div style={{ padding: '14px 16px 18px 32px', background: '#fafafa', borderBottom: i < branches.length - 1 ? '1px solid #f5f3f0' : 'none' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Counsellors — last 30 days
                  </p>
                  {b.counsellors.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#9ca3af' }}>No leads assigned to a counsellor in this branch yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {b.counsellors.map(c => (
                        <div key={c.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 10, padding: '8px 12px', border: '1px solid #f0ede8' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1814' }}>{c.name}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>
                            {c.leads_assigned} leads · {c.admissions} admissions · {c.lost} lost
                          </span>
                          <ConversionBar pct={c.conversion_pct} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {cmp && cmp.branches.length > 0 && (() => {
          const rows = cmp.branches
          const ids = rows.map(r => r.id)
          const colorOf = (id) => COLORS[Math.max(0, ids.indexOf(id)) % COLORS.length]
          const metric = METRICS.find(m => m.key === metricKey)
          const trendTabs = [
            { key: 'leads_by_month', label: 'Leads', fmt: num },
            { key: 'admissions_by_month', label: 'Admissions', fmt: num },
            { key: 'fees_by_month', label: 'Fees collected', fmt: inr },
          ]
          const trend = trendTabs.find(x => x.key === trendKey)
          const flags = []
          rows.filter(r => r.fee_overdue > 0).forEach(r => flags.push(`${r.name} has ${inr(r.fee_overdue)} overdue.`))
          rows.filter(r => r.students > 0 && r.attendance_pct == null).forEach(r => flags.push(`${r.name}: attendance not marked today.`))
          rows.filter(r => r.leads > 20 && r.admitted === 0).forEach(r => flags.push(`${r.name} has ${num(r.leads)} leads but no admissions yet.`))
          if (rows.length > 1) {
            const s = [...rows].sort((a, b) => b.conversion - a.conversion)
            if (s[0].conversion !== s[s.length - 1].conversion) flags.push(`Conversion: ${s[0].name} ${s[0].conversion}% is best, ${s[s.length - 1].name} ${s[s.length - 1].conversion}% is lowest.`)
          }
          return (
            <>
              <h2 className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: '#1a1814', margin: '28px 0 12px' }}>School vs school</h2>
              <p style={{ color: '#9ca3af', fontSize: 12, margin: '-6px 0 12px' }}>All-time figures and the last 6 months. The table above is the last 30 days.</p>

              {flags.length > 0 && (
                <div style={{ ...card, marginBottom: 16, background: '#fffbeb', borderColor: '#fde68a' }}>
                  <p style={h2}>Needs your attention</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: '#374151' }}>
                    {flags.map((f, k) => <li key={k}>{f}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div style={card}>
                  <p style={h2}>Compare branches</p>
                  <Pills items={METRICS} value={metricKey} onChange={setMetricKey} />
                  <Bars rows={rows} metric={metric} colorOf={colorOf} />
                </div>
                <div style={card}>
                  <p style={h2}>Last 6 months</p>
                  <Pills items={trendTabs} value={trendKey} onChange={setTrendKey} />
                  <Trend months={cmp.analytics.months} series={cmp.analytics[trendKey]} fmt={trend.fmt} colorOf={colorOf} />
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
                    {rows.map(r => (
                      <span key={r.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i style={{ width: 10, height: 10, borderRadius: 99, background: colorOf(r.id), display: 'inline-block' }} />{r.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ ...card, marginBottom: 16, overflowX: 'auto' }}>
                <p style={h2}>Side by side</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 10px', color: '#6b7280', fontWeight: 500 }}>Metric</th>
                      {rows.map(r => <th key={r.id} style={{ textAlign: 'right', padding: '8px 10px' }}>
                        <i style={{ width: 8, height: 8, borderRadius: 99, background: colorOf(r.id), display: 'inline-block', marginRight: 6 }} />{r.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...METRICS, { key: 'attendance_pct', label: 'Attendance today', fmt: pct }].map(m => {
                      const nums = rows.map(r => r[m.key]).filter(v => v != null)
                      const best = nums.length > 1 ? (m.lowerBetter ? Math.min(...nums) : Math.max(...nums)) : null
                      return (
                        <tr key={m.key} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '9px 10px', color: '#4b5563' }}>{m.label}</td>
                          {rows.map(r => {
                            const v = r[m.key]
                            const isBest = best != null && v === best && nums.some(x => x !== best)
                            return <td key={r.id} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: isBest ? 700 : 400, color: isBest ? '#059669' : '#111827' }}>
                              {v == null ? 'Not marked' : m.fmt(v)}{isBest ? ' ▲' : ''}</td>
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={card}>
                <p style={h2}>Where each branch's leads stand</p>
                <div style={{ display: 'grid', gap: 14 }}>
                  {cmp.analytics.stages.map(b => {
                    const total = Object.values(b.counts).reduce((a, c) => a + c, 0)
                    return (
                      <div key={b.id}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>{b.name} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· {num(total)} leads</span></div>
                        <div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', background: '#f3f4f6' }}>
                          {STAGES.map(s => b.counts[s] ? <div key={s} title={`${s}: ${b.counts[s]}`} style={{ width: (b.counts[s] / (total || 1)) * 100 + '%', background: STAGE_COLOR[s] }} /> : null)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
                  {STAGES.map(s => <span key={s} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: STAGE_COLOR[s], display: 'inline-block' }} />{s}</span>)}
                </div>
              </div>
            </>
          )
        })()}
      </div>
      <ChairmanAssistantWidget />
    </Layout>
  )
}