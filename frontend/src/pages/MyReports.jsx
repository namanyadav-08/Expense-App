import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import ReportCard from '../components/ReportCard'

const tab       = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'
const tabActive = 'bg-white text-[#101828] shadow-sm'
const tabIdle   = 'text-[#667085] hover:text-[#101828]'

export default function MyReports() {
  const [reports,  setReports]  = useState([])
  const [archived, setArchived] = useState(false)
  const [loading,  setLoading]  = useState(true)

  const fetchReports = async () => {
    setLoading(true)
    try { const r = await api.get(`/reports?archived=${archived}`); setReports(r.data.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReports() }, [archived])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-1 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg p-1">
          <button onClick={() => setArchived(false)} className={`${tab} ${!archived ? tabActive : tabIdle}`}>Active</button>
          <button onClick={() => setArchived(true)}  className={`${tab} ${archived  ? tabActive : tabIdle}`}>Archived</button>
        </div>
        <Link
          to="/reports/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          + Create Report
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-sm text-[#667085] py-10">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-center text-sm text-[#667085] py-10">No reports found</p>
      ) : (
        <div className="space-y-3">
          {reports.map(r => <ReportCard key={r._id} report={r} onRefresh={fetchReports} />)}
        </div>
      )}
    </div>
  )
}