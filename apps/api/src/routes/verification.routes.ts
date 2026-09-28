import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { verifyDigilockerSchema, verifyAadhaarOtpSchema } from "../schemas/worker.schemas";
import * as verificationService from "../services/verification.service";

const router = Router();

// Dummy DigiLocker verification — returns citizen data for any valid 12-digit Aadhaar.
// Future: integrate real DigiLocker REST API with OAuth2.
router.post(
  "/digilocker",
  authenticate,
  validate(verifyDigilockerSchema),
  asyncHandler(async (req, res) => {
    const result = await verificationService.verifyDigilocker(req.body.aadhaarNumber);
    res.json({ success: true, message: "DigiLocker verified", data: result });
  })
);

// Dummy Aadhaar OTP verification — any 6-digit OTP passes.
// Future: integrate UIDAI OTP send + verify APIs.
router.post(
  "/aadhaar-otp",
  authenticate,
  validate(verifyAadhaarOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await verificationService.verifyAadhaarOtp(
      req.body.aadhaarNumber,
      req.body.otp
    );
    res.json({ success: true, message: "Aadhaar OTP verified", data: result });
  })
);

// Consumer profile verification (Aadhaar + optional document upload)
router.post(
  "/consumer",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await verificationService.verifyConsumerProfile(req.user!.id, req.body);
    res.json({ success: true, message: "Consumer profile verified", data: result });
  })
);

// DigiLocker DEMO Flow Endpoints
router.post(
  "/digilocker/send-otp",
  authenticate,
  asyncHandler(async (req, res) => {
    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber) {
      res.status(400).json({ success: false, error: "Aadhaar number is required" });
      return;
    }
    const result = await verificationService.sendDigilockerDemoOtp(req.user!.id, aadhaarNumber);
    res.json({
      success: true,
      message: "Demo Aadhaar verification OTP generated",
      data: result,
    });
  })
);

router.post(
  "/digilocker/verify-otp",
  authenticate,
  asyncHandler(async (req, res) => {
    const { aadhaarNumber, otp } = req.body;
    if (!aadhaarNumber || !otp) {
      res.status(400).json({ success: false, error: "Aadhaar number and OTP are required" });
      return;
    }
    const result = await verificationService.verifyDigilockerDemoOtp(
      req.user!.id,
      aadhaarNumber,
      otp
    );
    res.json({
      success: true,
      message: "Aadhaar demo verification successful",
      data: result,
    });
  })
);

router.post(
  "/digilocker/authorize",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await verificationService.authorizeDigilockerDemo(req.user!.id, req.body);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  })
);

// Consumer verification status check
router.get(
  "/consumer/status",
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await verificationService.getConsumerVerificationStatus(req.user!.id);
    res.json({ success: true, data: status });
  })
);

export default router;
