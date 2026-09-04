import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const field = 'w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm text-[#101828] placeholder:text-[#667085] focus:outline-none focus:ring-1 focus:ring-black focus:border-black'
const label = 'block text-sm font-medium text-[#344054] mb-1.5'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const submit = async () => {
    setLoading(true)
    try { await login(form.email, form.password); navigate('/dashboard') }
    catch (e) { toast.error(e.response?.data?.message || 'Login failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white w-[360px] p-8 rounded-xl border border-[#EAECF0] shadow-sm">
        <h1 className="text-2xl font-bold text-[#101828] tracking-tight">Welcome back</h1>
        <p className="text-sm text-[#475467] mt-1 mb-6">Sign in to continue</p>

        <label className={label}>Email</label>
        <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={`${field} mb-4`} />

        <label className={label}>Password</label>
        <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={`${field} mb-6`} />

        <button onClick={submit} disabled={loading} className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50">
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <p className="text-sm text-center text-[#475467] mt-4">
          No account? <Link to="/register" className="font-medium text-[#101828]">Register</Link>
        </p>
      </div>
    </div>
  )
}
