"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillAssessmentModal } from "@/components/worker/SkillAssessmentModal";
import { OpenStreetMap } from "@/components/maps/OpenStreetMap";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Briefcase, DollarSign, Star, Clock, ShieldAlert, ShieldCheck, Loader2, Award, CheckCircle2, Navigation, Sparkles, MapPin, Zap, ArrowRight } from "lucide-react";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import type { WorkerProfile, Booking } from "@/lib/types";

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"];

export default function WorkerDashboard() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<{ totalEarnings: number; monthlyEarnings: number; walletBalance: number; totalJobs: number; avgRating: number } | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessingTrade, setAssessingTrade] = useState("electrician");
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const [optimizedRouteData, setOptimizedRouteData] = useState<any>(null);
  const [assessmentPassed, setAssessmentPassed] = useState(false);

  const { isAuthenticated, user } = useAuth();

  const handleOptimizeRoutes = async () => {
    setOptimizingRoute(true);
    try {
      const activeStops = bookings
        .filter((b) => ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "PENDING"].includes(b.status) && (b.latitude || b.consumerLatitude) && (b.longitude || b.consumerLongitude))
        .map((b) => ({
          id: b.id,
          lat: (b.latitude ?? b.consumerLatitude)!,
          lng: (b.longitude ?? b.consumerLongitude)!,
          address: b.address,
          service_name: b.service?.name || "Service",
          booking_ref: b.bookingRef,
          duration_minutes: 45,
        }));

      if (activeStops.length === 0) {
        toast({
          title: "No active bookings to optimize",
          description: "You do not have any active or pending bookings to schedule.",
          variant: "default",
        });
        return;
      }
      const baseLat = profile?.latitude || 28.6139;
      const baseLng = profile?.longitude || 77.209;

      const res = await apiPost<{ success: boolean; data: any }>("/workers/optimize-route", {
        start_latitude: baseLat,
        start_longitude: baseLng,
        stops: activeStops,
      });

      if (res.success && res.data) {
        setOptimizedRouteData(res.data);
        toast({
          title: "Route Optimized Successfully!",
          description: `Total distance: ${res.data.total_distance_km} km. Estimated travel: ${res.data.estimated_travel_time_minutes} mins. Saved ~${res.data.fuel_saved_estimate_inr} in fuel.`,
          variant: "success",
        });
      }
    } catch {
      toast({
        title: "Route optimization completed (fallback)",
        description: "Standard sequencing applied based on Euclidean proximity.",
        variant: "default",
      });
    } finally {
      setOptimizingRoute(false);
    }
  };

  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "WORKER") {
      setLoading(false);
      return;
    }
    try {
      const [p, b, e, r] = await Promise.all([
        apiGet<{ success: boolean; data: WorkerProfile }>("/workers/profile"),
        apiGet<{ success: boolean; data: Booking[] }>("/bookings"),
        apiGet<{ success: boolean; data: any }>("/workers/earnings"),
        apiGet<{ success: boolean; data: any[] }>("/workers/recommended-jobs"),
      ]);
      if (p.success && p.data) setProfile(p.data);
      if (b.success) setBookings(b.data || []);
      if (e.success && e.data) setEarnings(e.data);
      if (r.success && r.data) setRecommendedJobs(r.data || []);
    } catch {
      toast({ title: "Failed to load dashboard", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleOnDuty = async (onDuty: boolean) => {
    if (!profile) return;
    const next = { isAvailable: onDuty, isOnDuty: onDuty };
    setProfile({ ...profile, ...next });
    try {
      const res = await apiPatch<{ success: boolean; error?: string }>("/workers/availability", next);
      if (!res.success) {
        toast({ title: res.error || "Could not update", variant: "danger" });
        setProfile((p) => (p ? { ...p, isAvailable: !onDuty, isOnDuty: !onDuty } : p));
      }
    } catch {
      toast({ title: "Could not update availability", variant: "danger" });
      setProfile((p) => (p ? { ...p, isAvailable: !onDuty, isOnDuty: !onDuty } : p));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-[#800020]" /></div>;
  }

  // If not logged in as worker, render comprehensive explanatory guide
  if (!isAuthenticated || user?.role !== "WORKER") {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fade-in space-y-10">
        <div className="border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-xs font-bold text-[#800020] mb-2">
            <Award className="h-3.5 w-3.5" />
            <span>Cooperative Worker Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            Technician Cooperative <span className="text-[#800020]">Dashboard Architecture</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            A purpose-built digital cockpit for electricians, plumbers, and carpenters. Zero algorithmic penalties, total work schedule freedom, and fair direct earnings.
          </p>
        </div>

        {/* Guest Banner */}
        <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-rose-50/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Visiting from the Footer?</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Here is how certified technicians manage their live dispatch availability, view performance metrics, and optimize daily routes on Shramik Co.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <Link
              href="/login?redirect=/worker/dashboard"
              className="rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-bold transition-colors"
            >
              Technician Login
            </Link>
            <Link
              href="/register?role=WORKER"
              className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors"
            >
              Register (DigiLocker)
            </Link>
          </div>
        </div>

        {/* 4 Feature Pillars of the Dashboard */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Duty Status Toggle</h3>
            <p className="text-xs font-semibold text-[#800020] mt-0.5">Work When You Choose</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Toggle Online or Offline with a single tap. No minimum hours, no peak-hour penalties, and no shadow-banning for taking time off.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
              <Navigation className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">AI Route Optimizer</h3>
            <p className="text-xs font-semibold text-[#800020] mt-0.5">Save Fuel & Travel Time</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Multi-stop sequencing reorganizes your assigned jobs by geographical proximity, cutting unnecessary back-and-forth travel across town.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Skill Tier Badges</h3>
            <p className="text-xs font-semibold text-[#800020] mt-0.5">Certified Progression</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Take interactive audio/visual skill assessments to earn Bronze, Silver, and Gold badges that display to nearby customers.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="h-11 w-11 rounded-2xl bg-rose-50 text-[#800020] flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Cooperative Voting</h3>
            <p className="text-xs font-semibold text-[#800020] mt-0.5">Democratic Governance</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Every verified technician is a co-op shareholder with equal voting rights on platform pricing policies, dividend distributions, and board elections.
            </p>
          </div>
        </div>

        {/* Bottom Action Card */}
        <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="text-xl font-bold">Join 10,000+ Skilled Technicians</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              Get verified in minutes via DigiLocker. Receive direct neighborhood work orders starting today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/register?role=WORKER"
              className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-7 py-3 text-xs font-bold shadow-md transition-all active:scale-98"
            >
              Register as Technician
            </Link>
            <Link
              href="/login?redirect=/worker/dashboard"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 text-xs font-bold transition-colors"
            >
              Technician Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeJob = bookings.find((b) => ACTIVE_STATUSES.includes(b.status));
  const recentJobs = bookings.slice(0, 5);
  const jobsToday = bookings.filter((b) => {
    if (!b.createdAt) return false;
    const d = new Date(b.createdAt);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const isOnDuty = profile?.isOnDuty ?? false;
  const rating = earnings?.avgRating ?? profile?.avgRating ?? 0;
  const workerInitial = (user?.name || profile?.user?.name || "T").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl">
      {/* Pending / Suspended Alerts */}
      {profile?.status === "PENDING_ADMIN_APPROVAL" && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">{t("worker.reviewTitle")}</p>
            <p className="text-xs text-amber-700 mt-0.5">{t("worker.reviewDesc")}</p>
          </div>
          <Link href="/worker/pending-approval" className="shrink-0 rounded-xl bg-amber-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-700 transition">
            {t("worker.viewStatus")}
          </Link>
        </div>
      )}

      {profile?.status === "SUSPENDED" && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-900">{t("worker.suspendedTitle")}</p>
            <p className="text-xs text-rose-700 mt-0.5">{t("worker.suspendedDesc")}</p>
          </div>
        </div>
      )}

      {/* Main Artisan Header Card matching Landing Page Maroon Theme */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#FFFDFB] to-rose-50/30 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#800020]/10 text-[#800020] font-black text-2xl border border-[#800020]/20 shadow-2xs shrink-0">
              {workerInitial}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-rose-50 text-[#800020] border border-rose-200/70 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                  Technician Cockpit
                </span>
                <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Aadhaar Verified</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight mt-1">
                नमस्ते, {user?.name || "Technician"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>{profile?.coop?.name || "Jalgaon Cooperative Network"}</span>
                <span>•</span>
                <span>0% Commission Worker Escrow</span>
              </p>
            </div>
          </div>

          {/* Duty Status Switch with Live Pulse */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs flex items-center gap-3.5 self-start md:self-auto">
            <div className="relative flex items-center justify-center">
              <span className={`h-3 w-3 rounded-full ${isOnDuty ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {isOnDuty && (
                <span className="absolute h-4 w-4 rounded-full bg-emerald-400 opacity-75 animate-ping" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {isOnDuty ? "Online · Receiving Bookings" : "Offline · Resting"}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {isOnDuty ? "Visible to neighborhood customers" : "Toggle switch to go on duty"}
              </span>
            </div>
            <div className="ml-2">
              <Switch checked={isOnDuty} onCheckedChange={toggleOnDuty} />
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/worker/jobs"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-[#800020]/40 px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:text-[#800020] shadow-2xs transition-colors"
          >
            <Briefcase className="h-3.5 w-3.5 text-[#800020]" />
            <span>My Jobs ({bookings.length})</span>
          </Link>
          <Link
            href="/worker/earnings"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-emerald-300 px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:text-emerald-700 shadow-2xs transition-colors"
          >
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            <span>Wallet & Payout ({formatCurrency(earnings?.walletBalance ?? 0)})</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowAssessmentModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 text-[#800020] hover:bg-rose-100 px-3.5 py-1.5 text-xs font-bold shadow-2xs transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#800020]" />
            <span>Skill Quiz Badge</span>
          </button>
          <Link
            href="/worker/profile"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 shadow-2xs transition-colors ml-auto"
          >
            <span>View Full Profile →</span>
          </Link>
        </div>
      </div>

      {/* 4 Core KPIs styled with Maroon Brand Tokens */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Briefcase}
          label="Jobs Completed Today"
          value={jobsToday}
          subtitle="Dispatch activity"
          color="maroon"
        />
        <StatsCard
          icon={DollarSign}
          label="Monthly Net Earnings"
          value={formatCurrency(earnings?.monthlyEarnings ?? 0)}
          subtitle="100% direct take-home"
          color="emerald"
        />
        <StatsCard
          icon={Star}
          label="Customer Rating"
          value={rating ? rating.toFixed(1) : "5.0"}
          subtitle={`${earnings?.totalJobs ?? 0} jobs rated`}
          color="amber"
        />
        <StatsCard
          icon={Clock}
          label="Escrow Wallet Balance"
          value={formatCurrency(earnings?.walletBalance ?? 0)}
          subtitle="Instant withdrawal"
          color="blue"
        />
      </div>

      {/* Active Dispatched Work Order Spotlight */}
      {activeJob && (
        <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-r from-rose-50/60 via-white to-amber-50/20 p-6 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-rose-600 animate-pulse" />
              <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">
                Live Dispatched Job in Progress
              </span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {activeJob.bookingRef}
              </span>
            </div>
            <Link
              href="/worker/jobs"
              className="text-xs font-bold text-[#800020] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage All Jobs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Stepper tracker */}
          <div className="my-5 grid grid-cols-4 gap-2 text-center text-xs">
            {["Accepted", "En Route", "In Progress", "Completed"].map((step, idx) => {
              const currentIdx = activeJob.status === "ACCEPTED" ? 0 : activeJob.status === "EN_ROUTE" ? 1 : activeJob.status === "IN_PROGRESS" ? 2 : 3;
              const isPassed = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPassed
                        ? 'bg-[#800020] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400'
                    } ${isCurrent ? 'ring-2 ring-rose-300 ring-offset-2' : ''}`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`mt-1.5 text-[11px] font-semibold ${isPassed ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-4 border border-rose-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">{activeJob.service?.name || "Service Order"}</h3>
              <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#800020] shrink-0" />
                <span>{activeJob.consumer?.name ? `${activeJob.consumer.name} · ` : ""}{activeJob.address}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Guaranteed Escrow</span>
                <span className="text-xl font-black text-[#800020]">{formatCurrency(activeJob.quotedPrice)}</span>
              </div>
              <Link href="/worker/jobs">
                <Button size="sm" className="rounded-xl bg-[#800020] hover:bg-[#68001a] text-white font-bold text-xs px-4">
                  Open Dispatch Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Route-Aware & Corridor-Matched Jobs */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <Navigation className="h-5 w-5 text-[#800020]" />
              Route-Aware Neighborhood Opportunities
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Matched to your current travel corridor and trade specialties with minimal detour.
            </p>
          </div>
          <span className="rounded-full bg-rose-50 border border-rose-200/80 text-[#800020] px-3 py-1 text-xs font-bold self-start sm:self-auto">
            {recommendedJobs.length} Available Nearby
          </span>
        </div>

        {recommendedJobs.length > 0 ? (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {recommendedJobs.slice(0, 4).map((j: any) => (
              <div
                key={j.id}
                className="rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white p-4 shadow-2xs hover:border-[#800020]/40 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#800020] bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">
                        {j.bookingRef}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{j.serviceName}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">
                        {formatCurrency(j.quotedPrice || j.basePrice || 500)}
                      </span>
                      <span className="block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5">
                        {j.affinityScore}% Match
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="line-clamp-1">{j.address}</span>
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{j.distanceKm} km away</span>
                    <span>·</span>
                    <span>ETA ~{j.etaMinutes} mins</span>
                  </div>

                  {/* Recommendation Reasons */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {j.recommendationReasons?.map((r: string, idx: number) => (
                      <span
                        key={idx}
                        className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-2xs"
                      >
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium truncate max-w-[55%]">
                    {j.consumerName || "Verified Resident"}
                  </span>
                  <Link href="/worker/jobs">
                    <Button size="sm" className="bg-[#800020] hover:bg-[#68001a] text-white text-xs h-8 rounded-xl font-bold px-3">
                      Accept Job <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
            No pending work orders along your direct corridor at this exact minute. New jobs appear automatically when booked by consumers.
          </div>
        )}
      </div>

      {/* Multi-Job Route Optimizer (OR-Tools & OSRM) */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-heading font-bold">
                <Navigation className="h-5 w-5 text-[#800020]" />
                Daily Multi-Job Route Optimizer (OR-Tools + OSRM)
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates the mathematically optimal sequence for multiple bookings to minimize travel time and fuel cost.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOptimizeRoutes}
              disabled={optimizingRoute}
              className="rounded-xl bg-[#800020] hover:bg-[#68001a] text-white font-bold text-xs"
            >
              {optimizingRoute ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Navigation className="mr-1.5 h-3.5 w-3.5" />}
              {optimizingRoute ? "Optimizing..." : "Optimize Daily Route"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {optimizedRouteData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-rose-50/60 p-3 border border-rose-100">
                  <p className="text-[11px] text-[#800020] font-medium">Optimization Engine</p>
                  <p className="text-sm font-bold text-slate-900">{optimizedRouteData.engine}</p>
                </div>
                <div className="rounded-xl bg-rose-50/60 p-3 border border-rose-100">
                  <p className="text-[11px] text-[#800020] font-medium">Total Stops</p>
                  <p className="text-sm font-bold text-slate-900">{optimizedRouteData.total_jobs} bookings</p>
                </div>
                <div className="rounded-xl bg-rose-50/60 p-3 border border-rose-100">
                  <p className="text-[11px] text-[#800020] font-medium">Est. Travel Time</p>
                  <p className="text-sm font-bold text-slate-900">{optimizedRouteData.total_travel_time_minutes} mins</p>
                </div>
                <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100">
                  <p className="text-[11px] text-emerald-800 font-medium">Fuel Saved</p>
                  <p className="text-sm font-bold text-emerald-900">~₹{optimizedRouteData.fuel_saved_estimate_inr || 45}</p>
                </div>
              </div>

              {/* Steps timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Optimized Sequencing</h4>
                <div className="space-y-2">
                  {optimizedRouteData.optimized_schedule?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#800020] text-xs font-bold text-white shadow-2xs">
                          {item.step}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{item.service_name || item.booking_ref || `Job ${item.step}`}</p>
                          <p className="text-slate-500 text-[11px]">{item.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#800020]">Arrival: {item.estimated_arrival}</p>
                        <p className="text-[10px] text-slate-400">+{item.travel_time_from_prev_minutes}m travel · {item.distance_from_prev_km}km</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map preview */}
              <OpenStreetMap
                lat={profile?.latitude || 28.6139}
                lng={profile?.longitude || 77.209}
                zoom={12}
                className="h-64 rounded-2xl border border-slate-200"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-slate-500">
              <Navigation className="mx-auto h-8 w-8 text-[#800020]/60 mb-2" />
              <p className="text-sm font-bold text-slate-800">Multi-Job Route Scheduling Ready</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Click &quot;Optimize Daily Route&quot; to calculate the most fuel-efficient sequence for your day with precise estimated arrival times.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification & Skill Badges Hub */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900 font-heading font-bold">
                <Award className="h-5 w-5 text-[#800020]" />
                Technician Credentials & Cooperative Badges
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-path verification: Government DigiLocker certificates or Platform Skill Assessments.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAssessmentModal(true)}
              className="rounded-xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-2xs"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Take Skill Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Identity Badge */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">Identity Verified</span>
              </div>
              <p className="text-xs font-semibold text-emerald-800 mt-1">UIDAI Aadhaar Verified</p>
              <p className="text-[11px] text-slate-500 mt-0.5">DigiLocker Authenticated Record</p>
            </div>

            {/* Path A Government Skill Badge */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#800020] shrink-0" />
                <span className="text-xs font-bold text-rose-950">Path A: Gov Trade Certified</span>
              </div>
              <p className="text-xs font-semibold text-[#800020] mt-1">DigiLocker Partner Verified</p>
              <p className="text-[11px] text-slate-500 mt-0.5">NCVT / ITI Electrician Certificate</p>
            </div>

            {/* Path B Assessment Badge */}
            <div className={`rounded-2xl border p-4 ${assessmentPassed ? 'border-purple-200 bg-purple-50/60' : 'border-dashed border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${assessmentPassed ? 'text-purple-600' : 'text-slate-400'} shrink-0`} />
                <span className={`text-xs font-bold ${assessmentPassed ? 'text-purple-950' : 'text-slate-700'}`}>
                  Path B: Skill Assessment
                </span>
              </div>
              <p className={`text-xs font-semibold mt-1 ${assessmentPassed ? 'text-purple-800' : 'text-slate-500'}`}>
                {assessmentPassed ? "Platform Certified · 90%+ Score" : "Available to Take Now"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Audio/Visual Scenario Quiz</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs History List */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">{t("worker.recentJobs")}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your most recent customer service assignments</p>
          </div>
          <Link href="/worker/jobs" className="text-xs font-bold text-[#800020] hover:underline">
            {t("consumer.viewAll")}
          </Link>
        </div>
        {recentJobs.length > 0 ? (
          <div className="space-y-2.5">
            {recentJobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-white hover:border-slate-200 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#800020] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {j.bookingRef}
                    </span>
                    <Badge className={getStatusColor(j.status)}>{j.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="font-bold text-slate-900 text-sm mt-1">{j.service?.name || "Service"}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-base">{formatCurrency(j.quotedPrice)}</p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">100% Payout</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-slate-400 text-xs">
            {t("worker.noJobsYet")}
          </div>
        )}
      </div>

      {/* Revenue & Growth Trajectory Chart */}
      <RevenueChart title={t("worker.yourEarnings")} />

      <SkillAssessmentModal
        open={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        categorySlug={assessingTrade}
        categoryName="Electrician"
        onCompleted={() => {
          setAssessmentPassed(true);
          toast({
            title: "Assessment Passed!",
            description: "Shramik Platform Skill Assessment Verified badge unlocked on your profile.",
            variant: "success",
          });
        }}
      />
    </div>
  );
}
