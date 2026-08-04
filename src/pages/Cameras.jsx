import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

/* ═══════════════════════════════════════════════════════════════
   EnrollIQ — School Cameras (Admin CCTV wall)
   Plays HLS (.m3u8), MP4, or iframe/embed streams.
   HLS via hls.js loaded from CDN at runtime (Safari plays HLS natively).
   Works with any camera that exposes an HLS/MP4/embed URL — paste the
   school's real URLs into the admin; test stream seeded for demos.
   ═══════════════════════════════════════════════════════════════ */

const MOCK_CAMERAS = [
  { id:1, name:'Main Gate',  location:'Entrance',  stream_url:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', stream_type:'hls' },
  { id:2, name:'Playground', location:'Outdoor',   stream_url:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', stream_type:'hls' },
  { id:3, name:'Reception',  location:'Lobby',     stream_url:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', stream_type:'hls' },
  { id:4, name:'Corridor A', location:'1st Floor', stream_url:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', stream_type:'hls' },
]

function loadHls() {
  return new Promise((resolve) => {
    if (window.Hls) return resolve(window.Hls)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js'
    s.onload = () => resolve(window.Hls)
    s.onerror = () => resolve(null)
    document.body.appendChild(s)
  })
}

/* ─── One camera tile ─────────────────────────────────────────── */
function CameraTile({ cam, expanded, onExpand }) {
  const videoRef = useRef(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (cam.stream_type === 'iframe') return
    const video = videoRef.current
    if (!video) return
    let hls

    if (cam.stream_type === 'mp4') {
      video.src = cam.stream_url
      video.play().catch(() => {})
      return
    }
    // HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cam.stream_url        // Safari native
      video.play().catch(() => {})
    } else {
      loadHls().then(Hls => {
        if (!Hls || !videoRef.current) { setErr(true); return }
        if (Hls.isSupported()) {
          hls = new Hls({ lowLatencyMode:true })
          hls.loadSource(cam.stream_url)
          hls.attachMedia(video)
          hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) setErr(true) })
          video.play().catch(() => {})
        } else setErr(true)
      })
    }
    return () => { if (hls) hls.destroy() }
  }, [cam.stream_url, cam.stream_type])

  const body = cam.stream_type === 'iframe' ? (
    <iframe src={cam.stream_url} title={cam.name} allowFullScreen
      style={{ width:'100%', height:'100%', border:'none', background:'#000' }} />
  ) : err ? (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', gap:8 }}>
      <span style={{ fontSize:28 }}>📷</span>
      <span style={{ fontSize:12 }}>Stream unavailable</span>
    </div>
  ) : (
    <video ref={videoRef} muted autoPlay playsInline
      style={{ width:'100%', height:'100%', objectFit:'cover', background:'#000' }} />
  )

  return (
    <div style={{ position:'relative', borderRadius:14, overflow:'hidden', background:'#000',
      aspectRatio: expanded ? 'auto' : '16/10', height: expanded ? '76vh' : 'auto',
      border:'1px solid var(--c-border)' }}>
      {body}
      {/* Overlay bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, padding:'10px 12px',
        background:'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff4444',
            boxShadow:'0 0 6px #ff4444', animation:'blink 1.4s infinite' }} />
          <span style={{ color:'#fff', fontSize:13, fontWeight:600 }}>{cam.name}</span>
          {cam.location && <span style={{ color:'rgba(255,255,255,0.6)', fontSize:11 }}>· {cam.location}</span>}
        </div>
        <button onClick={() => onExpand(expanded ? null : cam.id)}
          style={{ background:'rgba(0,0,0,0.4)', border:'none', color:'#fff', cursor:'pointer',
            borderRadius:6, padding:'3px 8px', fontSize:13 }}>
          {expanded ? '✕' : '⛶'}
        </button>
      </div>
      <span style={{ position:'absolute', bottom:8, left:12, color:'rgba(255,255,255,0.7)',
        fontSize:10, fontWeight:600, letterSpacing:'0.05em' }}>● LIVE</span>
    </div>
  )
}

/* ─── Add/Edit camera modal ───────────────────────────────────── */
function CameraModal({ initial, onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: initial?.name || '', location: initial?.location || '',
    stream_url: initial?.stream_url || '', stream_type: initial?.stream_type || 'hls',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.stream_url.trim()) return
    setSaving(true)
    try {
      if (initial) await api.put(`/tracking/cameras/${initial.id}`, form)
      else         await api.post('/tracking/cameras', form)
      showToast(initial ? 'Camera updated ✓' : 'Camera added ✓')
    } catch { showToast('Saved (demo)') }
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{initial ? 'Edit camera' : 'Add camera'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="label">Camera name *</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Main Gate" required autoFocus />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={form.location} onChange={set('location')} placeholder="Entrance" />
              </div>
            </div>
            <div>
              <label className="label">Stream URL *</label>
              <input className="input" value={form.stream_url} onChange={set('stream_url')}
                placeholder="https://…/stream.m3u8" required />
            </div>
            <div>
              <label className="label">Stream type</label>
              <select className="input" value={form.stream_type} onChange={set('stream_type')}>
                <option value="hls">HLS (.m3u8) — most IP cameras via media server</option>
                <option value="mp4">MP4 (direct video URL)</option>
                <option value="iframe">Embed / iframe (cloud app link)</option>
              </select>
            </div>
            <div style={{ background:'var(--c-surface-2)', borderRadius:10, padding:'10px 14px' }}>
              <p className="text-xs text-gray-500" style={{ lineHeight:1.6 }}>
                💡 IP cameras (Hikvision, Dahua, CP Plus…) expose RTSP, which browsers can't play directly.
                Run a media server (e.g. MediaMTX) to convert RTSP → HLS, then paste the .m3u8 URL here.
                For cloud-app cameras, choose Embed and paste the share link.
              </p>
            </div>
            <div style={{ display:'flex', gap:10, paddingTop:2 }}>
              <button type="submit" className="btn-primary" style={{ flex:1 }} disabled={saving}>
                {saving ? 'Saving…' : initial ? 'Update camera' : 'Add camera'}
              </button>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────── */
export default function Cameras() {
  const [cams, setCams]       = useState(MOCK_CAMERAS)
  const [expanded, setExpanded] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast]     = useState('')
  const [manage, setManage]   = useState(false)
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(() => {
    api.get('/tracking/cameras').then(r => { if (r.data?.length) setCams(r.data) }).catch(() => {})
  }, [])
  useEffect(load, [load])

  const removeCam = async (cam) => {
    if (!confirm(`Remove camera "${cam.name}"?`)) return
    try { await api.delete(`/tracking/cameras/${cam.id}`) } catch {}
    showToast('Camera removed'); load()
  }

  const expandedCam = cams.find(c => c.id === expanded)

  return (
    <Layout>
      <div className="page">
        {toast && <div className="toast">{toast}</div>}

        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">📹 School Cameras</h1>
            <p className="text-gray-400 text-sm mt-1">{cams.length} cameras · live CCTV view</p>
          </div>
          <div className="actions">
            <button className="btn-ghost text-sm" onClick={() => setManage(m => !m)}>
              {manage ? 'Done' : '⚙ Manage'}
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add camera</button>
          </div>
        </div>

        {/* Expanded single view */}
        {expandedCam && (
          <div style={{ marginBottom:20 }}>
            <CameraTile cam={expandedCam} expanded onExpand={setExpanded} />
          </div>
        )}

        {/* Grid */}
        {cams.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">📷</div>
            <p className="empty-title">No cameras yet</p>
            <p className="empty-sub">Add a camera stream to start monitoring</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
            {cams.map(cam => (
              <div key={cam.id}>
                {expanded !== cam.id && <CameraTile cam={cam} expanded={false} onExpand={setExpanded} />}
                {manage && (
                  <div style={{ display:'flex', gap:12, padding:'8px 4px' }}>
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(cam)}>Edit</button>
                    <button className="text-xs text-red-400 hover:underline" onClick={() => removeCam(cam)}>Remove</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ marginTop:20, background:'var(--c-surface-2)' }}>
          <p className="text-xs text-gray-500" style={{ lineHeight:1.7 }}>
            <b>ℹ️ About live camera view:</b> This wall plays any camera that exposes an HLS, MP4 or embed URL.
            Standard IP cameras stream RTSP — run a small media server (MediaMTX) on the school network to
            convert RTSP → HLS, then add each camera's URL here. The demo tiles use a public test stream.
          </p>
        </div>
      </div>

      {showAdd  && <CameraModal onClose={() => setShowAdd(false)} onSaved={load} showToast={showToast} />}
      {editing  && <CameraModal initial={editing} onClose={() => setEditing(null)} onSaved={load} showToast={showToast} />}

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </Layout>
  )
}