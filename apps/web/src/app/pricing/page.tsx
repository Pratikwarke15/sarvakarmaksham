"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Tag,
  Receipt,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Award,
  Clock,
  MapPin,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const serviceBaseRates = [
  { name: "Electrician", base: 50, standardTime: "30-45 mins", popular: true },
  { name: "Plumber", base: 50, standardTime: "30-45 mins", popular: true },
  { name: "Carpenter", base: 50, standardTime: "45-60 mins", popular: true },
  { name: "Appliance Repair", base: 75, standardTime: "45-60 mins", popular: false },
  { name: "Painter & Wall Care", base: 60, standardTime: "45-60 mins", popular: false },
];

export default function PricingPage() {
  const [selectedService, setSelectedService] = useState(serviceBaseRates[0]);
  const [distanceKm, setDistanceKm] = useState(3.5);

  const baseRate = selectedService.base;
  const standardTravel = 15; // covers up to 5km
  const extraKm = Math.max(0, distanceKm - 5);
  const extraTravelCost = extraKm * 3.25;
  const totalEstimated = baseRate + standardTravel + extraTravelCost;

  return (
    <div className="min-h-screen bg-[#FCFBFA] flex flex-col justify-between text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-4 py-1.5 text-xs font-bold text-[#800020]">
            <Calculator className="h-3.5 w-3.5" />
            <span>Open Fair Wages Architecture</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            Transparent Pricing. <span className="text-[#800020]">Zero Surges.</span>
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            No hidden convenience charges, no dynamic surge pricing, and no 30% commission cuts. Every technician receives 100% of the labour charge.
          </p>
        </div>

        {/* 3 Core Price Guarantees */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-[#800020] flex items-center justify-center border border-rose-100">
                <Tag className="h-6 w-6" />
              </div>
              <span className="text-2xl font-black text-[#800020]">₹50</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Base Doorstep Fare</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Covers initial diagnosis and minor repairs within standard time. Unlike aggregator inspection fees of ₹250+, our base fare remains affordable for every household.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <MapPin className="h-6 w-6" />
              </div>
              <span className="text-2xl font-black text-blue-700">₹15</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Standard Travel Allowance</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Standard allowance covering travel up to 5.0 km from the technician’s starting point. Extra distance beyond 5 km is billed transparently at ₹3.25 / km.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="text-2xl font-black text-emerald-600">0%</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Platform Commission Cut</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Corporate apps swallow 25% to 35% of worker earnings. At Shramik, 100% of labour fees go straight into the technician’s bank account via direct UPI escrow.
            </p>
          </div>
        </div>

        {/* Interactive Price Estimator Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs">
          <div className="grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold text-[#800020] uppercase tracking-wider">Live Simulator</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Estimate Your Doorstep Service Cost</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Choose a trade and adjust travel distance to preview the exact itemized breakdown.
                </p>
              </div>

              {/* Service Pills */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Select Service Trade</label>
                <div className="flex flex-wrap gap-2">
                  {serviceBaseRates.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelectedService(s)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-xs font-bold transition-all",
                        selectedService.name === s.name
                          ? "bg-[#800020] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {s.name} (Base ₹{s.base})
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Travel Distance</span>
                  <span className="text-[#800020]">{distanceKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#800020]"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.5 km (Next door)</span>
                  <span>5.0 km (Standard inclusion)</span>
                  <span>15.0 km (Max coverage)</span>
                </div>
              </div>

              {/* Breakdown Ledger */}
              <div className="rounded-2xl bg-slate-50 p-4 space-y-2 border border-slate-200 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Base Labour ({selectedService.name}):</span>
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
                  <span>Platform Commission Cut:</span>
                  <span>₹0.00 (Zero deductions)</span>
                </div>
              </div>
            </div>

            {/* Total Price Widget */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl bg-slate-950 text-white p-8 text-center shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#800020]/30 rounded-full blur-2xl pointer-events-none" />
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Estimated Doorstep Labour</span>
                <div className="text-5xl font-black text-white font-heading mt-2">
                  ₹{totalEstimated.toFixed(0)}
                </div>
                <p className="text-xs text-emerald-400 font-semibold mt-1">100% Paid to Verified Technician</p>

                <div className="mt-6 pt-6 border-t border-slate-800 space-y-2 text-xs text-slate-300 text-left">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>7-Day Free Workmanship Warranty</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>4-Digit Start & Stop OTP Security</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Store Receipt Photo for Replacement Parts</span>
                  </p>
                </div>

                <Link
                  href="/consumer/book"
                  className="mt-6 block w-full rounded-full bg-[#800020] hover:bg-[#66001a] text-white py-3 text-xs font-bold transition-all shadow-md active:scale-98"
                >
                  Book Service at This Rate
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs overflow-x-auto">
          <h3 className="text-xl font-bold text-slate-900 mb-1">Detailed Platform Comparison</h3>
          <p className="text-xs text-slate-500 mb-6">How सर्वकर्मक्षमः contrasts with commercial service apps:</p>

          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-red-700 bg-red-50/50 rounded-t-lg">Corporate Aggregators</th>
                <th className="py-3 px-4 font-bold text-[#800020] bg-rose-50/60 rounded-t-lg">सर्वकर्मक्षमः Co-Op</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800">Middleman Commission</td>
                <td className="py-3.5 px-4 text-red-600 bg-red-50/30">25% – 35% extracted from worker</td>
                <td className="py-3.5 px-4 font-bold text-emerald-700 bg-rose-50/30">0% Commission Cut</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800">Base Doorstep Rate</td>
                <td className="py-3.5 px-4 text-slate-600 bg-red-50/30">₹250 – ₹499 minimum charge</td>
                <td className="py-3.5 px-4 font-bold text-slate-900 bg-rose-50/30">Starts at ₹50.00 base rate</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800">Dynamic Surge Fees</td>
                <td className="py-3.5 px-4 text-red-600 bg-red-50/30">Added during rain, peak hours</td>
                <td className="py-3.5 px-4 font-bold text-emerald-700 bg-rose-50/30">Never (Always fixed formula)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800">Technician Payout Speed</td>
                <td className="py-3.5 px-4 text-slate-600 bg-red-50/30">Held for 7 – 14 business days</td>
                <td className="py-3.5 px-4 font-bold text-emerald-700 bg-rose-50/30">Instant direct UPI upon OTP</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-800">Spare Parts Verification</td>
                <td className="py-3.5 px-4 text-slate-600 bg-red-50/30">Arbitrary markups often billed</td>
                <td className="py-3.5 px-4 font-bold text-slate-900 bg-rose-50/30">Shop receipt upload required</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
