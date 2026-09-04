import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const field = 'w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm text-[#101828] placeholder:text-[#667085] bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black'
const label = 'block text-sm font-medium text-[#344054] mb-1.5'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const submit = async () => {
    if (!form.name || !form.email || !form.password) return toast.error('All fields required')
    setLoading(true)
    try { await register(form.name, form.email, form.password, form.role); navigate('/dashboard') }
    catch (e) { toast.error(e.response?.data?.message || 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center ">
      <div className="bg-white w-[360px] p-8 rounded-xl border border-[#EAECF0] shadow-sm">
        <h1 className="text-2xl font-bold text-[#101828] tracking-tight">Create account</h1>
        <p className="text-sm text-[#475467] mt-1 mb-6">Sign up to get started</p>

        <label className={label}>Name</label>
        <input placeholder="Your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={`${field} mb-4`} />

        <label className={label}>Email</label>
        <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={`${field} mb-4`} />

        <label className={label}>Password</label>
        <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={`${field} mb-4`} />

        <label className={label}>Role</label>
        <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={`${field} mb-6`}>
          <option value="employee">Employee</option>
          <option value="approver">Approver</option>
        </select>

        <button onClick={submit} disabled={loading} className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p className="text-sm text-center text-[#475467] mt-4">
          Have account? <Link to="/login" className="font-medium text-[#101828]">Login</Link>
        </p>
      </div>
    </div>
  )
}
