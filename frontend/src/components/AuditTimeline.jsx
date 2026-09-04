import { format } from 'date-fns'
import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function AuditTimeline({ history, reportId, onRefresh }) {
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)

  const post = async () => {
    if (!comment.trim() || posting) return
    setPosting(true)
    try {
      await api.post(`/reports/${reportId}/comment`, { comment })
      setComment('')
      onRefresh()
      toast.success('Comment posted')
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setPosting(false) }
  }

  return (
    <div>
      <h3 className="font-semibold text-[#101828] mb-3">Audit Timeline</h3>
      <div className="space-y-3">
        {history.map(h => (
          <div key={h._id} className="flex gap-3 text-sm">
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${h.type === 'status_change' ? 'bg-[#101828]' : 'bg-[#D0D5DD]'}`} />
            <div>
              <span className="font-medium text-[#101828]">{h.changedBy?.name}</span>
              {h.type === 'status_change' ? (
                <span className="text-[#475467]"> changed status: {h.oldStatus} → {h.newStatus}{h.reason && ` (${h.reason})`}</span>
              ) : (
                <span className="text-[#475467]"> commented: {h.comment}</span>
              )}
              <div className="text-xs text-[#98A2B3]">{format(new Date(h.createdAt), 'MMM d, yyyy HH:mm')}</div>
            </div>
          </div>
        ))}
        {history.length === 0 && <p className="text-[#98A2B3] text-sm">No history yet</p>}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={comment}
          onChange={e => setComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && post()}
          disabled={posting}
          placeholder="Add a comment..."
          className="border border-[#D0D5DD] rounded-lg px-3 py-1.5 flex-1 text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50"
        />
        <button
          onClick={post}
          disabled={posting || !comment.trim()}
          className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {posting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  )
}