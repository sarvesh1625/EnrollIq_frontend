import { useState, useEffect, useRef } from 'react'
import api from '../api/axios'

const dApi = {
  login:      (d)     => api.post('/driver/login', d),
  getMe:      (tok)   => api.get('/driver/me',                 { headers:{ Authorization:`Bearer ${tok}` } }),
  getRoute:   (tok)   => api.get('/driver/route',              { headers:{ Authorization:`Bearer ${tok}` } }),
  scan:       (d,tok) => api.post('/driver/scan', d,           { headers:{ Authorization:`Bearer ${tok}` } }),
  startRoute: (d,tok) => api.post('/driver/start-route', d,    { headers:{ Authorization:`Bearer ${tok}` } }),
  endRoute:   (tok)   => api.post('/driver/end-route', {},     { headers:{ Authorization:`Bearer ${tok}` } }),
  getHistory: (d,tok) => api.get('/driver/attendance-history', { params:d, headers:{ Authorization:`Bearer ${tok}` } }),
}

// ── Login ─────────────────────────────────────────────────────────────────────
function DriverLogin({ onLogin }) {
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleLogin = async e => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await dApi.login({ phone })
      onLogin(res.data.token, res.data.driver)
    } catch (err) {
      setError(err.response?.data?.message || 'Phone not found. Contact school admin.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1a1814 0%,#2d2820 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'white', borderRadius:24, padding:32, width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🚌</div>
          <h1 style={{ fontFamily:'serif', fontSize:28, fontWeight:700, color:'#1a1814' }}>
            Enroll<span style={{ color:'#d4521a' }}>IQ</span>
          </h1>
          <div style={{ display:'inline-block', background:'#fdf0ea', borderRadius:20, padding:'3px 14px', marginTop:6 }}>
            <span style={{ fontSize:12, color:'#d4521a', fontWeight:600 }}>Driver Portal</span>
          </div>
        </div>

        <h2 style={{ fontSize:20, fontWeight:700, color:'#1a1814', marginBottom:4 }}>Good morning! 👋</h2>
        <p style={{ fontSize:13, color:'#9ca3af', marginBottom:24 }}>Enter your registered phone number to start your route</p>

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={{ fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
            placeholder="10-digit mobile number"
            required
            style={{ width:'100%', border:'1.5px solid', borderColor:phone.length===10?'#d4521a':'#e5e7eb', borderRadius:12, padding:'13px 14px', fontSize:15, outline:'none', boxSizing:'border-box', marginBottom:16 }}
          />
          <button
            type="submit"
            disabled={loading || phone.length < 10}
            style={{ width:'100%', background:phone.length===10?'#1a1814':'#e5e7eb', color:phone.length===10?'white':'#9ca3af', border:'none', borderRadius:12, padding:'14px', fontSize:15, fontWeight:600, cursor:phone.length===10?'pointer':'not-allowed' }}
          >
            {loading ? 'Verifying...' : 'Start my route →'}
          </button>
        </form>
        <p style={{ fontSize:11, color:'#9ca3af', textAlign:'center', marginTop:16 }}>
          Use the phone number registered with school admin
        </p>
      </div>
    </div>
  )
}

// ── QR Scanner ────────────────────────────────────────────────────────────────
function QRScanner({ token, driver, tripType, onScanned }) {
  const [qr,       setQr]       = useState('')
  const [scanning, setScanning] = useState(false)
  const [result,   setResult]   = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleScan = async () => {
    if (!qr.trim()) return
    setScanning(true); setResult(null)
    try {
      const res = await dApi.scan({ qr_code: qr.trim(), trip_type: tripType }, token)
      setResult({ success: true, data: res.data })
      setQr('')
      if (onScanned) onScanned(res.data)
      inputRef.current?.focus()
      setTimeout(() => setResult(null), 4000)
    } catch (err) {
      const msg = err.response?.data?.message || 'Scan failed'
      const alreadyScanned = err.response?.data?.already_scanned
      setResult({ success: false, message: msg, alreadyScanned })
      setQr('')
      setTimeout(() => setResult(null), 3000)
    } finally { setScanning(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ background: tripType==='Pickup'?'#f0fdf4':'#fffbeb', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:24 }}>{tripType==='Pickup'?'⬆':'⬇'}</span>
        <div>
          <p style={{ fontSize:14, fontWeight:700, color:'#1a1814' }}>{tripType} Mode</p>
          <p style={{ fontSize:11, color:'#9ca3af' }}>
            {tripType==='Pickup' ? 'Students boarding the bus' : 'Students being dropped off'}
          </p>
        </div>
      </div>

      <div style={{ background:'white', borderRadius:16, padding:16 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
          QR Code / RFID
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <input
            ref={inputRef}
            type="text"
            value={qr}
            onChange={e => setQr(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder="Scan QR or tap RFID card..."
            autoComplete="off"
            style={{ flex:1, border:'2px solid', borderColor:qr?'#d4521a':'#e5e7eb', borderRadius:10, padding:'12px 14px', fontSize:14, outline:'none' }}
          />
          <button
            onClick={handleScan}
            disabled={scanning || !qr.trim()}
            style={{ background:qr.trim()?'#1a1814':'#e5e7eb', color:qr.trim()?'white':'#9ca3af', border:'none', borderRadius:10, padding:'12px 20px', fontSize:14, fontWeight:600, cursor:qr.trim()?'pointer':'default', flexShrink:0 }}
          >
            {scanning ? '...' : '✓'}
          </button>
        </div>
        <p style={{ fontSize:11, color:'#9ca3af', marginTop:8 }}>Press Enter or tap ✓ after scanning</p>
      </div>

      {result && (
        <div style={{ borderRadius:14, padding:16, background:result.success?'#f0fdf4':result.alreadyScanned?'#fffbeb':'#fef2f2', border:`1px solid ${result.success?'#bbf7d0':result.alreadyScanned?'#fde68a':'#fecaca'}` }}>
          {result.success ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:28 }}>✅</span>
                <div>
                  <p style={{ fontSize:16, fontWeight:700, color:'#15803d' }}>Attendance Marked!</p>
                  <p style={{ fontSize:14, color:'#166534' }}>{result.data.student?.name}</p>
                  <p style={{ fontSize:12, color:'#4ade80' }}>{result.data.student?.class} · {result.data.time}</p>
                </div>
              </div>
              <p style={{ fontSize:12, color:'#15803d', marginTop:8 }}>
                {result.data.notified ? '📱 Parent notified via WhatsApp ✓' : '📱 Notification pending'}
              </p>
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:28 }}>{result.alreadyScanned ? '⚠️' : '❌'}</span>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:result.alreadyScanned?'#b45309':'#dc2626' }}>
                  {result.alreadyScanned ? 'Already scanned today' : 'Scan failed'}
                </p>
                <p style={{ fontSize:12, color:'#6b7280' }}>{result.message}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Driver Dashboard ─────────────────────────────────────────────────────
function DriverDashboard({ token, driver, onLogout }) {
  const [tab,         setTab]         = useState('scan')
  const [routeData,   setRouteData]   = useState(null)
  const [history,     setHistory]     = useState([])
  const [tripType,    setTripType]    = useState('Pickup')
  const [routeActive, setRouteActive] = useState(false)
  const [scannedToday,setScannedToday]= useState([])
  const [loading,     setLoading]     = useState(true)
  const [toast,       setToast]       = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadRoute = async () => {
    try {
      const res = await dApi.getRoute(token)
      setRouteData(res.data)
      setScannedToday(res.data.today_scans || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadRoute() }, [])

  const handleStartRoute = async () => {
    try {
      await dApi.startRoute({ trip_type: tripType }, token)
      setRouteActive(true)
      showToast('✅ Route started! Start scanning students.')
    } catch (err) { showToast('❌ ' + (err.response?.data?.message || 'Failed')) }
  }

  const handleEndRoute = async () => {
    if (!confirm('End route for today?')) return
    try {
      await dApi.endRoute(token)
      setRouteActive(false)
      showToast('Route ended. Have a safe journey!')
    } catch {}
  }

  const handleScanned = data => {
    setScannedToday(prev => [{
      student_name: data.student?.name,
      class:        data.student?.class,
      trip_type:    data.trip_type,
      scanned_at:   new Date().toISOString(),
      notified:     data.notified,
    }, ...prev])
  }

  const loadHistory = async () => {
    try {
      const res = await dApi.getHistory({}, token)
      setHistory(res.data.records || [])
    } catch {}
  }

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])

  const totalStudents = routeData?.students?.length || 0
  const pickupCount   = scannedToday.filter(s => s.trip_type === 'Pickup').length
  const dropCount     = scannedToday.filter(s => s.trip_type === 'Drop').length

  return (
    <div style={{ minHeight:'100vh', background:'#f8f6f1', maxWidth:480, margin:'0 auto' }}>
      {toast && (
        <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'#1a1814', color:'white', padding:'10px 20px', borderRadius:20, fontSize:13, fontWeight:500, zIndex:100, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:'#1a1814', padding:'16px 20px', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'white' }}>
              {driver.name[0]}
            </div>
            <div>
              <p style={{ color:'white', fontWeight:600, fontSize:14, lineHeight:1.2 }}>{driver.name}</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>{driver.school_name}</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {driver.bus_number && (
              <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'4px 10px' }}>
                <p style={{ color:'white', fontSize:12, fontWeight:600 }}>🚌 {driver.bus_number}</p>
              </div>
            )}
            <button
              onClick={onLogout}
              style={{ background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          {[
            { label:'Students', value:totalStudents, color:'#ffffff' },
            { label:'Pickups',  value:pickupCount,   color:'#86efac' },
            { label:'Drops',    value:dropCount,      color:'#fcd34d' },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'8px 12px', textAlign:'center' }}>
              <p style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</p>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:1 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Route start/end */}
        <div style={{ display:'flex', gap:8, marginTop:12, alignItems:'center' }}>
          <div style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:routeActive?'#22c55e':'#6b7280' }} />
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>
              {routeActive ? 'Route active' : 'Route not started'}
            </span>
          </div>
          {!routeActive ? (
            <button
              onClick={handleStartRoute}
              style={{ background:'#22c55e', color:'white', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              ▶ Start Route
            </button>
          ) : (
            <button
              onClick={handleEndRoute}
              style={{ background:'#ef4444', color:'white', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              ■ End Route
            </button>
          )}
        </div>
      </div>

      <div style={{ padding:16 }}>
        {/* Trip type toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {['Pickup','Drop'].map(t => (
            <button
              key={t}
              onClick={() => setTripType(t)}
              style={{ flex:1, padding:'12px', borderRadius:14, border:'2px solid', borderColor:tripType===t?'#1a1814':'#e5e7eb', background:tripType===t?'#1a1814':'white', color:tripType===t?'white':'#6b7280', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
            >
              <span style={{ fontSize:18 }}>{t==='Pickup'?'⬆':'⬇'}</span>
              {t}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'white', borderRadius:12, padding:4, marginBottom:16, border:'1px solid #f3f4f6' }}>
          {['scan','students','history'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ flex:1, padding:'9px 4px', borderRadius:8, border:'none', cursor:'pointer', background:tab===t?'#1a1814':'transparent', color:tab===t?'white':'#9ca3af', fontSize:12, fontWeight:600, textTransform:'capitalize' }}
            >
              {t==='scan'?'📱 Scan':t==='students'?'👥 Students':'📋 History'}
            </button>
          ))}
        </div>

        {/* Scan tab */}
        {tab === 'scan' && (
          <>
            <QRScanner token={token} driver={driver} tripType={tripType} onScanned={handleScanned} />
            {scannedToday.length > 0 && (
              <div style={{ background:'white', borderRadius:16, marginTop:16, overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between' }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>Today's scans ({scannedToday.length})</p>
                </div>
                {scannedToday.slice(0,10).map((s,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:i<Math.min(scannedToday.length-1,9)?'1px solid #f9f9f9':'none' }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:s.trip_type==='Pickup'?'#f0fdf4':'#fffbeb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                      {s.trip_type==='Pickup'?'⬆':'⬇'}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>{s.student_name}</p>
                      <p style={{ fontSize:11, color:'#9ca3af' }}>{s.class}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontSize:12, color:'#6b7280' }}>
                        {new Date(s.scanned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                      </p>
                      <p style={{ fontSize:11, color:s.notified?'#15803d':'#9ca3af' }}>
                        {s.notified?'📱✓':'📱⏳'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Students tab */}
        {tab === 'students' && (
          <div style={{ background:'white', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6' }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>
                Students on {driver.bus_number} ({routeData?.students?.length || 0})
              </p>
            </div>
            {loading ? (
              <p style={{ textAlign:'center', padding:30, color:'#9ca3af', fontSize:13 }}>Loading...</p>
            ) : !routeData?.students?.length ? (
              <div style={{ textAlign:'center', padding:30 }}>
                <p style={{ fontSize:32, marginBottom:8 }}>👥</p>
                <p style={{ fontSize:13, color:'#9ca3af' }}>No students enrolled on this bus yet</p>
              </div>
            ) : routeData.students.map((s, i) => {
              const scanned = scannedToday.find(sc => sc.student_name === s.student_name)
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:i<routeData.students.length-1?'1px solid #f9f9f9':'none' }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'#fdf0ea', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#d4521a', flexShrink:0 }}>
                    {s.student_name[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>{s.student_name}</p>
                    <p style={{ fontSize:11, color:'#9ca3af' }}>{s.class} · {s.roll_number}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {scanned ? (
                      <div style={{ background:scanned.trip_type==='Pickup'?'#f0fdf4':'#fffbeb', borderRadius:8, padding:'3px 8px' }}>
                        <p style={{ fontSize:11, fontWeight:600, color:scanned.trip_type==='Pickup'?'#15803d':'#b45309' }}>
                          ✓ {scanned.trip_type}
                        </p>
                        <p style={{ fontSize:10, color:'#9ca3af' }}>
                          {new Date(scanned.scanned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                        </p>
                      </div>
                    ) : (
                      <span style={{ fontSize:11, color:'#9ca3af' }}>Not scanned</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div style={{ background:'white', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #f3f4f6' }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>Today's attendance ({history.length})</p>
            </div>
            {history.length === 0 ? (
              <p style={{ textAlign:'center', padding:30, color:'#9ca3af', fontSize:13 }}>No records today</p>
            ) : history.map((r,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:i<history.length-1?'1px solid #f9f9f9':'none' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:r.trip_type==='Pickup'?'#f0fdf4':'#fffbeb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                  {r.trip_type==='Pickup'?'⬆':'⬇'}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#1a1814' }}>{r.student_name}</p>
                  <p style={{ fontSize:11, color:'#9ca3af' }}>{r.class}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:12, color:'#6b7280' }}>
                    {new Date(r.scanned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                  </p>
                  <span style={{ fontSize:10, fontWeight:600, color:r.trip_type==='Pickup'?'#15803d':'#b45309' }}>
                    {r.trip_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Entry Point ───────────────────────────────────────────────────────────────
export default function DriverPortal() {
  const [token,  setToken]  = useState(() => localStorage.getItem('driver_token'))
  const [driver, setDriver] = useState(() => {
    try { return JSON.parse(localStorage.getItem('driver_info') || 'null') } catch { return null }
  })

  const handleLogin = (tok, drv) => {
    setToken(tok); setDriver(drv)
    localStorage.setItem('driver_token', tok)
    localStorage.setItem('driver_info',  JSON.stringify(drv))
  }

  const handleLogout = () => {
    setToken(null); setDriver(null)
    localStorage.removeItem('driver_token')
    localStorage.removeItem('driver_info')
  }

  if (!token || !driver) return <DriverLogin onLogin={handleLogin} />
  return <DriverDashboard token={token} driver={driver} onLogout={handleLogout} />
}