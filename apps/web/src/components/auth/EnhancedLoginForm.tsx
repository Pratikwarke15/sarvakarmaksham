"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Phone,
  Lock,
  KeyRound,
  CheckCircle2,
  MapPin,
  Bell,
  Loader2,
} from "lucide-react";
import { OtpInput } from "./OtpInput";
import { LegalModal } from "@/components/legal/LegalModal";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/providers/ToastProvider";
import { getRoleDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { notifyOtp } from "@/lib/notifications";

export interface EnhancedLoginFormProps {
  initialRole?: "WORKER" | "CONSUMER";
}

// Top hero images for the dynamic half-screen display
const HERO_SLIDES = [
  {
    image: "/images/gig_workers_hero.jpg",
    title: "BHARAT'S #1 COOPERATIVE GIG APP",
    subtitle: "Fair Earnings • 100% Escrow Protection • Dignified Work",
  },
  {
    image: "/images/food_delivery_tech.jpg",
    title: "DELIVERY & TECH FREELANCERS",
    subtitle: "Instant daily payouts and mutual support groups",
  },
  {
    image: "/images/artisan_electrician_home.jpg",
    title: "EXPERT ARTISANS & TRADESPEOPLE",
    subtitle: "Certified electricians, carpenters & home service partners",
  },
];

export function EnhancedLoginForm({ initialRole }: EnhancedLoginFormProps = {}) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { toast } = useToast();

  // 1. Splash Screen State (Maroon screen with Logo)
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  // 2. Multi-step Zomato Flow: "role_select" -> "phone" -> "password" -> "otp"
  const [flowStep, setFlowStep] = useState<"role_select" | "phone" | "password" | "otp">(
    initialRole ? "phone" : "role_select"
  );

  const [selectedRole, setSelectedRole] = useState<"WORKER" | "CONSUMER" | null>(
    initialRole || null
  );

  const [activeRole, setActiveRole] = useState<"WORKER" | "CONSUMER">(() => {
    if (initialRole) return initialRole;
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("role");
      if (p?.toUpperCase() === "WORKER") return "WORKER";
      if (p?.toUpperCase() === "CONSUMER") return "CONSUMER";
    }
    return "CONSUMER";
  });

  const [heroIndex, setHeroIndex] = useState(0);

  // Input states
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sending OTP loading dialog
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Role Mismatch Error State for Cross-Login Prevention
  const [roleMismatch, setRoleMismatch] = useState<{
    targetRole: "WORKER" | "CONSUMER";
    message: string;
  } | null>(null);

  // Legal modal state
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy">("terms");

  // Push Notification state
  const [serverOtpNotification, setServerOtpNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Resend countdown
  const [countdown, setCountdown] = useState(17);

  // Splash Screen Timer: 1.2s maroon screen, then fade into app
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFading(true);
    }, 1100);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Top hero carousel auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (flowStep === "otp" && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [flowStep, countdown]);

  const handleRoleSelection = (role: "WORKER" | "CONSUMER") => {
    setActiveRole(role);
    setSelectedRole(role);
    setErrorMessage(null);
    setRoleMismatch(null);
    setHeroIndex(role === "WORKER" ? 0 : 2);
    setFlowStep("phone");
  };

  const confirmRoleAndProceed = () => {
    if (!selectedRole) return;
    setActiveRole(selectedRole);
    setErrorMessage(null);
    setRoleMismatch(null);
    setHeroIndex(selectedRole === "WORKER" ? 0 : 2);
    setFlowStep("phone");
  };

  const triggerPushNotification = (receivedOtp: string) => {
    setServerOtpNotification(receivedOtp);
    setShowNotification(true);
    notifyOtp(receivedOtp, "Login");
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

  const checkCrossRoleError = (msg: string) => {
    if (msg.includes("registered as a Consumer") || msg.includes("Consumer Login page")) {
      setRoleMismatch({
        targetRole: "CONSUMER",
        message: "This mobile number is registered as a Consumer. Please switch to the Consumer portal.",
      });
    } else if (msg.includes("registered as a Worker") || msg.includes("Worker Login page")) {
      setRoleMismatch({
        targetRole: "WORKER",
        message: "This mobile number is registered as a Worker. Please switch to the Worker portal.",
      });
    } else {
      setErrorMessage(msg);
    }
  };

  // Step 1: Submit Phone Number -> Advance to Password
  const handlePhoneSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }
    setErrorMessage(null);
    setRoleMismatch(null);
    setHeroIndex(1);
    setFlowStep("password");
  };

  // Step 2: Submit Password -> Validate credentials & Request Server OTP
  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) {
      setErrorMessage("Please enter your password");
      return;
    }

    setLoading(true);
    setIsSendingOtp(true);
    setErrorMessage(null);
    setRoleMismatch(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const clean = phone.replace(/\D/g, "").slice(-10);

      const res = await apiPost<{
        success: boolean;
        data?: { requiresOtp: boolean; phone: string; otp?: string; expiresAt: string };
        error?: string;
        message?: string;
      }>("/auth/login-step1", {
        identifier: clean,
        password,
        expectedRole: activeRole,
      });

      if (res.success && res.data) {
        setCountdown(17);
        setHeroIndex(2);
        setFlowStep("otp");
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
      setIsSendingOtp(false);
    }
  };

  // Step 3: Verify OTP -> Complete Login
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
      const targetPhone = phone.replace(/\D/g, "").slice(-10);
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
          title: `Welcome, ${res.data.user.name || "Member"}!`,
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
      const clean = phone.replace(/\D/g, "").slice(-10);
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
        setCountdown(17);
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
    <div className="relative w-full min-h-screen bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      {/* ======================================================== */}
      {/* 1. MAROON SPLASH SCREEN (ZOMATO STYLE WITH LOGO)         */}
      {/* ======================================================== */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#800020] transition-opacity duration-400 ease-out ${
            splashFading ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center gap-4 animate-scale-up">
            <div className="h-28 w-28 rounded-3xl bg-white p-3 shadow-2xl flex items-center justify-center border-2 border-white/20">
              <img
                src="/images/logo.png"
                alt="सर्वकर्मक्षमः"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-center text-white mt-1">
              <h1 className="text-3xl font-black tracking-tight font-heading">
                सर्वकर्मक्षमः<span className="text-amber-300">.</span>
              </h1>
              <p className="text-xs uppercase tracking-widest text-rose-200 mt-1 font-semibold">
                Bharat&apos;s Cooperative Gig Platform
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTAINER: HALF-SCREEN SPLIT (TOP HERO + BOTTOM UI) */}
      {/* ======================================================== */}
      <div className="w-full max-w-md min-h-screen bg-white shadow-2xl flex flex-col justify-between overflow-hidden relative">
        {/* ----------------- TOP HALF: HERO IMAGE ----------------- */}
        <div className="relative h-[44vh] sm:h-[48vh] w-full bg-slate-950 overflow-hidden shrink-0 select-none">
          <Image
            src={HERO_SLIDES[heroIndex].image}
            alt="Sarvakarmakshamah Gig Workers"
            fill
            priority
            className="object-cover object-center transition-all duration-700 brightness-[0.80]"
          />
          {/* Subtle gradient vignette to blend with content */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Top Floating Navigation */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            {flowStep !== "role_select" ? (
              <button
                type="button"
                onClick={() => {
                  if (flowStep === "otp") setFlowStep("password");
                  else if (flowStep === "password") setFlowStep("phone");
                  else if (flowStep === "phone") setFlowStep("role_select");
                  setErrorMessage(null);
                  setRoleMismatch(null);
                }}
                className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition shadow-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <Link
                href="/"
                className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition shadow-sm"
                title="Back to Landing Page"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            )}
            <div />
          </div>

          {/* Hero Slide Titles */}
          <div className="absolute bottom-5 left-5 right-5 z-10 text-white">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#800020] text-[10px] font-extrabold uppercase tracking-wider mb-1.5 shadow-sm">
              सर्वकर्मक्षमः
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase font-heading drop-shadow-md">
              {HERO_SLIDES[heroIndex].title}
            </h2>
            <p className="text-xs text-slate-200 mt-1 line-clamp-1 drop-shadow-sm font-medium">
              {HERO_SLIDES[heroIndex].subtitle}
            </p>
          </div>
        </div>

        {/* ----------------- BOTTOM HALF: DYNAMIC FLOW ----------------- */}
        <div className="flex-1 bg-white p-5 sm:p-6 flex flex-col justify-between -mt-3 rounded-t-3xl relative z-20 shadow-[0_-8px_25px_rgba(0,0,0,0.12)]">
          {/* STEP 1: INITIAL ROLE SELECTION (Explicit GO button on selection) */}
          {flowStep === "role_select" && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-fade-in">
              <div className="space-y-3.5">
                <div className="text-center mb-1">
                  <h3 className="text-lg font-black text-slate-900 font-heading">
                    Welcome to सर्वकर्मक्षमः
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Please choose your portal to continue
                  </p>
                </div>

                {/* Option 1: Worker Card */}
                <button
                  type="button"
                  id="select-worker-btn"
                  onClick={() => setSelectedRole("WORKER")}
                  className={`w-full py-4 px-4 sm:px-5 rounded-2xl border-2 transition-all flex items-center justify-between active:scale-[0.99] cursor-pointer ${
                    selectedRole === "WORKER"
                      ? "border-[#800020] bg-rose-50/60 shadow-md ring-2 ring-[#800020]/20"
                      : "border-slate-200 bg-[#FBFBFC] hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-100/70 border border-rose-200/60 flex items-center justify-center text-xl shrink-0">
                      👷
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-black tracking-wide text-slate-900">I AM A WORKER</span>
                      <span className="block text-[11px] text-slate-500 font-normal">
                        Delivery, Electrician, Technician, Freelancer
                      </span>
                    </div>
                  </div>
                  {selectedRole === "WORKER" ? (
                    <div className="h-6 w-6 rounded-full bg-[#800020] text-white flex items-center justify-center shadow-xs shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                </button>

                {/* Option 2: Consumer Card below Worker */}
                <button
                  type="button"
                  id="select-consumer-btn"
                  onClick={() => setSelectedRole("CONSUMER")}
                  className={`w-full py-4 px-4 sm:px-5 rounded-2xl border-2 transition-all flex items-center justify-between active:scale-[0.99] cursor-pointer ${
                    selectedRole === "CONSUMER"
                      ? "border-[#800020] bg-rose-50/60 shadow-md ring-2 ring-[#800020]/20"
                      : "border-slate-200 bg-[#FBFBFC] hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-100/70 border border-rose-200/60 flex items-center justify-center text-xl shrink-0">
                      🏡
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-black tracking-wide text-slate-900">I AM A CONSUMER</span>
                      <span className="block text-[11px] text-slate-500 font-normal">
                        Hire verified artisans & home services
                      </span>
                    </div>
                  </div>
                  {selectedRole === "CONSUMER" ? (
                    <div className="h-6 w-6 rounded-full bg-[#800020] text-white flex items-center justify-center shadow-xs shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                </button>
              </div>

              {/* Bottom GO Button that arrives upon selection */}
              <div className="pt-4">
                {selectedRole ? (
                  <button
                    type="button"
                    id="go-role-btn"
                    onClick={confirmRoleAndProceed}
                    className="w-full py-4 px-5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white font-black text-sm shadow-md shadow-[#800020]/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer animate-in slide-in-from-bottom-2 duration-200"
                  >
                    <span>GO as {selectedRole === "WORKER" ? "Worker" : "Consumer"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="py-3.5 text-center text-xs text-slate-400 font-medium">
                    Tap Worker or Consumer above to proceed
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PHONE NUMBER ENTRY */}
          {flowStep === "phone" && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fade-in">
              <div>
                <div className="mb-3.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Log in or sign up
                  </span>
                </div>

                {roleMismatch && (
                  <div className="mb-3 p-3 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-[#800020] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Role Mismatch</span>
                      <span>{roleMismatch.message}</span>
                      <button
                        type="button"
                        onClick={() => handleRoleSelection(roleMismatch.targetRole)}
                        className="mt-1.5 block font-bold text-[#800020] underline"
                      >
                        Switch to {roleMismatch.targetRole} Portal
                      </button>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handlePhoneSubmit} className="space-y-3.5">
                  <div className="flex rounded-2xl border border-slate-300 focus-within:border-[#800020] focus-within:ring-2 focus-within:ring-[#800020]/15 overflow-hidden transition bg-[#FBFBFC]">
                    <div className="flex items-center gap-1.5 px-3 border-r border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 shrink-0 select-none">
                      <span className="text-base">🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        if (errorMessage) setErrorMessage(null);
                        if (roleMismatch) setRoleMismatch(null);
                      }}
                      placeholder="Enter Phone Number"
                      className="w-full py-3.5 px-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none bg-transparent"
                      autoFocus
                    />
                    {phone && (
                      <button
                        type="button"
                        onClick={() => setPhone("")}
                        className="p-3 text-slate-400 hover:text-slate-700 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Remember my login for faster sign-in checkbox */}
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberLogin}
                      onChange={(e) => setRememberLogin(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#800020] cursor-pointer"
                    />
                    <span>Remember my login for faster sign-in</span>
                  </label>

                  {/* Primary Continue Button */}
                  <button
                    type="submit"
                    id="phone-continue-btn"
                    disabled={phone.length < 10}
                    className="w-full py-3.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white font-extrabold text-sm shadow-md shadow-[#800020]/25 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue
                  </button>
                </form>
              </div>

              {/* Bottom Sign-up Redirect */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={activeRole === "WORKER" ? "/register?role=WORKER" : "/register?role=CONSUMER"}
                    className="font-bold text-[#800020] hover:underline"
                  >
                    Sign up as {activeRole === "WORKER" ? "Worker" : "Consumer"}
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: PASSWORD ENTRY */}
          {flowStep === "password" && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fade-in">
              <div>
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900 font-heading">
                      Enter Password
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFlowStep("phone")}
                      className="text-xs font-bold text-[#800020] hover:underline"
                    >
                      Edit Mobile
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Logging in with mobile: <strong className="text-slate-800 font-mono">+91 {phone}</strong>
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Enter account password"
                      className="w-full py-3.5 pl-4 pr-11 rounded-2xl border border-slate-300 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none bg-[#FBFBFC]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Default demo password: <code>password123</code></span>
                    <Link href="/forgot-password" className="text-[#800020] font-bold hover:underline">
                      Forgot?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    id="password-submit-btn"
                    disabled={loading || !password}
                    className="w-full py-3.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white font-extrabold text-sm shadow-md shadow-[#800020]/25 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <span>Proceed to OTP Verification</span>
                    )}
                  </button>
                </form>
              </div>

              {/* Bottom Sign-up Redirect */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  New to सर्वकर्मक्षमः?{" "}
                  <Link
                    href={activeRole === "WORKER" ? "/register?role=WORKER" : "/register?role=CONSUMER"}
                    className="font-bold text-[#800020] hover:underline"
                  >
                    Create a new account
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: OTP VERIFICATION (ZOMATO STYLE NUMERIC DISPLAY) */}
          {flowStep === "otp" && (
            <div className="flex-1 flex flex-col justify-between py-1 animate-fade-in">
              <div>
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900 font-heading">
                      Enter Verification OTP
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFlowStep("phone")}
                      className="text-xs font-bold text-[#800020] hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    We have sent a verification code to{" "}
                    <strong className="text-slate-800 font-mono">+91 {phone}</strong>
                  </p>
                </div>

                {/* Live Demo OTP Banner */}
                {serverOtpNotification && (
                  <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                        Server OTP Code:
                      </span>
                      <span className="font-mono text-base font-black tracking-widest text-[#800020]">
                        {serverOtpNotification}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => autoFillOtp(serverOtpNotification)}
                      className="px-3 py-1.5 rounded-xl bg-[#800020] text-white text-xs font-bold hover:bg-[#68001a] transition"
                    >
                      Auto-Fill
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 6-box OTP Input */}
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

                {/* Resend Countdown */}
                <div className="text-center mt-3">
                  <p className="text-xs text-slate-500">
                    Didn&apos;t get the OTP?{" "}
                    {countdown > 0 ? (
                      <span className="font-bold text-slate-700">Resend SMS in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="font-bold text-[#800020] hover:underline"
                      >
                        Resend SMS Now
                      </button>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setFlowStep("phone")}
                  className="text-xs font-bold text-slate-500 hover:text-[#800020] transition"
                >
                  Go back to login methods
                </button>
              </div>
            </div>
          )}

          {/* Legal Footer (Terms of Service / Privacy Policy) */}
          <div className="pt-3 text-center text-[10px] text-slate-400">
            <span>By continuing, you agree to our </span>
            <button
              type="button"
              onClick={() => {
                setLegalModalTab("terms");
                setLegalModalOpen(true);
              }}
              className="text-slate-600 font-semibold hover:underline"
            >
              Terms of Service
            </button>
            <span> • </span>
            <button
              type="button"
              onClick={() => {
                setLegalModalTab("privacy");
                setLegalModalOpen(true);
              }}
              className="text-slate-600 font-semibold hover:underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>


      {/* ======================================================== */}
      {/* "SENDING OTP" DIALOG (MATCHING ZOMATO SCREENSHOT)        */}
      {/* ======================================================== */}
      {isSendingOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs animate-fade-in">
          <div className="rounded-2xl bg-white py-5 px-8 shadow-2xl flex items-center gap-3 border border-slate-100">
            <div className="h-4 w-4 rounded-full border-2 border-[#800020] border-t-transparent animate-spin" />
            <span className="text-sm font-bold text-slate-800">Sending OTP</span>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />
    </div>
  );
}
