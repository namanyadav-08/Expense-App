export default function ChartTooltip({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null
    const title = label ?? payload[0]?.name
    return (
      <div className="bg-[#101828] text-white text-xs rounded-lg px-3 py-2 shadow-lg">
        <div className="text-[#98A2B3] mb-0.5">{title}</div>
        {payload.map((p, i) => (
          <div key={i} className="font-medium">{formatter ? formatter(p.value) : p.value}</div>
        ))}
      </div>
    )
  }