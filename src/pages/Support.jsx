import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Support & Help
   Contact info + meeting links + two-way ticket threads with the
   EnrollIQ team, open until resolved.
   ═══════════════════════════════════════════════════════════════ */

// TODO: replace these with your real support details / meeting links
const SUPPORT_EMAIL   = 'support@enrolliq.io'
const SUPPORT_PHONE   = '+91 00000 00000'
const WHATSAPP_NUMBER = '910000000000'
const MEETING_LINK    = 'https://cal.com/enrolliq/support-call'
const HELP_CENTRE_URL = 'https://enrolliq.io/help'

const STATUS_STYLE = {
  new:         { bg:'#fef3c7', color:'#92400e', label:'Open' },
  in_progress: { bg:'#dbeafe', color:'#1e40af', label:'In progress' },
  resolved:    { bg:'#dcfce7', color:'#15803d', label:'Resolved' },
}

function ContactCard({ icon, title, value, href }) {
  return (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
      style={{ display:'flex', gap:14, alignItems:'flex-start', background:'white', borderRadius:16,
        padding:18, border:'1px solid #f0ede8', textDecoration:'none', color:'inherit' }}>
      <div style={{ fontSize:24 }}>{icon}</div>
      <div>
        <p style={{ fontSize:13, color:'#9ca3af', marginBottom:2 }}>{title}</p>
        <p style={{ fontSize:15, fontWeight:600, color:'#1a1814' }}>{value}</p>
      </div>
    </a>
  )
}

// Chat bubble thread — reused for both the school's own view here
function Bubble({ msg }) {
  const mine = msg.sender_role === 'school'
  return (
    <div style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom:10 }}>
      <div style={{ maxWidth:'75%' }}>
        <div style={{
          background: mine ? '#1a1814' : '#f3f4f6',
          color: mine ? 'white' : '#1a1814',
          borderRadius: 14,
          borderBottomRightRadius: mine ? 4 : 14,
          borderBottomLeftRadius: mine ? 14 : 4,
          padding: '10px 14px', fontSize: 14,
        }}>
          {msg.message}
        </div>
        <p style={{ fontSize:11, color:'#9ca3af', marginTop:3, textAlign: mine ? 'right' : 'left' }}>
          {mine ? 'You' : (msg.sender_name || 'EnrollIQ Support')} · {new Date(msg.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
        </p>
      </div>
    </div>
  )
}

function ThreadModal({ ticketId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const load = () => {
    api.get(`/support/${ticketId}/messages`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [ticketId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [data])

  const handleSend = async () => {
    if (!draft.trim()) return
    setSending(true)
    try {
      await api.post(`/support/${ticketId}/messages`, { message: draft.trim() })
      setDraft('')
      load()
    } catch {} finally { setSending(false) }
  }

  const st = data ? (STATUS_STYLE[data.ticket.status] || STATUS_STYLE.new) : null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:560, maxHeight:'85vh',
        display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>

        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0ede8', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontWeight:700, color:'#1a1814' }}>{data?.ticket.subject || 'Loading…'}</p>
            {st && <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:999, background:st.bg, color:st.color }}>{st.label}</span>}
          </div>
          <button onClick={onClose} style={{ fontSize:22, color:'#9ca3af', background:'none', border:'none', cursor:'pointer' }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
          {loading ? <p style={{ fontSize:13, color:'#9ca3af' }}>Loading…</p>
           : (data?.messages || []).map(m => <Bubble key={m.id} msg={m} />)}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding:'12px 16px', borderTop:'1px solid #f0ede8', display:'flex', gap:8 }}>
          <textarea rows={1} value={draft} onChange={e => setDraft(e.target.value)}
            placeholder={data?.ticket.status === 'resolved' ? 'Reply to reopen this ticket…' : 'Type a message…'}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:10, padding:'10px 12px', fontSize:14, resize:'none' }} />
          <button onClick={handleSend} disabled={sending || !draft.trim()} className="btn-primary"
            style={{ opacity: (sending || !draft.trim()) ? 0.6 : 1 }}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Support() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [tickets, setTickets] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [openTicket, setOpenTicket] = useState(null)

  const loadTickets = () => {
    setLoadingList(true)
    api.get('/support/my-messages').then(r => setTickets(r.data || []))
      .catch(() => {}).finally(() => setLoadingList(false))
  }
  useEffect(loadTickets, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSending(true); setError(''); setSent(false)
    try {
      await api.post('/support/message', { subject, message, email: email || undefined, phone: phone || undefined })
      setSent(true)
      setSubject(''); setMessage(''); setEmail(''); setPhone('')
      loadTickets()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message — try again in a moment.')
    } finally { setSending(false) }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <h1 className="font-serif" style={{ fontSize:28, fontWeight:700, color:'#1a1814', marginBottom:4 }}>
          Support & Help
        </h1>
        <p style={{ color:'#9ca3af', marginBottom:24 }}>
          Questions, issues, or need something set up — we're here.
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14, marginBottom:14 }}>
          <ContactCard icon="✉️" title="Email us" value={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
          <ContactCard icon="📞" title="Call us" value={SUPPORT_PHONE} href={`tel:${SUPPORT_PHONE.replace(/\s/g,'')}`} />
          <ContactCard icon="💬" title="WhatsApp" value="Chat with support" href={`https://wa.me/${WHATSAPP_NUMBER}`} />
          <ContactCard icon="📚" title="Help centre" value="Browse guides & FAQs" href={HELP_CENTRE_URL} />
        </div>

        <div style={{ background:'#eff6ff', borderRadius:16, padding:20, marginBottom:24,
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <p style={{ fontWeight:700, color:'#1a1814', marginBottom:4 }}>📅 Want to talk it through?</p>
            <p style={{ fontSize:13, color:'#6b7280' }}>Book a short call with our team.</p>
          </div>
          <a href={MEETING_LINK} target="_blank" rel="noreferrer" className="btn-primary" style={{ whiteSpace:'nowrap' }}>
            Book a call →
          </a>
        </div>

        <div style={{ background:'white', borderRadius:16, padding:20, border:'1px solid #f0ede8', marginBottom:24 }}>
          <h2 style={{ fontWeight:700, color:'#1a1814', marginBottom:14 }}>Start a new conversation</h2>
          {sent && <div style={{ background:'#f0fdf4', color:'#15803d', fontSize:13, padding:'10px 14px', borderRadius:10, marginBottom:14 }}>
            ✅ Sent — our team will get back to you soon. Continue the conversation below once they reply.
          </div>}
          {error && <div style={{ background:'#fef2f2', color:'#dc2626', fontSize:13, padding:'10px 14px', borderRadius:10, marginBottom:14 }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <input className="input" placeholder="What's this about?" value={subject}
              onChange={e => setSubject(e.target.value)} required />
            <textarea className="input" placeholder="Tell us what's going on..." rows={4} value={message}
              onChange={e => setMessage(e.target.value)} required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <input className="input" type="email" placeholder="Your email (optional)" value={email}
                onChange={e => setEmail(e.target.value)} />
              <input className="input" type="tel" placeholder="Your phone (optional)" value={phone}
                onChange={e => setPhone(e.target.value)} />
            </div>
            <button type="submit" disabled={sending} className="btn-primary" style={{ alignSelf:'flex-start' }}>
              {sending ? 'Sending…' : 'Start conversation'}
            </button>
          </form>
        </div>

        <div style={{ background:'white', borderRadius:16, padding:20, border:'1px solid #f0ede8' }}>
          <h2 style={{ fontWeight:700, color:'#1a1814', marginBottom:14 }}>Your conversations</h2>
          {loadingList ? <p style={{ fontSize:13, color:'#9ca3af' }}>Loading…</p>
           : tickets.length === 0 ? <p style={{ fontSize:13, color:'#9ca3af' }}>No conversations yet.</p>
           : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {tickets.map(t => {
                const st = STATUS_STYLE[t.status] || STATUS_STYLE.new
                return (
                  <button key={t.id} onClick={() => setOpenTicket(t.id)}
                    style={{ textAlign:'left', background:'#fafafa', border:'1px solid #f0ede8', borderRadius:12,
                      padding:'12px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', gap:12, alignItems:'center' }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:2 }}>
                        <p style={{ fontWeight:600, color:'#1a1814' }}>{t.subject}</p>
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999, background:st.bg, color:st.color, whiteSpace:'nowrap' }}>{st.label}</span>
                      </div>
                      <p style={{ fontSize:13, color:'#6b7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.last_sender === 'superadmin' ? '↩️ ' : ''}{t.last_message}
                      </p>
                    </div>
                    <span style={{ fontSize:12, color:'#9ca3af', whiteSpace:'nowrap' }}>{t.message_count} msg{t.message_count!==1?'s':''}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {openTicket && <ThreadModal ticketId={openTicket} onClose={() => { setOpenTicket(null); loadTickets() }} />}
    </Layout>
  )
}