import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import ChartTooltip from './ChartTooltip'

const ACCENTS = ['#101828', '#344054', '#475467', '#667085', '#98A2B3', '#D0D5DD']

export default function CategoryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          stroke="#fff"
          strokeWidth={2}
        >
          {data?.map((_, i) => (
            <Cell key={i} fill={ACCENTS[i % ACCENTS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip formatter={v => `₹${v.toLocaleString()}`} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={v => <span className="text-xs text-[#344054]">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}