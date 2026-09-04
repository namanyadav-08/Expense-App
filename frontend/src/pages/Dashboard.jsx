import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import WeeklyChart   from '../components/charts/WeeklyChart'
import StatusChart   from '../components/charts/StatusChart'
import CategoryChart from '../components/charts/CategoryChart'

const card      = 'bg-white rounded-xl border border-[#EAECF0] shadow-sm'
const statCard  = `${card} p-4`
const statValue = 'text-2xl font-bold text-[#101828]'
const statLabel = 'text-xs text-[#667085] mt-1'

function Ring({ value, total, size = 72, stroke = 7 }) {
  const pct = total ? Math.min(value / total, 1) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAECF0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#101828" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
      />
    </svg>
  )
}

function Hero({ label, value, sub, ring }) {
  return (
    <div className={`${card} p-6 flex items-center gap-5`}>
      {ring}
      <div>
        <div className="text-sm text-[#667085]">{label}</div>
        <div className="text-2xl font-bold text-[#101828] mt-1">{value}</div>
        {sub && <div className="text-xs text-[#667085] mt-1">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isApprover } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => { api.get('/dashboard').then(r => setData(r.data.data)).catch(() => {}) }, [])

  if (!data) return <div className="p-8 text-center text-[#667085]">Loading...</div>

  if (!isApprover) {
    // No 'Rejected' status exists — rejected reports return to Draft — so it is not a stat.
    const stats = [
      { label: 'Total Reports', value: data.total },
      { label: 'Draft',         value: data.draft },
      { label: 'Submitted',     value: data.submitted },
      { label: 'Approved',      value: data.approved },
      { label: 'Paid',          value: data.paid },
    ]

    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-[#101828] tracking-tight mb-6">My Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Hero
            label="Total Spent"
            value={`₹${data.totalAmount?.toLocaleString() ?? 0}`}
            sub={`${data.paid ?? 0} paid reports`}
            ring={<Ring value={data.paid} total={data.total} />}
          />
          <Hero
            label="Pending Payout"
            value={`₹${data.pendingAmount?.toLocaleString() ?? 0}`}
            sub={`${data.approved ?? 0} approved, awaiting payout`}
            ring={<Ring value={data.approved} total={data.total} />}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className={statCard}>
              <div className={statValue}>{s.value ?? 0}</div>
              <div className={statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent activity on the owner's reports — sourced from fields the API already returns. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
          <div className={statCard}>
            <div className={statValue}>{data.approvedThisWeek ?? 0}</div>
            <div className={statLabel}>Approved This Week</div>
          </div>
          <div className={statCard}>
            <div className={statValue}>{data.paidThisWeek ?? 0}</div>
            <div className={statLabel}>Paid This Week</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-[#101828] mb-4">My Reports by Status</h3>
            <StatusChart data={data.byStatus} />
          </div>
          <div className={`${card} p-5`}>
            <h3 className="font-semibold text-[#101828] mb-4">My Spend by Category</h3>
            <CategoryChart data={data.byCategory} />
          </div>
          <div className={`${card} p-5 col-span-full`}>
            <h3 className="font-semibold text-[#101828] mb-4">My Weekly Paid Amount</h3>
            <WeeklyChart data={data.weeklyPaid} />
          </div>
        </div>
      </div>
    )
  }

  // APPROVER DASHBOARD
  const stats = [
    { label: 'Awaiting Approval',  value: data.awaitingApproval },
    { label: 'Approved This Week', value: data.approvedThisWeek },
    { label: 'Paid This Week',     value: data.paidThisWeek },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-[#101828] tracking-tight mb-6">Approver Dashboard</h1>

      <div className="mb-6">
        <Hero
          label="Total Approved"
          value={`₹${data.totalDue?.toLocaleString() ?? 0}`}
          sub={`${data.awaitingApproval ?? 0} reports awaiting approval`}
          ring={<Ring value={data.awaitingApproval} total={(data.awaitingApproval || 0) + (data.approvedThisWeek || 0)} />}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className={statCard}>
            <div className={statValue}>{s.value ?? 0}</div>
            <div className={statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-[#101828] mb-4">All Reports by Status</h3>
          <StatusChart data={data.byStatus} />
        </div>
        <div className={`${card} p-5`}>
          <h3 className="font-semibold text-[#101828] mb-4">Spend by Category</h3>
          <CategoryChart data={data.byCategory} />
        </div>
        <div className={`${card} p-5 col-span-full`}>
          <h3 className="font-semibold text-[#101828] mb-4">Weekly Paid Amount</h3>
          <WeeklyChart data={data.weeklyPaid} />
        </div>
      </div>
    </div>
  )
}