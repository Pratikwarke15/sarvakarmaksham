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
  Volume2,
  User,
  TrendingUp,
  Clock,
  Sparkles,
  ExternalLink,
  Film,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDateTime, getStatusColor, resolveMediaUrl } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { IncomingOrderRequestCard } from "@/components/worker/IncomingOrderRequestCard";
import { PriceNegotiationModal } from "@/components/worker/PriceNegotiationModal";
import { CommunicationConsentCard } from "@/components/calling/CommunicationConsentCard";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import type { Booking, BookingStatus, Order, OrderStatus } from "@/lib/types";


type TabFilter = "PENDING" | "ACTIVE" | "COMPLETED";

const tabs: { label: string; filter: TabFilter }[] = [
  { label: "New Requests", filter: "PENDING" },
  { label: "Active Jobs", filter: "ACTIVE" },
  { label: "Completed", filter: "COMPLETED" },
];

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS"];

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "ACCEPTED" as any,
  "NEGOTIATION" as any,
  "CONFIRMED" as any,
  "TRAVELLING" as any,
  "ARRIVED" as any,
  "IN_PROGRESS" as any,
  "PAYMENT_PENDING" as any,
];

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
  const [workerOrders, setWorkerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [updatingStateId, setUpdatingStateId] = useState<string | null>(null);
  const [negotiatingOrder, setNegotiatingOrder] = useState<Order | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "WORKER") return;
    setLoading(true);
    try {
      const [bookingsRes, ordersRes, workerOrdersRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: Booking[] }>("/bookings"),
        apiGet<{ success: boolean; data: Order[] }>("/orders/worker/requests"),
        apiGet<{ success: boolean; data: Order[] }>("/orders/worker"),
      ]);

      if (bookingsRes.status === "fulfilled" && bookingsRes.value.success) {
        setJobs(bookingsRes.value.data || []);
      }
      if (ordersRes.status === "fulfilled" && ordersRes.value.success) {
        setOrderRequests(ordersRes.value.data || []);
      }
      if (workerOrdersRes.status === "fulfilled" && workerOrdersRes.value.success) {
        setWorkerOrders(workerOrdersRes.value.data || []);
      }
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
        setActiveTab("ACTIVE");
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
          description: "Customer has been notified to select another technician.",
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

  const handleAdvanceOperationalState = async (
    orderId: string,
    nextState: "TRAVELLING" | "ARRIVED" | "WORKING" | "COMPLETED"
  ) => {
    try {
      setUpdatingStateId(orderId);
      const res = await apiPatch<{
        success: boolean;
        operationalState: string;
        message?: string;
      }>(`/orders/${orderId}/operational-state`, { operationalState: nextState });

      if (res.success) {
        toast({
          title: `Status Updated: ${nextState}`,
          description: res.message || "Operational stage advanced.",
          variant: nextState === "COMPLETED" ? "success" : "default",
        });
        if (nextState === "COMPLETED") {
          setActiveTab("COMPLETED");
        }
        await fetchJobs();
      }
    } catch (err: any) {
      toast({
        title: "State Update Failed",
        description: err.message || "Cannot advance operational state.",
        variant: "danger",
      });
    } finally {
      setUpdatingStateId(null);
    }
  };

  const updateBookingStatus = async (booking: Booking, status: BookingStatus) => {
    setBusyId(booking.id);
    try {
      const res = await apiPatch<{ success: boolean; error?: string }>(
        `/bookings/${booking.id}/status`,
        { status }
      );
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

  // Combine and deduplicate orders across sources
  const allOrdersMap = new Map<string, Order>();
  orderRequests.forEach((o) => allOrdersMap.set(o.id, o));
  workerOrders.forEach((o) => allOrdersMap.set(o.id, o));
  const combinedOrders = Array.from(allOrdersMap.values());

  // Filtered lists per tab
  const pendingOrders = combinedOrders.filter((o) => o.status === ("REQUESTED" as any));
  const pendingBookings = jobs.filter((j) => j.status === "PENDING");
  const pendingCount = pendingOrders.length + pendingBookings.length;

  const activeOrders = combinedOrders.filter((o) =>
    ACTIVE_ORDER_STATUSES.includes(o.status as any)
  );
  const activeBookings = jobs.filter((j) => ACTIVE_BOOKING_STATUSES.includes(j.status));
  const activeCount = activeOrders.length + activeBookings.length;

  const completedOrders = combinedOrders.filter(
    (o) => o.status === ("COMPLETED" as any) || o.paymentStatus === "PAID"
  );
  const completedBookings = jobs.filter((j) => j.status === "COMPLETED");
  const completedCount = completedOrders.length + completedBookings.length;

  const totalMyJobsCount = activeCount + completedCount;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-2 sm:py-10 animate-fade-in space-y-4 sm:space-y-8">
      {/* Mobile Page Header */}
      <MobilePageHeader
        title="Assigned Jobs"
        subtitle={`${activeCount} active, ${pendingCount} pending`}
        backHref="/worker/dashboard"
        action={
          <button
            type="button"
            onClick={fetchJobs}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 active:bg-slate-100 rounded-full transition-colors"
            title="Refresh jobs"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-[#800020]")} />
          </button>
        }
      />

      {/* Top Header for Desktop */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-xs font-bold text-[#800020] mb-2">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Technician Work Orders & Dispatch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            Assigned Jobs & <span className="text-[#800020]">Work Orders</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
            Manage your live doorstep jobs, respond to customer requests, and track your completed assignments.
          </p>
        </div>

        {/* View Switcher Tabs (if authenticated worker) */}
        {isAuthenticated && user?.role === "WORKER" && (
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("jobs")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                viewMode === "jobs"
                  ? "bg-white text-[#800020] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              My Jobs ({totalMyJobsCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("guide")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                viewMode === "guide"
                  ? "bg-white text-[#800020] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              How Jobs Work (Guide)
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: AUTHENTICATED WORKER ACTIVE JOBS */}
      {viewMode === "jobs" && isAuthenticated && user?.role === "WORKER" && (
        <div className="space-y-5 sm:space-y-6">
          {/* Mobile & Desktop Segmented Tabs with smooth mobile horizontal scroll */}
          <div className="flex gap-2 border-b border-slate-200/80 pb-2.5 overflow-x-auto hide-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
            {tabs.map((t) => {
              const count =
                t.filter === "PENDING"
                  ? pendingCount
                  : t.filter === "ACTIVE"
                  ? activeCount
                  : completedCount;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setActiveTab(t.filter)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
                    activeTab === t.filter
                      ? "bg-[#800020] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  )}
                >
                  <span>{t.label}</span>
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full text-[10px] font-extrabold",
                      activeTab === t.filter
                        ? "bg-white text-[#800020]"
                        : "bg-slate-100 text-slate-700"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
              <p className="text-xs text-slate-500 font-medium">Fetching assigned work orders...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TAB 1: NEW REQUESTS */}
              {activeTab === "PENDING" && (
                <div className="space-y-4">
                  {pendingOrders.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span>Direct Customer Problem Requests ({pendingOrders.length})</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            Location Protected
                          </span>
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {pendingOrders.map((order) => (
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

                  {pendingBookings.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Direct Service Bookings ({pendingBookings.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {pendingBookings.map((b) => (
                          <div
                            key={b.id}
                            className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">
                                    {b.service?.name || "Repair Service"}
                                  </span>
                                  <Badge className="bg-rose-50 text-[#800020] border-rose-200">
                                    {b.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Ref: {b.bookingRef} · {formatDateTime(b.createdAt)}
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <span className="text-base sm:text-lg font-black text-slate-900">
                                  {formatCurrency(b.quotedPrice || 50)}
                                </span>
                                <p className="text-[10px] text-emerald-600 font-bold">
                                  100% Worker Payout
                                </p>
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                              <p className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-[#800020] shrink-0" />
                                <span>{b.address || "Customer Doorstep Address"}</span>
                              </p>
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>{b.consumer?.phone || "+91-Customer Phone"}</span>
                              </p>
                            </div>

                            <div className="pt-2">
                              <Button
                                size="sm"
                                className="w-full sm:w-auto bg-[#800020] hover:bg-[#66001a] text-white font-bold rounded-xl"
                                disabled={busyId === b.id}
                                onClick={() => updateBookingStatus(b, "ACCEPTED")}
                              >
                                Accept Work Order
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingOrders.length === 0 && pendingBookings.length === 0 && (
                    <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
                      <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        No pending incoming requests
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Keep your status toggled to <strong>Available</strong> on the dashboard to receive direct customer requests in your area.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ACTIVE JOBS */}
              {activeTab === "ACTIVE" && (
                <div className="space-y-4">
                  {activeOrders.map((order) => {
                    const isPriceLocked = order.isPriceLocked;
                    const priceCeiling = Number(order.workerPriceCeiling || order.problem?.workerPriceCeiling || 299);
                    const agreedOrQuotedPrice = Number(order.finalPrice || order.basePrice || 50);

                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4 transition-all hover:border-slate-300"
                      >
                        {/* Top Card Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm sm:text-base font-bold text-slate-900">
                                {order.problemTitle || order.problem?.name || "Home Repair"}
                              </span>
                              <Badge className="bg-rose-50 text-[#800020] border-rose-200 font-bold">
                                {order.category?.name || "Service"}
                              </Badge>
                              {/* Status Badge */}
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              Ref: {order.orderRef} · Mode: {order.bookingMode}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left sm:text-right">
                              <span className="text-base sm:text-xl font-black text-slate-900 font-mono">
                                {formatCurrency(agreedOrQuotedPrice)}
                              </span>
                              <p className="text-[10px] text-emerald-600 font-bold">
                                {isPriceLocked ? "✓ Price Locked" : `Ceiling: ${formatCurrency(priceCeiling)}`}
                              </p>
                            </div>

                            {!isPriceLocked && (
                              <button
                                type="button"
                                onClick={() => setNegotiatingOrder(order)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 text-[#800020] hover:bg-rose-100 border border-rose-200/70 text-xs font-bold transition flex items-center gap-1"
                              >
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>Negotiate</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Customer & Doorstep Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Customer Contact & In-App Voice Call
                            </span>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#800020] font-bold text-xs">
                                {order.consumer?.name?.charAt(0) || "C"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{order.consumer?.name || "Customer"}</p>
                                <p className="text-[11px] text-slate-500">{order.consumer?.phone ? `${order.consumer.phone.slice(0, 3)}****${order.consumer.phone.slice(-3)}` : "Verified Customer"}</p>
                              </div>
                            </div>
                            <CommunicationConsentCard
                              orderId={order.id}
                              userRole="WORKER"
                              counterpartName={order.consumer?.name || "Customer"}
                              counterpartAvatar={order.consumer?.avatarUrl}
                              counterpartUserId={order.consumerId}
                            />

                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Doorstep Location
                            </span>
                            <p className="flex items-start gap-1.5 text-slate-800 font-medium">
                              <MapPin className="h-4 w-4 text-[#800020] shrink-0 mt-0.5" />
                              <span>{order.address || order.approxArea || "Local Service Address"}</span>
                            </p>
                          </div>
                        </div>

                        {/* Customer's Explanation (Text / Audio / Photos / Video) */}
                        {(order.textDescription || order.audioUrl || (order.photos && order.photos.length > 0) || order.videoUrl) && (
                          <div className="space-y-2 text-xs">
                            {order.textDescription && (
                              <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Customer's Problem Description:
                                </span>
                                <p className="text-slate-800 italic">&ldquo;{order.textDescription}&rdquo;</p>
                              </div>
                            )}

                            {order.audioUrl && (
                              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex items-center gap-1.5 text-amber-900 font-bold shrink-0">
                                  <Volume2 className="h-4 w-4 text-amber-700" />
                                  <span className="text-[11px]">Customer Voice Note:</span>
                                </div>
                                <audio controls preload="metadata" src={resolveMediaUrl(order.audioUrl)} className="w-full h-8 accent-[#800020]" />
                              </div>
                            )}

                            {order.photos && order.photos.length > 0 && (
                              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  Attached Photos ({order.photos.length})
                                </span>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {order.photos.map((p, idx) => (
                                    <a
                                      key={idx}
                                      href={resolveMediaUrl(p)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="relative group shrink-0"
                                    >
                                      <img
                                        src={resolveMediaUrl(p)}
                                        alt={`Attachment ${idx + 1}`}
                                        className="h-20 w-20 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:opacity-90 transition"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {order.videoUrl && (
                              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                  <Film className="h-3 w-3 text-[#800020]" />
                                  Customer Problem Video Clip
                                </span>
                                <video
                                  controls
                                  playsInline
                                  preload="metadata"
                                  src={resolveMediaUrl(order.videoUrl)}
                                  className="w-full max-w-sm h-36 object-contain bg-black rounded-xl"
                                />
                              </div>
                            )}

                          </div>
                        )}


                        {/* Operational Stage Advancement Actions */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 overflow-x-auto pb-1 sm:pb-0">
                            <span className={cn("px-2 py-0.5 rounded-md font-bold", order.status === "ACCEPTED" ? "bg-[#800020] text-white" : "bg-slate-100 text-slate-600")}>
                              1. Accepted
                            </span>
                            <span>→</span>
                            <span className={cn("px-2 py-0.5 rounded-md font-bold", order.status === "TRAVELLING" ? "bg-[#800020] text-white" : "bg-slate-100 text-slate-600")}>
                              2. Travelling
                            </span>
                            <span>→</span>
                            <span className={cn("px-2 py-0.5 rounded-md font-bold", order.status === "ARRIVED" ? "bg-[#800020] text-white" : "bg-slate-100 text-slate-600")}>
                              3. Arrived
                            </span>
                            <span>→</span>
                            <span className={cn("px-2 py-0.5 rounded-md font-bold", order.status === "IN_PROGRESS" ? "bg-[#800020] text-white" : "bg-slate-100 text-slate-600")}>
                              4. Working
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {order.status === ("ACCEPTED" as any) && (
                              <Button
                                size="sm"
                                disabled={updatingStateId === order.id}
                                onClick={() => handleAdvanceOperationalState(order.id, "TRAVELLING")}
                                className="w-full sm:w-auto bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold rounded-xl"
                              >
                                {updatingStateId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5 mr-1" />}
                                Start Travelling
                              </Button>
                            )}

                            {order.status === ("TRAVELLING" as any) && (
                              <Button
                                size="sm"
                                disabled={updatingStateId === order.id}
                                onClick={() => handleAdvanceOperationalState(order.id, "ARRIVED")}
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                              >
                                {updatingStateId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
                                I Have Arrived
                              </Button>
                            )}

                            {order.status === ("ARRIVED" as any) && (
                              <Button
                                size="sm"
                                disabled={updatingStateId === order.id}
                                onClick={() => handleAdvanceOperationalState(order.id, "WORKING")}
                                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl"
                              >
                                {updatingStateId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 mr-1" />}
                                Start Work
                              </Button>
                            )}

                            {order.status === ("IN_PROGRESS" as any) && (
                              <Button
                                size="sm"
                                disabled={updatingStateId === order.id}
                                onClick={() => handleAdvanceOperationalState(order.id, "COMPLETED")}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                              >
                                {updatingStateId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                                Complete Service
                              </Button>
                            )}

                            <Link
                              href={`/worker/dashboard`}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                            >
                              <span>Cockpit</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {activeBookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {b.service?.name || "Repair Service"}
                            </span>
                            <Badge className="bg-rose-50 text-[#800020] border-rose-200">
                              {b.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Ref: {b.bookingRef} · {formatDateTime(b.createdAt)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                            {formatCurrency(b.quotedPrice || 50)}
                          </span>
                          <p className="text-[10px] text-emerald-600 font-bold">100% Worker Payout</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#800020] shrink-0" />
                          <span>{b.address || "Customer Doorstep Address"}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{b.consumer?.phone || "+91-Customer Phone"}</span>
                        </p>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        {b.status === "ACCEPTED" && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                            disabled={busyId === b.id}
                            onClick={() => updateBookingStatus(b, "EN_ROUTE")}
                          >
                            Start Journey (En Route)
                          </Button>
                        )}
                        {b.status === "EN_ROUTE" && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                            disabled={busyId === b.id}
                            onClick={() => updateBookingStatus(b, "IN_PROGRESS")}
                          >
                            Check-in (Start OTP)
                          </Button>
                        )}
                        {b.status === "IN_PROGRESS" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                            disabled={busyId === b.id}
                            onClick={() => updateBookingStatus(b, "COMPLETED")}
                          >
                            Complete Job
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {activeOrders.length === 0 && activeBookings.length === 0 && (
                    <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
                      <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Zap className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        No active jobs in progress
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Accept incoming customer requests in the <strong>New Requests</strong> tab to begin active doorstep service.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: COMPLETED JOBS */}
              {activeTab === "COMPLETED" && (
                <div className="space-y-4">
                  {completedOrders.map((order) => {
                    const finalFare = Number(order.finalPrice || order.grossAmount || order.basePrice || 50);
                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm sm:text-base font-bold text-slate-900">
                                {order.problemTitle || order.problem?.name || "Repair Service"}
                              </span>
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                                Completed
                              </Badge>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {order.category?.name || "Service"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              Ref: {order.orderRef} · Completed on {formatDateTime(order.completedAt || order.updatedAt)}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-base sm:text-xl font-black text-emerald-700 font-mono">
                              +{formatCurrency(finalFare)}
                            </span>
                            <p className="text-[10px] text-emerald-600 font-bold">Settled to Wallet</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-slate-400" />
                            <span>Customer: <strong>{order.consumer?.name || "Customer"}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{order.address || order.approxArea || "Customer Site"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>100% Direct Payout</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {completedBookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {b.service?.name || "Service"}
                            </span>
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">
                              Completed
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Ref: {b.bookingRef} · {formatDateTime(b.createdAt)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                            {formatCurrency(b.quotedPrice || 50)}
                          </span>
                          <p className="text-[10px] text-emerald-600 font-bold">Settled</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {completedOrders.length === 0 && completedBookings.length === 0 && (
                    <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
                      <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">
                        No completed jobs yet
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Once you complete your active jobs, their full payout records and receipts will be stored here.
                      </p>
                    </div>
                  )}
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
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">Technician Protection</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                How Assigned Jobs Work for Technicians
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                Engineered for respect, fair compensation, and zero exploitation. Here is the lifecycle from dispatch to instant bank payout.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workerWorkflowSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="group rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5"
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
        </div>
      )}

      {/* Price Negotiation Modal */}
      {negotiatingOrder && (
        <PriceNegotiationModal
          isOpen={!!negotiatingOrder}
          onClose={() => {
            setNegotiatingOrder(null);
            fetchJobs();
          }}
          orderId={negotiatingOrder.id}
          userRole="WORKER"
          onPriceConfirmed={() => {
            setNegotiatingOrder(null);
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}
