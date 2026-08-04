import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function StudentQRCard({ student, onClose }) {
  const [fullData, setFullData] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    loadFullDetails()
  }, [student])

  const loadFullDetails = async () => {
    try {
      // Try to get full enrolled data
      const res = await api.get('/transport/enrolled')
      const found = res.data.find(s =>
        s.student_id === student.student_id ||
        s.id === student.id ||
        s.qr_code === student.qr_code
      )
      if (found) {
        // Also get student details
        try {
          const sRes = await api.get(`/students/${found.student_id}`)
          setFullData({ ...found, ...sRes.data })
        } catch {
          setFullData(found)
        }
      } else {
        setFullData(student)
      }
    } catch {
      setFullData(student)
    } finally {
      setLoading(false)
    }
  }

  if (!student) return null

  const d = fullData || student
  const name        = d.student_name || d.name || '—'
  const cls         = d.class || '—'
  const roll        = d.roll_number || '—'
  const parentName  = d.parent_name || '—'
  const parentPhone = d.parent_phone || '—'
  const busNumber   = d.bus_number || '—'
  const routeName   = d.route_name || '—'
  const stopName    = d.stop_name || d.pickup_stop || '—'
  const pickupTime  = d.pickup_time ? d.pickup_time.slice(0,5) : '—'
  const qrCode      = d.qr_code || student.qr_code || ''
const address = d.area || d.address || d.home_address || '—'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}&bgcolor=ffffff&color=1a1814&margin=10`

  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transport ID — ${name}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; font-family: -apple-system, sans-serif; }
            body { background:#f8f6f1; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
            .card { background:white; border-radius:16px; padding:24px; width:320px; border:1px solid #f0ede8; }
            .header { text-align:center; padding-bottom:16px; border-bottom:2px dashed #f0ede8; margin-bottom:16px; }
            .logo { font-size:22px; font-weight:800; color:#1a1814; }
            .logo span { color:#d4521a; }
            .tag { display:inline-block; background:#fdf0ea; color:#d4521a; font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; margin-top:4px; letter-spacing:0.05em; text-transform:uppercase; }
            .student-row { display:flex; gap:14px; align-items:center; margin-bottom:16px; }
            .avatar { width:52px; height:52px; border-radius:50%; background:#fdf0ea; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#d4521a; flex-shrink:0; border:2px solid #fde8d8; }
            .sname { font-size:18px; font-weight:800; color:#1a1814; }
            .smeta { font-size:12px; color:#9ca3af; margin-top:3px; }
            .section { margin-bottom:14px; }
            .section-title { font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
            .grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
            .item label { font-size:10px; color:#9ca3af; display:block; margin-bottom:2px; }
            .item span { font-size:12px; font-weight:600; color:#1a1814; }
            .qr-section { text-align:center; padding:16px 0; border-top:2px dashed #f0ede8; border-bottom:2px dashed #f0ede8; margin:14px 0; }
            .qr-section img { border:4px solid #f8f6f1; border-radius:8px; }
            .qr-code { font-family:monospace; font-size:10px; color:#9ca3af; margin-top:6px; word-break:break-all; }
            .qr-hint { font-size:10px; color:#d4521a; font-weight:600; margin-top:4px; }
            .footer { text-align:center; font-size:10px; color:#9ca3af; line-height:1.6; }
            .validity { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:6px 10px; text-align:center; margin-bottom:12px; }
            .validity span { font-size:11px; color:#16a34a; font-weight:600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo">Enroll<span>IQ</span></div>
              <div class="tag">Student Transport Card</div>
            </div>

            <div class="student-row">
              <div class="avatar">${name[0]}</div>
              <div>
                <div class="sname">${name}</div>
                <div class="smeta">Class ${cls} &nbsp;·&nbsp; Roll No. ${roll}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Transport Details</div>
              <div class="grid">
                <div class="item"><label>Bus Number</label><span>${busNumber}</span></div>
                <div class="item"><label>Route</label><span>${routeName}</span></div>
                <div class="item"><label>Pickup Stop</label><span>${stopName}</span></div>
                <div class="item"><label>Pickup Time</label><span>${pickupTime}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Parent / Guardian</div>
              <div class="grid">
                <div class="item"><label>Name</label><span>${parentName}</span></div>
                <div class="item"><label>Phone</label><span>${parentPhone}</span></div>
              </div>
              ${address !== '—' ? `<div class="item" style="margin-top:6px"><label>Home Address</label><span>${address}</span></div>` : ''}
            </div>

            <div class="qr-section">
              <img src="${qrUrl}" width="160" height="160" />
              <div class="qr-code">${qrCode}</div>
              <div class="qr-hint">Scan this QR daily when boarding the bus</div>
            </div>

            <div class="validity">
              <span>✅ Valid for bus boarding &amp; attendance</span>
            </div>

            <div class="footer">
              If found, please return to school transport office<br>
              Powered by EnrollIQ School Management
            </div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:460, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0ede8', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'white', zIndex:1 }}>
          <div>
            <p style={{ fontWeight:700, color:'#1a1814', fontSize:15, margin:0 }}>Transport ID Card</p>
            <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>Print and give to student</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint}
              style={{ background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              🖨️ Print Card
            </button>
            <button onClick={onClose}
              style={{ background:'#f3f4f6', border:'none', borderRadius:10, padding:'8px 12px', fontSize:18, cursor:'pointer', color:'#6b7280', lineHeight:1 }}>
              ×
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>Loading student details...</div>
        ) : (
          <div style={{ padding:20 }}>

            {/* Student info */}
            <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:20 }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'#fdf0ea', border:'2px solid #fde8d8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#d4521a', flexShrink:0 }}>
                {name[0]}
              </div>
              <div>
                <p style={{ fontSize:20, fontWeight:800, color:'#1a1814', margin:0 }}>{name}</p>
                <p style={{ fontSize:13, color:'#9ca3af', margin:'3px 0 0' }}>Class {cls} &nbsp;·&nbsp; Roll No. {roll}</p>
              </div>
            </div>

            {/* Transport details */}
            <div style={{ background:'#f8f6f1', borderRadius:12, padding:16, marginBottom:16 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Transport Details</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { label:'Bus Number',  value: busNumber  },
                  { label:'Route',       value: routeName  },
                  { label:'Pickup Stop', value: stopName   },
                  { label:'Pickup Time', value: pickupTime },
                ].map(r => (
                  <div key={r.label}>
                    <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 2px' }}>{r.label}</p>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1a1814', margin:0 }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Parent details */}
            <div style={{ background:'#f8f6f1', borderRadius:12, padding:16, marginBottom:16 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Parent / Guardian</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { label:'Name',  value: parentName  },
                  { label:'Phone', value: parentPhone },
                ].map(r => (
                  <div key={r.label}>
                    <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 2px' }}>{r.label}</p>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1a1814', margin:0 }}>{r.value}</p>
                  </div>
                ))}
              </div>
              {address !== '—' && (
                <div style={{ marginTop:10 }}>
                  <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 2px' }}>Home Address</p>
                  <p style={{ fontSize:13, fontWeight:700, color:'#1a1814', margin:0 }}>{address}</p>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div style={{ textAlign:'center', background:'#f8f6f1', borderRadius:12, padding:20, marginBottom:16 }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>QR Code for Bus Boarding</p>
              <img src={qrUrl} alt="QR Code" style={{ width:160, height:160, borderRadius:10, border:'3px solid #f0ede8' }} />
              <p style={{ fontFamily:'monospace', fontSize:11, color:'#9ca3af', marginTop:8, wordBreak:'break-all' }}>{qrCode}</p>
              <div style={{ background:'#fdf0ea', border:'1px solid #fde8d8', borderRadius:8, padding:'6px 12px', marginTop:10, display:'inline-block' }}>
                <p style={{ fontSize:12, color:'#d4521a', fontWeight:700, margin:0 }}>✅ Scan daily when boarding the bus</p>
              </div>
            </div>

            {/* Copy QR */}
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1, background:'#f8f6f1', borderRadius:10, padding:'10px 14px', fontFamily:'monospace', fontSize:12, color:'#6b7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {qrCode}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(qrCode); alert('QR code copied!') }}
                style={{ background:'#1a1814', color:'white', border:'none', borderRadius:10, padding:'10px 16px', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                Copy
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}