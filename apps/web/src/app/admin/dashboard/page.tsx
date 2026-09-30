"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Building2, Briefcase, DollarSign, UserX, Clock } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";

type AdminStats = {
  totalCoops: number;
  totalWorkers: number;
  verifiedWorkers: number;
  pendingWorkers: number;
  suspendedWorkers: number;
  totalConsumers: number;
  totalBookings: number;
  platformRevenue: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: AdminStats }>("/admin/stats");
      if (res.success) setStats(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl">
      {/* Command Center Header Card matching Landing Page Maroon Theme */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#FFFDFB] to-rose-50/30 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#800020]/10 text-[#800020] font-black text-2xl border border-[#800020]/20 shadow-2xs shrink-0">
              <Building2 className="h-7 w-7 text-[#800020]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-rose-50 text-[#800020] border border-rose-200/70 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                  Apex Platform Administration
                </span>
                <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5">
                  Ministry Super Admin
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight mt-1">
                सर्वकर्मक्षमः · Command Center
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                National Cooperative Gig Registry, KYC Verification Oversight & Escrow Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <Link href="/admin/coops">
              <Button className="rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white font-bold text-xs px-5 py-2.5 shadow-md shadow-[#800020]/20">
                <Building2 className="mr-1.5 h-4 w-4" /> Manage Co-ops
              </Button>
            </Link>
            <Link href="/admin/workers">
              <Button variant="outline" className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2.5">
                Review Technicians
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Core Vital KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Building2}
          label="Total Registered Co-ops"
          value={stats?.totalCoops ?? 0}
          subtitle="Regional artisan branches"
          color="maroon"
        />
        <StatsCard
          icon={Users}
          label="Total Certified Technicians"
          value={stats?.totalWorkers ?? 0}
          subtitle={`${stats?.verifiedWorkers ?? 0} Aadhaar verified`}
          color="emerald"
        />
        <StatsCard
          icon={Briefcase}
          label="Total Work Orders"
          value={stats?.totalBookings ?? 0}
          subtitle="Household service requests"
          color="blue"
        />
        <StatsCard
          icon={DollarSign}
          label="Platform Escrow Volume"
          value={formatCurrency(stats?.platformRevenue ?? 0)}
          subtitle="Protected cooperative GMV"
          color="amber"
        />
      </div>

      {/* Verification & Compliance Pipeline */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={Clock}
          label="Pending Verification"
          value={stats?.pendingWorkers ?? 0}
          subtitle="Awaiting KYC review"
          color="amber"
        />
        <StatsCard
          icon={Users}
          label="Active Verified Artisans"
          value={stats?.verifiedWorkers ?? 0}
          subtitle="On-duty eligible"
          color="emerald"
        />
        <StatsCard
          icon={UserX}
          label="Suspended Infractions"
          value={stats?.suspendedWorkers ?? 0}
          subtitle="Dispute hold active"
          color="red"
        />
      </div>

      {/* Verification Queue Action Hub */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-900 font-heading">
            DigiLocker & Government Trade Verification Queue
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit newly onboarded electricians, plumbers, and carpenters for Aadhaar match and skill certificates.
          </p>
        </CardHeader>
        <CardContent>
          {(stats?.pendingWorkers ?? 0) > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <div>
                <p className="text-sm font-bold text-amber-950">
                  {stats?.pendingWorkers} Technicians Awaiting Administrative Review
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Verify government credentials to activate neighborhood work order dispatch eligibility.
                </p>
              </div>
              <Link href="/admin/workers">
                <Button className="rounded-xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold px-4 py-2 shrink-0">
                  Open Verification Queue →
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
              Zero pending verifications in queue. All registered technicians have been audited and assigned to regional co-ops.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}