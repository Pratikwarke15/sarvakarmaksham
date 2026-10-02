"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lock,
  Loader2,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import type { PriceHistoryResponse } from "@/lib/types";

interface PriceNegotiationModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  userRole: "WORKER" | "CONSUMER";
  onPriceConfirmed?: (agreedPrice: number) => void;
}

export function PriceNegotiationModal({
  orderId,
  isOpen,
  onClose,
  userRole,
  onPriceConfirmed,
}: PriceNegotiationModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<PriceHistoryResponse | null>(null);

  // Proposal inputs
  const [proposedAmount, setProposedAmount] = useState<string>("");
  const [proposalReason, setProposalReason] = useState<string>("");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await apiGet<{ success: boolean; data: PriceHistoryResponse }>(
        `/orders/${orderId}/price-history`
      );
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.isPriceLocked && onPriceConfirmed && res.data.finalPrice) {
          onPriceConfirmed(res.data.finalPrice);
        }
      }
    } catch (err: any) {
      toast({
        title: "Failed to load price history",
        description: err.message || "Please try again later.",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchHistory();
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const ceiling = data ? Number(data.workerPriceCeiling) : 9999;
  const numProposed = Number(proposedAmount);
  const isOverCeiling = numProposed > ceiling;

  const latestProposal = data?.proposals && data.proposals.length > 0
    ? data.proposals[data.proposals.length - 1]
    : null;

  const isPendingCounterpartAction =
    latestProposal?.status === "PENDING" &&
    ((latestProposal.proposer === "WORKER" && userRole === "CONSUMER") ||
      (latestProposal.proposer === "CONSUMER" && userRole === "WORKER"));

  const isAwaitingCounterpartResponse =
    latestProposal?.status === "PENDING" &&
    ((latestProposal.proposer === "WORKER" && userRole === "WORKER") ||
      (latestProposal.proposer === "CONSUMER" && userRole === "CONSUMER"));

  const handlePropose = async () => {
    if (!proposedAmount || numProposed <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price amount.",
        variant: "danger",
      });
      return;
    }

    if (userRole === "WORKER" && isOverCeiling) {
      toast({
        title: "Ceiling Limit Exceeded",
        description: `Your proposal cannot exceed the maximum price ceiling of ₹${ceiling} for this service.`,
        variant: "danger",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiPost<{ success: boolean; message?: string }>(
        `/orders/${orderId}/propose-price`,
        {
          amount: numProposed,
          reason: proposalReason.trim() || undefined,
        }
      );

      if (res.success) {
        toast({
          title: "Proposal Sent",
          description: `Price proposal of ₹${numProposed} submitted successfully.`,
          variant: "success",
        });
        setProposedAmount("");
        setProposalReason("");
        await fetchHistory();
      }
    } catch (err: any) {
      toast({
        title: "Proposal Failed",
        description: err.message || "Unable to submit price proposal.",
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (action: "ACCEPT" | "REJECT") => {
    try {
      setSubmitting(true);
      const res = await apiPost<{
        success: boolean;
        finalPrice?: number;
        isPriceLocked?: boolean;
        message?: string;
      }>(`/orders/${orderId}/respond-proposal`, {
        action,
        reason: proposalReason.trim() || undefined,
      });

      if (res.success) {
        toast({
          title: action === "ACCEPT" ? "Price Agreed & Confirmed!" : "Proposal Rejected",
          description: res.message || "Response updated.",
          variant: action === "ACCEPT" ? "success" : "default",
        });
        if (action === "ACCEPT" && res.finalPrice && onPriceConfirmed) {
          onPriceConfirmed(res.finalPrice);
        }
        await fetchHistory();
      }
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Unable to respond to proposal.",
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/60 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#800020] text-white flex items-center justify-center font-bold shadow-xs">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading">
                  Price Negotiation & History
                </h3>
                {data?.isPriceLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                    <Lock className="h-3 w-3 text-emerald-600" /> Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {data?.orderRef || "Service Order"} • Grounded Market Rates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Loader2 className="h-7 w-7 animate-spin text-[#800020]" />
              <span>Fetching price negotiation records...</span>
            </div>
          ) : data ? (
            <>
              {/* Benchmark Reference Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Official Pricing Parameters
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> CPWD Grounded
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-medium text-slate-400 block">Initial Estimate</span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatCurrency(data.basePrice)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] font-medium text-slate-400 block">Fair Range</span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatCurrency(data.estimatedPriceMin)} - {formatCurrency(data.estimatedPriceMax)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-rose-200/70 bg-rose-50/30">
                    <span className="text-[10px] font-medium text-[#800020] block">Max Price Ceiling</span>
                    <span className="text-sm font-extrabold text-[#800020]">
                      {formatCurrency(data.workerPriceCeiling)}
                    </span>
                  </div>
                </div>

                {data.isPriceLocked ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Agreed Final Price: {formatCurrency(Number(data.finalPrice))}</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 uppercase font-mono tracking-wider">
                      Immutable
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic leading-relaxed">
                    Note: The worker may propose a higher price based on site difficulty or additional requirements, but cannot exceed the fair price ceiling of {formatCurrency(data.workerPriceCeiling)}.
                  </p>
                )}
              </div>

              {/* Immutable Proposal History Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#800020]" />
                  <span>Proposal History Timeline ({data.proposals.length})</span>
                </h4>

                {data.proposals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                    No customized price proposals yet. Working with the initial estimate of {formatCurrency(data.basePrice)}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.proposals.map((item, idx) => {
                      const isWorkerProposer = item.proposer === "WORKER";
                      const isAccepted = item.status === "ACCEPTED";
                      const isRejected = item.status === "REJECTED";
                      const isCountered = item.status === "COUNTERED";
                      const isPending = item.status === "PENDING";

                      return (
                        <div
                          key={item.id || idx}
                          className={`rounded-2xl border p-3.5 text-xs transition-all ${
                            isAccepted
                              ? "border-emerald-300 bg-emerald-50/50"
                              : isPending
                              ? "border-amber-300 bg-amber-50/30"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isWorkerProposer
                                    ? "bg-rose-50 text-[#800020] border border-rose-200/70"
                                    : "bg-blue-50 text-blue-800 border border-blue-200/70"
                                }`}
                              >
                                {isWorkerProposer ? "Technician Proposal" : "Customer Counteroffer"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isAccepted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isRejected
                                  ? "bg-rose-100 text-rose-800"
                                  : isCountered
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-base font-black text-slate-900 font-mono">
                              {formatCurrency(item.amount)}
                            </span>
                            {item.reason && (
                              <p className="text-[11px] text-slate-600 italic max-w-[65%] text-right truncate">
                                "{item.reason}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Controls for Negotiation (If not locked) */}
              {!data.isPriceLocked && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                  {/* If counterpart proposal is pending: Give Accept / Reject / Counter actions */}
                  {isPendingCounterpartAction && latestProposal && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span>
                          Pending {latestProposal.proposer === "WORKER" ? "Technician" : "Customer"} Proposal:{" "}
                          {formatCurrency(latestProposal.amount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        You can accept this proposed price, reject it, or enter a counteroffer below.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRespond("ACCEPT")}
                          disabled={submitting}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Accept Proposed Price ({formatCurrency(latestProposal.amount)})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespond("REJECT")}
                          disabled={submitting}
                          className="px-4 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5 inline mr-1" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isAwaitingCounterpartResponse && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      <span>
                        Your proposal of {formatCurrency(latestProposal?.amount || 0)} is currently awaiting customer review.
                      </span>
                    </div>
                  )}

                  {/* Propose / Counteroffer Input Form */}
                  <div className="space-y-3 pt-1">
                    <label className="text-xs font-bold text-slate-800 block">
                      {userRole === "WORKER"
                        ? "Propose Adjusted Price (₹)"
                        : "Submit Counteroffer (₹)"}
                    </label>

                    <div className="space-y-2">
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={proposedAmount}
                          onChange={(e) => setProposedAmount(e.target.value)}
                          placeholder={userRole === "WORKER" ? `Up to max ₹${ceiling}` : "Enter counteroffer amount"}
                          className={`w-full rounded-xl border pl-8 pr-3.5 py-2 text-xs font-bold text-slate-900 bg-white focus:outline-hidden ${
                            isOverCeiling
                              ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                              : "border-slate-200 focus:border-[#800020]"
                          }`}
                        />
                      </div>

                      {/* Real-time Ceiling Feedback */}
                      {userRole === "WORKER" && isOverCeiling && (
                        <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>Exceeds maximum ceiling of {formatCurrency(ceiling)}. Backend policy will reject this.</span>
                        </p>
                      )}

                      <input
                        type="text"
                        value={proposalReason}
                        onChange={(e) => setProposalReason(e.target.value)}
                        placeholder="Reason (e.g. Requires additional heavy-duty pipe cutter)"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-700 bg-white focus:outline-hidden focus:border-[#800020]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handlePropose}
                      disabled={submitting || !proposedAmount || (userRole === "WORKER" && isOverCeiling)}
                      className="w-full py-2.5 rounded-xl bg-[#800020] hover:bg-[#68001a] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Submitting Proposal...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>
                            {userRole === "WORKER"
                              ? `Propose Price to Customer`
                              : `Submit Counteroffer to Technician`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Direct phone numbers remain protected
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
