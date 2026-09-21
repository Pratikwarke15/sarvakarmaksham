"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "./PhoneInput";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { getRoleDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { ShieldCheck, MessageSquare, ArrowLeft, KeyRound, Sparkles, CheckCircle2, X } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { toast } = useToast();
  const { t } = useI18n();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulated System Push Notification State
  const [serverOtpNotification, setServerOtpNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown for resend
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, countdown]);

  const triggerPushNotification = (receivedOtp: string) => {
    setServerOtpNotification(receivedOtp);
    setShowNotification(true);
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    notificationTimeoutRef.current = setTimeout(() => {
      setShowNotification(false);
    }, 15000); // Display for 15 seconds
  };

  const getRedirectTarget = (role: UserRole) => {
    if (typeof window !== "undefined") {
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
        return redirect;
      }
    }
    return getRoleDashboardPath(role);
  };

  // Step 1: Verify Mobile Number + Password
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phone || phone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        data?: {
          requiresOtp: boolean;
          phone: string;
          otp?: string;
          user?: { id: string; name: string; role: UserRole };
        };
        error?: string;
      }>("/auth/login-init", { phone, password });

      if (res.success && res.data?.requiresOtp) {
        setStep("otp");
        setCountdown(30);
        const generatedOtp = res.data.otp || "283689";
        // Pop up the realistic OS-style push notification banner!
        triggerPushNotification(generatedOtp);
        toast({
          title: "Password Verified!",
          description: "Server OTP generated. Check your notification popup.",
          variant: "success",
        });
      } else {
        setErrorMessage(res.error || "Invalid mobile number or password");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Invalid mobile number or password";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Server-Generated OTP
  const handleOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!otp || otp.length !== 6) {
      setErrorMessage("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        data?: { user: any; token: string };
        error?: string;
        message?: string;
      }>("/auth/verify-otp", { phone, otp });

      if (res.success && res.data?.token) {
        login(res.data.user, res.data.token);
        setShowNotification(false);
        toast({ title: `Welcome back, ${res.data.user.name || "User"}!`, variant: "success" });
        const target = getRedirectTarget(res.data.user.role);
        router.push(target);
      } else {
        setErrorMessage(res.error || res.message || "Invalid or expired OTP");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Verification failed. Please check the OTP.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { apiPost } = await import("@/lib/api");
      const res = await apiPost<{
        success: boolean;
        data?: { requiresOtp: boolean; otp?: string };
        error?: string;
      }>("/auth/login-init", { phone, password });

      if (res.success && res.data) {
        setCountdown(30);
        const generatedOtp = res.data.otp || "283689";
        triggerPushNotification(generatedOtp);
        toast({ title: "New OTP Sent", variant: "success" });
      } else {
        setErrorMessage(res.error || "Could not generate new OTP");
      }
    } catch {
      setErrorMessage("Network error resending OTP");
    } finally {
      setLoading(false);
    }
  };

  const autoFillOtp = (code: string) => {
    setOtp(code);
    setErrorMessage(null);
    toast({ title: "OTP Auto-Filled!", variant: "success" });
  };

  return (
    <>
      {/* =========================================================
          REALISTIC OS/SMARTPHONE PUSH NOTIFICATION POPUP BANNER
          (Appears as a floating notification, NOT in the form block)
          ========================================================= */}
      {showNotification && serverOtpNotification && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in slide-in-from-top-6 duration-300 transition-all pointer-events-auto"
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-700/60 bg-[#0F172A]/95 p-4 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EA580C] text-white shadow-xs">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                  Messages • Just Now
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNotification(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Shramik Security Code
              </p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Your one-time login OTP is{" "}
                <span className="font-mono font-black text-sm tracking-wider text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/40">
                  {serverOtpNotification}
                </span>
                . Valid for 5 minutes. Do not share with anyone.
              </p>
            </div>

            <div className="mt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => autoFillOtp(serverOtpNotification)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:from-orange-600 hover:to-amber-700 active:scale-95 transition-all"
              >
                <Sparkles className="h-3 w-3" />
                Tap to Auto-Fill OTP
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
        {step === "credentials" ? (
          <div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-200">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-heading">
                {t("auth.welcomeBack") || "Sign In to Shramik"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter your mobile number and password to proceed
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <PhoneInput
                value={phone}
                onChange={(val) => {
                  setPhone(val);
                  setErrorMessage(null);
                }}
                disabled={loading}
                label="Registered Mobile Number"
                placeholder="98XXXXXXXX"
              />

              <Input
                label="Account Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Enter your password"
                disabled={loading}
              />

              <Button
                type="submit"
                className="w-full h-12 text-sm font-bold bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-md transition-all"
                loading={loading}
              >
                Verify & Continue
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register?role=CONSUMER"
                className="font-bold text-orange-600 hover:text-orange-700 underline underline-offset-4"
              >
                Create Consumer Account
              </Link>
            </div>
          </div>
        ) : (
          /* =========================================================
             STEP 2: ENTER SERVER-GENERATED OTP
             ========================================================= */
          <div>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setErrorMessage(null);
                setShowNotification(false);
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Password
            </button>

            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-heading">
                Enter Security OTP
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                A 6-digit server OTP was generated for{" "}
                <span className="font-bold text-slate-800">+91 {phone}</span>.
                Check the push notification popup.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setErrorMessage(null);
                  }}
                  autoFocus
                  placeholder="• • • • • •"
                  className="w-full text-center tracking-[0.6em] font-mono text-2xl font-black py-3 rounded-2xl border-2 border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-hidden bg-slate-50 transition-all text-slate-900"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm font-bold bg-[#15803D] hover:bg-[#166534] text-white shadow-md transition-all"
                loading={loading}
                disabled={otp.length !== 6}
              >
                Log In to Consumer Dashboard
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span>Didn&apos;t receive code?</span>
              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleResendOtp}
                className={`font-bold transition-colors ${
                  countdown > 0
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-orange-600 hover:text-orange-700 underline"
                }`}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default LoginForm;
