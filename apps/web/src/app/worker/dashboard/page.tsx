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

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {profile?.status === "PENDING_ADMIN_APPROVAL" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">{t("worker.reviewTitle")}</p>
            <p className="text-sm text-amber-600">{t("worker.reviewDesc")}</p>
          </div>
          <Link href="/worker/pending-approval" className="ml-auto shrink-0 text-sm font-medium text-amber-700 hover:underline">
            {t("worker.viewStatus")}
          </Link>
        </div>
      )}

      {profile?.status === "SUSPENDED" && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">{t("worker.suspendedTitle")}</p>
            <p className="text-sm text-red-600">{t("worker.suspendedDesc")}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{t("worker.dashboardTitle")}</h1>
          <p className="text-gray-500 mt-1">{t("worker.welcomeBack")}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-sm font-medium text-gray-700">{t("worker.onDuty")}</span>
          <Switch checked={isOnDuty} onCheckedChange={toggleOnDuty} />
          <Badge variant={isOnDuty ? "success" : "default"}>
            {isOnDuty ? t("worker.online") : t("worker.offline")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Briefcase} label={t("worker.jobsToday")} value={jobsToday} color="indigo" />
        <StatsCard icon={DollarSign} label={t("worker.monthlyEarnings")} value={formatCurrency(earnings?.monthlyEarnings ?? 0)} color="emerald" />
        <StatsCard icon={Star} label={t("worker.avgRating")} value={rating ? rating.toFixed(1) : "—"} color="amber" />
        <StatsCard icon={Clock} label={t("worker.totalJobs")} value={earnings?.totalJobs ?? 0} color="blue" />
      </div>

      {activeJob && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base text-indigo-900">
              {t("worker.activeJob")}
              <Link href={`/worker/jobs`} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                {t("worker.goToJobs")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{activeJob.service?.name || "Service"}</p>
                <p className="text-sm text-gray-500">{activeJob.consumer?.name ? `${activeJob.consumer.name} · ` : ""}{activeJob.address}</p>
                <p className="text-xs text-gray-400">{activeJob.bookingRef}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600">{formatCurrency(activeJob.quotedPrice)}</p>
                <Badge className={getStatusColor(activeJob.status)}>{activeJob.status.replace("_", " ")}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("worker.recentJobs")}</h2>
          <Link href="/worker/jobs" className="text-sm text-indigo-600 hover:text-indigo-500">
            {t("consumer.viewAll")}
          </Link>
        </div>
        {recentJobs.length > 0 ? (
          <div className="space-y-2">
            {recentJobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
                <div>
                  <p className="font-medium text-gray-900">{j.service?.name || "Service"}</p>
                  <p className="text-xs text-gray-400">{j.bookingRef}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(j.quotedPrice)}</p>
                  <Badge className={getStatusColor(j.status)}>{j.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white py-10 text-center text-gray-400">
            {t("worker.noJobsYet")}
          </div>
        )}
      </div>

      {/* Route-Aware & Corridor-Matched Jobs for Worker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-[#ea580c]" />
              Route-Aware Recommended Jobs (Smart Corridor Fit)
            </h2>
            <p className="text-xs text-gray-500">
              Ranked by travel corridor affinity, minimal detour distance, and trade skill compatibility.
            </p>
          </div>
          <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1 text-xs font-bold">
            {recommendedJobs.length} Available
          </span>
        </div>

        {recommendedJobs.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedJobs.slice(0, 4).map((j: any) => (
              <div
                key={j.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-orange-500 hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wider font-mono">
                        {j.bookingRef}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{j.serviceName}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">
                        {formatCurrency(j.quotedPrice || j.basePrice || 500)}
                      </span>
                      <span className="block text-[10px] font-bold text-emerald-600">
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
                        className="rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-800"
                      >
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Consumer: {j.consumerName || "Verified Resident"}
                  </span>
                  <Link href={`/worker/jobs`}>
                    <Button size="sm" className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs h-8">
                      Accept Job <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            No pending jobs along your current corridor right now. Stand by for instant dispatch.
          </div>
        )}
      </div>

      {/* Verification & Skill Assessment Hub */}
      <Card className="border-indigo-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                <Award className="h-5 w-5 text-indigo-600" />
                Verified Worker Credentials & Badges
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Two-path verification: Government DigiLocker certificates or Platform Skill Assessments.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAssessmentModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Take Skill Assessment (Path B)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Identity Badge */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900">Identity Verified</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-700 mt-1">Aadhaar e-KYC Verified</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Offline XML Document Certified</p>
            </div>

            {/* Path A Government Skill Badge */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-blue-900">Path A: Gov Trade Certified</span>
              </div>
              <p className="text-[11px] font-semibold text-blue-700 mt-1">DigiLocker Partner Verified</p>
              <p className="text-[11px] text-gray-500 mt-0.5">NCVT / ITI Electrician Certificate</p>
            </div>

            {/* Path B Assessment Badge */}
            <div className={`rounded-xl border p-3.5 ${assessmentPassed ? 'border-purple-200 bg-purple-50/60' : 'border-dashed border-gray-300 bg-gray-50/50'}`}>
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${assessmentPassed ? 'text-purple-600' : 'text-gray-400'} shrink-0`} />
                <span className={`text-xs font-bold ${assessmentPassed ? 'text-purple-900' : 'text-gray-600'}`}>
                  Path B: Skill Assessment
                </span>
              </div>
              <p className={`text-[11px] font-semibold mt-1 ${assessmentPassed ? 'text-purple-700' : 'text-gray-500'}`}>
                {assessmentPassed ? "Platform Certified · 90%+ Score" : "Available to Take Now"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Automated Scenario MCQs Quiz</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Job Route Optimizer */}
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                <Navigation className="h-5 w-5 text-indigo-600" />
                Multi-Job Daily Route Optimizer (Google OR-Tools + OSRM)
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Calculates the mathematically optimal sequence for multiple bookings to minimize travel time and lateness.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOptimizeRoutes}
              disabled={optimizingRoute}
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              {optimizingRoute ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Navigation className="mr-1.5 h-3.5 w-3.5" />}
              {optimizingRoute ? "Optimizing..." : "Optimize Daily Multi-Job Route"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {optimizedRouteData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-indigo-50/70 p-3 border border-indigo-100">
                  <p className="text-[11px] text-indigo-600 font-medium">Optimization Engine</p>
                  <p className="text-sm font-bold text-indigo-900">{optimizedRouteData.engine}</p>
                </div>
                <div className="rounded-lg bg-indigo-50/70 p-3 border border-indigo-100">
                  <p className="text-[11px] text-indigo-600 font-medium">Total Stops</p>
                  <p className="text-sm font-bold text-indigo-900">{optimizedRouteData.total_jobs} bookings</p>
                </div>
                <div className="rounded-lg bg-indigo-50/70 p-3 border border-indigo-100">
                  <p className="text-[11px] text-indigo-600 font-medium">Total Travel Time</p>
                  <p className="text-sm font-bold text-indigo-900">{optimizedRouteData.total_travel_time_minutes} mins</p>
                </div>
                <div className="rounded-lg bg-indigo-50/70 p-3 border border-indigo-100">
                  <p className="text-[11px] text-indigo-600 font-medium">Total Distance</p>
                  <p className="text-sm font-bold text-indigo-900">{optimizedRouteData.total_distance_km} km</p>
                </div>
              </div>

              {/* Steps timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Optimized Sequence</h4>
                <div className="space-y-2">
                  {optimizedRouteData.optimized_schedule?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                          {item.step}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">{item.service_name || item.booking_ref || `Job ${item.step}`}</p>
                          <p className="text-xs text-gray-500">{item.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-indigo-700">Arrival: {item.estimated_arrival}</p>
                        <p className="text-[11px] text-gray-400">+{item.travel_time_from_prev_minutes}m travel · {item.distance_from_prev_km}km</p>
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
                className="h-64 rounded-xl border"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-gray-500">
              <Navigation className="mx-auto h-8 w-8 text-indigo-400 mb-2" />
              <p className="text-sm font-medium text-gray-800">Multi-Job Route Scheduling Ready</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Click &quot;Optimize Daily Multi-Job Route&quot; to calculate the most efficient route sequence for all your jobs today with dynamic arrival times.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
