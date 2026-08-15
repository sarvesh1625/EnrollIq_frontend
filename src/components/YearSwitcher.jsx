import { useState, useEffect } from 'react'
import api from '../api/axios'

/**
 * YearSwitcher — shows the active academic year and lets an admin switch it.
 * Switching flips the GLOBAL active year (with confirmation), so every
 * year-scoped page (leads, students, fees, exams, kit, admissions) follows.
 *
 * Props:
 *   variant: 'sidebar' | 'dashboard'  (styling)
 *   onChanged: optional callback after the active year changes
 */
export default function YearSwitcher({ variant = 'sidebar', onChanged }) {
  const [years, setYears]   = useState([])
  const [active, setActive] = useState(null)
  const [open, setOpen]     = useState(false)
  const [busy, setBusy]     = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/academic/years')
      const list = res.data || []
      setYears(list)
      setActive(list.find(y => y.is_active) || null)
    } catch {}
  }
  useEffect(() => { load() }, [])

  const switchTo = async (y) => {
    if (y.is_active) { setOpen(false); return }
    const ok = window.confirm(
      `Switch the active academic year to ${y.name}?\n\n` +
      `This changes what EVERY page shows — leads, students, fees, exams and more ` +
      `will display ${y.name} data. It affects all admins. Continue?`
    )
    if (!ok) return
    setBusy(true)
    try {
      await api.put(`/academic/years/${y.id}/activate`)
      await load()
      setOpen(false)
      onChanged && onChanged(y)
      // reload so every page re-fetches for the new year
      window.location.reload()
    } catch (e) {
      alert(e.response?.data?.message || 'Could not switch year')
    } finally { setBusy(false) }
  }

  if (!active && years.length === 0) return null

  // ── sidebar variant: compact pill ──
  if (variant === 'sidebar') {
    return (
      <div style={{ position:'relative', margin:'8px 12px' }}>
        <button onClick={() => setOpen(o=>!o)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:8, padding:'8px 12px', borderRadius:10, border:'1px solid #e5e7eb',
            background:'#f2f7f5', cursor:'pointer', fontSize:13 }}>
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>🎓</span>
            <span style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1.2 }}>
              <span style={{ fontSize:10, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Academic Year</span>
              <span style={{ fontWeight:700, color:'#12a38a' }}>{active ? active.name : '—'}</span>
            </span>
          </span>
          <span style={{ color:'#9ca3af', fontSize:11 }}>▼</span>
        </button>
        {open && (
          <div style={{ position:'absolute', bottom:'110%', left:0, right:0, background:'#fff',
            border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:50 }}>
            {years.map(y => (
              <button key={y.id} onClick={() => switchTo(y)} disabled={busy}
                style={{ width:'100%', textAlign:'left', padding:'10px 12px', border:'none',
                  background: y.is_active ? '#e7f7f2' : '#fff', cursor:'pointer', fontSize:13,
                  fontWeight: y.is_active ? 700 : 500, color: y.is_active ? '#0d8571' : '#374151',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                {y.name}{y.is_active && <span style={{ fontSize:11 }}>✓ active</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── dashboard variant: banner ──
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:'#e7f7f2',
      border:'1px solid #cdede4', borderRadius:12, padding:'10px 16px' }}>
      <span style={{ fontSize:18 }}>🎓</span>
      <div style={{ lineHeight:1.3 }}>
        <div style={{ fontSize:10, color:'#0a5546', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Viewing Academic Year</div>
        <div style={{ fontSize:16, fontWeight:700, color:'#0d8571' }}>{active ? active.name : '—'}</div>
      </div>
      <div style={{ position:'relative' }}>
        <button onClick={() => setOpen(o=>!o)}
          style={{ background:'#12a38a', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px',
            fontSize:12, fontWeight:600, cursor:'pointer' }}>Switch ▼</button>
        {open && (
          <div style={{ position:'absolute', top:'110%', right:0, minWidth:160, background:'#fff',
            border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:50 }}>
            {years.map(y => (
              <button key={y.id} onClick={() => switchTo(y)} disabled={busy}
                style={{ width:'100%', textAlign:'left', padding:'10px 12px', border:'none',
                  background: y.is_active ? '#e7f7f2' : '#fff', cursor:'pointer', fontSize:13,
                  fontWeight: y.is_active ? 700 : 500, color: y.is_active ? '#0d8571' : '#374151',
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                {y.name}{y.is_active && <span style={{ fontSize:11 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}