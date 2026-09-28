import crypto from "crypto";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { verifyAadhaar, fetchDigilockerDocument } from "../lib/digilocker";
import { logger } from "../lib/logger";

// ---------- DigiLocker verification (legacy/dummy fallback) ----------
export async function verifyDigilocker(aadhaarNumber: string): Promise<{
  verified: boolean;
  name: string;
  dob: string;
  gender: string;
  address: string;
  digilockerRef: string;
}> {
  const result = await verifyAadhaar(aadhaarNumber);
  if (!result.verified) {
    throw new AppError("DigiLocker verification failed: invalid Aadhaar number", 400);
  }
  const docResult = await fetchDigilockerDocument("AADHAAR", aadhaarNumber);
  const ref = `DL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  logger.info(`DigiLocker verification: Aadhaar ${aadhaarNumber.slice(0, 4)}**** verified, ref=${ref}`);
  return {
    verified: true,
    name: docResult.data?.name as string || result.name,
    dob: docResult.data?.dob as string || result.dob,
    gender: (docResult.data?.gender as string) || "M",
    address: (docResult.data?.address as string) || "Address on file",
    digilockerRef: ref,
  };
}

// ---------- Aadhaar OTP verification (Server OTP Engine) ----------
export async function sendAadhaarOtp(
  aadhaarNumber: string,
  mobile?: string
): Promise<{ otp: string; expiresAt: Date; maskedMobile: string }> {
  const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
  if (cleanAadhaar.length !== 12) {
    throw new AppError("Invalid Aadhaar number format. Must be 12 digits.", 400);
  }

  const phone = mobile ? mobile.replace(/\D/g, "") : "9812345601";

  // Invalidate any previous unverified Aadhaar OTPs for this phone
  await prisma.otpVerification.updateMany({
    where: {
      phone,
      purpose: "AADHAAR_OTP",
      verified: false,
    },
    data: {
      verified: true,
      expiresAt: new Date(0),
    },
  });

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      phone,
      otp,
      purpose: "AADHAAR_OTP",
      expiresAt,
      verified: false,
    },
  });

  const masked = phone.length >= 4 ? `XXXXXX${phone.slice(-4)}` : phone;
  return { otp, expiresAt, maskedMobile: masked };
}

export async function verifyAadhaarOtp(
  aadhaarNumber: string,
  otp: string,
  mobile?: string
): Promise<{
  verified: boolean;
  name: string;
  dob: string;
}> {
  const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
  if (cleanAadhaar.length !== 12) {
    throw new AppError("Invalid Aadhaar number format", 400);
  }
  const cleanOtp = otp.trim();
  if (cleanOtp.length !== 6) {
    throw new AppError("OTP must be exactly 6 digits", 400);
  }

  const phone = mobile ? mobile.replace(/\D/g, "") : "9812345601";

  const record = await prisma.otpVerification.findFirst({
    where: {
      phone,
      purpose: "AADHAAR_OTP",
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("Invalid or expired Aadhaar OTP code", 400);
  }

  if (record.otp !== cleanOtp) {
    throw new AppError("Incorrect Aadhaar OTP entered", 400);
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  const result = await verifyAadhaar(cleanAadhaar);
  logger.info(`Aadhaar OTP verified for ${cleanAadhaar.slice(0, 4)}****`);
  return {
    verified: true,
    name: result.name,
    dob: result.dob,
  };
}

// ---------- DigiLocker DEMO Multi-step Verification Engine ----------

export async function sendDigilockerDemoOtp(
  userId: string | undefined,
  aadhaarNumber: string
): Promise<{ otp: string; expiresAt: Date; maskedMobile: string }> {
  const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
  if (cleanAadhaar.length !== 12) {
    throw new AppError("Aadhaar number must be exactly 12 digits for demo verification", 400);
  }

  let phone = "9812345601";
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.phone) phone = user.phone;
  }

  // Invalidate any previous unverified DigiLocker OTP for this phone
  await prisma.otpVerification.updateMany({
    where: {
      phone,
      purpose: "DIGILOCKER_DEMO",
      verified: false,
    },
    data: {
      verified: true,
      expiresAt: new Date(0),
    },
  });

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpVerification.create({
    data: {
      phone,
      otp,
      purpose: "DIGILOCKER_DEMO",
      expiresAt,
      verified: false,
    },
  });

  const masked = phone.length >= 4 ? `XXXXXX${phone.slice(-4)}` : phone;
  logger.info(`DigiLocker Demo OTP generated for mobile: ${masked}`);

  return {
    otp,
    expiresAt,
    maskedMobile: masked,
  };
}

export async function verifyDigilockerDemoOtp(
  userId: string | undefined,
  aadhaarNumber: string,
  otp: string,
  requestedName?: string
): Promise<{
  verified: boolean;
  name: string;
  dob: string;
  gender: string;
  address: string;
  maskedAadhaar: string;
  digilockerRef: string;
  verificationSource: string;
  verificationTimestamp: string;
}> {
  const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
  if (cleanAadhaar.length !== 12) {
    throw new AppError("Invalid Aadhaar format", 400);
  }
  const cleanOtp = otp.trim();
  if (cleanOtp.length !== 6) {
    throw new AppError("OTP must be 6 digits", 400);
  }

  let phone = "9812345601";
  let userName: string | undefined;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.phone) phone = user.phone;
    if (user?.name) userName = user.name;
  }

  const record = await prisma.otpVerification.findFirst({
    where: {
      phone,
      purpose: "DIGILOCKER_DEMO",
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AppError("Invalid or expired Aadhaar OTP. Please request a new code.", 400);
  }

  if (record.otp !== cleanOtp) {
    throw new AppError("Incorrect Aadhaar OTP code entered.", 400);
  }

  // Consume OTP
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  const last4 = cleanAadhaar.slice(-4);
  const digilockerRef = `DL-DEMO-${Date.now()}-${last4}`;
  const now = new Date().toISOString();

  // Test personas mapping
  let personName = requestedName || userName || "Aadhaar Verified Citizen";
  let personDob = "1994-08-15";
  let personAddress = "Plot 12, Cooperative Housing Society, Ring Road, Sector 7, New Delhi - 110001";

  if (cleanAadhaar.endsWith("7777")) {
    personName = "Ramesh Kumar Sharma";
    personDob = "1991-05-14";
    personAddress = "H-42, Shramik Vihar, Phase 2, Rohini, New Delhi - 110085";
  } else if (cleanAadhaar.endsWith("6666")) {
    personName = "Sunita Devi Patel";
    personDob = "1988-11-23";
    personAddress = "Flat 304, Sahakar Enclave, Sector 14, Dwarka, New Delhi - 110078";
  }

  return {
    verified: true,
    name: personName,
    dob: personDob,
    gender: cleanAadhaar.endsWith("6666") ? "F" : "M",
    address: personAddress,
    maskedAadhaar: `XXXX XXXX ${last4}`,
    digilockerRef,
    verificationSource: "DigiLocker Demo Sandbox (UIDAI e-KYC Mock)",
    verificationTimestamp: now,
  };
}

export async function authorizeDigilockerDemo(
  userId: string | undefined,
  payload: {
    aadhaarNumber: string;
    aadhaarName: string;
    aadhaarDob: string;
    address?: string;
    digilockerRef: string;
    skillCertificate?: string;
  }
): Promise<{ success: boolean; message: string; role: string; profile: any }> {
  if (!userId) {
    return {
      success: true,
      message: "Verified details recorded for registration",
      role: "GUEST",
      profile: {
        ...payload,
        aadhaarVerified: true,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { consumerProfile: true, workerProfile: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const maskedNumber = payload.aadhaarNumber.length >= 4
    ? `XXXX-XXXX-${payload.aadhaarNumber.slice(-4)}`
    : payload.aadhaarNumber;

  let updatedProfile: any = null;

  if (user.role === "WORKER") {
    updatedProfile = await prisma.workerProfile.upsert({
      where: { userId },
      create: {
        userId,
        aadhaarNumber: maskedNumber,
        aadhaarVerified: true,
        aadhaarName: payload.aadhaarName,
        aadhaarDob: payload.aadhaarDob,
        workAddress: payload.address || user.workerProfile?.workAddress,
        digilockerRef: payload.digilockerRef,
        kycStatus: "VERIFIED",
        kycDocumentUrl: payload.skillCertificate || user.workerProfile?.kycDocumentUrl,
        status: "VERIFIED",
        phoneVerified: true,
      },
      update: {
        aadhaarNumber: maskedNumber,
        aadhaarVerified: true,
        aadhaarName: payload.aadhaarName,
        aadhaarDob: payload.aadhaarDob,
        workAddress: payload.address || user.workerProfile?.workAddress,
        digilockerRef: payload.digilockerRef,
        kycStatus: "VERIFIED",
        kycDocumentUrl: payload.skillCertificate || user.workerProfile?.kycDocumentUrl,
        status: "VERIFIED",
        phoneVerified: true,
      },
    });
  } else {
    // Default to CONSUMER
    updatedProfile = await prisma.consumerProfile.upsert({
      where: { userId },
      create: {
        userId,
        aadhaarNumber: maskedNumber,
        aadhaarVerified: true,
        aadhaarName: payload.aadhaarName,
        aadhaarDob: payload.aadhaarDob,
        defaultAddress: payload.address || user.consumerProfile?.defaultAddress,
        digilockerRef: payload.digilockerRef,
        kycStatus: "VERIFIED",
        phoneVerified: true,
      },
      update: {
        aadhaarNumber: maskedNumber,
        aadhaarVerified: true,
        aadhaarName: payload.aadhaarName,
        aadhaarDob: payload.aadhaarDob,
        defaultAddress: payload.address || user.consumerProfile?.defaultAddress,
        digilockerRef: payload.digilockerRef,
        kycStatus: "VERIFIED",
        phoneVerified: true,
      },
    });
  }

  logger.info(`User ${userId} (${user.role}) DigiLocker demo authorized and profile updated.`);

  return {
    success: true,
    message: "Verified details successfully linked to your account profile",
    role: user.role,
    profile: updatedProfile,
  };
}

// ---------- Consumer profile verification ----------
export async function verifyConsumerProfile(
  userId: string,
  data: {
    aadhaarNumber: string;
    kycDocumentUrl?: string;
    latitude?: number;
    longitude?: number;
    defaultAddress?: string;
  }
): Promise<any> {
  const profile = await prisma.consumerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Consumer profile not found", 404);

  const digilockerResult = await verifyAadhaar(data.aadhaarNumber);
  const updated = await prisma.consumerProfile.update({
    where: { userId },
    data: {
      aadhaarNumber: data.aadhaarNumber,
      aadhaarVerified: digilockerResult.verified,
      aadhaarName: digilockerResult.name,
      aadhaarDob: digilockerResult.dob,
      digilockerRef: `DL-${Date.now()}`,
      kycDocumentUrl: data.kycDocumentUrl || profile.kycDocumentUrl,
      kycStatus: data.kycDocumentUrl ? "VERIFIED" : profile.kycStatus,
      phoneVerified: true,
      latitude: data.latitude ?? profile.latitude,
      longitude: data.longitude ?? profile.longitude,
      defaultAddress: data.defaultAddress ?? profile.defaultAddress,
    },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  logger.info(`Consumer ${userId} verified: Aadhaar=${data.aadhaarNumber.slice(0, 4)}****`);
  return updated;
}

// ---------- Get consumer verification status ----------
export async function getConsumerVerificationStatus(userId: string): Promise<any> {
  const profile = await prisma.consumerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Consumer profile not found", 404);
  return {
    phoneVerified: profile.phoneVerified,
    kycStatus: profile.kycStatus,
    aadhaarVerified: profile.aadhaarVerified,
    digilockerRef: profile.digilockerRef,
    fullyVerified: profile.phoneVerified && profile.aadhaarVerified,
  };
}

export default {
  verifyDigilocker,
  verifyAadhaarOtp,
  sendAadhaarOtp,
  sendDigilockerDemoOtp,
  verifyDigilockerDemoOtp,
  authorizeDigilockerDemo,
  verifyConsumerProfile,
  getConsumerVerificationStatus,
};

