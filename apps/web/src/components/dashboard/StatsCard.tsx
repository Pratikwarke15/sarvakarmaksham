"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isUp: boolean };
  color?: "maroon" | "rose" | "indigo" | "emerald" | "amber" | "red" | "blue";
}

const colorMap = {
  maroon: "bg-rose-50 text-[#800020] border border-rose-200/80",
  rose: "bg-rose-50/80 text-[#800020] border border-rose-100",
  indigo: "bg-[#800020]/10 text-[#800020] border border-[#800020]/20",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  amber: "bg-amber-50 text-amber-800 border border-amber-200/80",
  red: "bg-rose-50 text-rose-700 border border-rose-200/80",
  blue: "bg-sky-50 text-sky-800 border border-sky-200/80",
};

export function StatsCard({ icon: Icon, label, value, subtitle, trend, color = "maroon" }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 group flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 duration-200", colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
              trend.isUp ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
            )}
          >
            {trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-3.5">
        <p className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
