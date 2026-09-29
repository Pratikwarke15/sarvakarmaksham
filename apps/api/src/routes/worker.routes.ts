import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { registerWorkerSchema, updateWorkerLocationSchema, updateAvailabilitySchema } from "../schemas/worker.schemas";
import * as workerService from "../services/worker.service";
import prisma from "../lib/prisma";

const router = Router();

router.post("/register", authenticate, authorize("WORKER"), validate(registerWorkerSchema), asyncHandler(async (req, res) => {
  const profile = await workerService.registerWorker(req.user!.id, req.body);
  res.status(201).json({ success: true, message: "Worker registered", data: profile });
}));

router.patch("/location", authenticate, authorize("WORKER"), validate(updateWorkerLocationSchema), asyncHandler(async (req, res) => {
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const profile = await workerService.updateLocation(wp.id, req.body.latitude, req.body.longitude);
  res.json({ success: true, message: "Location updated", data: profile });
}));

router.patch("/availability", authenticate, authorize("WORKER"), validate(updateAvailabilitySchema), asyncHandler(async (req, res) => {
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const profile = await workerService.setAvailability(wp.id, req.body);
  res.json({ success: true, message: "Availability updated", data: profile });
}));

router.get("/profile", authenticate, authorize("WORKER"), asyncHandler(async (req, res) => {
  let wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) {
    wp = await prisma.workerProfile.create({
      data: {
        userId: req.user!.id,
        phoneVerified: true,
      },
    });
  }
  const profile = await workerService.getWorkerProfile(wp.id);
  res.json({ success: true, data: profile });
}));

router.get("/earnings", authenticate, authorize("WORKER"), asyncHandler(async (req, res) => {
  const wp = await prisma.workerProfile.findUnique({ where: { userId: req.user!.id } });
  if (!wp) { res.status(404).json({ success: false, error: "Worker profile not found" }); return; }
  const earnings = await workerService.getWorkerEarnings(wp.id);
  res.json({ success: true, data: earnings });
}));

router.get("/search", asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string) || 10;
  const skills = req.query.skills ? (req.query.skills as string).split(",").map(s => s.trim()) : undefined;
  const coopId = req.query.coopId as string | undefined;
  if (isNaN(lat) || isNaN(lng)) { res.status(400).json({ success: false, error: "lat and lng required" }); return; }
  const workers = await workerService.searchWorkers(lat, lng, radius, skills, coopId);
  res.json({ success: true, data: workers });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const profile = await workerService.getWorkerProfile(req.params.id);
  res.json({ success: true, data: profile });
}));

export default router;
