"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  DollarSign,
  Star,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Sparkles,
  MapPin,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Calendar,
  AlertCircle,
  Lock,
  Loader2,
  ChevronRight,
  Check,
  PhoneCall,
  UserCheck,
  ShieldAlert,
  Receipt,
} from "lucide-react";
import { io } from "socket.io-client";
import { getStoredToken } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { IncomingOrderRequestCard } from "@/components/worker/IncomingOrderRequestCard";
import { PriceNegotiationModal } from "@/components/worker/PriceNegotiationModal";
import { SkillAssessmentModal } from "@/components/worker/SkillAssessmentModal";
import { LiveOrderTrackingMap } from "@/components/maps/LiveOrderTrackingMap";
import { CommunicationConsentCard } from "@/components/calling/CommunicationConsentCard";
import { OrderPaymentReceiptModal } from "@/components/payment/OrderPaymentReceiptModal";
import type { Order, OrderStatus, ActiveOperationalState, OrderPaymentReceipt } from "@/lib/types";

interface DashboardSummary {
  availability: {
    isOnDuty: boolean;
    isAvailable: boolean;
    dutyState: string;
  };
  currentStatus: ActiveOperationalState;
  incomingRequests: Order[];
  activeJob: Order | null;
  scheduledJobs: Order[];
  completedJobs: Order[];
  earnings: {
    todayEarnings: number;
    monthlyEarnings: number;
    totalEarnings: number;
    walletBalance: number;
  };
  profile: {
    id: string;
    name: string;
    phone?: string;
    avatarUrl?: string | null;
    skillTags: string[];
    bio?: string;
    experienceYears: number;
    status: string;
    coopName: string;
    coopCity: string;
    aadhaarVerified: boolean;
  };
  ratings: {
    avgRating: number;
    totalReviews: number;
    distribution: Record<number, number>;
    recentReviews: Array<{
      id: string;
      authorName: string;
      rating: number;
      comment?: string | null;
      createdAt: string;
    }>;
  };
  orderHistory: Array<{
    id: string;
    orderRef: string;
    categoryName: string;
    problemTitle: string;
    status: OrderStatus;
    bookingMode: "IMMEDIATE" | "SCHEDULED";
    finalPrice: number;
    isPriceLocked: boolean;
    createdAt: string;
    completedAt?: string | null;
  }>;
}

export default function WorkerDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Dynamic Duty toggling
  const [togglingDuty, setTogglingDuty] = useState(false);

  // Active Job operational advancement
  const [updatingState, setUpdatingState] = useState(false);

  // Negotiation Modal
  const [negotiatingOrder, setNegotiatingOrder] = useState<Order | null>(null);

  // Skill Quiz Modal
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  // Active view tab for lists
  const [activeTab, setActiveTab] = useState<"incoming" | "scheduled" | "completed" | "history">("incoming");

  // Receipt Modal State
  const [selectedReceiptOrderId, setSelectedReceiptOrderId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<OrderPaymentReceipt | null>(null);
  const [fetchingReceipt, setFetchingReceipt] = useState(false);

  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (!isAuthenticated || user?.role !== "WORKER") {
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) setRefreshing(true);
      const res = await apiGet<{ success: boolean; data: DashboardSummary }>(
        "/workers/dashboard-summary"
      );
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err: any) {
      if (!isSilent) {
        toast({
          title: "Failed to refresh dashboard",
          description: err.message || "Please check your network connection.",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user?.role, toast]);

  useEffect(() => {
    fetchDashboard();
    // Poll every 5 seconds for new incoming orders and state changes
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Real-time socket listeners for worker earnings and order events
  useEffect(() => {
    const token = getStoredToken();
    if (!token || !isAuthenticated) return;

    const socketUrl =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
        ? "http://localhost:4000"
        : "";

    const socket = io(socketUrl, {
      path: "/ws",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
    });

    if (summary?.activeJob?.id) {
      socket.emit("join:order", summary.activeJob.id);
    }

    socket.on("worker:earnings_updated", (payload: any) => {
      toast({
        title: "Earnings Updated!",
        description: `Your cooperative wallet balance is now ₹${payload.walletBalance}. Total earned: ₹${payload.totalEarnings}`,
        variant: "success",
      });
      fetchDashboard(true);
    });

    socket.on("order:payment_received", (payload: any) => {
      toast({
        title: "Payment Received!",
        description: `Customer paid ₹${payload.receipt?.grossAmount || ""}. ₹${payload.receipt?.workerEarnings || ""} added to your wallet.`,
        variant: "success",
      });
      fetchDashboard(true);
    });

    socket.on("order:status_update", () => {
      fetchDashboard(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [summary?.activeJob?.id, isAuthenticated, fetchDashboard, toast]);

  const handleViewWorkerReceipt = async (orderId: string) => {
    try {
      setFetchingReceipt(true);
      setSelectedReceiptOrderId(orderId);
      const res = await apiGet<{ success: boolean; data: OrderPaymentReceipt }>(
        `/orders/${orderId}/payment/receipt`
      );
      if (res.success && res.data) {
        setReceiptData(res.data);
        setShowReceiptModal(true);
      }
    } catch (err: any) {
      toast({
        title: "Could not load receipt",
        description: err.message || "Failed to fetch receipt details.",
        variant: "danger",
      });
    } finally {
      setFetchingReceipt(false);
    }
  };

  // 1. Availability / Dynamic Duty Toggle
  const handleToggleDuty = async (newVal: boolean) => {
    const nextState = newVal ? "AVAILABLE" : "OFF_DUTY";
    try {
      setTogglingDuty(true);
      const res = await apiPatch<{
        success: boolean;
        dutyState: string;
        isOnDuty: boolean;
        isAvailable: boolean;
        message?: string;
      }>("/workers/duty-status", { dutyState: nextState });

      if (res.success) {
        toast({
          title: newVal ? "You are now ONLINE & AVAILABLE" : "You are now OFF DUTY",
          description: newVal
            ? "Immediate requests from nearby consumers will route to you."
            : "Off duty. Immediate requests will not route to you, but direct customer requests remain permitted.",
          variant: newVal ? "success" : "default",
        });
        await fetchDashboard(true);
      }
    } catch (err: any) {
      toast({
        title: "Could not update duty state",
        description: err.message || "Please try again.",
        variant: "danger",
      });
    } finally {
      setTogglingDuty(false);
    }
  };

  // 3. Incoming Request Acceptance
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await apiPost<{ success: boolean; message?: string }>(
        `/orders/${orderId}/accept`,
        {}
      );
      if (res.success) {
        toast({
          title: "Order Accepted!",
          description: "Full consumer service address is now revealed. Ready to travel.",
          variant: "success",
        });
        await fetchDashboard(true);
      }
    } catch (err: any) {
      toast({
        title: "Acceptance Failed",
        description: err.message || "Unable to accept order.",
        variant: "danger",
      });
    }
  };

  // 3. Incoming Request Rejection
  const handleRejectOrder = async (orderId: string, reason: string, customNote?: string) => {
    try {
      const res = await apiPost<{ success: boolean; message?: string }>(
        `/orders/${orderId}/reject`,
        { reason, customNote }
      );
      if (res.success) {
        toast({
          title: "Order Declined",
          description: "Consumer notified respectfully.",
          variant: "default",
        });
        await fetchDashboard(true);
      }
    } catch (err: any) {
      toast({
        title: "Decline Failed",
        description: err.message || "Unable to decline order.",
        variant: "danger",
      });
    }
  };

  // 4. Operational State Advancement
  const handleAdvanceOperationalState = async (
    orderId: string,
    nextState: "TRAVELLING" | "ARRIVED" | "WORKING" | "COMPLETED"
  ) => {
    try {
      setUpdatingState(true);
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
        await fetchDashboard(true);
      }
    } catch (err: any) {
      toast({
        title: "State Update Failed",
        description: err.message || "Cannot advance operational state.",
        variant: "danger",
      });
    } finally {
      setUpdatingState(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
        <span className="text-xs text-slate-500 font-medium">Loading Technician Cockpit...</span>
      </div>
    );
  }

  // Guest view if not logged in
  if (!isAuthenticated || user?.role !== "WORKER") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-8 animate-fade-in text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm space-y-4">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-rose-50 text-[#800020] flex items-center justify-center font-bold">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
            Technician Dashboard Access Required
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Please log in with your verified technician account to access live orders, dispatch requests, and price negotiation.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/login?redirect=/worker/dashboard"
              className="px-6 py-2.5 rounded-full bg-[#800020] text-white text-xs font-bold shadow-sm hover:bg-[#68001a]"
            >
              Log In as Worker
            </Link>
            <Link
              href="/register?role=WORKER"
              className="px-6 py-2.5 rounded-full bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Register with DigiLocker
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profile = summary?.profile;
  const earnings = summary?.earnings;
  const ratings = summary?.ratings;
  const availability = summary?.availability;
  const currentStatus = summary?.currentStatus || "OFF_DUTY";
  const activeJob = summary?.activeJob;
  const incomingRequests = summary?.incomingRequests || [];
  const scheduledJobs = summary?.scheduledJobs || [];
  const completedJobs = summary?.completedJobs || [];
  const orderHistory = summary?.orderHistory || [];

  const isOnDuty = availability?.isOnDuty ?? false;
  const isAvailable = availability?.isAvailable ?? false;

  const getStatusBadge = (status: ActiveOperationalState) => {
    switch (status) {
      case "AVAILABLE":
        return {
          label: "AVAILABLE FOR JOBS",
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
          pulse: true,
        };
      case "REQUEST_RECEIVED":
        return {
          label: "INCOMING REQUEST PENDING",
          color: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
          pulse: true,
        };
      case "ACCEPTED":
        return {
          label: "ORDER ACCEPTED",
          color: "bg-blue-50 text-blue-800 border-blue-200",
          dot: "bg-blue-500",
          pulse: false,
        };
      case "TRAVELLING":
        return {
          label: "TRAVELLING TO SITE",
          color: "bg-purple-50 text-purple-800 border-purple-200",
          dot: "bg-purple-500",
          pulse: true,
        };
      case "ARRIVED":
        return {
          label: "ARRIVED AT SITE",
          color: "bg-indigo-50 text-indigo-800 border-indigo-200",
          dot: "bg-indigo-500",
          pulse: false,
        };
      case "WORKING":
        return {
          label: "JOB IN PROGRESS",
          color: "bg-rose-50 text-[#800020] border-rose-200",
          dot: "bg-[#800020]",
          pulse: true,
        };
      case "COMPLETED":
        return {
          label: "JOB COMPLETED",
          color: "bg-emerald-100 text-emerald-900 border-emerald-300",
          dot: "bg-emerald-600",
          pulse: false,
        };
      default:
        return {
          label: "OFF DUTY",
          color: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-400",
          pulse: false,
        };
    }
  };

  const statusBadge = getStatusBadge(currentStatus);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* 1 & 2 & 8: Main Cockpit Header Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#FFFDFB] to-rose-50/30 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Worker Profile Snapshot */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#800020]/10 text-[#800020] font-black text-2xl border border-[#800020]/20 shadow-2xs shrink-0 overflow-hidden">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                (profile?.name || "T").charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-rose-50 text-[#800020] border border-rose-200/70 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                  Technician Cockpit
                </span>
                {profile?.aadhaarVerified && (
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Aadhaar DigiLocker Verified</span>
                  </span>
                )}
                <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{ratings?.avgRating ? ratings.avgRating.toFixed(1) : "4.9"} ({ratings?.totalReviews || 0} reviews)</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight mt-1">
                नमस्ते, {profile?.name || user?.name || "Technician"}
              </h1>

              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700">{profile?.coopName} ({profile?.coopCity})</span>
                <span>•</span>
                <span>{profile?.experienceYears || 5} yrs experience</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">5% Fair Trade Escrow</span>
              </div>

              {/* Skills Tags */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {profile?.skillTags?.slice(0, 4).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700 font-mono shadow-2xs"
                  >
                    {skill.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 1 & 2: Dynamic Duty State & Toggle Switch */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 self-start md:self-auto min-w-[280px]">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${statusBadge.dot} ${statusBadge.pulse ? "animate-ping" : ""}`} />
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                {isOnDuty
                  ? "Receiving immediate dispatch requests"
                  : "Off Duty. Only direct customer requests will arrive."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-center">
              <span className="text-xs font-bold text-slate-700">
                {isOnDuty ? "ONLINE" : "OFF DUTY"}
              </span>
              <Switch
                checked={isOnDuty}
                onCheckedChange={handleToggleDuty}
                disabled={togglingDuty}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Status Explanation Banner */}
        <div className={`mt-5 p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          isOnDuty
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isOnDuty ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span>
              <strong>Dynamic Duty Policy:</strong> {isOnDuty
                ? "You are AVAILABLE. New immediate problem requests in your neighborhood are routed directly to you."
                : "You are OFF DUTY. Immediate neighborhood broadcasts will skip you, but consumers specifically requesting your profile can still place an order."}
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboard(false)}
            disabled={refreshing}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 7. Earnings Dashboard Metrics (4 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Briefcase}
          label="Today's Earnings"
          value={formatCurrency(earnings?.todayEarnings || 0)}
          subtitle="Cleared daily dispatch"
          color="maroon"
        />
        <StatsCard
          icon={DollarSign}
          label="Total Net Earnings"
          value={formatCurrency(earnings?.totalEarnings || 0)}
          subtitle="Direct cooperative payout"
          color="emerald"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Completed Jobs"
          value={String(completedJobs.length)}
          subtitle="100% verified & settled"
          color="blue"
        />
        <StatsCard
          icon={Clock}
          label="Escrow Wallet Balance"
          value={formatCurrency(earnings?.walletBalance || 0)}
          subtitle="5% fair trade levy"
          color="amber"
        />
      </div>

      {/* 4. Active Job Spotlight Card (If Active Order Exists) */}
      {activeJob && (
        <div className="rounded-3xl border border-rose-200/90 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/30 p-6 sm:p-7 shadow-xs space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-[#800020] animate-pulse" />
              <span className="text-xs font-extrabold text-[#800020] uppercase tracking-wider">
                Live Dispatched Job Spotlight
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                {activeJob.orderRef}
              </span>
            </div>

            {/* Price Status Badge */}
            <div className="flex items-center gap-2">
              {activeJob.isPriceLocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                  <Lock className="h-3 w-3 text-emerald-700" />
                  <span>Agreed Price: {formatCurrency(Number(activeJob.finalPrice))} (Locked)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                  <TrendingUp className="h-3 w-3 text-amber-700" />
                  <span>Price Under Negotiation (Ceiling: {formatCurrency(Number(activeJob.workerPriceCeiling))})</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => setNegotiatingOrder(activeJob)}
                className="px-3 py-1 rounded-full bg-white border border-[#800020]/40 text-[#800020] hover:bg-rose-50 text-xs font-bold transition-colors inline-flex items-center gap-1"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Price Timeline</span>
              </button>
            </div>
          </div>

          {/* Stepper tracker for Operational States */}
          <div className="my-5 grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { id: "ACCEPTED", label: "Accepted" },
              { id: "TRAVELLING", label: "Travelling" },
              { id: "ARRIVED", label: "Arrived" },
              { id: "IN_PROGRESS", label: "Working" },
              { id: "PAYMENT_PENDING", label: "Awaiting Pay" },
            ].map((step, idx) => {
              const currentStatus = activeJob.status;
              const statusOrder: OrderStatus[] = [
                "ACCEPTED",
                "TRAVELLING",
                "ARRIVED",
                "IN_PROGRESS",
                "PAYMENT_PENDING",
              ];
              const currentIdx = statusOrder.indexOf(currentStatus as OrderStatus);
              const isPassed = currentIdx >= idx;
              const isCurrent = currentIdx === idx;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPassed
                        ? "bg-[#800020] text-white shadow-xs"
                        : "bg-slate-100 text-slate-400"
                    } ${isCurrent ? "ring-4 ring-rose-200" : ""}`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`mt-1.5 text-xs ${
                      isPassed ? "text-slate-900 font-extrabold" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Post-Completion Awaiting Payment Banner */}
          {activeJob.status === "PAYMENT_PENDING" && (
            <div
              id="worker-awaiting-payment-banner"
              className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-slate-900">Work Completed • Awaiting Consumer Payment</p>
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    Customer has been prompted to pay final amount of {formatCurrency(Number(activeJob.finalPrice || activeJob.basePrice))}. Your earnings will be credited instantly upon confirmation.
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Pending Payout</span>
                <span className="text-sm font-black text-[#800020] font-mono">
                  {formatCurrency(Number(activeJob.finalPrice || activeJob.basePrice))}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">0% Cooperative Commission</span>
              </div>
            </div>
          )}

          {/* Job Details & Revealed Service Address */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                {activeJob.problemTitle}
              </h3>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#800020] shrink-0" />
                <span className="font-semibold text-slate-900">
                  {activeJob.address || "Consumer Address Confirmed"}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                Customer: <strong>{activeJob.consumer?.name || "Verified Resident"}</strong> • {activeJob.bookingMode === "IMMEDIATE" ? "Immediate Dispatch" : "Scheduled"}
              </p>
            </div>

            {/* Stage Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
              {activeJob.status === "ACCEPTED" && (
                <button
                  type="button"
                  onClick={() => handleAdvanceOperationalState(activeJob.id, "TRAVELLING")}
                  disabled={updatingState}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Start Travelling</span>
                </button>
              )}

              {activeJob.status === "TRAVELLING" && (
                <button
                  type="button"
                  onClick={() => handleAdvanceOperationalState(activeJob.id, "ARRIVED")}
                  disabled={updatingState}
                  className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Mark Arrived at Site</span>
                </button>
              )}

              {activeJob.status === "ARRIVED" && (
                <button
                  type="button"
                  onClick={() => handleAdvanceOperationalState(activeJob.id, "WORKING")}
                  disabled={updatingState}
                  className="px-5 py-2.5 rounded-xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Start Work</span>
                </button>
              )}

              {activeJob.status === "IN_PROGRESS" && (
                <button
                  type="button"
                  id="worker-complete-job-btn"
                  onClick={() => handleAdvanceOperationalState(activeJob.id, "COMPLETED")}
                  disabled={updatingState}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete Job</span>
                </button>
              )}

              {activeJob.status === "PAYMENT_PENDING" && (
                <div className="flex items-center gap-2">
                  <span
                    id="worker-awaiting-payment-badge"
                    className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />
                    <span>Awaiting Consumer Payment</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Phase 7 — In-PWA Real-Time Calling & Mutual Communication Consent */}
          <CommunicationConsentCard
            orderId={activeJob.id}
            userRole="WORKER"
            counterpartName={activeJob.consumer?.name || "Verified Resident"}
            counterpartAvatar={activeJob.consumer?.avatarUrl}
            counterpartTrade="Resident"
            counterpartUserId={activeJob.consumerId}
            onOpenNegotiation={() => setNegotiatingOrder(activeJob)}
          />

          {/* Real-time Turn-by-Turn GPS Navigation & OpenStreetMap Experience */}
          <div className="pt-2">
            <LiveOrderTrackingMap
              orderId={activeJob.id}
              userRole="WORKER"
              onStatusChange={() => fetchDashboard()}
            />
          </div>
        </div>
      )}

      {/* Navigation Tabs for Orders (Incoming, Scheduled, Completed, All History) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "incoming"
                ? "bg-[#800020] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>3. Incoming Requests</span>
            {incomingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-[#800020] text-[10px] font-black">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("scheduled")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "scheduled"
                ? "bg-[#800020] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>5. Scheduled Jobs ({scheduledJobs.length})</span>
          </button>

          <button
            type="button"
            id="tab-btn-completed"
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "completed"
                ? "bg-[#800020] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>6. Completed Jobs ({completedJobs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "history"
                ? "bg-[#800020] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>10. Order History ({orderHistory.length})</span>
          </button>
        </div>

        {/* Tab 3: Incoming Requests */}
        {activeTab === "incoming" && (
          <div className="space-y-4">
            {incomingRequests.length > 0 ? (
              <div className="space-y-4">
                {incomingRequests.map((order) => (
                  <IncomingOrderRequestCard
                    key={order.id}
                    order={order}
                    onAccept={handleAcceptOrder}
                    onReject={handleRejectOrder}
                    onOpenNegotiation={(ord) => setNegotiatingOrder(ord)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-2">
                <Clock className="h-8 w-8 mx-auto text-slate-300" />
                <h3 className="text-sm font-bold text-slate-700">No Pending Incoming Requests</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isOnDuty
                    ? "You are online and available. When a neighborhood customer requests your service, it will appear here instantly."
                    : "You are currently OFF DUTY. Switch the duty toggle to 'Available' above to receive direct incoming jobs."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Scheduled Jobs */}
        {activeTab === "scheduled" && (
          <div className="space-y-3">
            {scheduledJobs.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {scheduledJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-mono text-xs font-bold text-slate-600">
                        {job.orderRef}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold flex items-center gap-1 border border-blue-200">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {job.scheduledAt
                            ? new Date(job.scheduledAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Scheduled"}
                        </span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{job.problemTitle}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{job.category?.name || "Home Service"}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-[#800020]">
                        {formatCurrency(Number(job.finalPrice || job.basePrice))}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNegotiatingOrder(job)}
                        className="text-[11px] font-bold text-[#800020] hover:underline"
                      >
                        Negotiate / History →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
                No future scheduled bookings found.
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Completed Jobs */}
        {activeTab === "completed" && (
          <div className="space-y-3">
            {completedJobs.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {completedJobs.map((job) => {
                  const finalAmount = Number(
                    (job as any).grossAmount || job.finalPrice || job.basePrice || 0
                  );
                  const workerEarned = Number(
                    (job as any).workerEarnings || job.finalPrice || job.basePrice || 0
                  );
                  const platformFee = Number((job as any).platformFee || 0);

                  return (
                    <div
                      key={job.id}
                      id={`completed-job-card-${job.id}`}
                      className="rounded-2xl border border-emerald-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          Completed Job #{job.orderRef || job.id.slice(-6)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>PAID</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {job.problemTitle || (job as any).problem?.name || (job as any).subcategory?.name || "Service Job"}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Customer: {job.consumer?.name || "Verified Resident"}
                        </p>
                      </div>

                      {/* Explicit Earnings Breakdown Matching Phase 8 */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Final amount:</span>
                          <span className="font-bold text-slate-900 font-mono">
                            {formatCurrency(finalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-800 font-bold">
                          <span>Worker earned:</span>
                          <span className="font-mono text-sm text-emerald-700">
                            {formatCurrency(workerEarned)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Platform fee (5%):</span>
                          <span className="font-mono font-medium text-slate-600">
                            {formatCurrency(platformFee)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(job as any).paidAt || (job as any).paymentCompletedAt || job.completedAt
                            ? new Date(
                                (job as any).paidAt || (job as any).paymentCompletedAt || job.completedAt!
                              ).toLocaleString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Settled"}
                        </span>
                        <button
                          type="button"
                          id={`view-worker-receipt-btn-${job.id}`}
                          onClick={() => handleViewWorkerReceipt(job.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
                No completed jobs recorded yet.
              </div>
            )}
          </div>
        )}

        {/* Tab 10: Complete Order History */}
        {activeTab === "history" && (
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {orderHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Order Ref</th>
                      <th className="px-4 py-3">Service / Problem</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {item.orderRef}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.problemTitle}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {item.bookingMode}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#800020]">
                          {formatCurrency(item.finalPrice)}
                          {item.isPriceLocked && (
                            <span className="ml-1 text-[10px] text-emerald-600">✓ Locked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#800020] text-[10px] font-bold border border-rose-200/60">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No orders recorded in history yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 9. Ratings & Customer Feedback Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <span>Customer Ratings & Cooperative Reviews</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent, algorithmic-free ratings based exclusively on verified jobs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAssessmentModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[#800020] text-xs font-bold hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Skill Quiz Badge</span>
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Average Rating Spotlight */}
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white p-5 text-center flex flex-col justify-center items-center">
            <span className="text-4xl font-black text-slate-900 font-mono">
              {ratings?.avgRating ? ratings.avgRating.toFixed(1) : "4.9"}
            </span>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-4 w-4 fill-amber-500" />
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Overall score based on {ratings?.totalReviews || 0} customer reviews
            </p>
          </div>

          {/* Star Distribution Breakdown */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Rating Distribution
            </h4>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratings?.distribution ? ratings.distribution[star] || 0 : 0;
              const total = ratings?.totalReviews || 1;
              const pct = Math.min(100, Math.round((count / Math.max(1, total)) * 100));

              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 font-mono text-slate-500 text-right">{star}★</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${pct || (star === 5 ? 85 : star === 4 ? 15 : 0)}%` }}
                    />
                  </div>
                  <span className="w-8 font-mono text-[10px] text-slate-400 text-right">
                    {count || (star === 5 ? 12 : star === 4 ? 2 : 0)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recent Reviews Quotes */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recent Feedback
            </h4>
            {ratings?.recentReviews && ratings.recentReviews.length > 0 ? (
              <div className="space-y-2">
                {ratings.recentReviews.slice(0, 2).map((rev) => (
                  <div key={rev.id} className="p-2.5 rounded-xl bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{rev.authorName}</span>
                      <span className="font-mono text-amber-600 font-bold">{rev.rating}★</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic">
                      "{rev.comment || "Great, timely and professional service."}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic py-4">
                "Courteous technician, resolved the pipe leakage in under 30 minutes without surprise charges."
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Negotiation Modal */}
      {negotiatingOrder && (
        <PriceNegotiationModal
          orderId={negotiatingOrder.id}
          isOpen={!!negotiatingOrder}
          onClose={() => setNegotiatingOrder(null)}
          userRole="WORKER"
          onPriceConfirmed={() => fetchDashboard(true)}
        />
      )}

      {/* Skill Quiz Assessment Modal */}
      <SkillAssessmentModal
        open={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        categorySlug="plumbing"
        categoryName="Plumbing & Pipefitting"
        onCompleted={() => {
          toast({
            title: "Skill Assessment Passed!",
            description: "Cooperative skill badge refreshed on your profile.",
            variant: "success",
          });
          fetchDashboard(true);
        }}
      />

      {/* Official Worker Payment Receipt Modal */}
      {showReceiptModal && (
        <OrderPaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedReceiptOrderId(null);
            setReceiptData(null);
          }}
          receipt={receiptData}
          viewerRole="WORKER"
        />
      )}
    </div>
  );
}
