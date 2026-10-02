import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { verifyAadhaar } from "../lib/digilocker";
import { logger } from "../lib/logger";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
}

function matchesSkills(workerSkills: string[], requiredSkills?: string[]): boolean {
  if (!requiredSkills || requiredSkills.length === 0) return true;
  const workerSet = new Set(workerSkills.map(normalizeSkill));
  return requiredSkills.some((skill) => workerSet.has(normalizeSkill(skill)));
}

function workerMatchScore(worker: {
  avgRating: number;
  totalJobs: number;
  distanceKm: number;
}, radiusKm: number): number {
  const distanceScore = Math.max(0, 1 - worker.distanceKm / Math.max(radiusKm, 1)) * 60;
  const ratingScore = (Number(worker.avgRating || 0) / 5) * 25;
  const trackRecordScore = Math.min(Number(worker.totalJobs || 0) / 200, 1) * 15;
  return Math.round((distanceScore + ratingScore + trackRecordScore) * 10) / 10;
}

export async function registerWorker(
  userId: string,
  data: {
    skillTags: string[];
    bio?: string;
    experienceYears?: number;
    coopId?: string;
    latitude?: number;
    longitude?: number;
    workAddress?: string;
    kycDocumentUrl?: string;
    aadhaarNumber: string;
    aadhaarName?: string;
    digilockerRef?: string;
  }
): Promise<any> {
  const existing = await prisma.workerProfile.findUnique({ where: { userId } });
  if (existing) throw new AppError("Worker profile already exists", 409);
  let coopId = data.coopId;
  if (data.coopId) {
    const coop = await prisma.coOp.findUnique({ where: { id: data.coopId } });
    if (!coop) throw new AppError("Co-op not found", 404);
  } else if (data.latitude !== undefined && data.longitude !== undefined) {
    // Auto-assign to the nearest active co-op based on the worker's work location.
    const coops = await prisma.coOp.findMany({ where: { isActive: true } });
    let best: { id: string; d: number } | null = null;
    for (const c of coops) {
      const d = haversineDistance(data.latitude, data.longitude, Number(c.latitude), Number(c.longitude));
      if (d <= (c.radiusKm || 10) && (!best || d < best.d)) {
        best = { id: c.id, d };
      }
    }
    coopId = best?.id;
  }
  // DigiLocker verification (dummy — returns verified for any 12-digit Aadhaar)
  const digilockerResult = await verifyAadhaar(data.aadhaarNumber);
  const profile = await prisma.workerProfile.create({
    data: {
      userId,
      skillTags: data.skillTags,
      bio: data.bio,
      experienceYears: data.experienceYears || 0,
      coopId,
      latitude: data.latitude,
      longitude: data.longitude,
      workAddress: data.workAddress,
      kycDocumentUrl: data.kycDocumentUrl,
      kycStatus: data.kycDocumentUrl ? "UNDER_REVIEW" : "PENDING",
      aadhaarNumber: data.aadhaarNumber,
      aadhaarVerified: digilockerResult.verified,
      aadhaarName: digilockerResult.name || data.aadhaarName,
      aadhaarDob: digilockerResult.dob,
      digilockerRef: data.digilockerRef || `DL-${Date.now()}`,
      phoneVerified: true,
      // New workers start pending admin approval — never instantly active.
      status: "PENDING_ADMIN_APPROVAL",
    },
    include: { user: { select: { id: true, name: true, phone: true } }, coop: true },
  });
  await prisma.user.update({ where: { id: userId }, data: { role: "WORKER" } });
  return formatWorker(profile);
}

export async function updateLocation(workerId: string, lat: number, lng: number): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  const updated = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { latitude: lat, longitude: lng },
    include: { user: { select: { id: true, name: true } } },
  });
  return formatWorker(updated);
}

export async function setAvailability(workerId: string, data: { isAvailable: boolean; isOnDuty: boolean; dutyState?: any }): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  if (data.isOnDuty && profile.status !== "VERIFIED") {
    throw new AppError("Worker must be approved before going on duty", 403);
  }
  if (data.isOnDuty && !data.isAvailable) throw new AppError("Cannot be on duty if not available", 400);

  const calculatedDutyState = !data.isOnDuty
    ? "OFF_DUTY"
    : !data.isAvailable
    ? "BUSY"
    : "AVAILABLE";

  const updated = await prisma.workerProfile.update({
    where: { id: workerId },
    data: {
      isAvailable: data.isAvailable,
      isOnDuty: data.isOnDuty,
      dutyState: calculatedDutyState,
    },
    include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } },
  });
  return formatWorker(updated);
}

export async function getWorkerProfile(workerId: string): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    include: {
      user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      coop: { select: { id: true, name: true } },
      reviewsReceived: {
        include: {
          author: { select: { id: true, name: true } },
          booking: { select: { id: true, bookingRef: true } },
        },
        orderBy: { createdAt: "desc" }, take: 10,
      },
    },
  });
  if (!profile) throw new AppError("Worker profile not found", 404);

  // Check for active job in realtime from Order and Booking
  const activeOrder = await prisma.order.findFirst({
    where: {
      workerId,
      status: {
        in: [
          "REQUESTED",
          "ACCEPTED",
          "NEGOTIATION",
          "CONFIRMED",
          "TRAVELLING",
          "ARRIVED",
          "IN_PROGRESS",
        ],
      },
    },
    select: {
      id: true,
      orderRef: true,
      status: true,
      scheduledAt: true,
      problemTitle: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const activeBooking = !activeOrder ? await prisma.booking.findFirst({
    where: {
      workerId,
      status: { in: ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS"] },
    },
    select: {
      id: true,
      bookingRef: true,
      status: true,
      scheduledAt: true,
      service: { select: { name: true, categoryName: true } },
    },
  }) : null;

  let dynamicDutyState: string = "OFF_DUTY";
  if (activeOrder) {
    if (activeOrder.status === "TRAVELLING") dynamicDutyState = "TRAVELLING";
    else if (activeOrder.status === "ARRIVED") dynamicDutyState = "ARRIVED";
    else if (activeOrder.status === "IN_PROGRESS") dynamicDutyState = "WORKING";
    else if (activeOrder.status === "REQUESTED") dynamicDutyState = "REQUEST_RECEIVED";
    else dynamicDutyState = "ACCEPTED";
  } else if (activeBooking) {
    if (activeBooking.status === "IN_PROGRESS") {
      dynamicDutyState = "ON_JOB";
    } else if (activeBooking.status === "EN_ROUTE") {
      dynamicDutyState = "TRAVELLING";
    } else {
      dynamicDutyState = "BUSY";
    }
  } else if (profile.isOnDuty && profile.isAvailable) {
    dynamicDutyState = "AVAILABLE";
  } else {
    dynamicDutyState = "OFF_DUTY";
  }

  return {
    ...formatWorker(profile),
    dutyState: dynamicDutyState,
    currentJob: activeOrder || activeBooking || null,
  };
}

export async function getWorkerEarnings(workerId: string): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  const completedBookings = await prisma.booking.findMany({
    where: { workerId, status: "COMPLETED" },
    select: { id: true, bookingRef: true, finalPrice: true, workerPayout: true, completedAt: true, service: { select: { name: true, categoryName: true } } },
    orderBy: { completedAt: "desc" },
  });
  const transactions = await prisma.walletTransaction.findMany({
    where: { workerId }, orderBy: { createdAt: "desc" }, take: 50,
  });
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const monthlyEarnings = completedBookings
    .filter(b => b.completedAt && b.completedAt >= thisMonth)
    .reduce((sum, b) => sum + Number(b.workerPayout || 0), 0);
  return {
    totalEarnings: Number(profile.totalEarnings), walletBalance: Number(profile.walletBalance),
    totalJobs: profile.totalJobs, avgRating: profile.avgRating,
    monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
    recentBookings: completedBookings.slice(0, 10).map(b => ({ ...b, finalPrice: Number(b.finalPrice || 0), workerPayout: Number(b.workerPayout || 0) })),
    recentTransactions: transactions.slice(0, 20).map(t => ({ ...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter) })),
  };
}

export async function verifyWorker(workerId: string, kycData: { aadhaarNumber: string }): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  const result = await verifyAadhaar(kycData.aadhaarNumber);
  if (!result.verified) throw new AppError("Aadhaar verification failed", 400);
  const updated = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { status: "VERIFIED", kycStatus: "VERIFIED", aadhaarVerified: true, digilockerRef: `DL-${Date.now()}` },
    include: { user: { select: { id: true, name: true } } },
  });
  logger.info(`Worker ${workerId} verified via DigiLocker`);
  return formatWorker(updated);
}

// Co-op admin approval gate (separate from automated DigiLocker KYC check).
export async function approveWorker(workerId: string, coopId: string, note?: string): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  if (profile.coopId && profile.coopId !== coopId) {
    throw new AppError("Worker does not belong to this co-op", 403);
  }
  if (profile.status === "SUSPENDED" || profile.status === "DEACTIVATED") {
    throw new AppError("Cannot approve a suspended/deactivated worker", 400);
  }
  const updated = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { status: "VERIFIED", kycStatus: "VERIFIED", aadhaarVerified: true },
    include: { user: { select: { id: true, name: true } } },
  });
  logger.info(`Worker ${workerId} approved by co-op ${coopId}${note ? ` (note: ${note})` : ""}`);
  return formatWorker(updated);
}

export async function rejectWorker(workerId: string, coopId: string, reason: string): Promise<any> {
  const profile = await prisma.workerProfile.findUnique({ where: { id: workerId } });
  if (!profile) throw new AppError("Worker profile not found", 404);
  if (profile.coopId && profile.coopId !== coopId) {
    throw new AppError("Worker does not belong to this co-op", 403);
  }
  const updated = await prisma.workerProfile.update({
    where: { id: workerId },
    data: { status: "SUSPENDED", kycStatus: "REJECTED" },
    include: { user: { select: { id: true, name: true } } },
  });
  logger.info(`Worker ${workerId} rejected by co-op ${coopId}: ${reason}`);
  return formatWorker(updated);
}

export async function searchWorkers(
  lat: number, lng: number, radiusKm: number, skillTags?: string[], coopId?: string
): Promise<any[]> {
  const where: any = { status: "VERIFIED", latitude: { not: null }, longitude: { not: null }, user: { isActive: true } };
  if (coopId) where.coopId = coopId;
  const candidates = await prisma.workerProfile.findMany({
    where, include: { user: { select: { id: true, name: true, avatarUrl: true } }, coop: { select: { name: true } } }, take: 100,
  });
  return candidates
    .map(w => ({
      workerId: w.id, workerName: w.user.name, avatarUrl: w.user.avatarUrl || null, coopName: w.coop?.name || null,
      skillTags: w.skillTags, avgRating: Number(w.avgRating), totalJobs: w.totalJobs,
      bio: w.bio, experienceYears: w.experienceYears, isAvailable: w.isAvailable, isOnDuty: w.isOnDuty,
      dutyState: w.dutyState || (w.isOnDuty && w.isAvailable ? "AVAILABLE" : "OFF_DUTY"),
      distanceKm: Math.round(haversineDistance(lat, lng, w.latitude!, w.longitude!) * 100) / 100,
    }))
    .filter(w => matchesSkills(w.skillTags, skillTags))
    .filter(w => w.distanceKm <= radiusKm)
    .map((w) => ({
      ...w,
      etaMinutes: Math.max(10, Math.round(w.distanceKm * 5)),
      matchScore: workerMatchScore(w, radiusKm),
    }))
    .sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm)
    .slice(0, 100);
}

function formatWorker(worker: any): any {
  return { ...worker, totalEarnings: worker.totalEarnings ? Number(worker.totalEarnings) : undefined, walletBalance: worker.walletBalance ? Number(worker.walletBalance) : undefined };
}

export default { registerWorker, updateLocation, setAvailability, getWorkerProfile, getWorkerEarnings, verifyWorker, approveWorker, rejectWorker, searchWorkers };
