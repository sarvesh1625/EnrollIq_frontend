import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AIScoreBadge from '../components/AIScoreBadge'
import { getLead, updateLeadStatus, updateLead } from '../api/leads'
import api from '../api/axios'

const STATUSES = ['New','Contacted','Campus Visit','Admission','Lost']
const STATUS_STYLE = {
  New:'bg-gray-100 text-gray-600', Contacted:'bg-blue-50 text-blue-600',
  'Campus Visit':'bg-amber-50 text-amber-700', Admission:'bg-green-50 text-green-700', Lost:'bg-red-50 text-red-500'
}

const MOCK = {
  id:1, parent_name:'Sunita Reddy', phone:'9876543210', email:'sunita@gmail.com',
  child_grade:'Grade 4', lead_source:'Google Ads', keyword:'best school madhapur',
  ai_score:91, ai_label:'Hot', status:'Campus Visit', area:'Madhapur',
  notes:'Parent is very interested. Child currently in private school nearby.',
  created_at:'2026-04-03T08:12:00Z',
  interactions:[
    { id:1, type:'WhatsApp', notes:'AI sent welcome message. Parent replied — Grade 4.', created_at:'2026-04-03T08:13:00Z' },
    { id:2, type:'AI Chat',  notes:'Parent selected "Book campus visit". Visit confirmed Saturday 10 AM.', created_at:'2026-04-03T08:15:00Z' },
    { id:3, type:'Call',     notes:'Staff called to confirm visit. Parent confirmed.', created_at:'2026-04-03T09:00:00Z' },
  ]
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return new Date(iso).toLocaleDateString('en-IN')
}

function ScoreBar({ label, value, max=20, color='bg-brand-500' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width:`${(value/max)*100}%` }} />
      </div>
      <span className="text-xs font-medium text-ink w-6 text-right">+{value}</span>
    </div>
  )
}

export default function LeadDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [lead,     setLead]     = useState(MOCK)
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [noteType, setNoteType] = useState('Note')

  useEffect(() => {
    getLead(id)
      .then(res => setLead(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (newStatus) => {
    try {
      await updateLeadStatus(id, newStatus)
      setLead(prev => ({ ...prev, status: newStatus }))
    } catch { setLead(prev => ({ ...prev, status: newStatus })) }
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    const newInteraction = { id: Date.now(), type: noteType, notes: note, created_at: new Date().toISOString() }
    try {
      await api.post(`/leads/${id}/interactions`, { type: noteType, notes: note })
    } catch {}
    setLead(prev => ({ ...prev, interactions: [...(prev.interactions||[]), newInteraction] }))
    setNote('')
    setSaving(false)
  }

  const scoreBreakdown = [
    { label:'Base score',    value:40, max:40, color:'bg-gray-300' },
    { label:'Source',        value:lead.lead_source==='Google Ads'?20:lead.lead_source==='Referral'?18:lead.lead_source==='WhatsApp'?15:5, max:20, color:'bg-blue-400' },
    { label:'Has email',     value:lead.email?8:0, max:8, color:'bg-green-400' },
    { label:'Grade demand',  value:['Grade 1','Grade 9','Grade 10','Pre-KG','LKG','UKG'].includes(lead.child_grade)?12:0, max:12, color:'bg-amber-400' },
    { label:'Keyword',       value:lead.keyword?10:0, max:10, color:'bg-purple-400' },
    { label:'Area signal',   value:lead.area?5:0, max:5, color:'bg-pink-400' },
  ]

  return (
    <Layout>
      <div className="page" style={{maxWidth:1100}}>
        <button onClick={() => navigate('/leads')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-ink mb-6 transition-colors">
          ← Back to leads
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 lead-header-row">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-2xl font-bold text-brand-600 font-serif">
              {lead.parent_name?.[0]}
            </div>
            <div>
              <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">{lead.parent_name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-gray-400">{lead.phone}</span>
                {lead.email && <><span className="text-gray-200">·</span><span className="text-sm text-gray-400">{lead.email}</span></>}
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">Added {timeAgo(lead.created_at)}</span>
              </div>
            </div>
          </div>
          <AIScoreBadge score={lead.ai_score} label={lead.ai_label} />
        </div>

        <div className="grid grid-cols-3 gap-6 lead-detail-grid">
          {/* Left */}
          <div className="col-span-2 flex flex-col gap-5">

            {/* Lead details */}
            <div className="card">
              <h2 className="font-semibold text-ink text-sm mb-4">Lead details</h2>
              <div className="grid grid-cols-2 gap-4 g-2">
                {[
                  { label:'Child grade',  value: lead.child_grade  },
                  { label:'Area',         value: lead.area || '—'  },
                  { label:'Lead source',  value: lead.lead_source  },
                  { label:'Keyword',      value: lead.keyword || '—' },
                  { label:'Status',       value: lead.status        },
                  { label:'School',       value: lead.school_name || '—' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="label">{f.label}</p>
                    <p className="text-sm text-ink">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status pipeline */}
            <div className="card">
              <h2 className="font-semibold text-ink text-sm mb-4">Pipeline status</h2>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => handleStatusChange(s)}
                    className={`text-xs px-4 py-2 rounded-full border transition-all ${
                      lead.status === s
                        ? 'bg-ink text-white border-ink font-medium'
                        : 'border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-0 mt-4">
                {STATUSES.map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`flex-1 h-1 ${i <= STATUSES.indexOf(lead.status) ? 'bg-brand-500' : 'bg-gray-100'}`} />
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i <= STATUSES.indexOf(lead.status) ? 'bg-brand-500' : 'bg-gray-200'}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="card">
                <h2 className="font-semibold text-ink text-sm mb-3">Notes</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{lead.notes}</p>
              </div>
            )}

            {/* Interaction history */}
            <div className="card">
              <h2 className="font-semibold text-ink text-sm mb-4">Interaction history</h2>
              <div className="flex flex-col gap-3 mb-5">
                {(lead.interactions || []).map(i => (
                  <div key={i.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      i.type==='WhatsApp'?'bg-green-50 text-green-700':
                      i.type==='Call'?'bg-blue-50 text-blue-700':
                      i.type==='AI Chat'?'bg-purple-50 text-purple-700':
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {i.type[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-ink">{i.type}</span>
                        <span className="text-xs text-gray-400">{timeAgo(i.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{i.notes}</p>
                    </div>
                  </div>
                ))}
                {(!lead.interactions || lead.interactions.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No interactions yet</p>
                )}
              </div>

              {/* Add note */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <select className="input w-32 flex-shrink-0 text-xs" value={noteType} onChange={e => setNoteType(e.target.value)}>
                  {['Note','Call','WhatsApp','Email','Visit'].map(t => <option key={t}>{t}</option>)}
                </select>
                <input type="text" className="input flex-1 text-sm"
                  placeholder="Add a note or log interaction..."
                  value={note} onChange={e => setNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote()} />
                <button onClick={addNote} disabled={saving} className="btn-primary px-4">
                  {saving ? '...' : 'Add'}
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">
            {/* Quick actions */}
            <div className="card flex flex-col gap-2">
              <h2 className="font-semibold text-ink text-sm mb-1">Quick actions</h2>
              <a href={`tel:${lead.phone}`}
                className="flex items-center gap-2 btn-ghost w-full text-sm justify-center">
                📞 Call parent
              </a>
              <a href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 btn-ghost w-full text-sm justify-center">
                💬 WhatsApp
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 btn-ghost w-full text-sm justify-center">
                  ✉️ Send email
                </a>
              )}
              <button onClick={() => navigate('/admissions')}
                className="btn-primary w-full text-sm justify-center">
                ✓ Convert to Admission
              </button>
            </div>

            {/* AI Score breakdown */}
            <div className="card">
              <h2 className="font-semibold text-ink text-sm mb-3">AI score breakdown</h2>
              <div className={`text-center py-3 rounded-xl mb-4 ${
                lead.ai_label==='Hot'?'bg-red-50':lead.ai_label==='Warm'?'bg-amber-50':'bg-blue-50'
              }`}>
                <p className={`font-serif text-4xl font-bold ${
                  lead.ai_label==='Hot'?'text-red-600':lead.ai_label==='Warm'?'text-amber-700':'text-blue-600'
                }`}>{lead.ai_score}</p>
                <p className="text-xs text-gray-500 mt-1">{lead.ai_label} lead · out of 100</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {scoreBreakdown.map(s => <ScoreBar key={s.label} {...s} />)}
              </div>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                {lead.ai_label==='Hot' ? '🔥 High priority — contact immediately before competitor.' :
                 lead.ai_label==='Warm'? '⚡ Nurture this lead — schedule a follow-up call.' :
                 '❄️ Low intent — add to nurture sequence.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    
      <style>{`
        @media (max-width: 900px) {
          .lead-detail-grid { grid-template-columns: 1fr !important; }
          .lead-detail-grid > div:first-child { grid-column: span 1 !important; }
        }
        @media (max-width: 640px) {
          .lead-header-row { flex-direction: column; align-items: flex-start !important; gap: 14px; }
        }
      `}</style>
</Layout>
  )
}