import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartTooltip from './ChartTooltip'

export default function StatusChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#EAECF0" />
        <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#667085' }} axisLine={{ stroke: '#EAECF0' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: '#F9FAFB' }} content={<ChartTooltip />} />
        <Bar dataKey="count" fill="#101828" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}