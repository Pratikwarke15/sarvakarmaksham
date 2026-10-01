import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import type { BookingStatus, PaymentStatus, UserRole } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, hh:mm a");
}

export function getStatusColor(status: BookingStatus | PaymentStatus | string): string {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    ACCEPTED: "bg-blue-100 text-blue-800",
    EN_ROUTE: "bg-indigo-100 text-indigo-800",
    IN_PROGRESS: "bg-violet-100 text-violet-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-gray-100 text-gray-600",
    DISPUTED: "bg-red-100 text-red-800",
    HELD_IN_ESCROW: "bg-cyan-100 text-cyan-800",
    REFUNDED: "bg-orange-100 text-orange-800",
    FAILED: "bg-red-100 text-red-800",
    OPEN: "bg-amber-100 text-amber-800",
    UNDER_REVIEW: "bg-blue-100 text-blue-800",
    RESOLVED: "bg-emerald-100 text-emerald-800",
    ESCALATED: "bg-red-100 text-red-800",
    CLOSED: "bg-gray-100 text-gray-600",
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-amber-100 text-amber-800",
    HIGH: "bg-orange-100 text-orange-800",
    CRITICAL: "bg-red-100 text-red-800",
    VERIFIED: "bg-emerald-100 text-emerald-800",
    PENDING_ADMIN_APPROVAL: "bg-amber-100 text-amber-800",
    PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
    SUSPENDED: "bg-red-100 text-red-800",
    DEACTIVATED: "bg-gray-100 text-gray-600",
    PAID: "bg-emerald-100 text-emerald-800",
  };
  return map[status] || "bg-gray-100 text-gray-600";
}

export function getRoleDashboardPath(role: UserRole): string {
  const map: Partial<Record<UserRole, string>> = {
    CONSUMER: "/consumer/dashboard",
    WORKER: "/worker/dashboard",
  };
  return map[role] || "/unauthorized";
}

export function generateBookingRef(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "CG-";
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}
