"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  X,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Briefcase,
  Home,
} from "lucide-react";
import { OtpInput } from "./OtpInput";
import { LegalModal } from "@/components/legal/LegalModal";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/providers/ToastProvider";
import { getRoleDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export interface EnhancedLoginFormProps {
  initialRole?: "WORKER" | "CONSUMER";
}

export function EnhancedLoginForm({ initialRole }: EnhancedLoginFormProps = {}) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { toast } = useToast();

  const [activeRole, setActiveRole] = useState<"WORKER" | "CONSUMER">(() => {
    if (initialRole) return initialRole;
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("role");
      if (p?.toUpperCase() === "WORKER") return "WORKER";
      if (p?.toUpperCase() === "CONSUMER") return "CONSUMER";
    }
    return "CONSUMER";
  });

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Role Mismatch Error State for Cross-Login Prevention
  const [roleMismatch, setRoleMismatch] = useState<{
    targetRole: "WORKER" | "CONSUMER";
    message: string;
  } | null>(null);

  // Legal modal state
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy">("terms");

  // Demo Push Notification State
  const [serverOtpNotification, setServerOtpNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Resend countdown
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, countdown]);

  const handleRoleChange = (newRole: "WORKER" | "CONSUMER") => {
    setActiveRole(newRole);
    setErrorMessage(null);
    setRoleMismatch(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("role", newRole);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const triggerPushNotification = (receivedOtp: string) => {
    setServerOtpNotification(receivedOtp);
    setShowNotification(true);
    if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    notificationTimeoutRef.current = setTimeout(() => {
      setShowNotification(false);
    }, 20000);
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

  // Quick Seed Credentials
  const fillSeedUser = (userPhone: string, userPass: string, label: string) => {
    setIdentifier(userPhone);
    setPassword(userPass);
    setErrorMessage(null);
    setRoleMismatch(null);
    toast({ title: `Loaded ${label}`, variant: "default" });
  };

  // Step 1: Validate Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRoleMismatch(null);

    const clean = identifier.trim();
    if (!clean) {
      setErrorMessage("Please enter your mobile number or email");
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
          role?: string;
          otp?: string;
          expiresAt?: string;
        };
        error?: string;
        message?: string;
      }>("/auth/login-step1", {
        identifier: clean,
        password,
        expectedRole: activeRole,
      });

      if (res.success && res.data) {
        setStep("otp");
        setCountdown(30);
        if (res.data.phone) {
          setUserPhone(res.data.phone);
        }
        if (res.data.otp) {
          triggerPushNotification(res.data.otp);
        }
        toast({
          title: "Password Verified!",
          description: "6-Digit verification code generated by server.",
          variant: "success",
        });
      } else {
        const errorText = res.error || res.message || "Invalid mobile number or password";
        checkCrossRoleError(errorText);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Invalid credentials. Please try again.";
      checkCrossRoleError(msg);
    } finally {
      setLoading(false);
    }
  };

  const checkCrossRoleError = (msg: string) => {
    if (msg.includes("registered as a Consumer") || msg.includes("Consumer Login page")) {
      setRoleMismatch({
        targetRole: "CONSUMER",
        message: "This account is registered as a Consumer. Consumers cannot log in through the Worker Portal.",
      });
    } else if (msg.includes("registered as a Worker") || msg.includes("Worker Login page")) {
      setRoleMismatch({
        targetRole: "WORKER",
        message: "This account is registered as a Worker. Workers cannot log in through the Consumer Portal.",
      });
    } else {
      setErrorMessage(msg);
    }
  };

  // Step 2: Verify OTP
  const verifyingOtpRef = useRef(false);
  const handleOtpVerify = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code");
      return;
    }

    if (loading || verifyingOtpRef.current) return;
    verifyingOtpRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setRoleMismatch(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const targetPhone = userPhone || identifier.replace(/\D/g, "").slice(-10);
      const res = await apiPost<{
        success: boolean;
        data?: { user: any; token: string };
        error?: string;
        message?: string;
      }>("/auth/verify-otp", {
        phone: targetPhone,
        otp: codeToVerify,
        expectedRole: activeRole,
      });

      if (res.success && res.data?.token) {
        login(res.data.user, res.data.token);
        setShowNotification(false);
        toast({
          title: `Welcome back, ${res.data.user.name || "Member"}!`,
          variant: "success",
        });
        const target = getRedirectTarget(res.data.user.role);
        router.push(target);
      } else {
        const errorText = res.error || res.message || "Invalid or expired code. Please try again.";
        checkCrossRoleError(errorText);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Verification failed. Please check the code.";
      checkCrossRoleError(msg);
    } finally {
      setLoading(false);
      verifyingOtpRef.current = false;
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setErrorMessage(null);
    setRoleMismatch(null);
    setOtp("");
    try {
      const { apiPost } = await import("@/lib/api");
      const clean = identifier.trim();
      const res = await apiPost<{
        success: boolean;
        data?: { otp?: string; expiresAt?: string };
        error?: string;
      }>("/auth/login-step1", {
        identifier: clean,
        password,
        expectedRole: activeRole,
      });

      if (res.success && res.data) {
        setCountdown(30);
        if (res.data.otp) {
          triggerPushNotification(res.data.otp);
        }
        toast({ title: "New security code sent! Previous code is now invalid.", variant: "success" });
      } else {
        setErrorMessage(res.error || "Could not generate new code");
      }
    } catch {
      setErrorMessage("Network error resending code");
    } finally {
      setLoading(false);
    }
  };

  const autoFillOtp = (code: string) => {
    setOtp(code);
    setErrorMessage(null);
    toast({ title: "Code Auto-Filled!", variant: "success" });
    handleOtpVerify(code);
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
                    <p className="text-xs font-bold text-white">Verification Code</p>
                    <span className="rounded-full bg-rose-950 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 uppercase">
                      Demo
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotification(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-800/80 px-3.5 py-2.5 border border-slate-700/60">
              <div>
                <p className="text-[11px] text-slate-300">Your Login Code:</p>
                <p className="text-xl font-mono font-black tracking-widest text-amber-300">
                  {serverOtpNotification}
                </p>
              </div>
              <button
                type="button"
                onClick={() => autoFillOtp(serverOtpNotification)}
                className="flex items-center gap-1 rounded-xl bg-[#800020] hover:bg-[#9a0026] text-white px-3 py-1.5 text-xs font-bold shadow-md transition transform active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Auto-Fill
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "credentials" ? (
        <div>
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition mb-4 shadow-xs"
            aria-label="Back to home"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          {/* DEDICATED PORTAL TABS: WORKER vs CONSUMER */}
          <div className="mb-5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleRoleChange("WORKER")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeRole === "WORKER"
                  ? "bg-[#800020] text-white shadow-md shadow-[#800020]/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Worker Login</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("CONSUMER")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeRole === "CONSUMER"
                  ? "bg-[#800020] text-white shadow-md shadow-[#800020]/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Consumer Login</span>
            </button>
          </div>

          {/* Role Header Badge & Subtitles */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                  activeRole === "WORKER"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                }`}
              >
                {activeRole === "WORKER" ? "👷 Worker & Co-op Portal" : "🏡 Consumer & Household Portal"}
              </span>
            </div>

            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
              {activeRole === "WORKER" ? "Worker Log in" : "Consumer Log in"}
            </h1>

            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              {activeRole === "WORKER"
                ? "Access gig assignments, daily earnings, dividends & social security."
                : "Book verified fair-trade workers for household repairs & services."}
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              By logging in, you agree to our{" "}
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab("terms");
                  setLegalModalOpen(true);
                }}
                className="text-[#800020] font-bold hover:underline cursor-pointer"
              >
                Terms of Use
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab("privacy");
                  setLegalModalOpen(true);
                }}
                className="text-[#800020] font-bold hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>

          {/* CROSS-ROLE MISMATCH ALERT BANNER */}
          {roleMismatch ? (
            <div className="mb-5 rounded-2xl border-2 border-[#800020]/20 bg-rose-50/90 p-4 text-xs text-rose-950 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-[#800020] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-[#800020] font-heading">
                    Account Role Mismatch
                  </h4>
                  <p className="mt-1 text-slate-700 leading-relaxed font-medium">
                    {roleMismatch.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRoleChange(roleMismatch.targetRole)}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white px-3.5 py-2 font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <span>
                      Switch to {roleMismatch.targetRole === "WORKER" ? "Worker Login" : "Consumer Login"} Now
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {activeRole === "WORKER" ? "Worker Mobile Number or Email" : "Consumer Mobile Number or Email"}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                  if (roleMismatch) setRoleMismatch(null);
                }}
                placeholder={activeRole === "WORKER" ? "e.g. 9876543201 or worker@email.com" : "e.g. 9812345601 or consumer@email.com"}
                className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#800020] hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                    if (roleMismatch) setRoleMismatch(null);
                  }}
                  placeholder="Your password"
                  className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 pl-4 pr-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500 pt-1">
              We will generate a 6-digit verification code for {activeRole === "WORKER" ? "Worker" : "Consumer"} authentication.
            </p>

            {/* Connect Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Verifying {activeRole === "WORKER" ? "Worker" : "Consumer"} Account...</span>
                </div>
              ) : (
                `Connect as ${activeRole === "WORKER" ? "Worker" : "Consumer"}`
              )}
            </button>
          </form>

          {/* Quick Demo Sign In Options tailored by role */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-xs font-medium text-slate-400">Quick Test Logins</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <div className="space-y-2.5">
            {activeRole === "WORKER" ? (
              <>
                <button
                  type="button"
                  onClick={() => fillSeedUser("9876543201", "password123", "Demo Worker Rajesh")}
                  className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50/50 py-3 px-4 flex items-center justify-between text-xs font-semibold text-amber-950 hover:bg-amber-100/60 transition shadow-xs"
                >
                  <span className="flex items-center gap-2 font-bold">
                    <span>👷</span>
                    <span>Demo Worker (Rajesh - 9876543201)</span>
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                    Ready
                  </span>
                </button>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("CONSUMER")}
                    className="text-xs text-slate-500 hover:text-[#800020] font-medium"
                  >
                    Need household services? Switch to Consumer Login →
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fillSeedUser("9812345601", "password123", "Demo Consumer Priya")}
                  className="w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 py-3 px-4 flex items-center justify-between text-xs font-semibold text-emerald-950 hover:bg-emerald-100/60 transition shadow-xs"
                >
                  <span className="flex items-center gap-2 font-bold">
                    <span>🏡</span>
                    <span>Demo Consumer (Priya - 9812345601)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                    Ready
                  </span>
                </button>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("WORKER")}
                    className="text-xs text-slate-500 hover:text-[#800020] font-medium"
                  >
                    Looking for gig jobs? Switch to Worker Login →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Privacy Note & Sign Up Link */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              Don&apos;t have an account?{" "}
              <Link
                href={activeRole === "WORKER" ? "/register?role=WORKER" : "/register?role=CONSUMER"}
                className="font-bold text-[#800020] hover:underline"
              >
                Sign up as {activeRole === "WORKER" ? "Worker" : "Consumer"}
              </Link>
            </p>
            <p className="text-[11px] text-slate-400">
              For more information, please see our{" "}
              <Link href="/privacy" className="text-slate-600 font-bold hover:underline">
                Privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      ) : (
        /* Step 2: OTP Verification */
        <div>
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setErrorMessage(null);
              setRoleMismatch(null);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition mb-6 shadow-xs"
            aria-label="Back to credentials"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Heading & Subtitle */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                  activeRole === "WORKER"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                }`}
              >
                {activeRole === "WORKER" ? "👷 Worker Verification" : "🏡 Consumer Verification"}
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
              Verify code
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              Enter the 6-digit code sent to{" "}
              <span className="font-bold text-slate-800">{identifier}</span>.
            </p>
          </div>

          {/* Error Message */}
          {roleMismatch ? (
            <div className="mb-5 rounded-2xl border-2 border-[#800020]/20 bg-rose-50/90 p-4 text-xs text-rose-950 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-[#800020] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-[#800020] font-heading">
                    Account Role Mismatch
                  </h4>
                  <p className="mt-1 text-slate-700 leading-relaxed font-medium">
                    {roleMismatch.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      handleRoleChange(roleMismatch.targetRole);
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white px-3.5 py-2 font-bold text-xs shadow-md transition active:scale-95"
                  >
                    <span>
                      Switch to {roleMismatch.targetRole === "WORKER" ? "Worker Login" : "Consumer Login"} Now
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Demo OTP Banner */}
          {serverOtpNotification && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-amber-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-900">Demo Code:</p>
                  <p className="text-lg font-mono font-black text-amber-950">
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
          )}

          {/* 6-Digit OTP Input */}
          <div className="py-2">
            <OtpInput
              length={6}
              value={otp}
              onComplete={(code) => {
                setOtp(code);
                handleOtpVerify(code);
              }}
              onResend={handleResendOtp}
              loading={loading}
            />
          </div>

          {/* Resend Footer */}
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

      {/* Terms & Privacy Popup Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </div>
  );
}
