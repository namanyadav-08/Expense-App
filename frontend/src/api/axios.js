import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A 401 from the auth endpoints is an answer about the credentials the user just
// typed, not an expired session. Redirecting there reloads the page and destroys
// the error message before it renders, so those are left to the caller.
const isAuthRequest = (url = '') => url.includes('/auth/login') || url.includes('/auth/register')

api.interceptors.response.use(
  r => r,
  err => {
    const sessionExpired =
      err.response?.status === 401 &&
      !isAuthRequest(err.config?.url) &&
      localStorage.getItem('token')          // nothing to expire if we were never signed in

    if (sessionExpired) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api