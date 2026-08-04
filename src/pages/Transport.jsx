import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import StudentQRCard from '../components/StudentQRCard'

const tApi = {
  getBuses:    ()  => api.get('/transport/buses'),
  getDrivers:  ()  => api.get('/transport/drivers'),
  getRoutes:   ()  => api.get('/transport/routes'),
  getAttendance:(d)=> api.get('/transport/attendance', { params: d }),
  getNotifs:   ()  => api.get('/transport/notifications'),
  createBus:   (d) => api.post('/transport/buses', d),
  updateBus:   (id,d) => api.put(`/transport/buses/${id}`, d),
  createDriver:(d) => api.post('/transport/drivers', d),
  updateDriver:(id,d) => api.put(`/transport/drivers/${id}`, d),
  createRoute: (d) => api.post('/transport/routes', d),
  updateRoute: (id,d) => api.put(`/transport/routes/${id}`, d),
  scan:        (d) => api.post('/transport/scan', d),
  enroll:      (d) => api.post('/transport/enroll-student', d),
  getStudents: ()  => api.get('/students', { params: { limit: 500 } }),
}

const STATUS_STYLE = {
  'Active':  'bg-green-50 text-green-700',
  'On Duty': 'bg-blue-50 text-blue-600',
  'Off Duty':'bg-gray-100 text-gray-500',
  'Boarded': 'bg-green-50 text-green-700',
  'Dropped': 'bg-blue-50 text-blue-600',
  'Absent':  'bg-red-50 text-red-500',
}

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 60)   return `${Math.floor(d)}s ago`
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  return `${Math.floor(d/3600)}h ago`
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function AddBusModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial || { bus_number:'', plate_number:'', capacity:40, gps_device_id:'' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (isEdit) { await tApi.updateBus(initial.id, form); onSaved('Bus updated successfully!') }
      else        { await tApi.createBus(form); onSaved('Bus added successfully!') }
    }
    catch (err) { setError(err.response?.data?.message || 'Failed to save bus') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? "🚌 Edit Bus" : "🚌 Add New Bus"} onClose={onClose}>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Bus number *</label>
          <input className="input" value={form.bus_number} onChange={set('bus_number')} placeholder="e.g. BUS-01" required />
        </div>
        <div>
          <label className="label">Plate number</label>
          <input className="input" value={form.plate_number} onChange={set('plate_number')} placeholder="e.g. TS09AB1234" />
        </div>
        <div>
          <label className="label">Capacity (seats)</label>
          <input className="input" type="number" value={form.capacity} onChange={set('capacity')} min={1} max={100} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update Bus' : 'Add Bus'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function AddDriverModal({ initial, buses, onClose, onSaved }) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial ? { name:initial.name||'', phone:initial.phone||'', license_no:initial.license_no||'', bus_id:initial.bus_id||'' } : { name:'', phone:'', license_no:'', bus_id:'' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await tApi.createDriver({ ...form, bus_id: form.bus_id ? parseInt(form.bus_id) : null })
      onSaved('Driver added successfully!')
    }
    catch (err) { setError(err.response?.data?.message || 'Failed to save driver') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? "👤 Edit Driver" : "👤 Add New Driver"} onClose={onClose}>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Driver name *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Full name" required />
        </div>
        <div>
          <label className="label">Phone number</label>
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" maxLength={10} />
        </div>
        <div>
          <label className="label">License number</label>
          <input className="input" value={form.license_no} onChange={set('license_no')} placeholder="e.g. TS0120190001" />
        </div>
        <div>
          <label className="label">Assign to bus</label>
          <select className="input" value={form.bus_id} onChange={set('bus_id')}>
            <option value="">No bus assigned</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number} — {b.plate_number}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update Driver' : 'Add Driver'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function AddRouteModal({ initial, buses, drivers, onClose, onSaved }) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial ? { route_name:initial.route_name||'', bus_id:initial.bus_id||'', driver_id:initial.driver_id||'', start_time:(initial.start_time||'07:30').slice(0,5), end_time:(initial.end_time||'08:30').slice(0,5), route_type:initial.route_type||'Both' } : { route_name:'', bus_id:'', driver_id:'', start_time:'07:30', end_time:'08:30', route_type:'Both' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await tApi.createRoute({ ...form, bus_id: form.bus_id ? parseInt(form.bus_id) : null, driver_id: form.driver_id ? parseInt(form.driver_id) : null })
      onSaved('Route created successfully!')
    }
    catch (err) { setError(err.response?.data?.message || 'Failed to save route') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? "🗺️ Edit Route" : "🗺️ Add New Route"} onClose={onClose}>
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Route name *</label>
          <input className="input" value={form.route_name} onChange={set('route_name')} placeholder="e.g. Madhapur Route" required />
        </div>
        <div>
          <label className="label">Bus</label>
          <select className="input" value={form.bus_id} onChange={set('bus_id')}>
            <option value="">Select bus</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Driver</label>
          <select className="input" value={form.driver_id} onChange={set('driver_id')}>
            <option value="">Select driver</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} — {d.phone}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 g-2">
          <div>
            <label className="label">Start time</label>
            <input className="input" type="time" value={form.start_time} onChange={set('start_time')} />
          </div>
          <div>
            <label className="label">End time</label>
            <input className="input" type="time" value={form.end_time} onChange={set('end_time')} />
          </div>
        </div>
        <div>
          <label className="label">Route type</label>
          <select className="input" value={form.route_type} onChange={set('route_type')}>
            <option value="Both">Both (Pickup + Drop)</option>
            <option value="Pickup">Pickup only</option>
            <option value="Drop">Drop only</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update Route' : 'Create Route'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function EnrollStudentModal({ buses, students, onClose, onSaved }) {
  const [form, setForm] = useState({ student_id:'', bus_id:'', rfid_tag:'' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [result, setResult] = useState(null)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError(''); setResult(null)
    try {
      const res = await tApi.enroll({
        student_id: parseInt(form.student_id),
        bus_id:     form.bus_id ? parseInt(form.bus_id) : null,
        rfid_tag:   form.rfid_tag || null,
      })
      setResult(res.data)
      setForm({ student_id:'', bus_id:'', rfid_tag:'' })
    }
    catch (err) { setError(err.response?.data?.message || 'Enrollment failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="📋 Enroll Student in Transport" onClose={onClose}>
      {error  && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {result && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-green-700">✅ {result.name} enrolled!</p>
          <p className="text-xs text-green-600 mt-1">QR Code: <span className="font-mono font-bold">{result.qr_code}</span></p>
          <p className="text-xs text-green-600">Bus: {result.bus_number} · Route: {result.route_name || 'Not assigned'}</p>
          <p className="text-xs text-gray-400 mt-2">Print this QR code and give to the student for bus scanning.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Student *</label>
          <select className="input" value={form.student_id} onChange={set('student_id')} required>
            <option value="">Select student</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.class} ({s.roll_number})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Assign to bus *</label>
          <select className="input" value={form.bus_id} onChange={set('bus_id')} required>
            <option value="">Select bus</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number} — {b.plate_number}</option>)}
          </select>
        </div>
        <div>
          <label className="label">RFID Tag (optional)</label>
          <input className="input" value={form.rfid_tag} onChange={set('rfid_tag')}
            placeholder="e.g. RF-1009 (leave blank to use QR only)" />
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
          📱 A unique QR code will be auto-generated. The student can use this to scan on the bus.
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {saving ? 'Enrolling...' : 'Enroll & Generate QR'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

function ScanModal({ buses, onClose, onScanned }) {
  const [form, setForm]   = useState({ qr_code:'', bus_id:'', trip_type:'Pickup' })
  const [scanning, setScanning] = useState(false)
  const [result,   setResult]   = useState(null)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleScan = async () => {
    if (!form.qr_code || !form.bus_id) return
    setScanning(true); setResult(null)
    try {
      const res = await tApi.scan({
        qr_code:   form.qr_code,
        bus_id:    parseInt(form.bus_id),
        trip_type: form.trip_type,
      })
      setResult({ success: true, data: res.data })
      setForm(p => ({ ...p, qr_code:'' }))
      if (onScanned) onScanned()
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Scan failed. Check QR code.' })
    } finally { setScanning(false) }
  }

  return (
    <Modal title="📱 Scan Student QR / RFID" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="label">QR Code / RFID Tag *</label>
          <input className="input" value={form.qr_code} onChange={set('qr_code')}
            placeholder="Scan or paste QR code..."
            onKeyDown={e => e.key === 'Enter' && handleScan()} autoFocus />
        </div>
        <div>
          <label className="label">Bus *</label>
          <select className="input" value={form.bus_id} onChange={set('bus_id')}>
            <option value="">Select bus</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number} — {b.plate_number}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Trip type</label>
          <div className="flex gap-2">
            {['Pickup','Drop'].map(t => (
              <button key={t} type="button" onClick={() => setForm(p => ({ ...p, trip_type: t }))}
                className={'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ' +
                  (form.trip_type === t ? 'bg-ink text-white border-ink' : 'border-gray-200 text-gray-500 hover:bg-cream')}>
                {t === 'Pickup' ? '⬆ Pickup' : '⬇ Drop'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleScan} disabled={scanning || !form.qr_code || !form.bus_id}
          className="btn-primary w-full justify-center disabled:opacity-50">
          {scanning ? '⏳ Scanning...' : '✓ Mark Attendance'}
        </button>
        {result && (
          <div className={'rounded-xl p-4 ' + (result.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100')}>
            {result.success ? (
              <>
                <p className="text-sm font-bold text-green-700 mb-1">✅ Attendance Marked!</p>
                <p className="text-sm text-green-700">
                  <strong>{result.data.student?.name}</strong> — {result.data.student?.class}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {result.data.trip_type} · {result.data.bus_number} · {result.data.time}
                </p>
                <p className="text-xs mt-1">
                  {result.data.notified
                    ? '📱 Parent notified via WhatsApp ✅'
                    : '⚠️ WhatsApp not configured — attendance saved'}
                </p>
              </>
            ) : (
              <p className="text-sm text-red-600">❌ {result.message}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function QuickEnrollBtn({ student, buses, onDone }) {
  const [open,   setOpen]   = useState(false)
  const [busId,  setBusId]  = useState('')
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)

  const handleEnroll = async () => {
    if (!busId) return
    setSaving(true)
    try {
      const res = await tApi.enroll({ student_id: student.id, bus_id: parseInt(busId) })
      setDone(true); setOpen(false)
      onDone(`✅ ${student.name} enrolled! QR: ${res.data.qr_code}`)
    } catch (err) {
      onDone(`❌ ${err.response?.data?.message || 'Enrollment failed'}`)
    } finally { setSaving(false) }
  }

  if (done) return <span className="text-xs text-green-600 font-medium">✅ Enrolled</span>
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-brand-600 hover:underline font-medium">
        Assign to bus →
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-ink mb-1">Enroll {student.name}</h3>
            <p className="text-xs text-gray-400 mb-4">{student.class} · {student.roll_number}</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="label">Assign to bus *</label>
                <select className="input" value={busId} onChange={e => setBusId(e.target.value)}>
                  <option value="">Select bus</option>
                  {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number} — {b.plate_number}</option>)}
                </select>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                📱 QR code auto-generated for {student.name}. Print and give to student.
              </div>
              <div className="flex gap-3">
                <button onClick={handleEnroll} disabled={saving || !busId}
                  className="btn-primary flex-1 justify-center disabled:opacity-60">
                  {saving ? 'Enrolling...' : 'Enroll & Generate QR'}
                </button>
                <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Transport() {
  const [tab,        setTab]       = useState('dashboard')
  const [buses,      setBuses]     = useState([])
  const [drivers,    setDrivers]   = useState([])
  const [routes,     setRoutes]    = useState([])
  const [attendance, setAttendance]= useState([])
  const [notifs,     setNotifs]    = useState([])
  const [students,   setStudents]  = useState([])
  const [loading,    setLoading]   = useState(true)
  const [toast,      setToast]     = useState('')

  const [showAddBus,    setShowAddBus]    = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [showAddRoute,  setShowAddRoute]  = useState(false)
  const [showEnroll,    setShowEnroll]    = useState(false)
  const [showScan,      setShowScan]      = useState(false)
  const [editBus,       setEditBus]       = useState(null)
  const [editDriver,    setEditDriver]    = useState(null)
  const [editRoute,     setEditRoute]     = useState(null)

  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [qrStudent, setQrStudent] = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [busRes, driverRes, routeRes, studRes] = await Promise.allSettled([
        tApi.getBuses(), tApi.getDrivers(), tApi.getRoutes(), tApi.getStudents(),
      ])
      if (busRes.status    === 'fulfilled') setBuses(busRes.value.data || [])
      if (driverRes.status === 'fulfilled') setDrivers(driverRes.value.data || [])
      if (routeRes.status  === 'fulfilled') setRoutes(routeRes.value.data || [])
      if (studRes.status   === 'fulfilled') setStudents(studRes.value.data.students || [])
    } catch {}
    finally { setLoading(false) }
  }
  const loadEnrolled = async () => {
  try {
    const res = await api.get('/transport/enrolled')
    setEnrolledStudents(res.data || [])
  } catch {}
}
loadEnrolled()

  const loadAttendance = async () => {
    try {
      const res = await tApi.getAttendance({ date: new Date().toISOString().slice(0,10) })
      setAttendance(res.data.records || [])
    } catch {}
  }

  const loadNotifs = async () => {
    try {
      const res = await tApi.getNotifs()
      setNotifs(res.data || [])
    } catch {}
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (tab === 'attendance')    loadAttendance() }, [tab])
  useEffect(() => { if (tab === 'notifications') loadNotifs()     }, [tab])

  const handleSaved = msg => {
    showToast(msg)
    setShowAddBus(false); setShowAddDriver(false)
    setShowAddRoute(false); setShowEnroll(false)
    loadAll()
  }

  const TABS = [
    { key:'dashboard',     label:'Dashboard'       },
    { key:'buses',         label:`Buses (${buses.length})`     },
    { key:'drivers',       label:`Drivers (${drivers.length})` },
    { key:'routes',        label:'Routes'          },
    { key:'enroll',        label:'Enroll Students' },
    { key:'attendance',    label:'Attendance'      },
    { key:'notifications', label:'Notifications'   },
  ]

  return (
    <Layout>
      <div className="page">
        {toast && (
          <div className="toast">{toast}</div>
        )}

        {/* Header */}
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">🚌 Transport</h1>
            <p className="text-gray-400 text-sm mt-1">Bus management · Attendance · Parent notifications</p>
          </div>
          <div className="actions">
            <button onClick={() => setShowAddDriver(true)} className="btn-ghost text-sm">+ Driver</button>
            <button onClick={() => setShowAddBus(true)}    className="btn-ghost text-sm">+ Bus</button>
            <button onClick={() => setShowAddRoute(true)}  className="btn-ghost text-sm">+ Route</button>
            <button onClick={() => setShowEnroll(true)}    className="btn-ghost text-sm">+ Enroll Student</button>
            <button onClick={() => setShowScan(true)}      className="btn-primary">📱 Scan Student</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6 g-3">
          {[
            { label:'Buses',            value: buses.length,            color:'text-ink'       },
            { label:'Drivers',          value: drivers.length,          color:'text-ink'       },
            { label:'Students enrolled',value: students.length,         color:'text-brand-600' },
            { label:'Today scans',      value: attendance.length,       color:'text-green-600' },
            { label:'Pickups',          value: attendance.filter(a=>a.trip_type==='Pickup').length, color:'text-blue-600' },
            { label:'Drops',            value: attendance.filter(a=>a.trip_type==='Drop').length,   color:'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center">
              <p className="label text-center text-xs">{s.label}</p>
              <p className={`font-serif text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-strip mb-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={'text-xs px-3 py-2 rounded-md transition-colors font-medium whitespace-nowrap ' +
                (tab === t.key ? 'bg-ink text-white' : 'text-gray-500 hover:bg-cream')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="flex flex-col gap-5">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-ink text-sm">Live attendance feed — Today</h2>
                <button onClick={loadAttendance} className="text-xs text-brand-600 hover:underline">↻ Refresh</button>
              </div>
              {attendance.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-3">🚌</p>
                  <p className="text-gray-400 text-sm">No scans today yet</p>
                  <button onClick={() => setShowScan(true)} className="btn-primary mt-4">Scan first student</button>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {attendance.slice(0,15).map((a, i) => (
                    <div key={i} className="flex items-center gap-4 py-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        a.trip_type==='Pickup' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {a.trip_type==='Pickup' ? '↑' : '↓'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{a.student_name}</p>
                        <p className="text-xs text-gray-400">{a.class} · {a.bus_number}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          a.trip_type==='Pickup' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {a.trip_type}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(a.scanned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                        </p>
                      </div>
                      <span className="text-xs">{a.notified ? '📱✅' : '📱⏳'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BUSES ── */}
        {tab === 'buses' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-400">{buses.length} buses registered</p>
              <button onClick={() => setShowAddBus(true)} className="btn-primary text-sm">+ Add bus</button>
            </div>
            {buses.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-4xl mb-3">🚌</p>
                <p className="text-gray-400 text-sm mb-4">No buses added yet</p>
                <button onClick={() => setShowAddBus(true)} className="btn-primary">Add first bus</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 g-2">
                {buses.map(bus => (
                  <div key={bus.id} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl">🚌</div>
                      <div>
                        <p className="font-bold text-ink">{bus.bus_number}</p>
                        <p className="text-xs text-gray-400">{bus.plate_number || 'No plate'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Driver</span><span className="font-medium text-ink">{bus.driver_name || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Capacity</span><span className="font-medium text-ink">{bus.capacity} seats</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + (STATUS_STYLE[bus.status] || 'bg-gray-100 text-gray-500')}>
                        {bus.status}
                      </span>
                    <button onClick={() => setEditBus(bus)} className="text-xs text-brand-600 hover:underline font-medium">Edit</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DRIVERS ── */}
        {tab === 'drivers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-400">{drivers.length} drivers registered</p>
              <button onClick={() => setShowAddDriver(true)} className="btn-primary text-sm">+ Add driver</button>
            </div>
            {drivers.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-4xl mb-3">👤</p>
                <p className="text-gray-400 text-sm mb-4">No drivers added yet</p>
                <button onClick={() => setShowAddDriver(true)} className="btn-primary">Add first driver</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 g-2">
                {drivers.map(driver => (
                  <div key={driver.id} className="card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-lg font-bold text-gray-600">
                        {driver.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-ink text-sm">{driver.name}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Phone</span><a href={`tel:${driver.phone}`} className="font-medium text-brand-600">{driver.phone || '—'}</a>
                      </div>
                      <div className="flex justify-between">
                        <span>License</span><span className="font-medium text-ink">{driver.license_no || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bus</span><span className="font-medium text-ink">{driver.bus_number || 'Not assigned'}</span>
                      </div>
                    </div><div className="mt-3 pt-3 border-t border-gray-50 flex justify-end"><button onClick={() => setEditDriver(driver)} className="text-xs text-brand-600 hover:underline font-medium">Edit</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ROUTES ── */}
        {tab === 'routes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-400">{routes.length} routes</p>
              <button onClick={() => setShowAddRoute(true)} className="btn-primary text-sm">+ Add Route</button>
            </div>
            {routes.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-gray-400 text-sm mb-2">No routes created yet</p>
                <button onClick={() => setShowAddRoute(true)} className="btn-primary mt-3">Create first route</button>
              </div>
            ) : (
              <div className="card" style={{padding:0,overflowX:"auto"}}>
                <table className="w-full text-sm" style={{ minWidth: 720 }}>
                  <thead className="border-b border-gray-100 bg-paper">
                    <tr>
                      {['Route','Bus','Driver','Start time','Students','Type','Status',''].map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {routes.map(r => (
                      <tr key={r.id} className="hover:bg-paper">
                        <td className="px-5 py-3 font-medium text-ink text-xs">{r.route_name}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{r.bus_number || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{r.driver_name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">{r.start_time?.slice(0,5) || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{r.student_count || 0}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">{r.route_type}</td>
                        <td className="px-5 py-3">
                          <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' + (STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500')}>
                            {r.status}
                          </span>
                        </td><td className="px-5 py-3 text-right"><button onClick={() => setEditRoute(r)} className="text-xs text-brand-600 hover:underline font-medium">Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ENROLL STUDENTS ── */}
        {tab === 'enroll' && (
          <div className="flex flex-col gap-5">
            <div className="card bg-brand-50 border-brand-100">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-semibold text-ink text-sm mb-1">Enroll students in transport</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Assign students to buses. A QR code is auto-generated — print it and give to the student.
                    They scan it on the bus to mark attendance daily.
                  </p>
                </div>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-gray-400 text-sm">No students found. Add students first from the Students module.</p>
              </div>
            ) : buses.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-gray-400 text-sm">No buses found. Add buses first.</p>
                <button onClick={() => setShowAddBus(true)} className="btn-primary mt-3">Add bus</button>
              </div>
            ) : (
              <div className="card" style={{padding:0,overflowX:"auto"}}>
                <div className="px-5 py-3 border-b border-gray-100 bg-paper flex items-center justify-between">
                  <h2 className="font-semibold text-ink text-sm">All students ({students.length})</h2>
                  <button onClick={() => setShowEnroll(true)} className="btn-primary text-xs">+ Enroll student</button>
                </div>
                <table className="w-full text-sm" style={{ minWidth: 720 }}>
                  <thead className="border-b border-gray-100">
                    <tr>
                      {['Student','Class','Roll no.','Parent','Phone','Action'].map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-paper">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-cream flex items-center justify-center text-xs font-bold text-gray-600">
                              {s.name?.[0]}
                            </div>
                            <span className="text-xs font-medium text-ink">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{s.class}</td>
                        <td className="px-5 py-3 text-xs font-mono text-gray-400">{s.roll_number}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{s.parent_name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">{s.parent_phone || '—'}</td>
                     <td className="px-5 py-3">
  {enrolledStudents.some(e => e.student_id === s.id)
    ? <button
        onClick={() => setQrStudent(enrolledStudents.find(e => e.student_id === s.id))}
        className="text-xs text-brand-600 hover:underline font-medium">
        📱 View QR →
      </button>
    : <QuickEnrollBtn
        student={s}
        buses={buses}
        onDone={msg => { showToast(msg); loadAll(); loadEnrolled() }}
      />
  }
</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {tab === 'attendance' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">{attendance.length} records today</p>
              <button onClick={loadAttendance} className="btn-ghost text-sm">↻ Refresh</button>
            </div>
            {attendance.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-400 text-sm">No attendance records today</p>
                <button onClick={() => setShowScan(true)} className="btn-primary mt-3">Scan a student</button>
              </div>
            ) : (
              <div className="card" style={{padding:0,overflowX:"auto"}}>
                <table className="w-full text-sm" style={{ minWidth: 720 }}>
                  <thead className="border-b border-gray-100 bg-paper">
                    <tr>
                      {['Student','Class','Bus','Type','Time','Driver','Notified'].map(h => (
                        <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendance.map((a, i) => (
                      <tr key={i} className="hover:bg-paper">
                        <td className="px-5 py-3 font-medium text-ink text-xs">{a.student_name}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{a.class}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{a.bus_number}</td>
                        <td className="px-5 py-3">
                          <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' +
                            (a.trip_type==='Pickup' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                            {a.trip_type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400">
                          {new Date(a.scanned_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{a.driver_name || '—'}</td>
                        <td className="px-5 py-3 text-xs">{a.notified ? '📱 ✅' : '⏳'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === 'notifications' && (
          <div className="flex flex-col gap-3">
            {notifs.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-400 text-sm">No notifications sent yet</p>
              </div>
            ) : notifs.map((n, i) => (
              <div key={i} className="card flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-lg flex-shrink-0">💬</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{n.student_name} ({n.class})</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">📞 {n.parent_phone}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={'text-xs font-medium px-2 py-0.5 rounded-full ' +
                    (n.status==='Sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500')}>
                    {n.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.sent_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {showAddBus    && <AddBusModal    onClose={() => setShowAddBus(false)}    onSaved={handleSaved} />}
      {editBus       && <AddBusModal    initial={editBus}    onClose={() => setEditBus(null)}    onSaved={m => { setEditBus(null); handleSaved(m) }} />}
      {showAddDriver && <AddDriverModal buses={buses} onClose={() => setShowAddDriver(false)} onSaved={handleSaved} />}
      {editDriver    && <AddDriverModal initial={editDriver} buses={buses} onClose={() => setEditDriver(null)} onSaved={m => { setEditDriver(null); handleSaved(m) }} />}
      {showAddRoute  && <AddRouteModal  buses={buses} drivers={drivers} onClose={() => setShowAddRoute(false)} onSaved={handleSaved} />}
      {editRoute     && <AddRouteModal  initial={editRoute} buses={buses} drivers={drivers} onClose={() => setEditRoute(null)} onSaved={m => { setEditRoute(null); handleSaved(m) }} />}
      {showEnroll    && <EnrollStudentModal buses={buses} students={students} onClose={() => setShowEnroll(false)} onSaved={m => { showToast(m); loadAll() }} />}
      {showScan      && <ScanModal buses={buses} onClose={() => setShowScan(false)} onScanned={loadAttendance} />}
      {qrStudent && <StudentQRCard student={qrStudent} onClose={() => setQrStudent(null)} />}
    </Layout>
  )
}