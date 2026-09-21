"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Sparkles,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Zap,
  Mic,
  ShieldCheck,
  MapPin,
  Hammer,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function AppDownloadPage() {
  const [notifyContact, setNotifyContact] = useState("");
  const [notified, setNotified] = useState(false);

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyContact.trim()) return;
    setNotified(true);
  };

  return (
    <div className="min-h-screen bg-[#FCFBFA] text-slate-900 font-sans selection:bg-[#800020] selection:text-white">
      <Navbar />

      <main className="relative overflow-hidden pt-12 pb-24 lg:pt-16 lg:pb-32">
        {/* Ambient background glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 -z-10 h-96 w-96 rounded-full bg-rose-100/50 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#800020]/10 border border-[#800020]/20 px-4 py-1.5 text-xs font-bold text-[#800020] mb-6 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-[#800020]" />
            <span>Mobile App In The Oven 🚀</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            We&apos;re Still Building The <br className="hidden sm:inline" />
            <span className="text-[#800020]">Native Mobile App</span>!
          </h1>

          {/* Subtitle / Fun Copy */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Our engineers and local technicians are heads-down crafting an unmatched native experience.
            We&apos;re obsessing over sub-second artisan dispatch, offline emergency booking, and seamless
            voice calling in Marathi, Hindi, and English.
          </p>

          {/* Web App Access Callout */}
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white border border-rose-200/80 p-4 shadow-sm max-w-xl mx-auto">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#800020] shrink-0">
              <Zap className="h-5 w-5 fill-[#800020]" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <span className="font-bold text-slate-900 block">No waiting needed for repairs!</span>
              <span className="text-slate-500">
                Our Progressive Web App has 100% features live right now in your browser.
              </span>
            </div>
            <Link
              href="/consumer/book"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#800020] hover:bg-[#66001a] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors shrink-0"
            >
              <span>Use Web App</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Store Cards Grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
            {/* Apple App Store Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Coming Soon
                </span>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white mb-5 shadow-xs">
                <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.67-.97 1.74-.86 2.76 1.01.08 2.05-.51 2.58-1.26z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-slate-900">Apple App Store</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Native iOS build optimized for iPhone with Live Activity dynamic island status, Apple Maps navigation, and FaceID verification.
              </p>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">iOS 16.0+</span>
                <span className="text-xs font-bold text-[#800020]">In App Store Review</span>
              </div>
            </div>

            {/* Google Play Store Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Coming Soon
                </span>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white mb-5 shadow-xs">
                <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186c-.37-.34-.61-.83-.61-1.39V3.204c0-.56.24-1.05.61-1.39zm11.233 11.233l2.298 2.298-11.83 6.83 9.532-9.128zm0-2.094L5.31 1.825l11.83 6.83-2.298 2.298zM18.73 10.37l2.88 1.66c.52.3.52.8 0 1.1l-2.88 1.66-2.15-2.21 2.15-2.21z" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-slate-900">Google Play Store</h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Lightweight Android APK with low-bandwidth offline job reception, direct WhatsApp integration, and Marathi audio job alerts.
              </p>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Android 9.0+</span>
                <span className="text-xs font-bold text-[#800020]">In Beta Testing</span>
              </div>
            </div>
          </div>

          {/* Interactive "Notify Me" Form */}
          <div className="mt-14 rounded-3xl border border-rose-200 bg-gradient-to-b from-rose-50/50 to-white p-8 max-w-2xl mx-auto text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#800020] text-white mx-auto mb-4 shadow-sm">
              <Bell className="h-6 w-6" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Get Notified The Exact Minute It Drops
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Drop your phone number or email. We will send you an invite link and ₹100 inaugural service discount.
            </p>

            {notified ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-semibold flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>You&apos;re on the VIP priority list! We&apos;ll notify you on launch day.</span>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="mt-6 flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
                <input
                  type="text"
                  required
                  value={notifyContact}
                  onChange={(e) => setNotifyContact(e.target.value)}
                  placeholder="Enter your phone or email..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#800020] hover:bg-[#66001a] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors shrink-0"
                >
                  Notify Me
                </button>
              </form>
            )}

            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-400 font-medium">
              <span>🔒 Zero spam promise</span>
              <span>•</span>
              <span>🎁 ₹100 Welcome Credit</span>
            </div>
          </div>

          {/* What to expect in the app */}
          <div className="mt-16 pt-12 border-t border-slate-200/80 text-left max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-slate-900 text-center mb-8">
              Exciting Features Packed Into The Mobile Release
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="h-8 w-8 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                  <Mic className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Regional Voice AI</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Speak your issue in Marathi, Hindi, or English. The app instantly extracts your problem & matches nearby experts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="h-8 w-8 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Live GPS Telemetry</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Track your technician walking or driving to your doorstep with transparent distance metrics.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="h-8 w-8 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">DigiLocker Verification</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    100% Aadhaar DigiLocker verified service professionals with zero criminal background.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="h-8 w-8 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                  <Hammer className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">0% Platform Cut</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Direct OTP settlement between homeowner and technician. No hidden cuts or surge fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
