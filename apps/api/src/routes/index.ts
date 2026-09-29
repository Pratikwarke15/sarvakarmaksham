import { Router } from "express";
import authRoutes from "./auth.routes";
import bookingRoutes from "./booking.routes";
import workerRoutes from "./worker.routes";
import coopRoutes from "./coop.routes";
import paymentRoutes from "./payment.routes";
import disputeRoutes from "./dispute.routes";
import socialSecurityRoutes from "./social-security.routes";
import uploadRoutes from "./upload.routes";
import analyticsRoutes from "./analytics.routes";
import verificationRoutes from "./verification.routes";
import adminRoutes from "./admin.routes";
import consumerRoutes from "./consumer.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/bookings", bookingRoutes);
router.use("/workers", workerRoutes);
router.use("/consumers", consumerRoutes);
router.use("/consumer", consumerRoutes);
router.use("/coops", coopRoutes);
router.use("/payments", paymentRoutes);
router.use("/disputes", disputeRoutes);
router.use("/social-security", socialSecurityRoutes);
router.use("/uploads", uploadRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/verification", verificationRoutes);
router.use("/admin", adminRoutes);

export default router;
