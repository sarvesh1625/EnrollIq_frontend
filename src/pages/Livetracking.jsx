import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — Live Bus Tracking (Admin)  ·  GPS-device ready
   Leaflet + OpenStreetMap (no key). Auto-refresh every 5s.
   Shows device status: online/offline · signal · ignition · speed.
   Works with a driver phone OR a real GPS tracker (via Traccar sync).
   ═══════════════════════════════════════════════════════════════ */

const REFRESH_MS = 5000
const DEFAULT_CENTER = [17.4485, 78.3908]  // Hyderabad fallback

const MOCK_BUSES = [
  { bus_id:1, bus_number:'BUS-01', plate_number:'TS09AB1234', route_name:'Madhapur Route',
    latitude:17.4485, longitude:78.3908, speed:32, heading:90, trip_active:1, trip_type:'Pickup',
    driver_name:'Ravi', source:'device', ignition:1, satellites:9, battery:82,
    is_live:true, is_online:true, signal:'strong', updated_at:new Date().toISOString() },
  { bus_id:2, bus_number:'BUS-02', plate_number:'TS09CD5678', route_name:'Gachibowli Route',
    latitude:17.4401, longitude:78.3489, speed:0, heading:0, trip_active:1, trip_type:'Drop',
    driver_name:'Kumar', source:'device', ignition:0, satellites:6, battery:64,
    is_live:true, is_online:true, signal:'ok', updated_at:new Date().toISOString() },
  { bus_id:3, bus_number:'BUS-03', plate_number:'TS09EF9012', route_name:'Kondapur Route',
    latitude:null, longitude:null, speed:null, trip_active:0, driver_name:null, source:'device',
    ignition:null, satellites:null, battery:null,
    is_live:false, is_online:false, signal:null, updated_at:null },
]

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L)
    const css = document.createElement('link')
    css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.onload = () => resolve(window.L)
    document.body.appendChild(s)
  })
}

function timeAgo(iso) {
  if (!iso) return 'never'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

const signalBars = (sig) => sig === 'strong' ? '▂▄▆' : sig === 'ok' ? '▂▄' : sig === 'weak' ? '▂' : '—'
const signalColor = (sig) => sig === 'strong' ? 'var(--c-green)' : sig === 'ok' ? 'var(--c-amber)' : sig === 'weak' ? 'var(--c-red)' : 'var(--c-muted)'

export default function LiveTracking() {
  const [buses, setBuses]       = useState(MOCK_BUSES)
  const [selected, setSelected] = useState(null)
  const [ready, setReady]       = useState(false)
  const mapRef  = useRef(null)
  const mapObj  = useRef(null)
  const markers = useRef({})
  const LRef    = useRef(null)

  useEffect(() => {
    let alive = true
    loadLeaflet().then(L => {
      if (!alive || !mapRef.current || mapObj.current) return
      LRef.current = L
      mapObj.current = L.map(mapRef.current, { zoomControl:true }).setView(DEFAULT_CENTER, 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'© OpenStreetMap', maxZoom:19,
      }).addTo(mapObj.current)
      setReady(true)
    })
    return () => { alive = false }
  }, [])

  const fetchBuses = useCallback(() => {
    api.get('/tracking/buses')
      .then(r => { if (r.data?.length) setBuses(r.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchBuses()
    const id = setInterval(fetchBuses, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchBuses])

  // draw / update markers
  useEffect(() => {
    const L = LRef.current, map = mapObj.current
    if (!L || !map) return
    const live = buses.filter(b => b.latitude != null && b.longitude != null)

    live.forEach(b => {
      const pos = [Number(b.latitude), Number(b.longitude)]
      const color = !b.is_online ? '#9ca3af' : (b.speed > 0 ? '#12a38a' : '#d97706')
      const html = `<div style="position:relative;width:36px;height:36px;">
        <div style="background:${color};width:34px;height:34px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:15px;">🚌</span></div>
        ${b.is_online && b.speed > 0 ? `<div style="position:absolute;top:-3px;right:-3px;width:10px;height:10px;
          background:#12a38a;border:2px solid #fff;border-radius:50%;"></div>` : ''}
        </div>`
      const icon = L.divIcon({ html, className:'', iconSize:[36,36], iconAnchor:[18,34] })
      if (markers.current[b.bus_id]) {
        markers.current[b.bus_id].setLatLng(pos).setIcon(icon)
      } else {
        markers.current[b.bus_id] = L.marker(pos, { icon }).addTo(map)
          .on('click', () => setSelected(b.bus_id))
      }
      markers.current[b.bus_id].bindPopup(
        `<b>${b.bus_number}</b> ${b.plate_number ? '· ' + b.plate_number : ''}<br>` +
        `${b.route_name || 'No route'}<br>` +
        `${b.is_online
          ? `🟢 Online · ${b.speed ?? 0} km/h${b.ignition != null ? ' · ' + (b.ignition ? '🔑 Engine ON' : 'Engine off') : ''}`
          : '⚪ Offline · last seen ' + timeAgo(b.updated_at)}`)
    })

    Object.keys(markers.current).forEach(id => {
      if (!live.find(b => String(b.bus_id) === id)) {
        map.removeLayer(markers.current[id]); delete markers.current[id]
      }
    })

    if (live.length && !map._fitted) {
      const g = L.featureGroup(Object.values(markers.current))
      try { map.fitBounds(g.getBounds().pad(0.3)) } catch {}
      map._fitted = true
    }
  }, [buses, ready])

  const focusBus = (b) => {
    setSelected(b.bus_id)
    const map = mapObj.current
    if (map && b.latitude != null) {
      map.setView([Number(b.latitude), Number(b.longitude)], 15, { animate:true })
      markers.current[b.bus_id]?.openPopup()
    }
  }

  const onlineCount = buses.filter(b => b.is_online).length
  const movingCount = buses.filter(b => b.is_online && b.speed > 0).length
  const sel = buses.find(b => b.bus_id === selected)

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">🛰️ Live Bus Tracking</h1>
            <p className="text-gray-400 text-sm mt-1">
              {onlineCount} online · {movingCount} moving · updates every 5s
            </p>
          </div>
          <div className="actions">
            <button className="btn-ghost text-sm" onClick={fetchBuses}>↻ Refresh</button>
          </div>
        </div>

        {/* status summary */}
        <div className="grid grid-cols-4 gap-4 mb-5 g-4">
          {[
            { label:'Total buses', value:buses.length },
            { label:'Online',      value:onlineCount, accent:true },
            { label:'Moving now',  value:movingCount },
            { label:'Offline',     value:buses.length - onlineCount },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <p className="label">{k.label}</p>
              <p className={`font-serif text-3xl font-bold mt-1 ${k.accent ? 'text-brand-600' : 'text-ink'}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 track-split">
          {/* Bus list with device status */}
          <div className="flex flex-col gap-3">
            <div className="card" style={{ padding:8, maxHeight:'66vh', overflowY:'auto' }}>
              {buses.map(b => {
                const isSel = selected === b.bus_id
                return (
                  <button key={b.bus_id} onClick={() => focusBus(b)}
                    className="w-full text-left rounded-xl transition-colors"
                    style={{ padding:'12px 14px', border:'none', cursor:'pointer',
                      background: isSel ? 'var(--c-brand-lt)' : 'transparent' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{b.bus_number}</span>
                      {b.is_online
                        ? (b.speed > 0
                            ? <span className="badge badge-green">● Moving</span>
                            : <span className="badge badge-amber">● Stopped</span>)
                        : <span className="badge badge-gray">Offline</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{b.route_name || b.plate_number || 'No route'}</p>

                    {b.is_online ? (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>🚀 {b.speed ?? 0} km/h</span>
                        {b.ignition != null && (
                          <span style={{ color: b.ignition ? 'var(--c-green)' : 'var(--c-muted)' }}>
                            {b.ignition ? '🔑 Engine ON' : 'Engine off'}
                          </span>
                        )}
                        {b.signal && (
                          <span style={{ color: signalColor(b.signal) }} title={`${b.satellites} satellites`}>
                            📶 {signalBars(b.signal)}
                          </span>
                        )}
                        {b.battery != null && <span>🔋 {b.battery}%</span>}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 mt-2">Last seen {timeAgo(b.updated_at)}</p>
                    )}

                    {b.source === 'device' && (
                      <p className="text-xs mt-1" style={{ color:'var(--c-muted)' }}>
                        📡 GPS device{b.gps_device_id ? ` · ${b.gps_device_id}` : ''}
                      </p>
                    )}
                    {b.source === 'phone' && b.is_online && (
                      <p className="text-xs mt-1" style={{ color:'var(--c-muted)' }}>📱 Driver phone</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Map + detail */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div ref={mapRef} style={{ height:'56vh', width:'100%', background:'#e8eef0' }} />
            </div>

            {sel && (
              <div className="card">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-ink">{sel.bus_number}
                      <span className="text-xs text-gray-400 font-normal"> · {sel.plate_number || 'no plate'}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sel.driver_name ? `Driver: ${sel.driver_name} · ` : ''}
                      {sel.route_name || 'No route'}
                    </p>
                    {sel.address && <p className="text-xs text-gray-400 mt-0.5">📍 {sel.address}</p>}
                  </div>
                  <div className="flex items-center gap-5 flex-wrap">
                    {[
                      ['Status', sel.is_online ? (sel.speed > 0 ? 'Moving' : 'Stopped') : 'Offline'],
                      ['Speed', sel.is_online ? `${sel.speed ?? 0} km/h` : '—'],
                      ['Engine', sel.ignition == null ? '—' : sel.ignition ? 'ON' : 'Off'],
                      ['Signal', sel.signal ? `${signalBars(sel.signal)} (${sel.satellites} sats)` : '—'],
                      ['Updated', timeAgo(sel.updated_at)],
                    ].map(([k, v]) => (
                      <div key={k} style={{ textAlign:'center' }}>
                        <p className="text-xs text-gray-400">{k}</p>
                        <p className="text-sm font-semibold text-ink mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop:16, background:'var(--c-surface-2)' }}>
          <p className="text-xs text-gray-500" style={{ lineHeight:1.7 }}>
            <b>ℹ️ Tracking source:</b> buses show live location from either a GPS tracker device
            (📡, showing engine/signal/battery) or the driver's phone (📱). To use hardware trackers,
            fit a GT06/Concox-type device per bus, run a Traccar server, set each bus's GPS device ID,
            and enable the Traccar sync — the map updates automatically with no other changes.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .track-split { grid-template-columns: 1fr !important; }
          .track-split > .col-span-2 { grid-column: span 1 !important; }
        }
        .leaflet-container { font-family: 'Inter', sans-serif; }
      `}</style>
    </Layout>
  )
}