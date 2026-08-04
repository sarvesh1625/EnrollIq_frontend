import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const FACILITIES_LIST = [
  { icon:'📚', name:'Library' },
  { icon:'⚽', name:'Sports Ground' },
  { icon:'🔬', name:'Science Lab' },
  { icon:'💻', name:'Computer Lab' },
  { icon:'🚌', name:'Transport' },
  { icon:'🍽️', name:'Canteen' },
  { icon:'🏊', name:'Swimming Pool' },
  { icon:'🎭', name:'Auditorium' },
  { icon:'🎵', name:'Music Room' },
  { icon:'🎨', name:'Art Room' },
  { icon:'📹', name:'CCTV' },
  { icon:'📱', name:'Smart Classes' },
  { icon:'🏃', name:'Playground' },
  { icon:'❄️', name:'AC Classrooms' },
  { icon:'🏠', name:'Hostel' },
  { icon:'🔭', name:'Physics Lab' },
  { icon:'🧪', name:'Chemistry Lab' },
  { icon:'📡', name:'WiFi Campus' },
  { icon:'🎤', name:'Dance Room' },
  { icon:'🏋️', name:'Gymnasium' },
]

const BOARDS    = ['CBSE','ICSE','State Board','IB','IGCSE','NIOS']
const MEDIUMS   = ['English','Telugu','Hindi','English & Telugu']
const GRADES    = ['Pre-KG to Grade 5','Pre-KG to Grade 8','Pre-KG to Grade 10','Pre-KG to Grade 12','Grade 1 to Grade 10','Grade 1 to Grade 12','LKG to Grade 10','LKG to Grade 12']

export default function SchoolProfile() {
  const { user } = useAuth()
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingG,setUploadingG]= useState(false)
  const [toast,     setToast]     = useState('')
  const [slug,      setSlug]      = useState('')
  const [bannerPreview, setBannerPreview] = useState(null)
  const [gallery,   setGallery]   = useState([])
  const [activeTab, setActiveTab] = useState('basic')

  const bannerRef  = useRef(null)
  const galleryRef = useRef(null)

  // Form state — all school profile fields
  const [form, setForm] = useState({
    // Basic info
    name:             '',
    tagline:          '',
    description:      '',
    board:            'CBSE',
    medium:           'English',
    grades_offered:   '',
    established_year: '',
    affiliation_no:   '',
    principal_name:   '',
    school_timing:    '',
    phone:            '',
    email:            '',
    website:          '',
    whatsapp_number:  '',
    // Location
    area:      '',
    city:      '',
    address:   '',
    latitude:  '',
    longitude: '',
    // Fees
    fee_range_min: '',
    fee_range_max: '',
    // Facilities (comma-separated)
    facilities: '',
    // Highlights (comma-separated)
    highlights: '',
  })

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  useEffect(() => {
    api.get('/schools/my').then(res => {
      const sc = res.data
      setForm({
        name:             sc.name             || '',
        tagline:          sc.tagline          || '',
        description:      sc.description      || '',
        board:            sc.board            || 'CBSE',
        medium:           sc.medium           || 'English',
        grades_offered:   sc.grades_offered   || '',
        established_year: sc.established_year || '',
        affiliation_no:   sc.affiliation_no   || '',
        principal_name:   sc.principal_name   || '',
        school_timing:    sc.school_timing    || '',
        phone:            sc.phone            || '',
        email:            sc.email            || '',
        website:          sc.website          || '',
        whatsapp_number:  sc.whatsapp_number  || '',
        area:             sc.area             || '',
        city:             sc.city             || '',
        address:          sc.address          || '',
        latitude:         sc.latitude         || '',
        longitude:        sc.longitude        || '',
        fee_range_min:    sc.fee_range_min    || '',
        fee_range_max:    sc.fee_range_max    || '',
        facilities:       sc.facilities       || '',
        highlights:       sc.highlights       || '',
      })
      if (sc.banner_url) setBannerPreview(`http://localhost:5000${sc.banner_url}`)
    }).catch(() => {})

    api.get('/discovery/gallery').then(res => setGallery(res.data)).catch(() => {})
    api.get('/ads/my').then(res => setSlug(res.data.ad?.landing_slug || '')).catch(() => {})
  }, [])

  // Facilities toggle
  const selectedFacilities = form.facilities
    ? form.facilities.split(',').map(f => f.trim()).filter(Boolean)
    : []

  const toggleFacility = name => {
    const s = new Set(selectedFacilities)
    s.has(name) ? s.delete(name) : s.add(name)
    setForm(p => ({ ...p, facilities: [...s].join(',') }))
  }

  // Highlights — array of {heading, content}
  const highlights = (() => {
    try {
      const raw = form.highlights
      if (!raw) return []
      if (raw.startsWith('[')) return JSON.parse(raw)
      // Legacy comma-separated
      return raw.split(',').map(h => ({ heading: h.trim(), content: '' })).filter(h => h.heading)
    } catch { return [] }
  })()

  const setHighlights = arr => {
    setForm(p => ({ ...p, highlights: JSON.stringify(arr) }))
  }

  const addHighlight = () => {
    setHighlights([...highlights, { heading: '', content: '' }])
  }

  const updateHighlight = (i, field, val) => {
    const updated = [...highlights]
    updated[i] = { ...updated[i], [field]: val }
    setHighlights(updated)
  }

  const removeHighlight = i => {
    setHighlights(highlights.filter((_, idx) => idx !== i))
  }

  // Banner upload
  const handleBannerUpload = async e => {
    const file = e.target.files[0]; if (!file) return
    new FileReader().onload = ev => setBannerPreview(ev.target.result)
    const reader = new FileReader()
    reader.onload = ev => setBannerPreview(ev.target.result)
    reader.readAsDataURL(file)
    const fd = new FormData(); fd.append('banner', file)
    setUploading(true)
    try {
      await api.post(`/discovery/upload-banner/${user?.school_id}`, fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      showToast('✅ Banner uploaded!')
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || 'Upload failed')) }
    finally { setUploading(false) }
  }

  // Gallery upload
  const handleGalleryUpload = async e => {
    const files = Array.from(e.target.files); if (!files.length) return
    const fd = new FormData()
    files.forEach(f => fd.append('images', f))
    setUploadingG(true)
    try {
      const res = await api.post('/discovery/upload-gallery', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      setGallery(prev => [...prev, ...(res.data.images || [])])
      showToast(`✅ ${files.length} photo(s) added!`)
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || 'Upload failed')) }
    finally { setUploadingG(false); e.target.value = '' }
  }

  const deleteGalleryImage = async id => {
    if (!confirm('Remove this photo?')) return
    await api.delete(`/discovery/gallery/${id}`).catch(() => {})
    setGallery(prev => prev.filter(img => img.id !== id))
    showToast('Photo removed')
  }

  // Save all
  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/discovery/school-profile', form)
      showToast('✅ Profile saved and published!')
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || 'Save failed')) }
    finally { setSaving(false) }
  }

  const TABS = [
    { key:'basic',      label:'Basic Info'    },
    { key:'location',   label:'Location'      },
    { key:'facilities', label:'Facilities'    },
    { key:'highlights', label:'Highlights'    },
    { key:'banner',     label:'Banner & Photos'},
  ]

  const INPUT = { width:'100%', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'10px 14px', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#1a1814', background:'white' }
  const LABEL = { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }
  const SECTION = { marginBottom:24 }
  const SECTION_TITLE = { fontSize:13, fontWeight:600, color:'#1a1814', marginBottom:14, paddingBottom:8, borderBottom:'1px solid #f0ede8' }

  return (
    <Layout>
      <div className="page" style={{ maxWidth:860 }}>
        {toast && (
          <div style={{ position:'fixed', top:20, right:20, zIndex:100, background:'#1a1814', color:'white', padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:500 }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:600, color:'#1a1814', fontFamily:'Georgia,serif', marginBottom:4 }}>
              School Public Profile
            </h1>
            <p style={{ fontSize:13, color:'#9ca3af' }}>Manage what parents see on your school landing page</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <a href={`/discover?ref=${slug}`} target="_blank" rel="noreferrer"
              style={{ background:'white', color:'#d4521a', border:'1.5px solid #d4521a', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
              👁 Preview public page →
            </a>
            <button onClick={handleSave} disabled={saving}
              style={{ background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saving?0.6:1 }}>
              {saving ? 'Saving...' : '✓ Save & Publish'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'white', border:'1px solid #f0ede8', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background:activeTab===t.key?'#1a1814':'transparent', color:activeTab===t.key?'white':'#6b7280', transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background:'white', border:'1px solid #f0ede8', borderRadius:16, padding:24 }}>

          {/* ── BASIC INFO ── */}
          {activeTab === 'basic' && (
            <div>
              <div style={SECTION}>
                <p style={SECTION_TITLE}>School Identity</p>
                <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={LABEL}>School name</label>
                    <input style={INPUT} value={form.name} onChange={set('name')} placeholder="e.g. CMR School Madhapur" />
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={LABEL}>Tagline</label>
                    <input style={INPUT} value={form.tagline} onChange={set('tagline')} placeholder="e.g. Shaping tomorrow's leaders since 2005" />
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={LABEL}>About the school</label>
                    <textarea style={{ ...INPUT, resize:'none' }} rows={4} value={form.description} onChange={set('description')}
                      placeholder="Describe your school's vision, achievements and what makes it special..." />
                  </div>
                </div>
              </div>

              <div style={SECTION}>
                <p style={SECTION_TITLE}>Academic Details</p>
                <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={LABEL}>Board</label>
                    <select style={INPUT} value={form.board} onChange={set('board')}>
                      {BOARDS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Medium of instruction</label>
                    <select style={INPUT} value={form.medium} onChange={set('medium')}>
                      {MEDIUMS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Grades offered</label>
                    <select style={INPUT} value={form.grades_offered} onChange={set('grades_offered')}>
                      <option value="">Select range</option>
                      {GRADES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Established year</label>
                    <input style={INPUT} type="number" value={form.established_year} onChange={set('established_year')} placeholder="e.g. 2005" min={1900} max={2024} />
                  </div>
                  <div>
                    <label style={LABEL}>Affiliation number</label>
                    <input style={INPUT} value={form.affiliation_no} onChange={set('affiliation_no')} placeholder="e.g. 3530123" />
                  </div>
                  <div>
                    <label style={LABEL}>Principal name</label>
                    <input style={INPUT} value={form.principal_name} onChange={set('principal_name')} placeholder="Principal's full name" />
                  </div>
                  <div>
                    <label style={LABEL}>School timing</label>
                    <input style={INPUT} value={form.school_timing} onChange={set('school_timing')} placeholder="e.g. 8:00 AM – 4:00 PM" />
                  </div>
                </div>
              </div>

              <div style={SECTION}>
                <p style={SECTION_TITLE}>Fee Range</p>
                <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={LABEL}>Minimum fee (₹/year)</label>
                    <input style={INPUT} type="number" value={form.fee_range_min} onChange={set('fee_range_min')} placeholder="e.g. 25000" />
                  </div>
                  <div>
                    <label style={LABEL}>Maximum fee (₹/year)</label>
                    <input style={INPUT} type="number" value={form.fee_range_max} onChange={set('fee_range_max')} placeholder="e.g. 80000" />
                  </div>
                </div>
              </div>

              <div style={SECTION}>
                <p style={SECTION_TITLE}>Contact Details</p>
                <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={LABEL}>Phone number</label>
                    <input style={INPUT} value={form.phone} onChange={set('phone')} placeholder="School contact number" />
                  </div>
                  <div>
                    <label style={LABEL}>WhatsApp number</label>
                    <input style={INPUT} value={form.whatsapp_number} onChange={set('whatsapp_number')} placeholder="WhatsApp number" />
                  </div>
                  <div>
                    <label style={LABEL}>Email</label>
                    <input style={INPUT} type="email" value={form.email} onChange={set('email')} placeholder="school@example.com" />
                  </div>
                  <div>
                    <label style={LABEL}>Website</label>
                    <input style={INPUT} value={form.website} onChange={set('website')} placeholder="https://yourschool.com" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LOCATION ── */}
          {activeTab === 'location' && (
            <div>
              <div style={SECTION}>
                <p style={SECTION_TITLE}>School Address</p>
                <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={LABEL}>Full address</label>
                    <textarea style={{ ...INPUT, resize:'none' }} rows={2} value={form.address} onChange={set('address')} placeholder="Door no, Street, Area, City, State — 500081" />
                  </div>
                  <div>
                    <label style={LABEL}>Area / Locality</label>
                    <input style={INPUT} value={form.area} onChange={set('area')} placeholder="e.g. Madhapur" />
                  </div>
                  <div>
                    <label style={LABEL}>City</label>
                    <input style={INPUT} value={form.city} onChange={set('city')} placeholder="e.g. Hyderabad" />
                  </div>
                </div>
              </div>

              <div style={SECTION}>
                <p style={SECTION_TITLE}>GPS Coordinates</p>
                <div style={{ background:'#fdf0ea', border:'1px solid #fbd6c2', borderRadius:12, padding:14, marginBottom:16 }}>
                  <p style={{ fontSize:13, color:'#c0410e', fontWeight:600, marginBottom:6 }}>How to get coordinates</p>
                  <ol style={{ fontSize:12, color:'#6b7280', paddingLeft:18, lineHeight:2 }}>
                    <li>Open <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color:'#d4521a' }}>Google Maps</a></li>
                    <li>Search for your school name</li>
                    <li>Right-click on the exact location</li>
                    <li>Click the coordinates shown at top — they copy automatically</li>
                    <li>Paste latitude and longitude below</li>
                  </ol>
                </div>
                <div className="g-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={LABEL}>Latitude</label>
                    <input style={INPUT} value={form.latitude} onChange={set('latitude')} placeholder="e.g. 17.4435" />
                  </div>
                  <div>
                    <label style={LABEL}>Longitude</label>
                    <input style={INPUT} value={form.longitude} onChange={set('longitude')} placeholder="e.g. 78.3772" />
                  </div>
                </div>
                {form.latitude && form.longitude && (
                  <div style={{ marginTop:12 }}>
                    <a href={`https://maps.google.com?q=${form.latitude},${form.longitude}`} target="_blank" rel="noreferrer"
                      style={{ fontSize:12, color:'#d4521a', textDecoration:'none' }}>
                      ✓ Verify on Google Maps →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FACILITIES ── */}
          {activeTab === 'facilities' && (
            <div>
              <p style={SECTION_TITLE}>Select all facilities your school offers</p>
              <p style={{ fontSize:13, color:'#9ca3af', marginBottom:20, marginTop:-10 }}>
                These appear as badges on your school landing page
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10 }}>
                {FACILITIES_LIST.map(fac => {
                  const selected = selectedFacilities.includes(fac.name)
                  return (
                    <button key={fac.name} type="button" onClick={() => toggleFacility(fac.name)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:`1.5px solid ${selected?'#1a1814':'#e5e7eb'}`, background:selected?'#1a1814':'white', cursor:'pointer', transition:'all 0.15s' }}>
                      <span style={{ fontSize:20 }}>{fac.icon}</span>
                      <span style={{ fontSize:13, fontWeight:500, color:selected?'white':'#374151' }}>{fac.name}</span>
                      {selected && <span style={{ marginLeft:'auto', fontSize:12, color:'white' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop:16, padding:'12px 14px', background:'#f8f6f1', borderRadius:10 }}>
                <p style={{ fontSize:12, color:'#9ca3af' }}>
                  {selectedFacilities.length} facilities selected:
                  {selectedFacilities.length > 0 && <span style={{ color:'#1a1814', fontWeight:500 }}> {selectedFacilities.join(', ')}</span>}
                </p>
              </div>
            </div>
          )}

          {/* ── HIGHLIGHTS ── */}
          {activeTab === 'highlights' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <p style={SECTION_TITLE}>Why choose us — highlights</p>
                  <p style={{ fontSize:13, color:'#9ca3af', marginTop:-10 }}>
                    Each highlight has a heading and description. These appear in the "Why choose {form.name || 'us'}?" section.
                  </p>
                </div>
                <button onClick={addHighlight}
                  style={{ background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                  + Add highlight
                </button>
              </div>

              {highlights.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'#9ca3af' }}>
                  <p style={{ fontSize:32, marginBottom:8 }}>✦</p>
                  <p style={{ fontSize:14, fontWeight:500, color:'#374151', marginBottom:4 }}>No highlights yet</p>
                  <p style={{ fontSize:13 }}>Add what makes your school special</p>
                  <button onClick={addHighlight}
                    style={{ marginTop:16, background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    + Add first highlight
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {highlights.map((h, i) => (
                    <div key={i} style={{ border:'1px solid #f0ede8', borderRadius:14, padding:16, position:'relative' }}>
                      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:'#fdf0ea', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#d4521a', flexShrink:0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                          <div>
                            <label style={LABEL}>Heading</label>
                            <input style={INPUT} value={h.heading} onChange={e => updateHighlight(i,'heading',e.target.value)}
                              placeholder="e.g. Award-winning faculty" />
                          </div>
                          <div>
                            <label style={LABEL}>Description (optional)</label>
                            <textarea style={{ ...INPUT, resize:'none' }} rows={2} value={h.content} onChange={e => updateHighlight(i,'content',e.target.value)}
                              placeholder="e.g. Our teachers have 15+ years of experience and are trained in modern teaching methods" />
                          </div>
                        </div>
                        <button onClick={() => removeHighlight(i)}
                          style={{ background:'#fef2f2', color:'#dc2626', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:13, flexShrink:0 }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addHighlight}
                    style={{ border:'2px dashed #e5e7eb', background:'white', borderRadius:14, padding:14, fontSize:13, color:'#9ca3af', cursor:'pointer', textAlign:'center' }}>
                    + Add another highlight
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── BANNER & PHOTOS ── */}
          {activeTab === 'banner' && (
            <div>
              {/* Banner */}
              <div style={SECTION}>
                <p style={SECTION_TITLE}>Hero Banner Image</p>
                <p style={{ fontSize:13, color:'#9ca3af', marginBottom:14, marginTop:-10 }}>
                  This is the first thing parents see. Recommended: 1400×500px, JPG/PNG, max 5MB
                </p>
                <div style={{ position:'relative', height:200, borderRadius:14, overflow:'hidden', background:'#f8f6f1', border:'2px dashed #e5e7eb', marginBottom:12, cursor:'pointer' }}
                  onClick={() => bannerRef.current?.click()}>
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#9ca3af' }}>
                      <span style={{ fontSize:36, marginBottom:8 }}>🏫</span>
                      <p style={{ fontSize:13 }}>Click to upload banner</p>
                    </div>
                  )}
                  {uploading && (
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <p style={{ color:'white', fontWeight:600 }}>Uploading...</p>
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleBannerUpload} />
                <button onClick={() => bannerRef.current?.click()} disabled={uploading}
                  style={{ background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:uploading?0.6:1 }}>
                  {uploading ? 'Uploading...' : '📷 Upload Banner'}
                </button>
              </div>

              {/* Gallery */}
              <div style={SECTION}>
                <p style={SECTION_TITLE}>Photo Gallery</p>
                <p style={{ fontSize:13, color:'#9ca3af', marginBottom:14, marginTop:-10 }}>
                  Show parents your campus, classrooms, labs and events. Select multiple at once.
                </p>
                {gallery.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                    {gallery.map(img => (
                      <div key={img.id} style={{ position:'relative', borderRadius:12, overflow:'hidden', aspectRatio:'1/1', background:'#f8f6f1' }}
                        onMouseEnter={e => e.currentTarget.querySelector('.del-btn').style.opacity='1'}
                        onMouseLeave={e => e.currentTarget.querySelector('.del-btn').style.opacity='0'}>
                        <img src={`http://localhost:5000${img.image_url}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        <button className="del-btn" onClick={() => deleteGalleryImage(img.id)}
                          style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.6)', color:'white', border:'none', borderRadius:6, width:28, height:28, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}>
                          ✕
                        </button>
                        {img.caption && (
                          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,0.6))', padding:'16px 8px 6px' }}>
                            <p style={{ color:'white', fontSize:11 }}>{img.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleGalleryUpload} />
                <button onClick={() => galleryRef.current?.click()} disabled={uploadingG}
                  style={{ border:'2px dashed #e5e7eb', background:'white', borderRadius:12, padding:'12px 20px', fontSize:13, color:'#6b7280', cursor:'pointer', width:'100%', opacity:uploadingG?0.6:1 }}>
                  {uploadingG ? 'Uploading...' : `+ Add photos (${gallery.length} uploaded) — select multiple at once`}
                </button>
              </div>
            </div>
          )}

          {/* Save button bottom */}
          <div style={{ borderTop:'1px solid #f0ede8', paddingTop:20, marginTop:8, display:'flex', gap:12 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'10px 24px', fontSize:14, fontWeight:600, cursor:'pointer', opacity:saving?0.6:1 }}>
              {saving ? 'Saving...' : '✓ Save & Publish Profile'}
            </button>
            <a href={`/discover?ref=${slug}`} target="_blank" rel="noreferrer"
              style={{ background:'white', color:'#d4521a', border:'1.5px solid #d4521a', borderRadius:10, padding:'10px 20px', fontSize:14, fontWeight:600, textDecoration:'none' }}>
              👁 Preview →
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}