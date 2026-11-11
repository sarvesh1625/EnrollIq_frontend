import { useState, useRef } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { SchoolLogo, useSchoolBrand, refreshBrand } from '../components/SchoolBrand'

export default function SchoolBranding() {
  const { user } = useAuth()
  const brand = useSchoolBrand()
  const fileRef = useRef(null)
  const [file, setFile]   = useState(null)
  const [preview, setPrev] = useState('')
  const [busy, setBusy]   = useState(false)
  const [msg, setMsg]     = useState('')
  const [err, setErr]     = useState('')

  const pick = (e) => {
    const f = e.target.files?.[0]
    setErr(''); setMsg('')
    if (!f) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) { setErr('Use a PNG, JPG or WEBP image'); return }
    if (f.size > 2 * 1024 * 1024) { setErr('Image must be under 2 MB'); return }
    setFile(f); setPrev(URL.createObjectURL(f))
  }

  const save = async () => {
    if (!file) return
    setBusy(true); setErr(''); setMsg('')
    const fd = new FormData(); fd.append('logo', file)
    try {
      await api.post('/branding/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshBrand()
      setFile(null); setPrev(''); if (fileRef.current) fileRef.current.value = ''
      setMsg('Logo updated. It now shows on this school’s dashboards and apps.')
    } catch (e) { setErr(e.response?.data?.message || 'Upload failed') }
    finally { setBusy(false) }
  }

  const remove = async () => {
    if (!window.confirm('Remove the school logo?')) return
    setBusy(true); setErr(''); setMsg('')
    try { await api.delete('/branding/logo'); await refreshBrand(); setMsg('Logo removed') }
    catch (e) { setErr(e.response?.data?.message || 'Could not remove') }
    finally { setBusy(false) }
  }

  return (
    <Layout>
      <div className="page page-narrow">
        <div className="page-head">
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-ink">School logo</h1>
            <p style={{ color: 'var(--c-muted)', fontSize: 13, margin: '6px 0 0' }}>
              Shown in the sidebar, on dashboards, and in the parent, teacher and driver apps for {brand?.name || user?.school_name}.
            </p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            {preview
              ? <img src={preview} alt="New logo" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 16, border: '1px solid var(--c-border)', background: '#fff' }} />
              : <SchoolLogo size={120} radius={16} />}
            <p style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 8 }}>{preview ? 'New (not saved yet)' : 'Current'}</p>
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="label">Choose a logo</label>
            <input ref={fileRef} className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} />
            <p style={{ fontSize: 12, color: 'var(--c-muted)', margin: '8px 0 14px' }}>
              Square or near-square image, PNG / JPG / WEBP, under 2 MB. A transparent PNG looks best.
            </p>
            {err && <div style={{ background: 'var(--c-red-lt)', color: 'var(--c-red)', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>{err}</div>}
            {msg && <div style={{ background: 'var(--c-green-lt)', color: 'var(--c-green)', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>{msg}</div>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={save} disabled={!file || busy}>{busy ? 'Saving...' : 'Save logo'}</button>
              {brand?.logo_url && <button className="btn-ghost" onClick={remove} disabled={busy}>Remove logo</button>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}