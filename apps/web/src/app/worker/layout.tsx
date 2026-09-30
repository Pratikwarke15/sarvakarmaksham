"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, Settings, Coins } from "lucide-react";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/worker/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/worker/jobs", label: "My Jobs", icon: Users },
  { href: "/worker/earnings", label: "Earnings", icon: Coins },
  { href: "/worker/profile", label: "Profile", icon: Settings },
];

const publicExplainerRoutes = ["/worker/jobs", "/worker/earnings", "/worker/dashboard"];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const isPublicRoute = publicExplainerRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));

  // If user is not authenticated or not a worker, and on an explainer route, allow public viewing
  if ((!isAuthenticated || user?.role !== "WORKER") && isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#FCFBFA] flex flex-col justify-between">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={["WORKER"]}>
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
