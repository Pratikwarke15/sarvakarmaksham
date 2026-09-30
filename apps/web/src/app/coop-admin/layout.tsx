"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LayoutDashboard, Users, Settings, Gavel, Coins } from "lucide-react";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/coop-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coop-admin/workers", label: "Workers", icon: Users },
  { href: "/coop-admin/services", label: "Services", icon: Settings },
  { href: "/coop-admin/disputes", label: "Disputes", icon: Gavel },
  { href: "/coop-admin/dividends", label: "Dividends", icon: Coins },
];

export default function CoopAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["COOP_ADMIN"]}>
      <div className="min-h-screen bg-[#FCFBFA]">
        <Navbar />
        <div className="flex">
          <Sidebar links={sidebarLinks} />
          <main className="flex-1 p-6 sm:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
