import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import StatusBadge from './StatusBadge'
import api from '../api/axios'
import toast from 'react-hot-toast'

const btn = 'text-sm px-3 py-1.5 rounded-lg text-center transition-colors disabled:opacity-50 disabled:pointer-events-none'

export default function ReportCard({ report, onRefresh }) {
  const [pending, setPending] = useState(false)

  const runAction = async (method, endpoint, successMsg) => {
    setPending(true)
    try {
      await api[method](endpoint)
      toast.success(successMsg)
      onRefresh()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error')
    } finally {
      setPending(false)
    }
  }

  const archive = () => runAction('post', `/reports/${report._id}/archive`, 'Archived')
  const restore = () => runAction('post', `/reports/${report._id}/restore`, 'Restored')
  const deleteReport = () => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return
    runAction('delete', `/reports/${report._id}`, 'Deleted')
  }

  return (
    <div className="border border-[#EAECF0] rounded-xl p-4 bg-white shadow-sm flex justify-between items-start gap-4">
      <div>
        <h3 className="font-semibold text-[#101828]">{report.title}</h3>
        <p className="text-sm text-[#667085] mt-0.5">
          {format(new Date(report.dateFrom), 'MMM d')} – {format(new Date(report.dateTo), 'MMM d, yyyy')}
        </p>
        <p className="text-sm font-medium text-[#344054] mt-1">₹{report.total?.toLocaleString()}</p>
        <div className="mt-2"><StatusBadge status={report.status} /></div>
        {report.rejectionReason && (
          <p className="text-xs text-red-600 mt-1">Rejected: {report.rejectionReason}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 shrink-0 w-24">
        <Link to={`/reports/${report._id}`} className={`${btn} bg-black text-white hover:bg-neutral-800`}>
          View
        </Link>
        {!report.isArchived ? (
          <button onClick={archive} disabled={pending} className={`${btn} bg-[#F2F4F7] text-[#344054] hover:bg-[#EAECF0]`}>
            Archive
          </button>
        ) : (
          <button onClick={restore} disabled={pending} className={`${btn} bg-[#F2F4F7] text-[#344054] hover:bg-[#EAECF0]`}>
            Restore
          </button>
        )}
                {/* Deletable only before the first submission. Rejected reports are back in
            Draft but carry submittedAt, so they stay. Server enforces the same rule. */}
        {report.status === 'Draft' && !report.submittedAt && (
          <button onClick={deleteReport} disabled={pending} className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}