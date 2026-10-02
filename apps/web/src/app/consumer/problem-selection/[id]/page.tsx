"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  MapPin,
  ShieldCheck,
  FileCheck,
  Mic,
  PenTool,
  Loader2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ProblemRequest } from "@/lib/types";

export default function DraftDetailPage({ params }: { params: { id: string } }) {
  const draftId = params?.id;

  const [draft, setDraft] = useState<ProblemRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDraft() {
      try {
        setLoading(true);
        const res = await apiGet<{ success: boolean; data: ProblemRequest }>(
          `/problem-requests/${draftId}`
        );
        if (res.success && res.data) {
          setDraft(res.data);
        } else {
          setError("Problem request draft not found.");
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load problem draft.");
      } finally {
        setLoading(false);
      }
    }
    loadDraft();
  }, [draftId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
        <p className="text-xs text-slate-500">Loading order draft...</p>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="h-12 w-12 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Draft Not Found</h2>
        <p className="text-xs text-slate-500">{error || "Unable to find the specified draft."}</p>
        <Link
          href="/consumer/problem-selection"
          className="inline-block px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold"
        >
          Select Problem
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/consumer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#800020]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider">
          Status: {draft.status}
        </span>
      </div>

      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-[11px] font-mono text-slate-400 block mb-1">
            Reference: {draft.requestRef}
          </span>
          <h1 className="text-2xl font-black text-slate-900 font-heading">
            {draft.problem?.name || "Service Problem"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#800020]/10 text-[#800020] text-[11px] font-bold">
              {draft.category?.name}
            </span>
            <span className="text-slate-300">•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
              {draft.subcategory?.name}
            </span>
          </div>
        </div>

        {/* Price & Duration */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Estimated Price Band
            </span>
            <div className="text-xl font-bold text-[#800020] font-mono">
              {formatCurrency(Number(draft.estimatedPriceMin))} –{" "}
              {formatCurrency(Number(draft.estimatedPriceMax))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Estimated Duration
            </span>
            <div className="text-xl font-bold text-slate-800 font-mono flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{draft.estimatedDuration} mins</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Consumer Explanation
          </h3>

          {draft.textDescription && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 space-y-1">
              <span className="text-slate-400 flex items-center gap-1 font-semibold">
                <PenTool className="h-3.5 w-3.5 text-[#800020]" />
                Written Description:
              </span>
              <p className="leading-relaxed pl-4">{draft.textDescription}</p>
            </div>
          )}

          {draft.audioUrl && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700 space-y-2">
              <span className="text-slate-400 flex items-center gap-1 font-semibold">
                <Mic className="h-3.5 w-3.5 text-[#800020]" />
                Voice Note Recorded:
              </span>
              <audio src={draft.audioUrl} controls className="w-full h-8" />
            </div>
          )}

          {draft.photos && draft.photos.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500">Attached Photos:</span>
              <div className="grid grid-cols-3 gap-2">
                {draft.photos.map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {draft.videoUrl && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500">Attached Video:</span>
              <video src={draft.videoUrl} controls className="w-full rounded-2xl border border-slate-200 max-h-56" />
            </div>
          )}
        </div>

        {/* Location */}
        {draft.address && (
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex items-start gap-2 text-amber-900">
            <MapPin className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Service Address:</span>
              <span>{draft.address}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link
            href="/consumer/dashboard"
            className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>

          <Link
            href="/consumer/problem-selection"
            className="px-5 py-2 rounded-2xl bg-[#800020] text-white text-xs font-bold hover:bg-[#68001a]"
          >
            Create New Request
          </Link>
        </div>
      </div>
    </div>
  );
}
