import { useState, useEffect } from 'react'
import SchoolLanding from './SchoolLanding'
import api from '../api/axios'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')
const BOARDS   = ['All','CBSE','ICSE','State Board','IB','IGCSE']
const CITIES   = ['Hyderabad','Bangalore','Chennai','Mumbai','Delhi','Pune']

function fmtFee(min, max) {
  const f = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${(n/1000).toFixed(0)}K`
  if (min && max) return `${f(min)} – ${f(max)}/yr`
  if (min) return `From ${f(min)}/yr`
  return 'Contact school'
}

export default function SchoolDiscovery() {
  const [schools,  setSchools]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(null)
  const [locating, setLocating] = useState(false)
  const [filters,  setFilters]  = useState({ area:'', board:'All' })
  const setFilter = f => v => setFilters(p => ({ ...p, [f]: v }))

  // ── On load — check for ?ref= (from Google Ad) ────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref    = params.get('ref')
    const schoolId = params.get('school')

    if (ref) {
      // Track click
      api.post('/ads/track', { event_type:'click', source:'google' }).catch(() => {})

      // Load school directly from slug and show landing page
      api.get(`/ads/slug/${ref}`)
        .then(res => {
          const sid = res.data.school_id
          return api.get(`/discovery/schools/${sid}`)
        })
        .then(res => {
          const school = res.data
          school.facilities = Array.isArray(school.facilities)
            ? school.facilities
            : (school.facilities || '').split(',').map(f => f.trim()).filter(Boolean)
          // Go directly to landing page
          setSelected(school)
        })
        .catch(() => loadAllSchools())
    } else if (schoolId) {
      // Direct school ID link
      api.get(`/discovery/schools/${schoolId}`)
        .then(res => {
          const school = res.data
          school.facilities = Array.isArray(school.facilities)
            ? school.facilities
            : (school.facilities || '').split(',').map(f => f.trim()).filter(Boolean)
          setSelected(school)
        })
        .catch(() => loadAllSchools())
    }
  }, [])

  const loadAllSchools = async (params = {}) => {
    setLoading(true); setSearched(true)
    try {
      const res = await api.get('/discovery/schools', { params })
      setSchools(res.data)
    } catch { setSchools([]) }
    finally { setLoading(false) }
  }

  const searchSchools = () => {
    const params = {}
    if (filters.area.trim())     params.area  = filters.area.trim()
    if (filters.board !== 'All') params.board = filters.board
    loadAllSchools(params)
  }

  const detectLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        loadAllSchools({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => { setLocating(false); alert('Could not detect location. Please type your area.') }
    )
  }

  const handleSelectSchool = (school) => {
    // Normalize facilities
    if (!Array.isArray(school.facilities)) {
      school.facilities = (school.facilities || '').split(',').map(f => f.trim()).filter(Boolean)
    }
    setSelected(school)
  }

  // ── If a school is selected — show its full landing page ──────────────────
  if (selected) {
    return <SchoolLanding school={selected} onBack={() => setSelected(null)} />
  }

  // ── Discovery page ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f8f6f1', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* HERO */}
      <div style={{ background:'linear-gradient(135deg,#1a1814 0%,#2d2820 60%,#d4521a 100%)', padding:'60px 16px 80px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 80% 50%,rgba(212,82,26,0.15),transparent 60%)', pointerEvents:'none' }} />

        {/* Nav */}
        <div style={{ maxWidth:1000, margin:'0 auto 48px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:24, fontWeight:800, color:'white' }}>
            Enroll<span style={{ color:'#d4521a' }}>IQ</span>
          </h1>
          <a href="/login" style={{ background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, padding:'8px 20px', fontSize:13, fontWeight:600, textDecoration:'none' }}>
            School login →
          </a>
        </div>

        {/* Hero text */}
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-block', background:'rgba(212,82,26,0.2)', border:'1px solid rgba(212,82,26,0.4)', borderRadius:20, padding:'4px 16px', marginBottom:20 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#fb923c', letterSpacing:'0.08em', textTransform:'uppercase' }}>Find the right school for your child</span>
          </div>
          <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(30px,7vw,48px)', fontWeight:800, color:'white', lineHeight:1.15, marginBottom:16 }}>
            Discover the best schools<br />
            <span style={{ color:'#fb923c', fontStyle:'italic' }}>near you.</span>
          </h2>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'clamp(14px,3.5vw,16px)', lineHeight:1.6, marginBottom:40 }}>
            Browse top CBSE, ICSE and IB schools. Send your enquiry —<br />admissions team calls you within 24 hours.
          </p>

          {/* Search bar */}
          <div style={{ background:'white', borderRadius:16, padding:8, display:'flex', gap:8, maxWidth:560, margin:'0 auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', flexWrap:'wrap' }}>
            <input value={filters.area} onChange={e => setFilter('area')(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchSchools()}
              placeholder="Search by area, city or school name..."
              style={{ flex:1, minWidth:140, border:'none', outline:'none', padding:'10px 14px', fontSize:15, background:'transparent' }} />
            <button onClick={detectLocation} disabled={locating} title="Use my location"
              style={{ background:'#f8f6f1', border:'none', borderRadius:10, width:44, height:44, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {locating ? '⏳' : '📍'}
            </button>
            <button onClick={searchSchools}
              style={{ background:'#d4521a', color:'white', border:'none', borderRadius:10, padding:'0 24px', fontSize:15, fontWeight:700, cursor:'pointer', flexShrink:0, height:44 }}>
              Search
            </button>
          </div>

          {/* City pills */}
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
            {CITIES.map(city => (
              <button key={city} onClick={() => { setFilter('area')(city); loadAllSchools({ area: city }) }}
                style={{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'5px 14px', fontSize:12, cursor:'pointer' }}>
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <div style={{ maxWidth:1000, margin:'-32px auto 0', padding:'0 16px 60px', position:'relative' }}>

        {/* Filter bar */}
        <div style={{ background:'white', borderRadius:16, padding:'14px 20px', marginBottom:24, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>Board:</span>
          {BOARDS.map(b => (
            <button key={b} onClick={() => { setFilter('board')(b); loadAllSchools({ board: b !== 'All' ? b : undefined, area: filters.area || undefined }) }}
              style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid', borderColor:filters.board===b?'#d4521a':'#e5e7eb', background:filters.board===b?'#fdf0ea':'white', color:filters.board===b?'#d4521a':'#6b7280', fontSize:12, fontWeight:500, cursor:'pointer' }}>
              {b}
            </button>
          ))}
          {searched && schools.length > 0 && (
            <span style={{ marginLeft:'auto', fontSize:12, color:'#9ca3af' }}>{schools.length} schools found</span>
          )}
        </div>

        {/* State: not searched */}
        {!searched ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <p style={{ fontSize:48, marginBottom:12 }}>🏫</p>
            <p style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:700, color:'#1a1814', marginBottom:8 }}>
              Find your child's perfect school
            </p>
            <p style={{ color:'#9ca3af', fontSize:14, marginBottom:24 }}>Search by area or tap 📍 to find schools near you</p>
            <button onClick={() => loadAllSchools()}
              style={{ background:'#1a1814', color:'white', border:'none', borderRadius:12, padding:'12px 28px', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Show all schools →
            </button>
          </div>
        ) : loading ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ width:40, height:40, border:'4px solid #f3f4f6', borderTop:'4px solid #d4521a', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color:'#9ca3af', fontSize:14 }}>Finding schools...</p>
          </div>
        ) : schools.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <p style={{ fontSize:40, marginBottom:12 }}>🔍</p>
            <p style={{ fontSize:18, fontWeight:600, color:'#1a1814', marginBottom:6 }}>No schools found</p>
            <p style={{ color:'#9ca3af', fontSize:14 }}>Try a different area or board</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20 }}>
            {schools.map(school => (
              <div key={school.id} onClick={() => handleSelectSchool(school)}
                style={{ background:'white', borderRadius:20, overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1.5px solid transparent', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.12)'; e.currentTarget.style.borderColor='#d4521a' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor='transparent' }}>

                {/* Banner */}
                <div style={{ height:150, background:'linear-gradient(135deg,#1a1814,#d4521a)', position:'relative', overflow:'hidden' }}>
                  {school.banner_url
                    ? <img src={`${BASE_URL}${school.banner_url}`} alt={school.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontFamily:'Georgia,serif', fontSize:64, fontWeight:900, color:'rgba(255,255,255,0.12)' }}>{school.name[0]}</span>
                      </div>
                  }
                  {school.distance_km && school.distance_km < 9999 && (
                    <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.6)', borderRadius:8, padding:'3px 8px', backdropFilter:'blur(4px)' }}>
                      <span style={{ color:'white', fontSize:11, fontWeight:600 }}>📍 {school.distance_km} km</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <h3 style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:700, color:'#1a1814', lineHeight:1.3, flex:1, marginRight:8 }}>{school.name}</h3>
                    {school.rating > 0 && (
                      <span style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0, fontSize:13, fontWeight:700, color:'#1a1814' }}>
                        <span style={{ color:'#f59e0b' }}>★</span>{school.rating}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                    {school.board && <span style={{ fontSize:11, fontWeight:700, background:'#fdf0ea', color:'#d4521a', padding:'3px 10px', borderRadius:12 }}>{school.board}</span>}
                    {(school.area || school.city) && <span style={{ fontSize:11, color:'#9ca3af' }}>📍 {school.area || school.city}</span>}
                  </div>
                  {school.grades_offered && <p style={{ fontSize:12, color:'#6b7280', marginBottom:5 }}>🎓 {school.grades_offered}</p>}
                  <p style={{ fontSize:12, color:'#6b7280', marginBottom:16 }}>💰 {fmtFee(school.fee_range_min, school.fee_range_max)}</p>

                  {/* Facilities pills */}
                  {school.facilities?.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:14 }}>
                      {(Array.isArray(school.facilities) ? school.facilities : school.facilities.split(',')).slice(0,3).map(f => (
                        <span key={f} style={{ fontSize:10, color:'#6b7280', background:'#f8f6f1', padding:'2px 8px', borderRadius:10 }}>{f.trim()}</span>
                      ))}
                    </div>
                  )}

                  <button onClick={e => { e.stopPropagation(); handleSelectSchool(school) }}
                    style={{ width:'100%', background:'#1a1814', color:'white', border:'none', borderRadius:12, padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    View School →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}