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
      otp: result.otp,
    },
  });
}));

router.post("/verify-otp", validate(verifyOtpSchema), asyncHandler(async (req, res) => {
  const { phone, otp, expectedRole, purpose } = req.body;
  const result = await authService.verifyOTP(phone, otp, purpose || "LOGIN", expectedRole);
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
  const { identifier, phone, password, expectedRole } = req.body;
  const userIdentifier = identifier || phone;
  if (!userIdentifier || !password) {
    res.status(400).json({ success: false, error: "Identifier and password are required" });
    return;
  }
  const result = await authService.validateCredentials(userIdentifier, password, expectedRole);
  res.json({
    success: true,
    message: "Credentials valid. Security verification code generated.",
    data: {
      requiresOtp: true,
      phone: result.phone,
      role: result.role,
      expiresAt: result.expiresAt,
      otp: result.otp,
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
      otp: result.otp,
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

// Forgot Password Flow — Uses the same server OTP mechanism
router.post("/forgot-password/send-otp", asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    res.status(400).json({ success: false, error: "Mobile number or email is required" });
    return;
  }
  const result = await authService.initiateForgotPassword(identifier);
  res.json({
    success: true,
    message: "Password reset verification code generated",
    data: result,
  });
}));

router.post("/forgot-password/verify-otp", asyncHandler(async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) {
    res.status(400).json({ success: false, error: "Identifier and OTP are required" });
    return;
  }
  const result = await authService.verifyForgotPasswordOTP(identifier, otp);
  res.json({
    success: true,
    message: "OTP verified successfully. You may now set a new password.",
    data: result,
  });
}));

router.post("/forgot-password/reset", asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    res.status(400).json({ success: false, error: "Reset token and new password are required" });
    return;
  }
  await authService.resetPasswordWithToken(resetToken, newPassword);
  res.json({
    success: true,
    message: "Password successfully updated. You can now log in.",
  });
}));

router.post("/check-availability", asyncHandler(async (req, res) => {
  const { phone, email } = req.body;
  const result = await authService.checkAvailability({ phone, email });
  res.json({ success: true, data: result });
}));

router.post("/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const { phone, password, expectedRole } = req.body;
  const result = await authService.login(phone, password, expectedRole);
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
