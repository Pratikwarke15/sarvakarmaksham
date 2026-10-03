"use client";

import { useState } from "react";
import {
  Clock,
  ShieldCheck,
  Tag,
  Info,
  MapPin,
  CheckCircle2,
  Wrench,
  Package,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
  Volume2,
  Film,
  Camera,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ServiceCategory, ServiceSubCategory, ServiceProblem } from "@/lib/types";

interface ProblemEstimateCardProps {
  category: ServiceCategory;
  subcategory: ServiceSubCategory;
  problem: ServiceProblem;
  address?: string | null;
  hasAudio?: boolean;
  hasText?: boolean;
  photosCount?: number;
  hasVideo?: boolean;
  textDescription?: string | null;
  audioUrl?: string | null;
  photos?: string[];
  videoUrl?: string | null;
}

export function ProblemEstimateCard({
  category,
  subcategory,
  problem,
  address,
  hasAudio,
  hasText,
  photosCount,
  hasVideo,
  textDescription,
  audioUrl,
  photos = [],
  videoUrl,
}: ProblemEstimateCardProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const minPrice = Number(problem.minimumPrice);
  const maxPrice = Number(problem.maximumPrice);
  const basePrice = Number(problem.basePrice);
  const ceilingPrice = Number(problem.workerPriceCeiling);

  // Separated components
  const labourMin = Number(problem.labourCostMin ?? Math.round(minPrice * 0.8));
  const labourMax = Number(problem.labourCostMax ?? Math.round(maxPrice * 0.8));
  const inspectionFee = Number(problem.inspectionFee ?? 99);
  const platformFeeRate = Number(problem.platformFeeRate ?? 5.0);
  const platformFeeAmount = Math.round(basePrice * (platformFeeRate / 100));
  const materialNote =
    problem.materialNote || "Additional material cost may apply after inspection.";
  const benchmarkSource =
    problem.benchmarkSource || "CPWD DSR 2023 Labour Norms & Indian Urban Gig Benchmarks";
  const pricingUnit = problem.pricingUnit ? problem.pricingUnit.replace("_", " ") : "per job";

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-6">
      {/* 1. Header with Categories & Cooperative Badge */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#800020]/10 text-[#800020] text-[11px] font-bold uppercase tracking-wider">
            {category.name}
          </span>
          <span className="text-slate-300">•</span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
            {subcategory.name}
          </span>
          <span className="ml-auto flex items-center gap-1 text-emerald-700 text-[11px] font-semibold bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Cooperative Fair Pricing
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
          {problem.name}
        </h3>
        {problem.hindiName && (
          <p className="text-xs font-semibold text-slate-500 mt-0.5">{problem.hindiName}</p>
        )}
        {problem.description && (
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{problem.description}</p>
        )}
      </div>

      {/* 2. Primary Summary Cards: Duration, Unit, Total Range, Worker Ceiling */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Estimated Total Range */}
        <div className="col-span-2 sm:col-span-2 p-4 rounded-2xl bg-gradient-to-br from-[#800020]/5 via-rose-50/20 to-white border border-[#800020]/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#800020]">
              Estimated Total Range
            </span>
            <span className="text-[10px] font-bold bg-[#800020]/10 text-[#800020] px-2 py-0.5 rounded-full capitalize">
              {pricingUnit}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#800020] font-mono tracking-tight">
            {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-medium">
            <span>Base Visit Estimate: <strong className="text-slate-900">{formatCurrency(basePrice)}</strong></span>
          </div>
        </div>

        {/* Estimated Duration */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Duration
          </span>
          <div className="text-xl font-black text-slate-900 flex items-center gap-1.5 font-mono">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>{problem.estimatedDuration} mins</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Standard service time
          </span>
        </div>

        {/* Worker Price Ceiling */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
            Price Ceiling
          </span>
          <div className="text-xl font-black text-emerald-900 font-mono">
            {formatCurrency(ceilingPrice)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
            Maximum worker quote
          </span>
        </div>
      </div>

      {/* 3. Detailed Component Separation: Labour, Material, Visit Fee, Platform Fee */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#800020]" />
            <span>Indian Cost Component Breakdown</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Normalized Schedule</span>
        </div>

        <div className="divide-y divide-slate-200/60 text-xs">
          {/* LABOUR */}
          <div className="py-2.5 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-slate-600" />
                <span className="font-bold text-slate-800">Estimated Labour</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Direct technician wages benchmarked to skilled wage norms (CPWD DSR Item Schedule)
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold text-slate-900 font-mono text-sm">
                {formatCurrency(labourMin)} – {formatCurrency(labourMax)}
              </span>
            </div>
          </div>

          {/* MATERIAL */}
          <div className="py-2.5 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-700" />
                <span className="font-bold text-slate-800">Possible Material Cost</span>
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                {materialNote}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 text-[11px] font-bold">
                At Actuals
              </span>
            </div>
          </div>

          {/* VISIT / INSPECTION */}
          <div className="py-2.5 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-bold text-slate-800">Visit / Inspection Fee</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Waived / credited towards total labour if repair service is accepted
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold text-slate-900 font-mono">
                {formatCurrency(inspectionFee)}
              </span>
              <span className="block text-[10px] text-emerald-600 font-semibold">Credited on repair</span>
            </div>
          </div>

          {/* PLATFORM / COOPERATIVE FEE */}
          <div className="py-2.5 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-[#800020]" />
                <span className="font-bold text-slate-800">Cooperative Platform Fee ({platformFeeRate}%)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Worker social security vault, digital cooperative server hosting, and support
              </p>
            </div>
            <div className="text-right shrink-0 font-mono font-bold text-slate-900">
              ~{formatCurrency(platformFeeAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Official Indian Labour Rate Benchmark Grounding */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/70 flex items-start gap-3">
        <FileText className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-indigo-950 block">Market Reference & Labour Benchmark:</span>
          <span className="text-indigo-900 leading-relaxed block mt-0.5">
            {benchmarkSource}. Prices are normalized against Indian home-service rate cards to prevent price gouging.
          </span>
        </div>
      </div>

      {/* 5. Mandatory Pricing Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-950 block">Pricing Disclaimer:</span>
          <span className="text-amber-900 leading-relaxed block mt-0.5">
            Initial estimate is based on standard Indian service benchmarks. The final price can change only through the defined negotiation within the worker price ceiling ({formatCurrency(ceilingPrice)}) or if additional work/materials are authorized after physical inspection.
          </span>
        </div>
      </div>

      {/* Lightbox Modal for Photo inspection */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl flex flex-col items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto} alt="Problem preview" className="max-h-[80vh] w-auto object-contain" />
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Attached Problem Explanations & Media Playback */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Attached Problem Explanations & Media
        </h4>

        {/* Written Description */}
        {textDescription && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 italic">
            &ldquo;{textDescription}&rdquo;
          </div>
        )}

        {/* Voice Note Player */}
        {audioUrl && (
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Volume2 className="h-4 w-4 text-amber-700" />
              <span>Recorded Customer Voice Note</span>
            </div>
            <audio controls src={audioUrl} className="w-full h-8 accent-[#800020]" />
          </div>
        )}

        {/* Photo Gallery with Clickable Lightbox */}
        {photos && photos.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Camera className="h-4 w-4 text-[#800020]" />
              <span>Attached Issue Photos ({photos.length}) — Click to view</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(url)}
                  className="h-16 w-16 rounded-xl overflow-hidden border border-slate-200 hover:border-[#800020] cursor-pointer group shrink-0 relative bg-slate-100 shadow-2xs"
                  title="Click to expand photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Attached issue ${idx + 1}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Player */}
        {videoUrl && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Film className="h-4 w-4 text-[#800020]" />
              <span>Attached Issue Video</span>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-w-sm shadow-xs">
              <video src={videoUrl} controls playsInline className="w-full h-44 object-contain bg-black" />
            </div>
          </div>
        )}
      </div>

      {/* Service Location */}
      {address && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-[#800020] shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-slate-800 block">Service Location:</span>
            <span className="text-slate-600">{address}</span>
          </div>
        </div>
      )}
    </div>
  );
}
