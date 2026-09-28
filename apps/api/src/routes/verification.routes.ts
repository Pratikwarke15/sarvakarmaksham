import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
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

// Aadhaar OTP send endpoint (server-generated 6-digit OTP with variable resend)
router.post(
  "/aadhaar-otp/send",
  asyncHandler(async (req, res) => {
    const { aadhaarNumber, mobile } = req.body;
    if (!aadhaarNumber) {
      res.status(400).json({ success: false, error: "Aadhaar number is required" });
      return;
    }
    const result = await verificationService.sendAadhaarOtp(aadhaarNumber, mobile);
    res.json({
      success: true,
      message: "Aadhaar OTP generated successfully",
      data: result,
    });
  })
);

// Aadhaar OTP verification against active server record
router.post(
  "/aadhaar-otp",
  asyncHandler(async (req, res) => {
    const { aadhaarNumber, otp, mobile } = req.body;
    if (!aadhaarNumber || !otp) {
      res.status(400).json({ success: false, error: "Aadhaar number and OTP are required" });
      return;
    }
    const result = await verificationService.verifyAadhaarOtp(
      aadhaarNumber,
      otp,
      mobile
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
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber) {
      res.status(400).json({ success: false, error: "Aadhaar number is required" });
      return;
    }
    const result = await verificationService.sendDigilockerDemoOtp(req.user?.id, aadhaarNumber);
    res.json({
      success: true,
      message: "Demo Aadhaar verification OTP generated",
      data: result,
    });
  })
);

router.post(
  "/digilocker/verify-otp",
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const { aadhaarNumber, otp } = req.body;
    if (!aadhaarNumber || !otp) {
      res.status(400).json({ success: false, error: "Aadhaar number and OTP are required" });
      return;
    }
    const result = await verificationService.verifyDigilockerDemoOtp(
      req.user?.id,
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
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const result = await verificationService.authorizeDigilockerDemo(req.user?.id, req.body);
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
