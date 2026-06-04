import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const req = error.config
    if (error.response?.status === 401 && !req._reintentado) {
      req._reintentado = true
      const rt = sessionStorage.getItem('refreshToken')
      if (!rt) { sessionStorage.clear(); window.location.replace('/login'); return Promise.reject(error) }
      try {
        const { data } = await axios.post(`${BASE}/api/auth/refresh`, { refreshToken: rt })
        sessionStorage.setItem('token', data.token)
        req.headers.Authorization = `Bearer ${data.token}`
        return api(req)
      } catch {
        sessionStorage.clear()
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)
