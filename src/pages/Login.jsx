import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Link } from 'react-router-dom'

export default function Login() {
  const { login }   = useAuth()
  const navigate    = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true); setError('')
    try {
      // 1) Try normal admin/staff login first
      const res = await api.post('/auth/login', { email, password })
      login(res.data.user, res.data.token)
      const roleRedirect = {
        admin:             '/dashboard',
        staff:             '/staff-dashboard',
        teacher:           '/teacher-dashboard',
        accountant:        '/accountant-dashboard',
        receptionist:      '/receptionist-dashboard',
        transport_manager: '/transport-dashboard',
      }
      navigate(roleRedirect[res.data.user?.role] || '/dashboard', { replace: true })
    } catch (err) {
      // 2) Admin login failed — try super admin login before giving up
      try {
        const sa = await api.post('/superadmin/login', { email, password })
        // store super admin session the same way the SuperAdmin page expects
        localStorage.setItem('sa_token', sa.data.token)
        localStorage.setItem('sa_admin', JSON.stringify(sa.data.admin))
        // full page load so the SuperAdmin page mounts fresh with the token
        window.location.href = '/superadmin'
        return
      } catch (saErr) {
        // 3) Both failed — show a single clear error
        setError(err.response?.data?.message || 'Invalid email or password')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] bg-ink flex-col justify-between p-12 flex-shrink-0">
        <span className="font-serif text-2xl font-bold text-white">
         
          <Link to="/"> Enroll<span className="text-brand-400">IQ</span></Link>
        </span>
        <div>
          <blockquote className="font-serif text-3xl text-white leading-snug mb-8">
            "The smartest way to manage school admissions."
          </blockquote>
          <div className="flex flex-col gap-4">
            {['CRM + Lead Management','Fee & Transport','Parent Communication','AI Lead Scoring'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-gray-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-600 text-xs">© 2026 EnrollIQ. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <span className="font-serif text-2xl font-bold text-ink">
              Enroll<span className="text-brand-600">IQ</span>
            </span>
          </div>

          <h1 className="font-serif text-3xl font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-8">Sign in to your school dashboard</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@school.com"
                required autoComplete="email" autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center mt-1 disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              <a href="/superadmin" className="text-brand-600 hover:underline">Super Admin →</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}