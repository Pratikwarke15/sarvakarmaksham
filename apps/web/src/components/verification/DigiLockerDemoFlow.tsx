"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Award,
  Lock,
  ChevronRight,
  Info,
  ShieldAlert,
  Check,
  User,
  ExternalLink,
} from "lucide-react";
import { OtpInput } from "@/components/auth/OtpInput";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuthStore } from "@/store/authStore";

export interface DigiLockerInitialData {
  name?: string;
  dob?: string;
  address?: string;
  aadhaarNumber?: string;
  skillCertificate?: string;
  skills?: string[];
}

interface DigiLockerDemoFlowProps {
  userRole?: "CONSUMER" | "WORKER";
  initialData?: DigiLockerInitialData;
  onSuccess?: (updatedProfile: any) => void;
  onCancel?: () => void;
  isStandalone?: boolean;
}

type DigiStep = "SIGN_IN" | "AADHAAR_OTP" | "CONSENT_AUTHORIZE" | "SUCCESS";

interface MockCitizenData {
  name: string;
  dob: string;
  gender: string;
  address: string;
  maskedAadhaar: string;
  digilockerRef: string;
  verificationSource: string;
  verificationTimestamp: string;
}

export function DigiLockerDemoFlow({
  userRole = "CONSUMER",
  initialData,
  onSuccess,
  onCancel,
  isStandalone = false,
}: DigiLockerDemoFlowProps) {
  const { toast } = useToast();
  const { user, validateToken } = useAuthStore();

  const [step, setStep] = useState<DigiStep>("SIGN_IN");
  const [aadhaarInput, setAadhaarInput] = useState(
    initialData?.aadhaarNumber ? initialData.aadhaarNumber.replace(/\D/g, "").slice(0, 12) : ""
  );
  const [serverOtp, setServerOtp] = useState<string | null>(null);
  const [showOtpBanner, setShowOtpBanner] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [maskedMobile, setMaskedMobile] = useState("XXXXXX5601");
  const [otpValue, setOtpValue] = useState("");

  // Verified Data from OTP Step
  const [verifiedData, setVerifiedData] = useState<MockCitizenData | null>(null);

  // Worker Optional Skill Certificate
  const [skillCertificate, setSkillCertificate] = useState(initialData?.skillCertificate || "");
  const [skillCertFileName, setSkillCertFileName] = useState(
    initialData?.skillCertificate ? "Skill_Certificate.pdf" : ""
  );

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "AADHAAR_OTP" && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAadhaarInput(raw);
    if (errorMessage) setErrorMessage(null);
  };

  const fillQuickAadhaar = (number: string) => {
    setAadhaarInput(number);
    if (errorMessage) setErrorMessage(null);
  };

  // Step 1 -> Step 2: Send Server Aadhaar OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (aadhaarInput.length !== 12) {
      setErrorMessage("Please enter a valid 12-digit test Aadhaar number");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        message?: string;
        data?: { otp: string; expiresAt: string; maskedMobile: string };
        error?: string;
      }>("/verification/digilocker/send-otp", {
        aadhaarNumber: aadhaarInput,
      });

      if (res.success && res.data) {
        setMaskedMobile(res.data.maskedMobile);
        setServerOtp(res.data.otp);
        setShowOtpBanner(true);
        setCountdown(30);
        setStep("AADHAAR_OTP");
        toast({
          title: "Aadhaar OTP Generated",
          description: `Code sent to Aadhaar-linked mobile: ${res.data.maskedMobile}`,
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || "Failed to generate Aadhaar OTP");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "Error initiating DigiLocker OTP generation"
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP (Variable, Invalidates Old)
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setErrorMessage(null);
    setOtpValue("");
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        data?: { otp: string; expiresAt: string; maskedMobile: string };
        error?: string;
      }>("/verification/digilocker/send-otp", {
        aadhaarNumber: aadhaarInput,
      });

      if (res.success && res.data) {
        setServerOtp(res.data.otp);
        setShowOtpBanner(true);
        setCountdown(30);
        toast({
          title: "New Aadhaar OTP Generated",
          description: "Previous OTP has been invalidated. Only this new code will verify.",
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || "Could not generate new OTP");
      }
    } catch {
      setErrorMessage("Network error generating new code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Verify OTP (Pass Name to match UIDAI record)
  const handleVerifyOtp = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit Aadhaar OTP");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        message?: string;
        data?: MockCitizenData;
        error?: string;
      }>("/verification/digilocker/verify-otp", {
        aadhaarNumber: aadhaarInput,
        otp: codeToVerify,
        name: initialData?.name,
      });

      if (res.success && res.data) {
        setVerifiedData(res.data);
        setShowOtpBanner(false);
        setStep("CONSENT_AUTHORIZE");
        toast({
          title: "UIDAI Aadhaar Verified",
          description: "Review authorized credentials to grant access.",
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || "Invalid or expired Aadhaar OTP code");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "OTP verification failed. Previous code is now invalid."
      );
    } finally {
      setLoading(false);
    }
  };

  const autoFillOtp = (code: string) => {
    setOtpValue(code);
    setErrorMessage(null);
    handleVerifyOtp(code);
  };

  // Step 3 -> Step 4: Authorize and Update Profile
  const handleAuthorize = async () => {
    if (!verifiedData) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const finalName = initialData?.name || verifiedData.name;
      const finalDob = initialData?.dob || verifiedData.dob;
      const finalAddress = initialData?.address || verifiedData.address;
      const finalSkillCert = skillCertificate || initialData?.skillCertificate;

      const res = await apiPost<{
        success: boolean;
        message: string;
        data: { profile: any; role: string };
        error?: string;
      }>("/verification/digilocker/authorize", {
        aadhaarNumber: aadhaarInput,
        aadhaarName: finalName,
        aadhaarDob: finalDob,
        address: finalAddress,
        digilockerRef: verifiedData.digilockerRef,
        skillCertificate: finalSkillCert || undefined,
      });

      if (res.success) {
        setStep("SUCCESS");
        await validateToken();
        toast({
          title: "Consent Granted Successfully!",
          description: "Verified profile attributes updated on Sarvakarmakshamah.",
          variant: "success",
        });
        if (onSuccess) {
          onSuccess({
            ...res.data?.profile,
            digilockerRef: verifiedData.digilockerRef,
            aadhaarNumber: aadhaarInput,
            name: finalName,
            dob: finalDob,
            address: finalAddress,
            skillCertificate: finalSkillCert,
          });
        }
      } else {
        setErrorMessage(res.error || "Failed to authorize profile credentials");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "Error linking verified credentials to profile."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`w-full max-w-lg mx-auto rounded-2xl bg-white border border-slate-300 shadow-2xl overflow-hidden font-sans text-slate-800 flex flex-col ${
        isStandalone ? "my-4 sm:my-6 shadow-xl" : "max-h-[92vh] sm:max-h-[88vh]"
      }`}
    >
      {/* STICKY TOP HEADER (Tricolor + Official DigiLocker Branding + Demo Notice) */}
      <div className="flex-shrink-0">
        {/* 1. Indian National Flag Tricolor Bar */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#FF9933]" />
          <div className="h-full w-1/3 bg-white" />
          <div className="h-full w-1/3 bg-[#138808]" />
        </div>

        {/* 2. Official DigiLocker Government Header */}
        <header className="bg-[#002F6C] text-white px-4 sm:px-5 py-3 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-2.5">
            {/* Government of India Ashoka Stambh Emblem SVG */}
            <div className="flex flex-col items-center">
              <svg
                className="h-8 w-6 text-amber-300 fill-current"
                viewBox="0 0 100 130"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="National Emblem of India"
              >
                <path d="M50 5 C40 5 35 15 35 25 C35 32 40 40 50 40 C60 40 65 32 65 25 C65 15 60 5 50 5 Z" />
                <path d="M25 15 C20 18 15 28 18 38 C22 45 30 45 34 38 C35 32 30 20 25 15 Z" />
                <path d="M75 15 C80 18 85 28 82 38 C78 45 70 45 66 38 C65 32 70 20 75 15 Z" />
                <rect x="20" y="48" width="60" height="8" rx="2" fill="#E6A100" />
                <circle cx="50" cy="68" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
                <circle cx="50" cy="68" r="3" fill="#FFFFFF" />
                <path d="M20 78 C20 85 30 90 50 90 C70 90 80 85 80 78 Z" fill="#E6A100" />
                <text x="50" y="112" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                  सत्यमेव जयते
                </text>
              </svg>
            </div>

            <div className="border-l border-white/20 pl-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-white font-heading">
                  DigiLocker
                </span>
                <span className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">
                  Govt of India
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-blue-200 leading-tight">
                Ministry of Electronics & IT (MeitY)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                National Sandbox
              </span>
              <span className="text-[9px] text-blue-200">Demo Environment</span>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-blue-200 hover:text-white transition p-1 ml-1"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {/* 3. Demo / Mock Disclaimer Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" />
            <span className="font-medium text-[10px] sm:text-[11px]">
              <strong>Demo Verification:</strong> Use test Aadhaar credentials. Real government Aadhaar is not processed.
            </span>
          </div>
        </div>
      </div>

      {/* Floating Demo Server OTP Notification Banner */}
      {showOtpBanner && serverOtp && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-top-6 duration-300"
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-blue-400/40 bg-[#002F6C]/95 p-3.5 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-[11px]">
                  DL
                </div>
                <div>
                  <p className="text-xs font-bold text-white">UIDAI Aadhaar OTP (Demo Server)</p>
                  <p className="text-[10px] text-blue-200">Sent to linked mobile: {maskedMobile}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpBanner(false)}
                className="text-blue-200 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/10 border border-white/10 px-3 py-2">
              <div>
                <p className="text-[10px] text-blue-200">Active server OTP:</p>
                <p className="text-xl font-mono font-black tracking-widest text-emerald-400">
                  {serverOtp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => autoFillOtp(serverOtp)}
                className="rounded-xl bg-[#006699] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#005580] transition"
              >
                Auto-Fill Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCROLLABLE INNER BODY (Fits perfectly on any screen height) */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
        {/* STEP 1: SIGN IN VIA DIGILOCKER */}
        {step === "SIGN_IN" && (
          <div className="space-y-4">
            <div className="border-b border-slate-200 flex items-center gap-6 text-sm">
              <button
                type="button"
                className="font-bold text-[#006699] border-b-2 border-[#006699] pb-2 text-xs sm:text-sm"
              >
                Sign In with Aadhaar
              </button>
              <span className="text-slate-400 pb-2 text-xs">
                DigiLocker SSO
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Sign In to your DigiLocker Account
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your 12-digit Aadhaar number to verify your citizen profile.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Aadhaar Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatAadhaar(aadhaarInput)}
                    onChange={handleAadhaarChange}
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 py-3 px-3.5 font-mono text-base font-bold tracking-widest text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#006699] focus:ring-2 focus:ring-blue-100 outline-none transition"
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-mono text-slate-400">
                    {aadhaarInput.length}/12
                  </div>
                </div>
              </div>

              {/* Quick-fill Test Sandbox Personas */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-xs">
                <span className="font-bold text-blue-900 block mb-1 text-[11px]">
                  Quick Select Test Personas (Sandbox):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillQuickAadhaar("999988887777")}
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-950 hover:border-blue-400 hover:bg-blue-50 transition"
                  >
                    9999 8888 7777 (Citizen Ramesh)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickAadhaar("888877776666")}
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-950 hover:border-blue-400 hover:bg-blue-50 transition"
                  >
                    8888 7777 6666 (Sunita Devi)
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                By clicking Next, you consent to receive an authentication OTP on your UIDAI-registered mobile number.
              </div>

              <button
                type="submit"
                disabled={loading || aadhaarInput.length !== 12}
                className="w-full rounded-xl bg-[#006699] hover:bg-[#005580] text-white py-3 text-sm font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Contacting UIDAI Server...</span>
                  </div>
                ) : (
                  <>
                    <span>Next / Send Aadhaar OTP</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-1 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-600" />
              <span>256-bit Encrypted Government Authentication Gateway</span>
            </div>
          </div>
        )}

        {/* STEP 2: UIDAI AADHAAR MOBILE OTP STEP */}
        {step === "AADHAAR_OTP" && (
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Step 2: UIDAI Security Verification
              </span>
              <button
                type="button"
                onClick={() => setStep("SIGN_IN")}
                className="text-xs font-bold text-[#006699] hover:underline"
              >
                ← Edit Aadhaar
              </button>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Enter UIDAI Security OTP
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                OTP sent to your Aadhaar-linked mobile:{" "}
                <span className="font-bold text-slate-900">{maskedMobile}</span>.
                Enter the 6-digit verification code below.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="py-2">
              <OtpInput
                length={6}
                value={otpValue}
                onComplete={(code) => {
                  setOtpValue(code);
                  handleVerifyOtp(code);
                }}
                onResend={handleResendOtp}
                loading={loading}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>Didn&apos;t receive security code?</span>
              <div>
                {countdown > 0 ? (
                  <span className="text-slate-400 font-semibold">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-bold text-[#006699] hover:underline"
                  >
                    Resend New OTP
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: OFFICIAL DIGILOCKER OAUTH CONSENT / AUTHORIZATION SCREEN */}
        {step === "CONSENT_AUTHORIZE" && verifiedData && (
          <div className="space-y-3.5">
            {/* Header Request Box */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/30 p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#800020] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                  सह
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">
                    Application Requesting Access:
                  </p>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 font-heading">
                    Sarvakarmakshamah Cooperative Platform
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-500">
                    Democratic Gig & Platform Workers Cooperative Federation
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-snug">
              Sarvakarmakshamah is requesting your authorization to cross-verify the following member profile
              details with your official DigiLocker Aadhaar account:
            </div>

            {/* User-Provided Profile Context Being Authorized */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                <span className="font-bold text-sky-950 flex items-center gap-1.5 text-[11px]">
                  <Info className="h-3.5 w-3.5 text-[#006699]" />
                  <span>Profile Information Being Authorized</span>
                </span>
                <span className="text-[9px] text-sky-800 font-bold bg-sky-200/60 px-2 py-0.5 rounded-md">
                  Submitted Profile
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Legal Name:</span>
                  <p className="font-bold text-slate-900">{initialData?.name || verifiedData.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Date of Birth / Age:</span>
                  <p className="font-bold text-slate-900">{initialData?.dob || verifiedData.dob}</p>
                </div>
              </div>
              <div className="text-[11px]">
                <span className="text-slate-500">Address / Location:</span>
                <p className="font-bold text-slate-900 leading-snug">{initialData?.address || verifiedData.address}</p>
              </div>
              {userRole === "WORKER" && initialData?.skills && initialData.skills.length > 0 && (
                <div className="text-[11px] pt-1 border-t border-sky-100">
                  <span className="text-slate-500">Selected Skills:</span>
                  <p className="font-medium text-slate-800">{initialData.skills.join(", ")}</p>
                </div>
              )}
            </div>

            {/* Official UIDAI Aadhaar Verification Record */}
            <div className="rounded-xl border border-slate-300 bg-white p-3 space-y-1.5 text-xs shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  <span>UIDAI Aadhaar Verified Record</span>
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>Authenticated</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Aadhaar Name:</span>
                  <p className="font-semibold text-slate-900">{verifiedData.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Masked Aadhaar:</span>
                  <p className="font-mono font-bold text-slate-900">{verifiedData.maskedAadhaar}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono border-t border-slate-100">
                <span>Source: UIDAI e-KYC Gateway</span>
                <span>Ref: {verifiedData.digilockerRef}</span>
              </div>
            </div>

            {/* WORKER ROLE: OPTIONAL SKILL CERTIFICATE INPUT */}
            {userRole === "WORKER" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px]">
                    <Award className="h-3.5 w-3.5 text-[#800020]" />
                    <span>Skill & Vocational Certificate</span>
                  </div>
                  <span className="rounded-md bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 text-[8px] uppercase">
                    Optional
                  </span>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={skillCertificate}
                    onChange={(e) => setSkillCertificate(e.target.value)}
                    placeholder="e.g. Government ITI Electrician Certificate (Optional)"
                    className="w-full rounded-lg bg-white border border-slate-300 py-2 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#006699] outline-none"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSkillCertificate("Government ITI Certified Wireman - Grade I (Ref: DL-ITI-2025)");
                        setSkillCertFileName("ITI_Certificate_Grade1.pdf");
                      }}
                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      + Attach Demo ITI Certificate
                    </button>
                    {skillCertFileName && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        ✓ Attached: {skillCertFileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Granular Permission Checklist */}
            <div className="space-y-1 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>Allow verification of Full Legal Name & Date of Birth</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>Allow verification of Residential Address for local service allocation</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span>Allow storage of DigiLocker Audit Reference token</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === "SUCCESS" && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 font-heading">
                DigiLocker Verification Authorized!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your verified credentials have been authenticated and attached to your member profile.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 max-w-sm mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900">{verifiedData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Identity Status:</span>
                <span className="text-emerald-700 font-bold">✓ Aadhaar Verified</span>
              </div>
              {skillCertificate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Skill Certificate:</span>
                  <span className="text-emerald-700 font-bold">✓ Verified</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway Ref:</span>
                <span className="font-mono text-slate-600 text-[11px]">{verifiedData?.digilockerRef}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
              }}
              className="w-full sm:w-auto px-8 rounded-xl bg-[#006699] hover:bg-[#005580] text-white py-2.5 text-xs font-bold shadow-md transition"
            >
              Return to Registration
            </button>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM ACTIONS FOR CONSENT_AUTHORIZE (Never overflows off screen!) */}
      {step === "CONSENT_AUTHORIZE" && (
        <div className="flex-shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel ? onCancel : () => setStep("SIGN_IN")}
            className="flex-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 py-2.5 sm:py-3 text-xs font-bold text-slate-700 transition"
          >
            Deny
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleAuthorize}
            className="flex-2 rounded-xl bg-[#006699] hover:bg-[#005580] text-white py-2.5 sm:py-3 text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Authorizing...</span>
              </div>
            ) : (
              <>
                <span>Allow (Authorize & Continue)</span>
                <Check className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
