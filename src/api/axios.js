// import axios from 'axios'

// const api = axios.create({
//   baseURL: 'import.meta.env.VITE_API_URL ||http://localhost:5000/api',   
//   headers: { 'Content-Type': 'application/json' },
// })

// // Attach JWT token to every request
// api.interceptors.request.use(config => {
//   const token = localStorage.getItem('token')
//   if (token && token !== 'dev-token-123') {
//     config.headers.Authorization = `Bearer ${token}`
//   }
//   return config
// })

// // Handle 401 — redirect to login
// api.interceptors.response.use(
//   res => res,
//   err => {
//     if (err.response?.status === 401) {
//       localStorage.removeItem('token')
//       localStorage.removeItem('user')
//       window.location.href = '/login'
//     }
//     return Promise.reject(err)
//   }
// )

// export default api

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  // If a call already set its own Authorization header (e.g. super admin
  // requests passing sa_token), DON'T overwrite it with the admin token.
  if (config.headers && config.headers.Authorization) return config
  const token = localStorage.getItem('token')
  if (token && token !== 'dev-token-123') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    const isLoginRequest = url.includes('/auth/login') || url.includes('/superadmin/login')
    // A 401 on a login request is normal (wrong creds / try next auth) — let the
    // Login page handle it. Only force-redirect for 401s on OTHER requests
    // (an expired session while using the app).
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api