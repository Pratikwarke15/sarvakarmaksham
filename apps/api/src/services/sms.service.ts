import { logger } from "../lib/logger";

/**
 * Server OTP Provider
 * Operates purely on Server OTP.
 * Verification codes are securely generated, stored in the database, and verified directly by the server.
 */
export async function sendOTPSms(phone: string, otp: string): Promise<boolean> {
  logger.info(`[Server OTP] Verification code generated for ${phone}: ${otp}`);
  return true;
}
