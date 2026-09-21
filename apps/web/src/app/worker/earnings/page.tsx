"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { WalletBalance } from "@/components/dashboard/WalletBalance";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import {
  Loader2,
  Coins,
  ShieldCheck,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  Receipt,
  Calendar,
  Layers,
  Award,
  Lock,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatCurrency } from "@/lib/utils";
import type { WalletTransaction } from "@/lib/types";

interface TransactionsRes {
  transactions: WalletTransaction[];
}

const earningGuarantees = [
  {
    icon: Coins,
    title: "100% Take-Home Labour",
    subtitle: "Zero Platform Commissions",
    description:
      "Unlike conventional platforms that extract 25% to 35% from every job, Shramik deducts 0% from your labour fee. Every rupee earned goes directly to you.",
    accent: "bg-rose-50 text-[#800020] border-rose-200",
  },
  {
    icon: Zap,
    title: "Instant Daily Settlements",
    subtitle: "Direct to Your UPI / Bank",
    description:
      "No waiting 14 days or meeting arbitrary withdrawal thresholds. As soon as the customer provides their completion OTP, funds are dispatched to your linked bank account.",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: Award,
    title: "Cooperative Dividends",
    subtitle: "Annual Profit-Sharing Pool",
    description:
      "Because Shramik is organized as a worker cooperative, annual platform surpluses are distributed back to verified technicians as proportional patronage dividends.",
    accent: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    icon: TrendingUp,
    title: "Guaranteed Distance Travel",
    subtitle: "₹15 Standard + ₹3.25/km",
    description:
      "You never travel at your own loss. Every job includes mandatory customer travel allowance to cover fuel and bike maintenance costs.",
    accent: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

export default function WorkerEarningsPage() {
  const { isAuthenticated, user } = useAuth();
  const [viewMode, setViewMode] = useState<"earnings" | "guide">(
    isAuthenticated && user?.role === "WORKER" ? "earnings" : "guide"
  );
  const [wallet, setWallet] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "WORKER") return;
    setLoading(true);
    try {
      const [w, t] = await Promise.all([
        apiGet<{ success: boolean; data: { walletBalance: number } }>("/payments/wallet"),
        apiGet<{ success: boolean; data: TransactionsRes }>("/payments/transactions"),
      ]);
      if (w.success && w.data) setWallet(w.data.walletBalance || 0);
      if (t.success && t.data) setTransactions(t.data.transactions || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-fade-in space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-3 py-1 text-xs font-bold text-[#800020] mb-2">
            <Coins className="h-3.5 w-3.5" />
            <span>Technician Earnings Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            Earnings & <span className="text-[#800020]">Settlement Ledger</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Track daily work order settlements, cooperative dividend distributions, and understand our zero-commission payout policy.
          </p>
        </div>

        {/* View Switcher Tabs (if authenticated worker) */}
        {isAuthenticated && user?.role === "WORKER" && (
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("earnings")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "earnings" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              My Ledger
            </button>
            <button
              type="button"
              onClick={() => setViewMode("guide")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                viewMode === "guide" ? "bg-white text-[#800020] shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              How Settlements Work (Guide)
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: AUTHENTICATED WORKER WALLET & REVENUE */}
      {viewMode === "earnings" && isAuthenticated && user?.role === "WORKER" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
            </div>
          ) : (
            <>
              <WalletBalance balance={wallet} transactions={transactions} />
              <RevenueChart title="Earnings Overview" />
            </>
          )}
        </div>
      )}

      {/* VIEW 2: COMPREHENSIVE TEXTUAL & GRAPHICAL SETTLEMENT GUIDE */}
      {(viewMode === "guide" || !isAuthenticated || user?.role !== "WORKER") && (
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
                    This page illustrates how technician earnings, instant daily bank deposits, and cooperative dividend distributions operate.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Link
                  href="/login?redirect=/worker/earnings"
                  className="rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 text-xs font-bold transition-colors"
                >
                  Technician Login
                </Link>
                <Link
                  href="/register?role=WORKER"
                  className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors"
                >
                  Register as Technician
                </Link>
              </div>
            </div>
          )}

          {/* 4 Guarantees Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {earningGuarantees.map((item) => {
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

          {/* Income Comparison: ₹25,000 monthly scenario */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Monthly Take-Home Income Comparison
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-xl">
              Based on completing ₹25,000 worth of customer repair work in one month:
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Aggregator App */}
              <div className="rounded-3xl border border-red-200 bg-red-50/30 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Corporate Aggregators</span>
                  <span className="rounded-full bg-red-100 text-red-800 text-[10px] font-bold px-2.5 py-0.5">
                    30% Commission Cut
                  </span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Customer Billing:</span>
                    <strong>₹25,000</strong>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Platform Commission (-30%):</span>
                    <strong>- ₹7,500</strong>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Lead Fee & Convenience Deductions:</span>
                    <strong>- ₹1,200</strong>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-red-200 text-sm font-black text-slate-900">
                    <span>Actual Take-Home:</span>
                    <span className="text-red-700">₹16,300</span>
                  </div>
                </div>
              </div>

              {/* Shramik Cooperative */}
              <div className="rounded-3xl border-2 border-[#800020] bg-rose-50/40 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">Shramik Co-Op</span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                    0% Commission + Dividends
                  </span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Customer Billing:</span>
                    <strong>₹25,000</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Platform Commission (0%):</span>
                    <strong>₹0.00</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Guaranteed Fuel Allowance:</span>
                    <strong>+ Included 100%</strong>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-rose-200 text-sm font-black text-slate-900">
                    <span>Actual Take-Home:</span>
                    <span className="text-emerald-700">₹25,000 (+₹8,700 more)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div>
              <h3 className="text-xl font-bold">Keep 100% of What You Earn</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                Join our verified technician cooperative. Fair wages, instant UPI settlements, and zero commission fees.
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
                href="/login?redirect=/worker/earnings"
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
