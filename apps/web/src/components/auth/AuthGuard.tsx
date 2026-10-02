"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setHydrated(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoading && !isAuthenticated) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      router.replace(currentPath ? `/login?redirect=${encodeURIComponent(currentPath)}` : "/login");
      return;
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace("/unauthorized");
    }
  }, [hydrated, isLoading, isAuthenticated, user, allowedRoles, router]);

  const isReady = hydrated && (!isLoading || (isAuthenticated && user));
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;

