import { useState, useRef, useEffect } from 'react'
import api from '../api/axios'

/**
 * Chairman Assistant — same UI pattern as AssistantWidget.jsx, but asks
 * /api/group/assistant/ask instead of /api/assistant/ask, so it can answer
 * about any branch in the chairman's group, not just one school.
 */
const AMBER = '#b45309'

export default function ChairmanAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm your Chairman Assistant. Ask me about any branch, or compare them — e.g. \"Which branch has the most pending fees?\"" },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setMessages(m => [...m, { role: 'user', text: q }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/group/assistant/ask', { question: q })
      const prefix = res.data.branch ? `📍 ${res.data.branch}\n\n` : ''
      setMessages(m => [...m, { role: 'bot', text: prefix + res.data.answer }])
    } catch (e) {
      const msg = e.response?.data?.gated
        ? "The AI Assistant isn't included in your current plan."
        : "Sorry, I couldn't answer that right now."
      setMessages(m => [...m, { role: 'bot', text: msg }])
    } finally { setLoading(false) }
  }

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const suggestions = ['How are we doing today, across all branches?', 'Which branch has the most pending fees?', 'How is Kazipet doing this month?']

  return (
    <>
      {/* floating button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ position:'fixed', bottom:24, right:24, width:56, height:56, borderRadius:'50%',
          background:AMBER, color:'#fff', border:'none', fontSize:24, cursor:'pointer',
          boxShadow:'0 6px 20px rgba(180,83,9,0.4)', zIndex:900 }}
        title="Ask the Chairman Assistant">
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div style={{ position:'fixed', bottom:92, right:24, width:370, maxWidth:'calc(100vw - 48px)',
          height:520, maxHeight:'calc(100vh - 140px)', background:'#fff', borderRadius:16,
          boxShadow:'0 12px 48px rgba(0,0,0,0.25)', display:'flex', flexDirection:'column',
          overflow:'hidden', zIndex:900, border:'1px solid #e5e7eb' }}>
          {/* header */}
          <div style={{ background:AMBER, color:'#fff', padding:'14px 16px' }}>
            <div style={{ fontWeight:700, fontSize:15 }}>Chairman Assistant</div>
            <div style={{ fontSize:11, opacity:0.9 }}>Read-only · answers across every branch in your group</div>
          </div>

          {/* messages */}
          <div style={{ flex:1, overflowY:'auto', padding:16, background:'#f9fafb' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start', marginBottom:10 }}>
                <div style={{ maxWidth:'82%', padding:'9px 13px', borderRadius:12, fontSize:13, lineHeight:1.5,
                  whiteSpace:'pre-wrap',
                  background: m.role==='user' ? AMBER : '#fff',
                  color: m.role==='user' ? '#fff' : '#1f2937',
                  border: m.role==='user' ? 'none' : '1px solid #e5e7eb' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:10 }}>
                <div style={{ padding:'9px 13px', borderRadius:12, fontSize:13, background:'#fff', border:'1px solid #e5e7eb', color:'#9ca3af' }}>
                  Checking every branch…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* suggestions (only before first user message) */}
          {messages.filter(m=>m.role==='user').length === 0 && (
            <div style={{ padding:'0 12px 8px', display:'flex', gap:6, flexWrap:'wrap' }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:20, border:'1px solid #fde9c8',
                    background:'#fffbeb', color:'#92400e', cursor:'pointer' }}>{s}</button>
              ))}
            </div>
          )}

          {/* input */}
          <div style={{ padding:12, borderTop:'1px solid #eee', display:'flex', gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Ask about any branch…"
              style={{ flex:1, border:'1.5px solid #e5e7eb', borderRadius:10, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit' }} />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ background:AMBER, color:'#fff', border:'none', borderRadius:10, padding:'0 16px',
                fontSize:14, fontWeight:600, cursor: loading?'default':'pointer', opacity: (loading||!input.trim())?0.5:1 }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}