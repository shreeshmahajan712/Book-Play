import axios from 'axios'

/**
 * Axios API client
 * - Sends cookies on every request (withCredentials: true) for JWT auth
 * - Base URL auto-resolves via Vite proxy in dev (/api → localhost:5000)
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ─── Response interceptor — normalise error shape ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: object) => api.post('/auth/register', data),
  login:    (data: object) => api.post('/auth/login', data),
  logout:   ()             => api.post('/auth/logout'),
  me:       ()             => api.get('/auth/me'),
  updateProfile:    (data: object) => api.put('/auth/profile', data),
  changePassword:   (data: object) => api.patch('/auth/change-password', data),
}

// ─── Turfs ────────────────────────────────────────────────────────────────────
export const turfApi = {
  list:      (params?: object) => api.get('/turfs', { params }),
  nearby:    (params: object)  => api.get('/turfs/nearby', { params }),
  myTurfs:   ()                => api.get('/turfs/my'),
  bySlug:    (slug: string)    => api.get(`/turfs/${slug}`),
  slots:     (slug: string, date: string) => api.get(`/turfs/${slug}/slots`, { params: { date } }),
  create:    (data: object)    => api.post('/turfs', data),
  update:    (id: string, data: object) => api.put(`/turfs/${id}`, data),
  delete:    (id: string)      => api.delete(`/turfs/${id}`),
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingApi = {
  create:      (data: object)  => api.post('/bookings', data),
  myBookings:  (params?: object) => api.get('/bookings/my', { params }),
  turfBookings: (turfId: string, params?: object) => api.get(`/bookings/turf/${turfId}`, { params }),
  cancel:      (id: string, data?: object) => api.patch(`/bookings/${id}/cancel`, data),
  revenue:     () => api.get('/bookings/revenue'),
}

export default api
