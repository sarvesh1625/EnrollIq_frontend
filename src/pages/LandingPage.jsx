import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
// import  from '../components/Logo'
import logo from '../assets/logo.jpeg'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const GRADES = [
  'Pre-KG','LKG','UKG',
  'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10',
]

// Mock schools — replace with real API: GET /api/schools/public
const MOCK_SCHOOLS = [
  {
    id: 1, name: 'ABC International School', city: 'Madhapur', area: 'Hyderabad',
    board: 'CBSE', rating: 4.8, reviews: 124, fee: '₹80,000/yr',
    tags: ['Smart classrooms', 'Sports ground', 'AI lab'],
    established: 2001, students: 1200,
  },
  {
    id: 2, name: 'Sunrise Academy', city: 'Gachibowli', area: 'Hyderabad',
    board: 'CBSE', rating: 4.6, reviews: 98, fee: '₹65,000/yr',
    tags: ['Swimming pool', 'Music room', 'Transport'],
    established: 2008, students: 900,
  },
  {
    id: 3, name: 'Delhi Public School', city: 'Banjara Hills', area: 'Hyderabad',
    board: 'CBSE', rating: 4.9, reviews: 210, fee: '₹1,20,000/yr',
    tags: ['IIT coaching', 'International trips', 'Robotics'],
    established: 1998, students: 2000,
  },
  {
    id: 4, name: 'Greenfield International', city: 'Kondapur', area: 'Hyderabad',
    board: 'ICSE', rating: 4.7, reviews: 86, fee: '₹95,000/yr',
    tags: ['Theatre', 'Coding club', 'Organic garden'],
    established: 2005, students: 750,
  },
  {
    id: 5, name: 'Oakridge International', city: 'Bachupally', area: 'Hyderabad',
    board: 'IB', rating: 4.9, reviews: 142, fee: '₹2,50,000/yr',
    tags: ['IB curriculum', 'Global exchange', 'Olympic pool'],
    established: 2002, students: 600,
  },
  {
    id: 6, name: "St. Mary's High School", city: 'Secunderabad', area: 'Hyderabad',
    board: 'ICSE', rating: 4.5, reviews: 177, fee: '₹55,000/yr',
    tags: ['Heritage campus', 'Band & choir', 'NCC'],
    established: 1965, students: 1800,
  },
]

const BOARDS = ['All', 'CBSE', 'ICSE', 'IB', 'State Board']
const AREAS  = ['All areas', 'Madhapur', 'Gachibowli', 'Banjara Hills', 'Kondapur', 'Bachupally', 'Secunderabad']

function StarRating({ rating }) {
  return (
    <span style={{ fontSize: 12, color: '#EF9F27', letterSpacing: 1 }}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
    </span>
  )
}

export default function LandingPage() {
  const [search, setSearch]           = useState('')
  const [boardFilter, setBoardFilter] = useState('All')
  const [areaFilter, setAreaFilter]   = useState('All areas')
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [visible, setVisible]         = useState(false)
  const [form, setForm]               = useState({ parent_name:'', phone:'', email:'', child_grade:'', message:'' })
  const [formStatus, setFormStatus]   = useState('idle')
  const [errorMsg, setErrorMsg]       = useState('')
  const modalRef = useRef(null)

  useEffect(() => { setTimeout(() => setVisible(true), 80) }, [])

  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setSelectedSchool(null)
        setFormStatus('idle')
      }
    }
    if (selectedSchool) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedSchool])

  useEffect(() => {
    document.body.style.overflow = selectedSchool ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedSchool])

  const filtered = MOCK_SCHOOLS.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.board.toLowerCase().includes(q)
    const matchBoard  = boardFilter === 'All' || s.board === boardFilter
    const matchArea   = areaFilter === 'All areas' || s.city === areaFilter
    return matchSearch && matchBoard && matchArea
  })

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleEnquiry = async (e) => {
    e.preventDefault()
    setFormStatus('loading')
    setErrorMsg('')
    try {
      await axios.post(`${API}/leads/public`, {
        ...form,
        school_id: selectedSchool.id,
        school_name: selectedSchool.name,
        lead_source: 'Landing Page',
      })
      setFormStatus('success')
      setForm({ parent_name:'', phone:'', email:'', child_grade:'', message:'' })
    } catch (err) {
      setFormStatus('error')
      setErrorMsg(err.response?.data?.message || 'Something went wrong. Please try again.')
    }
  }

  const openEnquiry = (school) => {
    setSelectedSchool(school)
    setFormStatus('idle')
    setErrorMsg('')
    setForm({ parent_name:'', phone:'', email:'', child_grade:'', message:'' })
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#0e0d0b', color:'#f5f2eb', minHeight:'100vh', overflowX:'hidden' }}>

      {/* NAV */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px clamp(16px,5vw,48px)',
        background:'rgba(14,13,11,0.9)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(245,242,235,0.08)',
      }}>
        {/* <a href="/" style={{ textDecoration:'none' }}><Logo dark height={30} /></a> */}
        <a href="/" style={{ textDecoration:'none', display:'inline-flex' }}>
  <img src={logo} alt="EnrollIQ" style={{ height:34, display:'block', borderRadius:8, background:'#fff', padding:'5px 10px' }} />
</a>
        <div style={{ display:'flex', gap:24, alignItems:'center' }}>
          {[['How it works','#how'], ['About','#about'], ['Contact','#contact']].map(([l, href]) => (
            <a key={l} href={href} className="lp-link" style={{ fontSize:13, color:'rgba(245,242,235,0.5)', textDecoration:'none', transition:'color 0.2s' }}
              onMouseEnter={e=>e.target.style.color='#f5f2eb'}
              onMouseLeave={e=>e.target.style.color='rgba(245,242,235,0.5)'}
            >{l}</a>
          ))}
          <a href="/login" style={{
            background:'#12a38a', color:'#fff', textDecoration:'none',
            padding:'8px 20px', borderRadius:4, fontSize:13, fontWeight:500,
            transition:'background 0.2s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#0d8571'}
            onMouseLeave={e=>e.currentTarget.style.background='#12a38a'}
          >
            School login
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding:'120px clamp(16px,5vw,48px) 60px', textAlign:'center', position:'relative' }}>
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width:'60vw', height:'40vw',
          background:'radial-gradient(ellipse, rgba(18,163,138,0.1) 0%, transparent 70%)',
          borderRadius:'50%', pointerEvents:'none',
        }}/>
        <div style={{
          opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(24px)',
          transition:'opacity 0.7s ease, transform 0.7s ease',
        }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, marginBottom:24,
            fontSize:11, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase', color:'#12a38a',
          }}>
            <span style={{ width:20, height:1, background:'#12a38a', display:'block' }}/>
            Find the right school for your child
            <span style={{ width:20, height:1, background:'#12a38a', display:'block' }}/>
          </div>

          <h1 style={{
            fontFamily:"'Fraunces',serif",
            fontSize:'clamp(44px, 6vw, 76px)',
            fontWeight:900, lineHeight:1.0, letterSpacing:'-2.5px',
            marginBottom:20, color:'#f5f2eb',
          }}>
            Discover the best schools<br />
            in <em style={{ fontStyle:'italic', fontWeight:300, color:'#12a38a' }}>Hyderabad.</em>
          </h1>

          <p style={{ fontSize:16, color:'rgba(245,242,235,0.5)', maxWidth:480, margin:'0 auto 44px', lineHeight:1.7 }}>
            Browse top CBSE, ICSE and IB schools. Send your enquiry directly — the school's admissions team calls you within 24 hours.
          </p>

          {/* Search bar */}
          <div style={{
            display:'flex', maxWidth:540, margin:'0 auto',
            background:'rgba(245,242,235,0.07)',
            border:'1px solid rgba(245,242,235,0.15)',
            borderRadius:10, overflow:'hidden',
          }}>
            <input style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              padding:'14px 20px', fontSize:15, color:'#f5f2eb',
            }}
              placeholder="Search school name, area, or board..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <button style={{
              background:'#12a38a', border:'none', color:'#fff',
              padding:'14px 24px', fontSize:14, fontWeight:500, cursor:'pointer',
            }}>
              Search
            </button>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', justifyContent:'center', gap:'clamp(24px,6vw,48px)', marginTop:48, flexWrap:'wrap' }}>
            {[['200+','Schools listed'],['50,000+','Parent enquiries'],['15+','Cities']].map(([n,l])=>(
              <div key={l}>
                <p style={{ fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:700, color:'#f5f2eb', margin:0 }}>{n}</p>
                <p style={{ fontSize:12, color:'rgba(245,242,235,0.4)', margin:'4px 0 0' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTERS + GRID */}
      <section id="schools" style={{ padding:'20px clamp(16px,5vw,48px) 100px' }}>
        {/* Filters */}
        <div style={{ display:'flex', gap:12, marginBottom:28, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:13, color:'rgba(245,242,235,0.4)' }}>Filter:</span>
          <div style={{ display:'flex', gap:4, background:'rgba(245,242,235,0.05)', borderRadius:8, padding:4 }}>
            {BOARDS.map(b => (
              <button key={b} onClick={()=>setBoardFilter(b)} style={{
                padding:'6px 14px', borderRadius:6, border:'none', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s',
                background: boardFilter===b ? '#12a38a' : 'transparent',
                color: boardFilter===b ? '#fff' : 'rgba(245,242,235,0.5)',
              }}>{b}</button>
            ))}
          </div>
          <select value={areaFilter} onChange={e=>setAreaFilter(e.target.value)} style={{
            background:'rgba(245,242,235,0.07)', border:'1px solid rgba(245,242,235,0.15)',
            borderRadius:8, padding:'7px 14px', fontSize:12, color:'rgba(245,242,235,0.7)', outline:'none', cursor:'pointer',
          }}>
            {AREAS.map(a=><option key={a} value={a} style={{ background:'#1a1916' }}>{a}</option>)}
          </select>
          <span style={{ fontSize:12, color:'rgba(245,242,235,0.3)', marginLeft:'auto' }}>
            {filtered.length} school{filtered.length!==1?'s':''} found
          </span>
        </div>

        {/* School grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'rgba(245,242,235,0.3)', fontSize:15 }}>
            No schools match your search.
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20 }}>
            {filtered.map((school, i) => (
              <div key={school.id} style={{
                border:'1px solid rgba(245,242,235,0.1)', borderRadius:14, overflow:'hidden',
                background:'rgba(245,242,235,0.03)', transition:'border-color 0.25s, transform 0.25s',
                opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
                transitionDelay:`${i*0.06}s`,
              }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(18,163,138,0.35)'; e.currentTarget.style.transform='translateY(-3px)' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(245,242,235,0.1)'; e.currentTarget.style.transform='none' }}
              >
                <div style={{ padding:'24px 24px 0' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{
                      width:48, height:48, borderRadius:12, background:'rgba(18,163,138,0.15)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:700, color:'#12a38a',
                    }}>
                      {school.name[0]}
                    </div>
                    <span style={{
                      fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, letterSpacing:'0.06em',
                      background: school.board==='CBSE' ? 'rgba(29,158,117,0.15)' : school.board==='ICSE' ? 'rgba(55,138,221,0.15)' : 'rgba(186,117,23,0.2)',
                      color: school.board==='CBSE' ? '#5DCAA5' : school.board==='ICSE' ? '#85B7EB' : '#EF9F27',
                    }}>{school.board}</span>
                  </div>
                  <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:700, color:'#f5f2eb', marginBottom:4, letterSpacing:'-0.3px' }}>
                    {school.name}
                  </h3>
                  <p style={{ fontSize:13, color:'rgba(245,242,235,0.4)', marginBottom:12 }}>⊙ {school.city}, {school.area}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <StarRating rating={school.rating}/>
                    <span style={{ fontSize:13, fontWeight:600, color:'#f5f2eb' }}>{school.rating}</span>
                    <span style={{ fontSize:12, color:'rgba(245,242,235,0.35)' }}>({school.reviews} reviews)</span>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
                    {school.tags.map(t=>(
                      <span key={t} style={{
                        fontSize:11, padding:'3px 10px', borderRadius:20,
                        background:'rgba(245,242,235,0.07)', color:'rgba(245,242,235,0.55)',
                        border:'1px solid rgba(245,242,235,0.1)',
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{
                  padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
                  borderTop:'1px solid rgba(245,242,235,0.07)',
                }}>
                  <div>
                    <p style={{ fontSize:11, color:'rgba(245,242,235,0.35)', marginBottom:2 }}>Fees from</p>
                    <p style={{ fontSize:15, fontWeight:600, color:'#f5f2eb' }}>{school.fee}</p>
                  </div>
                  <button onClick={()=>openEnquiry(school)} style={{
                    background:'#12a38a', color:'#fff', border:'none',
                    padding:'9px 20px', borderRadius:6, fontSize:13, fontWeight:500, cursor:'pointer', transition:'background 0.2s',
                  }}
                    onMouseEnter={e=>e.currentTarget.style.background='#0d8571'}
                    onMouseLeave={e=>e.currentTarget.style.background='#12a38a'}
                  >
                    Enquire now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding:'80px clamp(16px,5vw,48px)', borderTop:'1px solid rgba(245,242,235,0.07)', textAlign:'center' }}>
        <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase', color:'#12a38a', marginBottom:16 }}>How it works</p>
        <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(28px,3.5vw,44px)', fontWeight:900, letterSpacing:'-1px', color:'#f5f2eb', marginBottom:56 }}>
          Get admitted in <em style={{ fontStyle:'italic', fontWeight:300, color:'#12a38a' }}>3 simple steps</em>
        </h2>
        <div className="lp-how" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:32, maxWidth:800, margin:'0 auto' }}>
          {[
            ['01','Search','Browse schools by area, board, or name and compare facilities and fees.'],
            ['02','Enquire','Click "Enquire now" and fill your details — takes under 60 seconds.'],
            ['03','Get called',"The school's admissions team calls you within 24 hours to book a campus visit."],
          ].map(([num,title,desc])=>(
            <div key={num}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:48, fontWeight:900, color:'rgba(18,163,138,0.2)', marginBottom:12 }}>{num}</div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:700, color:'#f5f2eb', marginBottom:10 }}>{title}</h3>
              <p style={{ fontSize:14, color:'rgba(245,242,235,0.45)', lineHeight:1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ padding:'80px clamp(16px,5vw,48px)', borderTop:'1px solid rgba(245,242,235,0.07)' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase', color:'#12a38a', marginBottom:16, textAlign:'center' }}>About EnrollIQ</p>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(28px,3.5vw,44px)', fontWeight:900, letterSpacing:'-1px', color:'#f5f2eb', marginBottom:20, textAlign:'center' }}>
            One platform. <em style={{ fontStyle:'italic', fontWeight:300, color:'#12a38a' }}>Parents & schools.</em>
          </h2>
          <p style={{ fontSize:15, color:'rgba(245,242,235,0.5)', lineHeight:1.8, maxWidth:640, margin:'0 auto 48px', textAlign:'center' }}>
            EnrollIQ connects parents searching for the right school with schools looking for the right students.
            Parents discover, compare and enquire in minutes — schools manage every enquiry, admission,
            fee and classroom from a single AI-powered CRM + ERP.
          </p>
          <div className="lp-about-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {[
              ['👨‍👩‍👧','For Parents','Browse verified schools by board, area and fees. Read facilities at a glance, send an enquiry in under 60 seconds, and get a call back from the school within 24 hours — completely free.'],
              ['🏫','For Schools','Capture every lead from Google, WhatsApp and walk-ins with AI scoring, convert admissions faster, and run attendance, fees, exams, transport and communication from one dashboard.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ border:'1px solid rgba(245,242,235,0.1)', borderRadius:14, padding:'28px', background:'rgba(245,242,235,0.03)' }}>
                <div style={{ fontSize:28, marginBottom:14 }}>{icon}</div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:700, color:'#f5f2eb', marginBottom:10 }}>{title}</h3>
                <p style={{ fontSize:14, color:'rgba(245,242,235,0.45)', lineHeight:1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-about-stats" style={{ display:'flex', justifyContent:'center', gap:'clamp(24px,6vw,64px)', marginTop:56, flexWrap:'wrap', textAlign:'center' }}>
            {[['2026','Founded'],['200+','Partner schools'],['15+','Cities'],['24 hrs','Enquiry response']].map(([n, l]) => (
              <div key={l}>
                <p style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:700, color:'#12a38a', margin:0 }}>{n}</p>
                <p style={{ fontSize:12, color:'rgba(245,242,235,0.4)', margin:'4px 0 0' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ padding:'80px clamp(16px,5vw,48px)', borderTop:'1px solid rgba(245,242,235,0.07)' }}>
        <div style={{ maxWidth:960, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.14em', textTransform:'uppercase', color:'#12a38a', marginBottom:16 }}>Contact us</p>
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(28px,3.5vw,44px)', fontWeight:900, letterSpacing:'-1px', color:'#f5f2eb', marginBottom:16 }}>
            We'd love to <em style={{ fontStyle:'italic', fontWeight:300, color:'#12a38a' }}>hear from you</em>
          </h2>
          <p style={{ fontSize:15, color:'rgba(245,242,235,0.5)', lineHeight:1.8, maxWidth:520, margin:'0 auto 44px' }}>
            Are you a school that wants to be listed on EnrollIQ, or a parent with a question? Reach us any way you like.
          </p>
          <div className="lp-contact-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              ['✉️','Email us','hello@enrolliq.com','mailto:hello@enrolliq.com'],
              ['📞','Call us','+91 98765 43210','tel:+919876543210'],
              ['💬','WhatsApp','Chat with our team','https://wa.me/919876543210'],
            ].map(([icon, title, value, href]) => (
              <a key={title} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                style={{ border:'1px solid rgba(245,242,235,0.1)', borderRadius:14, padding:'26px 20px',
                  background:'rgba(245,242,235,0.03)', textDecoration:'none', transition:'border-color 0.25s, transform 0.25s', display:'block' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(18,163,138,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,242,235,0.1)'; e.currentTarget.style.transform = 'none' }}>
                <div style={{ fontSize:26, marginBottom:12 }}>{icon}</div>
                <p style={{ fontSize:13, color:'rgba(245,242,235,0.4)', marginBottom:6 }}>{title}</p>
                <p style={{ fontSize:15, fontWeight:600, color:'#f5f2eb' }}>{value}</p>
              </a>
            ))}
          </div>
          <p style={{ fontSize:13, color:'rgba(245,242,235,0.35)', marginTop:36 }}>
            🏢 Mind Huntz Digital Services Pvt Ltd · Hyderabad, Telangana, India
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid rgba(245,242,235,0.07)' }}>
        <div className="lp-footer-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'56px clamp(16px,5vw,48px) 40px',
          display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1.4fr', gap:32 }}>
          <div>
            {/* <Logo dark height={26} /> */}
            <img src={logo} alt="EnrollIQ" style={{ height:30, display:'block', borderRadius:8, background:'#fff', padding:'5px 10px' }} />
            <p style={{ fontSize:13, color:'rgba(245,242,235,0.4)', lineHeight:1.7, marginTop:12, maxWidth:260 }}>
              India's smart school discovery platform and all-in-one CRM + ERP for modern schools.
            </p>
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(245,242,235,0.35)', marginBottom:14 }}>Explore</p>
            {[['Find schools','#schools'],['How it works','#how'],['About','#about'],['Contact','#contact']].map(([l, href]) => (
              <a key={l} href={href} style={{ display:'block', fontSize:13, color:'rgba(245,242,235,0.5)', textDecoration:'none', marginBottom:9 }}
                onMouseEnter={e => e.target.style.color = '#f5f2eb'} onMouseLeave={e => e.target.style.color = 'rgba(245,242,235,0.5)'}>{l}</a>
            ))}
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(245,242,235,0.35)', marginBottom:14 }}>For schools</p>
            {[['School login','/login'],['List your school','#contact'],['Book a demo','#contact']].map(([l, href]) => (
              <a key={l} href={href} style={{ display:'block', fontSize:13, color:'rgba(245,242,235,0.5)', textDecoration:'none', marginBottom:9 }}
                onMouseEnter={e => e.target.style.color = '#f5f2eb'} onMouseLeave={e => e.target.style.color = 'rgba(245,242,235,0.5)'}>{l}</a>
            ))}
          </div>
          <div>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(245,242,235,0.35)', marginBottom:14 }}>Contact</p>
            <p style={{ fontSize:13, color:'rgba(245,242,235,0.5)', marginBottom:9 }}>✉️ hello@enrolliq.com</p>
            <p style={{ fontSize:13, color:'rgba(245,242,235,0.5)', marginBottom:9 }}>📞 +91 98765 43210</p>
            <p style={{ fontSize:13, color:'rgba(245,242,235,0.5)', lineHeight:1.6 }}>📍 Hyderabad, Telangana, India</p>
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(245,242,235,0.07)', padding:'18px clamp(16px,5vw,48px)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, maxWidth:1100, margin:'0 auto' }}>
          <p style={{ fontSize:12, color:'rgba(245,242,235,0.3)' }}>© 2026 EnrollIQ by Mind Huntz Digital Services Pvt Ltd</p>
          <p style={{ fontSize:12, color:'rgba(245,242,235,0.3)' }}>Made with ❤️ in Hyderabad</p>
        </div>
      </footer>

      {/* ENQUIRY MODAL */}
      {selectedSchool && (
        <div style={{
          position:'fixed', inset:0, zIndex:200,
          background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:24,
        }}>
          <div ref={modalRef} style={{
            background:'#161513', border:'1px solid rgba(245,242,235,0.12)',
            borderRadius:16, width:'100%', maxWidth:500,
            maxHeight:'90vh', overflowY:'auto', padding:'clamp(20px,5vw,36px)',
          }}>
            {formStatus === 'success' ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{
                  width:64, height:64, borderRadius:'50%',
                  background:'rgba(29,158,117,0.15)', border:'1px solid rgba(29,158,117,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:28, margin:'0 auto 20px',
                }}>✓</div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:700, color:'#f5f2eb', marginBottom:10 }}>
                  Enquiry sent!
                </h3>
                <p style={{ fontSize:14, color:'rgba(245,242,235,0.55)', lineHeight:1.7, marginBottom:24 }}>
                  Your enquiry has been sent to <strong style={{ color:'#f5f2eb' }}>{selectedSchool.name}</strong>. Their admissions team will call you within 24 hours.
                </p>
                <button onClick={()=>setSelectedSchool(null)} style={{
                  background:'#12a38a', color:'#fff', border:'none',
                  padding:'11px 28px', borderRadius:6, fontSize:14, fontWeight:500, cursor:'pointer',
                }}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                  <div>
                    <p style={{ fontSize:11, color:'rgba(245,242,235,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Enquiry for</p>
                    <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:700, color:'#f5f2eb', marginBottom:4 }}>{selectedSchool.name}</h3>
                    <p style={{ fontSize:13, color:'rgba(245,242,235,0.4)' }}>{selectedSchool.city} · {selectedSchool.board} · {selectedSchool.fee}</p>
                  </div>
                  <button onClick={()=>setSelectedSchool(null)} style={{
                    background:'rgba(245,242,235,0.08)', border:'none', color:'rgba(245,242,235,0.6)',
                    width:32, height:32, borderRadius:'50%', fontSize:16, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>✕</button>
                </div>

                {errorMsg && (
                  <div style={{
                    background:'rgba(226,75,74,0.12)', border:'1px solid rgba(226,75,74,0.25)',
                    borderRadius:8, padding:'10px 14px', fontSize:13, color:'#f09595', marginBottom:16,
                  }}>{errorMsg}</div>
                )}

                <form onSubmit={handleEnquiry} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label style={lbl}>Parent name *</label>
                      <input style={inp} placeholder="Your full name" value={form.parent_name} onChange={set('parent_name')} required
                        onFocus={e=>e.target.style.borderColor='#12a38a'} onBlur={e=>e.target.style.borderColor='rgba(245,242,235,0.15)'}/>
                    </div>
                    <div>
                      <label style={lbl}>Phone *</label>
                      <input style={inp} placeholder="10-digit mobile" value={form.phone} onChange={set('phone')} required maxLength={10}
                        onFocus={e=>e.target.style.borderColor='#12a38a'} onBlur={e=>e.target.style.borderColor='rgba(245,242,235,0.15)'}/>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Email</label>
                    <input style={inp} type="email" placeholder="parent@gmail.com" value={form.email} onChange={set('email')}
                      onFocus={e=>e.target.style.borderColor='#12a38a'} onBlur={e=>e.target.style.borderColor='rgba(245,242,235,0.15)'}/>
                  </div>
                  <div>
                    <label style={lbl}>Child's grade *</label>
                    <select style={inp} value={form.child_grade} onChange={set('child_grade')} required
                      onFocus={e=>e.target.style.borderColor='#12a38a'} onBlur={e=>e.target.style.borderColor='rgba(245,242,235,0.15)'}>
                      <option value="">Select grade</option>
                      {GRADES.map(g=><option key={g} value={g} style={{ background:'#1a1916' }}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Message (optional)</label>
                    <textarea style={{ ...inp, resize:'none', minHeight:72 }} rows={3}
                      placeholder="Any questions about this school..."
                      value={form.message} onChange={set('message')}
                      onFocus={e=>e.target.style.borderColor='#12a38a'} onBlur={e=>e.target.style.borderColor='rgba(245,242,235,0.15)'}/> 
                  </div>
                  <button type="submit" disabled={formStatus==='loading'} style={{
                    background: formStatus==='loading' ? '#0a6b5a' : '#12a38a',
                    color:'#fff', border:'none', padding:'13px',
                    borderRadius:6, fontSize:15, fontWeight:500,
                    cursor: formStatus==='loading' ? 'not-allowed' : 'pointer',
                    transition:'background 0.2s', marginTop:4,
                  }}>
                    {formStatus==='loading' ? 'Sending...' : 'Send enquiry →'}
                  </button>
                  <p style={{ fontSize:11, color:'rgba(245,242,235,0.25)', textAlign:'center' }}>
                    Your details are only shared with {selectedSchool.name}.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        html { scroll-behavior: smooth; }
        @media (max-width: 900px) {
          .lp-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 700px) {
          .lp-how { grid-template-columns: 1fr !important; gap: 44px !important; }
          .lp-about-grid { grid-template-columns: 1fr !important; }
          .lp-contact-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .lp-footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        @media (max-width: 640px) {
          .lp-link { display: none; }
        }
      `}</style>
    </div>
  )
}

const lbl = {
  display:'block', fontSize:11, fontWeight:500,
  letterSpacing:'0.08em', textTransform:'uppercase',
  color:'rgba(245,242,235,0.4)', marginBottom:6,
}

const inp = {
  width:'100%', background:'rgba(245,242,235,0.06)',
  border:'1px solid rgba(245,242,235,0.15)',
  borderRadius:8, padding:'10px 14px',
  fontSize:14, color:'#f5f2eb',
  outline:'none', transition:'border-color 0.2s',
  boxSizing:'border-box',
}