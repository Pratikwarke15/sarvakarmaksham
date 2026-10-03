"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { BookingCard } from "@/components/booking/BookingCard";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CalendarCheck,
  ShieldCheck,
  KeyRound,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PhoneCall,
  MapPin,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Zap,
  Lock,
  Phone,
  User,
  Star,
  Receipt,
  Navigation,
  TrendingUp,
  Volume2,
  XCircle,
  Camera,
  Film,
  Trash2,
} from "lucide-react";
import { cn, formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { PriceNegotiationModal } from "@/components/worker/PriceNegotiationModal";
import { OrderPaymentReceiptModal } from "@/components/payment/OrderPaymentReceiptModal";

import { CommunicationConsentCard } from "@/components/calling/CommunicationConsentCard";
import type { Booking, BookingStatus, Order, OrderPaymentReceipt, ProblemRequest } from "@/lib/types";

type ConsumerTabFilter = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DRAFTS";

const tabs: { label: string; filter: ConsumerTabFilter }[] = [
  { label: "All", filter: "ALL" },
  { label: "Active", filter: "ACTIVE" },
  { label: "Completed", filter: "COMPLETED" },
  { label: "Cancelled", filter: "CANCELLED" },
  { label: "Drafts", filter: "DRAFTS" },
];

const ACTIVE_ORDER_STATUSES = [
  "REQUESTED",
  "ACCEPTED",
  "NEGOTIATION",
  "CONFIRMED",
  "TRAVELLING",
  "ARRIVED",
  "IN_PROGRESS",
  "PAYMENT_PENDING",
];

const lifecycleSteps = [
  {
    step: "01",
    title: "Request & Instant Dispatch",
    subtitle: "AI Geofenced Technician Matching",
    description:
      "When you book via voice or 1-tap, Shramik checks for verified technicians within your local radius. The nearest available technician receives an instant notification with problem details and location.",
    icon: MapPin,
    accent: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "Instant GPS Dispatch",
  },
  {
    step: "02",
    title: "Technician En-Route & ETA",
    subtitle: "Live Navigation & Real-Time Tracking",
    description:
      "You can track the technician's arrival status with transparent turn-by-turn ETA. You receive technician name, verified Aadhaar badge, photo, and direct phone contact.",
    icon: Clock,
    accent: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "Zero Middlemen",
  },
  {
    step: "03",
    title: "Doorstep 4-Digit Start OTP",
    subtitle: "Absolute Customer Security",
    description:
      "Work cannot begin until you share your secret 4-digit start OTP shown in your app. This guarantees the technician has physically arrived at your location with your explicit consent.",
    icon: KeyRound,
    accent: "bg-rose-50 text-[#800020] border-rose-200",
    badge: "Fraud Prevention",
  },
  {
    step: "04",
    title: "Fair Work Timer & Material Proof",
    subtitle: "No Hidden Costs or Inflated Parts",
    description:
      "Labour is monitored with a transparent live service timer starting from the base ₹50 rate. If spare parts are needed, the technician uploads photo proof of shop bills for your direct digital approval.",
    icon: ShieldCheck,
    accent: "bg-purple-50 text-purple-700 border-purple-200",
    badge: "100% Transparent",
  },
  {
    step: "05",
    title: "Completion OTP & Digital Invoice",
    subtitle: "Customer Verification & Satisfaction",
    description:
      "Only after testing the completed repair and verifying full satisfaction do you provide the completion OTP. An itemized digital invoice is generated immediately.",
    icon: CheckCircle2,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "Direct UPI Escrow",
  },
  {
    step: "06",
    title: "Permanent History & 7-Day Warranty",
    subtitle: "Stored in Your Digital Profile",
    description:
      "All service records, parts warranties, technician details, and digital receipts remain permanently stored in your account history for instant re-ordering or warranty assistance.",
    icon: FileText,
    accent: "bg-slate-50 text-slate-700 border-slate-200",
    badge: "Audit Ready",
  },
];

export default function BookingsPage() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [viewMode, setViewMode] = useState<"bookings" | "guide">(
    isAuthenticated && user?.role === "CONSUMER" ? "bookings" : "guide"
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drafts, setDrafts] = useState<ProblemRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ConsumerTabFilter>("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Modals
  const [negotiatingOrder, setNegotiatingOrder] = useState<Order | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<OrderPaymentReceipt | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "CONSUMER") return;
    setLoading(true);
    try {
      const [bookingsRes, ordersRes, draftsRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: Booking[] }>("/bookings"),
        apiGet<{ success: boolean; data: Order[] }>("/orders/consumer"),
        apiGet<{ success: boolean; data: ProblemRequest[] }>("/problem-requests/my-drafts"),
      ]);

      if (bookingsRes.status === "fulfilled" && bookingsRes.value.success) {
        setBookings(bookingsRes.value.data || []);
      }
      if (ordersRes.status === "fulfilled" && ordersRes.value.success) {
        setOrders(ordersRes.value.data || []);
      }
      if (draftsRes.status === "fulfilled" && draftsRes.value.success) {
        setDrafts(draftsRes.value.data || []);
      }
    } catch {
      toast({ title: "Failed to load bookings", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelBooking = async (id: string) => {
    try {
      setCancellingId(id);
      const res = await apiPost<{ success: boolean; error?: string }>(`/bookings/${id}/cancel`, {
        reason: "Cancelled by consumer",
      });
      if (res.success) {
        toast({ title: "Booking cancelled", variant: "success" });
        fetchData();
      } else {
        toast({ title: res.error || "Could not cancel", variant: "danger" });
      }
    } catch {
      toast({ title: "Could not cancel booking", variant: "danger" });
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancellingId(orderId);
      const res = await apiPost<{ success: boolean; error?: string; message?: string }>(
        `/orders/${orderId}/cancel`,
        { reason: "Cancelled by consumer from bookings dashboard" }
      );
      if (res.success) {
        toast({
          title: "Order Cancelled",
          description: "Your request has been cancelled.",
          variant: "default",
        });
        fetchData();
      } else {
        toast({ title: res.error || "Could not cancel order", variant: "danger" });
      }
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description: err.response?.data?.error || err.message,
        variant: "danger",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      const res = await apiDelete<{ success: boolean; message?: string }>(`/problem-requests/drafts/${id}`);
      if (res.success) {
        toast({ title: "Draft discarded", variant: "default" });
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      toast({ title: "Failed to delete draft", variant: "danger" });
    }
  };

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
      toast({
        title: "Receipt Not Found",
        description: err.response?.data?.error || "Receipt data is not available yet.",
        variant: "danger",
      });
    } finally {
      setLoadingReceiptId(null);
    }
  };

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "ACTIVE") return ACTIVE_ORDER_STATUSES.includes(o.status);
    if (activeTab === "COMPLETED") return o.status === ("COMPLETED" as any) || o.paymentStatus === "PAID";
    if (activeTab === "CANCELLED") return o.status === ("CANCELLED" as any) || o.status === ("REJECTED" as any);
    return true;
  });

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "ACTIVE") return ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"].includes(b.status);
    if (activeTab === "COMPLETED") return b.status === "COMPLETED";
    if (activeTab === "CANCELLED") return b.status === "CANCELLED";
    return true;
  });

  // Tab counts
  const countAll = orders.length + bookings.length;
  const countActive =
    orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length +
    bookings.filter((b) => ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"].includes(b.status)).length;
  const countCompleted =
    orders.filter((o) => o.status === ("COMPLETED" as any) || o.paymentStatus === "PAID").length +
    bookings.filter((b) => b.status === "COMPLETED").length;
  const countCancelled =
    orders.filter((o) => o.status === ("CANCELLED" as any) || o.status === ("REJECTED" as any)).length +
    bookings.filter((b) => b.status === "CANCELLED").length;
  const countDrafts = drafts.length;

  const totalItemsCount =
    activeTab === "DRAFTS"
      ? drafts.length
      : filteredOrders.length + filteredBookings.length;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-10 animate-fade-in space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-xs font-bold text-[#800020] mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Doorstep Service Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            My Bookings & <span className="text-[#800020]">Service History</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
            Track active repair orders, view historical digital invoices, and verify fair-price cooperative technician service.
          </p>
        </div>

        {/* View Switcher Tabs (if user is authenticated) */}
        {isAuthenticated && user?.role === "CONSUMER" && (
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("bookings")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                viewMode === "bookings" ? "bg-white text-[#800020] shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              My Bookings ({countAll})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("guide")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                viewMode === "guide" ? "bg-white text-[#800020] shadow-2xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              How It Works (Guide)
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: ACTIVE & PAST BOOKINGS (For Authenticated Consumers) */}
      {viewMode === "bookings" && isAuthenticated && user?.role === "CONSUMER" && (
        <div className="space-y-6">
          {/* Segmented Filter Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
            {tabs.map((t) => {
              const count =
                t.filter === "ALL"
                  ? countAll
                  : t.filter === "ACTIVE"
                  ? countActive
                  : t.filter === "COMPLETED"
                  ? countCompleted
                  : t.filter === "CANCELLED"
                  ? countCancelled
                  : countDrafts;

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
              <p className="text-xs text-slate-500 font-medium">Loading your real bookings and orders...</p>
            </div>
          ) : totalItemsCount === 0 ? (
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs space-y-4">
              <div className="h-14 w-14 mx-auto rounded-3xl bg-rose-50 text-[#800020] flex items-center justify-center">
                <CalendarCheck className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeTab === "DRAFTS"
                    ? "No saved problem drafts"
                    : activeTab === "ALL"
                    ? "No service bookings yet"
                    : `No ${activeTab.toLowerCase()} bookings found`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {activeTab === "DRAFTS"
                    ? "When you describe an issue and save a draft, it will stay here so you can review worker quotes and book whenever you're ready."
                    : "Book certified cooperative plumbers, electricians, carpenters, and appliance experts with transparent rate protection."}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/consumer/problem-selection"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-[#800020]/20 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{activeTab === "DRAFTS" ? "Create a Problem Request" : "Book a Service Now"}</span>
                </Link>
              </div>
            </div>
          ) : activeTab === "DRAFTS" ? (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-2xl sm:rounded-3xl border border-rose-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-4 hover:border-[#800020]/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-slate-900">
                          {draft.problem?.name || draft.problemTitle || "Saved Problem Request"}
                        </span>
                        {draft.category && (
                          <Badge className="bg-rose-50 text-[#800020] border-rose-200 font-bold">
                            {draft.category.name}
                          </Badge>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          DRAFT · READY TO BOOK
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Ref: {draft.requestRef} · Saved {formatDateTime(draft.createdAt)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-base sm:text-xl font-black text-[#800020] font-mono">
                        {formatCurrency(Number(draft.estimatedPriceMin || draft.estimatedMin || 100))} - {formatCurrency(Number(draft.estimatedPriceMax || draft.estimatedMax || 400))}
                      </span>
                      <p className="text-[10px] text-slate-500 font-medium">Cooperative Rate Range</p>
                    </div>

                  </div>

                  {/* Problem Explanations */}
                  <div className="space-y-3 bg-slate-50/80 rounded-2xl p-3 sm:p-4 border border-slate-100">
                    {draft.textDescription && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Written Description
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 bg-white p-3 rounded-xl border border-slate-200/80">
                          {draft.textDescription}
                        </p>
                      </div>
                    )}

                    {draft.audioUrl && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Recorded Voice Note
                        </span>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2">
                          <audio controls src={draft.audioUrl} className="w-full h-8 accent-[#800020]" />
                        </div>
                      </div>
                    )}

                    {draft.photos && draft.photos.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Attached Photos ({draft.photos.length})
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {draft.photos.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Draft photo ${i + 1}`}
                              className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {draft.videoUrl && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Problem Video Clip
                        </span>
                        <video
                          controls
                          playsInline
                          src={draft.videoUrl}
                          className="w-full max-w-xs h-32 object-contain bg-black rounded-xl"
                        />
                      </div>
                    )}
                  </div>

                  {/* Draft Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Discard Draft</span>
                    </button>

                    <Link
                      href={`/consumer/problem-selection?draftId=${draft.id}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#800020]/20 transition"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Resume & Select Worker</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Modern Orders Section */}
              {filteredOrders.map((order) => {
                const isActive = ACTIVE_ORDER_STATUSES.includes(order.status);
                const isCompleted = order.status === ("COMPLETED" as any) || order.paymentStatus === "PAID";
                const isCancelled = order.status === ("CANCELLED" as any) || order.status === ("REJECTED" as any);
                const price = Number(order.finalPrice || order.grossAmount || order.basePrice || 50);

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4 transition-all hover:border-slate-300"
                  >
                    {/* Top Row: Service Title, Status & Price */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-slate-900">
                            {order.problemTitle || order.problem?.name || "Service Request"}
                          </span>
                          <Badge className="bg-rose-50 text-[#800020] border-rose-200 font-bold">
                            {order.category?.name || "Home Repair"}
                          </Badge>
                          {/* Live Status Badge */}
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1",
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : isCompleted
                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            )}
                          >
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Ref: {order.orderRef} · Booked {formatDateTime(order.createdAt)}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-base sm:text-xl font-black text-slate-900 font-mono">
                          {formatCurrency(price)}
                        </span>
                        <p className="text-[10px] text-emerald-600 font-bold">
                          {order.isPriceLocked ? "✓ Price Locked" : "Cooperative Guaranteed Rate"}
                        </p>
                      </div>
                    </div>

                    {/* Technician Details Card */}
                    {order.worker && (
                      <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-4 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#800020] font-black text-base overflow-hidden shrink-0 shadow-2xs">
                            {order.worker.user?.avatarUrl ? (
                              <img
                                src={order.worker.user.avatarUrl}
                                alt={order.worker.user.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (order.worker.user?.name || "T").charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {order.worker.user?.name || "Verified Technician"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                                Verified Member
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {order.worker.coop?.name || "Cooperative Society"} ({order.worker.coop?.city || "Delhi-NCR"})
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* In-PWA Realtime WebRTC Voice Calling & Consent Card */}
                    {order.worker && isActive && (
                      <div className="pt-1">
                        <CommunicationConsentCard
                          orderId={order.id}
                          userRole="CONSUMER"
                          counterpartName={order.worker.user?.name || "Technician"}
                          counterpartAvatar={order.worker.user?.avatarUrl}
                          counterpartTrade={order.problemTitle || "Technician"}
                          counterpartUserId={order.worker.userId}
                          onOpenNegotiation={!order.isPriceLocked ? () => setNegotiatingOrder(order) : undefined}
                        />
                      </div>
                    )}



                    {/* Doorstep Address & Location */}
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="h-4 w-4 text-[#800020] shrink-0 mt-0.5" />
                      <span>{order.address || order.approxArea || "Doorstep Service Address"}</span>
                    </div>

                    {/* Problem Description & Media (Audio, Photos, Video) */}
                    {(order.textDescription || order.audioUrl || (order.photos && order.photos.length > 0) || order.videoUrl) && (
                      <div className="space-y-2 text-xs">
                        {order.textDescription && (
                          <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                            &ldquo;{order.textDescription}&rdquo;
                          </p>
                        )}
                        {order.audioUrl && (
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                              <Volume2 className="h-3.5 w-3.5 text-amber-700" />
                              <span>Attached Voice Note</span>
                            </div>
                            <audio controls src={order.audioUrl} className="w-full h-8 accent-[#800020]" />
                          </div>
                        )}
                        {order.photos && order.photos.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-500">Attached Photos ({order.photos.length})</span>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                              {order.photos.map((p, idx) => (
                                <img
                                  key={idx}
                                  src={p}
                                  alt={`Order attachment ${idx + 1}`}
                                  className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {order.videoUrl && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-500">Attached Video</span>
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 max-w-xs">
                              <video src={order.videoUrl} controls playsInline className="w-full h-36 object-contain bg-black" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isActive && (
                          <Link
                            href={`/consumer/problem-selection?orderId=${order.id}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-xs transition"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            <span>Live Track Order</span>
                          </Link>
                        )}

                        {!order.isPriceLocked && isActive && (
                          <button
                            type="button"
                            onClick={() => setNegotiatingOrder(order)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-[#800020] hover:bg-rose-100 border border-rose-200/70 text-xs font-bold transition"
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Price Negotiation</span>
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            type="button"
                            disabled={loadingReceiptId === order.id}
                            onClick={() => handleOpenReceipt(order.id)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition"
                          >
                            {loadingReceiptId === order.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Receipt className="h-3.5 w-3.5 text-emerald-700" />
                            )}
                            <span>View Digital Invoice</span>
                          </button>
                        )}
                      </div>

                      {isActive && order.status !== ("IN_PROGRESS" as any) && (
                        <button
                          type="button"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 p-2 rounded-xl hover:bg-rose-50 transition self-end sm:self-auto disabled:opacity-50"
                        >
                          {cancellingId === order.id ? "Cancelling..." : "Cancel Order"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Legacy Bookings Section */}
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={handleCancelBooking}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COMPREHENSIVE TEXTUAL & GRAPHICAL GUIDE */}
      {(viewMode === "guide" || !isAuthenticated || user?.role !== "CONSUMER") && (
        <div className="space-y-12">
          {/* Guest Alert Banner */}
          {!isAuthenticated && (
            <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-rose-50/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Exploring Service Lifecycle?</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    This interactive guide illustrates how Shramik executes verified doorstep services, prevents overcharging, and safeguards consumer trust.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Link
                  href="/login?redirect=/consumer/bookings"
                  className="rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-bold transition-colors"
                >
                  Customer Login
                </Link>
                <Link
                  href="/register?role=CONSUMER"
                  className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors"
                >
                  Book a Service
                </Link>
              </div>
            </div>
          )}

          {/* Stepper Cards */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">Zero Exploitation</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                How Shramik Protects Your Doorstep Service
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                From voice request dispatch to escrow-backed settlement, every step guarantees transparency, fair DSR pricing, and satisfaction.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lifecycleSteps.map((item) => {
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
            fetchData();
          }}
          orderId={negotiatingOrder.id}
          userRole="CONSUMER"
          onPriceConfirmed={() => {
            setNegotiatingOrder(null);
            fetchData();
          }}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <OrderPaymentReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setSelectedReceipt(null);
          }}
          receipt={selectedReceipt}
        />
      )}
    </div>
  );
}
