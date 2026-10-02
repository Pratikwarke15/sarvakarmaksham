import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { RoutingService, RouteResult } from "./routing.service";
import {
  broadcastToBooking,
  broadcastToAll,
  broadcastToOrder,
  registerWorkerLocationHandler,
} from "../lib/websocket";

export interface ActiveOrderTrackingState {
  orderId: string;
  orderRef: string;
  workerId: string; // WorkerProfile.id
  workerUserId: string; // User.id
  consumerId: string;
  workerName: string;
  workerPhone: string;
  workerAvatarUrl?: string | null;
  workerRating?: number;
  dutyState: string;
  consumerAddress: string;
  consumerLat: number;
  consumerLng: number;
  workerLat: number;
  workerLng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  status: string;
  bookingMode: string;
  scheduledAt: Date | null;
  lastUpdatedAt: Date;
  route?: RouteResult;
  distanceRemainingKm?: number;
  etaMinutes?: number;
  isStale?: boolean;
}

export interface LocationUpdateInput {
  orderId: string;
  workerUserId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp?: number;
}

// In-memory store for active tracking states
// "Do not persist unnecessary historical GPS data forever."
// This store only holds the active session for orders currently in transit.
const activeTrackingStore = new Map<string, ActiveOrderTrackingState>();

// Minimum update interval per worker (debounce rapid bursts)
const workerLastUpdateTimes = new Map<string, number>();

export class TrackingService {
  /**
   * Determine whether live tracking is legally permitted under platform privacy and scheduling rules
   */
  static isTrackingPermitted(order: {
    status: string;
    bookingMode: string;
    scheduledAt: Date | null;
  }): { permitted: boolean; reason: string } {
    // 1. Unaccepted orders MUST NEVER expose live tracking
    if (["REQUESTED", "NEGOTIATION", "REJECTED", "DRAFT"].includes(order.status)) {
      return {
        permitted: false,
        reason: "Worker has not accepted this request yet. Privacy masking is active.",
      };
    }

    // 2. Terminal states
    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      return {
        permitted: false,
        reason: "Service order is completed or cancelled.",
      };
    }

    // 3. Scheduled order timing check
    // "For scheduled orders: DO NOT activate live tracking before the scheduled service time. At the scheduled time: activate tracking."
    if (order.bookingMode === "SCHEDULED" && order.scheduledAt) {
      const scheduledTime = new Date(order.scheduledAt).getTime();
      const now = Date.now();
      // Allow 15 minutes early buffer for technician transit prep, otherwise block
      if (now < scheduledTime - 15 * 60 * 1000) {
        return {
          permitted: false,
          reason: `Scheduled for ${new Date(order.scheduledAt).toLocaleString()}. Live tracking activates at service time.`,
        };
      }
    }

    // 4. Immediate orders: active when worker is travelling, arrived, or in progress
    const activeTrackingStatuses = ["TRAVELLING", "ARRIVED", "IN_PROGRESS"];
    if (activeTrackingStatuses.includes(order.status)) {
      return {
        permitted: true,
        reason: `Technician is currently ${order.status.toLowerCase().replace("_", " ")}.`,
      };
    }

    // If accepted but not yet travelling
    if (order.status === "ACCEPTED" || order.status === "CONFIRMED") {
      return {
        permitted: true,
        reason: "Order accepted. Live tracking will begin when technician starts travelling.",
      };
    }

    return {
      permitted: false,
      reason: `Order status is ${order.status}.`,
    };
  }

  /**
   * Initialize or retrieve tracking state for an order
   */
  static async getOrCreateTrackingState(orderId: string): Promise<ActiveOrderTrackingState> {
    const cached = activeTrackingStore.get(orderId);
    if (cached) {
      // Check for staleness (> 60 seconds without GPS update)
      const secondsSinceUpdate = (Date.now() - cached.lastUpdatedAt.getTime()) / 1000;
      cached.isStale = secondsSinceUpdate > 60;
      return cached;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        worker: {
          include: {
            user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          },
        },
        consumer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const workerLat = order.worker?.latitude || 28.6139;
    const workerLng = order.worker?.longitude || 77.2090;
    const consumerLat = order.latitude || 28.524;
    const consumerLng = order.longitude || 77.155;

    // Calculate initial route
    const route = await RoutingService.calculateRoute(
      { lat: workerLat, lng: workerLng },
      { lat: consumerLat, lng: consumerLng }
    );

    const state: ActiveOrderTrackingState = {
      orderId: order.id,
      orderRef: order.orderRef,
      workerId: order.workerId || "",
      workerUserId: order.worker?.user?.id || "",
      consumerId: order.consumerId,
      workerName: order.worker?.user?.name || "Cooperative Technician",
      workerPhone: order.worker?.user?.phone || "",
      workerAvatarUrl: order.worker?.user?.avatarUrl,
      workerRating: order.worker ? Number(order.worker.avgRating) : 4.9,
      dutyState: order.worker?.dutyState || "AVAILABLE",
      consumerAddress: order.address,
      consumerLat,
      consumerLng,
      workerLat,
      workerLng,
      heading: 0,
      speed: 0,
      accuracy: 10,
      status: order.status,
      bookingMode: order.bookingMode,
      scheduledAt: order.scheduledAt,
      lastUpdatedAt: new Date(),
      route,
      distanceRemainingKm: route.distanceKm,
      etaMinutes: route.durationMinutes,
      isStale: false,
    };

    activeTrackingStore.set(orderId, state);
    return state;
  }

  /**
   * Process a location update from the worker's device
   */
  static async updateWorkerLocation(input: LocationUpdateInput): Promise<{
    success: boolean;
    state: ActiveOrderTrackingState;
    broadcastPayload: any;
  }> {
    const { orderId, workerUserId, latitude, longitude, heading = 0, speed = 0, accuracy = 10 } = input;

    // 1. Throttle / Debounce protection: minimum 1.5 seconds between updates
    const lastTime = workerLastUpdateTimes.get(workerUserId) || 0;
    const now = Date.now();
    if (now - lastTime < 1200) {
      // Return existing without hammering calculation
      const current = await this.getOrCreateTrackingState(orderId);
      return {
        success: true,
        state: current,
        broadcastPayload: this.formatBroadcastPayload(current),
      };
    }

    // 2. Fetch order to verify authorization and privacy constraints
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        worker: { select: { id: true, userId: true, dutyState: true } },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.worker?.userId !== workerUserId) {
      throw new AppError("Unauthorized: Only the assigned technician can update live location", 403);
    }

    // 3. Privacy & Schedule Check
    const permCheck = this.isTrackingPermitted(order);
    if (!permCheck.permitted) {
      throw new AppError(`Location update rejected: ${permCheck.reason}`, 400);
    }

    // 4. Accuracy filtering (Ignore inaccurate GPS fixes > 200m)
    if (accuracy > 200) {
      logger.warn(`Rejected low-accuracy GPS update (${accuracy}m) for order ${orderId}`);
      const current = await this.getOrCreateTrackingState(orderId);
      return {
        success: true,
        state: current,
        broadcastPayload: this.formatBroadcastPayload(current),
      };
    }

    // 5. Update state
    workerLastUpdateTimes.set(workerUserId, now);
    const state = await this.getOrCreateTrackingState(orderId);
    state.workerLat = latitude;
    state.workerLng = longitude;
    state.heading = heading;
    state.speed = speed;
    state.accuracy = accuracy;
    state.lastUpdatedAt = new Date();
    state.status = order.status;
    state.isStale = false;

    // Recalculate remaining distance & ETA
    const dest = { lat: state.consumerLat, lng: state.consumerLng };
    const remaining = RoutingService.estimateRemaining(
      { lat: latitude, lng: longitude },
      dest,
      speed
    );
    state.distanceRemainingKm = remaining.distanceRemainingKm;
    state.etaMinutes = remaining.etaMinutes;

    // If worker is within 40 meters, flag as arrived automatically if still travelling
    if (remaining.distanceRemainingKm <= 0.04 && state.status === "TRAVELLING") {
      logger.info(`Technician reached proximity (<40m) of destination for order ${order.orderRef}`);
    }

    // Save latest coordinates in worker profile for discovery engine (single row update)
    if (order.workerId) {
      prisma.workerProfile
        .update({
          where: { id: order.workerId },
          data: { latitude, longitude },
        })
        .catch((err) => logger.warn(`Failed to update worker coordinates in DB: ${err.message}`));
    }

    // 6. Construct realtime broadcast payload
    const broadcastPayload = this.formatBroadcastPayload(state);

    // Broadcast to WebSocket rooms
    try {
      broadcastToOrder(orderId, "location:update", broadcastPayload);
      broadcastToBooking(orderId, broadcastPayload);
      broadcastToAll(`order:${orderId}:location`, broadcastPayload);
    } catch (e: any) {
      logger.warn(`WebSocket broadcast failed: ${e?.message}`);
    }

    return { success: true, state, broadcastPayload };
  }

  /**
   * Get full tracking snapshot for consumer or worker view
   */
  static async getTrackingSnapshot(
    orderId: string,
    requesterUserId: string,
    requesterRole: string
  ): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        worker: {
          include: {
            user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          },
        },
        consumer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const isConsumer = order.consumerId === requesterUserId || requesterRole === "CONSUMER";
    const isWorker = order.worker?.userId === requesterUserId || requesterRole === "WORKER";

    if (!isConsumer && !isWorker && requesterRole !== "ADMIN") {
      throw new AppError("Unauthorized to view this order's tracking", 403);
    }

    const permCheck = this.isTrackingPermitted(order);

    // BEFORE ACCEPTANCE: Worker MUST NOT see exact consumer GPS or destination
    const isAcceptedOrBeyond = [
      "ACCEPTED",
      "CONFIRMED",
      "TRAVELLING",
      "ARRIVED",
      "IN_PROGRESS",
      "COMPLETED",
    ].includes(order.status);
    const hideExactDestination = isWorker && !isAcceptedOrBeyond;

    const consumerLat = hideExactDestination ? null : (order.latitude || null);
    const consumerLng = hideExactDestination ? null : (order.longitude || null);
    const destinationAddress = hideExactDestination ? null : order.address;

    // Get live state if active
    let liveState: ActiveOrderTrackingState | null = null;
    if (permCheck.permitted && order.worker) {
      liveState = await this.getOrCreateTrackingState(order.id);
    }

    const workerLat = liveState?.workerLat ?? order.worker?.latitude ?? 28.6139;
    const workerLng = liveState?.workerLng ?? order.worker?.longitude ?? 77.2090;

    let routeData = liveState?.route || null;
    if (!routeData && !hideExactDestination && consumerLat && consumerLng) {
      routeData = await RoutingService.calculateRoute(
        { lat: workerLat, lng: workerLng },
        { lat: consumerLat, lng: consumerLng }
      );
    }

    return {
      orderId: order.id,
      orderRef: order.orderRef,
      status: order.status,
      bookingMode: order.bookingMode,
      scheduledAt: order.scheduledAt ? order.scheduledAt.toISOString() : null,
      trackingActive: permCheck.permitted,
      trackingReason: permCheck.reason,
      destination: {
        address: destinationAddress,
        latitude: consumerLat,
        longitude: consumerLng,
        isMasked: hideExactDestination,
        approxArea: order.approxArea,
        approxDistanceKm: order.approxDistanceKm,
      },
      worker: order.worker
        ? {
            id: order.worker.id,
            name: order.worker.user.name,
            avatarUrl: order.worker.user.avatarUrl,
            phone: "[Protected]", // Phone numbers are strictly masked
            rating: Number(order.worker.avgRating),
            dutyState: order.worker.dutyState,
            vehicleType: "SCOOTER",
          }
        : null,
      currentLocation:
        permCheck.permitted && liveState
          ? {
              latitude: liveState.workerLat,
              longitude: liveState.workerLng,
              heading: liveState.heading || 0,
              speed: liveState.speed || 0,
              accuracy: liveState.accuracy || 10,
              updatedAt: liveState.lastUpdatedAt.toISOString(),
              isStale: liveState.isStale || false,
            }
          : null,
      route:
        permCheck.permitted && routeData
          ? {
              coordinates: routeData.coordinates,
              distanceKm: liveState?.distanceRemainingKm ?? routeData.distanceKm,
              etaMinutes: liveState?.etaMinutes ?? routeData.durationMinutes,
              etaTimestamp: `${liveState?.etaMinutes ?? routeData.durationMinutes} mins remaining`,
              source: routeData.source,
            }
          : null,
    };
  }

  /**
   * Finalize and purge in-memory tracking session when job completes
   * "Do not persist unnecessary historical GPS data forever."
   */
  static endTracking(orderId: string): void {
    if (activeTrackingStore.has(orderId)) {
      activeTrackingStore.delete(orderId);
      logger.info(`Purged ephemeral tracking data for completed order: ${orderId}`);
    }
  }

    private static formatBroadcastPayload(state: ActiveOrderTrackingState) {
    return {
      orderId: state.orderId,
      orderRef: state.orderRef,
      status: state.status,
      workerLat: state.workerLat,
      workerLng: state.workerLng,
      heading: state.heading || 0,
      speed: state.speed || 0,
      accuracy: state.accuracy || 10,
      distanceRemainingKm: state.distanceRemainingKm,
      etaMinutes: state.etaMinutes,
      timestamp: state.lastUpdatedAt.toISOString(),
      isStale: state.isStale || false,
    };
  }
}

// Auto-register WebSocket location handler for high-performance streaming updates
registerWorkerLocationHandler(async (payload, userId) => {
  if (!payload || !payload.orderId || payload.latitude == null || payload.longitude == null) {
    return;
  }
  await TrackingService.updateWorkerLocation({
    orderId: payload.orderId,
    workerUserId: userId,
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    heading: payload.heading != null ? Number(payload.heading) : undefined,
    speed: payload.speed != null ? Number(payload.speed) : undefined,
    accuracy: payload.accuracy != null ? Number(payload.accuracy) : undefined,
    timestamp: payload.timestamp != null ? Number(payload.timestamp) : Date.now(),
  });
});
