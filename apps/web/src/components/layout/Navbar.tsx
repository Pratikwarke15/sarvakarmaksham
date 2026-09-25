"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Handshake,
  Home,
  CalendarCheck,
  Wallet,
  Briefcase,
  DollarSign,
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Gavel,
  Coins,
  Building2,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";

import { useI18n } from "@/i18n/I18nProvider";

interface NavLinkItem {
  href: string;
  label: string;
  key: string;
  icon: any;
}

const navConfig: Record<string, NavLinkItem[]> = {
  CONSUMER: [
    { href: "/consumer/dashboard", label: "Home", key: "home", icon: Home },
    { href: "/consumer/book", label: "Book Service", key: "bookService", icon: CalendarCheck },
    { href: "/consumer/bookings", label: "My Bookings", key: "myBookings", icon: Briefcase },
    { href: "/consumer/wallet", label: "Wallet", key: "wallet", icon: Wallet },
  ],
  WORKER: [
    { href: "/worker/dashboard", label: "Dashboard", key: "dashboard", icon: LayoutDashboard },
    { href: "/worker/jobs", label: "My Jobs", key: "myJobs", icon: Briefcase },
    { href: "/worker/earnings", label: "Earnings", key: "earnings", icon: DollarSign },
  ],
};

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    try {
      logout();
    } finally {
      window.location.replace("/login");
    }
  };

  const links: NavLinkItem[] = user ? (navConfig[user.role] || []) : [];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!isAuthenticated) {
    return (
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 group min-w-0">
            <div className="relative flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white shadow-xs overflow-hidden border border-slate-200/90 group-hover:border-[#800020] transition-colors p-1 shrink-0">
              <img
                src="/images/logo.png"
                alt="सर्वकर्मक्षमः"
                className="h-full w-full object-contain filter drop-shadow-xs"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-emerald-600 border-2 border-white" title="Verified Network" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-xl font-black text-slate-900 font-heading tracking-tight truncate">
                  सर्वकर्मक्षमः<span className="text-[#800020]">.</span>
                </span>
                <span className="hidden xs:inline-block rounded-sm bg-emerald-50 text-[9px] font-extrabold text-emerald-800 px-1 py-0.2 border border-emerald-300 uppercase">
                  {t("nav.verified")}
                </span>
              </div>
              <span className="hidden sm:block text-[10px] font-semibold text-slate-500 -mt-0.5 tracking-wider uppercase truncate">
                Sarvakarmakshamah • People Work Together
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageSelector />
            <Link href="/login" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#800020] px-2 sm:px-3 py-1.5 sm:py-2 transition-colors">
              {t("nav.login")}
            </Link>
            <Link
              href="/download"
              className="hidden sm:inline-flex rounded-full bg-[#800020] hover:bg-[#66001a] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-98"
            >
              Download App
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-18 items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 group min-w-0">
              <div className="relative flex h-10 w-10 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-white shadow-xs overflow-hidden border border-slate-200/90 group-hover:border-[#800020] transition-colors p-1 shrink-0">
                <img
                  src="/images/logo.png"
                  alt="सर्वकर्मक्षमः"
                  className="h-full w-full object-contain filter drop-shadow-xs"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-600 border-2 border-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-black text-slate-900 font-heading tracking-tight truncate">
                  सर्वकर्मक्षमः<span className="text-[#800020]">.</span>
                </span>
                <span className="hidden sm:block text-[9px] font-semibold text-slate-500 -mt-0.5 tracking-wider uppercase truncate">
                  Sarvakarmakshamah • People Work Together
                </span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-rose-50 text-[#800020] font-bold border border-rose-200/60 shadow-2xs"
                        : "text-gray-600 hover:bg-rose-50/50 hover:text-[#800020]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {(link as any).key ? t(`nav.${(link as any).key}`) : link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-white py-1 shadow-lg animate-fade-in">
                    <div className="border-b px-4 py-2">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.role?.replace("_", " ")}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white md:hidden animate-fade-in">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    active ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {(link as any).key ? t(`nav.${(link as any).key}`) : link.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
