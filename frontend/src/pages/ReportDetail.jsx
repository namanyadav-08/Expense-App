import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import LineItemForm from '../components/LineItemForm'
import AuditTimeline from '../components/AuditTimeline'

const primaryBtn = 'bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors'
const card = 'bg-white border border-[#EAECF0] rounded-xl p-4 mb-6'
const input = 'border border-[#D0D5DD] rounded-lg px-2.5 py-1.5 text-sm text-[#101828] focus:outline-none focus:ring-1 focus:ring-black'

export default function ReportDetail() {
  const { id } = useParams()
  const { user, isApprover } = useAuth()
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [pending,      setPending]      = useState(false)
  const [reason,       setReason]       = useState('')
  const [allApprovers, setAllApprovers] = useState([])
  const [selected,     setSelected]     = useState([])
  const [editingLine,  setEditingLine]  = useState(null)   // line _id being edited, or null
  const [editHeader,   setEditHeader]   = useState(false)  // title/date-range edit form open
  const [header,       setHeader]       = useState({ title: '', dateFrom: '', dateTo: '' })

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/reports/${id}`)
      setData(r.data.data)
      setSelected(r.data.data.report.assignedApprovers.map(a => a._id))
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    api.get('/auth/approvers').then(r => setAllApprovers(r.data.data)).catch(() => {})
  }, [id])

  if (loading) return <div className="p-8 text-center text-[#667085]">Loading...</div>
  if (!data)   return <div className="p-8 text-center text-red-600">Report not found</div>

  const { report, lines, history } = data
  const isOwner      = report.owner._id === user._id
  const isDraft      = report.status === 'Draft'
  // A rejected report is a Draft carrying a rejection reason — the backend has no
  // separate 'Rejected' status. This is what surfaces the resubmit panel below.
  const isRejected   = isDraft && !!report.rejectionReason
  const isSubmitted  = report.status === 'Submitted'
  const canEdit      = isOwner && isDraft

  const action = async (url, body = {}) => {
    setPending(true)
    try { await api.post(url, body); await load(); toast.success('Done') }
    catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setPending(false) }
  }

  const deleteL = async (lineId) => {
    try { await api.delete(`/reports/${id}/lines/${lineId}`); load(); toast.success('Line removed') }
    catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const saveApprovers = async () => {
    try { await api.post(`/reports/${id}/assign`, { approvers: selected }); toast.success('Approvers saved'); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Error') }
  }

  const openHeaderEdit = () => {
    setHeader({
      title:    report.title,
      dateFrom: report.dateFrom?.slice(0, 10) || format(new Date(report.dateFrom), 'yyyy-MM-dd'),
      dateTo:   report.dateTo?.slice(0, 10)   || format(new Date(report.dateTo), 'yyyy-MM-dd')
    })
    setEditHeader(true)
  }

  const saveHeader = async () => {
    if (!header.title.trim() || !header.dateFrom || !header.dateTo) return toast.error('All fields required')
    if (header.dateTo < header.dateFrom) return toast.error('End date cannot be before start date')
    setPending(true)
    try {
      await api.put(`/reports/${id}`, header)
      toast.success('Report updated')
      setEditHeader(false)
      await load()
    } catch (e) { toast.error(e.response?.data?.message || 'Error') }
    finally { setPending(false) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          {editHeader ? (
            <div className="space-y-2 max-w-md">
              <input
                value={header.title}
                onChange={e => setHeader({ ...header, title: e.target.value })}
                placeholder="Report title"
                className={`${input} w-full`}
              />
              <div className="flex gap-2">
                <input type="date" value={header.dateFrom} onChange={e => setHeader({ ...header, dateFrom: e.target.value })} className={input} />
                <input type="date" value={header.dateTo}   onChange={e => setHeader({ ...header, dateTo: e.target.value })}   className={input} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveHeader} disabled={pending} className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors">Save</button>
                <button onClick={() => setEditHeader(false)} disabled={pending} className="text-[#667085] text-sm px-2 hover:text-[#101828] transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#101828] tracking-tight">{report.title}</h1>
                {canEdit && <button onClick={openHeaderEdit} className="text-xs text-[#667085] hover:text-[#101828] hover:underline">Edit</button>}
              </div>
              <p className="text-[#667085] text-sm mt-1">
                {format(new Date(report.dateFrom), 'MMM d')} – {format(new Date(report.dateTo), 'MMM d, yyyy')} · Owner: {report.owner.name}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <StatusBadge status={report.status} />
                <span className="font-semibold text-lg text-[#101828]">₹{report.total?.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          {/* A rejected draft resubmits from its own panel below, so hide the plain Submit here. */}
          {isOwner && isDraft && !isRejected && (
            <button onClick={() => action(`/reports/${id}/submit`)} disabled={pending} className={primaryBtn}>Submit</button>
          )}
          {isApprover && isSubmitted && !isOwner && (
            <>
              <button onClick={() => action(`/reports/${id}/approve`)} disabled={pending} className={primaryBtn}>Approve</button>
              <div className="flex gap-1.5">
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason..."
                  className="border border-[#D0D5DD] rounded-lg px-2 py-1.5 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-black"
                />
                <button
                  onClick={() => action(`/reports/${id}/reject`, { reason })}
                  disabled={pending || !reason.trim()}
                  className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            </>
          )}
          {isApprover && report.status === 'Approved' && (
            <button onClick={() => action(`/reports/${id}/paid`)} disabled={pending} className={primaryBtn}>Mark Paid</button>
          )}
        </div>
      </div>

      {isRejected && isOwner && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold text-sm">Report Rejected</p>
          <p className="text-red-600 text-sm mt-1">Reason: {report.rejectionReason || 'No reason provided'}</p>
          <p className="text-[#667085] text-sm mt-1">Edit your report below and resubmit when ready.</p>
          <button onClick={() => action(`/reports/${id}/resubmit`)} disabled={pending} className={`mt-3 ${primaryBtn}`}>
            Resubmit Report
          </button>
        </div>
      )}

      <div className={card}>
        <h2 className="font-semibold text-[#101828] mb-3">Expense Lines</h2>
        {lines.length === 0 ? (
          <p className="text-[#667085] text-sm">No lines yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#667085] border-b border-[#EAECF0]">
                <th className="pb-2 font-medium">Date</th>
                <th className="font-medium">Category</th>
                <th className="font-medium">Description</th>
                <th className="font-medium">Amount</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                editingLine === l._id ? (
                  <tr key={l._id} className="border-b border-[#EAECF0] last:border-0">
                    <td colSpan={canEdit ? 5 : 4} className="py-2">
                      <LineItemForm
                        reportId={id}
                        line={l}
                        onSaved={() => { setEditingLine(null); load() }}
                        onCancel={() => setEditingLine(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={l._id} className="border-b border-[#EAECF0] last:border-0">
                    <td className="py-2 text-[#344054]">{format(new Date(l.date), 'MMM d')}</td>
                    <td className="text-[#344054]">{l.category}</td>
                    <td className="text-[#344054]">{l.description}</td>
                    <td className="text-[#344054]">₹{l.amount?.toLocaleString()}</td>
                    {canEdit && (
                      <td className="text-right whitespace-nowrap">
                        <button onClick={() => setEditingLine(l._id)} className="text-[#667085] text-xs hover:underline mr-3">Edit</button>
                        <button onClick={() => deleteL(l._id)} className="text-red-600 text-xs hover:underline">Delete</button>
                      </td>
                    )}
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
        {canEdit && editingLine === null && <LineItemForm reportId={id} onSaved={load} />}
        {!canEdit && isOwner && <p className="text-sm text-[#98A2B3] mt-3 italic">Report is {report.status} — editing disabled.</p>}
      </div>

      {canEdit && (
        <div className={card}>
          <h2 className="font-semibold text-[#101828] mb-3">Assign Approvers</h2>
          <div className="space-y-2">
            {allApprovers.map(a => (
              <label key={a._id} className="flex items-center gap-2 text-sm text-[#344054] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(a._id)}
                  onChange={() => setSelected(s => s.includes(a._id) ? s.filter(x => x !== a._id) : [...s, a._id])}
                  className="accent-black"
                />
                {a.name} <span className="text-[#98A2B3]">({a.email})</span>
              </label>
            ))}
          </div>
          <button onClick={saveApprovers} className="mt-3 bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
            Save Approvers
          </button>
        </div>
      )}

      {!canEdit && (
        <div className={card}>
          <h2 className="font-semibold text-[#101828] mb-1">Assigned Approvers</h2>
          <p className="text-sm text-[#667085]">{report.assignedApprovers.map(a => a.name).join(', ') || 'None'}</p>
        </div>
      )}

      <div className="bg-white border border-[#EAECF0] rounded-xl p-4">
        <AuditTimeline history={history} reportId={id} onRefresh={load} />
      </div>
    </div>
  )
}