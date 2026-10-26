import api from './axios'

export const getLeads = (params) => api.get('/leads', { params })
export const getLead = (id) => api.get(`/leads/${id}`)
export const createLead = (data) => api.post('/leads', data)
export const updateLead = (id, data) => api.put(`/leads/${id}`, data)
export const updateLeadStatus = (id, status, note) => api.patch(`/leads/${id}/status`, { status, note })
export const deleteLead = (id) => api.delete(`/leads/${id}`)
export const getLeadStats = () => api.get('/leads/stats')

// Counsellor assignment (admin only)
export const getCounsellors      = () => api.get('/leads/counsellors')
export const setAutoAssign       = (auto_assign) => api.put('/leads/counsellors/settings', { auto_assign })
export const updateCounsellor    = (userId, data) => api.put(`/leads/counsellors/${userId}`, data)
export const assignLead          = (id, data) => api.put(`/leads/${id}/assign`, data)
export const assignAllUnassigned = () => api.post('/leads/assign-unassigned')
export const getAssignmentHistory = (id) => api.get(`/leads/${id}/assignments`)

export const getCounsellorLeads = (userId, scope='open') => api.get(`/leads/counsellors/${userId}/leads`, { params: { scope } })
export const assignBulk = (lead_ids, user_id) => api.put('/leads/assign-bulk', { lead_ids, user_id })