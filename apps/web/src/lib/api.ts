import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // Enables sending and receiving cookies
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle 401 & automatic refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Ignore refresh endpoint errors to prevent infinite loops
    if (originalRequest.url === '/auth/refresh') {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Attempt to refresh the token using the httpOnly cookie
        const res = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        
        const newAccessToken = res.data.accessToken
        useAuthStore.getState().setToken(newAccessToken)
        
        // Re-run the failed original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axios(originalRequest)
      } catch (err) {
        // Refresh failed (e.g. cookie expired), clear state
        useAuthStore.getState().logout()
        return Promise.reject(err)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
