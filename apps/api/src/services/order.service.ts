import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { BookingMode, OrderStatus, Prisma } from "@prisma/client";
import {
  assertValidOrderTransition,
  calculateDistanceKm,
} from "./order-state-machine";
import { TrackingService } from "./tracking.service";
import {
  broadcastOrderStatus,
  broadcastToWorker,
  broadcastToUser,
} from "../lib/websocket";
import { PricingService } from "./pricing.service";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 600): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err.code === "P1001" ||
        err.code === "P1017" ||
        err.code === "P2028" ||
        (err.name === "PrismaClientKnownRequestError" && (err.code === "P1001" || err.code === "P1017" || err.code === "P2028")) ||
        err.message?.includes("Can't reach database") ||
        err.message?.includes("connection pool") ||
        err.message?.includes("closed the connection") ||
        err.message?.includes("Server has closed") ||
        err.message?.includes("Connection") ||
        err.message?.includes("Transaction not found") ||
        err.message?.includes("Transaction API error") ||
        err.message?.includes("expired transaction") ||
        err.message?.includes("Transaction already closed");
      if (attempt < retries - 1 && isRetryable) {
        await prisma.$connect().catch(() => {});
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export interface CreateOrderInput {
  problemRequestId: string;
  workerId: string;
  bookingMode?: "IMMEDIATE" | "SCHEDULED";
  scheduledAt?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface RejectOrderInput {
  reason: string;
  customNote?: string;
}

export class OrderService {
  /**
   * Helper to derive approximate locality without revealing exact house/flat numbers
   */
  private static deriveApproxArea(address?: string | null): string {
    if (!address) return "Local Service Zone";
    // 1. Remove specific building/house/flat/floor/plot/door/block identifiers
    const sanitized = address
      .replace(/\b(house|flat|plot|room|apt|apartment|door|bldg|building|h\.no|f\.no|p\.no|block)\s*#?[\w\/-]+/gi, "")
      .replace(/^\s*[\w\/-]+\s*,/i, "") // remove leading e.g. "42,", "B-4/12,"
      .replace(/,\s*\d{6}\b/g, "") // remove Indian 6-digit pincode e.g. "110057"
      .replace(/\b\d{6}\b/g, "")
      .trim();

    // 2. Split by comma and filter out any leftover numbers or tiny tokens
    const parts = sanitized
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && !/^\d+$/.test(s));

    if (parts.length >= 2) {
      return parts.slice(-2).join(", ");
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return "Local Service Zone";
  }

  /**
   * Create an Order from a Problem Request with chosen technician & schedule mode
   */
  static async createOrder(consumerUserId: string, input: CreateOrderInput) {
    const { problemRequestId, workerId, bookingMode = "IMMEDIATE", scheduledAt } = input;

    if (!problemRequestId || !workerId) {
      throw new AppError("Both problemRequestId and workerId are required.", 400);
    }

    // 1. Fetch Problem Request with problem and category relations
    const pr = await withDbRetry(() =>
      prisma.problemRequest.findUnique({
        where: { id: problemRequestId },
        include: {
          category: true,
          subcategory: true,
          problem: true,
          consumer: {
            include: { consumerProfile: true },
          },
        },
      })
    );

    if (!pr) {
      throw new AppError("Problem request not found.", 404);
    }

    if (pr.consumerId !== consumerUserId) {
      throw new AppError("You are not authorized to create an order for this problem request.", 403);
    }

    // 2. Fetch Selected Worker Profile with coordinates
    const worker = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { id: workerId },
        include: {
          user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          coop: { select: { id: true, name: true, city: true } },
        },
      })
    );

    if (!worker || worker.status !== "VERIFIED") {
      throw new AppError("The selected technician is not an active verified cooperative member.", 400);
    }

    // 3. Validate Scheduled Mode
    let parsedScheduledAt: Date | null = null;
    if (bookingMode === "SCHEDULED") {
      if (!scheduledAt) {
        throw new AppError("scheduledAt date-time is required for scheduled orders.", 400);
      }
      parsedScheduledAt = new Date(scheduledAt);
      if (isNaN(parsedScheduledAt.getTime())) {
        throw new AppError("Invalid scheduledAt date format.", 400);
      }
      if (parsedScheduledAt.getTime() <= Date.now() + 10 * 60 * 1000) {
        throw new AppError("Scheduled service time must be at least 15 minutes in the future.", 400);
      }
    }

    // 4. Resolve Location
    const finalAddress =
      input.address?.trim() ||
      pr.address ||
      pr.consumer.consumerProfile?.defaultAddress ||
      "Delhi-NCR Service Address";
    const finalLat =
      input.latitude ??
      pr.latitude ??
      pr.consumer.consumerProfile?.latitude ??
      28.628;
    const finalLng =
      input.longitude ??
      pr.longitude ??
      pr.consumer.consumerProfile?.longitude ??
      77.2195;

    // 5. Calculate Approximate Distance
    let approxDistanceKm: number | null = null;
    if (worker.latitude && worker.longitude && finalLat && finalLng) {
      approxDistanceKm = calculateDistanceKm(
        finalLat,
        finalLng,
        worker.latitude,
        worker.longitude
      );
    } else {
      approxDistanceKm = 1.8; // Standard neighborhood default
    }

    const approxArea = this.deriveApproxArea(finalAddress);

    // 6. Generate Unique Order Reference
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderRef = `ORD-${dateStr}-${randPart}`;

    // 7. Validate initial transition DRAFT -> REQUESTED
    assertValidOrderTransition(OrderStatus.DRAFT, OrderStatus.REQUESTED);

    // 8. Create Order and initial status history in a transaction
    const order = await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderRef,
            consumerId: consumerUserId,
            workerId: worker.id,
            problemRequestId: pr.id,
            categoryId: pr.categoryId,
            subcategoryId: pr.subcategoryId,
            problemId: pr.problemId,
            status: OrderStatus.REQUESTED,
            bookingMode: bookingMode as BookingMode,
            scheduledAt: parsedScheduledAt,
            address: finalAddress,
            latitude: finalLat,
            longitude: finalLng,
            approxDistanceKm,
            approxArea,
            problemTitle: pr.problem.name,
            textDescription: pr.textDescription,
            audioUrl: pr.audioUrl,
            audioDuration: pr.audioDuration,
            photos: pr.photos,
            videoUrl: pr.videoUrl,
            additionalNotes: pr.additionalNotes,
            basePrice: pr.problem.basePrice,
            estimatedPriceMin: pr.estimatedPriceMin,
            estimatedPriceMax: pr.estimatedPriceMax,
            workerPriceCeiling: pr.workerPriceCeiling || pr.problem.workerPriceCeiling,
          },
          include: {
            category: true,
            subcategory: true,
            problem: true,
            worker: {
              include: {
                user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
                coop: { select: { id: true, name: true, city: true } },
              },
            },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: created.id,
            fromStatus: OrderStatus.DRAFT,
            toStatus: OrderStatus.REQUESTED,
            changedById: consumerUserId,
            reason: "Consumer confirmed order and dispatched request to technician.",
          },
        });

        // Update problem request status
        await tx.problemRequest.update({
          where: { id: pr.id },
          data: {
            status: "SUBMITTED",
            selectedWorkerId: worker.id,
          },
        });

        return created;
      },
      { maxWait: 10000, timeout: 25000 }
    )
  );

    // Realtime notification to assigned worker
    if (worker?.id) {
      broadcastToWorker(worker.id, order);
    }
    if (worker?.user?.id) {
      broadcastToUser(worker.user.id, "order:incoming", order);
    }
    broadcastOrderStatus(order, {
      message: "Order request created and dispatched to technician.",
    });

    return order;
  }

  /**
   * Retrieves incoming requests for a worker with STRICT LOCATION PRIVACY ENFORCEMENT.
   * Exact street address and coordinates are masked before order acceptance.
   */
  static async getWorkerIncomingRequests(workerUserId: string) {
    const workerProfile = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { userId: workerUserId },
      })
    );

    if (!workerProfile) {
      throw new AppError("Worker profile not found for user.", 404);
    }

    const orders = await withDbRetry(() =>
      prisma.order.findMany({
        where: {
          workerId: workerProfile.id,
          status: OrderStatus.REQUESTED,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          problem: {
            select: {
              id: true,
              name: true,
              estimatedDuration: true,
              pricingUnit: true,
              workerPriceCeiling: true,
            },
          },
          consumer: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              locale: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    // MASK LOCATION FOR PRIVACY BEFORE ACCEPTANCE
    return orders.map((o) => ({
      ...o,
      address: null, // SENSITIVE EXACT ADDRESS STRICTLY NULL BEFORE ACCEPTANCE
      latitude: null,
      longitude: null,
      isAddressMasked: true,
      approxArea: o.approxArea || "Local Service Zone",
      approxDistanceKm: o.approxDistanceKm,
    }));
  }

  /**
   * Worker accepts an order request.
   * State Machine transition: REQUESTED -> ACCEPTED.
   * After acceptance, exact address is released to the worker.
   */
  static async acceptOrder(orderId: string, workerUserId: string) {
    const workerProfile = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { userId: workerUserId },
        include: {
          user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        },
      })
    );

    if (!workerProfile) {
      throw new AppError("Worker profile not found.", 404);
    }

    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.workerId !== workerProfile.id) {
      throw new AppError("This order request was not assigned to you.", 403);
    }

    // Validate state machine transition
    assertValidOrderTransition(order.status, OrderStatus.ACCEPTED);

    const updated = await withDbRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const res = await tx.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.ACCEPTED,
              acceptedAt: new Date(),
            },
            include: {
              consumer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
              category: true,
              problem: true,
              worker: {
                include: {
                  user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
                  coop: { select: { id: true, name: true } },
                },
              },
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: order.status,
              toStatus: OrderStatus.ACCEPTED,
              changedById: workerUserId,
              reason: "Technician accepted order request.",
            },
          });

          return res;
        },
        { maxWait: 10000, timeout: 25000 }
      )
    );

    // Realtime broadcast to consumer and order room
    broadcastOrderStatus(updated, {
      message: `Your request has been accepted by ${workerProfile.user?.name || "Technician"}.`,
      workerName: workerProfile.user?.name,
    });

    return {
      ...updated,
      isAddressMasked: false,
      liveLocationActive:
        updated.bookingMode === BookingMode.IMMEDIATE ? true : false,
      liveLocationNote:
        updated.bookingMode === BookingMode.SCHEDULED
          ? "Live tracking will activate only at scheduled service time."
          : "Technician dispatched for immediate service.",
    };
  }

  /**
   * Worker rejects an order request with a mandatory structured reason.
   * State Machine transition: REQUESTED -> REJECTED.
   */
  static async rejectOrder(
    orderId: string,
    workerUserId: string,
    input: RejectOrderInput
  ) {
    const { reason, customNote } = input;
    const validReasons = [
      "Too far",
      "Not available",
      "Outside my skill",
      "Price not suitable",
      "Other",
    ];

    if (!reason || !validReasons.includes(reason)) {
      throw new AppError(
        `A valid rejection reason is required: [${validReasons.join(", ")}].`,
        400
      );
    }

    const workerProfile = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { userId: workerUserId },
      })
    );

    if (!workerProfile) {
      throw new AppError("Worker profile not found.", 404);
    }

    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.workerId !== workerProfile.id) {
      throw new AppError("This order request was not assigned to you.", 403);
    }

    // Validate state machine transition
    assertValidOrderTransition(order.status, OrderStatus.REJECTED);

    const updated = await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        const res = await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.REJECTED,
            rejectionReason: reason,
            rejectionCustomNote: customNote?.trim() || null,
            rejectedAt: new Date(),
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: order.status,
            toStatus: OrderStatus.REJECTED,
            changedById: workerUserId,
            reason: `Technician declined request: ${reason}${
              customNote ? ` (${customNote})` : ""
            }`,
          },
        });

        return res;
      })
    );

    // Realtime broadcast to consumer and order room
    broadcastOrderStatus(updated, {
      message: `Technician declined request: ${reason}${customNote ? ` (${customNote})` : ""}`,
      reason,
      customNote,
    });

    return {
      orderId: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      message:
        "Order request declined. Consumer will be prompted to select another cooperative technician.",
    };
  }

  /**
   * Reassign order to a new technician if previously rejected.
   * State Machine transition: REJECTED -> REQUESTED.
   */
  static async reassignWorker(
    orderId: string,
    consumerUserId: string,
    newWorkerId: string
  ) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.consumerId !== consumerUserId) {
      throw new AppError("You are not authorized to modify this order.", 403);
    }

    // Validate transition REJECTED -> REQUESTED
    assertValidOrderTransition(order.status, OrderStatus.REQUESTED);

    const newWorker = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { id: newWorkerId },
      })
    );

    if (!newWorker || newWorker.status !== "VERIFIED") {
      throw new AppError("Selected replacement technician is not available.", 400);
    }

    const updated = await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        const res = await tx.order.update({
          where: { id: orderId },
          data: {
            workerId: newWorker.id,
            status: OrderStatus.REQUESTED,
            rejectionReason: null,
            rejectionCustomNote: null,
            rejectedAt: null,
          },
          include: {
            worker: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
                coop: { select: { id: true, name: true } },
              },
            },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: OrderStatus.REJECTED,
            toStatus: OrderStatus.REQUESTED,
            changedById: consumerUserId,
            reason: `Consumer requested replacement technician: ${newWorker.id}`,
          },
        });

        return res;
      })
    );

    return updated;
  }

  /**
   * Get single order by ID with role-aware privacy enforcement
   */
  static async getOrderById(orderId: string, userId: string, role: string) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          category: true,
          subcategory: true,
          problem: true,
          consumer: {
            select: { id: true, name: true, phone: true, avatarUrl: true },
          },
          worker: {
            include: {
              user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
              coop: { select: { id: true, name: true, city: true } },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    // Authorization check
    const isConsumer = order.consumerId === userId;
    const isWorker = order.worker?.userId === userId;

    if (!isConsumer && !isWorker && role !== "COOP_ADMIN" && role !== "MINISTRY_SUPER_ADMIN") {
      throw new AppError("You do not have permission to view this order.", 403);
    }

    // LOCATION PRIVACY: If viewed by worker before acceptance, mask exact address!
    const isAcceptedOrBeyond = [
      OrderStatus.ACCEPTED,
      OrderStatus.TRAVELLING,
      OrderStatus.ARRIVED,
      OrderStatus.IN_PROGRESS,
      OrderStatus.COMPLETED,
    ].includes(order.status as any);

    if (isWorker && !isAcceptedOrBeyond) {
      return {
        ...order,
        address: null, // SENSITIVE EXACT ADDRESS STRICTLY NULL BEFORE ACCEPTANCE
        latitude: null,
        longitude: null,
        isAddressMasked: true,
        approxArea: order.approxArea || "Local Service Zone",
        approxDistanceKm: order.approxDistanceKm,
      };
    }

    return {
      ...order,
      isAddressMasked: false,
      liveLocationActive:
        order.status === OrderStatus.ACCEPTED &&
        order.bookingMode === BookingMode.IMMEDIATE,
    };
  }

  /**
   * Retrieves the current active order for a consumer.
   * Scans for orders in non-terminal active states:
   * REQUESTED, ACCEPTED, NEGOTIATION, CONFIRMED, TRAVELLING, ARRIVED, IN_PROGRESS, PAYMENT_PENDING.
   * If multiple exist, returns the most recently updated one.
   */
  static async getActiveConsumerOrder(consumerUserId: string) {
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

    const activeOrder = await withDbRetry(() =>
      prisma.order.findFirst({
        where: {
          consumerId: consumerUserId,
          status: { in: activeStatuses },
        },
        include: {
          category: true,
          subcategory: true,
          problem: true,
          priceProposals: {
            orderBy: { createdAt: "desc" },
          },
          worker: {
            include: {
              user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
              coop: { select: { id: true, name: true, city: true } },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      })
    );

    // Check if there is an order completed & settled in the last 15 minutes
    const recentSettled = await withDbRetry(() =>
      prisma.order.findFirst({
        where: {
          consumerId: consumerUserId,
          status: OrderStatus.COMPLETED,
          updatedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
        include: {
          category: true,
          subcategory: true,
          problem: true,
          priceProposals: {
            orderBy: { createdAt: "desc" },
          },
          worker: {
            include: {
              user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
              coop: { select: { id: true, name: true, city: true } },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      })
    );

    // If both exist, return whichever was updated more recently
    if (activeOrder && recentSettled) {
      if (new Date(recentSettled.updatedAt).getTime() > new Date(activeOrder.updatedAt).getTime()) {
        return recentSettled;
      }
      return activeOrder;
    }

    return activeOrder || recentSettled || null;
  }

  /**
   * Consumer orders listing
   */
  static async getConsumerOrders(consumerUserId: string) {
    return await withDbRetry(() =>
      prisma.order.findMany({
        where: { consumerId: consumerUserId },
        include: {
          category: true,
          subcategory: true,
          problem: true,
          priceProposals: {
            orderBy: { createdAt: "desc" },
          },
          worker: {
            include: {
              user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
              coop: { select: { id: true, name: true, city: true } },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );
  }

  /**
   * Propose a price for negotiation (Worker or Consumer).
   * Strictly enforces service backend price ceiling (Worker cannot exceed workerPriceCeiling).
   * Saves every proposal to OrderPriceProposal history table without overwriting.
   */
  static async proposePrice(
    orderId: string,
    userId: string,
    input: { amount?: number; proposedAmount?: number; reason?: string }
  ) {
    const amount = input.amount !== undefined ? input.amount : input.proposedAmount;
    const { reason } = input;
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new AppError("A valid positive price amount is required.", 400);
    }

    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          worker: { include: { user: true } },
          consumer: true,
          problem: true,
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.isPriceLocked) {
      throw new AppError("Price is already locked and cannot be renegotiated.", 400);
    }

    const isWorker = order.worker?.userId === userId;
    const isConsumer = order.consumerId === userId;

    if (!isWorker && !isConsumer) {
      throw new AppError("You are not authorized to negotiate on this order.", 403);
    }

    const proposerRole = isWorker ? "WORKER" : "CONSUMER";
    const ceiling = Number(order.workerPriceCeiling);

    // CEILING ENFORCEMENT: Worker cannot propose above backend price ceiling
    if (isWorker && numericAmount > ceiling) {
      throw new AppError(
        `Proposed price ₹${numericAmount} exceeds the allowed price ceiling of ₹${ceiling} for this service. Negotiation must remain within fair market limits.`,
        400
      );
    }

    // Consumer also cannot counter above ceiling
    if (isConsumer && numericAmount > ceiling) {
      throw new AppError(
        `Counteroffer ₹${numericAmount} cannot exceed the maximum price ceiling of ₹${ceiling}.`,
        400
      );
    }

    // Save proposal to immutable history table and transition state
    const result = await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        // Mark any previous PENDING proposals as COUNTERED
        await tx.orderPriceProposal.updateMany({
          where: { orderId, status: "PENDING" },
          data: { status: "COUNTERED" },
        });

        // Create new proposal
        const proposal = await tx.orderPriceProposal.create({
          data: {
            orderId,
            proposerRole: proposerRole as any,
            proposerId: userId,
            amount: new Prisma.Decimal(numericAmount),
            reason: reason?.trim() || null,
            status: "PENDING",
          },
        });

        // Transition order status to NEGOTIATION if not already there or confirmed
        const currentStatus = order.status;
        let newStatus = currentStatus;
        if (currentStatus === OrderStatus.REQUESTED || currentStatus === OrderStatus.ACCEPTED) {
          newStatus = OrderStatus.NEGOTIATION;
        }

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            quotedPrice: new Prisma.Decimal(numericAmount),
            status: newStatus,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: currentStatus,
            toStatus: newStatus,
            changedById: userId,
            reason: `${proposerRole} proposed price ₹${numericAmount}${
              reason ? `: ${reason}` : ""
            }`,
          },
        });

        return { proposal, order: updatedOrder };
      })
    );

    return {
      success: true,
      proposalId: result.proposal.id,
      amount: Number(result.proposal.amount),
      proposerRole: result.proposal.proposerRole,
      status: result.proposal.status,
      orderStatus: result.order.status,
      message: `Price proposal of ₹${numericAmount} submitted successfully.`,
    };
  }

  /**
   * Respond to an active price proposal: ACCEPT, REJECT, or COUNTER.
   * Accepting permanently locks the finalPrice (isPriceLocked: true).
   */
  static async respondToPriceProposal(
    orderId: string,
    userId: string,
    input: { action: "ACCEPT" | "REJECT" | "COUNTER"; counterAmount?: number; reason?: string }
  ) {
    const { action, counterAmount, reason } = input;

    if (!["ACCEPT", "REJECT", "COUNTER"].includes(action)) {
      throw new AppError("Action must be ACCEPT, REJECT, or COUNTER.", 400);
    }

    if (action === "COUNTER") {
      if (!counterAmount || counterAmount <= 0) {
        throw new AppError("A valid counter amount is required to counteroffer.", 400);
      }
      return await OrderService.proposePrice(orderId, userId, {
        amount: counterAmount,
        reason: reason || "Counteroffer",
      });
    }

    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          worker: { include: { user: true } },
          consumer: true,
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.isPriceLocked) {
      throw new AppError("Price agreement is already confirmed and immutable.", 400);
    }

    const isWorker = order.worker?.userId === userId;
    const isConsumer = order.consumerId === userId;

    if (!isWorker && !isConsumer) {
      throw new AppError("You are not authorized to respond to proposals on this order.", 403);
    }

    // Fetch the pending proposal
    const latestProposal = await withDbRetry(() =>
      prisma.orderPriceProposal.findFirst({
        where: { orderId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      })
    );

    if (!latestProposal) {
      throw new AppError("No pending price proposal found to respond to.", 404);
    }

    // Role check: Only counterpart can accept or reject
    if (latestProposal.proposerRole === "WORKER" && !isConsumer) {
      throw new AppError("Only the consumer can accept or reject the worker's proposal.", 403);
    }
    if (latestProposal.proposerRole === "CONSUMER" && !isWorker) {
      throw new AppError("Only the worker can accept or reject the consumer's counteroffer.", 403);
    }

    if (action === "ACCEPT") {
      const agreedAmount = Number(latestProposal.amount);

      const updated = await withDbRetry(() =>
        prisma.$transaction(async (tx) => {
          await tx.orderPriceProposal.update({
            where: { id: latestProposal.id },
            data: { status: "ACCEPTED" },
          });

          const res = await tx.order.update({
            where: { id: orderId },
            data: {
              finalPrice: new Prisma.Decimal(agreedAmount),
              isPriceLocked: true,
              priceConfirmedAt: new Date(),
              priceConfirmedById: userId,
              status: OrderStatus.CONFIRMED,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: order.status,
              toStatus: OrderStatus.CONFIRMED,
              changedById: userId,
              reason: `Price agreement reached at ₹${agreedAmount}. Final price is now locked and confirmed.`,
            },
          });

          return res;
        })
      );

      return {
        success: true,
        action: "ACCEPT",
        finalPrice: Number(updated.finalPrice),
        isPriceLocked: updated.isPriceLocked,
        status: updated.status,
        message: `Price agreement confirmed at ₹${agreedAmount}. Final price is now immutable.`,
      };
    }

    if (action === "REJECT") {
      await withDbRetry(() =>
        prisma.$transaction(async (tx) => {
          await tx.orderPriceProposal.update({
            where: { id: latestProposal.id },
            data: { status: "REJECTED" },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: order.status,
              toStatus: order.status,
              changedById: userId,
              reason: `Proposal of ₹${latestProposal.amount} rejected: ${
                reason || "Not agreed"
              }`,
            },
          });
        })
      );

      return {
        success: true,
        action: "REJECT",
        message: "Proposal was rejected.",
      };
    }
  }

  /**
   * Get complete immutable price proposal history for an order.
   * Neither side can view private phone numbers here.
   */
  static async getPriceHistory(orderId: string, userId: string) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          worker: { include: { user: true } },
          priceProposals: {
            orderBy: { createdAt: "asc" },
          },
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const isWorker = order.worker?.userId === userId;
    const isConsumer = order.consumerId === userId;

    if (!isWorker && !isConsumer) {
      throw new AppError("Not authorized to view price history for this order.", 403);
    }

    return {
      orderId: order.id,
      orderRef: order.orderRef,
      basePrice: Number(order.basePrice),
      estimatedPriceMin: Number(order.estimatedPriceMin),
      estimatedPriceMax: Number(order.estimatedPriceMax),
      workerPriceCeiling: Number(order.workerPriceCeiling),
      quotedPrice: order.quotedPrice ? Number(order.quotedPrice) : null,
      finalPrice: order.finalPrice ? Number(order.finalPrice) : null,
      isPriceLocked: order.isPriceLocked,
      priceConfirmedAt: order.priceConfirmedAt,
      proposals: order.priceProposals.map((p) => ({
        id: p.id,
        proposer: p.proposerRole,
        amount: Number(p.amount),
        reason: p.reason,
        status: p.status,
        timestamp: p.createdAt,
      })),
    };
  }

  /**
   * Worker advances active operational states:
   * AVAILABLE -> REQUEST_RECEIVED -> ACCEPTED -> TRAVELLING -> ARRIVED -> WORKING -> COMPLETED
   */
  static async updateOperationalState(
    orderId: string,
    workerUserId: string,
    nextState: "TRAVELLING" | "ARRIVED" | "WORKING" | "COMPLETED"
  ) {
    const workerProfile = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { userId: workerUserId },
      })
    );

    if (!workerProfile) {
      throw new AppError("Worker profile not found.", 404);
    }

    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.workerId !== workerProfile.id) {
      throw new AppError("This order is not assigned to you.", 403);
    }

    // Map nextState to OrderStatus
    let targetOrderStatus: OrderStatus;
    let targetDutyState: any;

    switch (nextState) {
      case "TRAVELLING":
        targetOrderStatus = OrderStatus.TRAVELLING;
        targetDutyState = "TRAVELLING";
        break;
      case "ARRIVED":
        targetOrderStatus = OrderStatus.ARRIVED;
        targetDutyState = "ARRIVED";
        break;
      case "WORKING":
        targetOrderStatus = OrderStatus.IN_PROGRESS;
        targetDutyState = "WORKING";
        break;
      case "COMPLETED":
        // Phase 8: Work is completed first, then final amount confirmed, payment requested, and earnings credited after payment
        targetOrderStatus =
          order.paymentStatus === "PAID"
            ? OrderStatus.COMPLETED
            : OrderStatus.PAYMENT_PENDING;
        targetDutyState = "AVAILABLE";
        break;
      default:
        throw new AppError("Invalid operational state.", 400);
    }

    assertValidOrderTransition(order.status, targetOrderStatus);

    const finalAgreedAmount =
      order.finalPrice || order.quotedPrice || order.basePrice;

    const updated = await withDbRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const isMarkingWorkCompleted = nextState === "COMPLETED";
          const now = new Date();
          const feeRate = Number((order as any).problem?.platformFeeRate ?? 5.0);
          const completionSettlement = isMarkingWorkCompleted
            ? PricingService.calculateSettlement(Number(finalAgreedAmount), feeRate)
            : null;

          const o = await tx.order.update({
            where: { id: orderId },
            data: {
              status: targetOrderStatus,
              workCompletedAt: isMarkingWorkCompleted
                ? order.workCompletedAt || now
                : undefined,
              completedAt:
                targetOrderStatus === OrderStatus.COMPLETED ? now : undefined,
              isPriceLocked: isMarkingWorkCompleted ? true : undefined,
              priceConfirmedAt:
                isMarkingWorkCompleted && !order.priceConfirmedAt ? now : undefined,
              finalPrice: isMarkingWorkCompleted
                ? new Prisma.Decimal(completionSettlement!.grossAmount)
                : undefined,
              grossAmount: isMarkingWorkCompleted
                ? new Prisma.Decimal(completionSettlement!.grossAmount)
                : undefined,
              platformFee: isMarkingWorkCompleted
                ? new Prisma.Decimal(completionSettlement!.platformFee)
                : undefined,
              workerEarnings: isMarkingWorkCompleted
                ? new Prisma.Decimal(completionSettlement!.workerEarnings)
                : undefined,
              paymentStatus:
                isMarkingWorkCompleted && order.paymentStatus !== "PAID"
                  ? "PAYMENT_PENDING"
                  : undefined,
            },
          });

          // Update worker dutyState (Earnings are credited strictly after payment is confirmed)
          await tx.workerProfile.update({
            where: { id: workerProfile.id },
            data: {
              dutyState: isMarkingWorkCompleted ? "AVAILABLE" : targetDutyState,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: order.status,
              toStatus: targetOrderStatus,
              changedById: workerUserId,
              reason: isMarkingWorkCompleted
                ? `Technician completed service on site. Final price confirmed at ₹${finalAgreedAmount}. Escrow payment requested.`
                : `Technician advanced operational state to ${nextState}.`,
            },
          });

          return o;
        },
        { maxWait: 10000, timeout: 25000 }
      )
    );

    if (nextState === "COMPLETED") {
      TrackingService.endTracking(orderId);
    }

    // Fetch full order for realtime broadcast to consumer and order room
    const fullUpdatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        category: true,
        subcategory: true,
        problem: true,
        consumer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        worker: {
          include: {
            user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
            coop: { select: { id: true, name: true, city: true } },
          },
        },
      },
    });

    if (fullUpdatedOrder) {
      broadcastOrderStatus(fullUpdatedOrder, {
        operationalState: nextState,
        message: `Technician advanced operational state to ${nextState}.`,
      });
    }

    return {
      success: true,
      orderId: updated.id,
      orderStatus: updated.status,
      operationalState: nextState,
      message: `Operational state updated to ${nextState}.`,
    };
  }

  /**
   * Worker switches dynamic duty toggle:
   * OFF_DUTY <-> AVAILABLE
   */
  static async updateDutyStatus(
    workerUserId: string,
    dutyState: "AVAILABLE" | "OFF_DUTY"
  ) {
    if (!["AVAILABLE", "OFF_DUTY"].includes(dutyState)) {
      throw new AppError("Duty state must be AVAILABLE or OFF_DUTY.", 400);
    }

    const workerProfile = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { userId: workerUserId },
      })
    );

    if (!workerProfile) {
      throw new AppError("Worker profile not found.", 404);
    }

    const isAvailable = dutyState === "AVAILABLE";
    const isOnDuty = dutyState === "AVAILABLE";

    const updated = await withDbRetry(() =>
      prisma.workerProfile.update({
        where: { id: workerProfile.id },
        data: {
          dutyState: dutyState as any,
          isOnDuty,
          isAvailable,
        },
        include: {
          user: { select: { id: true, name: true } },
          coop: { select: { id: true, name: true } },
        },
      })
    );

    return {
      success: true,
      dutyState: updated.dutyState,
      isOnDuty: updated.isOnDuty,
      isAvailable: updated.isAvailable,
      message: `Duty status set to ${dutyState}. ${
        dutyState === "AVAILABLE"
          ? "You are now receiving immediate customer requests."
          : "You are currently off duty. Immediate requests will not route to you."
      }`,
    };
  }

  /**
   * Comprehensive Worker Dashboard Aggregator:
   * Combines all 10 core requirements:
   * 1. Availability toggle
   * 2. Current status
   * 3. Incoming requests
   * 4. Active job
   * 5. Scheduled jobs
   * 6. Completed jobs
   * 7. Earnings
   * 8. Profile
   * 9. Ratings
   * 10. Order history
   */
  static async getWorkerDashboardSummary(workerUserId: string) {
    const workerProfile = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { userId: workerUserId },
        include: {
          user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          coop: { select: { id: true, name: true, city: true } },
          reviewsReceived: {
            include: {
              author: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      })
    );

    if (!workerProfile) {
      throw new AppError("Worker profile not found for user.", 404);
    }

    // All orders for this worker
    const allOrders = await withDbRetry(() =>
      prisma.order.findMany({
        where: { workerId: workerProfile.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          problem: {
            select: {
              id: true,
              name: true,
              estimatedDuration: true,
              pricingUnit: true,
              workerPriceCeiling: true,
            },
          },
          consumer: {
            select: { id: true, name: true, avatarUrl: true, locale: true },
          },
          priceProposals: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    // 1 & 2: Dynamic duty state calculation
    const activeJobOrder = allOrders.find((o) =>
      (
        [
          OrderStatus.ACCEPTED,
          OrderStatus.NEGOTIATION,
          OrderStatus.CONFIRMED,
          OrderStatus.TRAVELLING,
          OrderStatus.ARRIVED,
          OrderStatus.IN_PROGRESS,
          OrderStatus.PAYMENT_PENDING,
        ] as OrderStatus[]
      ).includes(o.status)
    );

    const incomingRequestsList = allOrders.filter(
      (o) => o.status === OrderStatus.REQUESTED
    );

    let calculatedStatus = workerProfile.dutyState || "OFF_DUTY";
    if (activeJobOrder) {
      if (activeJobOrder.status === OrderStatus.TRAVELLING) calculatedStatus = "TRAVELLING" as any;
      else if (activeJobOrder.status === OrderStatus.ARRIVED) calculatedStatus = "ARRIVED" as any;
      else if (activeJobOrder.status === OrderStatus.IN_PROGRESS) calculatedStatus = "WORKING" as any;
      else if (activeJobOrder.status === OrderStatus.PAYMENT_PENDING) calculatedStatus = "COMPLETED" as any;
      else calculatedStatus = "ACCEPTED" as any;
    } else if (incomingRequestsList.length > 0) {
      calculatedStatus = "REQUEST_RECEIVED" as any;
    } else if (workerProfile.isOnDuty && workerProfile.isAvailable) {
      calculatedStatus = "AVAILABLE" as any;
    } else {
      calculatedStatus = "OFF_DUTY" as any;
    }

    // 3: Incoming requests with privacy mask
    const incomingRequests = incomingRequestsList.map((o) => ({
      ...o,
      address: null, // SENSITIVE EXACT ADDRESS STRICTLY NULL BEFORE ACCEPTANCE
      latitude: null,
      longitude: null,
      isAddressMasked: true,
      approxArea: o.approxArea || "Local Service Zone",
      approxDistanceKm: o.approxDistanceKm,
    }));

    // 4: Active Job
    let activeJob: any = null;
    if (activeJobOrder) {
      activeJob = {
        ...activeJobOrder,
        isAddressMasked: false, // After acceptance, address is visible
      };
    }

    // 5: Scheduled jobs
    const scheduledJobs = allOrders
      .filter(
        (o) =>
          o.bookingMode === BookingMode.SCHEDULED &&
          !(
            [
              OrderStatus.COMPLETED,
              OrderStatus.CANCELLED,
              OrderStatus.REJECTED,
            ] as OrderStatus[]
          ).includes(o.status)
      )
      .map((o) => {
        const isAccepted = (
          [
            OrderStatus.ACCEPTED,
            OrderStatus.CONFIRMED,
            OrderStatus.TRAVELLING,
            OrderStatus.ARRIVED,
            OrderStatus.IN_PROGRESS,
          ] as OrderStatus[]
        ).includes(o.status);
        if (!isAccepted) {
          return {
            ...o,
            address: null,
            latitude: null,
            longitude: null,
            isAddressMasked: true,
          };
        }
        return {
          ...o,
          isAddressMasked: false,
        };
      });

    // 6: Completed jobs
    const completedJobs = allOrders
      .filter((o) => o.status === OrderStatus.COMPLETED || o.paymentStatus === "PAID")
      .map((o) => {
        const gross = Number(o.grossAmount || o.finalPrice || o.basePrice);
        const feeRate = Number((o as any).problem?.platformFeeRate ?? 5.0);
        const settlement = PricingService.calculateSettlement(gross, feeRate);
        const fee = Number(
          o.platformFee !== null && o.platformFee !== undefined && Number(o.platformFee) > 0
            ? o.platformFee
            : settlement.platformFee
        );
        const earned = Number(
          o.workerEarnings !== null && o.workerEarnings !== undefined && Number(o.workerEarnings) < gross
            ? o.workerEarnings
            : settlement.workerEarnings
        );
        return {
          id: o.id,
          orderRef: o.orderRef,
          problemTitle: o.problemTitle,
          categoryName: o.category?.name || "Service",
          consumerName: o.consumer?.name || "Customer",
          finalPrice: gross,
          grossAmount: gross,
          workerEarnings: earned,
          platformFee: fee,
          completedAt: o.completedAt || o.updatedAt,
          paymentCompletedAt: o.paymentCompletedAt || o.completedAt,
          paymentStatus: o.paymentStatus || (o.status === OrderStatus.COMPLETED ? "PAID" : "PAYMENT_PENDING"),
        };
      });

    // 7: Earnings computation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const completedEarnings = completedJobs.map((j) => ({
      amount: j.workerEarnings,
      date: j.paymentCompletedAt || j.completedAt,
    }));

    const todayEarnings = completedEarnings
      .filter((e) => new Date(e.date) >= startOfToday)
      .reduce((sum, e) => sum + e.amount, 0);

    const monthEarnings = completedEarnings
      .filter((e) => new Date(e.date) >= startOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCalculatedEarnings = completedEarnings.reduce((sum, e) => sum + e.amount, 0);

    const earnings = {
      todayEarnings: Math.round(todayEarnings * 100) / 100,
      monthlyEarnings: Math.round(monthEarnings * 100) / 100,
      totalEarnings: Math.round(
        (Number(workerProfile.totalEarnings) || totalCalculatedEarnings) * 100
      ) / 100,
      walletBalance: Number(workerProfile.walletBalance) || 0,
      completedJobsCount: completedJobs.length,
    };

    // 8: Profile snapshot (phone masked for public privacy, visible only to self in cockpit)
    const profile = {
      id: workerProfile.id,
      name: workerProfile.user.name,
      phone: workerProfile.user.phone,
      avatarUrl: workerProfile.user.avatarUrl,
      skillTags: workerProfile.skillTags,
      bio: workerProfile.bio,
      experienceYears: workerProfile.experienceYears,
      status: workerProfile.status,
      coopName: workerProfile.coop?.name || "Independent Member",
      coopCity: workerProfile.coop?.city || "Delhi NCR",
      aadhaarVerified: workerProfile.aadhaarVerified,
    };

    // 9: Ratings breakdown
    const reviews = workerProfile.reviewsReceived || [];
    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
      ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    });

    const ratings = {
      avgRating: Number(workerProfile.avgRating) || 4.8,
      totalReviews: reviews.length || workerProfile.totalJobs || 0,
      distribution: ratingCounts,
      recentReviews: reviews.slice(0, 5).map((r) => ({
        id: r.id,
        authorName: r.author.name,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    };

    // 10: Order history
    const orderHistory = allOrders.map((o) => ({
      id: o.id,
      orderRef: o.orderRef,
      categoryName: o.category.name,
      problemTitle: o.problemTitle,
      status: o.status,
      bookingMode: o.bookingMode,
      finalPrice: o.finalPrice ? Number(o.finalPrice) : Number(o.basePrice),
      isPriceLocked: o.isPriceLocked,
      createdAt: o.createdAt,
      completedAt: o.completedAt,
    }));

    return {
      availability: {
        isOnDuty: workerProfile.isOnDuty,
        isAvailable: workerProfile.isAvailable,
        dutyState: workerProfile.dutyState,
      },
      currentStatus: calculatedStatus,
      incomingRequests,
      activeJob,
      scheduledJobs,
      completedJobs,
      earnings,
      profile,
      ratings,
      orderHistory,
    };
  }

  /**
   * Rate and review a settled order and technician
   */
  static async rateOrder(
    orderId: string,
    consumerUserId: string,
    rating: number,
    comment?: string
  ) {
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError("Rating must be an integer between 1 and 5.", 400);
    }

    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: { worker: true },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.consumerId !== consumerUserId) {
      throw new AppError("Only the consumer of this order can submit a rating.", 403);
    }

    if (order.status !== OrderStatus.COMPLETED && order.paymentStatus !== "PAID") {
      throw new AppError("Order must be completed and settled before rating.", 400);
    }

    if (!order.workerId || !order.worker) {
      throw new AppError("Order has no assigned worker to rate.", 400);
    }

    const currentRating = order.worker.avgRating || 5.0;
    const currentJobs = order.worker.totalJobs || 1;
    const newRating = Number(((currentRating * currentJobs + rating) / (currentJobs + 1)).toFixed(2));

    await withDbRetry(() =>
      prisma.workerProfile.update({
        where: { id: order.workerId! },
        data: {
          avgRating: newRating,
        },
      })
    );

    return {
      success: true,
      message: "Technician rating submitted successfully.",
      data: {
        orderId,
        workerId: order.workerId,
        rating,
        comment: comment || null,
        workerNewAvgRating: newRating,
      },
    };
  }
}
