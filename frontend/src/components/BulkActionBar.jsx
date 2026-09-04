import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function BulkActionBar({ selected, onDone }) {
  const [reason,  setReason]  = useState('')
  const [loading, setLoading] = useState(false)

  const act = async (action) => {
    if (action === 'reject' && !reason.trim()) return toast.error('Reason required for rejection')
    setLoading(true)
    try {
      const r = await api.post('/reports/bulk-action', { reportIds: selected, action, reason })
      const d = r.data.data

      if (d.failed === 0) {
        toast.success(`${d.succeeded} report${d.succeeded === 1 ? '' : 's'} ${action === 'approve' ? 'approved' : 'rejected'}`)
      } else {
        // Name the failures the user can act on. Self-owned refusals are the most
        // common cause, so list those by title; summarise anything else.
        const otherFailures = d.failed - d.selfOwned.length
        const parts = [`${d.succeeded} succeeded, ${d.failed} failed`]
        if (d.selfOwned.length) parts.push(`Skipped (your own): ${d.selfOwned.join(', ')}`)
        if (otherFailures > 0)  parts.push(`${otherFailures} could not be processed`)
        toast.error(parts.join(' — '), { duration: 6000 })
      }

      setReason('')
      onDone()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setLoading(false) }
  }

  if (!selected.length) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#101828] text-white rounded-xl px-6 py-3 flex items-center gap-4 shadow-lg z-50">
      <span className="text-sm">{selected.length} selected</span>
      <input
        value={reason}
        onChange={e => setReason(e.target.value)}
        disabled={loading}
        placeholder="Rejection reason..."
        className="bg-white/10 text-white placeholder:text-white/50 px-2.5 py-1.5 rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
      />
      <button
        onClick={() => act('approve')}
        disabled={loading}
        className="bg-white text-[#101828] px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition-colors"
      >
        Approve All
      </button>
      <button
        onClick={() => act('reject')}
        disabled={loading}
        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
      >
        Reject All
      </button>
    </div>
  )
}