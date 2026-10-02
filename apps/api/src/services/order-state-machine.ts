import { OrderStatus } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";

/**
 * Phase 4 Order State Machine
 * Defines all allowable status transitions for an order.
 * Prevents arbitrary invalid transitions across the platform lifecycle.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["ACCEPTED", "REJECTED", "NEGOTIATION", "CANCELLED"],
  REJECTED: ["REQUESTED", "CANCELLED"], // Allows consumer to re-request with another technician
  ACCEPTED: ["CONFIRMED", "NEGOTIATION", "TRAVELLING", "CANCELLED"],
  NEGOTIATION: ["CONFIRMED", "ACCEPTED", "CANCELLED", "REJECTED"],
  CONFIRMED: ["TRAVELLING", "ARRIVED", "IN_PROGRESS", "CANCELLED"],
  TRAVELLING: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["PAYMENT_PENDING", "COMPLETED", "CANCELLED"],
  COMPLETED: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAID", "COMPLETED", "CANCELLED"],
  PAID: ["COMPLETED"],
  CANCELLED: [],
} as const;

/**
 * Validates whether a state transition from currentStatus to nextStatus is permitted.
 * Throws HTTP 400 AppError if invalid.
 */
export function assertValidOrderTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): void {
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Invalid order state transition from '${currentStatus}' to '${nextStatus}'. Permitted transitions: [${allowed.join(
        ", "
      ) || "None"}].`,
      400
    );
  }
}

/**
 * Checks whether an order is in an active in-flight operational state.
 */
export function isOrderActive(status: OrderStatus): boolean {
  const activeStatuses: OrderStatus[] = [
    OrderStatus.REQUESTED,
    OrderStatus.ACCEPTED,
    OrderStatus.NEGOTIATION,
    OrderStatus.CONFIRMED,
    OrderStatus.TRAVELLING,
    OrderStatus.ARRIVED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.PAYMENT_PENDING,
  ];
  return activeStatuses.includes(status);
}

/**
 * Haversine formula to compute great-circle distance between two geographic coordinates in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place (e.g. 1.4 km)
}
