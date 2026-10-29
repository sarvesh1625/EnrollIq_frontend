import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN')

function Stat({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 16, flex: '1 1 150px', minWidth: 150 }}>
      <p style={{ fontSize: 12, color: 'var(--c-muted)', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 0', color: color || 'inherit' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--c-muted)', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

export default function ChairmanDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    api.get('/branches/overview').then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.message || 'Could not load branches'))
  }, [])

  const openBranch = async (id) => {
    setBusy(id)
    try {
      await api.put('/branches/switch', { school_id: id })
      window.location.href = '/dashboard' // full reload so every screen uses the new branch
    } catch (e) { setErr(e.response?.data?.message || 'Could not switch branch'); setBusy(null) }
  }

  const t = data?.totals
  return (
    <Layout>
      <div style={{ padding: 20, maxWidth: 1200 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Chairman dashboard</h1>
        <p style={{ color: 'var(--c-muted)', margin: '4px 0 18px', fontSize: 13 }}>
          Welcome, {user?.name}. All branches in your group at a glance.
        </p>
        {err && <p style={{ color: 'var(--c-red)' }}>{err}</p>}
        {!data && !err && <p style={{ color: 'var(--c-muted)' }}>Loading…</p>}
        {data && (<>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <Stat label="Branches" value={t.branches} />
            <Stat label="Students" value={t.students} />
            <Stat label="Leads" value={t.leads} sub={`${t.leads_30d} in last 30 days`} />
            <Stat label="Admitted" value={t.admitted} sub={`${t.conversion}% conversion`} />
            <Stat label="Fees collected" value={inr(t.fee_collected)} color="#059669" />
            <Stat label="Fees pending" value={inr(t.fee_pending)} sub={`${inr(t.fee_overdue)} overdue`} color="#d97706" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {data.branches.map(b => (
              <div key={b.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{b.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-muted)' }}>{b.city || '—'}</p>
                  </div>
                  {b.is_main_branch && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 99 }}>Main</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', margin: '14px 0', fontSize: 13 }}>
                  <span>Students<br /><b>{b.students}</b></span>
                  <span>Leads<br /><b>{b.leads}</b> <small style={{ color: 'var(--c-muted)' }}>(+{b.leads_30d})</small></span>
                  <span>Admitted<br /><b>{b.admitted}</b> <small style={{ color: 'var(--c-muted)' }}>{b.conversion}%</small></span>
                  <span>Attendance today<br /><b>{b.attendance_pct == null ? 'Not marked' : b.attendance_pct + '%'}</b></span>
                  <span>Collected<br /><b>{inr(b.fee_collected)}</b></span>
                  <span>Pending<br /><b style={{ color: b.fee_overdue ? '#dc2626' : 'inherit' }}>{inr(b.fee_pending)}</b></span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy === b.id} onClick={() => openBranch(b.id)}>
                  {busy === b.id ? 'Opening…' : 'Open branch →'}
                </button>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </Layout>
  )
}