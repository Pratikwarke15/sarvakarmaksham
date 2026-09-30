"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  data?: { month: string; revenue: number }[];
  title?: string;
}

export function RevenueChart({ data, title = "Monthly Revenue" }: RevenueChartProps) {
  const chartData = data && data.length > 0 ? data : [
    { month: "Jan", revenue: 0 },
    { month: "Feb", revenue: 0 },
    { month: "Mar", revenue: 0 },
    { month: "Apr", revenue: 0 },
    { month: "May", revenue: 0 },
    { month: "Jun", revenue: 0 },
  ];

  const totalRev = chartData.reduce((sum, d) => sum + d.revenue, 0);
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Escrow-cleared job revenue & cooperative distributions</p>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-200/70 px-3 py-1 text-xs font-bold text-[#800020] self-start sm:self-auto">
          Total: {formatCurrency(totalRev)}
        </div>
      </div>
      {totalRev === 0 && (
        <p className="mb-2 text-xs text-slate-400">Baseline simulated trajectory shown below until real jobs conclude.</p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#800020" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#800020" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" tickFormatter={(v) => `${v}`} />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), "Co-op Volume"]}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)" }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#800020" strokeWidth={2.5} fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
