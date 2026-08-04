import api from './axios'

export const getFeeStats        = ()          => api.get('/fees/stats')
export const getPayments        = (params)    => api.get('/fees/payments', { params })
export const createPayment      = (data)      => api.post('/fees/payments', data)
export const recordPayment      = (id, data)  => api.patch(`/fees/payments/${id}/pay`, data)
export const getFeeStructures   = ()          => api.get('/fees/structures')
export const createFeeStructure = (data)      => api.post('/fees/structures', data)