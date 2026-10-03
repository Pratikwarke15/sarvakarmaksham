"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Clock,
  Shield,
  Volume2,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Lock,
  Loader2,
  ChevronDown,
  TrendingUp,
  Film,
} from "lucide-react";
import { formatCurrency, resolveMediaUrl } from "@/lib/utils";

import type { Order } from "@/lib/types";


interface IncomingOrderRequestCardProps {
  order: Order;
  onAccept: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason: string, customNote?: string) => Promise<void>;
  onOpenNegotiation?: (order: Order) => void;
}

export function IncomingOrderRequestCard({
  order,
  onAccept,
  onReject,
  onOpenNegotiation,
}: IncomingOrderRequestCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("Too far");
  const [customNote, setCustomNote] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const consumerPhoto = order.consumer?.avatarUrl;
  const consumerInitial = (order.consumer?.name || "C").charAt(0).toUpperCase();

  const handleAcceptClick = async () => {
    try {
      setIsAccepting(true);
      await onAccept(order.id);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectSubmit = async () => {
    try {
      setIsRejecting(true);
      await onReject(order.id, rejectionReason, customNote);
      setShowRejectModal(false);
    } finally {
      setIsRejecting(false);
    }
  };

  const formatScheduledDate = (dateStr?: string | null) => {
    if (!dateStr) return "Scheduled Service";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:border-[#800020]/30 transition-all space-y-5">
      {/* Top Header: Consumer & Time Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {consumerPhoto ? (
            <img
              src={consumerPhoto}
              alt={order.consumer?.name || "Customer"}
              className="h-12 w-12 rounded-2xl object-cover border border-slate-200"
            />
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] font-black text-lg">
              {consumerInitial}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {order.consumer?.name || "Customer"}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                {order.orderRef}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Service Requested • {order.category?.name || "General Service"}
            </p>
          </div>
        </div>

        {/* Immediate vs Scheduled Tag */}
        <div>
          {order.bookingMode === "SCHEDULED" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatScheduledDate(order.scheduledAt)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Immediate (ASAP)</span>
            </span>
          )}
        </div>
      </div>

      {/* Problem Details */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-base font-extrabold text-slate-900 font-heading">
            {order.problemTitle}
          </h4>
          <span className="text-xs font-mono font-bold text-[#800020] bg-rose-50 px-2.5 py-1 rounded-xl shrink-0">
            Est: {formatCurrency(Number(order.estimatedPriceMin))} –{" "}
            {formatCurrency(Number(order.estimatedPriceMax))}
          </span>
        </div>

        {order.textDescription && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
            <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="italic">"{order.textDescription}"</p>
          </div>
        )}

        {/* Audio Explanation Player */}
        {order.audioUrl && (
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Volume2 className="h-4 w-4 text-amber-700" />
              <span>Voice Description ({order.audioDuration || 15}s)</span>
            </div>
            <audio controls preload="metadata" src={resolveMediaUrl(order.audioUrl)} className="h-8 max-w-[200px]" />
          </div>
        )}

        {/* Attached Photos */}
        {order.photos && order.photos.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Attached Media ({order.photos.length})
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {order.photos.map((photo, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="h-16 w-16 rounded-xl overflow-hidden border border-slate-200 hover:border-[#800020] transition-all shrink-0"
                >
                  <img src={resolveMediaUrl(photo)} alt="Issue photo" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Problem Video Clip */}
        {order.videoUrl && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Film className="h-3.5 w-3.5 text-[#800020]" />
              Customer Video Clip
            </span>
            <video
              controls
              playsInline
              preload="metadata"
              src={resolveMediaUrl(order.videoUrl)}
              className="w-full max-w-sm h-36 object-contain bg-black rounded-xl"
            />
          </div>
        )}
      </div>


      {/* Approximate Location & Privacy Strip */}

      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/30 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
          <MapPin className="h-4 w-4 text-[#800020] shrink-0" />
          <span>
            Approx: <strong>~{order.approxDistanceKm || 1.8} km away</strong> ({order.approxArea || "Local neighborhood"})
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60 self-start sm:self-auto">
          <Lock className="h-3 w-3 text-emerald-600" />
          <span>Exact address hidden until acceptance</span>
        </div>
      </div>

      {/* Action Buttons: Decline / Negotiate / Accept */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => setShowRejectModal(true)}
          disabled={isAccepting || isRejecting}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
        >
          <XCircle className="h-4 w-4 text-rose-500" />
          <span>Decline</span>
        </button>

        {onOpenNegotiation && (
          <button
            type="button"
            onClick={() => onOpenNegotiation(order)}
            disabled={isAccepting || isRejecting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <span>Negotiate Price</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleAcceptClick}
          disabled={isAccepting || isRejecting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isAccepting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Accepting...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Accept Request</span>
            </>
          )}
        </button>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 animate-scale-in">
            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">
                Decline Order Request
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please select a reason for declining. The customer will be respectfully notified and returned to technician selection.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reason for Declining *
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-[#800020]"
                >
                  <option value="Too far">Too far from my current location</option>
                  <option value="Not available">Not available at the requested time</option>
                  <option value="Outside my skill">Outside my specific skill / trade specialty</option>
                  <option value="Price not suitable">Price / scope not suitable</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Additional Note (Optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Currently handling another job in North Delhi"
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-[#800020]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={isRejecting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isRejecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>Confirm Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[80vh]">
            <img src={selectedPhoto} alt="Issue preview" className="rounded-2xl max-h-[80vh] object-contain" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
