import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma, UserRole } from "@prisma/client";
import prisma from "../lib/prisma";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";
import { getRedis } from "../lib/redis";
import { logger } from "../lib/logger";
import { sendOTPSms } from "./sms.service";

function generateJwtToken(user: { id: string; phone: string; role: UserRole }): string {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

export async function generateOTP(
  phone: string,
  purpose: string = "LOGIN"
): Promise<{ otp: string; expiresAt: Date }> {
  // Invalidate any previous unverified OTP for this phone and purpose immediately
  await prisma.otpVerification.updateMany({
    where: {
      phone,
      purpose,
      verified: false,
    },
    data: {
      verified: true,
      expiresAt: new Date(0),
    },
  });

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      phone,
      otp,
      purpose,
      expiresAt,
      verified: false,
    },
  });

  const sent = await sendOTPSms(phone, otp);
  if (!sent) {
    logger.warn(`Failed to send OTP to ${phone}, but record created`);
  }

  return { otp, expiresAt };
}

export async function verifyOTP(
  phone: string,
  otp: string,
  purpose: string = "LOGIN"
): Promise<{ verified: boolean; token?: string; user?: any }> {
  const cleanOtp = otp.trim();

  // Query only the latest active, unverified, and non-expired OTP record
  const record = await prisma.otpVerification.findFirst({
    where: {
      phone,
      purpose,
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  if (record.otp !== cleanOtp) {
    throw new AppError("Incorrect OTP", 400);
  }

  // Consume OTP so it cannot be used again
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  if (purpose === "LOGIN") {
    const existingUser = await prisma.user.findUnique({ where: { phone } });

    if (existingUser) {
      const token = generateJwtToken(existingUser);
      return {
        verified: true,
        token,
        user: {
          id: existingUser.id,
          phone: existingUser.phone,
          name: existingUser.name,
          role: existingUser.role,
        },
      };
    }
  }

  return { verified: true };
}

export async function register(data: {
  phone: string;
  name: string;
  email?: string;
  password: string;
  role: "CONSUMER" | "WORKER";
}): Promise<{ token: string; user: any }> {
  const existingUser = await prisma.user.findUnique({
    where: { phone: data.phone },
  });

  if (existingUser) {
    throw new AppError("Phone number already registered", 409);
  }

  const email = data.email && data.email.trim() ? data.email.trim() : undefined;

  if (email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new AppError("Email already registered", 409);
    }
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      phone: data.phone,
      name: data.name,
      email: email,
      passwordHash,
      role: data.role as UserRole,
    },
  });

  if (data.role === "CONSUMER") {
    await prisma.consumerProfile.create({
      data: { userId: user.id },
    });
  }

  const token = generateJwtToken(user);

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function login(
  phone: string,
  password: string
): Promise<{ token: string; user: any }> {
  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    throw new AppError("Invalid phone or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated", 403);
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError("Invalid phone or password", 401);
  }

  const token = generateJwtToken(user);

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshToken(
  token: string
): Promise<{ token: string; user: any }> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      phone: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    if (!user.isActive) {
      throw new AppError("Account is deactivated", 403);
    }

    const newToken = generateJwtToken(user);

    return {
      token: newToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid token", 401);
  }
}

export async function getProfile(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      consumerProfile: true,
      workerProfile: true,
      coopAdminProfile: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    isActive: user.isActive,
    createdAt: user.createdAt,
    consumerProfile: user.consumerProfile,
    workerProfile: user.workerProfile
      ? {
          ...user.workerProfile,
          totalEarnings: Number(user.workerProfile.totalEarnings),
          walletBalance: Number(user.workerProfile.walletBalance),
        }
      : null,
    coopAdminProfile: user.coopAdminProfile,
  };
}

export async function blacklistToken(token: string, expiresIn: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = `blacklist:${token}`;
  await redis.set(key, "1", "EX", expiresIn);
  logger.info(`Token blacklisted with TTL ${expiresIn}s`);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `blacklist:${token}`;
  const result = await redis.get(key);
  return result === "1";
}

export async function validateCredentials(
  identifier: string,
  password: string
): Promise<{ phone: string; otp?: string; expiresAt: Date }> {
  const trimmed = identifier.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: trimmed },
        { email: trimmed.toLowerCase() },
      ],
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated", 403);
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError("Invalid credentials", 401);
  }

  // Generate 6-digit OTP for user's registered phone
  const otpResult = await generateOTP(user.phone);

  return {
    phone: user.phone,
    expiresAt: otpResult.expiresAt,
    otp: otpResult.otp,
  };
}

export async function generateEmailOTP(
  email: string,
  purpose: string = "EMAIL_VERIFY"
): Promise<{ otp: string; expiresAt: Date }> {
  const cleanEmail = email.trim().toLowerCase();

  // Invalidate any previous unverified OTP for this email and purpose
  await prisma.otpVerification.updateMany({
    where: {
      email: cleanEmail,
      purpose,
      verified: false,
    },
    data: {
      verified: true,
      expiresAt: new Date(0),
    },
  });

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      email: cleanEmail,
      otp,
      purpose,
      expiresAt,
      verified: false,
    },
  });

  return {
    otp,
    expiresAt,
  };
}

export async function verifyEmailOTP(
  email: string,
  otp: string,
  purpose: string = "EMAIL_VERIFY"
): Promise<{ verified: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  const record = await prisma.otpVerification.findFirst({
    where: {
      email: cleanEmail,
      purpose,
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("Invalid or expired email OTP", 400);
  }

  if (record.otp !== cleanOtp) {
    throw new AppError("Incorrect email OTP", 400);
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { verified: true };
}

export async function initiateForgotPassword(identifier: string): Promise<{
  expiresAt: Date;
  otp: string;
  channel: "SMS" | "EMAIL";
  maskedDestination: string;
}> {
  const clean = identifier.trim();
  const isEmail = clean.includes("@");

  let targetPhone = "";
  let targetEmail = "";

  if (isEmail) {
    targetEmail = clean.toLowerCase();
    const res = await generateEmailOTP(targetEmail, "FORGOT_PASSWORD");
    const masked = targetEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");
    return {
      expiresAt: res.expiresAt,
      otp: res.otp,
      channel: "EMAIL",
      maskedDestination: masked,
    };
  } else {
    targetPhone = clean.replace(/\D/g, "");
    if (!targetPhone || targetPhone.length < 10) {
      throw new AppError("Please provide a valid 10-digit mobile number or email address", 400);
    }
    const res = await generateOTP(targetPhone, "FORGOT_PASSWORD");
    const masked = targetPhone.length >= 4 ? `XXXXXX${targetPhone.slice(-4)}` : targetPhone;
    return {
      expiresAt: res.expiresAt,
      otp: res.otp,
      channel: "SMS",
      maskedDestination: masked,
    };
  }
}

export async function verifyForgotPasswordOTP(
  identifier: string,
  otp: string
): Promise<{ resetToken: string }> {
  const clean = identifier.trim();
  const isEmail = clean.includes("@");

  let targetPhone = "";
  let targetEmail = "";
  let user: any = null;

  if (isEmail) {
    targetEmail = clean.toLowerCase();
    await verifyEmailOTP(targetEmail, otp, "FORGOT_PASSWORD");
    user = await prisma.user.findUnique({ where: { email: targetEmail } });
  } else {
    targetPhone = clean.replace(/\D/g, "");
    await verifyOTP(targetPhone, otp, "FORGOT_PASSWORD");
    user = await prisma.user.findUnique({ where: { phone: targetPhone } });
  }

  if (!user) {
    throw new AppError("No account associated with this contact information", 404);
  }

  // Issue 15-minute secure JWT reset token
  const resetToken = jwt.sign(
    { userId: user.id, purpose: "PASSWORD_RESET" },
    env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  return { resetToken };
}

export async function resetPasswordWithToken(
  resetToken: string,
  newPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters long", 400);
  }

  let payload: any;
  try {
    payload = jwt.verify(resetToken, env.JWT_SECRET);
  } catch {
    throw new AppError("Password reset session has expired. Please request a new OTP.", 400);
  }

  if (payload.purpose !== "PASSWORD_RESET" || !payload.userId) {
    throw new AppError("Invalid password reset token", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: payload.userId },
    data: { passwordHash },
  });
}

export async function checkAvailability(data: {
  phone?: string;
  email?: string;
}): Promise<{ phoneAvailable: boolean; emailAvailable: boolean }> {
  let phoneAvailable = true;
  let emailAvailable = true;

  if (data.phone) {
    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) phoneAvailable = false;
  }

  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() },
    });
    if (existing) emailAvailable = false;
  }

  return { phoneAvailable, emailAvailable };
}

export default {
  generateOTP,
  verifyOTP,
  register,
  login,
  refreshToken,
  getProfile,
  blacklistToken,
  isTokenBlacklisted,
  validateCredentials,
  generateEmailOTP,
  verifyEmailOTP,
  initiateForgotPassword,
  verifyForgotPasswordOTP,
  resetPasswordWithToken,
  checkAvailability,
};

