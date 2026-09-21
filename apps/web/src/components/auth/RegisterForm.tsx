"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "./PhoneInput";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/providers/ToastProvider";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { getRoleDashboardPath } from "@/lib/utils";
import {
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Navigation,
  Sparkles,
  Lock,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().length(10, "Enter a valid 10-digit phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CONSUMER", "WORKER"]),
  skillTags: z.array(z.string()).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const skillOptions = [
  "Electrical",
  "Plumbing",
  "Cleaning",
  "Transport",
  "Carpentry",
  "Painting",
  "AC Repair",
  "Home Security",
];

export function RegisterForm() {
  const router = useRouter();
  const authLogin = useAuthStore((s) => s.login);
  const { toast } = useToast();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Dummy DigiLocker Aadhaar State (for Consumer)
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [digilockerModalOpen, setDigilockerModalOpen] = useState(false);
  const [digilockerVerifying, setDigilockerVerifying] = useState(false);
  const [digilockerConsent, setDigilockerConsent] = useState(true);
  const [digilockerRef, setDigilockerRef] = useState<string | null>(null);

  // Consumer Accurate Location State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("New Delhi");
  const [pincode, setPincode] = useState("110001");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialRole =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("role")?.toUpperCase() === "WORKER"
      ? "WORKER"
      : "CONSUMER";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
      role: initialRole,
      skillTags: [],
    },
  });

  const phone = watch("phone");
  const role = watch("role");
  const name = watch("name");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const paramRole = new URLSearchParams(window.location.search).get("role")?.toUpperCase();
      if (paramRole === "WORKER" || paramRole === "CONSUMER") {
        setValue("role", paramRole as "WORKER" | "CONSUMER");
      }
    }
  }, [setValue]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill];
      setValue("skillTags", next);
      return next;
    });
  };

  // Format Aadhaar Number with spaces: XXXX XXXX XXXX
  const handleAadhaarChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setAadhaarInput(formatted);
  };

  // Open DigiLocker Verification Modal
  const openDigiLockerModal = () => {
    const cleanAadhaar = aadhaarInput.replace(/\s/g, "");
    if (cleanAadhaar.length !== 12) {
      setErrorMessage("Please enter a valid 12-digit Aadhaar number before verifying.");
      toast({ title: "Enter 12-digit Aadhaar number", variant: "danger" });
      return;
    }
    setErrorMessage(null);
    setDigilockerModalOpen(true);
  };

  // Simulate DigiLocker Government Authorization
  const confirmDigiLockerAuth = () => {
    setDigilockerVerifying(true);
    setTimeout(() => {
      setDigilockerVerifying(false);
      setIsAadhaarVerified(true);
      const ref = `DL-UIDAI-${Date.now().toString().slice(-6)}`;
      setDigilockerRef(ref);
      setDigilockerModalOpen(false);
      toast({
        title: "Aadhaar Verified via DigiLocker!",
        description: "Official identity consent validated with UIDAI.",
        variant: "success",
      });
    }, 1500);
  };

  // Accurate Geolocation Capture
  const detectLocation = () => {
    setDetectingLocation(true);
    if (!navigator.geolocation) {
      setDetectingLocation(false);
      setLatitude(28.6145);
      setLongitude(77.2095);
      setStreetAddress("Connaught Place, Central Delhi");
      toast({ title: "GPS not supported, set to Delhi default", variant: "default" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingLocation(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setStreetAddress((prev) => prev || "Flat 204, Shramik Residential Enclave");
        toast({
          title: "Accurate GPS Location Detected!",
          description: `Coordinates: ${lat}° N, ${lng}° E`,
          variant: "success",
        });
      },
      (err) => {
        setDetectingLocation(false);
        // Graceful fallback coordinates
        setLatitude(28.6145);
        setLongitude(77.2095);
        setStreetAddress((prev) => prev || "Connaught Place, Central Delhi");
        toast({
          title: "Location permission denied",
          description: "Using standard location. You can type your address below.",
          variant: "default",
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);

    // Consumer-specific validations
    if (data.role === "CONSUMER") {
      if (!isAadhaarVerified) {
        setErrorMessage("Aadhaar verification via DigiLocker is required for Consumer registration.");
        toast({ title: "DigiLocker verification required", variant: "danger" });
        return;
      }
      if (!streetAddress || streetAddress.trim().length < 5) {
        setErrorMessage("Please enter your complete service address.");
        toast({ title: "Please provide your address", variant: "danger" });
        return;
      }
    }

    setLoading(true);
    try {
      const { apiPost } = await import("@/lib/api");

      const cleanAadhaar = aadhaarInput.replace(/\s/g, "");
      const fullAddress = `${streetAddress}, ${city} - ${pincode}`;

      const payload = {
        ...data,
        skillTags: data.role === "WORKER" ? selectedSkills : undefined,
        aadhaarNumber: data.role === "CONSUMER" ? cleanAadhaar : undefined,
        aadhaarName: data.role === "CONSUMER" ? data.name : undefined,
        digilockerRef: data.role === "CONSUMER" ? digilockerRef : undefined,
        latitude: data.role === "CONSUMER" ? latitude || 28.6145 : undefined,
        longitude: data.role === "CONSUMER" ? longitude || 77.2095 : undefined,
        defaultAddress: data.role === "CONSUMER" ? fullAddress : undefined,
      };

      const res = await apiPost<{
        success: boolean;
        data?: { user: any; token: string };
        error?: string;
      }>("/auth/register", payload);

      if (res.success && res.data) {
        authLogin(res.data.user, res.data.token);
        toast({ title: "Consumer Account Created & Verified!", variant: "success" });
        const userRole = res.data.user.role;
        const destination =
          userRole === "WORKER" ? "/worker/dashboard" : getRoleDashboardPath(userRole);
        router.push(destination);
      } else {
        setErrorMessage(res.error || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Network error. Please try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* =========================================================
          AUTHENTIC DUMMY DIGILOCKER CONSENT MODAL
          ========================================================= */}
      {digilockerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            {/* Official Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white font-black text-xs shadow-xs">
                  DL
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    DigiLocker • MeriPehchan
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    National e-Governance Division (NeGD) • Govt. of India
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDigilockerModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="my-5 space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-xs font-semibold text-blue-900 leading-relaxed">
                  <span className="font-bold">Shramik Co-operative</span> is requesting verified
                  Aadhaar e-KYC credentials from UIDAI via DigiLocker for consumer identity
                  assurance.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Applicant Name</span>
                  <span className="font-bold text-slate-900">{name || "Consumer Applicant"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Aadhaar Number</span>
                  <span className="font-mono font-bold text-slate-900">{aadhaarInput}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verification Source</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> UIDAI Central Identities Data Repository
                  </span>
                </div>
              </div>

              {/* Consent Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={digilockerConsent}
                  onChange={(e) => setDigilockerConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  I give my explicit consent to DigiLocker to fetch and share my Aadhaar XML
                  details with Shramik for zero-cost citizen authentication.
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDigilockerModalOpen(false)}
                disabled={digilockerVerifying}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDigiLockerAuth}
                loading={digilockerVerifying}
                disabled={!digilockerConsent}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
              >
                Grant Consent & Authenticate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MAIN REGISTRATION FORM
          ========================================================= */}
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 font-heading">
            {role === "CONSUMER" ? "Create Consumer Account" : "Join as a Technician"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {role === "CONSUMER"
              ? "Verified Aadhaar registration via DigiLocker"
              : "Register your trade skills and join our co-operative"}
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("role", "CONSUMER")}
            className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-sm font-bold transition-all ${
              role === "CONSUMER"
                ? "border-orange-500 bg-orange-50 text-orange-950 shadow-xs"
                : "border-slate-200 text-slate-600 hover:border-orange-300"
            }`}
          >
            <span>👤</span>
            <span>Consumer (Citizen)</span>
          </button>
          <button
            type="button"
            onClick={() => setValue("role", "WORKER")}
            className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-sm font-bold transition-all ${
              role === "WORKER"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs"
                : "border-slate-200 text-slate-600 hover:border-emerald-300"
            }`}
          >
            <span>🛠️</span>
            <span>Technician (Worker)</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1: Personal Details */}
          <Input
            label="Full Name (as per Aadhaar)"
            placeholder="e.g. Amit Sharma"
            {...register("name")}
            error={errors.name?.message}
            disabled={loading}
          />

          <PhoneInput
            value={phone}
            onChange={(v) => setValue("phone", v, { shouldValidate: true })}
            error={errors.phone?.message}
            disabled={loading}
            label="Mobile Number"
            placeholder="98XXXXXXXX"
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="consumer@example.com"
            {...register("email")}
            error={errors.email?.message}
            disabled={loading}
          />

          <Input
            label="Create Account Password"
            type="password"
            placeholder="Minimum 6 characters"
            {...register("password")}
            error={errors.password?.message}
            disabled={loading}
          />

          {/* =========================================================
              CONSUMER-ONLY: DIGILOCKER AADHAAR VERIFICATION
              ========================================================= */}
          {role === "CONSUMER" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-700 text-[10px] font-black text-white">
                    DL
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    DigiLocker Aadhaar Verification
                  </h4>
                </div>
                {isAadhaarVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Verified
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600">
                Aadhaar e-KYC is mandatory for consumers to prevent spam and ensure secure, trusted
                service.
              </p>

              {!isAadhaarVerified ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      12-Digit Aadhaar Number
                    </label>
                    <input
                      type="text"
                      value={aadhaarInput}
                      onChange={(e) => handleAadhaarChange(e.target.value)}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      className="w-full font-mono text-sm tracking-widest px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={openDigiLockerModal}
                    className="w-full h-10 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
                  >
                    🇮🇳 Verify via DigiLocker
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Aadhaar Number:</span>
                    <span className="font-mono">
                      XXXX-XXXX-{aadhaarInput.replace(/\s/g, "").slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-700">
                    <span>DigiLocker Ref:</span>
                    <span className="font-mono">{digilockerRef}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              CONSUMER-ONLY: ACCURATE GPS LOCATION & ADDRESS
              (Revealed once Aadhaar is verified)
              ========================================================= */}
          {role === "CONSUMER" && isAadhaarVerified && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Service Address & Accurate Location
                  </h4>
                </div>
                {latitude && longitude && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
                    <Navigation className="h-3 w-3 text-orange-600" />
                    GPS Locked
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600">
                Allow Shramik to capture your precise coordinates for accurate worker dispatch.
              </p>

              <Button
                type="button"
                onClick={detectLocation}
                loading={detectingLocation}
                className="w-full h-9 text-xs font-bold bg-slate-900 hover:bg-black text-white"
              >
                📍 Auto-Detect Accurate GPS Location
              </Button>

              {latitude && longitude && (
                <div className="rounded-xl bg-white border border-slate-200 p-2.5 text-[11px] text-slate-600 font-mono">
                  Coordinates: {latitude}° N, {longitude}° E (Accurate within 10m)
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street / Flat / Colony Address
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Flat 402, Block C, Vasant Kunj"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-orange-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-orange-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-orange-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Worker-Only: Trade Skills */}
          {role === "WORKER" && (
            <div className="animate-fade-in space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Your Trade Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "success" : "default"}
                    className="cursor-pointer transition-all"
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-sm font-bold bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-md transition-all mt-4"
            loading={loading}
          >
            {role === "CONSUMER" ? "Create Verified Consumer Account" : "Join as a Technician"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-orange-600 hover:text-orange-700 underline underline-offset-4"
          >
            Sign In with Password & OTP
          </Link>
        </p>
      </div>
    </>
  );
}

export default RegisterForm;
