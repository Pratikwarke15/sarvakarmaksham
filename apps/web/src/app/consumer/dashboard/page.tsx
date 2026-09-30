"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { BookingCard } from "@/components/booking/BookingCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import type { Booking } from "@/lib/types";

const ACTIVE_STATUSES = ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"];

const tradeShortcuts = [
  {
    slug: "electrician",
    title: "Electrician",
    icon: Zap,
    startPrice: "₹50",
    bg: "bg-amber-500/10 text-amber-600 border-amber-200/60",
    hoverBg: "hover:border-amber-400",
  },
  {
    slug: "plumber",
    title: "Plumber",
    icon: Droplets,
    startPrice: "₹50",
    bg: "bg-sky-500/10 text-sky-600 border-sky-200/60",
    hoverBg: "hover:border-sky-400",
  },
  {
    slug: "carpenter",
    title: "Carpenter",
    icon: Hammer,
    startPrice: "₹50",
    bg: "bg-orange-500/10 text-orange-600 border-orange-200/60",
    hoverBg: "hover:border-orange-400",
  },
  {
    slug: "painter",
    title: "Painter",
    icon: Paintbrush,
    startPrice: "₹50",
    bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200/60",
    hoverBg: "hover:border-emerald-400",
  },
  {
    slug: "construction",
    title: "Construction",
    icon: HardHat,
    startPrice: "₹50",
    bg: "bg-[#800020]/10 text-[#800020] border-[#800020]/20",
    hoverBg: "hover:border-[#800020]/50",
  },
];

export default function ConsumerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Booking[] }>("/bookings");
      if (res.success) setBookings(res.data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const recentBookings = bookings.slice(0, 4);
  const active = bookings.find((b) => ACTIVE_STATUSES.includes(b.status));
  const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;
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
              href="/consumer/book"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>Book a Service</span>
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
            href="/consumer/bookings"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-[#800020]/40 px-3.5 py-1.5 font-bold text-slate-700 hover:text-[#800020] shadow-2xs transition-colors"
          >
            <Briefcase className="h-3.5 w-3.5 text-[#800020]" />
            <span>My Bookings ({bookings.length})</span>
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
          <Link
            href="/consumer/profile"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 font-bold text-slate-500 hover:text-slate-900 shadow-2xs transition-colors ml-auto"
          >
            <span>My Profile →</span>
          </Link>
        </div>
      </div>

      {/* Quick Trade Booking Carousel (Matching Landing Page Services) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              Instant Verified Services
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a trade to instantly request a local background-checked artisan.
            </p>
          </div>
          <Link href="/consumer/book" className="text-xs font-bold text-[#800020] hover:underline">
            All Services →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {tradeShortcuts.map((trade) => {
            const Icon = trade.icon;
            return (
              <Link
                key={trade.slug}
                href={`/consumer/book?service=${trade.slug}`}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white ${trade.hoverBg} hover:shadow-md transition-all group text-center`}
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center mb-2.5 border transition-transform group-hover:scale-110 duration-200 ${trade.bg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#800020] transition-colors">
                  {trade.title}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  Starts at {trade.startPrice}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Active Booking Live Tracker Spotlight */}
      {active && (
        <div className="rounded-3xl border border-rose-200/80 bg-gradient-to-r from-rose-50/60 via-white to-amber-50/20 p-6 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-100">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 rounded-full bg-rose-600 animate-pulse" />
              <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">
                Active Service Dispatch in Progress
              </span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {active.bookingRef}
              </span>
            </div>
            <Link
              href={`/consumer/bookings/${active.id}`}
              className="text-xs font-bold text-[#800020] hover:underline inline-flex items-center gap-1"
            >
              <span>Live Tracking Map</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="my-5 grid grid-cols-4 gap-2 text-center text-xs">
            {["Requested", "Assigned", "En Route", "In Progress"].map((step, idx) => {
              const currentIdx = active.status === "PENDING" ? 0 : active.status === "ACCEPTED" ? 1 : active.status === "EN_ROUTE" ? 2 : 3;
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
              <h3 className="text-base font-bold text-slate-900">{active.service?.name || "Service Order"}</h3>
              <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#800020] shrink-0" />
                <span>{active.address}</span>
              </p>
              {active.worker && (
                <p className="text-xs text-emerald-800 font-semibold mt-1">
                  Assigned Artisan: {active.worker.user?.name || "Local Verified Specialist"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Protected Escrow</span>
                <span className="text-xl font-black text-[#800020]">{formatCurrency(active.quotedPrice)}</span>
              </div>
              <Link href={`/consumer/bookings/${active.id}`}>
                <button
                  type="button"
                  className="rounded-xl bg-[#800020] hover:bg-[#68001a] text-white font-bold text-xs px-4 py-2 transition"
                >
                  Track Dispatch
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Household Vital Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={Briefcase}
          label="Total Services Completed"
          value={completedCount}
          subtitle="Household repairs & tasks"
          color="maroon"
        />
        <StatsCard
          icon={Clock}
          label="Active Bookings"
          value={active ? 1 : 0}
          subtitle="Real-time dispatch status"
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

      {/* Recent Bookings Activity */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
              Recent Service Activity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Your past work orders and receipts</p>
          </div>
          <Link href="/consumer/bookings" className="text-xs font-bold text-[#800020] hover:underline">
            View All ({bookings.length})
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-[#800020]" />
          </div>
        ) : recentBookings.length > 0 ? (
          <div className="space-y-3">
            {recentBookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-400 text-xs">
            <CalendarCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600">No bookings yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Book a Service&quot; above to hire an electrician, plumber, or carpenter.</p>
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
          href="/consumer/book"
          className="rounded-full bg-[#800020] hover:bg-[#68001a] text-white px-6 py-2.5 text-xs font-bold shadow-md transition-all active:scale-98 shrink-0 self-start md:self-auto"
        >
          Book Verified Artisan
        </Link>
      </div>
    </div>
  );
}
