import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { TrackingService } from "../services/tracking.service";
import { RoutingService } from "../services/routing.service";

const router = Router({ mergeParams: true });

/**
 * GET /orders/:id/live-tracking
 * Retrieve comprehensive live location snapshot, route, ETA, and privacy-governed coordinates
 */
router.get(
  "/live-tracking",
  authenticate,
  asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const role = req.user!.role;

    const snapshot = await TrackingService.getTrackingSnapshot(orderId, userId, role);
    res.json({
      success: true,
      data: snapshot,
    });
  })
);

/**
 * POST /orders/:id/location
 * Worker pushes latest GPS location update (REST fallback or background poll)
 */
router.post(
  "/location",
  authenticate,
  asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const { latitude, longitude, heading, speed, accuracy, timestamp } = req.body;

    if (latitude == null || longitude == null) {
      res.status(400).json({
        success: false,
        error: "Latitude and longitude coordinates are strictly required",
      });
      return;
    }

    const result = await TrackingService.updateWorkerLocation({
      orderId,
      workerUserId: userId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: heading != null ? Number(heading) : undefined,
      speed: speed != null ? Number(speed) : undefined,
      accuracy: accuracy != null ? Number(accuracy) : undefined,
      timestamp: timestamp != null ? Number(timestamp) : Date.now(),
    });

    res.json({
      success: true,
      message: "Worker location updated successfully",
      data: result.broadcastPayload,
    });
  })
);

/**
 * GET /orders/:id/route
 * Recalculate route polyline and ETA for an active order
 */
router.get(
  "/route",
  authenticate,
  asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const role = req.user!.role;

    const snapshot = await TrackingService.getTrackingSnapshot(orderId, userId, role);
    if (!snapshot.destination.latitude || !snapshot.destination.longitude) {
      res.status(403).json({
        success: false,
        error: "Route calculation prohibited: destination coordinates are protected before order acceptance.",
      });
      return;
    }

    const workerLat = snapshot.currentLocation?.latitude ?? 28.6139;
    const workerLng = snapshot.currentLocation?.longitude ?? 77.2090;

    const route = await RoutingService.calculateRoute(
      { lat: workerLat, lng: workerLng },
      { lat: snapshot.destination.latitude, lng: snapshot.destination.longitude }
    );

    res.json({
      success: true,
      data: route,
    });
  })
);

export default router;
