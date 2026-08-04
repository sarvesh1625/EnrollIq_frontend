import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_ALLOWED = {
  admin:             null,
  staff:             ['/leads','/students','/attendance','/exams','/communication'],
  teacher:           ['/students','/attendance','/exams'],
  accountant:        ['/fees','/analytics'],
  receptionist:      ['/leads','/admissions'],
  transport_manager: ['/transport'],
}

const ROLE_HOME = {
  admin:             '/dashboard',
  staff:             '/staff-dashboard',
  teacher:           '/teacher-dashboard',
  accountant:        '/accountant-dashboard',
  receptionist:      '/receptionist-dashboard',
  transport_manager: '/transport-dashboard',
}

const ROLE_META = {
  admin:             { label:'Admin',          color:'#7c3aed', bg:'#f5f3ff' },
  staff:             { label:'Staff',          color:'#2563eb', bg:'#eff6ff' },
  teacher:           { label:'Teacher',        color:'#059669', bg:'#f0fdf4' },
  accountant:        { label:'Accountant',     color:'#d97706', bg:'#fffbeb' },
  receptionist:      { label:'Receptionist',   color:'#db2777', bg:'#fdf2f8' },
  transport_manager: { label:'Transport Mgr',  color:'#0891b2', bg:'#f0f9ff' },
}

const NAV = [
  { section: 'Main' },
  { to:'/dashboard',      icon:'◧',  label:'Dashboard'     },
  { to:'/leads',          icon:'◈',  label:'Leads'         },
  { to:'/pipeline',       icon:'⊡',  label:'Pipeline'      },
  { to:'/admissions',     icon:'✦',  label:'Admissions'    },
  { to:'/students',       icon:'◉',  label:'Students'      },
    { to:'/kit',       icon:'🎒',  label:'School Kit'      },
  { section: 'Academic' },
  { to:'/attendance',     icon:'✓',  label:'Attendance'    },
  { to:'/exams',          icon:'✎',  label:'Exams'         },
  { section: 'Finance & Ops' },
  { to:'/fees',           icon:'◎',  label:'Fees'          },
  { to:'/transport',      icon:'⬡',  label:'Transport'     },
  { to:'/communication',  icon:'✉',  label:'Communication' },
  { section: 'Growth' },
  { to:'/analytics',      icon:'↗',  label:'Analytics'     },
  { to:'/import',         icon:'⇑',  label:'Bulk Import'   },
  { section: 'Settings' },
  { to:'/roles',          icon:'⊛',  label:'Roles'         },
  { to:'/school-profile', icon:'🌐', label:'Public Profile' },
  { to:'/ads',            icon:'📣', label:'Ads'           },
  { to:'/settings',       icon:'⚙',  label:'Settings'      },
  { to:'/tracking', icon:'🛰️', label:'Live Tracking' },
{ to:'/cameras',  icon:'📹', label:'Cameras' },
{ to:'/academic', icon:'🎓', label:'Academic Year' }
]

export default function Sidebar({ onClose, mobile }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'admin'
  const meta = ROLE_META[role] || ROLE_META.admin
  const allowed  = ROLE_ALLOWED[role]
  const homeLink = ROLE_HOME[role] || '/dashboard'

  const canSee = (to) => !to || allowed === null || allowed.includes(to)

  const go = () => { if (onClose) onClose() }

  const handleLogout = () => {
    logout()
    navigate('/login')
    if (onClose) onClose()
  }

  return (
    <>
      {/* Logo */}
      <div className="sb-logo" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span className="sb-logo-text">Enroll<span>IQ</span></span>
        {mobile && (
          <button onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'var(--c-muted)', lineHeight:1 }}>
            ×
          </button>
        )}
      </div>

      {/* User */}
      <div className="sb-user">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className="sb-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div style={{ minWidth:0 }}>
            <p className="sb-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.name || 'User'}
            </p>
            <span className="sb-role" style={{ background: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {/* Dashboard always first */}
        <NavLink to={homeLink} onClick={go}
          className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}>
          <span className="icon">◧</span>
          Dashboard
        </NavLink>

        {NAV.map((item, i) => {
          if (item.section) {
            // Only show section header if admin or has items in this section
            const hasItems = NAV.slice(i+1).some(n => n.to && canSee(n.to) && !n.section)
            if (!hasItems || (role !== 'admin' && item.section === 'Growth' && !canSee('/analytics'))) return null
            if (role !== 'admin' && !['Finance & Ops','Academic','Main'].includes(item.section) &&
                !NAV.slice(i+1, NAV.findIndex((n,j) => j > i && n.section)).some(n => n.to && canSee(n.to))) return null
            return role === 'admin' ? (
              <p key={i} className="sb-section-label">{item.section}</p>
            ) : null
          }
          if (!canSee(item.to)) return null
          if (item.to === homeLink || item.to === '/dashboard') return null
          return (
            <NavLink key={item.to} to={item.to} onClick={go}
              className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}>
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        {role === 'admin' && (
          <a href="/discover" target="_blank" rel="noreferrer" onClick={go}
            className="sb-link" style={{ color:'var(--c-brand)', marginBottom:2 }}>
            <span className="icon">🔍</span>
            Discovery
          </a>
        )}
        <button onClick={handleLogout} className="sb-link"
          style={{ color:'var(--c-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background='var(--c-red-lt)'; e.currentTarget.style.color='var(--c-red)' }}
          onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.color='var(--c-muted)' }}>
          <span className="icon">⏻</span>
          Logout
        </button>
      </div>
    </>
  )
}