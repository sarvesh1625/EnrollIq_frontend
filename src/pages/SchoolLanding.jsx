import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'

const BASE = 'http://localhost:5000'

// ── Chatbot ───────────────────────────────────────────────────────────────────
function Chatbot({ school }) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([
    { role:'assistant', content:`Hi! 👋 I'm the admissions assistant for **${school.name}**. Ask me anything about our school — fees, admission process, facilities, or to book a campus visit!` }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, open])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const newHistory = [...messages, { role:'user', content: userMsg }]
    setMessages(newHistory)
    setLoading(true)

    try {
      const res = await api.post('/discovery/chatbot', {
        school_id: school.id,
        message:   userMsg,
        history:   messages.slice(-6).map(m => ({ role:m.role, content:m.content })),
      })
      setMessages(prev => [...prev, { role:'assistant', content: res.data.reply }])
      if (res.data.has_lead_data && !leadCaptured) {
        setLeadCaptured(true)
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role:'assistant',
            content:`Thank you! 📝 Our admissions team will reach out to you shortly. In the meantime, would you like to **schedule a campus visit** to see ${school.name} in person?`
          }])
        }, 1000)
      }
    } catch {
      setMessages(prev => [...prev, {
        role:'assistant',
        content:`Thank you for your interest! Please call us at ${school.phone || 'the number on this page'} or click **Enquire Now** to connect with our admissions team.`
      }])
    } finally { setLoading(false) }
  }

  const formatMsg = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
  }

  return (
    <>
      {/* Chat bubble */}
      <div style={{ position:'fixed', bottom:28, right:28, zIndex:1000 }}>
        {open && (
          <div style={{ position:'absolute', bottom:72, right:0, width:'min(340px, calc(100vw - 32px))',
            background:'white', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
            overflow:'hidden', display:'flex', flexDirection:'column', height:'min(480px, calc(100vh - 140px))' }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#1a1814,#d4521a)', padding:'14px 16px',
              display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:'white', fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{school.name}</p>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e' }} />
                  <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11 }}>Admissions Assistant · Online</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.1)',
                border:'none', color:'white', width:28, height:28, borderRadius:8,
                cursor:'pointer', fontSize:15, flexShrink:0 }}>×</button>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display:'flex', justifyContent: msg.role==='user'?'flex-end':'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'#fdf0ea',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, marginRight:8, flexShrink:0, alignSelf:'flex-end' }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth:'78%', padding:'9px 12px', borderRadius:14, fontSize:13, lineHeight:1.5,
                    borderBottomRightRadius: msg.role==='user'?4:14,
                    borderBottomLeftRadius:  msg.role==='assistant'?4:14,
                    background:  msg.role==='user' ? '#1a1814' : '#f8f6f1',
                    color:       msg.role==='user' ? 'white' : '#1a1814',
                  }} dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }} />
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#fdf0ea',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
                  <div style={{ background:'#f8f6f1', borderRadius:14, borderBottomLeftRadius:4, padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#9ca3af',
                          animation:`bounce 0.8s ease-in-out ${i*0.15}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            <div style={{ padding:'8px 12px', display:'flex', gap:6, flexWrap:'wrap',
              borderTop:'1px solid #f3f4f6' }}>
              {['What are the fees?','Admission process?','Book campus visit'].map(q => (
                <button key={q} onClick={() => { setInput(q); setTimeout(()=>sendMessage(),50) }}
                  style={{ fontSize:11, padding:'4px 10px', borderRadius:20, border:'1px solid #e5e7eb',
                    background:'white', color:'#374151', cursor:'pointer', whiteSpace:'nowrap' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid #f3f4f6', display:'flex', gap:8 }}>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&sendMessage()}
                placeholder="Ask about fees, admission..."
                style={{ flex:1, minWidth:0, border:'1.5px solid #e5e7eb', borderRadius:10, padding:'9px 12px',
                  fontSize:13, outline:'none' }} />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                style={{ background: input.trim()?'#d4521a':'#e5e7eb', color: input.trim()?'white':'#9ca3af',
                  border:'none', borderRadius:10, width:38, height:38,
                  cursor:input.trim()?'pointer':'default', fontSize:16, flexShrink:0 }}>→</button>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button onClick={() => setOpen(o=>!o)}
          style={{ width:60, height:60, borderRadius:'50%',
            background: open ? '#1a1814' : 'linear-gradient(135deg,#d4521a,#1a1814)',
            border:'none', color:'white', fontSize:26, cursor:'pointer',
            boxShadow:'0 8px 24px rgba(212,82,26,0.4)', display:'flex',
            alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
          {open ? '×' : '💬'}
        </button>
        {!open && (
          <div style={{ position:'absolute', bottom:68, right:0, background:'#1a1814', color:'white',
            fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:20, whiteSpace:'nowrap',
            boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>
            Ask about admissions ✨
          </div>
        )}
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </>
  )
}

// ── Enquiry Modal ─────────────────────────────────────────────────────────────
function EnquiryModal({ school, onClose }) {
  const [form, setForm] = useState({ parent_name:'', phone:'', email:'', child_grade:'', area:'', message:'' })
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const GRADES = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10']

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await api.post('/leads/public', { ...form, school_id: school.id })
      setStep(2)
    } catch (err) { setError(err.response?.data?.message || 'Failed. Try again.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)',
      backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'white', borderRadius:24, width:'100%', maxWidth:480,
        maxHeight:'92vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:'linear-gradient(135deg,#1a1814,#2d2820)', padding:'20px 24px',
          borderRadius:'24px 24px 0 0', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'Georgia,serif', fontSize:20, fontWeight:800, color:'white', flexShrink:0 }}>
            {school.name[0]}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:'white', fontFamily:'Georgia,serif', fontSize:15, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{school.name}</p>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>{school.board} · {school.city}</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none',
            color:'white', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:16, flexShrink:0 }}>×</button>
        </div>

        {step === 2 ? (
          <div style={{ padding:36, textAlign:'center' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>🎉</div>
            <h3 style={{ fontFamily:'Georgia,serif', fontSize:24, fontWeight:700, color:'#1a1814', marginBottom:8 }}>
              Enquiry sent!
            </h3>
            <p style={{ color:'#6b7280', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
              <strong>{school.name}</strong> admissions team will call you within 24 hours.
            </p>
            <div style={{ background:'#f8f6f1', borderRadius:16, padding:'16px 20px', marginBottom:24, textAlign:'left' }}>
              {['📞 Admissions team calls within 24 hrs','📅 Campus visit scheduled at your convenience','📋 Admission process explained clearly'].map((s,i)=>(
                <p key={i} style={{ fontSize:13, color:'#374151', padding:'5px 0',
                  borderBottom:i<2?'1px solid #efefef':'none' }}>{s}</p>
              ))}
            </div>
            <button onClick={onClose} style={{ width:'100%', background:'#1a1814', color:'white',
              border:'none', borderRadius:12, padding:'13px', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding:24 }}>
            <h3 style={{ fontFamily:'Georgia,serif', fontSize:20, fontWeight:700, color:'#1a1814', marginBottom:4 }}>
              Book a free consultation
            </h3>
            <p style={{ color:'#9ca3af', fontSize:13, marginBottom:20 }}>Our counsellor calls you within 24 hours</p>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
              padding:'10px 14px', marginBottom:14, fontSize:13, color:'#dc2626' }}>{error}</div>}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="sl-form-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase',
                    letterSpacing:'0.05em', display:'block', marginBottom:5 }}>Parent name *</label>
                  <input value={form.parent_name} onChange={set('parent_name')} required placeholder="Full name"
                    style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 14px',
                      fontSize:14, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase',
                    letterSpacing:'0.05em', display:'block', marginBottom:5 }}>Phone *</label>
                  <input value={form.phone} onChange={set('phone')} required placeholder="10-digit" maxLength={10}
                    style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 14px',
                      fontSize:14, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <div className="sl-form-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase',
                    letterSpacing:'0.05em', display:'block', marginBottom:5 }}>Child's grade</label>
                  <select value={form.child_grade} onChange={set('child_grade')}
                    style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 14px',
                      fontSize:14, outline:'none', background:'white', boxSizing:'border-box' }}>
                    <option value="">Select</option>
                    {GRADES.map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase',
                    letterSpacing:'0.05em', display:'block', marginBottom:5 }}>Your area</label>
                  <input value={form.area} onChange={set('area')} placeholder="e.g. Madhapur"
                    style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 14px',
                      fontSize:14, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase',
                  letterSpacing:'0.05em', display:'block', marginBottom:5 }}>Message (optional)</label>
                <textarea value={form.message} onChange={set('message')} rows={2} placeholder="Any questions..."
                  style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'11px 14px',
                    fontSize:14, outline:'none', resize:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:'100%', background:loading?'#9ca3af':'#d4521a', color:'white', border:'none',
                borderRadius:12, padding:'14px', fontSize:15, fontWeight:700, cursor:loading?'default':'pointer', marginTop:18 }}>
              {loading ? 'Sending...' : 'Book Free Consultation →'}
            </button>
            <p style={{ fontSize:11, color:'#9ca3af', textAlign:'center', marginTop:8 }}>
              🔒 Only shared with {school.name}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function SchoolLanding({ school: initial, onBack }) {
  const [school,      setSchool]      = useState(initial)
  const [testimonials,setTestimonials]= useState([])
  const [gallery,     setGallery]     = useState([])
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [lightbox,    setLightbox]    = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!initial?.id) return
    Promise.allSettled([
      api.get(`/discovery/schools/${initial.id}`),
      api.get(`/discovery/school/${initial.id}/testimonials`),
    ]).then(([sc, tm]) => {
      if (sc.status==='fulfilled') { setSchool(sc.value.data); setGallery(sc.value.data.gallery||[]) }
      if (tm.status==='fulfilled') setTestimonials(tm.value.data)
    }).finally(()=>setLoading(false))
  },[initial?.id])

  const fmtFee = (min,max) => {
    const f = n => n>=100000?`₹${(n/100000).toFixed(1)}L`:`₹${(n/1000).toFixed(0)}K`
    if (min&&max) return `${f(min)} – ${f(max)}/yr`
    if (min) return `From ${f(min)}/yr`
    if (max) return `Up to ${f(max)}/yr`
    return 'Contact school'
  }

  if (!school) return null
  const highlights = (() => {
    const raw = school.highlights
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(h => h && (h.heading || h.content))
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(h => h && (h.heading || h.content))
    } catch {}
    return raw.split(',').map(h => h.trim()).filter(Boolean).map(h => ({ heading: h, content: '' }))
  })()

  return (
    <div style={{ minHeight:'100vh', background:'#ffffff', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={{ position:'relative', height:'100vh', maxHeight:640, minHeight:520, overflow:'hidden', background:'#1a1814' }}>
        {school.banner_url
          ? <img src={`${BASE}${school.banner_url}`} alt={school.name} style={{ width:'100%',height:'100%',objectFit:'cover',opacity:0.5 }} />
          : <div style={{ width:'100%',height:'100%',background:'linear-gradient(135deg,#1a1814 0%,#2d2820 40%,#d4521a 100%)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontFamily:'Georgia,serif',fontSize:'clamp(90px,20vw,180px)',fontWeight:900,color:'rgba(255,255,255,0.04)' }}>{school.name[0]}</span>
            </div>
        }
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%)' }} />

        {/* Nav */}
        <div style={{ position:'absolute',top:0,left:0,right:0,padding:'clamp(14px,3vw,20px) clamp(16px,4vw,40px)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap' }}>
          <button onClick={onBack} style={{ background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',backdropFilter:'blur(8px)' }}>← Back</button>
          <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
            {school.phone && <a href={`tel:${school.phone}`} style={{ background:'rgba(255,255,255,0.1)',color:'white',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'8px 16px',fontSize:13,fontWeight:600,textDecoration:'none',backdropFilter:'blur(8px)' }}>📞 {school.phone}</a>}
            <button onClick={()=>setShowEnquiry(true)} style={{ background:'#d4521a',color:'white',border:'none',borderRadius:10,padding:'8px 20px',fontSize:13,fontWeight:700,cursor:'pointer' }}>Enquire Now</button>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'0 clamp(16px,4vw,40px) clamp(32px,6vw,52px)' }}>
          <div style={{ maxWidth:900,margin:'0 auto' }}>
            {school.board && <span style={{ display:'inline-block',background:'#d4521a',color:'white',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14 }}>{school.board} School</span>}
            <h1 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(30px,7vw,56px)',fontWeight:800,color:'white',lineHeight:1.1,marginBottom:10,textShadow:'0 2px 20px rgba(0,0,0,0.4)' }}>{school.name}</h1>
            {school.tagline && <p style={{ color:'rgba(255,255,255,0.7)',fontSize:'clamp(15px,2.5vw,18px)',marginBottom:16,fontStyle:'italic' }}>"{school.tagline}"</p>}
            <div style={{ display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',marginBottom:28 }}>
              {school.area && <span style={{ color:'rgba(255,255,255,0.7)',fontSize:14 }}>📍 {school.area}{school.city?', '+school.city:''}</span>}
              {school.grades_offered && <span style={{ color:'rgba(255,255,255,0.7)',fontSize:14 }}>🎓 {school.grades_offered}</span>}
              {school.established_year && <span style={{ color:'rgba(255,255,255,0.7)',fontSize:14 }}>Est. {school.established_year}</span>}
              {school.rating>0 && <span style={{ color:'#fbbf24',fontSize:14,display:'flex',alignItems:'center',gap:4 }}>★ {school.rating} ({school.review_count} reviews)</span>}
            </div>
            <button onClick={()=>setShowEnquiry(true)} style={{ background:'#d4521a',color:'white',border:'none',borderRadius:14,padding:'clamp(13px,2vw,16px) clamp(28px,5vw,40px)',fontSize:'clamp(15px,2vw,17px)',fontWeight:700,cursor:'pointer',boxShadow:'0 8px 24px rgba(212,82,26,0.5)' }}>
              Book Free Campus Visit →
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <div style={{ background:'#1a1814' }}>
        <div className="sl-stats" style={{ maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)' }}>
          {[
            { icon:'🎓', label:'Grades',  value:school.grades_offered||'Pre-KG – Gr.10' },
            { icon:'💰', label:'Fees',    value:fmtFee(school.fee_range_min,school.fee_range_max) },
            { icon:'📚', label:'Board',   value:school.board||'CBSE' },
            { icon:'⏰', label:'Timing',  value:school.school_timing||'7:30 AM – 4:00 PM' },
          ].map((s,i)=>(
            <div key={i} className="sl-stat-item" style={{ padding:'18px 12px',textAlign:'center',borderRight:i<3?'1px solid rgba(255,255,255,0.07)':'none' }}>
              <p style={{ fontSize:20 }}>{s.icon}</p>
              <p style={{ color:'white',fontWeight:700,fontSize:13,marginTop:4 }}>{s.value}</p>
              <p style={{ color:'rgba(255,255,255,0.35)',fontSize:11,marginTop:1 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth:900,margin:'0 auto',padding:'clamp(32px,6vw,56px) clamp(16px,4vw,40px) 0' }}>

        {/* About */}
        {school.description && (
          <div style={{ marginBottom:'clamp(36px,6vw,56px)' }}>
            <p style={{ fontSize:11,fontWeight:700,color:'#d4521a',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:10 }}>About Us</p>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(24px,5vw,32px)',fontWeight:700,color:'#1a1814',marginBottom:16 }}>
              Welcome to {school.name}
            </h2>
            <p style={{ fontSize:'clamp(15px,2vw,16px)',color:'#4b5563',lineHeight:1.85 }}>{school.description}</p>
          </div>
        )}

        {/* Why choose us */}
        {highlights.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,#fdf0ea,#fff8f5)',borderRadius:24,padding:'clamp(20px,4vw,40px)',marginBottom:'clamp(36px,6vw,56px)',border:'1px solid #fde8d8' }}>
            <p style={{ fontSize:11,fontWeight:700,color:'#d4521a',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>Our Advantage</p>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(22px,5vw,28px)',fontWeight:700,color:'#1a1814',marginBottom:28 }}>Why choose {school.name}?</h2>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:16 }}>
              {highlights.map((h,i)=>(
                <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                  <div style={{ width:32,height:32,borderRadius:8,background:'#d4521a',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:14,flexShrink:0 }}>✦</div>
                  <div style={{ paddingTop:2 }}>
                    {h.heading && <p style={{ fontSize:14,fontWeight:700,color:'#1a1814',lineHeight:1.5,marginBottom:2 }}>{h.heading}</p>}
                    {h.content && <p style={{ fontSize:13,color:'#4b5563',lineHeight:1.6 }}>{h.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div style={{ marginBottom:'clamp(36px,6vw,56px)' }}>
            <p style={{ fontSize:11,fontWeight:700,color:'#d4521a',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>Campus Life</p>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(24px,5vw,32px)',fontWeight:700,color:'#1a1814',marginBottom:24 }}>School Gallery</h2>
            <div className="sl-gallery" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 }}>
              {gallery.map((img,i)=>(
                <div key={img.id} onClick={()=>setLightbox(i)}
                  className="sl-gallery-item"
                  style={{ borderRadius:16,overflow:'hidden',cursor:'zoom-in',
                    aspectRatio:i===0?'2/1':'1/1',
                    gridColumn:i===0?'span 2':'span 1',
                    position:'relative',background:'#f3f4f6' }}>
                  <img src={`${BASE}${img.image_url}`} alt={img.caption||''}
                    style={{ width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.4s' }}
                    onMouseEnter={e=>e.target.style.transform='scale(1.06)'}
                    onMouseLeave={e=>e.target.style.transform='scale(1)'} />
                  {img.caption && (
                    <div style={{ position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.65))',padding:'28px 14px 12px' }}>
                      <p style={{ color:'white',fontSize:12,fontWeight:500 }}>{img.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Facilities */}
        {school.facilities?.length > 0 && (
          <div style={{ marginBottom:'clamp(36px,6vw,56px)' }}>
            <p style={{ fontSize:11,fontWeight:700,color:'#d4521a',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>Infrastructure</p>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(24px,5vw,32px)',fontWeight:700,color:'#1a1814',marginBottom:24 }}>World-class Facilities</h2>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12 }}>
              {(Array.isArray(school.facilities)?school.facilities:school.facilities?.split(',')||[]).map(f=>(
                <div key={f.trim()} style={{ background:'#f8f6f1',borderRadius:14,padding:'16px',display:'flex',alignItems:'center',gap:10,border:'1px solid #e5e7eb' }}>
                  <span style={{ fontSize:22 }}>
                    {f.trim()==='Library'?'📚':f.trim()==='Sports Ground'?'⚽':f.trim()==='Science Lab'?'🔬':
                     f.trim()==='Computer Lab'?'💻':f.trim()==='Transport'?'🚌':f.trim()==='Canteen'?'🍽️':
                     f.trim()==='Swimming Pool'?'🏊':f.trim()==='Auditorium'?'🎭':f.trim()==='Music Room'?'🎵':
                     f.trim()==='Smart Classes'?'📱':f.trim()==='CCTV'?'📹':f.trim()==='Playground'?'🏃':'✓'}
                  </span>
                  <span style={{ fontSize:13,fontWeight:600,color:'#374151' }}>{f.trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faculty */}
        {school.faculty?.length > 0 && (
          <div style={{ marginBottom:'clamp(36px,6vw,56px)' }}>
            <p style={{ fontSize:11,fontWeight:700,color:'#12a38a',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>Our Team</p>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(24px,5vw,32px)',fontWeight:700,color:'#1a1814',marginBottom:24 }}>Meet our faculty</h2>
            <div className="sl-faculty" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:20 }}>
              {school.faculty.map(member=>(
                <div key={member.id} style={{ background:'#fff',borderRadius:16,padding:'20px',textAlign:'center',border:'1px solid #eee',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                  {member.photo_url ? (
                    <img src={`${BASE}${member.photo_url}`} alt={member.name}
                      style={{ width:92,height:92,borderRadius:'50%',objectFit:'cover',margin:'0 auto 14px',display:'block',border:'3px solid #e7f7f2' }} />
                  ) : (
                    <div style={{ width:92,height:92,borderRadius:'50%',margin:'0 auto 14px',
                      background:'linear-gradient(135deg,#12a38a,#0d8571)',display:'flex',alignItems:'center',
                      justifyContent:'center',color:'#fff',fontSize:34,fontWeight:700,fontFamily:'Georgia,serif' }}>
                      {member.name?.[0]?.toUpperCase()||'?'}
                    </div>
                  )}
                  <p style={{ fontSize:16,fontWeight:700,color:'#1a1814',marginBottom:2 }}>{member.name}</p>
                  {member.role && <p style={{ fontSize:12.5,fontWeight:600,color:'#12a38a',marginBottom:8 }}>{member.role}</p>}
                  {member.bio && <p style={{ fontSize:12.5,color:'#6b7280',lineHeight:1.6 }}>{member.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div style={{ marginBottom:'clamp(36px,6vw,56px)' }}>
            <p style={{ fontSize:11,fontWeight:700,color:'#d4521a',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8 }}>Parent Reviews</p>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(24px,5vw,32px)',fontWeight:700,color:'#1a1814',marginBottom:24 }}>What parents say</h2>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:16 }}>
              {testimonials.map(t=>(
                <div key={t.id} style={{ background:'white',borderRadius:20,padding:24,border:'1px solid #e5e7eb',boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ display:'flex',gap:2,marginBottom:12 }}>
                    {[1,2,3,4,5].map(i=>(
                      <span key={i} style={{ fontSize:16,color:i<=t.rating?'#f59e0b':'#e5e7eb' }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize:14,color:'#374151',lineHeight:1.7,marginBottom:16,fontStyle:'italic' }}>
                    "{t.review}"
                  </p>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:'50%',background:'#fdf0ea',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#d4521a',flexShrink:0 }}>
                      {t.parent_name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize:13,fontWeight:700,color:'#1a1814' }}>{t.parent_name}</p>
                      {t.child_grade && <p style={{ fontSize:11,color:'#9ca3af' }}>{t.child_grade}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background:'#1a1814',borderRadius:28,padding:'clamp(32px,6vw,52px) clamp(20px,5vw,48px)',textAlign:'center',marginBottom:0,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 80% 50%,rgba(212,82,26,0.25),transparent 60%)' }} />
          <p style={{ fontSize:11,fontWeight:700,color:'#d4521a',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:10,position:'relative' }}>Ready to join?</p>
          <h2 style={{ fontFamily:'Georgia,serif',fontSize:'clamp(24px,6vw,36px)',fontWeight:800,color:'white',marginBottom:12,lineHeight:1.2,position:'relative' }}>
            Give your child the best start at {school.name}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.45)',fontSize:15,marginBottom:32,position:'relative' }}>
            Our admissions counsellor will call you within 24 hours
          </p>
          <div style={{ display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',position:'relative' }}>
            <button onClick={()=>setShowEnquiry(true)} style={{ background:'#d4521a',color:'white',border:'none',borderRadius:14,padding:'15px 40px',fontSize:16,fontWeight:700,cursor:'pointer',boxShadow:'0 8px 24px rgba(212,82,26,0.4)' }}>
              Enquire Now →
            </button>
            {school.phone && (
              <a href={`tel:${school.phone}`} style={{ background:'rgba(255,255,255,0.08)',color:'white',border:'1px solid rgba(255,255,255,0.15)',borderRadius:14,padding:'15px 28px',fontSize:15,fontWeight:600,textDecoration:'none' }}>
                📞 Call us
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background:'#111', padding:'clamp(32px,5vw,48px) clamp(16px,4vw,40px) 28px',marginTop:'clamp(36px,6vw,56px)' }}>
        <div style={{ maxWidth:900,margin:'0 auto' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'clamp(24px,4vw,40px)',marginBottom:40 }}>
            <div>
              <h3 style={{ fontFamily:'Georgia,serif',fontSize:22,fontWeight:700,color:'white',marginBottom:12 }}>
                {school.name}
              </h3>
              <p style={{ color:'rgba(255,255,255,0.35)',fontSize:13,lineHeight:1.7,marginBottom:20 }}>
                {school.description?.slice(0,120)||'A premier school committed to excellence in education.'}...
              </p>
              <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
                {school.phone && <a href={`tel:${school.phone}`} style={{ background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'8px 14px',fontSize:12,textDecoration:'none' }}>📞 {school.phone}</a>}
                {school.whatsapp_number && <a href={`https://wa.me/91${school.whatsapp_number}`} target="_blank" rel="noreferrer" style={{ background:'rgba(34,197,94,0.1)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.2)',borderRadius:10,padding:'8px 14px',fontSize:12,textDecoration:'none' }}>💬 WhatsApp</a>}
              </div>
            </div>
            <div>
              <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14 }}>Quick Info</p>
              {[
                school.board && `Board: ${school.board}`,
                school.grades_offered && `Grades: ${school.grades_offered}`,
                school.medium && `Medium: ${school.medium}`,
                school.affiliation_no && `Affiliation: ${school.affiliation_no}`,
                school.established_year && `Est. ${school.established_year}`,
              ].filter(Boolean).map((info,i)=>(
                <p key={i} style={{ color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:8 }}>{info}</p>
              ))}
            </div>
            <div>
              <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14 }}>Location</p>
              {school.area && <p style={{ color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:6 }}>📍 {school.area}</p>}
              {school.city && <p style={{ color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:6 }}>{school.city}</p>}
              {school.school_timing && <p style={{ color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:6 }}>⏰ {school.school_timing}</p>}
              {school.principal_name && <p style={{ color:'rgba(255,255,255,0.4)',fontSize:13 }}>👤 Principal: {school.principal_name}</p>}
            </div>
          </div>
          <div className="sl-footer-bottom" style={{ borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap' }}>
            <p style={{ color:'rgba(255,255,255,0.2)',fontSize:12 }}>© {new Date().getFullYear()} {school.name}. All rights reserved.</p>
            <p style={{ color:'rgba(255,255,255,0.15)',fontSize:11 }}>Powered by <span style={{ color:'rgba(255,255,255,0.3)' }}>EnrollIQ</span></p>
          </div>
        </div>
      </footer>

      {/* ── LIGHTBOX ──────────────────────────────────────────────────────── */}
      {lightbox !== null && (
        <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.95)',display:'flex',alignItems:'center',justifyContent:'center' }}
          onClick={()=>setLightbox(null)}>
          <button onClick={()=>setLightbox(null)} style={{ position:'absolute',top:20,right:20,background:'rgba(255,255,255,0.1)',border:'none',color:'white',width:40,height:40,borderRadius:'50%',fontSize:20,cursor:'pointer',zIndex:2 }}>×</button>
          {lightbox>0 && <button onClick={e=>{e.stopPropagation();setLightbox(l=>l-1)}} style={{ position:'absolute',left:20,background:'rgba(255,255,255,0.1)',border:'none',color:'white',padding:'12px 16px',borderRadius:10,fontSize:24,cursor:'pointer',zIndex:2 }}>‹</button>}
          <img src={`${BASE}${gallery[lightbox]?.image_url}`} alt="" style={{ maxWidth:'90vw',maxHeight:'85vh',objectFit:'contain',borderRadius:12 }} onClick={e=>e.stopPropagation()} />
          {lightbox<gallery.length-1 && <button onClick={e=>{e.stopPropagation();setLightbox(l=>l+1)}} style={{ position:'absolute',right:20,background:'rgba(255,255,255,0.1)',border:'none',color:'white',padding:'12px 16px',borderRadius:10,fontSize:24,cursor:'pointer',zIndex:2 }}>›</button>}
          <div style={{ position:'absolute',bottom:16,display:'flex',gap:6 }}>
            {gallery.map((_,i)=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:i===lightbox?'white':'rgba(255,255,255,0.3)' }} />)}
          </div>
        </div>
      )}

      {/* ── CHATBOT ───────────────────────────────────────────────────────── */}
      <Chatbot school={school} />

      {/* ── ENQUIRY MODAL ────────────────────────────────────────────────── */}
      {showEnquiry && <EnquiryModal school={school} onClose={()=>setShowEnquiry(false)} />}

      {/* ── RESPONSIVE STYLES ─────────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 640px) {
          .sl-stats { grid-template-columns: 1fr 1fr !important; }
          .sl-stat-item:nth-child(2) { border-right: none !important; }
          .sl-stat-item:nth-child(1), .sl-stat-item:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,0.07); }
          .sl-gallery { grid-template-columns: 1fr 1fr !important; }
          .sl-faculty { grid-template-columns: 1fr 1fr !important; }
          .sl-gallery-item { grid-column: span 1 !important; aspect-ratio: 1/1 !important; }
          .sl-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}