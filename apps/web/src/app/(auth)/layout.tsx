"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/store/authStore";
import { getRoleDashboardPath } from "@/lib/utils";
import { VoiceAccessModal } from "@/components/auth/VoiceAccessModal";

import { usePathname } from "next/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, sessionValidated, user } = useAuthStore();
  const { t } = useI18n();

  useEffect(() => {
    if (sessionValidated && isAuthenticated && user) {
      router.replace(getRoleDashboardPath(user.role));
    }
  }, [isAuthenticated, router, sessionValidated, user]);

  if (sessionValidated && isAuthenticated && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#800020]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  const isLoginRoute = pathname === "/login" || pathname === "/login/consumer" || pathname === "/login/worker";

  if (isLoginRoute) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center text-slate-900 selection:bg-[#800020] selection:text-white">
        <VoiceAccessModal />
        <main className="w-full flex-1 flex flex-col items-center justify-center">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F5] flex flex-col justify-between text-slate-900 selection:bg-[#800020] selection:text-white">
      {/* Voice Access Modal */}
      <VoiceAccessModal />

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-white p-1 border border-slate-200/80 shadow-xs flex items-center justify-center group-hover:border-[#800020] transition-colors">
            <img
              src="/images/logo.png"
              alt="सर्वकर्मक्षमः"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 font-heading tracking-tight">
                सर्वकर्मक्षमः<span className="text-[#800020]">.</span>
              </span>
              <span className="rounded-sm bg-emerald-50 text-[9px] font-extrabold text-emerald-800 px-1 py-0.2 border border-emerald-300 uppercase">
                {t("nav.verified")}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Sarvakarmakshamah • People Work Together
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSelector />
        </div>
      </header>

      {/* Main Form Center Area */}
      <main className="flex-1 flex items-center justify-center px-3 sm:px-4 py-3 sm:py-8">
        <div className="w-full max-w-[440px] rounded-[24px] sm:rounded-[32px] bg-white border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)] p-5 sm:p-8 transition-all">
          {children}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full py-2.5 sm:py-4 text-center text-[11px] sm:text-xs text-slate-400">
        <p>© 2026 सर्वकर्मक्षमः (Sarvakarmakshamah). All rights reserved.</p>
      </footer>
    </div>
  );
}
