const STATUS = {
  Draft:     { dot: '#D0D5DD', bg: '#F9FAFB', text: '#475467' },
  Submitted: { dot: '#98A2B3', bg: '#F9FAFB', text: '#475467' },
  Approved:  { dot: '#475467', bg: '#F2F4F7', text: '#344054' },
  Paid:      { dot: '#101828', bg: '#F2F4F7', text: '#101828' },
  Rejected:  { dot: '#DC2626', bg: '#FEF2F2', text: '#DC2626' },
}
const FALLBACK = { dot: '#98A2B3', bg: '#F2F4F7', text: '#475467' }

export default function StatusBadge({ status }) {
  const s = STATUS[status] || FALLBACK
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {status || 'Unknown'}
    </span>
  )
}