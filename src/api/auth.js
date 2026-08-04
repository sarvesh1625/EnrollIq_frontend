import api from './axios'

export const login = (email, password) => api.post('/auth/login', { email, password })
export const getMe = () => api.get('/auth/me')
export const changePassword = (data) => api.put('/auth/password', data)