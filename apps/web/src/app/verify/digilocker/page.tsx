"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DigiLockerDemoFlow } from "@/components/verification/DigiLockerDemoFlow";
import { ArrowLeft, ShieldCheck, ExternalLink, HelpCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

function DigiLockerStandaloneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const roleParam = searchParams.get("role");
  const redirectParam = searchParams.get("redirect");
  const nameParam = searchParams.get("name") || undefined;
  const dobParam = searchParams.get("dob") || undefined;
  const addressParam = searchParams.get("address") || undefined;

  const userRole: "CONSUMER" | "WORKER" =
    roleParam?.toUpperCase() === "WORKER" ? "WORKER" : "CONSUMER";

  const defaultRedirect =
    userRole === "WORKER" ? "/worker/profile" : "/consumer/dashboard";
  const targetRedirect = redirectParam && redirectParam.startsWith("/") ? redirectParam : defaultRedirect;

  const handleSuccess = (data: {
    digilockerRef: string;
    aadhaarNumber?: string;
    name?: string;
    dob?: string;
    address?: string;
    skillCertificate?: string;
  }) => {
    toast({
      title: "DigiLocker Verification Authorized",
      description: `Verified details for ${data.name || "citizen"} recorded on your member profile.`,
      variant: "success",
    });
    setTimeout(() => {
      router.push(targetRedirect);
    }, 1200);
  };

  const handleCancel = () => {
    router.push(targetRedirect);
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col justify-between selection:bg-[#002F6C] selection:text-white">
      {/* Government Navigation Bar */}
      <header className="w-full bg-[#002F6C] text-white py-2.5 px-4 sm:px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white transition px-2.5 py-1 rounded-lg hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Platform</span>
            </button>
            <span className="text-white/40">|</span>
            <span className="text-xs font-medium text-slate-200">
              National e-Governance Division (NeGD)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/privacy"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 text-slate-300 hover:text-white"
            >
              <span>Privacy Charter</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
              Secure TLS 1.3
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-lg">
          <DigiLockerDemoFlow
            userRole={userRole}
            initialData={{
              name: nameParam,
              dob: dobParam,
              address: addressParam,
            }}
            isStandalone={true}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />

          {/* Bottom Security Note */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Authorized under IT Act 2000 & Digital Personal Data Protection Act 2023</span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            DigiLocker Sandbox Gateway • Ministry of Electronics & IT (MeitY), Government of India
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/terms" className="hover:text-slate-800">
              Terms of Use
            </Link>
            <Link href="/privacy" className="hover:text-slate-800">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function DigiLockerStandalonePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#002F6C] border-t-transparent" />
        </div>
      }
    >
      <DigiLockerStandaloneContent />
    </Suspense>
  );
}
