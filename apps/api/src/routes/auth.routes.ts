import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { sendOtpSchema, verifyOtpSchema, registerSchema, loginSchema } from "../schemas/auth.schemas";
import * as authService from "../services/auth.service";
import { env } from "../config/env";

const router = Router();

router.post("/send-otp", validate(sendOtpSchema), asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await authService.generateOTP(phone);
  res.json({
    success: true,
    message: "OTP sent successfully",
    data: {
      expiresAt: result.expiresAt,
      ...(env.NODE_ENV !== "production" ? { otp: result.otp } : {}),
    },
  });
}));

router.post("/verify-otp", validate(verifyOtpSchema), asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await authService.verifyOTP(phone, otp);
  if (result.token) {
    res.json({ success: true, message: "OTP verified and logged in", data: { token: result.token, user: result.user } });
  } else {
    res.json({ success: true, message: "OTP verified. Please complete registration.", data: { verified: true } });
  }
}));

router.post("/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, message: "User registered successfully", data: result });
}));

router.post(["/login-step1", "/login-init"], asyncHandler(async (req, res) => {
  const { identifier, phone, password } = req.body;
  const userIdentifier = identifier || phone;
  if (!userIdentifier || !password) {
    res.status(400).json({ success: false, error: "Identifier and password are required" });
    return;
  }
  const result = await authService.validateCredentials(userIdentifier, password);
  res.json({
    success: true,
    message: "Credentials valid. Demo OTP generated.",
    data: {
      requiresOtp: true,
      phone: result.phone,
      expiresAt: result.expiresAt,
      ...(result.otp ? { otp: result.otp } : {}),
    },
  });
}));

router.post("/send-email-otp", asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    res.status(400).json({ success: false, error: "Valid email is required" });
    return;
  }
  const result = await authService.generateEmailOTP(email);
  res.json({
    success: true,
    message: "Email OTP generated",
    data: {
      expiresAt: result.expiresAt,
      ...(result.otp ? { otp: result.otp } : {}),
    },
  });
}));

router.post("/verify-email-otp", asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ success: false, error: "Email and OTP are required" });
    return;
  }
  const result = await authService.verifyEmailOTP(email, otp);
  res.json({
    success: true,
    message: "Email verified successfully",
    data: result,
  });
}));

router.post("/check-availability", asyncHandler(async (req, res) => {
  const { phone, email } = req.body;
  const result = await authService.checkAvailability({ phone, email });
  res.json({ success: true, data: result });
}));

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const result = await authService.login(phone, password);
  res.json({ success: true, message: "Login successful", data: result });
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, error: "Token is required" });
    return;
  }
  const result = await authService.refreshToken(token);
  res.json({ success: true, message: "Token refreshed", data: result });
}));

router.get("/me", authenticate, asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user!.id);
  res.json({ success: true, data: user });
}));

export default router;
