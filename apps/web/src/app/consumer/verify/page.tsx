"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  UserCheck,
  Calendar,
  MapPin,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { DigiLockerDemoFlow } from "@/components/verification/DigiLockerDemoFlow";

export default function ConsumerVerifyPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [showDemoFlow, setShowDemoFlow] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await apiGet<{ success: boolean; data: any }>("/auth/me");
      if (res.success && res.data) {
        setProfileData(res.data.consumerProfile || null);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const isAadhaarVerified = profileData?.aadhaarVerified || false;

  return (
    <div className="min-h-screen bg-[#FDFBF9] py-10 px-4 sm:px-6 text-slate-900 selection:bg-[#800020] selection:text-white">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/consumer/book"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#800020] transition rounded-xl px-3 py-1.5 hover:bg-rose-50 border border-slate-200/80 bg-white shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Booking</span>
          </Link>

          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Digital India Trust Tier</span>
          </span>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-[#800020]/10 border border-[#800020]/20 items-center justify-center text-[#800020] mx-auto">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-heading">
            Consumer Identity Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Verify your citizen credentials through DigiLocker to access trusted on-premise
            cooperative services and home appointments.
          </p>
        </div>

        {/* Verified Status Banner */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#800020]" />
          </div>
        ) : isAadhaarVerified ? (
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Aadhaar Identity Fully Verified
                  </h3>
                  <p className="text-xs text-slate-500">
                    Source: DigiLocker National Sandbox • Ref: {profileData?.digilockerRef || "DL-VERIFIED"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 uppercase">
                Active
              </span>
            </div>

            {/* Profile Data Distinction: User-Provided vs Verified */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Profile Data Distinction (Verified vs User-Provided)
              </h4>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Name</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {profileData?.aadhaarName || user?.name}
                    </span>
                    <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px]">
                      ✓ Verified
                    </span>
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Date of Birth / Age</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {profileData?.aadhaarDob || "1994-08-15"}
                    </span>
                    <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px]">
                      ✓ Verified
                    </span>
                  </div>
                </div>

                <div className="py-2.5 flex items-start justify-between">
                  <span className="text-slate-500 flex-shrink-0">Address</span>
                  <div className="text-right pl-4">
                    <p className="font-bold text-slate-900">
                      {profileData?.defaultAddress || "Verified Address on File"}
                    </p>
                    <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px] inline-block mt-0.5">
                      ✓ Verified
                    </span>
                  </div>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-500">Aadhaar Reference</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900">
                      {profileData?.aadhaarNumber || "XXXX-XXXX-7777"}
                    </span>
                    <span className="rounded-sm bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[10px]">
                      ✓ Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowDemoFlow(true)}
                className="text-xs font-bold text-slate-600 hover:text-[#800020] transition inline-flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Re-verify / Test Sandbox Flow</span>
              </button>

              <Link
                href="/consumer/book"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#800020] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-[#800020]/20 hover:bg-[#68001a] transition"
              >
                <span>Continue to Booking</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}

        {/* DigiLocker Flow Component */}
        {(!isAadhaarVerified || showDemoFlow) && (
          <div className="animate-in fade-in-50 duration-300">
            <DigiLockerDemoFlow
              userRole="CONSUMER"
              onSuccess={(p) => {
                setProfileData(p);
                setShowDemoFlow(false);
              }}
              onCancel={isAadhaarVerified ? () => setShowDemoFlow(false) : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}