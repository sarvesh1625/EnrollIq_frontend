import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser  = localStorage.getItem('user')
    if (!savedToken || !savedUser) { setLoading(false); return }

    try {
      const parsedUser = JSON.parse(savedUser)
      // Dev token — skip API verification
      if (savedToken === 'dev-token-123') {
        setUser(parsedUser); setToken(savedToken)
        setLoading(false); return
      }
      // Real token — verify with backend
      api.get('/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(res => { setUser(res.data); setToken(savedToken) })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user') })
        .finally(() => setLoading(false))
    } catch {
      localStorage.removeItem('token'); localStorage.removeItem('user')
      setLoading(false)
    }
  }, [])

  const login = (userData, authToken) => {
    setUser(userData); setToken(authToken)
    localStorage.setItem('token', authToken)
    localStorage.setItem('user',  JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null); setToken(null)
    localStorage.removeItem('token'); localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)