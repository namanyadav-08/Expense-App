import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import StatusBadge from '../components/StatusBadge'
import BulkActionBar from '../components/BulkActionBar'
import AlertsPanel from '../components/AlertsPanel'

const tab       = 'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors'
const tabActive = 'bg-white text-[#101828] shadow-sm'
const tabIdle   = 'text-[#667085] hover:text-[#101828]'

export default function ApproverQueue() {
  const [tabValue,   setTabValue]   = useState('all')
  const [reports,    setReports]    = useState([])
  const [selected,   setSelected]   = useState([])
  const [pendingIds, setPendingIds] = useState(new Set())
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [pages,      setPages]      = useState(1)
  const [total,      setTotal]      = useState(0)

  const load = async (requestedPage = page) => {
    setLoading(true); setSelected([])
    try {
      const r = tabValue === 'mine'
        ? await api.get('/reports/assigned-to-me')
        : await api.get(`/reports/all?status=Submitted&page=${requestedPage}`)
      setReports(tabValue === 'mine' ? r.data.data : r.data.data.reports)
      if (tabValue === 'all') {
        setPage(r.data.data.page)
        setPages(r.data.data.pages)
        setTotal(r.data.data.total)
      } else {
        setPage(1)
        setPages(1)
        setTotal(r.data.data.length)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [tabValue])

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const act = async (reportId, action, reason = '') => {
    setPendingIds(s => new Set(s).add(reportId))
    try {
      await api.post(`/reports/${reportId}/${action}`, { reason })
      toast.success(action === 'approve' ? 'Approved!' : 'Rejected!')
      load()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error')
    } finally {
      setPendingIds(s => { const next = new Set(s); next.delete(reportId); return next })
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-[#101828] tracking-tight mb-4">Approver Queue</h1>

      <AlertsPanel />

      <div className="flex gap-1 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg p-1 mb-4 w-fit">
        <button onClick={() => setTabValue('all')}  className={`${tab} ${tabValue === 'all'  ? tabActive : tabIdle}`}>All Submitted</button>
        <button onClick={() => setTabValue('mine')} className={`${tab} ${tabValue === 'mine' ? tabActive : tabIdle}`}>Assigned to Me</button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-[#667085] py-10">Loading...</p>
      ) : !reports?.length ? (
        <p className="text-center text-sm text-[#667085] py-10">No reports</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[700px] text-sm bg-white border border-[#EAECF0] rounded-xl overflow-hidden">
            <thead>
              <tr className="text-left text-[#667085] border-b border-[#EAECF0] bg-[#F9FAFB]">
                <th className="p-3"><input type="checkbox" className="accent-black" onChange={e => setSelected(e.target.checked ? reports.map(r => r._id) : [])} /></th>
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium">Owner</th>
                <th className="p-3 font-medium">Total</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => {
                const isPending = pendingIds.has(r._id)
                return (
                  <tr key={r._id} className="border-b border-[#EAECF0] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="p-3"><input type="checkbox" className="accent-black" checked={selected.includes(r._id)} onChange={() => toggle(r._id)} /></td>
                    <td className="p-3"><Link to={`/reports/${r._id}`} className="text-[#101828] font-medium hover:underline">{r.title}</Link></td>
                    <td className="p-3 text-[#344054]">{r.owner?.name}</td>
                    <td className="p-3 text-[#344054]">₹{r.total?.toLocaleString()}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => act(r._id, 'approve')}
                        disabled={isPending}
                        className="bg-black text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { const reason = prompt('Rejection reason:'); if (!reason) return; act(r._id, 'reject', reason) }}
                        disabled={isPending}
                        className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>

          {tabValue === 'all' && pages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-[#667085]">
              <span>Page {page} of {pages} ({total} reports)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => load(page - 1)}
                  disabled={page === 1 || loading}
                  className="px-3 py-1 border border-[#D0D5DD] rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => load(page + 1)}
                  disabled={page === pages || loading}
                  className="px-3 py-1 border border-[#D0D5DD] rounded-lg disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <BulkActionBar selected={selected} onDone={load} />
    </div>
  )
}