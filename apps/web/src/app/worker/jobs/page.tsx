"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  Navigation,
  Wrench,
  PlayCircle,
  Loader2,
  Briefcase,
  ShieldCheck,
  Zap,
  ArrowRight,
  Receipt,
  KeyRound,
  CheckCircle2,
  Smartphone,
  Lock,
} from "lucide-react";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { IncomingOrderRequestCard } from "@/components/worker/IncomingOrderRequestCard";
import type { Booking, BookingStatus, Order } from "@/lib/types";

type TabFilter = "PENDING" | "ACTIVE" | "COMPLETED";

const tabs: { label: string; filter: TabFilter }[] = [
  { label: "New Requests", filter: "PENDING" },
  { label: "Active", filter: "ACTIVE" },
  { label: "Completed", filter: "COMPLETED" },
];

const ACTIVE_STATUSES: BookingStatus[] = ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS"];

const workerWorkflowSteps = [
  {
    step: "01",
    icon: MapPin,
    title: "Hyperlocal Broadcast",
    subtitle: "Real-time 5-10 km Radius",
    description:
      "When a customer in your neighborhood needs help, your app receives an instant alert showing the exact service required, travel distance, and guaranteed fare.",
    badge: "No Bidding Wars",
  },
  {
    step: "02",
    icon: Zap,
    title: "1-Tap Accept or Skip",
    subtitle: "100% Worker Autonomy",
    description:
      "You are your own boss. Accept the job with 1 tap or let it pass with zero penalties, rating drops, or account suspensions. No forced dispatches.",
    badge: "Zero Penalties",
  },
  {
    step: "03",
    icon: Navigation,
    title: "Turn-by-Turn Arrival",
    subtitle: "In-App Doorstep Navigation",
    description:
      "Use built-in OpenStreetMap directions to reach the customer. Direct in-app call or chat connects you without revealing personal mobile numbers.",
    badge: "Direct Contact",
  },
  {
    step: "04",
    icon: KeyRound,
    title: "Start OTP Verification",
    subtitle: "Protects Your Time & Safety",
    description:
      "Ask the customer for their 4-digit start OTP upon arrival. This starts the official service timer and guarantees your base ₹50 + travel allowance is recorded.",
    badge: "Guaranteed Base",
  },
  {
    step: "05",
    icon: Receipt,
    title: "Parts Receipt Upload",
    subtitle: "Zero Dispute Material Billing",
    description:
      "Need a replacement capacitor, valve, or switch? Snap a photo of the local shop invoice. The customer approves it digitally on their screen.",
    badge: "Direct Reimbursed",
  },
  {
    step: "06",
    icon: CheckCircle2,
    title: "Completion & Instant UPI",
    subtitle: "100% of Labour to Your Account",
    description:
      "Enter the customer's completion OTP. Payment settles immediately to your linked bank account or UPI ID. ₹0 platform cut.",
    badge: "Instant Payout",
  },
];

export default function WorkerJobsPage() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [viewMode, setViewMode] = useState<"jobs" | "guide">(
    isAuthenticated && user?.role === "WORKER" ? "jobs" : "guide"
  );
  const [activeTab, setActiveTab] = useState<TabFilter>("PENDING");
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [orderRequests, setOrderRequests] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "WORKER") return;
    setLoading(true);
    try {
      const [bookingsRes, ordersRes] = await Promise.all([
        apiGet<{ success: boolean; data: Booking[] }>("/bookings"),
        apiGet<{ success: boolean; data: Order[] }>("/orders/worker/requests"),
      ]);
      if (bookingsRes.success) setJobs(bookingsRes.data || []);
      if (ordersRes.success) setOrderRequests(ordersRes.data || []);
    } catch {
      toast({ title: "Failed to load jobs", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, toast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await apiPost<{ success: boolean; message?: string }>(
        `/orders/${orderId}/accept`,
        {}
      );
      if (res.success) {
        toast({
          title: "Order Request Accepted!",
          description: "Full service location released. Doorstep service scheduled.",
          variant: "success",
        });
        fetchJobs();
      }
    } catch (err: any) {
      toast({
        title: "Could not accept order",
        description: err.response?.data?.error || err.message,
        variant: "danger",
      });
    }
  };

  const handleRejectOrder = async (orderId: string, reason: string, customNote?: string) => {
    try {
      const res = await apiPost<{ success: boolean; message?: string }>(
        `/orders/${orderId}/reject`,
        { reason, customNote }
      );
      if (res.success) {
        toast({
          title: "Order Declined",
          description: "Customer has been respectfully notified to select another technician.",
          variant: "default",
        });
        fetchJobs();
      }
    } catch (err: any) {
      toast({
        title: "Could not decline order",
        description: err.response?.data?.error || err.message,
        variant: "danger",
      });
    }
  };

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    setBusyId(booking.id);
    try {
      const res = await apiPatch<{ success: boolean; error?: string }>(`/bookings/${booking.id}/status`, { status });
      if (res.success) {
        toast({ title: "Status updated", variant: "success" });
        fetchJobs();
      } else {
        toast({ title: res.error || "Could not update status", variant: "danger" });
      }
    } catch {
      toast({ title: "Could not update status", variant: "danger" });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = jobs.filter((j) => {
    if (activeTab === "PENDING") return j.status === "PENDING";
    if (activeTab === "ACTIVE") return ACTIVE_STATUSES.includes(j.status);
    return j.status === "COMPLETED";
  });

  const pendingCount =
    jobs.filter((j) => j.status === "PENDING").length + orderRequests.length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fade-in space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-xs font-bold text-[#800020] mb-2">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Technician Work Orders & Dispatch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            Assigned Jobs & <span className="text-[#800020]">Work Orders</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            View assigned repair tickets, manage turn-by-turn doorstep workflow, and understand how Shramik dispatches verified jobs.
          </p>
        </div>

        {/* View Switcher Tabs (if authenticated worker) */}
        {isAuthenticated && user?.role === "WORKER" && (
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("jobs")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "jobs" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              My Live Jobs ({jobs.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("guide")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "guide" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              How Jobs Work (Guide)
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: AUTHENTICATED WORKER ACTIVE JOBS */}
      {viewMode === "jobs" && isAuthenticated && user?.role === "WORKER" && (
        <div className="space-y-6">
          <div className="flex gap-1 border-b border-slate-200">
            {tabs.map((t) => (
              <button
                key={t.label}
                onClick={() => setActiveTab(t.filter)}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
                  activeTab === t.filter
                    ? "border-[#800020] text-[#800020]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                {t.label}
                {t.filter === "PENDING" && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#800020] text-[10px] text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Phase 4 Incoming Order Requests from Problem Selection Flow */}
              {activeTab === "PENDING" && orderRequests.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>Direct Customer Problem Requests ({orderRequests.length})</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        Location Privacy Protected
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {orderRequests.map((order) => (
                      <IncomingOrderRequestCard
                        key={order.id}
                        order={order}
                        onAccept={handleAcceptOrder}
                        onReject={handleRejectOrder}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filtered.length > 0 ? (
                <div className="space-y-4">
              {filtered.map((j) => (
                <div key={j.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{j.service?.name || "Repair Service"}</span>
                        <Badge className="bg-rose-50 text-[#800020] border-rose-200">{j.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Ref: {j.bookingRef} · {formatDateTime(j.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{formatCurrency(j.quotedPrice || 50)}</span>
                      <p className="text-[10px] text-emerald-600 font-bold">100% Worker Payout</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#800020] shrink-0" />
                      <span>{j.address || "Customer Doorstep Address"}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{j.consumer?.phone || "+91-Customer Phone"}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-wrap items-center gap-2.5">
                    {j.status === "PENDING" && (
                      <Button
                        size="sm"
                        className="bg-[#800020] hover:bg-[#66001a] text-white font-bold"
                        disabled={busyId === j.id}
                        onClick={() => updateStatus(j, "ACCEPTED")}
                      >
                        Accept Work Order
                      </Button>
                    )}
                    {j.status === "ACCEPTED" && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        disabled={busyId === j.id}
                        onClick={() => updateStatus(j, "EN_ROUTE")}
                      >
                        Start Journey (En Route)
                      </Button>
                    )}
                    {j.status === "EN_ROUTE" && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                        disabled={busyId === j.id}
                        onClick={() => updateStatus(j, "IN_PROGRESS")}
                      >
                        Check-in (Enter Start OTP)
                      </Button>
                    )}
                    {j.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        disabled={busyId === j.id}
                        onClick={() => updateStatus(j, "COMPLETED")}
                      >
                        Complete Job (Enter Stop OTP)
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <p className="text-sm text-slate-400">No jobs currently in this tab</p>
              <button
                type="button"
                onClick={() => setViewMode("guide")}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 text-xs font-semibold"
              >
                <span>Read Dispatch Workflow Guide</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )}

      {/* VIEW 2: COMPREHENSIVE TEXTUAL & GRAPHICAL WORKER JOBS GUIDE */}
      {(viewMode === "guide" || !isAuthenticated || user?.role !== "WORKER") && (
        <div className="space-y-12">
          {/* Guest Info Alert */}
          {!isAuthenticated && (
            <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-rose-50/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Visiting from the Footer?</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    This page illustrates how Shramik assigns jobs to technicians, protects worker earnings, and provides total autonomy without platform commissions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Link
                  href="/login?redirect=/worker/jobs"
                  className="rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-bold transition-colors"
                >
                  Technician Login
                </Link>
                <Link
                  href="/register?role=WORKER"
                  className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors"
                >
                  Join as Technician
                </Link>
              </div>
            </div>
          )}

          {/* Stepper Cards */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">Technician Protection</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                How Assigned Jobs Work for Technicians
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Engineered for respect, fair compensation, and zero exploitation. Here is the lifecycle from dispatch to instant bank payout.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workerWorkflowSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-11 w-11 rounded-2xl bg-rose-50 text-[#800020] border border-rose-100 flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-3xl font-black text-slate-200 group-hover:text-[#800020]/20 transition-colors font-heading">
                        {item.step}
                      </span>
                    </div>
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 mb-2 uppercase tracking-wide">
                      {item.badge}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs font-semibold text-[#800020] mt-0.5">{item.subtitle}</p>
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mock Job Card Walkthrough */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Live Job Dispatch Ticket Anatomy</h3>
            <p className="text-xs text-slate-500 mb-8 max-w-xl">
              Technicians see everything upfront before committing. No guessing, no hidden travel costs:
            </p>

            <div className="mx-auto max-w-xl rounded-3xl border-2 border-dashed border-[#800020]/30 bg-rose-50/20 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1">
                  NEW BROADCAST · 2.8 km AWAY
                </span>
                <span className="text-xl font-black text-[#800020]">₹65.00 Base</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Ceiling Fan Motor Humming & Sparking</h4>
                <p className="text-xs text-slate-500 mt-0.5">Electrical Category · Jalgaon Local Geofence</p>
              </div>
              <div className="rounded-2xl bg-white p-4 space-y-2 border border-slate-200 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Labour Fare:</span>
                  <strong className="text-slate-900">₹50.00</strong>
                </div>
                <div className="flex justify-between">
                  <span>Travel Allowance (2.8 km):</span>
                  <strong className="text-slate-900">₹15.00</strong>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-100">
                  <span>Your Net Take-Home:</span>
                  <span>100% (₹65.00)</span>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-[#800020] text-white py-2.5 text-xs font-bold shadow-xs hover:bg-[#66001a]"
                >
                  Accept Work Order
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white text-slate-600 px-4 py-2.5 text-xs font-semibold hover:bg-slate-50"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div>
              <h3 className="text-xl font-bold">Are You an Electrician, Plumber, or Carpenter?</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                Join our verified cooperative worker network. DigiLocker onboarding takes less than 2 minutes.
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
                href="/login?redirect=/worker/jobs"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 text-xs font-bold transition-colors"
              >
                Technician Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
