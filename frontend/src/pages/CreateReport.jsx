import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'

const field = 'w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm text-[#101828] placeholder:text-[#667085] focus:outline-none focus:ring-1 focus:ring-black focus:border-black [color-scheme:light]'
const dateField = `${field} [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`
const label = 'block text-xs font-medium text-[#667085] mb-1.5'

export default function CreateReport() {
  const [form, setForm]       = useState({ title: '', dateFrom: '', dateTo: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async () => {
    const title = form.title.trim()
    if (!title || !form.dateFrom || !form.dateTo) return toast.error('All fields required')
    if (form.dateFrom > form.dateTo) return toast.error('Date range invalid')

    setLoading(true)
    try {
      const r = await api.post('/reports', { ...form, title })
      navigate(`/reports/${r.data.data._id}`)
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-16">
      <div className="bg-white w-[400px] p-8 rounded-xl border border-[#EAECF0] shadow-sm">
        <h1 className="text-xl font-bold text-[#101828] tracking-tight mb-6">Create Report</h1>

        <label className={label}>Title</label>
        <input
          placeholder="e.g. Client visit — Mumbai"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className={`${field} mb-4`}
        />

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className={label}>Date From</label>
            <input type="date" value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })} className={dateField} />
          </div>
          <div>
            <label className={label}>Date To</label>
            <input type="date" value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })} className={dateField} />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  )
}