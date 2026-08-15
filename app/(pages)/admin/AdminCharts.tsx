"use client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface MonthlyEntry {
  month: string;
  bookings: number;
  viewings: number;
  revenue: number;
}

interface OccupancyEntry {
  name: string;
  value: number;
  color: string;
}

interface AdminChartsProps {
  monthlyData: MonthlyEntry[];
  occupancyData: OccupancyEntry[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
      <p className="font-semibold mb-1 text-slate-300">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="font-semibold">
            {p.name === "revenue"
              ? `Ksh ${p.value.toLocaleString()}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminCharts({ monthlyData, occupancyData }: AdminChartsProps) {
  return (
    <>
      {/* ── Activity Trend + Occupancy Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="font-bold text-slate-900">Activity Trend</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Bookings &amp; viewings — last 6 months
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={monthlyData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gViewings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              <Area
                type="monotone"
                dataKey="bookings"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#gBookings)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="viewings"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#gViewings)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy donut — 1/3 width */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="mb-6">
            <h2 className="font-bold text-slate-900">Room Occupancy</h2>
            <p className="text-slate-400 text-xs mt-0.5">Current distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={occupancyData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {occupancyData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [value, name]}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {occupancyData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-slate-500">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Revenue Bar Chart ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-slate-900">Revenue Trend</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Monthly revenue — last 6 months (placeholder data)
            </p>
          </div>
          <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
            Revenue module coming soon
          </span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={monthlyData}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="revenue"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}