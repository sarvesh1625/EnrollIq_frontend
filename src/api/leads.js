import api from './axios'

export const getLeads = (params) => api.get('/leads', { params })
export const getLead = (id) => api.get(`/leads/${id}`)
export const createLead = (data) => api.post('/leads', data)
export const updateLead = (id, data) => api.put(`/leads/${id}`, data)
export const updateLeadStatus = (id, status) => api.patch(`/leads/${id}/status`, { status })
export const deleteLead = (id) => api.delete(`/leads/${id}`)
export const getLeadStats = () => api.get('/leads/stats')