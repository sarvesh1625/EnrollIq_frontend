import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { SIZES, TEMPLATES, drawPoster, ensureFonts, loadImage, GOOGLE_FONTS_URL } from '../utils/posterEngine'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Posters
   Pick a design → write the message (or let AI draft it) → choose who
   gets it → publish. Parents see it in the parent app + a notification.
   The poster itself is drawn in this browser, so what you preview is
   exactly what parents receive.
   ═══════════════════════════════════════════════════════════════ */

const LANGS = [{ k: 'en', l: 'English' }, { k: 'hi', l: 'हिन्दी (Hindi)' }, { k: 'te', l: 'తెలుగు (Telugu)' }]
const TONES = [{ k: 'warm', l: 'Warm' }, { k: 'joyful', l: 'Joyful' }, { k: 'formal', l: 'Formal' }]

const card  = { background: 'white', borderRadius: 16, border: '1px solid #f0ede8', padding: 20, marginBottom: 16 }
const h2    = { fontSize: 15, fontWeight: 700, color: '#1a1814', marginBottom: 12 }
const hint  = { fontSize: 12, color: '#9ca3af', marginTop: 4 }
const lbl   = { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }
const chip  = on => ({
  fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
  border: on ? '1px solid #1a1814' : '1px solid #e5e7eb', background: on ? '#1a1814' : 'white', color: on ? 'white' : '#4b5563',
})

const fmtDate = iso => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/* small live thumbnail of one template */
function TemplateThumb({ tpl, active, onClick, brandColor, logo, schoolName, fontTick }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    c.width = 216; c.height = 270
    drawPoster(c.getContext('2d'), 216, 270, {
      template: tpl.key, headline: tpl.headline, subline: tpl.sub, tag: tpl.tag,
      schoolName, brandColor, logo, dateText: '', principalName: '', tagline: '',
    })
  }, [tpl, brandColor, logo, schoolName, fontTick])
  return (
    <button type="button" onClick={onClick} title={tpl.label}
      style={{ padding: 0, border: active ? '3px solid #1a1814' : '3px solid transparent', borderRadius: 14, background: 'none', cursor: 'pointer', overflow: 'hidden', textAlign: 'center' }}>
      <canvas ref={ref} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 10 }} />
      <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: active ? '#1a1814' : '#6b7280', padding: '5px 2px 3px' }}>
        {tpl.emoji} {tpl.label.split(' /')[0]}
      </span>
    </button>
  )
}

export default function Posters() {
  /* ── data from the server ── */
  const [settings, setSettings] = useState({ school_name: '', logo_url: null, brand_color: '#4f46e5', principal_name: '', tagline: '' })
  const [brand, setBrand]       = useState({ color: '#4f46e5', principal: '', tagline: '' })
  const [logoImg, setLogoImg]   = useState(null)
  const [classes, setClasses]   = useState([])
  const [posts, setPosts]       = useState([])
  const [setupError, setSetupError] = useState('')

  /* ── the poster being made ── */
  const [tpl, setTpl]           = useState('diwali')
  const [size, setSize]         = useState('portrait')
  const [headline, setHeadline] = useState(TEMPLATES[0].headline)
  const [subline, setSubline]   = useState(TEMPLATES[0].sub)
  const [tag, setTag]           = useState(TEMPLATES[0].tag)
  const [dateISO, setDateISO]   = useState('')
  const [dateText, setDateText] = useState('')
  const [caption, setCaption]   = useState('')
  const [touched, setTouched]   = useState({ head: false, sub: false, tag: false }) // fields the user has edited themselves

  /* ── AI ── */
  const [details, setDetails]   = useState('')
  const [lang, setLang]         = useState('en')
  const [tone, setTone]         = useState('warm')
  const [aiBusy, setAiBusy]     = useState(false)

  /* ── AI background (optional; only appears once the server has an image service) ── */
  const [bgStatus, setBgStatus]   = useState(null)   // { configured, limit, remaining, needs_migration }
  const [bgTheme, setBgTheme]     = useState('')
  const [bgBusy, setBgBusy]       = useState(false)
  const [bgError, setBgError]     = useState('')
  const [bgOptions, setBgOptions] = useState([])     // newest first, max 4: { id, dataUrl, img }
  const [bgSel, setBgSel]         = useState(null)
  const occasionRef = useRef('Diwali')               // last built-in design picked — used as the "occasion" for AI

  /* ── audience + actions ── */
  const [audience, setAudience]     = useState('all')
  const [selClasses, setSelClasses] = useState([])
  const [busy, setBusy]             = useState('')
  const [msg, setMsg]               = useState(null)
  const [savingBrand, setSavingBrand] = useState(false)
  const [editing, setEditing]       = useState(null) // { id, caption }
  const [fontTick, setFontTick]     = useState(0)

  const canvasRef = useRef(null)
  const fileRef   = useRef(null)

  /* ── fonts: load Google Fonts once, then redraw when ready ── */
  useEffect(() => {
    if (!document.getElementById('poster-fonts')) {
      const l = document.createElement('link')
      l.id = 'poster-fonts'; l.rel = 'stylesheet'; l.href = GOOGLE_FONTS_URL
      document.head.appendChild(l)
    }
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { ensureFonts(`${headline} ${subline} ${tag} ${dateText} ${brand.principal} ${settings.school_name}`).then(() => setFontTick(n => n + 1)) }, 250)
    return () => clearTimeout(t)
  }, [headline, subline, tag, dateText, brand.principal, settings.school_name])

  /* ── initial load ── */
  const loadPosts = useCallback(() => {
    api.get('/posts').then(r => setPosts(r.data || [])).catch(() => {})
  }, [])
  useEffect(() => {
    api.get('/posts/settings').then(r => {
      setSettings(r.data)
      setBrand({ color: r.data.brand_color || '#4f46e5', principal: r.data.principal_name || '', tagline: r.data.tagline || '' })
    }).catch(err => setSetupError(err.response?.data?.message || 'Posters is not set up on the server yet.'))
    api.get('/posts/classes').then(r => setClasses(r.data || [])).catch(() => {})
    api.get('/posts/ai-status').then(r => setBgStatus(r.data)).catch(() => setBgStatus({ configured: false }))
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    if (!settings.logo_url) { setLogoImg(null); return }
    loadImage(settings.logo_url).then(setLogoImg).catch(() => setLogoImg(null))
  }, [settings.logo_url])

  /* ── choose a template: each field follows the design unless the user has edited THAT field ── */
  const pickTemplate = t => {
    setTpl(t.key)
    occasionRef.current = t.label
    if (!touched.head) setHeadline(t.headline)
    if (!touched.sub)  setSubline(t.sub)
    if (!touched.tag)  setTag(t.tag)
  }

  const poster = useMemo(() => ({
    template: tpl, headline, subline, tag, dateText,
    schoolName: settings.school_name, tagline: brand.tagline, principalName: brand.principal,
    brandColor: brand.color, logo: logoImg,
    bgImage: (bgOptions.find(o => o.id === bgSel) || {}).img || null,
  }), [tpl, headline, subline, tag, dateText, settings.school_name, brand, logoImg, bgOptions, bgSel])

  /* ── live preview ── */
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const { w, h } = SIZES[size]
    const t = setTimeout(() => { c.width = w; c.height = h; drawPoster(c.getContext('2d'), w, h, poster) }, 80)
    return () => clearTimeout(t)
  }, [poster, size, fontTick])

  const tplMeta = TEMPLATES.find(t => t.key === tpl)

  /* ── AI writer ── */
  const writeWithAI = async () => {
    setAiBusy(true); setMsg(null)
    try {
      const r = await api.post('/posts/generate-text', {
        occasion: occasionRef.current, details, language: lang, tone, date_text: dateText,
      })
      setHeadline(r.data.headline); setSubline(r.data.subline); setCaption(r.data.caption); setTouched(t => ({ ...t, head: true, sub: true }))
      setMsg({ type: 'ok', text: 'Draft written — read it through and edit anything before publishing.' })
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'The AI could not write this right now.' })
    } finally { setAiBusy(false) }
  }

  /* ── AI background ── */
  const chooseBg = opt => { setBgSel(opt.id); setTpl('custom') }
  const generateBg = async () => {
    setBgBusy(true); setBgError('')
    try {
      const r = await api.post('/posts/generate-background', { occasion: occasionRef.current, theme: bgTheme }, { timeout: 120000 })
      const img = await loadImage(r.data.image)
      const opt = { id: Date.now(), dataUrl: r.data.image, img }
      setBgOptions(o => [opt, ...o].slice(0, 4)); chooseBg(opt)
      setBgStatus(st => ({ ...st, remaining: r.data.remaining, limit: r.data.limit }))
    } catch (err) {
      const d = err.response?.data
      setBgError(d?.message || (err.code === 'ECONNABORTED' ? 'That took too long — please try again.' : 'Could not create a background right now.'))
      if (d?.code === 'daily_limit') setBgStatus(st => ({ ...st, remaining: 0 }))
    } finally { setBgBusy(false) }
  }

  /* ── brand kit ── */
  const saveBrand = async () => {
    setSavingBrand(true); setMsg(null)
    try {
      await api.put('/posts/settings', { brand_color: brand.color, principal_name: brand.principal, tagline: brand.tagline })
      setMsg({ type: 'ok', text: 'Branding saved — it will appear on every poster.' })
    } catch (err) { setMsg({ type: 'err', text: err.response?.data?.message || 'Could not save branding' }) }
    finally { setSavingBrand(false) }
  }
  const onLogoFile = async e => {
    const f = e.target.files?.[0]; if (!f) return
    const fd = new FormData(); fd.append('logo', f)
    try {
      const r = await api.post('/posts/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSettings(s => ({ ...s, logo_url: r.data.logo_url }))
      setMsg({ type: 'ok', text: 'Logo uploaded.' })
    } catch (err) { setMsg({ type: 'err', text: err.response?.data?.message || 'Logo upload failed' }) }
    e.target.value = ''
  }

  /* ── download / save / publish ── */
  const toBlob = type => new Promise(res => canvasRef.current.toBlob(res, type, 0.92))

  const download = async () => {
    const blob = await toBlob('image/png'); if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(settings.school_name || 'school').replace(/\s+/g, '-')}-${tpl}.png`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }

  const submit = async status => {
    if (!headline.trim()) return setMsg({ type: 'err', text: 'Add a headline first.' })
    if (audience === 'classes' && !selClasses.length) return setMsg({ type: 'err', text: 'Choose at least one class, or switch to "All parents".' })
    if (status === 'published' &&
        !window.confirm(`Publish this to ${audience === 'all' ? 'ALL parents' : 'parents of ' + selClasses.join(', ')}?\nThey will get a notification in the app.`)) return
    setBusy(status); setMsg(null)
    try {
      await ensureFonts(`${headline} ${subline} ${dateText}`)
      const c = canvasRef.current; const { w, h } = SIZES[size]
      c.width = w; c.height = h; drawPoster(c.getContext('2d'), w, h, poster) // redraw at full res, fonts guaranteed
      const blob = await toBlob('image/jpeg')
      const fd = new FormData()
      fd.append('image', blob, 'poster.jpg')
      fd.append('title', headline.trim())
      fd.append('caption', caption.trim() || subline.trim())
      fd.append('template_key', tpl)
      fd.append('status', status)
      if (dateISO) fd.append('event_date', dateISO)
      fd.append('target_classes', audience === 'all' ? 'all' : selClasses.join(','))
      const r = await api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMsg({ type: 'ok', text: status === 'published' ? `Published ✓  ${r.data.notified} parent(s) notified.` : 'Saved as a draft — publish it any time from "Your posters" below.' })
      loadPosts()
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.message || 'Could not save the poster.' })
    } finally { setBusy('') }
  }

  /* ── manage existing posts ── */
  const setStatus = async (p, status) => {
    if (status === 'published' && !window.confirm('Publish this to parents now? They will be notified.')) return
    try { await api.patch(`/posts/${p.id}`, { status }); loadPosts() }
    catch (err) { setMsg({ type: 'err', text: err.response?.data?.message || 'Could not update' }) }
  }
  const remove = async p => {
    if (!window.confirm('Delete this poster? Parents will no longer see it.')) return
    try { await api.delete(`/posts/${p.id}`); loadPosts() } catch { setMsg({ type: 'err', text: 'Could not delete' }) }
  }
  const saveCaption = async () => {
    try { await api.patch(`/posts/${editing.id}`, { caption: editing.caption }); setEditing(null); loadPosts() }
    catch { setMsg({ type: 'err', text: 'Could not save caption' }) }
  }

  const toggleClass = c => setSelClasses(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c])

  return (
    <Layout>
      <style>{`
        .pz-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,430px); gap:24px; align-items:start; }
        .pz-preview { position:sticky; top:16px; }
        @media (max-width: 980px) { .pz-grid { grid-template-columns:1fr; } .pz-preview { position:static; order:-1; } }
      `}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px' }}>
        <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: '#1a1814', marginBottom: 4 }}>🎉 Posters</h1>
        <p style={{ color: '#9ca3af', marginBottom: 20 }}>
          Festival wishes, holiday notices and announcements — designed in a minute and sent straight to parents in the app.
        </p>

        {setupError && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 16px', borderRadius: 12, marginBottom: 16, fontSize: 13 }}>
          ⚠️ {setupError} — ask your developer to run the <code>migrate_school_posts.js</code> migration and restart the server.
        </div>}
        {msg && <div style={{ background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#15803d' : '#b91c1c', padding: '12px 16px', borderRadius: 12, marginBottom: 16, fontSize: 13 }}>{msg.text}</div>}

        <div className="pz-grid">
          {/* ───────────── LEFT: controls ───────────── */}
          <div>
            {/* 1. design */}
            <div style={card}>
              <p style={h2}>1 · Pick a design</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8, marginBottom: 14 }}>
                {TEMPLATES.filter(t => !t.hidden).map(t => (
                  <TemplateThumb key={t.key} tpl={t} active={t.key === tpl} onClick={() => pickTemplate(t)}
                    brandColor={brand.color} logo={logoImg} schoolName={settings.school_name} fontTick={fontTick} />
                ))}
              </div>
              <span style={lbl}>Shape</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(SIZES).map(([k, v]) => (
                  <button key={k} type="button" style={chip(size === k)} onClick={() => setSize(k)}>{v.label}</button>
                ))}
              </div>

              <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 14, marginTop: 16 }}>
                <span style={{ ...lbl, color: '#0369a1' }}>✨ Or create a custom background with AI</span>
                {!bgStatus ? <p style={hint}>Checking…</p>
                 : !bgStatus.configured ? <p style={hint}>Not switched on yet — your developer needs to add the image service key on the server.</p>
                 : bgStatus.needs_migration ? <p style={hint}>One database step is needed first — ask your developer to run <code>migrate_poster_ai_images.js</code>.</p>
                 : (
                  <>
                    <textarea className="input" rows={2} value={bgTheme} maxLength={240} onChange={e => setBgTheme(e.target.value)}
                      placeholder={'Describe the look — e.g. "golden diyas and marigold flowers, warm evening glow"'} />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-primary" onClick={generateBg}
                        disabled={bgBusy || bgStatus.remaining <= 0 || bgTheme.trim().length < 3}
                        style={{ opacity: (bgBusy || bgStatus.remaining <= 0 || bgTheme.trim().length < 3) ? 0.6 : 1 }}>
                        {bgBusy ? 'Creating… (can take up to a minute)' : '✨ Create background'}
                      </button>
                      <span style={hint}>{bgStatus.remaining} of {bgStatus.limit} left today</span>
                    </div>
                    <p style={hint}>The AI draws only the picture — never words or people. Your headline, school name and logo are added on top exactly as you type them.</p>
                    {bgError && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 10, fontSize: 12, marginTop: 8 }}>{bgError}</div>}
                    {bgOptions.length > 0 && (
                      <>
                        <span style={{ ...lbl, marginTop: 12 }}>Your backgrounds — tap one to use it (kept only while this page is open)</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {bgOptions.map(o => (
                            <button key={o.id} type="button" onClick={() => chooseBg(o)} data-bg-option="1"
                              style={{ padding: 0, background: 'none', cursor: 'pointer', borderRadius: 10, overflow: 'hidden',
                                border: (tpl === 'custom' && bgSel === o.id) ? '3px solid #1a1814' : '3px solid transparent' }}>
                              <img src={o.dataUrl} alt="AI background" style={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', display: 'block' }} />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 2. message */}
            <div style={card}>
              <p style={h2}>2 · Write the message</p>

              <div style={{ background: '#f5f3ff', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <span style={{ ...lbl, color: '#5b21b6' }}>✨ Let AI write it for you (optional)</span>
                <textarea className="input" rows={2} value={details} onChange={e => setDetails(e.target.value)}
                  placeholder={'Anything the AI should mention — e.g. "School closed 1–2 Nov, reopens Monday 3 Nov"'} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select className="input" style={{ maxWidth: 170 }} value={lang} onChange={e => setLang(e.target.value)}>
                    {LANGS.map(l => <option key={l.k} value={l.k}>{l.l}</option>)}
                  </select>
                  <select className="input" style={{ maxWidth: 120 }} value={tone} onChange={e => setTone(e.target.value)}>
                    {TONES.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}
                  </select>
                  <button type="button" className="btn-primary" disabled={aiBusy} onClick={writeWithAI} style={{ opacity: aiBusy ? 0.6 : 1 }}>
                    {aiBusy ? 'Writing…' : '✨ Write with AI'}
                  </button>
                </div>
                <p style={hint}>The AI only writes the words. Dates and details come from what you type — it won't invent any.</p>
              </div>

              <span style={lbl}>Headline (big text on the poster)</span>
              <input className="input" value={headline} maxLength={70} onChange={e => { setHeadline(e.target.value); setTouched(t => ({ ...t, head: true })) }} />

              <span style={{ ...lbl, marginTop: 12 }}>Message on the poster</span>
              <textarea className="input" rows={2} value={subline} maxLength={200} onChange={e => { setSubline(e.target.value); setTouched(t => ({ ...t, sub: true })) }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <span style={lbl}>Small label (optional)</span>
                  <input className="input" value={tag} maxLength={30} placeholder="e.g. HOLIDAY NOTICE" onChange={e => { setTag(e.target.value); setTouched(t => ({ ...t, tag: true })) }} />
                </div>
                <div>
                  <span style={lbl}>Date (optional)</span>
                  <input className="input" type="date" value={dateISO} onChange={e => { setDateISO(e.target.value); setDateText(fmtDate(e.target.value)) }} />
                </div>
              </div>
              <span style={{ ...lbl, marginTop: 12 }}>Date text shown on the poster (edit freely)</span>
              <input className="input" value={dateText} maxLength={60} placeholder='e.g. "Saturday, 1 November 2026" or "1–3 Nov · School closed"' onChange={e => setDateText(e.target.value)} />

              <span style={{ ...lbl, marginTop: 12 }}>Message parents read in the app</span>
              <textarea className="input" rows={3} value={caption} maxLength={700} onChange={e => setCaption(e.target.value)}
                placeholder="Leave blank to use the poster message" />
            </div>

            {/* 3. audience */}
            <div style={card}>
              <p style={h2}>3 · Who should get it?</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button type="button" style={chip(audience === 'all')} onClick={() => setAudience('all')}>All parents</button>
                <button type="button" style={chip(audience === 'classes')} onClick={() => setAudience('classes')}>Selected classes</button>
              </div>
              {audience === 'classes' && (
                classes.length === 0
                  ? <p style={hint}>No classes found yet — add students first.</p>
                  : <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {classes.map(c => <button key={c} type="button" style={chip(selClasses.includes(c))} onClick={() => toggleClass(c)}>{c}</button>)}
                    </div>
              )}
            </div>

            {/* branding */}
            <div style={card}>
              <p style={h2}>School branding <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>· set once, used on every poster</span></p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f3f4f6', overflow: 'hidden', display: 'grid', placeItems: 'center', border: '1px solid #e5e7eb' }}>
                  {settings.logo_url ? <img src={settings.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: '#9ca3af' }}>No logo</span>}
                </div>
                <div>
                  <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>{settings.logo_url ? 'Change logo' : 'Upload logo'}</button>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={onLogoFile} />
                  <p style={hint}>Square works best · PNG or JPG · up to 3 MB</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={lbl}>Signed by</span>
                  <input className="input" value={brand.principal} placeholder="e.g. Dr. S. Lakshmi, Principal" onChange={e => setBrand(b => ({ ...b, principal: e.target.value }))} />
                </div>
                <div>
                  <span style={lbl}>Tagline</span>
                  <input className="input" value={brand.tagline} placeholder="e.g. Nurturing minds" onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                <div>
                  <span style={lbl}>Brand colour</span>
                  <input type="color" value={brand.color} onChange={e => setBrand(b => ({ ...b, color: e.target.value }))} style={{ width: 56, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: 2, background: 'white' }} />
                </div>
                <button type="button" className="btn-ghost" style={{ marginTop: 18 }} disabled={savingBrand} onClick={saveBrand}>{savingBrand ? 'Saving…' : 'Save branding'}</button>
              </div>
            </div>
          </div>

          {/* ───────────── RIGHT: preview ───────────── */}
          <div className="pz-preview">
            <div style={{ ...card, padding: 14 }}>
              <canvas ref={canvasRef} width={SIZES[size].w} height={SIZES[size].h}
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }} />
              <p style={{ ...hint, textAlign: 'center' }}>Live preview · {SIZES[size].w} × {SIZES[size].h}px</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={download}>⬇ Download</button>
                <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => submit('draft')}>{busy === 'draft' ? 'Saving…' : 'Save draft'}</button>
                <button type="button" className="btn-primary" disabled={!!busy} onClick={() => submit('published')} style={{ flex: 1, justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                  {busy === 'published' ? 'Publishing…' : '📣 Publish to parents'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ───────────── existing posts ───────────── */}
        <div style={{ marginTop: 12 }}>
          <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: '#1a1814', marginBottom: 12 }}>Your posters</h2>
          {posts.length === 0
            ? <div style={{ ...card, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Nothing here yet — your first poster will appear here.</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {posts.map(p => (
                  <div key={p.id} style={{ background: 'white', borderRadius: 16, border: '1px solid #f0ede8', overflow: 'hidden' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={p.image_url} alt={p.title} style={{ width: '100%', display: 'block' }} loading="lazy" />
                      <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                        background: p.status === 'published' ? '#dcfce7' : '#fef3c7', color: p.status === 'published' ? '#15803d' : '#92400e' }}>
                        {p.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div style={{ padding: 12 }}>
                      <p style={{ fontWeight: 700, color: '#1a1814', fontSize: 14 }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 8px' }}>
                        {p.target_classes ? `To: ${p.target_classes.split(',').join(', ')}` : 'To: all parents'} · {new Date(p.published_at || p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                      {editing?.id === p.id ? (
                        <>
                          <textarea className="input" rows={3} value={editing.caption} onChange={e => setEditing({ ...editing, caption: e.target.value })} />
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <button className="btn-primary" style={{ fontSize: 12 }} onClick={saveCaption}>Save</button>
                            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditing(null)}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          {p.caption && <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.caption}</p>}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {p.status === 'draft'
                              ? <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => setStatus(p, 'published')}>Publish</button>
                              : <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setStatus(p, 'draft')}>Unpublish</button>}
                            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditing({ id: p.id, caption: p.caption || '' })}>Edit text</button>
                            <button className="btn-ghost" style={{ fontSize: 12, color: '#dc2626' }} onClick={() => remove(p)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </Layout>
  )
}