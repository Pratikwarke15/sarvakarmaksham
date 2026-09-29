import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, "").slice(-10))
    .refine((val) => val.length === 10, { message: "Phone number must be a valid 10-digit number" }),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, "").slice(-10))
    .refine((val) => val.length === 10, { message: "Phone number must be a valid 10-digit number" }),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
  expectedRole: z.enum(["CONSUMER", "WORKER"]).optional(),
  purpose: z.string().optional(),
});

export const registerSchema = z.object({
  phone: z
    .string()
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d{10}$/, "Phone number must contain only digits"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be at most 128 characters"),
  role: z.enum(["CONSUMER", "WORKER"], {
    errorMap: () => ({ message: "Role must be CONSUMER or WORKER" }),
  }),
  aadhaarNumber: z.string().optional(),
  aadhaarName: z.string().optional(),
  aadhaarDob: z.string().optional(),
  digilockerRef: z.string().optional(),
  defaultAddress: z.string().optional(),
  workAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  skillTags: z.array(z.string()).optional(),
  experienceYears: z.number().optional(),
  skillCertificate: z.string().optional(),
});

export const loginSchema = z.object({
  phone: z
    .string()
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d{10}$/, "Phone number must contain only digits"),
  password: z.string().min(1, "Password is required"),
  expectedRole: z.enum(["CONSUMER", "WORKER"]).optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
