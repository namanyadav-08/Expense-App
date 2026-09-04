import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const CATEGORIES = ['Travel', 'Meals', 'Accommodation', 'Supplies', 'Other']
const input = 'border border-[#D0D5DD] rounded-lg px-2.5 py-1.5 text-sm text-[#101828] focus:outline-none focus:ring-1 focus:ring-black'

// Shared add/edit form. Pass `line` to edit an existing one, omit it to add a new one.
export default function LineItemForm({ reportId, line, onSaved, onCancel }) {
  const isEdit = !!line
  const [form, setForm] = useState(
    isEdit
      ? { date: line.date?.slice(0, 10) || '', amount: String(line.amount ?? ''), category: line.category, description: line.description }
      : { date: '', amount: '', category: 'Travel', description: '' }
  )
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const amount = parseFloat(form.amount)
    if (!form.date || !form.description.trim()) return toast.error('All fields required')
    if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount')

    setLoading(true)
    try {
      const payload = { ...form, amount }
      if (isEdit) {
        await api.put(`/reports/${reportId}/lines/${line._id}`, payload)
        toast.success('Line updated')
      } else {
        await api.post(`/reports/${reportId}/lines`, payload)
        toast.success('Line added')
        setForm({ date: '', amount: '', category: 'Travel', description: '' })
      }
      onSaved()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="grid grid-cols-5 gap-2 mt-4">
      <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={input} />
      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={input}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={input} />
      <input type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={input} />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="flex-1 bg-black text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : isEdit ? 'Save' : 'Add'}
        </button>
        {isEdit && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-[#667085] text-sm px-2 hover:text-[#101828] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}