"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Award,
  Upload,
  UserCheck,
  Calendar,
  MapPin,
  Lock,
  ChevronRight,
  Info,
} from "lucide-react";
import { OtpInput } from "@/components/auth/OtpInput";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuthStore } from "@/store/authStore";

interface DigiLockerDemoFlowProps {
  userRole?: "CONSUMER" | "WORKER";
  onSuccess?: (updatedProfile: any) => void;
  onCancel?: () => void;
}

type DigiStep =
  | "INIT"
  | "LOGIN_CONSENT"
  | "AADHAAR_ENTRY"
  | "OTP_VERIFY"
  | "AUTHORIZE_DATA"
  | "SUCCESS";

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
  onSuccess,
  onCancel,
}: DigiLockerDemoFlowProps) {
  const { toast } = useToast();
  const { user, validateToken } = useAuthStore();

  const [step, setStep] = useState<DigiStep>("INIT");
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [serverOtp, setServerOtp] = useState<string | null>(null);
  const [showOtpBanner, setShowOtpBanner] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [maskedMobile, setMaskedMobile] = useState("XXXXXX5601");
  const [otpValue, setOtpValue] = useState("");

  // Verified Data from OTP Step
  const [verifiedData, setVerifiedData] = useState<MockCitizenData | null>(null);

  // Worker Optional Skill Certificate
  const [skillCertificate, setSkillCertificate] = useState("");
  const [skillCertFileName, setSkillCertFileName] = useState("");
  const [consentChecked, setConsentChecked] = useState(true);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "OTP_VERIFY" && countdown > 0) {
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

  // Step 2 -> Step 3: Send Server OTP
  const handleRequestOtp = async () => {
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
        setStep("OTP_VERIFY");
        toast({
          title: "Demo Aadhaar OTP Generated!",
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
          title: "New Aadhaar OTP Generated!",
          description: "Previous code is now invalid. Only this latest code will verify.",
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

  // Step 3 -> Step 4: Verify OTP
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
      });

      if (res.success && res.data) {
        setVerifiedData(res.data);
        setShowOtpBanner(false);
        setStep("AUTHORIZE_DATA");
        toast({
          title: "Aadhaar Identity Confirmed!",
          description: "Review authorized credentials to link to your profile.",
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || "Invalid or expired Aadhaar OTP code");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "OTP verification failed. Previous codes are invalid."
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

  // Step 4 -> Step 5: Authorize and Update Profile
  const handleAuthorize = async () => {
    if (!verifiedData) return;
    if (!consentChecked) {
      setErrorMessage("Please confirm your consent to link verified credentials.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        message: string;
        data: { profile: any; role: string };
        error?: string;
      }>("/verification/digilocker/authorize", {
        aadhaarNumber: aadhaarInput,
        aadhaarName: verifiedData.name,
        aadhaarDob: verifiedData.dob,
        address: verifiedData.address,
        digilockerRef: verifiedData.digilockerRef,
        skillCertificate: skillCertificate || undefined,
      });

      if (res.success) {
        setStep("SUCCESS");
        await validateToken();
        toast({
          title: "Profile Successfully Verified!",
          description: "Official verification badge linked to your account.",
          variant: "success",
        });
        if (onSuccess) {
          onSuccess(res.data?.profile);
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
    <div className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xl overflow-hidden text-slate-900 transition-all">
      {/* Official Top Demo Disclaimer Banner */}
      <div className="bg-[#0B1528] text-white px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-[#006699] flex items-center justify-center font-bold text-white text-[10px]">
            DL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase text-blue-200">
                DigiLocker Sandbox
              </span>
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.2 uppercase">
                Demo / Mock
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Simulated government paperless e-KYC integration (No real Aadhaar processed)
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition p-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Floating Demo Push Notification Banner */}
      {showOtpBanner && serverOtp && (
        <div
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-top-6 duration-300"
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-[#800020]/30 bg-[#0F172A]/95 p-4 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#800020] text-white">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">UIDAI Aadhaar OTP (Demo)</p>
                  <p className="text-[10px] text-slate-300">Sent to linked mobile: {maskedMobile}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOtpBanner(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div>
                <p className="text-[10px] text-slate-300">Active server OTP:</p>
                <p className="text-xl font-mono font-black tracking-widest text-emerald-400">
                  {serverOtp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => autoFillOtp(serverOtp)}
                className="rounded-xl bg-[#800020] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#68001a] transition"
              >
                Auto-Fill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: INITIAL SELECTION */}
      {step === "INIT" && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] flex-shrink-0">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Verify Identity with DigiLocker
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect your DigiLocker digital wallet to fetch authentic citizen credentials.
                Quick, paperless, and encrypted under Digital India guidelines.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs text-slate-700">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Info className="h-4 w-4 text-[#800020]" />
              Why verify with DigiLocker?
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-slate-600">
              <li>
                <strong>Instant Verified Badge:</strong> Stand out to cooperative members and customers with the verified shield.
              </li>
              <li>
                <strong>Fair Gig Allocation:</strong> Higher trust tier enables priority access to bookings and cooperative dividends.
              </li>
              <li>
                <strong>Paperless & Tamper-proof:</strong> Direct cryptographic verification of name, age, and address.
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setStep("LOGIN_CONSENT")}
            className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-sm font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <span>Proceed with DigiLocker Verification</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* STEP 2: DIGILOCKER AUTHORIZATION / LOGIN CONCEPT */}
      {step === "LOGIN_CONSENT" && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* DigiLocker Branded Header Box */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/30 to-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#006699] text-white font-black flex items-center justify-center text-sm shadow-xs">
                DL
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-950 font-heading">
                  DigiLocker Document Gateway
                </h4>
                <p className="text-[10px] text-blue-700 font-medium">
                  Ministry of Electronics & IT, Government of India
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded-md px-2 py-0.5 bg-white">
              OAuth 2.0 Mock
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 font-heading">
              Consent for Digital Credential Verification
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sarvakarmakshamah Cooperative is requesting access to your verified UIDAI e-KYC record.
              This demo simulates official identity issuance.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900">Application Requested Permissions:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Full Legal Name</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Date of Birth / Age</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Registered Address</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Masked Aadhaar ID</span>
              </div>
              {userRole === "WORKER" && (
                <div className="flex items-center gap-1.5 col-span-2 text-[#800020] font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#800020]" />
                  <span>Trade / Skill Certificate (Optional)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("INIT")}
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setStep("AADHAAR_ENTRY")}
              className="flex-2 rounded-2xl bg-[#006699] hover:bg-[#005580] text-white py-3 text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Continue with DigiLocker</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AADHAAR NUMBER ENTRY (SANDBOX DEMO) */}
      {step === "AADHAAR_ENTRY" && (
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 font-heading">
              Enter Test Aadhaar Number
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              In this demo sandbox, enter a 12-digit test number or click a quick-fill test persona.
              Real citizen credentials are never requested or stored.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              12-Digit Test Aadhaar Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatAadhaar(aadhaarInput)}
                onChange={handleAadhaarChange}
                placeholder="9999 8888 7777"
                maxLength={14}
                className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200 py-3.5 px-4 font-mono text-base font-bold tracking-widest text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-mono text-slate-400">
                {aadhaarInput.length}/12
              </div>
            </div>

            {/* Quick Test Numbers */}
            <div className="pt-1">
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                Quick Select Test Sandbox Personas:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickAadhaar("999988887777")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-[#800020] hover:bg-rose-50/50 transition"
                >
                  9999 8888 7777 (Test Citizen A)
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickAadhaar("888877776666")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-[#800020] hover:bg-rose-50/50 transition"
                >
                  8888 7777 6666 (Test Worker B)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("LOGIN_CONSENT")}
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading || aadhaarInput.length !== 12}
              onClick={handleRequestOtp}
              className="flex-2 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3 text-xs font-bold shadow-md shadow-[#800020]/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Requesting OTP...</span>
                </div>
              ) : (
                "Request Aadhaar OTP"
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SERVER OTP VERIFICATION */}
      {step === "OTP_VERIFY" && (
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 font-heading">
              Verify Aadhaar OTP
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              OTP sent to your Aadhaar-linked mobile number:{" "}
              <span className="font-bold text-slate-800">{maskedMobile}</span>.
              The OTP is generated by the server and previous codes are invalidated upon resend.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="py-2">
            <OtpInput
              length={6}
              onComplete={(code) => {
                setOtpValue(code);
                handleVerifyOtp(code);
              }}
              onResend={handleResendOtp}
              loading={loading}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep("AADHAAR_ENTRY")}
              className="font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Change Aadhaar Number
            </button>

            <div>
              {countdown > 0 ? (
                <span className="text-slate-400 font-medium">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-bold text-[#800020] hover:underline"
                >
                  Resend New OTP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: AUTHORIZATION / CONSENT SCREEN */}
      {step === "AUTHORIZE_DATA" && verifiedData && (
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[11px] font-bold text-emerald-800 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>DigiLocker Identity Verified</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 font-heading">
              Authorize Verified Profile Information
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              DigiLocker has released the following authenticated record. Confirm authorization
              to attach this verified status to your account profile.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Verified Attributes Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-slate-500 font-medium">Legal Name</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">{verifiedData.name}</span>
                <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 text-[9px]">
                  ✓ Verified
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-slate-500 font-medium">Date of Birth / Age</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">{verifiedData.dob} (~31 yrs)</span>
                <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 text-[9px]">
                  ✓ Verified
                </span>
              </div>
            </div>

            <div className="flex items-start justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-slate-500 font-medium flex-shrink-0">Registered Address</span>
              <div className="text-right pl-4">
                <p className="font-bold text-slate-900">{verifiedData.address}</p>
                <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 text-[9px] inline-block mt-0.5">
                  ✓ Verified
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Aadhaar Reference</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-slate-900">{verifiedData.maskedAadhaar}</span>
                <span className="text-[10px] text-slate-400">({verifiedData.digilockerRef})</span>
              </div>
            </div>
          </div>

          {/* WORKER SPECIFIC: OPTIONAL SKILL CERTIFICATE */}
          {userRole === "WORKER" && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Award className="h-4 w-4 text-[#800020]" />
                  <span>Skill Certificate</span>
                </div>
                <span className="rounded-full bg-slate-200/80 text-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Optional
                </span>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">
                If you possess an ITI, NSDC, PMKVY, or vocational trade certificate, you can include
                it with your verification. If you don&apos;t have one right now, you can leave it blank and continue.
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={skillCertificate}
                  onChange={(e) => setSkillCertificate(e.target.value)}
                  placeholder="e.g. NSDC Level 4 Electrician Certificate (Optional)"
                  className="w-full rounded-xl bg-white border border-slate-200 py-2.5 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#800020] outline-none"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSkillCertificate("Government ITI Certified Wireman - Grade I (Ref: DL-ITI-2025)");
                      setSkillCertFileName("ITI_Certificate_Grade1.pdf");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    + Attach Demo ITI Certificate
                  </button>
                  {skillCertFileName && (
                    <span className="text-[10px] text-emerald-700 font-medium">
                      ✓ Attached: {skillCertFileName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#800020] focus:ring-[#800020]"
            />
            <span>
              I authorize Sarvakarmakshamah Cooperative to store and display my verified name,
              address, and credentials on my member profile pursuant to the platform privacy policy.
            </span>
          </label>

          {/* Action Button */}
          <button
            type="button"
            disabled={loading || !consentChecked}
            onClick={handleAuthorize}
            className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-sm font-bold shadow-md shadow-[#800020]/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Linking to Profile...</span>
              </div>
            ) : (
              "Authorize & Continue"
            )}
          </button>
        </div>
      )}

      {/* STEP 6: SUCCESS */}
      {step === "SUCCESS" && (
        <div className="p-6 sm:p-8 text-center space-y-5 animate-fade-in">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 font-heading">
              DigiLocker Verification Complete!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your identity has been authenticated. Your profile now features the verified member
              badge with distinguished verified details.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 max-w-sm mx-auto text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Member:</span>
              <span className="font-bold text-slate-900">{verifiedData?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="text-emerald-700 font-bold">✓ Aadhaar Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Source:</span>
              <span className="text-slate-700">DigiLocker National Sandbox</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
            }}
            className="w-full sm:w-auto px-8 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3 text-xs font-bold shadow-md shadow-[#800020]/20 transition"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
