import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

const PLATFORMS = [
  {
    id:          'google_ads',
    name:        'Google Ads',
    icon:        '🔵',
    color:       '#4285f4',
    bg:          '#eff6ff',
    description: 'Run search ads when parents search "best school near me"',
    fields: [
      { key:'account_id',    label:'Customer ID',     placeholder:'123-456-7890',          help:'Google Ads → Settings → Account ID' },
      { key:'campaign_id',   label:'Campaign ID',     placeholder:'e.g. 12345678',          help:'Optional — for per-campaign tracking' },
      { key:'conversion_id', label:'Conversion Label',placeholder:'AW-123456789/AbCdEfGh', help:'Google Ads → Tools → Conversions' },
    ],
    landing_url: true,
    how_to: [
      'Go to ads.google.com and sign in',
      'Create campaign → Select "Website traffic" goal',
      'Set location: your city/area (e.g. Madhapur, Hyderabad)',
      'Add keywords: "best cbse school", "school admission near me"',
      'Paste your unique landing URL as the Final URL',
      'Set daily budget (₹200–500/day recommended)',
    ],
    metrics: ['Clicks','Impressions','CTR','Cost per lead'],
  },
  {
    id:          'facebook_ads',
    name:        'Facebook Ads',
    icon:        '📘',
    color:       '#1877f2',
    bg:          '#eff6ff',
    description: 'Target parents by age, location and interests on Facebook',
    fields: [
      { key:'pixel_id',    label:'Pixel ID',       placeholder:'e.g. 1234567890',      help:'Meta Business → Events Manager → Pixel ID' },
      { key:'ad_account',  label:'Ad Account ID',  placeholder:'act_1234567890',        help:'Meta Business Manager → Ad Accounts' },
      { key:'access_token',label:'Access Token',   placeholder:'EAAxxxxxx...',          help:'Meta for Developers → Graph API → Access Token' },
    ],
    landing_url: true,
    how_to: [
      'Go to business.facebook.com and create a Business account',
      'Create an Ad Account in Business Manager',
      'Go to Events Manager → Create a Pixel → Copy Pixel ID',
      'Create campaign → Objective: Lead generation or Traffic',
      'Target audience: Parents (25–45 age) in your city',
      'Use your landing URL as the website destination',
    ],
    metrics: ['Reach','Link clicks','Leads','Cost per result'],
  },
  {
    id:          'instagram_ads',
    name:        'Instagram Ads',
    icon:        '📸',
    color:       '#e1306c',
    bg:          '#fdf2f8',
    description: 'Show school photos and reels to parents on Instagram',
    fields: [
      { key:'instagram_id', label:'Instagram Account ID', placeholder:'e.g. 17841401234', help:'Uses same Meta Business Manager as Facebook' },
      { key:'pixel_id',     label:'Meta Pixel ID',        placeholder:'Same as Facebook Pixel', help:'Instagram uses the same Pixel as Facebook' },
    ],
    landing_url: true,
    how_to: [
      'Connect your Instagram account to Meta Business Manager',
      'Instagram ads are created through Meta Ads Manager',
      'Go to Ads Manager → Create campaign',
      'Under Placements → Select Instagram Feed and Stories',
      'Upload school photos or reels (galleries perform well)',
      'Link to your school landing page URL',
    ],
    metrics: ['Impressions','Profile visits','Link clicks','Saves'],
  },
  {
    id:          'youtube_ads',
    name:        'YouTube Ads',
    icon:        '▶️',
    color:       '#ff0000',
    bg:          '#fef2f2',
    description: 'Run video ads showing your school before YouTube videos',
    fields: [
      { key:'channel_id',    label:'YouTube Channel ID', placeholder:'UCxxxxxxxxxxxxxxxx',       help:'YouTube Studio → Settings → Channel → Advanced' },
      { key:'google_ads_id', label:'Google Ads ID',      placeholder:'Same as Google Ads above', help:'YouTube ads run through Google Ads' },
    ],
    landing_url: true,
    how_to: [
      'YouTube ads run through Google Ads (same account)',
      'Create a video (school tour, facilities, testimonials) — 15–30 sec',
      'Upload video to your YouTube channel',
      'Go to Google Ads → New campaign → Video',
      'Paste your YouTube video URL',
      'Target: Parents in your city, interested in education',
    ],
    metrics: ['Views','View rate','Clicks','Cost per view'],
  },
  {
    id:          'whatsapp_business',
    name:        'WhatsApp Business',
    icon:        '💬',
    color:       '#25d366',
    bg:          '#f0fdf4',
    description: 'Auto-send attendance, fee reminders and notifications to parents',
    fields: [
      { key:'phone_number_id', label:'Phone Number ID',  placeholder:'e.g. 123456789012345',  help:'Meta for Developers → WhatsApp → Phone Numbers' },
      { key:'access_token',    label:'Access Token',     placeholder:'EAAxxxxxx...',           help:'Meta for Developers → WhatsApp → Temporary/Permanent Token' },
      { key:'verify_token',    label:'Verify Token',     placeholder:'your_custom_secret',     help:'Create any secret string — used to verify webhook' },
    ],
    landing_url: false,
    how_to: [
      'Go to developers.facebook.com and create an App',
      'Add "WhatsApp" product to your app',
      'Go to WhatsApp → Getting Started',
      'Copy your Phone Number ID and Temporary Access Token',
      'For production: apply for a permanent token through Meta',
      'Webhook: point to your backend /api/whatsapp/webhook',
    ],
    metrics: ['Messages sent','Delivered','Read','Replied'],
    is_notification: true,
  },
]

function PlatformCard({ platform, saved, onSave, schoolSlug }) {
  const [open,   setOpen]   = useState(false)
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState('')
  const [tab,    setTab]    = useState('setup')

  useEffect(() => {
    if (saved) setForm(saved)
  }, [saved])

  const isConnected = Object.keys(form).some(k => form[k] && platform.fields.find(f => f.key === k))

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/ads/integrations', { platform: platform.id, credentials: form })
      showToast('✅ Saved!')
      onSave(platform.id, form)
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || 'Save failed'))
    } finally { setSaving(false) }
  }

  const landingUrl = schoolSlug
    ? `${window.location.origin}/discover?ref=${schoolSlug}`
    : `${window.location.origin}/discover`

  return (
    <div style={{ background:'white', border:`1.5px solid ${isConnected ? platform.color + '40' : '#f0ede8'}`, borderRadius:16, overflow:'hidden', transition:'all 0.2s' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', background: isConnected ? platform.bg : 'white' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ width:44, height:44, borderRadius:12, background:platform.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
          {platform.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <p style={{ fontSize:15, fontWeight:600, color:'#1a1814' }}>{platform.name}</p>
            {isConnected && (
              <span style={{ fontSize:10, fontWeight:700, background:platform.color, color:'white', padding:'2px 8px', borderRadius:20, letterSpacing:'0.05em' }}>
                CONNECTED
              </span>
            )}
          </div>
          <p style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>{platform.description}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background: isConnected ? '#22c55e' : '#e5e7eb' }} />
          <span style={{ fontSize:18, color:'#9ca3af', transform: open?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▾</span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop:`1px solid #f0ede8` }}>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #f0ede8' }}>
            {['setup','how-to','metrics'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex:1, padding:'10px', border:'none', background: tab===t?platform.bg:'white', color: tab===t?platform.color:'#9ca3af', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize', borderBottom: tab===t?`2px solid ${platform.color}`:'2px solid transparent' }}>
                {t === 'how-to' ? 'How to setup' : t === 'metrics' ? 'What you get' : 'API credentials'}
              </button>
            ))}
          </div>

          <div style={{ padding:20 }}>
            {toast && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#15803d' }}>{toast}</div>}

            {/* Setup tab */}
            {tab === 'setup' && (
              <>
                {/* Landing URL */}
                {platform.landing_url && (
                  <div style={{ background:'#fdf0ea', borderRadius:12, padding:14, marginBottom:16 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#d4521a', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Your unique landing URL</p>
                    <p style={{ fontSize:11, color:'#9ca3af', marginBottom:10 }}>Paste this as the destination URL in your ad campaign. Parents will land directly on your school page.</p>
                    <div style={{ display:'flex', gap:8 }}>
                      <div style={{ flex:1, background:'white', border:'1px solid #fbd6c2', borderRadius:8, padding:'9px 12px', fontSize:12, fontFamily:'monospace', color:'#1a1814', wordBreak:'break-all' }}>
                        {landingUrl}
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(landingUrl); showToast('✅ URL copied!') }}
                        style={{ background:'#d4521a', color:'white', border:'none', borderRadius:8, padding:'9px 14px', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Credentials */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {platform.fields.map(field => (
                    <div key={field.key}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:5 }}>
                        {field.label}
                      </label>
                      <input
                        value={form[field.key] || ''}
                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        style={{ width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'10px 14px', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'monospace' }}
                      />
                      <p style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>📍 {field.help}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display:'flex', gap:10, marginTop:18 }}>
                  <button onClick={handleSave} disabled={saving}
                    style={{ background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer', opacity: saving?0.6:1 }}>
                    {saving ? 'Saving...' : `Save ${platform.name} credentials`}
                  </button>
                  {isConnected && (
                    <button onClick={() => { setForm({}); onSave(platform.id, {}) }}
                      style={{ background:'white', color:'#dc2626', border:'1px solid #fecaca', borderRadius:10, padding:'10px 16px', fontSize:13, cursor:'pointer' }}>
                      Disconnect
                    </button>
                  )}
                </div>
              </>
            )}

            {/* How-to tab */}
            {tab === 'how-to' && (
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', marginBottom:14 }}>Step-by-step setup guide</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {platform.how_to.map((step, i) => (
                    <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:platform.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:platform.color, flexShrink:0 }}>
                        {i + 1}
                      </div>
                      <p style={{ fontSize:13, color:'#374151', lineHeight:1.6, paddingTop:2 }}>{step}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background:'#f8f6f1', borderRadius:12, padding:14, marginTop:16 }}>
                  <p style={{ fontSize:12, color:'#6b7280', lineHeight:1.6 }}>
                    💡 After setup, all leads from {platform.name} will automatically appear in your CRM with source tagged as "{platform.name}" and get an AI score boost of +20 points.
                  </p>
                </div>
              </div>
            )}

            {/* Metrics tab */}
            {tab === 'metrics' && (
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'#1a1814', marginBottom:14 }}>What data flows into EnrollIQ</p>
                <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                  {platform.metrics.map(m => (
                    <div key={m} style={{ background:platform.bg, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:platform.color }} />
                      <span style={{ fontSize:13, fontWeight:500, color:'#1a1814' }}>{m}</span>
                    </div>
                  ))}
                </div>
                <div style={{ border:'1px solid #f0ede8', borderRadius:12, overflow:'hidden' }}>
                  <div style={{ background:'#f8f6f1', padding:'10px 14px', borderBottom:'1px solid #f0ede8' }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#1a1814' }}>Lead flow when someone clicks your {platform.name} ad</p>
                  </div>
                  <div style={{ padding:14 }}>
                    {[
                      `Parent clicks ${platform.name} ad`,
                      'Lands on your school landing page',
                      'Fills enquiry form',
                      'Lead auto-created in CRM',
                      `Source tagged as "${platform.name}"`,
                      'AI scores lead (Google Ads = +20 bonus)',
                      'Staff notified to call',
                    ].map((step, i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'5px 0' }}>
                        <div style={{ width:18, height:18, borderRadius:'50%', background: i===6?'#f0fdf4':'#f8f6f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color: i===6?'#15803d':'#9ca3af', flexShrink:0 }}>
                          {i+1}
                        </div>
                        <p style={{ fontSize:12, color: i===6?'#15803d':'#374151', fontWeight: i===6?600:400 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdsManagement() {
  const [integrations, setIntegrations] = useState({})
  const [adData,       setAdData]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [toast,        setToast]        = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    api.get('/ads/my').then(res => {
      setAdData(res.data)
      setIntegrations(res.data.ad?.integrations || {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = (platformId, creds) => {
    setIntegrations(p => ({ ...p, [platformId]: creds }))
  }

  const connectedCount = PLATFORMS.filter(p =>
    integrations[p.id] && Object.values(integrations[p.id]).some(v => v)
  ).length

  const stats = adData?.stats || {}
  const slug  = adData?.ad?.landing_slug || ''

  return (
    <Layout>
      <div className="page" style={{ maxWidth:900 }}>
        {toast && (
          <div style={{ position:'fixed', top:20, right:20, zIndex:100, background:'#1a1814', color:'white', padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:500 }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:26, fontWeight:600, color:'#1a1814', fontFamily:'Georgia,serif', marginBottom:4 }}>
            Ads & Integrations
          </h1>
          <p style={{ fontSize:13, color:'#9ca3af' }}>
            Connect your advertising accounts — leads flow automatically into your CRM
          </p>
        </div>

        {/* Stats */}
        <div className="g-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Connected',       value: `${connectedCount}/${PLATFORMS.length}`, color:'#1a1814' },
            { label:'Ad clicks (30d)', value: stats.clicks       || 0, color:'#2563eb' },
            { label:'Enquiries (30d)', value: stats.enquiries    || 0, color:'#16a34a' },
            { label:'Conversion rate', value: `${stats.conversion_rate||0}%`, color:'#d4521a' },
          ].map(s => (
            <div key={s.label} style={{ background:'white', border:'1px solid #f0ede8', borderRadius:12, padding:16 }}>
              <p style={{ fontSize:11, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{s.label}</p>
              <p style={{ fontSize:26, fontWeight:600, color:s.color, lineHeight:1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ background:'#fdf0ea', border:'1px solid #fbd6c2', borderRadius:14, padding:'16px 20px', marginBottom:24 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#c0410e', marginBottom:10 }}>How ads integration works</p>
          <div className="g-4" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { n:'1', icon:'🔗', t:'Connect account',  d:'Add your API credentials below' },
              { n:'2', icon:'📣', t:'Run your ad',       d:'Use your unique URL in the ad' },
              { n:'3', icon:'👆', t:'Parent clicks',     d:'They land on your school page' },
              { n:'4', icon:'📋', t:'Lead captured',     d:'Auto-appears in CRM with AI score' },
            ].map(s => (
              <div key={s.n} style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <div style={{ width:18, height:18, borderRadius:'50%', background:'#d4521a', color:'white', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 4px' }}>{s.n}</div>
                <p style={{ fontSize:12, fontWeight:600, color:'#1a1814' }}>{s.t}</p>
                <p style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform cards */}
        {loading ? (
          <p style={{ textAlign:'center', color:'#9ca3af', padding:40 }}>Loading...</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {PLATFORMS.map(platform => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                saved={integrations[platform.id]}
                schoolSlug={slug}
                onSave={handleSave}
              />
            ))}
          </div>
        )}

        {/* Cost per lead */}
        {stats.cost_per_lead && (
          <div style={{ background:'white', border:'1px solid #f0ede8', borderRadius:14, padding:20, marginTop:16 }}>
            <p style={{ fontSize:14, fontWeight:600, color:'#1a1814', marginBottom:4 }}>💰 Cost per lead: ₹{stats.cost_per_lead}</p>
            <p style={{ fontSize:12, color:'#9ca3af' }}>Based on total ad spend and {stats.google_leads} leads this month across all platforms</p>
          </div>
        )}
      </div>
    </Layout>
  )
}