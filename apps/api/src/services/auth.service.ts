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
  phone: string
): Promise<{ otp: string; expiresAt: Date }> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      phone,
      otp,
      purpose: "LOGIN",
      expiresAt,
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
  otp: string
): Promise<{ verified: boolean; token?: string; user?: any }> {
  const record = await prisma.otpVerification.findFirst({
    where: {
      phone,
      purpose: "LOGIN",
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  if (record.otp !== otp) {
    throw new AppError("Incorrect OTP", 400);
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

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

  const isDev = env.NODE_ENV !== "production";
  return {
    phone: user.phone,
    expiresAt: otpResult.expiresAt,
    ...(isDev ? { otp: otpResult.otp } : {}),
  };
}

export async function generateEmailOTP(
  email: string
): Promise<{ otp?: string; expiresAt: Date }> {
  const cleanEmail = email.trim().toLowerCase();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      email: cleanEmail,
      otp,
      purpose: "EMAIL_VERIFY",
      expiresAt,
    },
  });

  const isDev = env.NODE_ENV !== "production";
  return {
    expiresAt,
    ...(isDev ? { otp } : {}),
  };
}

export async function verifyEmailOTP(
  email: string,
  otp: string
): Promise<{ verified: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const record = await prisma.otpVerification.findFirst({
    where: {
      email: cleanEmail,
      purpose: "EMAIL_VERIFY",
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("Invalid or expired email OTP", 400);
  }

  if (record.otp !== otp) {
    throw new AppError("Incorrect email OTP", 400);
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { verified: true };
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
  checkAvailability,
};
