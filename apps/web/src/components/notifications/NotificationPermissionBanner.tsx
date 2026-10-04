"use client";

import React, { useState, useEffect } from "react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestSystemNotificationPermission,
} from "@/lib/notifications";
import { Bell, X, CheckCircle } from "lucide-react";

export function NotificationPermissionBanner() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  // Default to dismissed true to avoid notch flicker on first paint
  const [isDismissed, setIsDismissed] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [justGranted, setJustGranted] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) {
      return;
    }

    const current = getNotificationPermission();
    setPermission(current);

    // If handled once on this device, or if already granted/denied by browser, never show again
    const handled = localStorage.getItem("sarva_notif_prompt_handled");
    if (handled || current !== "default") {
      setIsDismissed(true);
      return;
    }

    // Delay 1.5s after page load so it doesn't clash with onboarding
    const timer = setTimeout(() => {
      setIsDismissed(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestSystemNotificationPermission();
      try {
        localStorage.setItem("sarva_notif_prompt_handled", "true");
      } catch (e) {}

      if (granted) {
        setPermission("granted");
        setJustGranted(true);
        setTimeout(() => {
          setIsDismissed(true);
        }, 2400);
      } else {
        setIsDismissed(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("sarva_notif_prompt_handled", "true");
    } catch (e) {}
  };

  if (isDismissed && !justGranted) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom-6 duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-[#24080F]/95 backdrop-blur-xl border border-rose-500/30 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.4)] text-white">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close notification prompt"
          className="absolute top-3 right-3 p-1.5 rounded-full text-rose-300/70 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#800020] to-rose-600 border border-rose-400/30 flex items-center justify-center shrink-0 shadow-md">
            {justGranted ? (
              <CheckCircle className="w-5 h-5 text-emerald-300" />
            ) : (
              <Bell className="w-5 h-5 text-amber-300 animate-pulse" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-black tracking-tight font-heading text-white">
              {justGranted ? "Alerts Enabled!" : "Enable Live Notifications"}
            </h4>
            <p className="text-xs text-rose-100/80 mt-0.5 leading-relaxed font-normal">
              {justGranted
                ? "You will now receive incoming call rings, booking updates, and OTPs on your device."
                : "Get instant call ringers, worker dispatches, and secure OTPs directly on this device."}
            </p>
          </div>
        </div>

        {!justGranted && (
          <div className="mt-3.5 flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-200 hover:text-white hover:bg-white/10 transition"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleRequest}
              disabled={isRequesting}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#800020] to-rose-700 hover:from-[#6b001b] hover:to-rose-800 active:scale-95 text-xs font-bold text-white shadow-md shadow-rose-950/40 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Bell className="w-3.5 h-3.5 text-amber-300" />
              <span>{isRequesting ? "Connecting..." : "Enable Access"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
