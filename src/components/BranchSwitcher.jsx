import { useState, useEffect } from 'react'
import api from '../api/axios'

/**
 * BranchSwitcher — lets an enterprise admin switch between branches (schools in
 * their group). Only renders if the admin has 2+ branches.
 * Place in the sidebar like YearSwitcher.
 */
export default function BranchSwitcher({ variant = 'sidebar' }) {
  const [branches, setBranches] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [isEnterprise, setIsEnterprise] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')

  const loadBranches = () => api.get('/branches/mine')
    .then(r => { setBranches(r.data.branches || []); setActiveId(r.data.active_school_id) })
    .catch(() => {})

  useEffect(() => {
    loadBranches()
    api.get('/features/mine').then(r => setIsEnterprise((r.data.plan || '') === 'enterprise')).catch(() => {})
  }, [])

  const addBranch = async () => {
    if (!newName.trim()) return
    try {
      await api.post('/branches', { name: newName.trim(), city: newCity.trim() || null })
      setNewName(''); setNewCity(''); setShowAdd(false)
      await loadBranches()
    } catch (e) {
      alert(e.response?.data?.message || 'Could not add branch.')
    }
  }

  // Show the switcher if 2+ branches OR the admin is enterprise (so they can add the first branch)
  if (branches.length < 2 && !isEnterprise) return null

  const active = branches.find(b => b.id === activeId) || branches[0]

  const doSwitch = async (id) => {
    if (id === activeId) { setOpen(false); return }
    setSwitching(true)
    try {
      await api.put('/branches/switch', { school_id: id })
      setActiveId(id)
      setOpen(false)
      // reload so every page re-fetches data for the new branch
      window.location.reload()
    } catch {
      setSwitching(false)
    }
  }

  return (
    <div style={{ position: 'relative', margin: variant === 'sidebar' ? '8px 12px' : 0 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(18,163,138,0.10)', border: '1px solid rgba(18,163,138,0.3)',
          color: '#0f766e', fontSize: 13, fontWeight: 700,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          🏫 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active?.name || 'Branch'}</span>
        </span>
        <span style={{ fontSize: 10 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Switch branch</div>
          {branches.map(b => (
            <button key={b.id} onClick={() => doSwitch(b.id)} disabled={switching}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px', cursor: 'pointer',
                background: b.id === activeId ? 'rgba(18,163,138,0.08)' : 'transparent',
                border: 'none', borderTop: '1px solid #f3f4f6',
                fontSize: 13, fontWeight: b.id === activeId ? 700 : 500,
                color: b.id === activeId ? '#0f766e' : '#374151',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <span>{b.name}{b.is_main_branch ? ' (Main)' : ''}{b.city ? ` · ${b.city}` : ''}</span>
              {b.id === activeId && <span style={{ color: '#12a38a' }}>✓</span>}
            </button>
          ))}

          {/* Add branch — enterprise only */}
          {isEnterprise && !showAdd && (
            <button onClick={() => setShowAdd(true)}
              style={{ width:'100%', textAlign:'left', padding:'10px 12px', cursor:'pointer',
                background:'transparent', border:'none', borderTop:'1px solid #f3f4f6',
                fontSize:13, fontWeight:700, color:'#12a38a' }}>
              + Add branch
            </button>
          )}
          {isEnterprise && showAdd && (
            <div style={{ padding:'10px 12px', borderTop:'1px solid #f3f4f6', display:'flex', flexDirection:'column', gap:6 }}>
              <input autoFocus placeholder="Branch name" value={newName} onChange={e => setNewName(e.target.value)}
                style={{ padding:'7px 9px', border:'1px solid #e5e7eb', borderRadius:7, fontSize:13 }} />
              <input placeholder="City (optional)" value={newCity} onChange={e => setNewCity(e.target.value)}
                style={{ padding:'7px 9px', border:'1px solid #e5e7eb', borderRadius:7, fontSize:13 }} />
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={addBranch} style={{ flex:1, padding:'7px', borderRadius:7, border:'none', background:'#12a38a', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>Create</button>
                <button onClick={() => { setShowAdd(false); setNewName(''); setNewCity('') }} style={{ padding:'7px 10px', borderRadius:7, border:'1px solid #e5e7eb', background:'#fff', fontSize:12.5, cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}