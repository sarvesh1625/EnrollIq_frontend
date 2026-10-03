import { useState, useEffect } from 'react'
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

const inr = n => `₹${Number(n || 0).toLocaleString('en-IN')}`

const card = { background: 'white', borderRadius: 16, border: '1px solid #f0ede8', padding: 18 }

function StatCard({ label, value, sub }) {
  return (
    <div style={card}>
      <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#1a1814', marginTop: 4 }}>{value}</p>
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

export default function GroupDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [switching, setSwitching] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/group/overview')
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.message || 'Could not load the group dashboard'))
      .finally(() => setLoading(false))
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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: '#1a1814', marginBottom: 4 }}>Group Dashboard</h1>
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
      </div>
      <ChairmanAssistantWidget />
    </Layout>
  )
}