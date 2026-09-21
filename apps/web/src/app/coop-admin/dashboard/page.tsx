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
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">{t("coop.dashboardTitle")}</h1>
        <p className="text-gray-500 mt-1">{coopName || "Cooperative"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} label={t("coop.totalWorkers")} value={stats?.totalWorkers ?? 0} color="indigo" />
        <StatsCard icon={Briefcase} label={t("coop.activeBookings")} value={(stats?.totalBookings ?? 0) - (stats?.completedBookings ?? 0)} color="blue" />
        <StatsCard icon={DollarSign} label={t("coop.monthlyRevenue")} value={formatCurrency(stats?.monthlyRevenue ?? 0)} color="emerald" />
        <StatsCard icon={Percent} label={t("coop.commissionRate")} value={`${commissionRate}%`} color="amber" />
      </div>

      <RevenueChart title={t("coop.coopRevenue")} />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("coop.workers")}</h2>
          <Link href="/coop-admin/workers" className="text-sm text-indigo-600 hover:text-indigo-500">{t("coop.manageAll")}</Link>
        </div>
        {workers.length > 0 ? (
          <WorkerGrid
            workers={workers}
            onVerify={handleVerify}
            onSuspend={handleSuspend}
          />
        ) : (
          <div className="rounded-xl border bg-white py-10 text-center text-gray-400">{t("coop.noWorkers")}</div>
        )}
      </div>
    </div>
  );
}
