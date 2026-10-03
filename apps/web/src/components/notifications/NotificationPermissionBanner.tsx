"use client";

import React, { useState, useEffect } from "react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestSystemNotificationPermission,
} from "@/lib/notifications";
import { Bell, X, CheckCircle, ShieldAlert } from "lucide-react";

export function NotificationPermissionBanner() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [justGranted, setJustGranted] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) {
      setIsDismissed(true);
      return;
    }

    const current = getNotificationPermission();
    setPermission(current);

    const dismissed = sessionStorage.getItem("sarva_notif_banner_dismissed");
    if (dismissed || current === "granted") {
      setIsDismissed(true);
    }
  }, []);

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestSystemNotificationPermission();
      if (granted) {
        setPermission("granted");
        setJustGranted(true);
        setTimeout(() => {
          setIsDismissed(true);
        }, 3000);
      } else {
        setPermission(getNotificationPermission());
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("sarva_notif_banner_dismissed", "true");
    } catch (e) {}
  };

  if (isDismissed || permission === "granted" && !justGranted) {
    return null;
  }

  return (
    <div className="relative z-40 bg-gradient-to-r from-burgundy-900 via-rose-950 to-burgundy-900 text-white px-4 py-3 shadow-md border-b border-rose-800/40 animate-in slide-in-from-top duration-300">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 rounded-full bg-white/10 shrink-0 text-amber-300">
            {justGranted ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : permission === "denied" ? (
              <ShieldAlert className="w-5 h-5 text-rose-300" />
            ) : (
              <Bell className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div className="text-sm">
            {justGranted ? (
              <p className="font-semibold text-emerald-300">
                System Notifications Active! Real-time alerts will appear on your device bar.
              </p>
            ) : permission === "denied" ? (
              <p className="text-rose-200">
                Notifications blocked in your browser. Unblock in browser settings for live call alerts.
              </p>
            ) : (
              <p className="text-white/90">
                <span className="font-semibold text-white">Enable Real-Time Alerts:</span> Get
                system notification bar alerts for incoming calls, verification OTPs, and booking updates.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {permission === "default" && (
            <button
              onClick={handleRequest}
              disabled={isRequesting}
              className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow transition flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              {isRequesting ? "Requesting..." : "Enable Alerts"}
            </button>
          )}

          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
