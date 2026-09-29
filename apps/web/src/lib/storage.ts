/**
 * Storage management for PWA vs Regular Website:
 * - Regular Website (browser tab): Uses sessionStorage so that when the user exits/closes
 *   the website tab or browser, they are automatically logged out upon reopening.
 * - PWA (Installed App): Uses localStorage so that when the standalone PWA is closed
 *   and reopened, the authenticated session is maintained.
 */

export function isPwaMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://") ||
    window.location.search.includes("mode=pwa")
  );
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  if (isPwaMode()) {
    return localStorage.getItem("coopgig_token");
  }
  return sessionStorage.getItem("coopgig_token");
}

export function getStoredUser(): string | null {
  if (typeof window === "undefined") return null;
  if (isPwaMode()) {
    return localStorage.getItem("coopgig_user");
  }
  return sessionStorage.getItem("coopgig_user");
}

export function setStoredSession(token: string, user: any): void {
  if (typeof window === "undefined") return;
  const userStr = typeof user === "string" ? user : JSON.stringify(user);
  if (isPwaMode()) {
    localStorage.setItem("coopgig_token", token);
    localStorage.setItem("coopgig_user", userStr);
    sessionStorage.removeItem("coopgig_token");
    sessionStorage.removeItem("coopgig_user");
  } else {
    sessionStorage.setItem("coopgig_token", token);
    sessionStorage.setItem("coopgig_user", userStr);
    // Ensure regular website never keeps persistent login across browser closes
    localStorage.removeItem("coopgig_token");
    localStorage.removeItem("coopgig_user");
  }
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("coopgig_token");
  localStorage.removeItem("coopgig_user");
  sessionStorage.removeItem("coopgig_token");
  sessionStorage.removeItem("coopgig_user");
}
