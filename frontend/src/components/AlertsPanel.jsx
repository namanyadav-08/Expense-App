import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function AlertsPanel() {
  const [alerts, setAlerts]         = useState([])
  const [dismissing, setDismissing] = useState(new Set())

  const load = () => api.get('/alerts').then(r => setAlerts(r.data.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const dismiss = async (id) => {
    setDismissing(s => new Set(s).add(id))
    try {
      await api.post(`/alerts/${id}/dismiss`)
      setAlerts(a => a.filter(x => x._id !== id))
      toast.success('Alert dismissed')
    } catch {
      toast.error('Error')
      setDismissing(s => { const next = new Set(s); next.delete(id); return next })
    }
  }

  if (!alerts.length) return null

  return (
    <div className="bg-[#101828] rounded-xl p-4 mb-6 animate-[shake_0.4s_ease-in-out]">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        <p className="text-sm font-medium text-white">{alerts.length} report{alerts.length > 1 ? 's' : ''} need attention</p>
      </div>

      <div className="space-y-2">
        {alerts.map(a => {
          const isPending = dismissing.has(a._id)
          const report = a.report
          return (
            <div key={a._id} className="flex justify-between items-center text-sm bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2">
              {report ? (
                <div>
                  <Link to={`/reports/${report._id}`} className="text-white font-medium hover:underline">{report.title}</Link>
                  <span className="text-white/60 ml-2">by {report.owner?.name ?? 'Unknown'}</span>
                  {/* submittedAt is the immutable submission time; updatedAt drifts on any later edit. */}
                  <span className="text-white/40 ml-2 text-xs">· submitted {formatDistanceToNow(new Date(report.submittedAt))} ago</span>
                </div>
              ) : (
                <span className="text-white/60 italic">Report no longer available</span>
              )}
              <button
                onClick={() => dismiss(a._id)}
                disabled={isPending}
                className="text-xs text-white/80 bg-white/10 border border-white/10 px-2.5 py-1 rounded-md hover:bg-white/20 disabled:opacity-50 transition-colors"
              >
                {isPending ? '...' : 'Dismiss'}
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  )
}