"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor, formatCurrency, formatDateTime } from "@/lib/utils";
import type { Booking } from "@/lib/types";
import Link from "next/link";

interface BookingCardProps {
  booking: Booking;
  onCancel?: (id: string) => void;
}

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#800020] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
              {booking.bookingRef}
            </span>
            <Badge className={getStatusColor(booking.status)}>{booking.status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1.5 text-sm font-bold text-slate-900">{booking.service?.name || "Service"}</p>
          {booking.worker && (
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned Technician: <span className="font-semibold text-slate-800">{booking.worker.user?.name || "Assigned"}</span>
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-slate-900">{formatCurrency(booking.quotedPrice)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(booking.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        {["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"].includes(booking.status) && (
          <Link href={`/consumer/bookings/${booking.id}`}>
            <Button size="sm" className="bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold rounded-xl px-4">
              Live Track
            </Button>
          </Link>
        )}
        {["PENDING", "ACCEPTED"].includes(booking.status) && onCancel && (
          <Button size="sm" variant="danger" className="rounded-xl text-xs" onClick={() => onCancel(booking.id)}>
            Cancel
          </Button>
        )}
        {booking.status === "COMPLETED" && !booking.rating && (
          <Link href={`/consumer/bookings/${booking.id}`}>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold">
              Rate Service
            </Button>
          </Link>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#800020] transition-colors"
        >
          {expanded ? "Hide Details" : "View Details"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2 border-t pt-4 text-sm text-gray-600 animate-fade-in">
          <div className="flex justify-between">
            <span>Address</span>
            <span className="text-right max-w-[60%]">{booking.address}</span>
          </div>
          {booking.description && (
            <div className="flex justify-between">
              <span>Notes</span>
              <span className="text-right max-w-[60%]">{booking.description}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Payment Status</span>
            <Badge className={getStatusColor(booking.paymentStatus)}>{booking.paymentStatus.replace("_", " ")}</Badge>
          </div>
          {booking.commissionAmount != null && (
            <div className="flex justify-between">
              <span>Commission ({booking.commissionRate}%)</span>
              <span>{formatCurrency(booking.commissionAmount)}</span>
            </div>
          )}
          {booking.cancelReason && (
            <div className="flex justify-between">
              <span>Cancellation Reason</span>
              <span className="text-right max-w-[60%]">{booking.cancelReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
