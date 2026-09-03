import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))
  const [token,   setToken]   = useState(() => localStorage.getItem('token') || '')
  const [loading, setLoading] = useState(false)

  const save = (data) => {
    setUser(data.user); setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('token', data.token)
  }

  const login    = async (email, password) => { const r = await api.post('/auth/login',    { email, password }); save(r.data.data) }
  const register = async (name, email, password, role) => { const r = await api.post('/auth/register', { name, email, password, role }); save(r.data.data) }
  const logout   = () => { setUser(null); setToken(''); localStorage.removeItem('user'); localStorage.removeItem('token'); window.location.href = '/login' }

  return (
    <AuthContext.Provider value={{ user, token, loading, isApprover: user?.role === 'approver', login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export default AuthContext