import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { RoutingService } from "../services/routing.service";

const router = Router();

/**
 * POST /routes/navigate
 * Calculate route between any origin and destination coordinates
 */
router.post(
  "/navigate",
  asyncHandler(async (req, res) => {
    const { originLat, originLng, destLat, destLng } = req.body;

    if (originLat == null || originLng == null || destLat == null || destLng == null) {
      res.status(400).json({
        success: false,
        error: "originLat, originLng, destLat, and destLng are all required",
      });
      return;
    }

    const route = await RoutingService.calculateRoute(
      { lat: Number(originLat), lng: Number(originLng) },
      { lat: Number(destLat), lng: Number(destLng) }
    );

    res.json({
      success: true,
      data: route,
    });
  })
);

export default router;
