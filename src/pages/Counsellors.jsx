import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getCounsellors, setAutoAssign, updateCounsellor, assignAllUnassigned, getCounsellorLeads, assignBulk } from '../api/leads'

export default function Counsellors() {
  const navigate = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [toast,   setToast]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [pick,    setPick]    = useState('')
  // the counsellor whose leads are open below
  const [sel,     setSel]     = useState(null)        // counsellor object
  const [scope,   setScope]   = useState('all')      // open | all
  const [leads,   setLeads]   = useState([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [checked, setChecked] = useState([])
  const [target,  setTarget]  = useState('')

  const showToast = m => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const load = async () => {
    setError('')
    try { setData((await getCounsellors()).data) }
    catch (e) { setError(e.response?.data?.message || 'Could not load counsellors') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const loadLeads = async (c, sc) => {
    setLoadingLeads(true); setChecked([])
    try { setLeads((await getCounsellorLeads(c.id, sc)).data.leads) }
    catch (e) { showToast(e.response?.data?.message || 'Could not load leads'); setLeads([]) }
    finally { setLoadingLeads(false) }
  }
  const openCounsellor = c => {
    if (sel && sel.id === c.id) { setSel(null); return }
    setSel(c); setScope('all'); setTarget(''); loadLeads(c, 'all')
  }
  const changeScope = sc => { setScope(sc); loadLeads(sel, sc) }
  const moveLeads = async (ids, userId) => {
    if (!ids.length || !userId) return
    setBusy(true)
    try {
      const r = await assignBulk(ids, parseInt(userId))
      showToast(`${r.data.moved} lead(s) moved`)
      await load(); await loadLeads(sel, scope); setTarget('')
    } catch (e) { showToast(e.response?.data?.message || 'Could not move leads') }
    finally { setBusy(false) }
  }
  const others = sel && data ? data.counsellors.filter(c => c.id !== sel.id) : []
  const allChecked = leads.length > 0 && checked.length === leads.length

  const act = async (fn, okMsg) => {
    setBusy(true)
    try { const r = await fn(); if (okMsg) showToast(typeof okMsg === 'function' ? okMsg(r.data) : okMsg); await load() }
    catch (e) { showToast(e.response?.data?.message || 'Something went wrong') }
    finally { setBusy(false) }
  }

  const toggleAuto   = () => act(() => setAutoAssign(!data.auto_assign), data.auto_assign ? 'Auto-assign turned off' : 'Auto-assign turned on')
  const addCounsellor = () => { if (!pick) return; act(() => updateCounsellor(pick, { is_counsellor: true, available: true }), 'Counsellor added'); setPick('') }
  const setAvail     = c => act(() => updateCounsellor(c.id, { available: !c.available, redistribute: c.available }),
                              r => c.available ? `Paused. ${r.redistributed} open lead(s) moved` : 'Available again')
  const remove       = c => { if (!window.confirm(`Remove ${c.name} as counsellor? Their open leads will be moved to other counsellors.`)) return
                              act(() => updateCounsellor(c.id, { is_counsellor: false, redistribute: true }), r => `Removed. ${r.redistributed} open lead(s) moved`) }
  const assignAll    = () => act(() => assignAllUnassigned(), r => `${r.assigned} of ${r.checked} unassigned leads assigned`)

  const candidates = (data?.people || []).filter(p => !p.is_counsellor)
  const th = { fontSize:11, fontWeight:600, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'left', padding:'10px 14px' }
  const td = { fontSize:13, color:'var(--c-ink)', padding:'12px 14px', borderTop:'1px solid #faf9f7' }

  return (
    <Layout>
      <div className="page">
        {toast && <div style={{ position:'fixed', top:20, right:20, zIndex:99, background:'var(--c-ink)', color:'white', fontSize:13, padding:'10px 18px', borderRadius:12 }}>{toast}</div>}

        <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'var(--c-ink)', margin:0 }}>Lead counsellors</h1>
        <p style={{ color:'var(--c-muted)', fontSize:13, margin:'6px 0 20px' }}>
          New leads go to the counsellor with the best lead-to-admission conversion, while keeping everyone's open load balanced.
        </p>

        {error && <div style={{ background:'var(--c-amber-lt)', color:'var(--c-amber)', fontSize:13, padding:'10px 14px', borderRadius:10, marginBottom:16 }}>{error}</div>}
        {loading ? <p style={{ color:'var(--c-muted)' }}>Loading...</p> : data && (<>

          <div className="card" style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginBottom:16 }}>
            <div style={{ flex:1, minWidth:220 }}>
              <p style={{ margin:0, fontWeight:600, fontSize:14 }}>Automatic assignment is {data.auto_assign ? 'ON' : 'OFF'}</p>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--c-muted)' }}>
                School conversion so far: {data.school_rate}%. {data.unassigned_open} open lead(s) have no counsellor.
              </p>
            </div>
            <button className="btn-ghost" disabled={busy} onClick={toggleAuto}>{data.auto_assign ? 'Turn off' : 'Turn on'}</button>
            <button className="btn-primary" disabled={busy || data.unassigned_open === 0 || data.counsellors.length === 0} onClick={assignAll}>
              Assign {data.unassigned_open} unassigned now
            </button>
          </div>

          <div className="card" style={{ padding:0, overflowX:'auto', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
              <thead><tr style={{ background:'var(--c-surface-2)' }}>
                {['Counsellor','All leads (12 mo)','Admitted','Conversion','Open now (in progress)','Status',''].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.counsellors.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, color:'var(--c-muted)', textAlign:'center', padding:32 }}>
                    No counsellors yet. Add staff below, then new leads will be assigned automatically.</td></tr>
                )}
                {data.counsellors.map(c => (
                  <tr key={c.id}>
                    <td style={{ ...td, cursor:'pointer' }} onClick={() => openCounsellor(c)} title="Click to see this counsellor's leads">
                      <b style={{ color:'var(--c-brand)' }}>{c.name}</b> <span style={{ fontSize:11, color:'var(--c-muted)' }}>{sel && sel.id === c.id ? '▾' : '▸'}</span>
                      <div style={{ fontSize:11, color:'var(--c-muted)' }}>{c.role}</div></td>
                    <td style={td}>{c.total}</td>
                    <td style={td}>{c.admitted}</td>
                    <td style={td}>{c.conversion_pct == null ? 'new' : c.conversion_pct + '%'}</td>
                    <td style={td}>{c.open}</td>
                    <td style={td}>{c.available ? 'Receiving leads' : 'Paused'}</td>
                    <td style={{ ...td, textAlign:'right', whiteSpace:'nowrap' }}>
                      <button className="btn-ghost" disabled={busy} onClick={() => setAvail(c)} style={{ marginRight:6 }}>{c.available ? 'Pause' : 'Resume'}</button>
                      <button className="btn-ghost" disabled={busy} onClick={() => remove(c)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sel && (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:12 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700 }}>{sel.name}'s leads</h2>
                <div style={{ display:'flex', gap:3, background:'white', border:'1px solid var(--c-border-2)', borderRadius:8, padding:3 }}>
                  {[['all','All'],['open','Open only']].map(([v,l]) => (
                    <button key={v} onClick={() => changeScope(v)}
                      style={{ fontSize:11, padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer',
                        background: scope === v ? 'var(--c-ink)' : 'transparent', color: scope === v ? 'white' : 'var(--c-ink-2)' }}>{l}</button>
                  ))}
                </div>
                <button className="btn-ghost" style={{ marginLeft:'auto' }} onClick={() => setSel(null)}>Close</button>
              </div>

              {others.length === 0 && <p style={{ fontSize:12, color:'var(--c-amber)', margin:'0 0 10px' }}>Add another counsellor to be able to move these leads.</p>}

              {checked.length > 0 && others.length > 0 && (
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', background:'var(--c-surface-2)', padding:'8px 12px', borderRadius:10, marginBottom:10 }}>
                  <span style={{ fontSize:12 }}>{checked.length} selected. Move to:</span>
                  <select className="input" style={{ maxWidth:200 }} value={target} onChange={e => setTarget(e.target.value)}>
                    <option value="">Choose counsellor</option>
                    {others.map(o => <option key={o.id} value={o.id}>{o.name}{o.available ? '' : ' (paused)'}</option>)}
                  </select>
                  <button className="btn-primary" disabled={!target || busy} onClick={() => moveLeads(checked, target)}>Move</button>
                </div>
              )}

              {loadingLeads ? <p style={{ color:'var(--c-muted)', fontSize:13 }}>Loading...</p> :
               leads.length === 0 ? <p style={{ color:'var(--c-muted)', fontSize:13 }}>No {scope === 'open' ? 'open ' : ''}leads for this counsellor.</p> : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:560 }}>
                    <thead><tr>
                      <th style={{ ...th, width:30 }}><input type="checkbox" checked={allChecked} onChange={e => setChecked(e.target.checked ? leads.map(l => l.id) : [])} /></th>
                      {['Parent','Phone','Grade','Status','Move to'].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {leads.map(l => (
                        <tr key={l.id}>
                          <td style={td}><input type="checkbox" checked={checked.includes(l.id)}
                            onChange={e => setChecked(prev => e.target.checked ? [...prev, l.id] : prev.filter(x => x !== l.id))} /></td>
                          <td style={{ ...td, cursor:'pointer' }} onClick={() => navigate(`/leads/${l.id}`)}><b>{l.parent_name}</b></td>
                          <td style={td}>{l.phone}</td>
                          <td style={td}>{l.child_grade || '-'}</td>
                          <td style={td}>{l.status}</td>
                          <td style={td}>
                            <select className="input" style={{ maxWidth:170 }} value="" disabled={busy || others.length === 0}
                              onChange={e => moveLeads([l.id], e.target.value)}>
                              <option value="">Choose counsellor</option>
                              {others.map(o => <option key={o.id} value={o.id}>{o.name}{o.available ? '' : ' (paused)'}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="card" style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <select className="input" style={{ maxWidth:280 }} value={pick} onChange={e => setPick(e.target.value)}>
              <option value="">Add a counsellor...</option>
              {candidates.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
            </select>
            <button className="btn-primary" disabled={!pick || busy} onClick={addCounsellor}>Add</button>
            <button className="btn-ghost" onClick={() => navigate('/leads?assigned_to=unassigned')} style={{ marginLeft:'auto' }}>View unassigned leads</button>
          </div>

          <p style={{ fontSize:12, color:'var(--c-muted)', marginTop:14, lineHeight:1.6 }}>
            How it works: each counsellor gets a share of open leads in proportion to their conversion (Admitted / Leads, smoothed so new counsellors get a fair start).
            Click a counsellor's name to see their leads and move them to another counsellor. Any lead can also be changed from the Leads list or the lead page.
          </p>
        </>)}
      </div>
    </Layout>
  )
}