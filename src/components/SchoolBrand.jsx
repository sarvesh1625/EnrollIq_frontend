import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

// One shared copy of the school's name + logo for the whole app
let cache = null
const subs = new Set()

export function refreshBrand() {
  return api.get('/branding/mine')
    .then(r => { cache = r.data; subs.forEach(f => f(cache)) })
    .catch(() => {})
}

export function useSchoolBrand() {
  const { user } = useAuth()
  const [brand, setBrand] = useState(cache)
  useEffect(() => {
    subs.add(setBrand)
    if (!cache || cache.school_id !== user?.school_id) refreshBrand()
    else setBrand(cache)
    return () => subs.delete(setBrand)
  }, [user?.school_id])
  return brand && brand.school_id === user?.school_id ? brand : null
}

// The school's own logo; falls back to a coloured initial until one is uploaded
export function SchoolLogo({ size = 40, radius = 10 }) {
  const { user } = useAuth()
  const brand = useSchoolBrand()
  const [bad, setBad] = useState(false)
  const name = brand?.name || user?.school_name || 'S'
  useEffect(() => { setBad(false) }, [brand?.logo_url])
  if (brand?.logo_url && !bad) {
    return (
      <img src={brand.logo_url} alt={name} onError={() => setBad(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'contain', background: '#fff',
          border: '1px solid var(--c-border)', flexShrink: 0 }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
      fontSize: Math.round(size * 0.45), background: 'var(--iq-gradient)', fontFamily: 'Georgia, serif' }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}