"use client";

import { ShieldCheck, Cpu, MapPin, KeyRound, Sparkles } from "lucide-react";

export function DemoModeBanner() {
  return (
    <div className="bg-gradient-to-r from-amber-600 via-indigo-600 to-indigo-700 text-white text-xs py-1.5 px-4 shadow-sm">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1 rounded bg-amber-400/20 px-2 py-0.5 font-bold text-amber-200 border border-amber-300/30">
            <Sparkles className="h-3 w-3 text-amber-300" /> SIH DEMO MODE
          </span>
          <span className="hidden sm:inline text-indigo-100">·</span>
          <span className="hidden sm:inline text-indigo-100 font-semibold">Zero External Cost Architecture (₹0)</span>
        </div>

        <div className="flex items-center gap-3 text-indigo-100 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-emerald-300" /> OpenStreetMap + OSRM
          </span>
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3 w-3 text-sky-300" /> Local AI NLU
          </span>
          <span className="inline-flex items-center gap-1">
            <KeyRound className="h-3 w-3 text-amber-300" /> Dev OTP: <strong className="text-white">123456</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-300" /> Sandbox KYC
          </span>
        </div>
      </div>
    </div>
  );
}

export default DemoModeBanner;
