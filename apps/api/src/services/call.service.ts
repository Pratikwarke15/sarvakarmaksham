import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { OrderStatus, CallStatus } from "@prisma/client";
import { broadcastToUser, broadcastToOrder } from "../lib/websocket";

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
        (err.name === "PrismaClientKnownRequestError" &&
          (err.code === "P1001" || err.code === "P1017" || err.code === "P2028")) ||
        err.message?.includes("Can't reach database") ||
        err.message?.includes("connection pool") ||
        err.message?.includes("closed the connection") ||
        err.message?.includes("Server has closed") ||
        err.message?.includes("Connection");
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

const AUTHORIZED_CALL_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.NEGOTIATION,
  OrderStatus.CONFIRMED,
  OrderStatus.TRAVELLING,
  OrderStatus.ARRIVED,
  OrderStatus.IN_PROGRESS,
];

export class CallService {
  /**
   * Retrieve communication consent and counterpart calling authorization
   */
  static async getCommunicationConsent(orderId: string, userId: string) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          consumer: { select: { id: true, name: true, avatarUrl: true } },
          worker: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const isConsumer = order.consumerId === userId;
    const isWorker = order.worker?.userId === userId;

    if (!isConsumer && !isWorker) {
      throw new AppError("You are not an authorized party for this order.", 403);
    }

    const callerRole: "CONSUMER" | "WORKER" = isConsumer ? "CONSUMER" : "WORKER";
    const isAuthorizedStatus = AUTHORIZED_CALL_STATUSES.includes(order.status);

    // Counterpart details without exposing phone number or private credentials
    const counterpart = isConsumer
      ? {
          id: order.worker?.userId || "",
          name: order.worker?.user?.name || "Technician",
          avatarUrl: order.worker?.user?.avatarUrl || null,
          role: "WORKER" as const,
          trade: order.worker?.skillTags?.[0] || order.problemTitle || "Artisan",
        }
      : {
          id: order.consumer.id,
          name: order.consumer.name,
          avatarUrl: order.consumer.avatarUrl || null,
          role: "CONSUMER" as const,
          trade: "Resident",
        };

    const canCall = Boolean(order.communicationConsent && isAuthorizedStatus);

    return {
      orderId: order.id,
      orderRef: order.orderRef,
      orderStatus: order.status,
      callerRole,
      communicationConsent: order.communicationConsent,
      consumerConsentGranted: order.consumerConsentGranted,
      workerConsentGranted: order.workerConsentGranted,
      communicationConsentAt: order.communicationConsentAt,
      isAuthorizedStatus,
      canCall,
      counterpart,
    };
  }

  /**
   * Request or grant communication consent for an order
   */
  static async requestConsent(orderId: string, userId: string) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          consumer: { select: { id: true, name: true, avatarUrl: true } },
          worker: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const isConsumer = order.consumerId === userId;
    const isWorker = order.worker?.userId === userId;

    if (!isConsumer && !isWorker) {
      throw new AppError("You are not an authorized party for this order.", 403);
    }

    if (!AUTHORIZED_CALL_STATUSES.includes(order.status)) {
      throw new AppError(
        "Communication consent can only be established after order is accepted and active.",
        400
      );
    }

    const newConsumerGranted = isConsumer ? true : order.consumerConsentGranted;
    const newWorkerGranted = isWorker ? true : order.workerConsentGranted;
    const isNowConsented = newConsumerGranted && newWorkerGranted;

    const updated = await withDbRetry(() =>
      prisma.order.update({
        where: { id: orderId },
        data: {
          consumerConsentGranted: newConsumerGranted,
          workerConsentGranted: newWorkerGranted,
          communicationConsent: isNowConsented,
          communicationConsentAt: isNowConsented
            ? order.communicationConsentAt || new Date()
            : order.communicationConsentAt,
        },
      })
    );

    const consentData = {
      orderId: order.id,
      orderRef: order.orderRef,
      communicationConsent: updated.communicationConsent,
      consumerConsentGranted: updated.consumerConsentGranted,
      workerConsentGranted: updated.workerConsentGranted,
      communicationConsentAt: updated.communicationConsentAt,
      canCall: updated.communicationConsent && AUTHORIZED_CALL_STATUSES.includes(updated.status),
      requestedByUserId: userId,
      requestedByRole: isConsumer ? "CONSUMER" : "WORKER",
      message: isNowConsented
        ? "Both parties consented to communication. In-PWA voice calling is now active."
        : isConsumer
        ? "Consumer consented to communication. Awaiting technician consent."
        : "Technician consented to communication. Awaiting consumer consent.",
    };

    // Broadcast realtime event to both parties
    broadcastToOrder(orderId, "order:communication_consent_updated", consentData);
    if (order.consumerId) broadcastToUser(order.consumerId, "order:communication_consent_updated", consentData);
    if (order.worker?.userId) broadcastToUser(order.worker.userId, "order:communication_consent_updated", consentData);

    const counterpartUserId = isConsumer ? order.worker?.userId : order.consumerId;
    const requesterName = isConsumer ? order.consumer.name : (order.worker?.user?.name || "Service Partner");

    if (isNowConsented) {
      if (order.consumerId) {
        broadcastToUser(order.consumerId, "order:consent_granted", {
          ...consentData,
          granterName: requesterName,
          title: "Call Permission Active",
          message: "You can now make voice calls with your technician.",
        });
      }
      if (order.worker?.userId) {
        broadcastToUser(order.worker.userId, "order:consent_granted", {
          ...consentData,
          granterName: requesterName,
          title: "Call Permission Active",
          message: "You can now make voice calls with the customer.",
        });
      }
    } else if (counterpartUserId) {
      broadcastToUser(counterpartUserId, "order:consent_request_received", {
        ...consentData,
        requesterName,
        title: isConsumer ? "Resident requested call permission" : "Technician requested call permission",
        message: `${requesterName} is requesting call consent for Order ${order.orderRef}. Please grant consent to talk.`,
      });

      await prisma.notification.create({
        data: {
          userId: counterpartUserId,
          title: isConsumer ? "Resident requested call permission" : "Technician requested call permission",
          message: `${requesterName} has granted call permission for Order ${order.orderRef}. Please grant consent to enable in-app voice calling.`,
          type: "ORDER",
          data: { orderId: order.id, type: "CALL_CONSENT" },
        },
      }).catch(() => {});
    }

    return consentData;
  }

  /**
   * Revoke communication consent
   */
  static async revokeConsent(orderId: string, userId: string) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          consumer: { select: { id: true } },
          worker: { select: { userId: true } },
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const isConsumer = order.consumerId === userId;
    const isWorker = order.worker?.userId === userId;

    if (!isConsumer && !isWorker) {
      throw new AppError("You are not an authorized party for this order.", 403);
    }

    await withDbRetry(() =>
      prisma.order.update({
        where: { id: orderId },
        data: {
          communicationConsent: false,
          consumerConsentGranted: false,
          workerConsentGranted: false,
          communicationConsentAt: null,
        },
      })
    );

    const consentData = {
      orderId: order.id,
      communicationConsent: false,
      consumerConsentGranted: false,
      workerConsentGranted: false,
      canCall: false,
      revokedByUserId: userId,
      message: "Communication consent was revoked.",
    };

    broadcastToOrder(orderId, "order:communication_consent_updated", consentData);
    if (order.consumerId) broadcastToUser(order.consumerId, "order:communication_consent_updated", consentData);
    if (order.worker?.userId) broadcastToUser(order.worker.userId, "order:communication_consent_updated", consentData);

    return consentData;
  }

  /**
   * Create Call Session (audit record for peer-to-peer call; NO audio recorded)
   */
  static async createCallSession(
    orderId: string,
    callerId: string,
    receiverId: string,
    callerRole: "CONSUMER" | "WORKER"
  ) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (!order.communicationConsent) {
      throw new AppError("Communication consent has not been granted by both parties.", 403);
    }

    if (!AUTHORIZED_CALL_STATUSES.includes(order.status)) {
      throw new AppError("Calling is only available for active orders.", 400);
    }

    const session = await withDbRetry(() =>
      prisma.callSession.create({
        data: {
          orderId,
          callerId,
          receiverId,
          callerRole,
          status: CallStatus.RINGING,
        },
      })
    );

    return session;
  }

  /**
   * Update Call Session state (CONNECTED, ENDED, REJECTED, MISSED)
   */
  static async updateCallSession(
    callId: string,
    data: {
      status?: CallStatus;
      durationSec?: number;
      endReason?: string;
    }
  ) {
    const existing = await withDbRetry(() =>
      prisma.callSession.findUnique({ where: { id: callId } })
    );

    if (!existing) {
      throw new AppError("Call session not found.", 404);
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.status === CallStatus.CONNECTED && !existing.startedAt) {
      updateData.startedAt = new Date();
    }
    if (
      [CallStatus.ENDED, CallStatus.REJECTED, CallStatus.MISSED, CallStatus.FAILED].includes(
        data.status as any
      )
    ) {
      updateData.endedAt = new Date();
      if (data.durationSec !== undefined) {
        updateData.durationSec = Math.max(0, Math.floor(data.durationSec));
      } else if (existing.startedAt) {
        updateData.durationSec = Math.max(
          0,
          Math.floor((Date.now() - existing.startedAt.getTime()) / 1000)
        );
      }
    }
    if (data.endReason) updateData.endReason = data.endReason;

    const updated = await withDbRetry(() =>
      prisma.callSession.update({
        where: { id: callId },
        data: updateData,
      })
    );

    return updated;
  }

  /**
   * Get call history for an order (metadata only; NO audio)
   */
  static async getOrderCalls(orderId: string, userId: string) {
    const order = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          worker: { select: { userId: true } },
        },
      })
    );

    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    if (order.consumerId !== userId && order.worker?.userId !== userId) {
      throw new AppError("You are not an authorized party for this order.", 403);
    }

    const calls = await withDbRetry(() =>
      prisma.callSession.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    );

    return calls;
  }
}
