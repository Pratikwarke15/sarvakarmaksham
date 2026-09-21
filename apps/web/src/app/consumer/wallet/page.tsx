"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Zap,
  Coins,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Lock,
  Calculator,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { Booking } from "@/lib/types";

const paymentPillars = [
  {
    icon: ShieldCheck,
    title: "Direct Escrow Protection",
    subtitle: "Funds Held Securely Until OTP Verification",
    description:
      "When you book or pay digitally, funds are held in secure escrow. The technician is only credited after you inspect the repair and provide your completion OTP.",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: Coins,
    title: "0% Hidden Commission Cut",
    subtitle: "100% Goes Directly to the Technician",
    description:
      "Traditional aggregator apps deduct 25% to 35% from workers. Shramik charges ₹0 commission, ensuring fair wages and the lowest honest doorstep prices.",
    accent: "bg-rose-50 text-[#800020] border-rose-200",
  },
  {
    icon: Calculator,
    title: "Standardized Transparent Formula",
    subtitle: "Base ₹50 + ₹15 Travel + ₹3.25/km",
    description:
      "No algorithmic surge pricing or inflated rainy day markups. Fares are calculated on an open transparent formula approved by the technician cooperative.",
    accent: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: RotateCcw,
    title: "Instant Refund Guarantee",
    subtitle: "Automated 1-Tap Cancellation",
    description:
      "If a technician cannot attend or an order is cancelled prior to check-in OTP, your payment is refunded immediately back to your original UPI or card account.",
    accent: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

export default function ConsumerWalletPage() {
  const { isAuthenticated, user } = useAuth();
  const [viewMode, setViewMode] = useState<"wallet" | "guide">(
    isAuthenticated && user?.role === "CONSUMER" ? "wallet" : "guide"
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  // Simple interactive price estimator for illustration
  const [distanceKm, setDistanceKm] = useState(4);
  const baseRate = 50;
  const standardTravel = 15; // covers up to 5km
  const extraKm = Math.max(0, distanceKm - 5);
  const extraTravelCost = extraKm * 3.25;
  const totalEstimated = baseRate + standardTravel + extraTravelCost;

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "CONSUMER") return;
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: Booking[] }>("/bookings");
      if (res.success) setBookings(res.data || []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const totalPaid = bookings
    .filter((b) => b.paymentStatus === "COMPLETED" || b.paymentStatus === "HELD_IN_ESCROW")
    .reduce((sum, b) => sum + (b.quotedPrice || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fade-in space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-xs font-bold text-[#800020] mb-2">
            <Coins className="h-3.5 w-3.5" />
            <span>Transparent Payment Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            Wallet, Payments & <span className="text-[#800020]">Fare Transparency</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Understand our zero-commission pricing formula, instant UPI escrow settlements, and view your personal payment history.
          </p>
        </div>

        {/* View Switcher Tabs (if authenticated consumer) */}
        {isAuthenticated && user?.role === "CONSUMER" && (
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("wallet")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "wallet" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              My Payments
            </button>
            <button
              type="button"
              onClick={() => setViewMode("guide")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "guide" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              How Pricing Works (Guide)
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: AUTHENTICATED WALLET / PAYMENT HISTORY */}
      {viewMode === "wallet" && isAuthenticated && user?.role === "CONSUMER" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#800020] to-[#550015] p-8 text-white">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-rose-200" />
                <span className="text-xs font-bold uppercase tracking-wider text-rose-200">Total Spent on Services</span>
              </div>
              <p className="text-4xl font-black font-heading">{formatCurrency(totalPaid)}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-rose-100">
                <span>{bookings.length} verified bookings</span>
                <span>•</span>
                <span>0% hidden platform charges</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
            </div>
          ) : bookings.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-900">Recent Service Payments</h4>
              </div>
              {bookings.slice(0, 10).map((b) => (
                <Link
                  key={b.id}
                  href={`/consumer/bookings/${b.id}`}
                  className="flex items-center justify-between p-5 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-[#800020]">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{b.service?.name || "Doorstep Service"}</p>
                      <p className="text-xs text-slate-400">
                        Ref: {b.bookingRef} · {formatDateTime(b.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(b.quotedPrice || 0)}</span>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">100% Direct Payout</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <p className="text-sm text-slate-400">No payment records found yet</p>
              <Link
                href="/consumer/book"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#800020] text-white px-5 py-2 text-xs font-bold"
              >
                <span>Book First Service</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COMPREHENSIVE TEXTUAL & GRAPHICAL PRICING & WALLET GUIDE */}
      {(viewMode === "guide" || !isAuthenticated || user?.role !== "CONSUMER") && (
        <div className="space-y-12">
          {/* Guest Info Banner */}
          {!isAuthenticated && (
            <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-rose-50/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-[#800020] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Visiting from the Footer?</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Here is exactly how Shramik manages escrow payments, zero-commission worker remuneration, and transparent doorstep fare calculations.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Link
                  href="/login?redirect=/consumer/wallet"
                  className="rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-bold transition-colors"
                >
                  Customer Login
                </Link>
                <Link
                  href="/consumer/book"
                  className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors"
                >
                  Book Service (₹50 Base)
                </Link>
              </div>
            </div>
          )}

          {/* 4 Core Pillars */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {paymentPillars.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center border mb-4", item.accent)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs font-semibold text-[#800020] mt-0.5">{item.subtitle}</p>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Fare Calculator Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-[#800020] mb-2">
                  <Zap className="h-3 w-3" />
                  <span>Fair Pricing Formula</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Try the Doorstep Fare Calculator
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
                  Adjust distance to observe how our transparent formula works. No algorithms, no artificial demand multipliers.
                </p>

                <div className="mt-6 space-y-4 max-w-lg">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                      <span>Travel Distance from Technician</span>
                      <span className="text-[#800020]">{distanceKm} km</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#800020]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>1 km (Local)</span>
                      <span>5 km (Standard Standard)</span>
                      <span>20 km (Outer Boundary)</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 space-y-2 border border-slate-100 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Standard Base Service:</span>
                      <strong className="text-slate-900">₹{baseRate}.00</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Standard Travel Allowance (≤ 5.0 km):</span>
                      <strong className="text-slate-900">₹{standardTravel}.00</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Extra Distance ({extraKm.toFixed(1)} km @ ₹3.25/km):</span>
                      <strong className="text-slate-900">₹{extraTravelCost.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-emerald-700 font-bold">
                      <span>Platform Commission:</span>
                      <span>₹0.00 (0% Cut)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Display Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-3xl bg-slate-950 text-white p-8 text-center shadow-xl">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Doorstep Labour</span>
                  <div className="text-5xl font-black text-white font-heading mt-2">
                    ₹{totalEstimated.toFixed(0)}
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold mt-1">100% Paid Directly to Technician</p>

                  <div className="mt-6 pt-6 border-t border-slate-800 space-y-2 text-xs text-slate-300 text-left">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>4-Digit Start & Stop OTP Security</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Tamper-Proof Digital Invoice</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Direct UPI / Cash on Delivery</span>
                    </p>
                  </div>

                  <Link
                    href="/consumer/book"
                    className="mt-6 block w-full rounded-full bg-[#800020] hover:bg-[#66001a] text-white py-3 text-xs font-bold transition-all shadow-md active:scale-98"
                  >
                    Book at This Rate
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table: Traditional Aggregator vs Shramik */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs overflow-x-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Pricing Architecture Comparison</h3>
            <p className="text-xs text-slate-500 mb-6">See why homeowners and technicians prefer Shramik Co.</p>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 px-4 font-bold">Feature</th>
                  <th className="py-3 px-4 font-bold text-red-700 bg-red-50/50 rounded-t-lg">Typical Aggregator Apps</th>
                  <th className="py-3 px-4 font-bold text-[#800020] bg-rose-50/60 rounded-t-lg">Shramik Cooperative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-800">Platform Commission Cut</td>
                  <td className="py-3 px-4 text-red-600 bg-red-50/30">25% – 35% deducted from worker</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-rose-50/30">0% Commission Cut</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-800">Base Doorstep Rate</td>
                  <td className="py-3 px-4 text-slate-600 bg-red-50/30">₹250 – ₹499 inspection fee</td>
                  <td className="py-3 px-4 font-bold text-slate-900 bg-rose-50/30">Starts at ₹50.00 base rate</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-800">Surge / Weather Pricing</td>
                  <td className="py-3 px-4 text-red-600 bg-red-50/30">Up to 2x during peak hours</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-rose-50/30">Strictly 0 Surge (Always fixed formula)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-800">Technician Payout Speed</td>
                  <td className="py-3 px-4 text-slate-600 bg-red-50/30">Weekly or Bi-weekly payouts</td>
                  <td className="py-3 px-4 font-bold text-emerald-700 bg-rose-50/30">Instant UPI upon completion OTP</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-800">Material Billing Proof</td>
                  <td className="py-3 px-4 text-slate-600 bg-red-50/30">Arbitrary markups often added</td>
                  <td className="py-3 px-4 font-bold text-slate-900 bg-rose-50/30">Mandatory store receipt photo verification</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
