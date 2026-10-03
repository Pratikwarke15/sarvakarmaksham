"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, CalendarCheck, Briefcase, Wallet, User } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/consumer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consumer/problem-selection", label: "Select Problem", icon: CalendarCheck },
  { href: "/consumer/bookings", label: "My Bookings", icon: Briefcase },
  { href: "/consumer/wallet", label: "Wallet", icon: Wallet },
  { href: "/consumer/profile", label: "My Profile", icon: User },
];

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["CONSUMER"]}>
      <div className="min-h-screen bg-[#FCFBFA] flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar links={sidebarLinks} />
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0 pb-20 md:pb-8">{children}</main>
        </div>
        <MobileBottomNav role="CONSUMER" />
      </div>
    </AuthGuard>
  );
}
