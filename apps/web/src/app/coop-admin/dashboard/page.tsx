"use client";

import { useState, useEffect, useCallback } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { WorkerGrid } from "@/components/dashboard/WorkerGrid";
import { Users, Briefcase, DollarSign, Percent, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import Link from "next/link";
import type { WorkerProfile } from "@/lib/types";

import { useI18n } from "@/i18n/I18nProvider";

interface CoopStats {
  totalWorkers: number;
  activeWorkers: number;
  totalBookings: number;
  monthlyBookings: number;
  completedBookings: number;
  totalRevenue: number;
  totalCommission: number;
  monthlyRevenue: number;
  yearlyCommission: number;
  totalServices: number;
}

export default function CoopAdminDashboard() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [coopName, setCoopName] = useState<string>("");
  const [coopId, setCoopId] = useState<string>("");
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [stats, setStats] = useState<CoopStats | null>(null);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const me = await apiGet<{ success: boolean; data: any }>("/coops/me");
      if (!me.success || !me.data) throw new Error("coop not found");
      const cid = me.data.id;
      setCoopId(cid);
      setCoopName(me.data.name);
      setCommissionRate(Number(me.data.commissionRate) || 0);
      const [d, w] = await Promise.all([
        apiGet<{ success: boolean; data: { stats: CoopStats } }>(`/coops/${cid}/dashboard`),
        apiGet<{ success: boolean; data: WorkerProfile[] }>(`/coops/${cid}/workers?status=ALL`),
      ]);
      if (d.success && d.data) setStats(d.data.stats);
      if (w.success && w.data) setWorkers(w.data);
    } catch {
      toast({ title: "Failed to load dashboard", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleVerify = async (id: string) => {
    try {
      const res = await apiPost<{ success: boolean; error?: string }>(`/coops/${coopId}/workers/${id}/approve`, { note: "Approved from dashboard" });
      if (res.success) toast({ title: "Worker approved", variant: "success" });
      else toast({ title: res.error || "Could not approve", variant: "danger" });
      fetchAll();
    } catch { toast({ title: "Could not approve worker", variant: "danger" }); }
  };

  const handleSuspend = async (id: string) => {
    try {
      const res = await apiPost<{ success: boolean; error?: string }>(`/coops/${coopId}/workers/${id}/reject`, { reason: "Suspended by admin" });
      if (res.success) toast({ title: "Worker suspended", variant: "success" });
      else toast({ title: res.error || "Could not suspend", variant: "danger" });
      fetchAll();
    } catch { toast({ title: "Could not suspend worker", variant: "danger" }); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-[#800020]" />
        <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Loading Cooperative Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in max-w-6xl pb-12">
      {/* Cooperative Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-rose-50/70 pointer-events-none blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/70 text-[#800020] text-xs font-bold tracking-wide uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-[#800020] animate-pulse" />
              सर्वकर्मक्षमः · District Cooperative Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 tracking-tight">
              {coopName || t("coop.dashboardTitle")}
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-xl font-medium">
              Registered Multi-Trade Cooperative Society. Direct member dispatch, transparent peer payouts, and community safety enforcement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active Cooperative Status
            </div>
            <Link
              href="/coop-admin/workers"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-sm transition-all hover:shadow-md"
            >
              <Users className="w-3.5 h-3.5" />
              Manage Roster
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} label={t("coop.totalWorkers")} value={stats?.totalWorkers ?? 0} color="maroon" trend={{ value: 8, isUp: true }} />
        <StatsCard icon={Briefcase} label={t("coop.activeBookings")} value={(stats?.totalBookings ?? 0) - (stats?.completedBookings ?? 0)} color="rose" />
        <StatsCard icon={DollarSign} label={t("coop.monthlyRevenue")} value={formatCurrency(stats?.monthlyRevenue ?? 0)} color="emerald" trend={{ value: 14, isUp: true }} />
        <StatsCard icon={Percent} label={t("coop.commissionRate")} value={`${commissionRate}%`} color="amber" />
      </div>

      {/* Revenue & Operations Chart */}
      <RevenueChart title={t("coop.coopRevenue")} />

      {/* Worker Roster Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-black text-slate-900">{t("coop.workers")}</h2>
            <p className="text-xs text-slate-500 font-medium">Verified local technicians enrolled in this district cooperative</p>
          </div>
          <Link
            href="/coop-admin/workers"
            className="text-xs font-bold text-[#800020] hover:text-[#68001a] px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
          >
            {t("coop.manageAll")} →
          </Link>
        </div>

        {workers.length > 0 ? (
          <WorkerGrid
            workers={workers}
            onVerify={handleVerify}
            onSuspend={handleSuspend}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">{t("coop.noWorkers")}</p>
            <p className="text-xs text-slate-400 mt-1">Technicians enrolled under this society will appear here for verification.</p>
          </div>
        )}
      </div>
    </div>
  );
}
