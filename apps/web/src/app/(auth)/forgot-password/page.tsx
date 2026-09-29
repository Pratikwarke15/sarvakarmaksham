"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { OtpInput } from "@/components/auth/OtpInput";
import { useToast } from "@/components/providers/ToastProvider";

type Step = "identifier" | "otp" | "new_password" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [maskedDestination, setMaskedDestination] = useState("");
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");

  // OTP state
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [serverOtpNotification, setServerOtpNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  // New Password state
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const triggerPushNotification = (code: string) => {
    setServerOtpNotification(code);
    setShowNotification(true);
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = identifier.trim();
    if (!clean) {
      setErrorMessage("Please enter your registered mobile number or email");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        message?: string;
        data?: {
          otp?: string;
          expiresAt?: string;
          channel: "SMS" | "EMAIL";
          maskedDestination: string;
        };
        error?: string;
      }>("/auth/forgot-password/send-otp", { identifier: clean });

      if (res.success && res.data) {
        setMaskedDestination(res.data.maskedDestination);
        setChannel(res.data.channel);
        setStep("otp");
        setCountdown(30);
        if (res.data.otp) {
          triggerPushNotification(res.data.otp);
        }
        toast({
          title: "Verification Code Generated",
          description: `A 6-digit code was sent to ${res.data.maskedDestination}`,
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || res.message || "Could not generate password reset code");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "Error connecting to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setErrorMessage(null);
    setOtp("");
    try {
      const { apiPost } = await import("@/lib/api");
      const clean = identifier.trim();
      const res = await apiPost<{
        success: boolean;
        data?: {
          otp?: string;
          expiresAt?: string;
          channel: "SMS" | "EMAIL";
          maskedDestination: string;
        };
        error?: string;
      }>("/auth/forgot-password/send-otp", { identifier: clean });

      if (res.success && res.data) {
        setCountdown(30);
        if (res.data.otp) {
          triggerPushNotification(res.data.otp);
        }
        toast({
          title: "New Code Sent!",
          description: "Previous code has been invalidated.",
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || "Failed to generate new code");
      }
    } catch {
      setErrorMessage("Network error generating new code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const clean = identifier.trim();
      const res = await apiPost<{
        success: boolean;
        message?: string;
        data?: { resetToken: string };
        error?: string;
      }>("/auth/forgot-password/verify-otp", {
        identifier: clean,
        otp: codeToVerify,
      });

      if (res.success && res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setShowNotification(false);
        setStep("new_password");
        toast({
          title: "Identity Verified!",
          description: "Please set your new password.",
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || res.message || "Invalid or expired code");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "Verification failed. Please check the code entered."
      );
    } finally {
      setLoading(false);
    }
  };

  const autoFillOtp = (code: string) => {
    setOtp(code);
    setErrorMessage(null);
    handleVerifyOtp(code);
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        message?: string;
        error?: string;
      }>("/auth/forgot-password/reset", {
        resetToken,
        newPassword,
      });

      if (res.success) {
        setStep("success");
        toast({
          title: "Password Updated Successfully!",
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || "Failed to update password");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "Error resetting password. Session may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Demo Mode Push Notification Popup */}
      {showNotification && serverOtpNotification && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-top-6 duration-300 transition-all pointer-events-auto"
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-[#800020]/30 bg-[#0F172A]/95 p-4 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#800020] text-white">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white">Password Reset Code</p>
                    <span className="rounded-full bg-rose-950 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 uppercase">
                      Server Demo
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotification(false)}
                className="text-slate-400 hover:text-white transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div>
                <p className="text-[10px] text-slate-300">Latest active server OTP:</p>
                <p className="text-xl font-mono font-black tracking-widest text-emerald-400">
                  {serverOtpNotification}
                </p>
              </div>
              <button
                type="button"
                onClick={() => autoFillOtp(serverOtpNotification)}
                className="rounded-xl bg-[#800020] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#68001a] transition"
              >
                Auto-Fill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Enter Identifier */}
      {step === "identifier" && (
        <div className="animate-fade-in">
          <Link
            href="/login"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-6 shadow-xs"
            aria-label="Back to login"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="mb-6">
            <div className="h-12 w-12 rounded-2xl bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] mb-4">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Forgot Password
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              Enter your registered mobile number or email address. We&apos;ll send you a secure 6-digit
              verification code.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Registered Mobile or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. 9812345601 or member@coop.in"
                  className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 pl-4 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 pointer-events-none">
                  {identifier.includes("@") ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Generating Code...</span>
                </div>
              ) : (
                "Send Verification Code"
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-5">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-600 hover:text-[#800020] transition"
            >
              ← Remember your password? Log in
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: Verify OTP */}
      {step === "otp" && (
        <div className="animate-fade-in">
          <button
            type="button"
            onClick={() => setStep("identifier")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-6 shadow-xs"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Verify Code
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              We sent a 6-digit code to{" "}
              <span className="font-bold text-slate-800">{maskedDestination || identifier}</span>.
              Enter it below to confirm your identity.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <div className="py-2">
            <OtpInput
              length={6}
              value={otp}
              onComplete={(code) => {
                setOtp(code);
                handleVerifyOtp(code);
              }}
              onResend={handleResendOtp}
              loading={loading}
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              Didn&apos;t receive code?{" "}
              {countdown > 0 ? (
                <span className="font-semibold text-slate-400">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-bold text-[#800020] hover:underline"
                >
                  Resend now
                </button>
              )}
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: Set New Password */}
      {step === "new_password" && (
        <div className="animate-fade-in">
          <div className="mb-6">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Set New Password
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              Your identity has been verified. Create a strong, memorable password for your account.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="At least 6 characters"
                  className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 pl-4 pr-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 pl-4 pr-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Updating Password...</span>
                </div>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 4: Success */}
      {step === "success" && (
        <div className="animate-fade-in text-center py-4 space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 font-heading">
            Password Reset Successful!
          </h2>

          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your account password has been updated. You can now use your new password to log in
            to Sarvakarmakshamah.
          </p>

          <div className="pt-4">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-sm font-bold shadow-md shadow-[#800020]/20 transition"
            >
              <span>Return to Login</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
