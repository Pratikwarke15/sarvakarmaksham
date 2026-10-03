import { Server as SocketIOServer } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "./logger";

import { CallService } from "../services/call.service";
import { CallStatus } from "@prisma/client";
import prisma from "./prisma";

let io: SocketIOServer;
const activeCalls = new Map<string, { callId: string; targetUserId: string; orderId: string }>();

type WorkerLocationHandler = (payload: any, userId: string) => Promise<void>;
let workerLocationHandler: WorkerLocationHandler | null = null;

export function registerWorkerLocationHandler(handler: WorkerLocationHandler): void {
  workerLocationHandler = handler;
}

export function setupWebSocket(server: http.Server): void {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
    path: "/ws",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token as string, env.JWT_SECRET) as {
        id: string;
        phone: string;
        role: string;
      };
      (socket as any).userId = decoded.id;
      (socket as any).phone = decoded.phone;
      (socket as any).userRole = decoded.role;
      logger.info(`Socket.IO authenticated: user ${decoded.id}`);
      next();
    } catch {
      logger.warn("Socket.IO authentication failed — invalid token");
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    const role = (socket as any).userRole;
    logger.info(`Client connected: ${userId}`);

    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    socket.on("join:user", (uId: string) => {
      socket.join(`user:${uId}`);
    });

    socket.on("join:worker", (workerId: string) => {
      socket.join(`worker:${workerId}`);
      logger.debug(`Socket joined worker room: ${workerId}`);
    });

    socket.on("join:booking", (bookingId: string) => {
      socket.join(`booking:${bookingId}`);
      logger.debug(`Socket joined booking room: ${bookingId}`);
    });

    socket.on("join:coop", (coopId: string) => {
      socket.join(`coop:${coopId}`);
      logger.debug(`Socket joined coop room: ${coopId}`);
    });

    socket.on("join:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
      socket.join(`booking:${orderId}`);
      logger.debug(`Socket ${userId} joined order room: ${orderId}`);
    });

    socket.on("leave:order", (orderId: string) => {
      socket.leave(`order:${orderId}`);
      socket.leave(`booking:${orderId}`);
      logger.debug(`Socket ${userId} left order room: ${orderId}`);
    });

    socket.on("worker:location", async (payload: any) => {
      try {
        if (workerLocationHandler) {
          await workerLocationHandler(payload, userId);
        }
      } catch (err: any) {
        logger.warn(`worker:location handler error: ${err.message}`);
      }
    });

    socket.on("leave:worker", (workerId: string) => {
      socket.leave(`worker:${workerId}`);
    });

    socket.on("leave:booking", (bookingId: string) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on("leave:coop", (coopId: string) => {
      socket.leave(`coop:${coopId}`);
    });

    // Track active call for disconnect cleanup
    socket.on("call:initiate", async (data: {
      orderId: string;
      targetUserId?: string;
      sdp: any;
      callerName?: string;
      callerPhoto?: string;
      callerRole?: "CONSUMER" | "WORKER";
    }) => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: data.orderId },
          include: {
            consumer: { select: { id: true, name: true, avatarUrl: true } },
            worker: { select: { id: true, userId: true, user: { select: { id: true, name: true, avatarUrl: true } } } },
          },
        });

        if (!order) {
          throw new Error("Order not found");
        }

        const isConsumerCaller = order.consumerId === userId;
        const isWorkerCaller = order.worker?.userId === userId;

        if (!isConsumerCaller && !isWorkerCaller) {
          throw new Error("Unauthorized caller for this order");
        }

        const recipientUserId = isConsumerCaller
          ? (order.worker?.userId || data.targetUserId)
          : order.consumerId;

        if (!recipientUserId) {
          throw new Error("Recipient partner not assigned or not found");
        }

        const callerRole = isConsumerCaller ? "CONSUMER" : "WORKER";
        const callerName = data.callerName || (isConsumerCaller ? order.consumer.name : (order.worker?.user?.name || "Service Partner"));
        const callerPhoto = data.callerPhoto || (isConsumerCaller ? order.consumer.avatarUrl : (order.worker?.user?.avatarUrl || null));

        const session = await CallService.createCallSession(
          data.orderId,
          userId,
          recipientUserId,
          callerRole
        );

        activeCalls.set(socket.id, {
          callId: session.id,
          targetUserId: recipientUserId,
          orderId: data.orderId,
        });

        socket.emit("call:ringing", { callId: session.id, orderId: data.orderId });

        const incomingData = {
          callId: session.id,
          orderId: data.orderId,
          callerId: userId,
          callerName,
          callerPhoto,
          callerRole,
          sdp: data.sdp,
        };

        io.to(`user:${recipientUserId}`).emit("call:incoming", incomingData);
        if (order.workerId) {
          io.to(`worker:${order.workerId}`).emit("call:incoming", incomingData);
        }
        socket.to(`order:${data.orderId}`).emit("call:incoming", incomingData);
        logger.info(`WebRTC call initiated: ${session.id} from ${userId} (${callerRole}) to ${recipientUserId}`);
      } catch (err: any) {
        logger.warn(`call:initiate error: ${err.message}`);
        socket.emit("call:failed", { message: err.message || "Failed to initiate call." });
      }
    });

    socket.on("call:answer", async (data: {
      callId: string;
      orderId: string;
      targetUserId: string;
      sdp: any;
    }) => {
      try {
        await CallService.updateCallSession(data.callId, {
          status: CallStatus.CONNECTED,
        });

        activeCalls.set(socket.id, {
          callId: data.callId,
          targetUserId: data.targetUserId,
          orderId: data.orderId,
        });

        const answerPayload = {
          callId: data.callId,
          sdp: data.sdp,
          responderId: userId,
        };

        io.to(`user:${data.targetUserId}`).emit("call:answered", answerPayload);
        if (data.orderId) {
          socket.to(`order:${data.orderId}`).emit("call:answered", answerPayload);
        }
        logger.info(`WebRTC call answered: ${data.callId} by ${userId}`);
      } catch (err: any) {
        logger.warn(`call:answer error: ${err.message}`);
      }
    });

    socket.on("call:ice_candidate", (data: {
      callId: string;
      orderId?: string;
      targetUserId: string;
      candidate: any;
    }) => {
      if (data.targetUserId && data.candidate) {
        const icePayload = {
          callId: data.callId,
          candidate: data.candidate,
          senderId: userId,
        };
        io.to(`user:${data.targetUserId}`).emit("call:ice_candidate", icePayload);
        if (data.orderId) {
          socket.to(`order:${data.orderId}`).emit("call:ice_candidate", icePayload);
        }
      }
    });

    socket.on("call:reject", async (data: {
      callId: string;
      targetUserId: string;
      orderId?: string;
      reason?: string;
    }) => {
      try {
        activeCalls.delete(socket.id);
        await CallService.updateCallSession(data.callId, {
          status: CallStatus.REJECTED,
          endReason: data.reason || "declined",
        });

        const rejectPayload = {
          callId: data.callId,
          reason: data.reason || "Call declined by recipient.",
        };

        io.to(`user:${data.targetUserId}`).emit("call:rejected", rejectPayload);
        if (data.orderId) {
          socket.to(`order:${data.orderId}`).emit("call:rejected", rejectPayload);
        }
        logger.info(`WebRTC call rejected: ${data.callId}`);
      } catch (err: any) {
        logger.warn(`call:reject error: ${err.message}`);
      }
    });

    socket.on("call:end", async (data: {
      callId: string;
      targetUserId?: string;
      orderId?: string;
      durationSec?: number;
      reason?: string;
    }) => {
      try {
        activeCalls.delete(socket.id);
        await CallService.updateCallSession(data.callId, {
          status: CallStatus.ENDED,
          durationSec: data.durationSec,
          endReason: data.reason || "completed",
        });

        const endPayload = {
          callId: data.callId,
          durationSec: data.durationSec || 0,
          reason: data.reason || "Call ended.",
        };

        if (data.targetUserId) {
          io.to(`user:${data.targetUserId}`).emit("call:ended", endPayload);
        }
        if (data.orderId) {
          socket.to(`order:${data.orderId}`).emit("call:ended", endPayload);
        }
        logger.info(`WebRTC call ended: ${data.callId}`);
      } catch (err: any) {
        logger.warn(`call:end error: ${err.message}`);
      }
    });

    socket.on("disconnect", async () => {
      logger.info(`Client disconnected: ${userId}`);
      const ongoing = activeCalls.get(socket.id);
      if (ongoing) {
        activeCalls.delete(socket.id);
        try {
          await CallService.updateCallSession(ongoing.callId, {
            status: CallStatus.ENDED,
            endReason: "peer_disconnected",
          });
          io.to(`user:${ongoing.targetUserId}`).emit("call:ended", {
            callId: ongoing.callId,
            reason: "Other party disconnected or refreshed.",
          });
        } catch (err: any) {
          logger.warn(`Disconnect cleanup error: ${err.message}`);
        }
      }
    });
  });

  logger.info("WebSocket (Socket.IO) initialized on /ws");
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function broadcastToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function broadcastToWorker(workerId: string, data: unknown): void {
  io?.to(`worker:${workerId}`).emit("worker_update", data);
  io?.to(`worker:${workerId}`).emit("order:incoming", data);
}

export function broadcastToBooking(bookingId: string, data: unknown): void {
  io?.to(`booking:${bookingId}`).emit("booking_update", data);
}

export function broadcastToOrder(orderId: string, event: string, data: unknown): void {
  io?.to(`order:${orderId}`).emit(event, data);
  io?.to(`booking:${orderId}`).emit(event, data);
}

export function broadcastOrderStatus(order: any, extraData: any = {}): void {
  const payload = {
    orderId: order.id,
    orderRef: order.orderRef,
    status: order.status,
    operationalState: extraData.operationalState || order.status,
    workerName: order.worker?.user?.name,
    order,
    timestamp: new Date().toISOString(),
    ...extraData,
  };

  // 1. To Order and Booking rooms
  io?.to(`order:${order.id}`).emit("order:status_update", payload);
  io?.to(`booking:${order.id}`).emit("order:status_update", payload);

  // 2. To Consumer user room
  if (order.consumerId) {
    io?.to(`user:${order.consumerId}`).emit("order:status_update", payload);
  }

  // 3. To Worker user room and worker profile room
  if (order.worker?.userId) {
    io?.to(`user:${order.worker.userId}`).emit("order:status_update", payload);
  }
  if (order.workerId) {
    io?.to(`worker:${order.workerId}`).emit("order:status_update", payload);
  }

  // 4. Global broadcast for any dashboards tracking orders
  io?.emit("orders:update", payload);
}

export function broadcastToCoop(coopId: string, data: unknown): void {
  io?.to(`coop:${coopId}`).emit("coop_update", data);
}

export function broadcastToAll(type: string, data: unknown): void {
  io?.emit(type, data);
}

export default setupWebSocket;
