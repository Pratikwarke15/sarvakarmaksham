"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Lock,
  Eye,
  EyeOff,
  User,
  Mail,
  Briefcase,
  AlertCircle,
  FileCheck,
  Check,
  MapPin,
  Sparkles,
  Loader2,
  Calendar,
  Navigation,
  Award,
  ChevronRight,
} from "lucide-react";
import { PhoneInput } from "./PhoneInput";
import { OtpInput } from "./OtpInput";
import { DigiLockerDemoFlow } from "@/components/verification/DigiLockerDemoFlow";
import { LegalModal } from "@/components/legal/LegalModal";
import { detectLiveLocation } from "@/lib/location";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/providers/ToastProvider";
import { getRoleDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type RegisterStep =
  | "role"
  | "name"
  | "mobile"
  | "mobile_otp"
  | "email"
  | "email_otp"
  | "password"
  | "location"
  | "identity"
  | "complete";

const SKILL_OPTIONS = [
  "Electrical",
  "Plumbing",
  "Carpentry",
  "Painting",
  "Cleaning",
  "AC Repair",
  "Appliance Repair",
  "Transport & Logistics",
];

export function EnhancedRegisterFlow() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { toast } = useToast();

  const [step, setStep] = useState<RegisterStep>("role");
  const [role, setRole] = useState<"CONSUMER" | "WORKER">("CONSUMER");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Identity / DigiLocker Demo
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [digilockerConsent, setDigilockerConsent] = useState(true);
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [digilockerRef, setDigilockerRef] = useState<string | null>(null);
  const [digilockerModalOpen, setDigilockerModalOpen] = useState(false);
  const [digilockerVerifying, setDigilockerVerifying] = useState(false);

  // Profile Details (DOB, Location, Skills)
  const [dob, setDob] = useState("1994-08-15");
  const [skillCertificate, setSkillCertificate] = useState("");

  // Legal Modal
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy">("terms");

  // Worker Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(2);

  // Consumer Address & Location
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("Pune");
  const [pincode, setPincode] = useState("411005");
  const [latitude, setLatitude] = useState<number | null>(18.5204);
  const [longitude, setLongitude] = useState<number | null>(73.8567);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Prevent background scrolling when DigiLocker modal is open
  useEffect(() => {
    if (digilockerModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [digilockerModalOpen]);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  // Simulated Push Notification for Demo OTPs
  const [demoOtpNotification, setDemoOtpNotification] = useState<{
    type: "SMS" | "EMAIL";
    code: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlRole = new URLSearchParams(window.location.search).get("role")?.toUpperCase();
      if (urlRole === "WORKER" || urlRole === "CONSUMER") {
        setRole(urlRole as "WORKER" | "CONSUMER");
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((step === "mobile_otp" || step === "email_otp") && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, countdown]);

  const triggerPushBanner = (type: "SMS" | "EMAIL", code: string) => {
    setDemoOtpNotification({ type, code });
    setTimeout(() => {
      setDemoOtpNotification((prev) => (prev?.code === code ? null : prev));
    }, 20000);
  };

  const handleRoleSelect = (selectedRole: "CONSUMER" | "WORKER") => {
    setRole(selectedRole);
    setStep("name");
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter your legal name (at least 2 characters)");
      return;
    }
    setErrorMessage(null);
    setStep("mobile");
  };

  const handleSendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const avail = await apiPost<{ success: boolean; data: { phoneAvailable: boolean } }>(
        "/auth/check-availability",
        { phone: cleanPhone }
      );
      if (avail.success && !avail.data.phoneAvailable) {
        setErrorMessage("This mobile number is already registered. Please log in instead.");
        return;
      }

      const res = await apiPost<{
        success: boolean;
        data?: { otp?: string; expiresAt?: string };
        error?: string;
      }>("/auth/send-otp", { phone: cleanPhone });

      if (res.success && res.data) {
        if (res.data.otp) {
          triggerPushBanner("SMS", res.data.otp);
        }
        setCountdown(30);
        setStep("mobile_otp");
        toast({ title: "Mobile Verification Code Sent!", variant: "success" });
      } else {
        setErrorMessage(res.error || "Failed to send mobile OTP");
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || "Error connecting to verification server");
    } finally {
      setLoading(false);
    }
  };

  const verifyingMobileRef = useRef(false);
  const handleVerifyMobileOtp = async (code: string) => {
    if (loading || verifyingMobileRef.current) return;
    verifyingMobileRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { apiPost } = await import("@/lib/api");
      const cleanPhone = phone.replace(/\D/g, "").slice(-10);
      const res = await apiPost<{
        success: boolean;
        data?: { verified: boolean };
        error?: string;
      }>("/auth/verify-otp", { phone: cleanPhone, otp: code });

      if (res.success) {
        setErrorMessage(null);
        setDemoOtpNotification(null);
        toast({ title: "Mobile Number Verified!", variant: "success" });
        setStep("email");
      } else {
        setErrorMessage(res.error || "Invalid mobile OTP");
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || "Invalid OTP code");
    } finally {
      setLoading(false);
      verifyingMobileRef.current = false;
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { apiPost } = await import("@/lib/api");
      const avail = await apiPost<{ success: boolean; data: { emailAvailable: boolean } }>(
        "/auth/check-availability",
        { email: cleanEmail }
      );
      if (avail.success && !avail.data.emailAvailable) {
        setErrorMessage("This email is already in use by another account.");
        return;
      }

      const res = await apiPost<{
        success: boolean;
        data?: { otp?: string };
        error?: string;
      }>("/auth/send-email-otp", { email: cleanEmail });

      if (res.success && res.data) {
        if (res.data.otp) {
          triggerPushBanner("EMAIL", res.data.otp);
        }
        setCountdown(30);
        setStep("email_otp");
        toast({ title: "Email Verification Code Sent!", variant: "success" });
      } else {
        setErrorMessage(res.error || "Failed to generate email verification code");
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || "Network error generating email OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyingEmailRef = useRef(false);
  const handleVerifyEmailOtp = async (code: string) => {
    if (loading || verifyingEmailRef.current) return;
    verifyingEmailRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      const { apiPost } = await import("@/lib/api");
      const cleanEmail = email.trim().toLowerCase();
      const res = await apiPost<{
        success: boolean;
        data?: { verified: boolean };
        error?: string;
      }>("/auth/verify-email-otp", { email: cleanEmail, otp: code });

      if (res.success) {
        setErrorMessage(null);
        setDemoOtpNotification(null);
        toast({ title: "Email Verified!", variant: "success" });
        setStep("password");
      } else {
        setErrorMessage(res.error || "Invalid email OTP");
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || "Invalid email OTP code");
    } finally {
      setLoading(false);
      verifyingEmailRef.current = false;
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    setErrorMessage(null);
    setStep("location");
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streetAddress || streetAddress.trim().length < 3) {
      setErrorMessage("Please enter or detect your colony / street address");
      return;
    }
    setErrorMessage(null);
    setStep("identity");
  };

  // Personalized Greeting & Guidance Note Banner
  const firstName = name.trim().split(" ")[0] || name.trim();
  const renderGuidanceBanner = (stepTag: string, note: string) => {
    if (!firstName) return null;
    return (
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#800020]/5 to-transparent border border-amber-500/20 p-2.5 sm:p-3 flex items-start gap-2.5 shadow-2xs">
        <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-xl bg-[#800020] text-white flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0 mt-0.5 shadow-xs">
          {firstName.charAt(0).toUpperCase()}
        </div>
        <div className="text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
            <span>Hello, {firstName}!</span>
            <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/90 px-1.5 py-0.2 rounded-md">
              {stepTag}
            </span>
          </div>
          <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
            {note}
          </p>
        </div>
      </div>
    );
  };

  const handleAadhaarChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setAadhaarInput(formatted);
  };

  const handleDigiLockerSuccess = (data: {
    digilockerRef: string;
    aadhaarNumber?: string;
    name?: string;
    dob?: string;
    address?: string;
    skillCertificate?: string;
  }) => {
    setIsAadhaarVerified(true);
    setDigilockerRef(data.digilockerRef);
    if (data.name) setName(data.name);
    if (data.dob) setDob(data.dob);
    if (data.address) setStreetAddress(data.address);
    if (data.aadhaarNumber) setAadhaarInput(data.aadhaarNumber);
    if (data.skillCertificate) setSkillCertificate(data.skillCertificate);
    setDigilockerModalOpen(false);
    toast({
      title: "DigiLocker Authorization Successful!",
      description: `Verified credentials for ${data.name || "citizen"} imported.`,
      variant: "success",
    });
  };

  const confirmDigiLockerAuth = () => {
    setDigilockerModalOpen(true);
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    setErrorMessage(null);
    try {
      const loc = await detectLiveLocation();
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      if (loc.streetAddress) {
        setStreetAddress(loc.streetAddress);
      }
      if (loc.city) {
        setCity(loc.city);
      }
      if (loc.pincode) {
        setPincode(loc.pincode);
      }

      if (loc.isApproximate) {
        toast({
          title: "Approximate Location Detected",
          description: "Please specify your exact colony / society / street name.",
          variant: "default",
        });
      } else {
        toast({
          title: "📍 Precise Colony Location Detected!",
          description: loc.streetAddress
            ? `${loc.streetAddress}, ${loc.city}`
            : loc.displayName,
          variant: "success",
        });
      }
    } catch {
      toast({
        title: "GPS Detection Inactive",
        description: "Please enter your Colony / Street address manually.",
        variant: "default",
      });
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAadhaarVerified) {
      setErrorMessage("Please complete DigiLocker / Aadhaar identity verification to continue.");
      return;
    }

    if (role === "WORKER" && selectedSkills.length === 0) {
      setErrorMessage("Please select at least one gig service skill.");
      return;
    }

    if (role === "CONSUMER" && (!streetAddress || streetAddress.trim().length < 5)) {
      setErrorMessage("Please enter your complete service address.");
      return;
    }

    setLoading(true);

    try {
      const { apiPost } = await import("@/lib/api");
      const cleanPhone = phone.replace(/\D/g, "");
      const cleanAadhaar = aadhaarInput.replace(/\s/g, "");
      const fullAddress = `${streetAddress}, ${city} - ${pincode}`;

      const payload = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim().toLowerCase(),
        password,
        role,
        skillTags: role === "WORKER" ? selectedSkills : undefined,
        experienceYears: role === "WORKER" ? experienceYears : undefined,
        aadhaarNumber: cleanAadhaar,
        aadhaarName: name.trim(),
        digilockerRef: digilockerRef || `DL-UIDAI-${Date.now().toString().slice(-6)}`,
        latitude: role === "CONSUMER" ? latitude || 28.6145 : undefined,
        longitude: role === "CONSUMER" ? longitude || 77.2095 : undefined,
        defaultAddress: role === "CONSUMER" ? fullAddress : undefined,
      };

      const res = await apiPost<{
        success: boolean;
        data?: { user: any; token: string };
        error?: string;
      }>("/auth/register", payload);

      if (res.success && res.data) {
        login(res.data.user, res.data.token);
        setStep("complete");
        toast({
          title: "Account Created!",
          description: "Welcome to Sarvakarmakshamah.",
          variant: "success",
        });

        setTimeout(() => {
          const target = getRoleDashboardPath(res.data!.user.role);
          router.push(target);
        }, 1500);
      } else {
        setErrorMessage(res.error || "Registration failed. Please check your details.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Registration error occurred";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Demo Notification Banner */}
      {demoOtpNotification && (
        <div
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-top-6 duration-300"
        >
          <div className="flex items-center justify-between rounded-2xl bg-[#0F172A]/95 p-3.5 text-white shadow-xl border border-slate-700">
            <div>
              <p className="text-[11px] text-slate-400">
                {demoOtpNotification.type === "SMS" ? "Mobile Demo Code" : "Email Demo Code"}:
              </p>
              <p className="text-base font-mono font-bold text-amber-300">
                {demoOtpNotification.code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (step === "mobile_otp") {
                  setMobileOtp(demoOtpNotification.code);
                  handleVerifyMobileOtp(demoOtpNotification.code);
                } else if (step === "email_otp") {
                  setEmailOtp(demoOtpNotification.code);
                  handleVerifyEmailOtp(demoOtpNotification.code);
                }
              }}
              className="rounded-xl bg-[#800020] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#68001a] transition"
            >
              Auto-Fill
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: ROLE */}
      {step === "role" && (
        <div>
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-6 shadow-xs"
            aria-label="Back to home"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
              Sign up
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              By signing up, you agree to our{" "}
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

          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleRoleSelect("CONSUMER")}
              className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                role === "CONSUMER"
                  ? "border-[#800020] bg-rose-50/40 ring-1 ring-[#800020]"
                  : "border-slate-200/90 bg-[#F8F9FA] hover:border-slate-300"
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">Service Consumer</h3>
                <p className="text-xs text-slate-500 mt-0.5">Book certified local co-op gig workers</p>
              </div>
              {role === "CONSUMER" && (
                <div className="h-6 w-6 rounded-full bg-[#800020] text-white flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("WORKER")}
              className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                role === "WORKER"
                  ? "border-[#800020] bg-rose-50/40 ring-1 ring-[#800020]"
                  : "border-slate-200/90 bg-[#F8F9FA] hover:border-slate-300"
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cooperative Worker</h3>
                <p className="text-xs text-slate-500 mt-0.5">Earn with capped ≤5% commission & dividends</p>
              </div>
              {role === "WORKER" && (
                <div className="h-6 w-6 rounded-full bg-[#800020] text-white flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep("name")}
            className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all"
          >
            Connect
          </button>

          <p className="mt-8 text-center text-xs text-slate-500 font-medium">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#800020] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      )}

      {/* STEP 2: NAME */}
      {step === "name" && (
        <form onSubmit={handleNameSubmit}>
          <button
            type="button"
            onClick={() => setStep("role")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
              Your name & details
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Please enter your full legal name and date of birth as per official records.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Legal Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. Ramesh Sharma"
                className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Required for matching your official DigiLocker UIDAI verification.
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all mt-4"
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: MOBILE */}
      {step === "mobile" && (
        <form onSubmit={handleSendMobileOtp}>
          <button
            type="button"
            onClick={() => setStep("name")}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-4 sm:mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Mobile number
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              We will send you a 6-digit verification code.
            </p>
          </div>

          {renderGuidanceBanner(
            "Mobile Verification",
            "Enter your 10-digit phone number. We will send a secure SMS code to verify your device."
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <PhoneInput
                value={phone}
                onChange={(val) => {
                  setPhone(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                error={undefined}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all mt-4 disabled:opacity-60"
            >
              {loading ? "Sending Code..." : "Connect"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3b: MOBILE OTP */}
      {step === "mobile_otp" && (
        <div>
          <button
            type="button"
            onClick={() => setStep("mobile")}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-4 sm:mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Verify mobile
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Enter the 6-digit code sent to +91 {phone}.
            </p>
          </div>

          {renderGuidanceBanner(
            "Enter Code",
            `We sent a 6-digit verification code to +91 ${phone}. Enter it below to confirm.`
          )}

          <div className="py-2">
            <OtpInput
              length={6}
              value={mobileOtp}
              onComplete={(code) => {
                setMobileOtp(code);
                handleVerifyMobileOtp(code);
              }}
              onResend={() => {
                setMobileOtp("");
                handleSendMobileOtp({ preventDefault: () => {} } as any);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* STEP 4: EMAIL */}
      {step === "email" && (
        <form onSubmit={handleSendEmailOtp}>
          <button
            type="button"
            onClick={() => setStep("mobile")}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-4 sm:mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Your email
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              We will send you a verification code to confirm your email.
            </p>
          </div>

          {renderGuidanceBanner(
            "Official Email",
            "Enter your email for cooperative receipts, job notices, and account recovery."
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="your@email.com"
                className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all mt-4 disabled:opacity-60"
            >
              {loading ? "Sending Code..." : "Connect"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4b: EMAIL OTP */}
      {step === "email_otp" && (
        <div>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-4 sm:mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Verify email
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Enter the 6-digit code sent to {email}.
            </p>
          </div>

          {renderGuidanceBanner(
            "Verify Inbox",
            `A 6-digit code has been sent to ${email}. Enter it below to confirm.`
          )}

          <div className="py-2">
            <OtpInput
              length={6}
              value={emailOtp}
              onComplete={(code) => {
                setEmailOtp(code);
                handleVerifyEmailOtp(code);
              }}
              onResend={() => {
                setEmailOtp("");
                handleSendEmailOtp({ preventDefault: () => {} } as any);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* STEP 5: PASSWORD */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit}>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-4 sm:mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Create password
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Must be at least 6 characters.
            </p>
          </div>

          {renderGuidanceBanner(
            "Account Security",
            "Choose a strong password with at least 6 characters to safeguard your account."
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="At least 6 characters"
                  className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 pl-4 pr-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
                  autoFocus
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
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Re-enter your password"
                className="w-full rounded-2xl bg-[#F8F9FA] border border-slate-200/90 py-3.5 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={password.length < 6 || password !== confirmPassword}
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all mt-4 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* STEP 6: SERVICE LOCATION & DETAILS (Cleanly separated for mobile view!) */}
      {step === "location" && (
        <form onSubmit={handleLocationSubmit}>
          <button
            type="button"
            onClick={() => setStep("password")}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-4 sm:mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              Service location
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Enter your colony/society and city for localized cooperative matching.
            </p>
          </div>

          {renderGuidanceBanner(
            "Service Location",
            "Tell us your colony and city so we can match you with nearby cooperative jobs and verified local members."
          )}

          <div className="space-y-4">
            {/* Live GPS Detection Button */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  {role === "WORKER" ? "Service Operating Area" : "Service Address / Colony"}
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detectingLocation}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#800020] hover:text-[#68001a] transition hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {detectingLocation ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Detecting Colony GPS...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3.5 w-3.5" />
                      <span>📍 Detect Live Location</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Colony / Society / Flat / Street Name
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. Mayur Colony, Kothrud or Flat 4, Sharda Niwas"
                  className="w-full rounded-xl bg-[#F8F9FA] border border-slate-200/90 py-2.5 px-3.5 text-xs text-slate-900 focus:bg-white focus:border-[#800020] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City (e.g. Pune)"
                    className="w-full rounded-xl bg-[#F8F9FA] border border-slate-200/90 py-2 px-3 text-xs text-slate-900 focus:bg-white focus:border-[#800020] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="PIN Code (e.g. 411038)"
                    className="w-full rounded-xl bg-[#F8F9FA] border border-slate-200/90 py-2 px-3 text-xs text-slate-900 focus:bg-white focus:border-[#800020] outline-none"
                  />
                </div>
              </div>

              {/* Worker Skills & Optional Certificate */}
              {role === "WORKER" && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Your Skills
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SKILL_OPTIONS.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              setSelectedSkills((prev) =>
                                isSelected ? prev.filter((s) => s !== skill) : [...prev, skill]
                              );
                            }}
                            className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition border ${
                              isSelected
                                ? "bg-[#800020] text-white border-[#800020]"
                                : "bg-[#F8F9FA] text-slate-700 border-slate-200"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Vocational Certificate (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSkillCertificate("Government ITI Certified Wireman - Grade I (Ref: DL-ITI-2025)")
                        }
                        className="text-[10px] font-bold text-[#800020] hover:underline"
                      >
                        + Attach Demo ITI Certificate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={skillCertificate}
                      onChange={(e) => setSkillCertificate(e.target.value)}
                      placeholder="e.g. ITI Electrician Certificate (Optional)"
                      className="w-full rounded-xl bg-[#F8F9FA] border border-slate-200/90 py-2 px-3 text-xs text-slate-900 focus:bg-white focus:border-[#800020] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 text-sm sm:text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Next: DigiLocker Verification</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 7: IDENTITY & DIGILOCKER AUTHORIZATION (Fits cleanly on mobile screen!) */}
      {step === "identity" && (
        <form onSubmit={handleFinalSubmit}>
          <button
            type="button"
            onClick={() => setStep("location")}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition mb-4 sm:mb-6 shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              DigiLocker authorization
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Ministry of Electronics & IT (MeitY) • National e-KYC
            </p>
          </div>

          {renderGuidanceBanner(
            "DigiLocker Authorization",
            "Final step! Authorize your official government Aadhaar credentials securely via DigiLocker."
          )}

          <div className="space-y-4">
            {/* 1. Submitted Member Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#800020]" />
                  <span>Citizen Registration Details</span>
                </span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                  {role} Account
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Legal Name</span>
                  <span className="font-bold text-slate-900 truncate block">{name || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date of Birth</span>
                  <span className="font-bold text-slate-900">{dob}</span>
                </div>
              </div>

              <div className="text-xs pt-1.5 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px]">Colony & Location</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">
                  {[streetAddress, city, pincode].filter(Boolean).join(", ")}
                </span>
              </div>
            </div>

            {/* 2. Connect with DigiLocker Gateway Box */}
            <div className="rounded-2xl border border-[#002F6C]/25 bg-gradient-to-br from-[#002F6C]/5 via-white to-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-[#002F6C] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    DL
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 font-heading">
                      DigiLocker Identity Verification
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Government of India • UIDAI e-KYC
                    </p>
                  </div>
                </div>
                {isAadhaarVerified ? (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5">
                    Required Step
                  </span>
                )}
              </div>

              {!isAadhaarVerified ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Connect with DigiLocker to authenticate your identity. Your legal name, age, and location
                    above will be authorized and cross-matched with your official Aadhaar credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setDigilockerModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#002F6C] hover:bg-[#00224d] text-white py-3 text-xs sm:text-sm font-bold shadow-md shadow-[#002F6C]/20 transition"
                  >
                    <span>Connect with DigiLocker</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1 text-xs text-emerald-900">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Aadhaar Identity Successfully Verified</span>
                      </span>
                      <span className="font-mono text-[10px] text-emerald-700">{digilockerRef}</span>
                    </div>
                    <p className="text-[10px] text-emerald-800">
                      Masked UID: <span className="font-mono font-bold">{aadhaarInput ? `XXXX-XXXX-${aadhaarInput.replace(/\D/g, "").slice(-4)}` : "XXXX-XXXX-7777"}</span> • UIDAI Audit Match Confirmed
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDigilockerModalOpen(true)}
                    className="text-[11px] font-bold text-[#002F6C] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Re-verify or change persona</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Final Submission Button */}
            <div>
              <button
                type="submit"
                disabled={loading || !isAadhaarVerified}
                className="w-full rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white py-3.5 sm:py-4 text-sm sm:text-base font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : isAadhaarVerified ? (
                  <>
                    <span>Complete Registration & Join</span>
                    <Check className="h-5 w-5" />
                  </>
                ) : (
                  <span>Connect with DigiLocker to Continue</span>
                )}
              </button>
              {!isAadhaarVerified && (
                <p className="text-center text-[10px] text-slate-400 mt-1.5 font-medium">
                  Please click &quot;Connect with DigiLocker&quot; above to authorize your credentials.
                </p>
              )}
            </div>
          </div>
        </form>
      )}

      {/* STEP 8: COMPLETE */}
      {step === "complete" && (
        <div className="py-8 sm:py-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 font-heading mb-2">
            Account Created!
          </h2>
          {renderGuidanceBanner(
            "Account Verified",
            `Welcome to Sarvakarmakshamah, ${firstName || "Member"}! Your account is verified and active. Directing you to your workspace...`
          )}
          <p className="text-xs text-slate-500 mt-2">
            Welcome to Sarvakarmakshamah. Redirecting to your dashboard...
          </p>
        </div>
      )}

      {/* AUTHENTIC DIGILOCKER GATEWAY MODAL */}
      {digilockerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm overflow-hidden">
          <div className="w-full max-w-lg max-h-[94vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <DigiLockerDemoFlow
              userRole={role}
              initialData={{
                name,
                dob,
                address: [
                  streetAddress,
                  city,
                  pincode ? `- ${pincode}` : "",
                ]
                  .filter(Boolean)
                  .join(", ")
                  .replace(", -", " -"),
                skills: selectedSkills,
                skillCertificate,
              }}
              onSuccess={handleDigiLockerSuccess}
              onCancel={() => setDigilockerModalOpen(false)}
            />
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
