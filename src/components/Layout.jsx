import { useState } from 'react'
import Sidebar from './Sidebar'
import { SchoolLogo, useSchoolBrand } from './SchoolBrand'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const brand = useSchoolBrand()

  return (
    <div className="layout-root">

      {/* Desktop sidebar */}
      <aside className="layout-aside">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <div className={`sb-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <div className={`sb-drawer ${open ? 'open' : ''}`}>
        <Sidebar onClose={() => setOpen(false)} mobile />
      </div>

      {/* Main */}
      <div className="layout-main">

        {/* Mobile top bar */}
        <header className="topbar">
          <button className="topbar-ham" onClick={() => setOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <span style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
            <SchoolLogo size={28} radius={8} />
            <span style={{ fontFamily:'Georgia,serif', fontWeight:700, fontSize:16, color:'var(--c-ink)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>
              {brand?.name || user?.school_name || 'EnrollIQ'}
            </span>
          </span>
          <div style={{ width: 32 }} />
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}