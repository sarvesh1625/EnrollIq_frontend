import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AIScoreBadge from '../components/AIScoreBadge'
import { getLeads, updateLeadStatus } from '../api/leads'
import { useAuth } from '../context/AuthContext'

const COLUMNS = {
  New:            { label:'New',          borderColor:'#9ca3af', badgeBg:'#f3f4f6',  badgeText:'#4b5563'  },
  Contacted:      { label:'Contacted',    borderColor:'#60a5fa', badgeBg:'#eff6ff',  badgeText:'#2563eb'  },
  'Campus Visit': { label:'Campus Visit', borderColor:'#fbbf24', badgeBg:'#fffbeb',  badgeText:'#b45309'  },
  Admission:      { label:'Admission',    borderColor:'#22c55e', badgeBg:'#f0fdf4',  badgeText:'#15803d'  },
  Lost:           { label:'Lost',         borderColor:'#f87171', badgeBg:'#fef2f2',  badgeText:'#dc2626'  },
}

export default function Pipeline() {
  const navigate  = useNavigate()
  const { user } = useAuth()
  // a counsellor (not admin) works their own leads; admin sees everything
  const leadParams = user?.is_counsellor && user?.role !== 'admin' ? { limit: 200, assigned_to: 'me' } : { limit: 200 }
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [dragging,setDragging]= useState(null)
  const [dragOver,setDragOver]= useState(null)
  const [updating,setUpdating]= useState(null)
  const [pending, setPending] = useState(null)   // { lead, col } waiting for a note
  const [pNote,   setPNote]   = useState('')
  const [pError,  setPError]  = useState('')

  useEffect(() => {
    getLeads(leadParams)
      .then(res => setLeads(res.data.leads || []))
      .catch(() => setLeads([
        { id:1, parent_name:'Sunita Reddy',   child_grade:'Grade 4', lead_source:'Google Ads', ai_score:91, ai_label:'Hot',  status:'Campus Visit' },
        { id:2, parent_name:'Mohan Kumar',    child_grade:'Grade 1', lead_source:'WhatsApp',   ai_score:72, ai_label:'Warm', status:'Contacted'    },
        { id:3, parent_name:'Priya Patel',    child_grade:'Grade 6', lead_source:'Form',       ai_score:45, ai_label:'Cold', status:'New'          },
        { id:4, parent_name:'Ravi Shankar',   child_grade:'Grade 3', lead_source:'Google Ads', ai_score:88, ai_label:'Hot',  status:'Contacted'    },
        { id:5, parent_name:'Anitha Lakshmi', child_grade:'Grade 8', lead_source:'Facebook',   ai_score:60, ai_label:'Warm', status:'New'          },
        { id:6, parent_name:'Deepak Nair',    child_grade:'Grade 2', lead_source:'Google Ads', ai_score:95, ai_label:'Hot',  status:'Admission'    },
      ]))
      .finally(() => setLoading(false))
  }, [])

  const colLeads = (col) => leads.filter(l => l.status === col)

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragStart = (e, lead) => {
    setDragging(lead)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver  = (e, col)  => { e.preventDefault(); setDragOver(col) }
  const onDragLeave = ()        => setDragOver(null)

  const askMove = (lead, col) => { setPending({ lead, col }); setPNote(''); setPError('') }

  const onDrop = (col) => {
    setDragOver(null)
    if (!dragging || dragging.status === col) { setDragging(null); return }
    askMove(dragging, col); setDragging(null)
  }

  // Touch drag (mobile)
  const onTouchStart = (lead) => setDragging(lead)
  const onTouchEnd   = (col) => {
    if (!dragging || dragging.status === col) { setDragging(null); return }
    askMove(dragging, col); setDragging(null)
  }

  // The stage only changes after the note is saved
  const confirmMove = async () => {
    if (pNote.trim().length < 3) { setPError('Please write a short note before moving the stage'); return }
    const { lead, col } = pending
    setUpdating(lead.id); setPError('')
    try {
      await updateLeadStatus(lead.id, col, pNote.trim())
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: col } : l))
      setPending(null)
    } catch (e) { setPError(e.response?.data?.message || 'Could not move the lead') }
    finally { setUpdating(null) }
  }

  const totalLeads = leads.length

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pipeline-header-row">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">Pipeline</h1>
            <p className="text-gray-400 text-sm mt-1">
              {totalLeads} leads · Drag cards to update status
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => getLeads(leadParams).then(r=>setLeads(r.data.leads||[])).catch(()=>{})}
              className="btn-ghost text-sm">↻ Refresh</button>
            <button onClick={() => navigate('/leads/new')} className="btn-primary">+ Add lead</button>
          </div>
        </div>

        {/* One scroll area; funnel and board share the same 5-column grid so they line up */}
        <div style={{ overflowX:'auto', paddingBottom:12 }}>
        <div style={{ minWidth:998 }}>

        {/* Funnel summary bar */}
        <div className="funnel-bar" style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(190px, 1fr))', gap:12, marginBottom:20 }}>
          {Object.entries(COLUMNS).map(([key, col]) => {
            const count = colLeads(key).length
            const pct   = totalLeads > 0 ? Math.round((count/totalLeads)*100) : 0
            return (
              <div key={key} className="text-center" style={{ minWidth:0 }}>
                <div className="text-lg font-bold text-ink">{count}</div>
                <div className="text-xs text-gray-400 mb-1">{col.label}</div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width:`${pct}%`, background: col.borderColor }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Kanban board */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading pipeline...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(190px, 1fr))', gap:12, minHeight:'65vh', alignItems:'start' }}>
            {Object.entries(COLUMNS).map(([colKey, colMeta]) => {
              const cards  = colLeads(colKey)
              const isOver = dragOver === colKey

              return (
                <div key={colKey}
                  style={{ minWidth:0, display:'flex', flexDirection:'column', borderRadius:12,
                    background: isOver ? '#fdf0ea' : '#f8f6f1',
                    transition:'background 0.15s',
                    border: isOver ? '2px dashed #d4521a' : '2px dashed transparent',
                  }}
                  onDragOver={e => onDragOver(e, colKey)}
                  onDragLeave={onDragLeave}
                  onDrop={() => onDrop(colKey)}
                  onTouchEnd={() => onTouchEnd(colKey)}
                >
                  {/* Column header */}
                  <div style={{
                    borderTop:`3px solid ${colMeta.borderColor}`,
                    background:'white', borderRadius:'10px 10px 0 0',
                    padding:'12px 14px', borderBottom:'1px solid #f3f4f6'
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>{colMeta.label}</span>
                      <span style={{
                        fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                        background: colMeta.badgeBg, color: colMeta.badgeText
                      }}>{cards.length}</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div style={{ flex:1, padding:10, display:'flex', flexDirection:'column', gap:8, minHeight:120 }}>
                    {cards.map(lead => (
                      <div key={lead.id}
                        draggable
                        onDragStart={e => onDragStart(e, lead)}
                        onTouchStart={() => onTouchStart(lead)}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        style={{
                          background:'white',
                          border:`1px solid ${updating === lead.id ? '#d4521a' : '#f3f4f6'}`,
                          borderRadius:10, padding:'10px 12px',
                          cursor:'grab', transition:'all 0.15s',
                          opacity: dragging?.id === lead.id ? 0.4 : 1,
                          boxShadow: updating === lead.id ? '0 0 0 2px #fdf0ea' : 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = updating === lead.id ? '0 0 0 2px #fdf0ea' : 'none' }}
                      >
                        {/* Avatar + name */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <div style={{
                            width:28, height:28, borderRadius:'50%', background:'#f0ece3',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:12, fontWeight:700, color:'#6b7280', flexShrink:0
                          }}>
                            {lead.parent_name?.[0]}
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, color:'#1a1814', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {lead.parent_name}
                          </span>
                        </div>

                        {/* Grade + source */}
                        <p style={{ fontSize:11, color:'#9ca3af', marginBottom:8 }}>
                          {lead.child_grade} · {lead.lead_source}
                        </p>

                        {/* AI Badge */}
                        <AIScoreBadge score={lead.ai_score} label={lead.ai_label} />

                        {updating === lead.id && (
                          <p style={{ fontSize:10, color:'#d4521a', marginTop:6 }}>Updating...</p>
                        )}
                      </div>
                    ))}

                    {/* Empty state */}
                    {cards.length === 0 && (
                      <div style={{
                        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                        minHeight:80, borderRadius:8, border:'2px dashed',
                        borderColor: isOver ? '#d4521a' : '#e5e7eb',
                        color: isOver ? '#d4521a' : '#d1d5db',
                        fontSize:12,
                      }}>
                        {isOver ? 'Drop here' : 'No leads'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .pipeline-header-row { flex-direction: column; align-items: flex-start !important; gap: 14px; }
          .pipeline-header-row > div:last-child { width: 100%; }
          .pipeline-header-row > div:last-child button { flex: 1; }
        }
      `}</style>

      {pending && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPending(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-xl font-bold text-ink mb-1">Move {pending.lead.parent_name}</h2>
            <p className="text-xs text-gray-500 mb-3"><b>{pending.lead.status}</b> to <b>{pending.col}</b>. A note is required.</p>
            <textarea className="input text-sm" rows={3} autoFocus style={{ width:'100%', resize:'vertical' }}
              placeholder="e.g. Parent confirmed visit on Saturday"
              value={pNote} onChange={e => setPNote(e.target.value)} />
            {pError && <p className="text-xs text-red-500 mt-1">{pError}</p>}
            <div className="flex gap-2 mt-3 justify-end">
              <button className="btn-ghost text-sm" onClick={() => setPending(null)}>Cancel</button>
              <button className="btn-primary text-sm" onClick={confirmMove} disabled={updating === pending.lead.id}>Move</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}