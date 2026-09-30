"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LayoutDashboard, Building2, Users } from "lucide-react";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/dashboard", label: "Co-ops", icon: Building2 },
  { href: "/admin/dashboard", label: "Nationwide Stats", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["MINISTRY_SUPER_ADMIN"]}>
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
