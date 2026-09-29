"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, CalendarCheck, Briefcase, Wallet, User } from "lucide-react";
import type { SidebarLink } from "@/components/layout/Sidebar";

const sidebarLinks: SidebarLink[] = [
  { href: "/consumer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consumer/book", label: "Book Service", icon: CalendarCheck },
  { href: "/consumer/bookings", label: "My Bookings", icon: Briefcase },
  { href: "/consumer/wallet", label: "Wallet", icon: Wallet },
  { href: "/consumer/profile", label: "My Profile", icon: User },
];

const publicExplainerRoutes = ["/consumer/bookings", "/consumer/wallet", "/consumer/book"];

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const isPublicRoute = publicExplainerRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));

  // If user is not authenticated or not a consumer, and on an explainer route, allow public viewing
  if ((!isAuthenticated || user?.role !== "CONSUMER") && isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#FCFBFA] flex flex-col justify-between">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={["CONSUMER"]}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar links={sidebarLinks} />
          <main className="flex-1 p-6 sm:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
