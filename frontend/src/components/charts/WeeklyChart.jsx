import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartTooltip from './ChartTooltip'

export default function WeeklyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#101828" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#101828" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EAECF0" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#667085' }} axisLine={{ stroke: '#EAECF0' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip formatter={v => `₹${v.toLocaleString()}`} />} />
        <Area type="monotone" dataKey="total" stroke="#101828" strokeWidth={2} fill="url(#weeklyFill)" dot={false} activeDot={{ r: 4, fill: '#101828' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}