import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Driver Live Tracking page
   The driver opens this on their phone: /driver/track/:busId
   Big Start/Stop button; while active it streams the phone's GPS
   to the backend every few seconds.
   Standalone (no sidebar) so it works on a shared driver phone.
   ═══════════════════════════════════════════════════════════════ */

const PING_MS = 5000

export default function DriverTracking() {
  const { busId }   = useParams()
  const [active, setActive]   = useState(false)
  const [tripType, setTripType] = useState('Pickup')
  const [driver, setDriver]   = useState('')
  const [pos, setPos]         = useState(null)
  const [err, setErr]         = useState('')
  const [pings, setPings]     = useState(0)
  const watchId = useRef(null)
  const timer   = useRef(null)
  const latest  = useRef(null)

  const sendLocation = async () => {
    if (!latest.current) return
    const { latitude, longitude, speed, heading } = latest.current
    try {
      await api.post(`/tracking/buses/${busId}/location`, {
        latitude, longitude,
        speed: speed != null ? Math.round(speed * 3.6) : null, // m/s → km/h
        heading: heading ?? null,
      })
      setPings(p => p + 1)
    } catch { /* keep trying */ }
  }

  const startTrip = async () => {
    setErr('')
    if (!navigator.geolocation) { setErr('This device has no GPS / location support.'); return }
    try {
      await api.post(`/tracking/buses/${busId}/trip`, {
        active: true, trip_type: tripType, driver_name: driver || null,
      })
    } catch {}
    // watch position
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        latest.current = p.coords
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy,
                 spd: p.coords.speed != null ? Math.round(p.coords.speed * 3.6) : null })
        setErr('')
      },
      (e) => setErr(e.code === 1 ? 'Location permission denied. Please allow location access.' : 'Could not get location.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )
    timer.current = setInterval(sendLocation, PING_MS)
    setActive(true)
  }

  const stopTrip = async () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    if (timer.current) clearInterval(timer.current)
    watchId.current = null; timer.current = null; latest.current = null
    try { await api.post(`/tracking/buses/${busId}/trip`, { active: false }) } catch {}
    setActive(false); setPos(null); setPings(0)
  }

  useEffect(() => () => {   // cleanup on unmount
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    if (timer.current) clearInterval(timer.current)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0f1720', color:'#fff',
      fontFamily:"'Inter',sans-serif", display:'flex', flexDirection:'column',
      alignItems:'center', padding:'28px 20px' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <p style={{ fontSize:22, fontWeight:800 }}>
            Enroll<span style={{ color:'#38ba9c' }}>IQ</span>
          </p>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:4 }}>Driver Live Tracking</p>
        </div>

        {/* Status card */}
        <div style={{ background: active ? 'rgba(56,186,156,0.12)' : 'rgba(255,255,255,0.05)',
          border:`1px solid ${active ? 'rgba(56,186,156,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius:18, padding:'26px 22px', textAlign:'center', marginBottom:22 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', margin:'0 auto 16px',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:36,
            background: active ? 'rgba(56,186,156,0.2)' : 'rgba(255,255,255,0.08)',
            animation: active ? 'pulse 1.6s ease-in-out infinite' : 'none' }}>
            {active ? '🛰️' : '🚌'}
          </div>
          <p style={{ fontSize:18, fontWeight:700 }}>
            {active ? 'Trip Active — Sharing Location' : 'Trip Not Started'}
          </p>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginTop:6 }}>
            Bus #{busId}{active ? ` · ${tripType}` : ''}
          </p>
          {active && pos && (
            <div style={{ marginTop:16, fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.9 }}>
              <div>📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</div>
              <div>🎯 Accuracy ~{Math.round(pos.acc)}m {pos.spd != null ? `· 🚀 ${pos.spd} km/h` : ''}</div>
              <div style={{ color:'#38ba9c' }}>✓ {pings} update{pings === 1 ? '' : 's'} sent</div>
            </div>
          )}
        </div>

        {err && (
          <div style={{ background:'rgba(220,50,50,0.15)', border:'1px solid rgba(220,50,50,0.3)',
            borderRadius:12, padding:'12px 16px', fontSize:13, color:'#ff9b9b', marginBottom:18 }}>
            {err}
          </div>
        )}

        {/* Pre-trip inputs */}
        {!active && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:22 }}>
            <div>
              <label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', display:'block', marginBottom:6 }}>Driver name (optional)</label>
              <input value={driver} onChange={e => setDriver(e.target.value)} placeholder="Your name"
                style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'rgba(255,255,255,0.5)', display:'block', marginBottom:8 }}>Trip type</label>
              <div style={{ display:'flex', gap:10 }}>
                {['Pickup','Drop'].map(t => (
                  <button key={t} onClick={() => setTripType(t)}
                    style={{ flex:1, padding:'12px', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer',
                      border: tripType === t ? '2px solid #38ba9c' : '1px solid rgba(255,255,255,0.15)',
                      background: tripType === t ? 'rgba(56,186,156,0.15)' : 'transparent',
                      color: tripType === t ? '#38ba9c' : 'rgba(255,255,255,0.6)' }}>
                    {t === 'Pickup' ? '⬆ Pickup' : '⬇ Drop'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main button */}
        {!active ? (
          <button onClick={startTrip} style={{ ...bigBtn, background:'#12a38a' }}>
            ▶  Start Trip
          </button>
        ) : (
          <button onClick={stopTrip} style={{ ...bigBtn, background:'#c0392b' }}>
            ■  Stop Trip
          </button>
        )}

        <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.35)', textAlign:'center', marginTop:18, lineHeight:1.7 }}>
          Keep this screen open during the trip. Your live location is shared with the school
          admin only while a trip is active, and stops the moment you press Stop.
        </p>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{ transform:scale(1); opacity:1 } 50%{ transform:scale(1.08); opacity:.85 } }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  )
}

const inp = {
  width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)',
  borderRadius:10, padding:'12px 14px', fontSize:15, color:'#fff', outline:'none', boxSizing:'border-box',
}
const bigBtn = {
  width:'100%', color:'#fff', border:'none', borderRadius:14, padding:'18px',
  fontSize:18, fontWeight:700, cursor:'pointer', boxShadow:'0 6px 20px rgba(0,0,0,0.3)',
}