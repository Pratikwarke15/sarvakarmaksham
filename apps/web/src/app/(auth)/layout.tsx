"use client";

import { Handshake } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { getRoleDashboardPath } from "@/lib/utils";
import { VoiceAccessModal } from "@/components/auth/VoiceAccessModal";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, sessionValidated, user } = useAuthStore();
  const { t } = useI18n();

  useEffect(() => {
    if (sessionValidated && isAuthenticated && user) {
      router.replace(getRoleDashboardPath(user.role));
    }
  }, [isAuthenticated, router, sessionValidated, user]);

  if (sessionValidated && isAuthenticated && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Voice Access Prompt Modal */}
      <VoiceAccessModal />

      {/* Left Showcase */}
      <div className="relative hidden w-1/2 bg-slate-900 border-r border-slate-800 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12 text-white">
        <div className="relative z-10 max-w-md text-center">
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-3.5 group">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1 shadow-md group-hover:scale-105 transition-transform overflow-hidden border border-slate-700">
              <img
                src="/images/logo.png"
                alt="सर्वकर्मक्षमः"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-3xl font-black text-white font-heading tracking-tight">
                  सर्वकर्मक्षमः<span className="text-[#800020]">.</span>
                </span>
                <span className="rounded-sm bg-emerald-900/60 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-300 px-1.5 py-0.5 uppercase tracking-wide">
                  {t("nav.verified")}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Sarvakarmakshamah • People Work Together
              </p>
            </div>
          </Link>

          <p className="mt-8 text-base text-slate-300 leading-relaxed font-medium">
            {t("landing.heroDesc")}
          </p>

          {/* Stats Bar */}
          <div className="mt-10 grid grid-cols-3 gap-3 border-t border-slate-800 pt-6 text-center">
            <div>
              <p className="text-2xl font-black text-rose-400 font-heading">12+</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t("landing.trustVerified")}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white font-heading">15m</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t("landing.trustEta")}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-400 font-heading">≤5%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t("landing.trustCommission")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Area */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-12 bg-slate-50/50">
        <div className="absolute right-6 top-6">
          <LanguageSelector />
        </div>
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
