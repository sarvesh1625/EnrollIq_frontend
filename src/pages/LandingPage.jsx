import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

// Logo lives in /public — Vite serves it at the root
const logo = '/Logo.jpeg'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const TYPE = {
  display: "'Fraunces', Georgia, serif",
  body: "'Inter', -apple-system, system-ui, sans-serif",
}
const C = {
  paper:  '#FAFAFE',
  ink:    '#1A1145',   // deep indigo (matches logo's dark violet)
  teal:   '#6D28D9',   // primary brand = violet (kept name 'teal' to avoid churn)
  tealDk: '#5B21B6',
  blue:   '#38BDF8',   // logo cyan
  violet: '#7C3AED',   // logo purple
  amber:  '#38BDF8',   // accent = cyan (used for 'soon'/highlights)
  muted:  '#5B5772',
  line:   '#E9E6F2',
  card:   '#FFFFFF',
}
// brand gradient from the logo (cyan → violet)
const GRAD = 'linear-gradient(135deg, #38BDF8 0%, #6D28D9 100%)'

function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown]
}

function Reveal({ children, delay = 0 }) {
  const [ref, shown] = useReveal()
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(20px)',
      transition: `opacity .7s ease ${delay}s, transform .7s cubic-bezier(.2,.7,.2,1) ${delay}s`,
    }}>{children}</div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  const openDemo = () => { setDemoOpen(true); setMenuOpen(false) }

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: TYPE.body, overflowX: 'hidden' }}>
      <Nav onDemo={openDemo} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero onDemo={openDemo} />
      <TrustBar />
      <Management onDemo={openDemo} />
      <Platform />
      <Dashboards />
      <AISection onDemo={openDemo} />
      <Comparison />
      <FinalCTA onDemo={openDemo} />
      <Footer onDemo={openDemo} />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
      <GlobalStyle />
    </div>
  )
}

/* ─────────────────────────── NAV ─────────────────────────── */
function Nav({ onDemo, menuOpen, setMenuOpen }) {
  const links = [['Platform', '#platform'], ['For Management', '#management'], ['AI', '#ai'], ['Dashboards', '#dashboards']]
  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,248,0.85)',
        backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px,5vw,56px)', height: 68,
      }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={logo} alt="EnrollIQ" style={{ height: 34, width: 'auto' }} />
        </a>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          {links.map(([l, h]) => (
            <a key={l} href={h} style={{ fontSize: 14, color: C.muted, textDecoration: 'none', fontWeight: 500, transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = C.ink} onMouseLeave={e => e.target.style.color = C.muted}>{l}</a>
          ))}
          <a href="/login" style={{ fontSize: 14, color: C.ink, textDecoration: 'none', fontWeight: 600, padding: '9px 16px', border: `1px solid ${C.line}`, borderRadius: 9, transition: 'border-color .2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.violet} onMouseLeave={e => e.currentTarget.style.borderColor = C.line}>Sign In</a>
          <button onClick={onDemo} style={ctaStyle('sm')}>Book a Demo</button>
        </div>
        <button className="menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
          style={{ display: 'none', background: 'none', border: `1px solid ${C.line}`, borderRadius: 8, width: 42, height: 42, fontSize: 20, cursor: 'pointer', color: C.ink }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>
      {menuOpen && (
        <div style={{ position: 'sticky', top: 68, zIndex: 99, background: C.paper, borderBottom: `1px solid ${C.line}`, padding: '12px clamp(16px,5vw,56px)' }}>
          {links.map(([l, h]) => (
            <a key={l} href={h} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', color: C.ink, textDecoration: 'none', fontSize: 15, borderBottom: `1px solid ${C.line}` }}>{l}</a>
          ))}
          <a href="/login" style={{ display:'block', textAlign:'center', padding:'12px', marginTop:12, border:`1px solid ${C.line}`, borderRadius:9, color:C.ink, textDecoration:'none', fontWeight:600, fontSize:15 }}>Sign In</a>
          <button onClick={onDemo} style={{ ...ctaStyle('sm'), width: '100%', marginTop: 10 }}>Book a Demo</button>
        </div>
      )}
    </>
  )
}

/* ─────────────────────────── HERO ─────────────────────────── */
function Hero({ onDemo }) {
  return (
    <section id="top" style={{ padding: 'clamp(56px,9vw,110px) clamp(16px,5vw,56px) clamp(40px,6vw,80px)', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 'clamp(32px,5vw,64px)', alignItems: 'center' }} className="hero-grid">
        <div>
          <span style={eyebrow}>AI-Powered Education Growth Platform</span>
          <h1 className="hero-h1" style={{
            fontFamily: TYPE.display, fontSize: 'clamp(38px,5.2vw,64px)', lineHeight: 1.04,
            fontWeight: 600, letterSpacing: '-1.5px', margin: '18px 0 20px', color: C.ink,
          }}>
            Run your entire institution from a single, intelligent view.
          </h1>
          <p style={{ fontSize: 'clamp(16px,1.5vw,19px)', lineHeight: 1.6, color: C.muted, maxWidth: 520, marginBottom: 30 }}>
            EnrollIQ unifies admissions, marketing, academics, finance and operations — so leadership sees the whole picture and acts on it in real time.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={onDemo} style={ctaStyle('lg')}>Book a Demo →</button>
            <a href="#platform" style={{ fontSize: 15, fontWeight: 600, color: C.ink, textDecoration: 'none', padding: '14px 6px' }}>See the platform</a>
          </div>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 22 }}>◆ Now onboarding early education partners</p>
        </div>
        <Reveal delay={0.15}><DashboardMock /></Reveal>
      </div>
    </section>
  )
}

// The signature element: a management control panel (what a Chairman sees)
function DashboardMock() {
  const metrics = [
    { label: "Today's Enquiries", value: '42', trend: '+12%', up: true },
    { label: 'Admission Conversion', value: '31%', trend: '+4.2pt', up: true },
    { label: 'Fees Collected (MTD)', value: '₹48.6L', trend: '+18%', up: true },
    { label: 'Expected Admissions', value: '128', trend: 'on track', up: true },
  ]
  return (
    <div style={{
      background: C.card, borderRadius: 18, border: `1px solid ${C.line}`,
      boxShadow: '0 30px 60px -30px rgba(15,30,56,0.28)', overflow: 'hidden',
    }}>
      <div style={{ background: GRAD, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, fontFamily: TYPE.display }}>Group Overview</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>● Live · 3 branches</span>
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: C.paper, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.line}` }}>
            <p style={{ fontSize: 11.5, color: C.muted, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, margin: '6px 0 2px', color: C.ink, fontFamily: TYPE.display }}>{m.value}</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: m.up ? C.teal : C.amber }}>▲ {m.trend}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 18px 20px' }}>
        <div style={{ background: C.paper, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.line}` }}>
          <p style={{ fontSize: 11.5, color: C.muted, margin: '0 0 10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>Branch Performance</p>
          {[['Madhapur', 88], ['Gachibowli', 72], ['Kondapur', 61]].map(([n, v]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: C.ink, width: 90, fontWeight: 500 }}>{n}</span>
              <div style={{ flex: 1, height: 7, background: C.line, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${v}%`, height: '100%', background: GRAD, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, color: C.muted, width: 34, textAlign: 'right' }}>{v}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── TRUST BAR ─────────────────────────── */
function TrustBar() {
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, background: C.card }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px clamp(16px,5vw,56px)', display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,4vw,48px)', alignItems: 'center', justifyContent: 'center' }}>
        {['Admissions', 'Marketing', 'Academics', 'Finance', 'Staff', 'Operations'].map(t => (
          <span key={t} style={{ fontSize: 14, color: C.muted, fontWeight: 600, letterSpacing: '.3px' }}>{t}</span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── MANAGEMENT ─────────────────────────── */
function Management({ onDemo }) {
  const metrics = [
    ["Today's Enquiries", 'Every new lead across all branches, the moment it arrives.'],
    ['Admission Conversion', 'Enquiry-to-admission rate, tracked stage by stage.'],
    ['Expected Admissions', 'Forecast confirmations from your live pipeline.'],
    ['Fees Collected', 'Real-time collection against targets, per branch.'],
    ['Counsellor Performance', 'Who is converting, who needs support.'],
    ['Marketing ROI', 'Which campaigns and sources actually enrol students.'],
    ['Branch Performance', 'Compare every branch on one leaderboard.'],
  ]
  return (
    <section id="management" style={{ padding: 'clamp(64px,9vw,120px) clamp(16px,5vw,56px)', background: C.ink, color: '#fff' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Reveal>
          <span style={{ ...eyebrow, color: C.amber, borderColor: 'rgba(232,161,58,0.35)' }}>For Leadership</span>
          <h2 style={{ fontFamily: TYPE.display, fontSize: 'clamp(30px,4vw,48px)', fontWeight: 600, letterSpacing: '-1px', margin: '18px 0 14px', lineHeight: 1.1 }}>
            Built for management.<br />Not just administrators.
          </h2>
          <p style={{ fontSize: 'clamp(16px,1.5vw,19px)', color: 'rgba(255,255,255,0.7)', maxWidth: 620, lineHeight: 1.6, marginBottom: 44 }}>
            Get one real-time view of admissions, marketing, academics, finance, staff and operations across your entire education group.
          </p>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
          {metrics.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.05}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '22px 20px', height: '100%' }}>
                <p style={{ fontFamily: TYPE.display, fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: '#fff' }}>{t}</p>
                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.55 }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div style={{ marginTop: 40 }}>
          <button onClick={onDemo} style={ctaStyle('lg')}>Book a Demo →</button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── DASHBOARDS ─────────────────────────── */
function Dashboards() {
  const roles = [
    ['Management', 'Group-wide admissions, revenue, marketing ROI and branch performance in one view.'],
    ['Admissions', 'Live enquiry queue, lead scores, follow-ups and conversion by counsellor.'],
    ['Academic', 'Attendance, exams, results and academic progress across classes.'],
    ['Finance', 'Fee structures, collections, dues and daily cash position per branch.'],
    ['Staff', 'Staff records, roles, attendance and documents in one place.'],
    ['Teacher', 'Class attendance, marks entry, daily updates and homework for their sections.'],
  ]
  return (
    <section id="dashboards" style={{ padding: 'clamp(64px,9vw,120px) clamp(16px,5vw,56px)', background: C.card, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Reveal>
          <span style={eyebrow}>Role-based access</span>
          <h2 style={{ fontFamily: TYPE.display, fontSize: 'clamp(30px,4vw,48px)', fontWeight: 600, letterSpacing: '-1px', margin: '18px 0 14px', lineHeight: 1.1, maxWidth: 720 }}>
            Six dashboards. Everyone sees exactly what they should.
          </h2>
          <p style={{ fontSize: 'clamp(16px,1.5vw,19px)', color: C.muted, maxWidth: 620, lineHeight: 1.6, marginBottom: 44 }}>
            Every role gets a focused view built for their job — with leadership seeing across all of them. Parents get a dedicated mobile app.
          </p>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
          {roles.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.05}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '22px 22px', background: C.paper, borderRadius: 14, border: `1px solid ${C.line}`, height: '100%' }}>
                <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 11, background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, fontFamily: TYPE.display }}>{i + 1}</div>
                <div>
                  <p style={{ fontFamily: TYPE.display, fontSize: 19, fontWeight: 600, margin: '2px 0 6px', color: C.ink }}>{t}</p>
                  <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.55 }}>{d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── PLATFORM ─────────────────────────── */
function Platform() {
  const mods = [
    ['◆', 'Admissions CRM', 'Capture every enquiry, score leads with AI, and move them through a visual pipeline to confirmed admission.'],
    ['◇', 'Marketing & Leads', 'Track sources, campaigns and counsellor follow-ups — and see exactly what drives enrolments.'],
    ['○', 'Academics', 'Attendance, exams, AI-generated papers, grading and report cards in one flow.'],
    ['◈', 'Finance & Fees', 'Fee structures, collections and dues with real-time visibility for every branch.'],
    ['◉', 'Parent App', 'Parents see attendance, results, daily updates and fees — and get notified instantly.'],
    ['⬢', 'Transport', 'Live bus tracking, route and stop management, and boarding scans parents can follow.'],
    ['⬡', 'Multi-Branch', 'Run every branch as its own space, with group-level oversight for leadership.'],
  ]
  return (
    <section id="platform" style={{ padding: 'clamp(64px,9vw,120px) clamp(16px,5vw,56px)', maxWidth: 1200, margin: '0 auto' }}>
      <Reveal>
        <span style={eyebrow}>The Platform</span>
        <h2 style={{ fontFamily: TYPE.display, fontSize: 'clamp(30px,4vw,48px)', fontWeight: 600, letterSpacing: '-1px', margin: '18px 0 14px', lineHeight: 1.1, maxWidth: 720 }}>
          One platform for the whole institution.
        </h2>
        <p style={{ fontSize: 'clamp(16px,1.5vw,19px)', color: C.muted, maxWidth: 600, lineHeight: 1.6, marginBottom: 48 }}>
          Every team works in the same system, so nothing falls through the cracks between departments.
        </p>
      </Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {mods.map(([icon, t, d], i) => (
          <Reveal key={t} delay={i * 0.06}>
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 26, height: '100%', transition: 'transform .25s, box-shadow .25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px -24px rgba(15,30,56,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: C.paper, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: C.teal, marginBottom: 16 }}>{icon}</div>
              <h3 style={{ fontFamily: TYPE.display, fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: C.ink }}>{t}</h3>
              <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.6 }}>{d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────── AI SECTION ─────────────────────────── */
function AISection({ onDemo }) {
  const items = [
    ['Lead scoring', 'AI ranks every enquiry by likelihood to enrol, so counsellors chase the right ones first.'],
    ['Exam generation', 'Generate question papers from topics in seconds, then edit and publish.'],
    ['Answer-sheet grading', 'AI reads and grades submitted sheets, with teacher review before results go out.'],
    ['Report insights', 'Automatic strengths, gaps and next-step suggestions for every student.'],
  ]
  return (
    <section id="ai" style={{ padding: 'clamp(64px,9vw,120px) clamp(16px,5vw,56px)', background: C.card, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(32px,5vw,72px)', alignItems: 'center' }} className="ai-grid">
        <Reveal>
          <div>
            <span style={eyebrow}>Intelligence, built in</span>
            <h2 style={{ fontFamily: TYPE.display, fontSize: 'clamp(28px,3.6vw,44px)', fontWeight: 600, letterSpacing: '-1px', margin: '18px 0 16px', lineHeight: 1.12 }}>
              AI that does the work, not just the talking.
            </h2>
            <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.6, marginBottom: 28 }}>
              EnrollIQ puts practical AI where it saves real time — from the first enquiry to the final report card.
            </p>
            <button onClick={onDemo} style={ctaStyle('lg')}>Book a Demo →</button>
          </div>
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.06}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 20px', background: C.paper, borderRadius: 14, border: `1px solid ${C.line}` }}>
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>✦</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15.5, margin: '2px 0 4px', color: C.ink }}>{t}</p>
                  <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.55 }}>{d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── COMPARISON ─────────────────────────── */
function Comparison() {
  const rows = [
    ['Management dashboard for leadership', true, false],
    ['Six role-based dashboards', true, 'Limited'],
    ['AI lead scoring & smart follow-ups', true, false],
    ['AI exam generation & grading', true, false],
    ['Admissions CRM + marketing ROI', true, 'Partial'],
    ['Fees, collections & dues tracking', true, true],
    ['Live transport & bus tracking', true, 'Add-on'],
    ['Parent mobile app included', true, 'Sometimes'],
    ['Multi-branch group oversight', true, false],
    ['Real-time, one unified system', true, 'Siloed'],
    ['Built for Indian institutions', true, 'Rarely'],
  ]
  const cell = (v) => v === true
    ? <span style={{ color: C.teal, fontWeight: 800, fontSize: 18 }}>✓</span>
    : v === false ? <span style={{ color: '#C4432E', fontWeight: 700, fontSize: 17 }}>✕</span>
    : <span style={{ color: C.muted, fontSize: 13 }}>{v}</span>
  return (
    <section style={{ padding: 'clamp(64px,9vw,120px) clamp(16px,5vw,56px)', maxWidth: 900, margin: '0 auto' }}>
      <Reveal>
        <span style={eyebrow}>Why EnrollIQ</span>
        <h2 style={{ fontFamily: TYPE.display, fontSize: 'clamp(28px,3.6vw,44px)', fontWeight: 600, letterSpacing: '-1px', margin: '18px 0 36px', lineHeight: 1.12 }}>
          Most software talks to admins. We report to leadership.
        </h2>
        <p style={{ fontSize: 'clamp(16px,1.5vw,18px)', color: C.muted, maxWidth: 600, lineHeight: 1.6, margin: '0 0 36px' }}>
          A typical ERP digitises paperwork. EnrollIQ connects every department and surfaces what leadership needs to grow the institution.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px', background: C.ink, color: '#fff' }} className="cmp-head">
            <div style={{ padding: '16px 20px', fontWeight: 600, fontSize: 14 }}>Capability</div>
            <div style={{ padding: '16px 12px', fontWeight: 700, fontSize: 14, textAlign: 'center', fontFamily: TYPE.display }}>EnrollIQ</div>
            <div style={{ padding: '16px 12px', fontWeight: 500, fontSize: 13, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>Typical ERP</div>
          </div>
          {rows.map(([label, a, b], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px', borderTop: `1px solid ${C.line}`, alignItems: 'center' }}>
              <div style={{ padding: '15px 20px', fontSize: 14.5, color: C.ink, fontWeight: 500 }}>{label}</div>
              <div style={{ padding: '15px 12px', textAlign: 'center', background: 'rgba(18,163,138,0.05)' }}>{cell(a)}</div>
              <div style={{ padding: '15px 12px', textAlign: 'center' }}>{cell(b)}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── FINAL CTA ─────────────────────────── */
function FinalCTA({ onDemo }) {
  return (
    <section style={{ padding: 'clamp(72px,10vw,130px) clamp(16px,5vw,56px)', textAlign: 'center' }}>
      <Reveal>
        <span style={eyebrow}>Pilot EnrollIQ at your institution</span>
        <h2 style={{ fontFamily: TYPE.display, fontSize: 'clamp(32px,4.6vw,56px)', fontWeight: 600, letterSpacing: '-1.5px', margin: '20px auto 18px', lineHeight: 1.08, maxWidth: 780 }}>
          See your whole institution the way leadership should.
        </h2>
        <p style={{ fontSize: 18, color: C.muted, maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Book a 30-minute demo. We'll map EnrollIQ to how your group actually runs.
        </p>
        <button onClick={onDemo} style={ctaStyle('lg')}>Book a Demo →</button>
      </Reveal>
    </section>
  )
}

/* ─────────────────────────── FOOTER ─────────────────────────── */
function Footer({ onDemo }) {
  return (
    <footer style={{ background: C.ink, color: 'rgba(255,255,255,0.7)', padding: 'clamp(48px,7vw,72px) clamp(16px,5vw,56px) 32px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 40 }} className="footer-grid">
        <div>
          <div style={{ display:'inline-block', background:'#fff', padding:'8px 12px', borderRadius:10, marginBottom:14 }}>
            <img src={logo} alt="EnrollIQ" style={{ height: 30, display:'block' }} />
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 300, color: 'rgba(255,255,255,0.6)' }}>
            The AI-powered education growth platform. Built for institutions that lead.
          </p>
        </div>
        <div>
          <p style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 14 }}>Contact</p>
          <p style={{ fontSize: 13.5, margin: '0 0 9px' }}>✉ Info@enrolliq.io</p>
          <p style={{ fontSize: 13.5, margin: '0 0 9px' }}>📞 +91 81423-41234</p>
          <p style={{ fontSize: 13.5, margin: 0, color: 'rgba(255,255,255,0.5)' }}>Mind Huntz Digital Services Pvt Ltd, Hyderabad</p>
        </div>
        <div>
          <p style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 14 }}>Get started</p>
          <button onClick={onDemo} style={{ ...ctaStyle('sm'), marginBottom: 12 }}>Book a Demo</button>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Now onboarding early education partners.</p>
        </div>
      </div>
      <div style={{ maxWidth: 1120, margin: '36px auto 0', paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
        © {new Date().getFullYear()} EnrollIQ · Mind Huntz Digital Services Pvt Ltd. All rights reserved.
      </div>
    </footer>
  )
}

/* ─────────────────────────── DEMO MODAL ─────────────────────────── */
function DemoModal({ onClose }) {
  const [form, setForm] = useState({ name: '', institution: '', designation: '', mobile: '', work_email: '', institution_type: '' })
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [msg, setMsg] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name.trim() || !form.institution.trim() || !form.mobile.trim()) {
      setMsg('Please fill name, institution and mobile.'); return
    }
    setStatus('sending'); setMsg('')
    try {
      const res = await axios.post(`${API}/demo-request`, form)
      setStatus('done'); setMsg(res.data?.message || 'Thanks! Our team will reach out shortly.')
    } catch (e) {
      setStatus('error'); setMsg(e.response?.data?.message || 'Something went wrong. Please try again.')
    }
  }

  const types = ['School', 'Group of Schools', 'PU / Junior College', 'Coaching Institute', 'Other']

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,56,0.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 80px -20px rgba(15,30,56,0.5)' }}>
        <div style={{ padding: '24px 26px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 600, margin: 0, color: C.ink }}>Request your demo</h3>
            <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0' }}>A 30-minute walkthrough, mapped to your institution.</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted, lineHeight: 1 }}>✕</button>
        </div>

        {status === 'done' ? (
          <div style={{ padding: '36px 26px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>✓</div>
            <p style={{ fontSize: 16, color: C.ink, fontWeight: 600, margin: '10px 0 6px' }}>Request received</p>
            <p style={{ fontSize: 14, color: C.muted, margin: '0 0 22px' }}>{msg}</p>
            <button onClick={onClose} style={ctaStyle('lg')}>Done</button>
          </div>
        ) : (
          <div style={{ padding: '20px 26px 28px' }}>
            {[
              ['name', 'Full name', 'text', 'e.g. Rajesh Kumar'],
              ['institution', 'Institution name', 'text', 'e.g. Vidya Mandir Group'],
              ['designation', 'Designation', 'text', 'e.g. Director / Principal'],
              ['mobile', 'Mobile number', 'tel', 'e.g. 98765 43210'],
              ['work_email', 'Work email', 'email', 'e.g. you@institution.edu'],
            ].map(([k, label, type, ph]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>{label}{['name', 'institution', 'mobile'].includes(k) && <span style={{ color: '#C4432E' }}> *</span>}</label>
                <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={fieldInput} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>Institution type</label>
              <select value={form.institution_type} onChange={e => set('institution_type', e.target.value)} style={fieldInput}>
                <option value="">Select…</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {msg && status !== 'sending' && <p style={{ fontSize: 13, color: '#C4432E', margin: '0 0 12px' }}>{msg}</p>}
            <button onClick={submit} disabled={status === 'sending'} style={{ ...ctaStyle('lg'), width: '100%', opacity: status === 'sending' ? 0.7 : 1 }}>
              {status === 'sending' ? 'Sending…' : 'Request Your Demo'}
            </button>
            <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', margin: '14px 0 0' }}>We'll never share your details.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── SHARED STYLES ─────────────────────────── */
const eyebrow = {
  display: 'inline-block', fontSize: 12.5, fontWeight: 700, letterSpacing: '1px',
  textTransform: 'uppercase', color: C.teal, border: `1px solid rgba(18,163,138,0.3)`,
  borderRadius: 20, padding: '5px 14px',
}
const fieldLabel = { display: 'block', fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 6 }
const fieldInput = {
  width: '100%', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.line}`,
  fontSize: 14.5, fontFamily: TYPE.body, color: C.ink, background: '#fff', boxSizing: 'border-box', outline: 'none',
}
function ctaStyle(size) {
  const pad = size === 'lg' ? '15px 30px' : '10px 20px'
  const fs = size === 'lg' ? 15.5 : 14
  return {
    background: GRAD, color: '#fff', border: 'none', borderRadius: 10, padding: pad,
    fontSize: fs, fontWeight: 700, cursor: 'pointer', fontFamily: TYPE.body,
    boxShadow: '0 8px 22px -8px rgba(109,40,217,0.55)', transition: 'filter .2s, transform .1s',
  }
}

function GlobalStyle() {
  return (
    <style>{`
      html { scroll-behavior: smooth; }
      * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
      body { margin: 0; }
      button:active { transform: scale(0.98); }
      @media (max-width: 900px) {
        .hero-grid { grid-template-columns: 1fr !important; }
        .ai-grid { grid-template-columns: 1fr !important; }
        .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
      }
      @media (max-width: 760px) {
        .nav-links { display: none !important; }
        .menu-btn { display: inline-flex !important; align-items:center; justify-content:center; }
      }
      @media (max-width: 520px) {
        .cmp-head > div:nth-child(3), .cmp-head { font-size: 12px; }
      }
    `}</style>
  )
}