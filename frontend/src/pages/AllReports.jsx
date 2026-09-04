import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../api/axios'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['', 'Draft', 'Submitted', 'Approved', 'Rejected', 'Paid']
const input = 'border border-[#D0D5DD] rounded-lg px-2.5 py-1.5 text-sm text-[#101828] focus:outline-none focus:ring-1 focus:ring-black focus:border-black'

function pageWindow(page, total, span = 5) {
  const start = Math.max(1, Math.min(page - Math.floor(span / 2), total - span + 1))
  const end = Math.min(total, start + span - 1)
  return Array.from({ length: Math.max(end - start + 1, 0) }, (_, i) => start + i)
}

export default function AllReports() {
  const [reports,   setReports]   = useState([])
  const [meta,      setMeta]      = useState({ total: 0, page: 1, pages: 1 })
  const [owners,    setOwners]    = useState([])
  const [approvers, setApprovers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters,   setFilters]   = useState({ search: '', status: '', owner: '', approver: '', sort: 'date', limit: 10 })

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ ...filters, page })
      const r = await api.get(`/reports/all?${p}`)
      const d = r.data.data
      setReports(d.reports)
      setMeta({ total: d.total, page: d.page, pages: d.pages })
      if (d.owners)    setOwners(d.owners)
      if (d.approvers) setApprovers(d.approvers)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 400)
    return () => clearTimeout(t)
  }, [filters.search])

  useEffect(() => { load(1) }, [filters.status, filters.owner, filters.approver, filters.sort, filters.limit])

  const exportCSV = async () => {
    setExporting(true)
    try {
      const r = await api.get('/reports/export-csv', { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'approved.csv'; a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const from = meta.total === 0 ? 0 : (meta.page - 1) * filters.limit + 1
  const to   = Math.min(meta.page * filters.limit, meta.total)

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#101828] tracking-tight">All Reports</h1>
        <button
          onClick={exportCSV}
          disabled={exporting}
          className="border border-[#D0D5DD] text-[#344054] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="bg-white border border-[#EAECF0] rounded-xl p-3 mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <input placeholder="Search title..." value={filters.search} onChange={e => set('search', e.target.value)} className={`${input} lg:col-span-2`} />
        <select value={filters.status} onChange={e => set('status', e.target.value)} className={input}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
        <select value={filters.owner} onChange={e => set('owner', e.target.value)} className={input}>
          <option value="">All Owners</option>
          {owners.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
        </select>
        <select value={filters.approver} onChange={e => set('approver', e.target.value)} className={input}>
          <option value="">All Approvers</option>
          {approvers.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
        <select value={filters.sort} onChange={e => set('sort', e.target.value)} className={input}>
          <option value="date">Date</option>
          <option value="status">Status</option>
          <option value="total">Total</option>
        </select>
      </div>

      <div className="flex justify-between items-center mb-2 text-sm text-[#667085]">
        <span>{loading ? 'Loading...' : `Showing ${from}–${to} of ${meta.total} reports`}</span>
        <select value={filters.limit} onChange={e => set('limit', parseInt(e.target.value))} className={input}>
          {[10, 25, 50].map(l => <option key={l} value={l}>{l} per page</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-center py-10 text-sm text-[#667085]">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-center py-10 text-sm text-[#667085]">No reports found</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[760px] text-sm bg-white border border-[#EAECF0] rounded-xl overflow-hidden">
            <thead>
              <tr className="text-left text-[#667085] border-b border-[#EAECF0] bg-[#F9FAFB]">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Approver</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r._id} className="border-b border-[#EAECF0] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3">
                    <Link to={`/reports/${r._id}`} className="text-[#101828] font-medium hover:underline">{r.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-[#344054]">{r.owner?.name}</td>
                  <td className="px-4 py-3 text-xs text-[#667085]">{r.assignedApprovers?.map(a => a.name).join(', ') || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-[#344054]">₹{r.total?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#667085]">{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {meta.pages > 1 && (
            <div className="flex gap-1.5 justify-center mt-4">
              <button onClick={() => load(meta.page - 1)} disabled={meta.page === 1} className="px-3 py-1 border border-[#D0D5DD] rounded-lg text-sm text-[#344054] disabled:opacity-40">← Prev</button>
              {pageWindow(meta.page, meta.pages).map(p => (
                <button
                  key={p}
                  onClick={() => load(p)}
                  className={`px-3 py-1 rounded-lg text-sm ${meta.page === p ? 'bg-black text-white' : 'border border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]'}`}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => load(meta.page + 1)} disabled={meta.page === meta.pages} className="px-3 py-1 border border-[#D0D5DD] rounded-lg text-sm text-[#344054] disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}