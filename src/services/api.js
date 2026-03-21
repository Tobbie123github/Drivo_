import axios from 'axios'
const BASE = import.meta.env.VITE_API_URL || 'https://drivo-y49d.onrender.com'
const api = axios.create({ baseURL: BASE })
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('drivo_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.clear(); window.location.href = '/' }
  return Promise.reject(err)
})
export const authAPI = {
  registerUser: d => api.post('/auth/user/register', d),
  verifyUser: d => api.post('/auth/user/verify', d),
  loginUser: d => api.post('/auth/user/login', d),
  registerDriver: d => api.post('/auth/driver/register', d),
  verifyDriver: d => api.post('/auth/driver/verify', d),
  loginDriver: d => api.post('/auth/driver/login', d),
}
export const rideAPI = {
  request: d => api.post('/ride/request', d),
  cancel: d => api.post('/ride/cancel', d),
  driverCancel: d => api.post('/ride/driver/cancel', d),
  riderHistory: () => api.get('/ride/history'),
  driverHistory: () => api.get('/ride/driver/history'),
}
export const driverAPI = {
  getProfile: () => api.get('/driver/profile'),
  updateProfile: d => api.put('/driver/profile', d),
  updateLicense: d => api.put('/driver/license', d),
  addVehicle: d => api.post('/driver/vehicle', d),
  uploadDocuments: d => api.post('/driver/documents', d),
  completeOnboarding: d => api.post('/driver/onboarding/complete', d),
}
export const ratingAPI = {
  rateDriver: d => api.post('/rating/driver', d),
  rateRider: d => api.post('/rating/rider', d),
}
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getDrivers: s => api.get(`/admin/drivers${s ? `?status=${s}` : ''}`),
  getRiders: () => api.get('/admin/riders'),
  getRides: s => api.get(`/admin/rides${s ? `?status=${s}` : ''}`),
  approveDriver: id => api.put(`/admin/drivers/${id}/approve`),
  rejectDriver: id => api.put(`/admin/drivers/${id}/reject`),
  suspendDriver: id => api.put(`/admin/drivers/${id}/suspend`),
  banDriver: id => api.put(`/admin/drivers/${id}/ban`),
  verifyIdentity: id => api.put(`/admin/drivers/${id}/verify-identity`),
  verifyVehicle: id => api.put(`/admin/drivers/${id}/verify-vehicle`),
  verifyLicense: id => api.put(`/admin/drivers/${id}/verify-license`),
}
export default api
