"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function MobilePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // 1. Check if already running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user is on mobile (by user-agent or small touch screen)
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
      (window.innerWidth < 768 && "ontouchstart" in window);

    // If not mobile, do not show this prompt
    if (!isMobile) {
      return;
    }

    // 3. Check if user previously dismissed prompt in this session
    try {
      const dismissed = sessionStorage.getItem("sarvakarmakshamah_pwa_dismissed");
      if (dismissed === "true") {
        return;
      }
    } catch {}

    // 4. Detect iOS device
    const isIos = /iPhone|iPad|iPod/i.test(userAgent) && !(window as any).MSStream;
    setIsIosDevice(isIos);

    // 5. Handle Android / Chromium PWA prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If on mobile (especially iOS or Android where prompt might be delayed), reveal banner after slight delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    // Listen to app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      try {
        sessionStorage.setItem("sarvakarmakshamah_pwa_dismissed", "true");
      } catch {}
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsVisible(false);
          try {
            sessionStorage.setItem("sarvakarmakshamah_pwa_dismissed", "true");
          } catch {}
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn("PWA installation trigger error:", err);
      }
    } else if (isIosDevice) {
      setShowIosGuide(true);
    } else {
      // Fallback for Android browsers where beforeinstallprompt fired earlier or unsupported
      alert("To install, open your browser menu (⋮) and tap 'Install App' or 'Add to Home Screen'.");
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    try {
      sessionStorage.setItem("sarvakarmakshamah_pwa_dismissed", "true");
    } catch {}
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pb-5 md:hidden animate-in slide-in-from-bottom duration-300 pointer-events-auto">
      <div className="relative mx-auto max-w-md rounded-3xl border-2 border-[#800020]/20 bg-white/98 backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(128,0,32,0.25)] ring-1 ring-slate-900/5">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          aria-label="Close install prompt"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content Row */}
        <div className="flex items-start gap-3.5 pr-6">
          {/* App Icon */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-white p-1 shadow-sm overflow-hidden">
            <img
              src="/images/logo.png"
              alt="सर्वकर्मक्षमः"
              className="h-full w-full object-contain filter drop-shadow-xs"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
              <Zap className="h-2 w-2 text-white fill-current" />
            </span>
          </div>

          {/* Texts */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-black text-slate-900 leading-tight">
                सर्वकर्मक्षमः
              </h3>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-[#800020] border border-rose-200/60">
                <Sparkles className="h-2.5 w-2.5 text-[#800020]" />
                Official PWA
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-600 font-medium leading-snug">
              Install the mobile app for 1-tap doorstep repair booking & offline tracking.
            </p>
          </div>
        </div>

        {/* Perks pill list */}
        <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2.5 text-[10px] text-slate-500 font-semibold">
          <div className="flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>0% Commission</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-700">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Aadhaar Verified</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <span>⚡ Offline-Ready</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#800020] hover:bg-[#66001a] text-white py-3 px-4 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Install App on Mobile</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Later
          </button>
        </div>

        {/* iOS Step-by-Step Guidance Box */}
        {showIosGuide && (
          <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 animate-in fade-in duration-200">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
              <Share className="h-3.5 w-3.5 text-amber-700" />
              <span>Easy 2-Step iOS Installation:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800">
              <li>
                Tap the <strong>Share button</strong> <span className="inline-block bg-white border border-amber-300 rounded px-1 text-[10px] font-mono">⎋</span> at the bottom of Safari.
              </li>
              <li>
                Scroll down and select <span className="font-bold">"Add to Home Screen"</span> <PlusSquare className="inline h-3 w-3 text-amber-700 -mt-0.5" />.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
