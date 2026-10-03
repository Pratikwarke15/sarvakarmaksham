"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Search, 
  CalendarCheck, 
  Wallet, 
  User, 
  Briefcase, 
  DollarSign 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  role: "CONSUMER" | "WORKER";
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const consumerItems: NavItem[] = [
  { href: "/consumer/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/consumer/problem-selection", label: "Services", icon: Search },
  { href: "/consumer/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/consumer/wallet", label: "Wallet", icon: Wallet },
  { href: "/consumer/profile", label: "Profile", icon: User },
];

const workerItems: NavItem[] = [
  { href: "/worker/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/worker/jobs", label: "Jobs", icon: Briefcase },
  { href: "/worker/earnings", label: "Earnings", icon: DollarSign },
  { href: "/worker/profile", label: "Profile", icon: User },
];

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const items = role === "CONSUMER" ? consumerItems : workerItems;

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe transition-transform duration-200"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-150 select-none group relative",
                isActive 
                  ? "text-[#800020] font-semibold" 
                  : "text-slate-500 hover:text-slate-700 active:scale-95"
              )}
            >
              {/* Top active indicator line */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#800020] rounded-full" />
              )}
              
              <div className={cn(
                "p-1 rounded-xl transition-all duration-150",
                isActive ? "bg-[#800020]/10 scale-105" : "group-hover:bg-slate-100"
              )}>
                <Icon className={cn("w-5 h-5 transition-transform", isActive ? "stroke-[2.5]" : "stroke-[1.75]")} />
              </div>

              <span className={cn(
                "text-[10px] tracking-tight leading-tight mt-0.5",
                isActive ? "font-semibold text-[#800020]" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
