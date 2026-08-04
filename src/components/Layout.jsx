import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)

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
          <span style={{ fontFamily:'Georgia,serif', fontWeight:700, fontSize:18, color:'var(--c-ink)' }}>
            Enroll<span style={{ color:'var(--c-brand)' }}>IQ</span>
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