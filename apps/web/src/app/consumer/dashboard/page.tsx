"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Briefcase,
  ArrowRight,
  Loader2,
  ShieldCheck,
  MapPin,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  HardHat,
  Plus,
  Wallet,
  Clock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ConsumerActiveOrderCard } from "@/components/consumer/ConsumerActiveOrderCard";
import { OrderPaymentReceiptModal } from "@/components/payment/OrderPaymentReceiptModal";
import { apiGet } from "@/lib/api";
import { getStoredToken } from "@/lib/storage";
import { getWebSocketUrl } from "@/lib/websocket";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import type { Order, OrderPaymentReceipt } from "@/lib/types";

export default function ConsumerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<OrderPaymentReceipt | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleOpenReceipt = async (orderId: string) => {
    try {
      setLoadingReceiptId(orderId);
      const res = await apiGet<{ success: boolean; data: OrderPaymentReceipt }>(
        `/orders/${orderId}/payment/receipt`
      );
      if (res.success && res.data) {
        setSelectedReceipt(res.data);
        setIsReceiptOpen(true);
      }
    } catch (err: any) {
      console.warn("Could not fetch receipt:", err.message);
    } finally {
      setLoadingReceiptId(null);
    }
  };

  // Fetch active order & all orders from backend
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [activeRes, allRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: Order | null }>("/orders/consumer/active"),
        apiGet<{ success: boolean; data: Order[] }>("/orders/consumer"),
      ]);

      if (activeRes.status === "fulfilled" && activeRes.value.success) {
        setActiveOrder(activeRes.value.data || null);
      }

      if (allRes.status === "fulfilled" && allRes.value.success) {
        const list = allRes.value.data || [];
        setOrders(list);

        // Fallback: if activeOrder endpoint didn't find one, check the list for active statuses
        if (activeRes.status === "rejected" || !activeRes.value.data) {
          const activeStatuses = [
            "REQUESTED",
            "ACCEPTED",
            "NEGOTIATION",
            "CONFIRMED",
            "TRAVELLING",
            "ARRIVED",
            "IN_PROGRESS",
            "PAYMENT_PENDING",
          ];
          const found = list.find((o) => activeStatuses.includes(o.status));
          if (found) {
            setActiveOrder(found);
          } else {
            // Also check for recently settled order (completed within last 30 minutes)
            const recentSettled = list.find(
              (o) =>
                (o.status === "COMPLETED" || o.paymentStatus === "PAID") &&
                Date.now() - new Date(o.updatedAt || o.createdAt).getTime() < 30 * 60 * 1000
            );
            if (recentSettled) {
              setActiveOrder(recentSettled);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch consumer orders:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Realtime Socket.IO synchronization on consumer user room
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

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
      if (user?.id) {
        socket.emit("join:user", user.id);
      }
      if (activeOrder?.id) {
        socket.emit("join:order", activeOrder.id);
      }
    });

    socket.on("order:status_update", (payload: any) => {
      // Refresh dashboard data on any status change
      fetchDashboardData(true);
    });

    socket.on("orders:update", () => {
      fetchDashboardData(true);
    });

    // Background poll every 8 seconds to ensure sync
    const pollInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 8000);

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, activeOrder?.id, fetchDashboardData]);

  const completedOrders = orders.filter((o) => o.status === "COMPLETED" || o.status === "PAID");
  const completedCount = completedOrders.length;
  const initial = (user?.name || "C").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl">
      {/* Main Household Header Card matching Landing Page Maroon Theme */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-[#FFFDFB] to-rose-50/35 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#800020]/10 text-[#800020] font-black text-2xl border border-[#800020]/20 shadow-2xs shrink-0">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-rose-50 text-[#800020] border border-rose-200/70 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                  Household Service Hub
                </span>
                <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Verified Resident</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight mt-1">
                नमस्ते, {user?.name || "Neighbor"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>100% Cooperative Escrow Protection</span>
                <span>•</span>
                <span>Local Certified Artisans</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <Link
              href="/consumer/problem-selection"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>Select Problem</span>
            </Link>
            <Link
              href="/consumer/wallet"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold shadow-2xs transition-colors"
            >
              <Wallet className="h-4 w-4 text-[#800020]" />
              <span>Wallet</span>
            </Link>
          </div>
        </div>

        {/* Quick Nav Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <Link
            href="/consumer/problem-selection"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 hover:border-[#800020] px-3.5 py-1.5 font-bold text-[#800020] shadow-2xs transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#800020]" />
            <span>Problem Selection Flow</span>
          </Link>
          <Link
            href="#recent-orders"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-[#800020]/40 px-3.5 py-1.5 font-bold text-slate-700 hover:text-[#800020] shadow-2xs transition-colors"
          >
            <Briefcase className="h-3.5 w-3.5 text-[#800020]" />
            <span>All Orders ({orders.length})</span>
          </Link>
          <Link
            href="/consumer/profile"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 font-bold text-slate-600 hover:text-slate-900 shadow-2xs transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>Service Address</span>
          </Link>
          <Link
            href="/verify/digilocker"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 text-[#800020] hover:bg-rose-100 px-3.5 py-1.5 font-bold shadow-2xs transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#800020]" />
            <span>DigiLocker KYC</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ACTIVE ORDER SPOTLIGHT CARD (REQUIREMENTS 1, 2, 3, 5, 6)               */}
      {/* ========================================================================= */}
      {activeOrder && (
        <section className="space-y-3 animate-fade-in" id="active-service">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#800020] animate-pulse" />
              <span>Active Service Dispatch</span>
            </h2>
            <Link
              href={`/consumer/problem-selection?orderId=${activeOrder.id}`}
              className="text-xs font-bold text-[#800020] hover:underline flex items-center gap-1"
            >
              <span>Full Screen Cockpit</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <ConsumerActiveOrderCard
            initialOrder={activeOrder}
            onOrderUpdated={(updated) => {
              if (["CANCELLED"].includes(updated.status)) {
                setActiveOrder(null);
              } else {
                setActiveOrder(updated);
              }
              fetchDashboardData(true);
            }}
          />
        </section>
      )}

      {/* Quick Trade Problem Selection Carousel */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              Select Problem by Category
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your service to browse specific issues, explain with text or voice, and get fair estimates.
            </p>
          </div>
          <Link href="/consumer/problem-selection" className="text-xs font-bold text-[#800020] hover:underline">
            All Categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              slug: "plumbing",
              title: "Plumbing",
              icon: Droplets,
              desc: "Taps, toilets, sinks, drains",
              bg: "bg-sky-500/10 text-sky-600 border-sky-200/60",
              hoverBg: "hover:border-sky-400",
            },
            {
              slug: "electrical",
              title: "Electrical",
              icon: Zap,
              desc: "Switches, fans, MCB, wiring",
              bg: "bg-amber-500/10 text-amber-600 border-amber-200/60",
              hoverBg: "hover:border-amber-400",
            },
            {
              slug: "carpentry",
              title: "Carpentry",
              icon: Hammer,
              desc: "Doors, locks, drawers, drilling",
              bg: "bg-orange-500/10 text-orange-600 border-orange-200/60",
              hoverBg: "hover:border-orange-400",
            },
            {
              slug: "appliance-repair",
              title: "Appliance Repair",
              icon: Sparkles,
              desc: "AC, washing machine, geyser, RO",
              bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200/60",
              hoverBg: "hover:border-emerald-400",
            },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                href={`/consumer/problem-selection?category=${cat.slug}`}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white ${cat.hoverBg} hover:shadow-md transition-all group text-center`}
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center mb-2.5 border transition-transform group-hover:scale-110 duration-200 ${cat.bg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#800020] transition-colors">
                  {cat.title}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5 line-clamp-1">
                  {cat.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Household Vital Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={Briefcase}
          label="Total Services Completed"
          value={completedCount}
          subtitle="Finished cooperative orders"
          color="maroon"
        />
        <StatsCard
          icon={Clock}
          label="Active Dispatches"
          value={activeOrder ? 1 : 0}
          subtitle={activeOrder ? activeOrder.status : "No active job"}
          color="amber"
        />
        <StatsCard
          icon={ShieldCheck}
          label="Co-op Escrow Protection"
          value="100% Protected"
          subtitle="Zero advance risk"
          color="emerald"
        />
      </div>

      {/* Recent Orders Activity */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs" id="recent-orders">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              Recent Service Orders
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Your work orders, dispatch history and receipts</p>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
            className="text-xs font-bold text-[#800020] hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-[#800020]" />
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-[#800020]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {o.orderRef}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        o.status === "COMPLETED" || o.status === "PAID"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : o.status === "TRAVELLING"
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : o.status === "ACCEPTED"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : o.status === "REJECTED" || o.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {o.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">
                    {o.problem?.name || o.problemTitle || "Home Service"}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>Technician: {o.worker?.user?.name || "Assigned Cooperative Member"}</span>
                    <span>•</span>
                    <span>{o.category?.name || "Service"}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Price
                    </span>
                    <span className="text-sm font-black text-[#800020]">
                      {formatCurrency(Number(o.finalPrice || o.quotedPrice || o.basePrice))}
                    </span>
                  </div>

                  {(o.status === "COMPLETED" || o.paymentStatus === "PAID") && (
                    <button
                      type="button"
                      id="view-receipt-btn"
                      onClick={() => handleOpenReceipt(o.id)}
                      disabled={loadingReceiptId === o.id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Receipt className="h-3 w-3" />
                      <span>{loadingReceiptId === o.id ? "Loading..." : "Receipt"}</span>
                    </button>
                  )}

                  <Link
                    href={`/consumer/bookings`}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-400 text-xs">
            <CalendarCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No service orders yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Select Problem&quot; above to hire an electrician, plumber, or carpenter.</p>
          </div>
        )}
      </div>

      {/* Cooperative Assurance Banner matching Landing Page */}
      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 px-3 py-0.5 text-[10px] font-bold text-rose-300 uppercase">
            <ShieldCheck className="h-3 w-3" />
            <span>सर्वकर्मक्षमः Trust Protocol</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-heading">
            Cooperative Quality Assurance Guarantee
          </h3>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Your payment stays locked in cooperative escrow until you verify the work with OTP. Fair pricing, no surprise surge fees, and background-checked neighborhood professionals.
          </p>
        </div>
        <Link
          href="/consumer/problem-selection"
          className="rounded-full bg-[#800020] hover:bg-[#68001a] text-white px-6 py-2.5 text-xs font-bold shadow-md transition-all active:scale-98 shrink-0 self-start md:self-auto"
        >
          Book Verified Artisan
        </Link>
      </div>

      {/* Official Payment Receipt Modal */}
      <OrderPaymentReceiptModal
        isOpen={isReceiptOpen}
        receipt={selectedReceipt}
        onClose={() => setIsReceiptOpen(false)}
        viewerRole="CONSUMER"
      />
    </div>
  );
}
