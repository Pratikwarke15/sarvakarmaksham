"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, Settings, Coins } from "lucide-react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/worker/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/worker/jobs", label: "My Jobs", icon: Users },
  { href: "/worker/earnings", label: "Earnings", icon: Coins },
  { href: "/worker/profile", label: "Profile", icon: Settings },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["WORKER"]}>
      <div className="min-h-screen bg-[#FCFBFA] flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar links={sidebarLinks} />
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 min-w-0 pb-20 md:pb-8">{children}</main>
        </div>
        <MobileBottomNav role="WORKER" />
      </div>
    </AuthGuard>
  );
}
