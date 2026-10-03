"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  CheckCircle2,
  Navigation,
  MapPin,
  ShieldCheck,
  Star,
  Briefcase,
  AlertCircle,
  Lock,
  Loader2,
  RefreshCw,
  Phone,
  ArrowRight,
  TrendingUp,
  CreditCard,
  User,
  Receipt,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { formatCurrency } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { getStoredToken } from "@/lib/storage";
import { getWebSocketUrl } from "@/lib/websocket";
import { LiveOrderTrackingMap } from "@/components/maps/LiveOrderTrackingMap";
import { CommunicationConsentCard } from "@/components/calling/CommunicationConsentCard";
import { PriceNegotiationModal } from "@/components/worker/PriceNegotiationModal";
import { OrderPaymentModal } from "@/components/payment/OrderPaymentModal";
import { OrderPaymentReceiptModal } from "@/components/payment/OrderPaymentReceiptModal";
import type { Order, OrderStatus, OrderPaymentReceipt } from "@/lib/types";

interface ConsumerActiveOrderCardProps {
  initialOrder: Order;
  onOrderUpdated?: (order: Order) => void;
  className?: string;
  showMapDirectly?: boolean;
}

const STAGES: Array<{ status: OrderStatus; label: string; step: number }> = [
  { status: "REQUESTED", label: "Requested", step: 1 },
  { status: "ACCEPTED", label: "Accepted", step: 2 },
  { status: "TRAVELLING", label: "Travelling", step: 3 },
  { status: "ARRIVED", label: "Arrived", step: 4 },
  { status: "IN_PROGRESS", label: "Working", step: 5 },
  { status: "COMPLETED", label: "Completed", step: 6 },
];

export function ConsumerActiveOrderCard({
  initialOrder,
  onOrderUpdated,
  className = "",
  showMapDirectly = true,
}: ConsumerActiveOrderCardProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<OrderPaymentReceipt | null>(null);
  const [fetchingReceipt, setFetchingReceipt] = useState(false);
  const [acceptanceNotice, setAcceptanceNotice] = useState<string | null>(
    initialOrder.status === "ACCEPTED"
      ? `Your request has been accepted by ${
          initialOrder.worker?.user?.name || "the assigned technician"
        }.`
      : null
  );

  const socketRef = useRef<Socket | null>(null);
  const onOrderUpdatedRef = useRef(onOrderUpdated);

  useEffect(() => {
    onOrderUpdatedRef.current = onOrderUpdated;
  }, [onOrderUpdated]);

  // Sync with prop updates
  useEffect(() => {
    setOrder(initialOrder);
    if (initialOrder.status === "ACCEPTED" && !acceptanceNotice) {
      setAcceptanceNotice(
        `Your request has been accepted by ${
          initialOrder.worker?.user?.name || "the assigned technician"
        }.`
      );
    }
  }, [initialOrder, acceptanceNotice]);

  // Refetch full order snapshot
  const refreshOrder = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await apiGet<{ success: boolean; data: Order }>(
        `/orders/${order.id}`
      );
      if (res.success && res.data) {
        setOrder(res.data);
        if (onOrderUpdatedRef.current) {
          onOrderUpdatedRef.current(res.data);
        }
      }
    } catch (err: any) {
      console.warn("Could not refresh active order:", err.message);
    } finally {
      setIsRefreshing(false);
    }
  }, [order.id]);

  // Realtime Socket.IO synchronization
  useEffect(() => {
    const token = getStoredToken();
    if (!token || !order.id) return;

    const socketUrl = getWebSocketUrl();

    const socket = io(socketUrl, {
      path: "/ws",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:order", order.id);
    });

    socket.on("order:status_update", (payload: any) => {
      if (!payload || (payload.orderId !== order.id && payload.order?.id !== order.id)) {
        return;
      }

      const nextStatus: OrderStatus = payload.status || payload.order?.status;
      const nextPaymentStatus = payload.paymentStatus || payload.order?.paymentStatus;

      setOrder((prev) => {
        const merged: Order = payload.order
          ? {
              ...payload.order,
              status: nextStatus || payload.order.status,
              paymentStatus: nextPaymentStatus || payload.order.paymentStatus || prev.paymentStatus,
            }
          : {
              ...prev,
              status: nextStatus || prev.status,
              ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
            };

        if (nextStatus === "ACCEPTED" && payload.workerName) {
          setAcceptanceNotice(
            payload.message || `Your request has been accepted by ${payload.workerName}.`
          );
        }

        if (onOrderUpdatedRef.current) {
          onOrderUpdatedRef.current(merged);
        }

        return merged;
      });
    });

    socket.on("order:payment_received", (payload: any) => {
      if (!payload || (payload.orderId !== order.id && payload.order?.id !== order.id)) {
        return;
      }

      if (payload.receipt) {
        setPaymentReceipt(payload.receipt);
      }

      setOrder((prev) => {
        const merged: Order = {
          ...prev,
          status: "COMPLETED",
          paymentStatus: "PAID",
          paymentCompletedAt: payload.receipt?.paymentCompletedAt || new Date().toISOString(),
          paymentMethod: payload.receipt?.paymentMethod || prev.paymentMethod,
        };

        if (onOrderUpdatedRef.current) {
          onOrderUpdatedRef.current(merged);
        }

        return merged;
      });
    });

    // Fallback polling every 5s if order is still active
    const pollInterval = setInterval(() => {
      if (
        [
          "REQUESTED",
          "ACCEPTED",
          "NEGOTIATION",
          "CONFIRMED",
          "TRAVELLING",
          "ARRIVED",
          "IN_PROGRESS",
          "PAYMENT_PENDING",
        ].includes(order.status)
      ) {
        refreshOrder();
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      socket.emit("leave:order", order.id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [order.id, order.status, refreshOrder]);

  const handleViewReceipt = async () => {
    try {
      setFetchingReceipt(true);
      const res = await apiGet<{ success: boolean; data: OrderPaymentReceipt }>(
        `/orders/${order.id}/payment/receipt`
      );
      if (res.success && res.data) {
        setPaymentReceipt(res.data);
        setShowReceiptModal(true);
      }
    } catch (err: any) {
      console.warn("Could not fetch payment receipt:", err.message);
    } finally {
      setFetchingReceipt(false);
    }
  };

  const handlePaymentSuccess = (receipt: OrderPaymentReceipt) => {
    setPaymentReceipt(receipt);
    setShowPaymentModal(false);
    setShowReceiptModal(true);
    setOrder((prev) => {
      const merged: Order = {
        ...prev,
        status: "COMPLETED",
        paymentStatus: "PAID",
        paymentCompletedAt: receipt.paidAt || receipt.completedAt,
        paymentMethod: receipt.paymentMethod,
        grossAmount: receipt.grossAmount,
        workerEarnings: receipt.workerEarnings,
        platformFee: receipt.platformFee,
      };
      if (onOrderUpdatedRef.current) {
        onOrderUpdatedRef.current(merged);
      }
      return merged;
    });
  };

  const currentStageIdx = STAGES.findIndex((s) => {
    if (order.status === "NEGOTIATION" || order.status === "CONFIRMED") return s.status === "ACCEPTED";
    if (order.status === "PAYMENT_PENDING") return s.status === "COMPLETED";
    return s.status === order.status;
  });

  const workerUser = order.worker?.user;
  const workerProfile = order.worker;
  const problemName = order.problem?.name || order.problemTitle || "General Service";
  const categoryName = order.category?.name || "Home Repair";
  const workerRating = workerProfile?.avgRating || workerProfile?.rating || 4.9;
  const totalJobs = workerProfile?.totalJobs || 28;
  const workerTrade = workerProfile?.skillTags?.[0] || workerProfile?.trade || categoryName;

  const isScheduled = order.bookingMode === "SCHEDULED";
  const isTravelling = order.status === "TRAVELLING";
  const isArrived = order.status === "ARRIVED";
  const isInProgress = order.status === "IN_PROGRESS";
  const isCompleted = order.status === "COMPLETED";
  const isPaymentPending = order.status === "PAYMENT_PENDING" || (isCompleted && order.paymentStatus !== "PAID");
  const isPaid = order.paymentStatus === "PAID";
  const isAccepted = order.status === "ACCEPTED" || order.status === "CONFIRMED";
  const isRequested = order.status === "REQUESTED";

  return (
    <div
      className={`rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden space-y-0 transition-all ${className}`}
    >
      {/* Top Banner: Status Header */}
      <div className="bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40 p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-3.5 w-3.5 rounded-full shrink-0 ${
              isPaid
                ? "bg-emerald-500"
                : isPaymentPending
                ? "bg-amber-500 animate-pulse"
                : isTravelling
                ? "bg-purple-600 animate-ping"
                : "bg-[#800020] animate-pulse"
            }`}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-[#800020]">
                {isRequested && "1. Order Dispatched • Awaiting Technician"}
                {isAccepted && "2. Order Accepted by Technician"}
                {isTravelling && "3. Technician On The Way (Live GPS)"}
                {isArrived && "4. Technician Arrived at Premises"}
                {isInProgress && "5. Work in Progress"}
                {isPaymentPending && "6. Work Completed • Final Payment Due"}
                {isPaid && "6. Service Completed • Payment Settled"}
              </span>
              <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {order.orderRef}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isScheduled && order.scheduledAt
                ? `Scheduled for ${new Date(order.scheduledAt).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Immediate Dispatch Service"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={refreshOrder}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1 transition"
            title="Refresh order state"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <span
            id="consumer-order-status-badge"
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isPaid
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : isPaymentPending
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : isTravelling
                ? "bg-purple-50 text-purple-800 border-purple-200"
                : isAccepted
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {order.status}
          </span>
        </div>
      </div>

      {/* Prominent Acceptance Notice (Requirement 2) */}
      {(isAccepted || acceptanceNotice) && !isCompleted && !isRequested && (
        <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">
              {acceptanceNotice ||
                `Your request has been accepted by ${workerUser?.name || "the cooperative technician"}!`}
            </p>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              {isTravelling
                ? "Technician is currently in transit. Follow their live route on the map below."
                : isArrived
                ? "Technician has arrived outside your premises."
                : isInProgress
                ? "Technician is currently performing the service."
                : "Technician confirmed your booking. Exact service address has been securely disclosed."}
            </p>
          </div>
        </div>
      )}

      {/* Visual Stepper */}
      <div className="p-5 sm:p-6 pb-2">
        <div className="grid grid-cols-6 gap-1 sm:gap-2 text-center">
          {STAGES.map((s, idx) => {
            const isPassed = currentStageIdx >= idx;
            const isCurrent = currentStageIdx === idx;
            return (
              <div key={s.status} className="flex flex-col items-center">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isPassed
                      ? "bg-[#800020] text-white shadow-xs"
                      : "bg-slate-100 text-slate-400"
                  } ${isCurrent ? "ring-2 ring-rose-300 ring-offset-2 scale-105" : ""}`}
                >
                  {isPassed && idx < currentStageIdx ? "✓" : idx + 1}
                </div>
                <span
                  className={`mt-1.5 text-[10px] sm:text-[11px] font-semibold truncate max-w-[55px] sm:max-w-none ${
                    isPassed ? "text-slate-900 font-bold" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Order Content & Worker Snapshot */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Worker & Service Info Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {workerUser?.avatarUrl ? (
              <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                <Image
                  src={workerUser.avatarUrl}
                  alt={workerUser.name || "Worker"}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] font-black text-xl shrink-0">
                {workerUser?.name ? workerUser.name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {workerUser?.name || "Assigned Cooperative Technician"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#800020] text-[10px] font-bold border border-rose-200/60">
                  {workerTrade}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{workerRating.toFixed(1)}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-slate-400" />
                  <span>{totalJobs} jobs completed</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Verified Member</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-1.5 font-medium flex items-center gap-1.5">
                <span className="font-bold text-slate-800">{problemName}</span>
                <span className="text-slate-400">({categoryName})</span>
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200/80 sm:pl-4 shrink-0 flex sm:flex-col justify-between sm:justify-center items-end">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {order.isPriceLocked ? "Agreed Final Price" : "Protected Price Ceiling"}
              </span>
              <span className="text-lg font-black text-[#800020]">
                {formatCurrency(
                  Number(order.finalPrice || order.quotedPrice || order.basePrice)
                )}
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              100% Cooperative Escrow
            </p>
          </div>
        </div>

        {/* Phase 7 — In-PWA Real-Time Calling & Mutual Communication Consent */}
        {!isRequested && !isCompleted && (
          <CommunicationConsentCard
            orderId={order.id}
            userRole="CONSUMER"
            counterpartName={workerUser?.name}
            counterpartAvatar={workerUser?.avatarUrl}
            counterpartTrade={workerTrade}
            counterpartUserId={order.worker?.userId}
            onOpenNegotiation={() => setShowNegotiationModal(true)}
          />
        )}

        {/* State-Specific Notices & Maps */}

        {/* 1. REQUESTED Notice */}
        {isRequested && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
              <span>Awaiting Technician Acceptance</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              We have notified {workerUser?.name || "the nearest verified artisan"}. As soon as
              they accept the job, you will receive real-time notification here.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
              <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                <strong>Privacy Protected:</strong> Your exact street address is hidden. Only
                approximate distance (~{order.approxDistanceKm || 1.3} km) is shared.
              </span>
            </div>
          </div>
        )}

        {/* 2. ACCEPTED (Pre-Travel) Notice */}
        {isAccepted && !isTravelling && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 text-xs text-blue-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-blue-950">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Technician Preparing For Departure</span>
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200 font-mono text-blue-800 font-bold">
                Status: ACCEPTED
              </span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              {isScheduled
                ? `This is a scheduled service for ${new Date(
                    order.scheduledAt!
                  ).toLocaleString()}. Live GPS map tracking will unlock automatically when the technician starts travel.`
                : "The technician is preparing tools and supplies. Real-time GPS movement and map route will activate the moment they begin travel."}
            </p>
          </div>
        )}

        {/* 3. LIVE MAP (TRAVELLING & ARRIVED) */}
        {(isTravelling || isArrived) && showMapDirectly && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-[#800020]" />
                <span>Live Route & GPS Turn-by-Turn Tracking</span>
              </span>
              <span className="text-[11px] text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping" />
                <span>Live Movement Active</span>
              </span>
            </div>

            <LiveOrderTrackingMap
              orderId={order.id}
              userRole="CONSUMER"
              onStatusChange={(nextStatus) => {
                setOrder((prev) => ({ ...prev, status: nextStatus }));
                if (onOrderUpdatedRef.current) {
                  onOrderUpdatedRef.current({ ...order, status: nextStatus });
                }
              }}
            />
          </div>
        )}

        {/* 4. WORK IN PROGRESS (IN_PROGRESS) */}
        {isInProgress && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs text-indigo-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-indigo-950 text-sm">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                <span>Work in Progress on Site</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold font-mono">
                IN_PROGRESS
              </span>
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              The technician is currently working on: <strong>{problemName}</strong>. Once they
              finish testing and complete the repair, the final completion summary and escrow payment
              details will appear here.
            </p>
          </div>
        )}

        {/* 5. SERVICE COMPLETED & POST-COMPLETION PAYMENT FLOW */}
        {(isPaymentPending || isCompleted) && (
          <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-5 text-center space-y-3 shadow-xs">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${
                isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 font-heading">
                {isPaid ? "Payment Completed — Order Settled" : "Work Completed — Final Payment Due"}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {isPaid
                  ? "Your payment has been securely confirmed. Technician has received their earnings."
                  : "The technician has completed all work. Please confirm final payment to complete your order."}
              </p>
            </div>

            <div className="max-w-xs mx-auto p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex justify-between items-center">
              <span className="text-slate-500 font-medium">Final Amount:</span>
              <span className="text-base font-black text-[#800020] font-mono">
                {formatCurrency(Number(order.finalPrice || order.quotedPrice || order.basePrice))}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">Payment Status:</span>
              <span
                id="consumer-order-payment-status"
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : order.paymentStatus === "PAYMENT_FAILED"
                    ? "bg-rose-50 text-rose-800 border-rose-300"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {order.paymentStatus || (isPaid ? "PAID" : "PAYMENT_PENDING")}
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {isPaid ? (
                <button
                  type="button"
                  id="view-receipt-btn"
                  onClick={handleViewReceipt}
                  disabled={fetchingReceipt}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>{fetchingReceipt ? "Loading Receipt..." : "View Official Payment Receipt"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="pay-now-btn"
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#600018] text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>
                    Pay {formatCurrency(Number(order.finalPrice || order.quotedPrice || order.basePrice))} via Razorpay
                  </span>
                </button>
              )}
              <Link
                href={`/consumer/problem-selection?orderId=${order.id}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                <span>View Full Summary</span>
              </Link>
            </div>
          </div>
        )}

        {/* Delivery / Service Address Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-[#800020] shrink-0" />
            <span className="truncate">
              {order.isAddressMasked
                ? `Protected Area: ${order.approxArea || "Neighborhood Service Zone"}`
                : order.address}
            </span>
          </div>
          <Link
            href={`/consumer/problem-selection?orderId=${order.id}`}
            className="text-xs font-bold text-[#800020] hover:underline flex items-center gap-1 self-end sm:self-auto shrink-0"
          >
            <span>Detailed Order View</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Structured Price Negotiation Modal */}
      {showNegotiationModal && (
        <PriceNegotiationModal
          orderId={order.id}
          isOpen={showNegotiationModal}
          onClose={() => setShowNegotiationModal(false)}
          userRole="CONSUMER"
          onPriceConfirmed={(agreedPrice) => {
            setOrder((prev) => ({
              ...prev,
              finalPrice: agreedPrice,
              isPriceLocked: true,
            }));
          }}
        />
      )}

      {/* Order Payment Modal (Post-completion Razorpay / Verified Test Checkout) */}
      {showPaymentModal && (
        <OrderPaymentModal
          order={order}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Official Payment Receipt Modal */}
      {showReceiptModal && (
        <OrderPaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receipt={paymentReceipt}
          viewerRole="CONSUMER"
        />
      )}
    </div>
  );
}

export default ConsumerActiveOrderCard;
