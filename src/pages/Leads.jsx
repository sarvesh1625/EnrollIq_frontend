import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AIScoreBadge from '../components/AIScoreBadge'
import { getLeads } from '../api/leads'

const STATUS_FILTERS = ['All','New','Contacted','Campus Visit','Admission','Lost']
const LABEL_FILTERS  = ['All','Hot','Warm','Cold']

const STATUS_STYLE = {
  New:            { bg:'#f3f4f6', c:'#6b7280' },
  Contacted:      { bg:'var(--c-blue-lt)',  c:'var(--c-blue)' },
  'Campus Visit': { bg:'var(--c-amber-lt)', c:'var(--c-amber)' },
  Admission:      { bg:'var(--c-green-lt)', c:'var(--c-green)' },
  Lost:           { bg:'var(--c-red-lt)',   c:'var(--c-red)' },
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 3600)  return `${Math.floor(d/60)}m`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

export default function Leads() {
  const navigate = useNavigate()
  const [leads,   setLeads]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [labelFilter,  setLabelFilter]  = useState('All')
  const [error,   setError]   = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (statusFilter !== 'All') params.status   = statusFilter
      if (labelFilter  !== 'All') params.ai_label = labelFilter
      if (search.trim())          params.search   = search.trim()
      const res = await getLeads(params)
      setLeads(res.data.leads || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      setError('Could not load leads. Check the backend connection.')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, labelFilter])
  useEffect(() => {
    const t = setTimeout(load, 450)
    return () => clearTimeout(t)
  }, [search])

  return (
    <Layout>
      <div className="page">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0 }}>Leads</h1>
            <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>{total} total {total === 1 ? 'lead' : 'leads'}</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/leads/new')}>+ Add lead</button>
        </div>

        {error && (
          <div style={{ background:'var(--c-amber-lt)', color:'var(--c-amber)', fontSize:13, padding:'10px 14px', borderRadius:10, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" style={{ maxWidth:260 }}
            placeholder="Search name, phone, grade..."
            value={search} onChange={e => setSearch(e.target.value)} />

          <div style={{ display:'flex', gap:3, background:'white', border:'1px solid var(--c-border-2)', borderRadius:8, padding:3, overflowX:'auto' }}>
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ fontSize:11, fontWeight:500, padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer', whiteSpace:'nowrap',
                  background: statusFilter === s ? 'var(--c-ink)' : 'transparent',
                  color: statusFilter === s ? 'white' : 'var(--c-ink-2)' }}>
                {s}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', gap:3, background:'white', border:'1px solid var(--c-border-2)', borderRadius:8, padding:3 }}>
            {LABEL_FILTERS.map(l => (
              <button key={l} onClick={() => setLabelFilter(l)}
                style={{ fontSize:11, fontWeight:500, padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer',
                  background: labelFilter === l ? 'var(--c-ink)' : 'transparent',
                  color: labelFilter === l ? 'white' : 'var(--c-ink-2)' }}>
                {l}
  []            </button>
            ))}
          </div>
        </div>

        {/* Leads list — row cards (clean on mobile + desktop) */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {/* Column header (desktop only) */}
          <div className="hide-md" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 100px 110px 60px', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--c-border)', background:'var(--c-surface-2)' }}>
            {['Parent','Phone','Grade','AI Score','Status','Added'].map(h => (
              <span key={h} style={{ fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:56, color:'var(--c-muted)' }}>
              <div style={{ width:28, height:28, border:'3px solid #f0ede8', borderTop:'3px solid var(--c-brand)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
              Loading leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <p className="empty-title">No leads found</p>
              <p className="empty-sub">{search || statusFilter !== 'All' || labelFilter !== 'All' ? 'Try clearing your filters' : 'Add your first lead to get started'}</p>
              {!search && statusFilter === 'All' && labelFilter === 'All' && (
                <button className="btn-primary" style={{ marginTop:14 }} onClick={() => navigate('/leads/new')}>+ Add first lead</button>
              )}
            </div>
          ) : (
            <div>
              {leads.map((lead, i) => {
                const st = STATUS_STYLE[lead.status] || STATUS_STYLE.New
                return (
                  <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}
                    className="lead-row"
                    style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 100px 110px 60px', gap:12, alignItems:'center',
                      padding:'14px 20px', cursor:'pointer', borderBottom: i < leads.length-1 ? '1px solid #faf9f7' : 'none', transition:'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--c-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                    {/* Parent (always visible) */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--c-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--c-ink-2)', flexShrink:0 }}>
                        {lead.parent_name?.[0]}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.parent_name}</p>
                        {/* On mobile, show phone + grade here under the name */}
                        <p className="show-md-only" style={{ fontSize:11, color:'var(--c-muted)', margin:'2px 0 0', display:'none' }}>
                          {lead.phone} · {lead.child_grade}
                        </p>
                      </div>
                    </div>

                    {/* Phone */}
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{lead.phone}</span>
                    {/* Grade */}
                    <span className="hide-md" style={{ fontSize:12, color:'var(--c-ink-2)' }}>{lead.child_grade}</span>
                    {/* AI Score */}
                    <div className="hide-sm"><AIScoreBadge score={lead.ai_score} label={lead.ai_label} /></div>
                    {/* Status */}
                    <span className="badge" style={{ background:st.bg, color:st.c, justifySelf:'start' }}>{lead.status}</span>
                    {/* Added */}
                    <span className="hide-sm" style={{ fontSize:11, color:'var(--c-muted)', textAlign:'right' }}>{timeAgo(lead.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: collapse grid to name + status only, show phone/grade under name */}
      <style>{`
        @media (max-width: 768px) {
          .lead-row { grid-template-columns: 1fr auto !important; }
          .lead-row .show-md-only { display: block !important; }
        }
      `}</style>
    </Layout>
  )
}