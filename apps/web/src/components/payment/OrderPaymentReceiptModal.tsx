"use client";

import {
  CheckCircle2,
  X,
  CreditCard,
  User,
  Calendar,
  Clock,
  ShieldCheck,
  Building,
  ArrowDownLeft,
  DollarSign,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { OrderPaymentReceipt } from "@/lib/types";

interface OrderPaymentReceiptModalProps {
  receipt: OrderPaymentReceipt | null;
  isOpen: boolean;
  onClose: () => void;
  viewerRole?: "CONSUMER" | "WORKER";
}

export function OrderPaymentReceiptModal({
  receipt,
  isOpen,
  onClose,
  viewerRole = "CONSUMER",
}: OrderPaymentReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const isConsumer = viewerRole === "CONSUMER";

  return (
    <div id="payment-receipt-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Card */}
        <div className="shrink-0 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="h-14 w-14 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center mx-auto shadow-inner mb-3">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-black font-heading tracking-tight">
            {isConsumer ? "Payment Successful" : "Payment Received"}
          </h3>
          <p className="text-xs text-emerald-100 mt-1">
            {isConsumer
              ? "Official Cooperative Escrow Settlement Receipt"
              : "Cooperative Worker Settlement & Wallet Credit"}
          </p>

          <div className="mt-4 pt-3 border-t border-white/20 flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-200">
              {isConsumer ? "Final Amount Paid" : "Worker Amount Earned"}
            </span>
            <span className="text-3xl font-black font-mono tracking-tight text-white mt-0.5">
              {formatCurrency(isConsumer ? receipt.finalAmount : receipt.workerEarnings)}
            </span>
          </div>
        </div>

        {/* Detailed Receipt Items */}
        <div className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 font-sans">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Order ID</span>
              <span className="font-mono font-bold text-slate-900">{receipt.orderRef}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Service</span>
              <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">
                {receipt.serviceTitle}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">
                {isConsumer ? "Technician" : "Consumer"}
              </span>
              <span className="font-bold text-slate-900">
                {isConsumer ? receipt.workerName : receipt.consumerName}
              </span>
            </div>

            {isConsumer && receipt.workerTrade && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Trade / Skill</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {receipt.workerTrade}
                </span>
              </div>
            )}

            {!isConsumer && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Job Gross Amount</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(receipt.grossAmount)}
                </span>
              </div>
            )}

            {!isConsumer && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Platform Fee (5%)</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {formatCurrency(receipt.platformFee)} (5% Cooperative Levy)
                </span>
              </div>
            )}

            {!isConsumer && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Net Worker Earnings</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatCurrency(receipt.workerEarnings)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Payment Status</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono text-[10px]">
                {receipt.paymentStatus}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Payment Method</span>
              <span className="font-medium text-slate-800 uppercase text-[11px]">
                {receipt.paymentMethod}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Date & Time</span>
              <span className="font-mono text-slate-700">
                {new Date(receipt.paidAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 text-[11px]">
              <span className="text-slate-400 font-medium">Reference</span>
              <span className="font-mono text-slate-500 text-[10px] truncate max-w-[180px]">
                {receipt.paymentRef}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>100% Cooperative Guarantee</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">Tax ID: 26089-COOP</span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPaymentReceiptModal;
