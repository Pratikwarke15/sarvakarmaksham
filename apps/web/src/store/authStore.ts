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

import {
  isPwaMode,
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
} from "@/lib/storage";

function clearSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    clearStoredSession();
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
      setStoredSession(token, user);
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
      // In regular website mode (browser tab), ensure any old persistent localStorage tokens are wiped
      // so exiting the website logs the user out upon reopening.
      if (!isPwaMode()) {
        localStorage.removeItem("coopgig_token");
        localStorage.removeItem("coopgig_user");
      }
      const token = getStoredToken();
      const userStr = getStoredUser();
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Server-validates the stored session in background on app load.
  validateToken: async () => {
    if (typeof window === "undefined") return;
    const token = getStoredToken();
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
        setStoredSession(token, serverUser);
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
