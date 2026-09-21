"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { BookingCard } from "@/components/booking/BookingCard";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import type { Booking, BookingStatus } from "@/lib/types";

const tabs: { label: string; filter: BookingStatus | "ALL" }[] = [
  { label: "All", filter: "ALL" },
  { label: "Active", filter: "PENDING" },
  { label: "Completed", filter: "COMPLETED" },
  { label: "Cancelled", filter: "CANCELLED" },
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
  const [viewMode, setViewMode] = useState<"bookings" | "guide">(isAuthenticated && user?.role === "CONSUMER" ? "bookings" : "guide");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | BookingStatus>("ALL");

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "CONSUMER") return;
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Booking[] }>("/bookings");
      if (res.success) setBookings(res.data || []);
    } catch {
      toast({ title: "Failed to load bookings", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (id: string) => {
    try {
      const res = await apiPost<{ success: boolean; error?: string }>(`/bookings/${id}/cancel`, {
        reason: "Cancelled by consumer",
      });
      if (res.success) {
        toast({ title: "Booking cancelled", variant: "success" });
        fetchBookings();
      } else {
        toast({ title: res.error || "Could not cancel", variant: "danger" });
      }
    } catch {
      toast({ title: "Could not cancel booking", variant: "danger" });
    }
  };

  const filtered = bookings.filter((b) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PENDING") return ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"].includes(b.status);
    return b.status === activeTab;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fade-in space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-xs font-bold text-[#800020] mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Doorstep Service Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            My Bookings & <span className="text-[#800020]">Service History</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Track active repair orders, view historical digital invoices, and understand how Shramik ensures transparent, OTP-verified technician service.
          </p>
        </div>

        {/* View Switcher Tabs (if user is authenticated) */}
        {isAuthenticated && user?.role === "CONSUMER" && (
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("bookings")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "bookings" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              My Bookings ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("guide")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "guide" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
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
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((b) => (
                <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#800020] mb-4">
                <CalendarCheck className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No bookings in this category</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Need an electrician, plumber, or carpenter right now? Book a verified technician starting at ₹50.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/consumer/book"
                  className="inline-flex items-center gap-2 rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-6 py-2.5 text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Book a Repair Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setViewMode("guide")}
                  className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 text-xs font-semibold transition-colors"
                >
                  Learn How Lifecycle Works
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COMPREHENSIVE TEXTUAL & GRAPHICAL LIFECYCLE GUIDE */}
      {(viewMode === "guide" || !isAuthenticated || user?.role !== "CONSUMER") && (
        <div className="space-y-12">
          {/* Guest Info Alert Banner */}
          {!isAuthenticated && (
            <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-rose-50/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Visiting from the Landing Page or Footer?</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    This page explains how Shramik manages every booking and historical record. Log in or create an account to view and manage your live service orders.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Link
                  href="/login?redirect=/consumer/bookings"
                  className="rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-bold transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/consumer/book"
                  className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors"
                >
                  Book a Service
                </Link>
              </div>
            </div>
          )}

          {/* Graphical Lifecycle Stepper Cards */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">Step-by-Step Security</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                How We Manage Your Bookings & Lifecycle
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600">
                A transparent 6-stage lifecycle engineered to eliminate unauthorized charges, track verified technician identity, and safeguard every rupee.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lifecycleSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="group relative rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border shadow-xs", item.accent)}>
                        <Icon className="h-6 w-6" />
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

          {/* Interactive Visual Status Pipeline */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Visual Order Status Pipeline</h3>
            <p className="text-xs text-slate-500 mb-8 max-w-xl">
              Every booking in your history transitions through these immutable, server-validated states:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold text-xs mb-2">
                  1
                </span>
                <h4 className="text-xs font-bold text-amber-900">PENDING</h4>
                <p className="text-[10px] text-amber-700 mt-1">Broadcasting to nearby verified pros</p>
              </div>

              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-200 text-blue-900 font-bold text-xs mb-2">
                  2
                </span>
                <h4 className="text-xs font-bold text-blue-900">ACCEPTED</h4>
                <p className="text-[10px] text-blue-700 mt-1">Technician assigned & preparing kit</p>
              </div>

              <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-200 text-indigo-900 font-bold text-xs mb-2">
                  3
                </span>
                <h4 className="text-xs font-bold text-indigo-900">EN ROUTE</h4>
                <p className="text-[10px] text-indigo-700 mt-1">Live ETA & turn-by-turn tracking</p>
              </div>

              <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-200 text-purple-900 font-bold text-xs mb-2">
                  4
                </span>
                <h4 className="text-xs font-bold text-purple-900">IN PROGRESS</h4>
                <p className="text-[10px] text-purple-700 mt-1">Unlocked via 4-digit start OTP</p>
              </div>

              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 col-span-2 sm:col-span-1">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs mb-2">
                  5
                </span>
                <h4 className="text-xs font-bold text-emerald-900">COMPLETED</h4>
                <p className="text-[10px] text-emerald-700 mt-1">OTP verified, digital bill stored</p>
              </div>
            </div>
          </div>

          {/* Transparency & Security Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Aadhaar DigiLocker Verification</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Before any technician can view your booking, their identity is verified through government DigiLocker integration. No anonymous or unvetted contractors.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center mb-3">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Tamper-Proof Invoicing</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Every booking history entry contains an immutable digital PDF receipt. Material purchases must include high-resolution store receipt photos to prevent inflated pricing.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center mb-3">
                <PhoneCall className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Direct Dispute Assistance</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                If work is incomplete or unsatisfactory, 1-click cooperative dispute escalation freezes payout until resolved. Call our support desk at +91 9834171226.
              </p>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div>
              <h3 className="text-xl font-bold">Ready to Experience Transparent Doorstep Repair?</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                Book a verified electrician, plumber, or carpenter in seconds. Low ₹50 base pricing with zero hidden commission.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/consumer/book"
                className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-7 py-3 text-xs font-bold shadow-md transition-all active:scale-98"
              >
                Book a Repair Now
              </Link>
              <Link
                href="/login?redirect=/consumer/bookings"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 text-xs font-bold transition-colors"
              >
                Customer Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
