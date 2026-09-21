import { create } from "zustand";
import type { User, UserRole } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";
import { apiGet } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionValidated: boolean;
}

interface AuthActions {
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  loadFromStorage: () => void;
  validateToken: () => Promise<void>;
}

function clearSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("coopgig_token");
    localStorage.removeItem("coopgig_user");
    // Clear all cached server state (React Query) so Account A data never leaks to Account B
    queryClient.clear();
    queryClient.cancelQueries();
  } catch {
    // Storage/query teardown must never block logout navigation.
  }
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  sessionValidated: false,

  login: (user, token) => {
    // Switching accounts must reset any cached data from the previous session
    clearSessionStorage();
    if (typeof window !== "undefined") {
      localStorage.setItem("coopgig_token", token);
      localStorage.setItem("coopgig_user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true, isLoading: false, sessionValidated: true });
  },

  logout: () => {
    clearSessionStorage();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, sessionValidated: true });
  },

  setUser: (user) => set({ user }),

  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem("coopgig_token");
      const userStr = localStorage.getItem("coopgig_user");
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // Server-validates the stored session in background on app load.
  validateToken: async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("coopgig_token");
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, sessionValidated: true });
      return;
    }
    try {
      const res = await apiGet<{ success: boolean; data?: User | { user: User }; error?: string }>("/auth/me");
      const serverUser = res.success && res.data
        ? "user" in res.data
          ? res.data.user
          : res.data
        : null;
      if (serverUser) {
        const storedUser = useAuthStore.getState().user;
        localStorage.setItem("coopgig_user", JSON.stringify(serverUser));
        set({ user: serverUser, token, isAuthenticated: true, isLoading: false, sessionValidated: true });
        // If role changed on server, handle gracefully
        if (storedUser && storedUser.role !== serverUser.role) {
          clearSessionStorage();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false, sessionValidated: true });
          if (typeof window !== "undefined") {
            window.location.replace("/unauthorized");
          }
        }
      } else {
        clearSessionStorage();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, sessionValidated: true });
      }
    } catch (err: any) {
      // Only clear storage if explicitly unauthorized (401)
      if (err?.response?.status === 401) {
        clearSessionStorage();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, sessionValidated: true });
      } else {
        // Retain optimistic session on network/server hiccups
        set({ isLoading: false, sessionValidated: true });
      }
    }
  },
}));
