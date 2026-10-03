import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import prisma from "../lib/prisma";

const router = Router();

// GET /consumers/profile or /consumer/profile
router.get("/profile", authenticate, authorize("CONSUMER"), asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  let cp = await prisma.consumerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          role: true,
        },
      },
    },
  });

  if (!cp) {
    cp = await prisma.consumerProfile.create({
      data: {
        userId,
        phoneVerified: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
            role: true,
          },
        },
      },
    });
  }

  const [legacyTotal, orderTotal, legacyActive, orderActive] = await Promise.all([
    prisma.booking.count({ where: { consumerId: userId } }),
    prisma.order.count({ where: { consumerId: userId } }),
    prisma.booking.count({
      where: {
        consumerId: userId,
        status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"] },
      },
    }),
    prisma.order.count({
      where: {
        consumerId: userId,
        status: { in: ["REQUESTED", "ACCEPTED", "CONFIRMED", "TRAVELLING", "ARRIVED", "IN_PROGRESS", "NEGOTIATION"] },
      },
    }),
  ]);

  const totalBookings = legacyTotal + orderTotal;
  const activeBookings = legacyActive + orderActive;

  res.json({
    success: true,
    data: {
      ...cp,
      totalBookings,
      activeBookings,
    },
  });
}));

// PATCH /consumers/profile
router.patch("/profile", authenticate, authorize("CONSUMER"), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { defaultAddress, latitude, longitude, name } = req.body;

  if (name && typeof name === "string") {
    await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });
  }

  const updated = await prisma.consumerProfile.upsert({
    where: { userId },
    create: {
      userId,
      defaultAddress,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      phoneVerified: true,
    },
    update: {
      defaultAddress: defaultAddress !== undefined ? defaultAddress : undefined,
      latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
      longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          role: true,
        },
      },
    },
  });

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: updated,
  });
}));

export default router;
