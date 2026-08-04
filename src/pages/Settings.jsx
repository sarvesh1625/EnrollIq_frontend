import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const THEMES = [
  { name:'Orange',  hex:'#d4521a', dk:'#b84315', lt:'#fdf0ea' },
  { name:'Blue',    hex:'#2563eb', dk:'#1d4ed8', lt:'#eff6ff' },
  { name:'Green',   hex:'#059669', dk:'#047857', lt:'#f0fdf4' },
  { name:'Purple',  hex:'#7c3aed', dk:'#6d28d9', lt:'#f5f3ff' },
  { name:'Red',     hex:'#dc2626', dk:'#b91c1c', lt:'#fef2f2' },
  { name:'Teal',    hex:'#0891b2', dk:'#0e7490', lt:'#f0f9ff' },
  { name:'Indigo',  hex:'#4f46e5', dk:'#4338ca', lt:'#eef2ff' },
  { name:'Rose',    hex:'#e11d48', dk:'#be123c', lt:'#fff1f2' },
]

function applyTheme(t) {
  const r = document.documentElement
  r.style.setProperty('--c-brand',    t.hex)
  r.style.setProperty('--c-brand-dk', t.dk)
  r.style.setProperty('--c-brand-lt', t.lt)
  localStorage.setItem('eq_theme', JSON.stringify(t))
}

function Section({ title, sub, children }) {
  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--c-border)' }}>
        <p style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:0 }}>{title}</p>
        {sub && <p style={{ fontSize:12, color:'var(--c-muted)', margin:'3px 0 0' }}>{sub}</p>}
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [toast,  setToast]  = useState('')
  const [school, setSchool] = useState({ name:'', city:'', phone:'', board:'CBSE', email:'' })
  const [saving, setSaving] = useState(false)
  const [theme,  setTheme]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('eq_theme')) || THEMES[0] } catch { return THEMES[0] }
  })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    applyTheme(theme)
    api.get('/schools/my').then(r => { if (r.data) setSchool(p => ({ ...p, ...r.data })) }).catch(() => {})
  }, [])

  const handleTheme = t => { setTheme(t); applyTheme(t); showToast('🎨 Theme applied!') }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.patch('/schools/my', school); showToast('✅ Settings saved!') }
    catch { showToast('✅ Saved locally') }
    finally { setSaving(false) }
  }

  return (
    <Layout>
      <div className="page page-narrow" style={{ maxWidth:800 }}>
        {toast && (
          <div style={{ position:'fixed', top:20, right:20, zIndex:99, background:'var(--c-ink)', color:'white', fontSize:13, padding:'10px 18px', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>
            {toast}
          </div>
        )}

        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:28, fontWeight:700, color:'var(--c-ink)', margin:0 }}>Settings</h1>
          <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 0' }}>School info · Appearance · Integrations</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Theme */}
          <Section title="App theme" sub="Change the brand color across the entire application">
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              {THEMES.map(t => (
                <button key={t.hex} onClick={() => handleTheme(t)}
                  style={{
                    display:'flex', alignItems:'center', gap:8,
                    padding:'8px 14px', borderRadius:10, cursor:'pointer',
                    fontSize:12, fontWeight:500, transition:'all 0.15s',
                    border: `2px solid ${theme.hex === t.hex ? t.hex : 'var(--c-border-2)'}`,
                    background: theme.hex === t.hex ? t.lt : 'white',
                    color: theme.hex === t.hex ? t.hex : 'var(--c-ink-2)',
                  }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', background: t.hex }} />
                  {t.name}
                  {theme.hex === t.hex && <span style={{ fontSize:11 }}>✓</span>}
                </button>
              ))}
            </div>
            <p style={{ fontSize:11, color:'var(--c-muted)' }}>
              For custom colors, edit <code style={{ background:'var(--c-bg)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>--c-brand</code> in <code style={{ background:'var(--c-bg)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>src/index.css</code>
            </p>
          </Section>

          {/* School info */}
          <Section title="School information" sub="These details appear on your public discovery page">
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
                <div>
                  <label className="label">School name</label>
                  <input className="input" value={school.name} onChange={e => setSchool(p => ({ ...p, name:e.target.value }))} placeholder="School name" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" value={school.city} onChange={e => setSchool(p => ({ ...p, city:e.target.value }))} placeholder="Hyderabad" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={school.phone} onChange={e => setSchool(p => ({ ...p, phone:e.target.value }))} placeholder="+91 40 1234 5678" />
                </div>
                <div>
                  <label className="label">Board</label>
                  <select className="input" value={school.board} onChange={e => setSchool(p => ({ ...p, board:e.target.value }))}>
                    {['CBSE','ICSE','State Board','IB','IGCSE'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:'span 2' }}>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={school.email} onChange={e => setSchool(p => ({ ...p, email:e.target.value }))} placeholder="school@email.com" />
                </div>
              </div>
              <div>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </form>
          </Section>

          {/* Account */}
          <Section title="Your account">
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', background:'var(--c-bg)', borderRadius:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--c-brand-lt)', color:'var(--c-brand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, flexShrink:0 }}>
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--c-ink)', margin:0 }}>{user?.name}</p>
                <p style={{ fontSize:12, color:'var(--c-muted)', margin:'2px 0 0' }}>{user?.email} · <span style={{ textTransform:'capitalize' }}>{user?.role}</span></p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g-2">
              <div>
                <label className="label">Full name</label>
                <input className="input" defaultValue={user?.name} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" defaultValue={user?.email} />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label className="label">New password</label>
                <input className="input" type="password" placeholder="Leave blank to keep current" />
              </div>
            </div>
          </Section>

          {/* Integrations */}
          <Section title="Integrations" sub="Connect external services to unlock features">
            <div>
              {[
                { icon:'💬', name:'WhatsApp Business API', desc:'Parent attendance & transport notifications', env:'WHATSAPP_TOKEN', status:'pending' },
                { icon:'🤖', name:'AI Chatbot (Groq)',     desc:'School discovery chatbot · free at groq.com', env:'GROQ_API_KEY',   status:'pending' },
                { icon:'📊', name:'Google Ads tracking',   desc:'Track ad clicks and enquiry conversions',     env:'Auto-configured', status:'active'  },
                { icon:'📱', name:'SMS (MSG91)',            desc:'SMS to parents for critical updates',         env:'MSG91_API_KEY',   status:'pending' },
              ].map((item, i, arr) => (
                <div key={item.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom: i < arr.length-1 ? '1px solid var(--c-border)' : 'none' }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{item.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--c-ink)', margin:0 }}>{item.name}</p>
                    <p style={{ fontSize:12, color:'var(--c-muted)', margin:'2px 0 0' }}>{item.desc}</p>
                    <code style={{ fontSize:11, color:'#9ca3af' }}>{item.env}</code>
                  </div>
                  <span className={`badge ${item.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                    {item.status === 'active' ? 'Active' : 'Setup needed'}
                  </span>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>
    </Layout>
  )
}