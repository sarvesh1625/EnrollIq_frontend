import api from './axios'

export const getCommStats       = ()        => api.get('/communication/stats')
export const getMessages        = (params)  => api.get('/communication/messages', { params })
export const sendMessage        = (data)    => api.post('/communication/messages', data)
export const getAnnouncements   = (params)  => api.get('/communication/announcements', { params })
export const sendAnnouncement   = (data)    => api.post('/communication/announcements', data)
export const getNotifications   = ()        => api.get('/communication/notifications')
export const markAllRead        = ()        => api.patch('/communication/notifications/read-all')