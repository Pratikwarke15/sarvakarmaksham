"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  HardHat,
  ArrowRight,
  MapPin,
  Mic,
  ChevronRight,
  CheckCircle2,
  Users,
  ShieldCheck,
  Calculator,
  Search,
  Smartphone,
  UserCheck,
  Star,
  Tag,
  PhoneCall,
  Compass,
  User,
  Sparkles,
  Phone,
  Loader2,
  Navigation,
  Crosshair,
  X,
  Check,
  HelpCircle,
  Award,
  ShoppingBag,
  Percent,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { VoiceJobModal } from "@/components/booking/VoiceJobModal";
import { MobilePwaInstallPrompt } from "@/components/common/MobilePwaInstallPrompt";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [issueQuery, setIssueQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("Jalgaon, Maharashtra");
  const [isLocating, setIsLocating] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "manual" | "default">("default");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customCityInput, setCustomCityInput] = useState("");
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Authenticated redirect: if already logged in (e.g. reopened PWA or active session), don't show landing page
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const target =
        user.role === "WORKER"
          ? "/worker/dashboard"
          : user.role === "COOP_ADMIN" || user.role === "MINISTRY_SUPER_ADMIN"
          ? "/admin/dashboard"
          : "/consumer/dashboard";
      router.replace(target);
    }
  }, [isAuthenticated, user, router]);

  const detectLocation = useCallback(async (interactive = false) => {
    setIsLocating(true);
    setLocationNotice(null);

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;

            // 1. Try BigDataCloud reverse geocode with accurate device coordinates
            try {
              const bdcRes = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              if (bdcRes.ok) {
                const bdc = await bdcRes.json();
                const city = bdc.city || bdc.locality;
                const state = bdc.principalSubdivision || "Maharashtra";
                if (city) {
                  const loc = `${city}, ${state}`;
                  setSelectedCity(loc);
                  setLocationSource("gps");
                  setLocationNotice(`Exact GPS location found: ${loc}`);
                  try {
                    localStorage.setItem("shramik_user_city", loc);
                    localStorage.setItem("shramik_user_city_source", "gps");
                  } catch {}
                  setIsLocating(false);
                  return;
                }
              }
            } catch (e) {
              console.warn("BigDataCloud coord reverse error:", e);
            }

            // 2. Try OpenStreetMap Nominatim reverse geocode with coordinates
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                { headers: { "Accept-Language": "en" } }
              );
              if (res.ok) {
                const data = await res.json();
                const addr = data.address || {};
                const city =
                  addr.city ||
                  addr.town ||
                  addr.village ||
                  addr.suburb ||
                  addr.city_district ||
                  addr.county ||
                  addr.district ||
                  addr.state_district;
                const state = addr.state || addr.country || "Maharashtra";
                if (city) {
                  const loc = `${city}, ${state}`;
                  setSelectedCity(loc);
                  setLocationSource("gps");
                  setLocationNotice(`Exact GPS location found: ${loc}`);
                  try {
                    localStorage.setItem("shramik_user_city", loc);
                    localStorage.setItem("shramik_user_city_source", "gps");
                  } catch {}
                  setIsLocating(false);
                  return;
                }
              }
            } catch (e) {
              console.warn("OSM Nominatim error:", e);
            }
          } catch (e) {
            console.warn("GPS reverse geocode error:", e);
          }

          setIsLocating(false);
          if (interactive) {
            setLocationNotice("Device GPS coordinates received. Using real base: Jalgaon, Maharashtra.");
          }
        },
        (err) => {
          console.warn("GPS access denied or timed out:", err.message);
          setIsLocating(false);
          if (interactive) {
            setLocationNotice("Browser GPS access was denied or unavailable. Using real base: Jalgaon, Maharashtra.");
          }
          // NOTE: Do NOT use IP-based fallback here because Indian ISP cellular/broadband
          // gateways route Jalgaon users through Pune/Mumbai NOCs, causing false location display.
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    } else {
      setIsLocating(false);
      if (interactive) {
        setLocationNotice("Geolocation is not supported by your browser.");
      }
    }
  }, []);

  useEffect(() => {
    // Reset any stale ISP auto-detected locations (e.g. Pune/Mumbai from earlier IP lookups)
    try {
      const cached = localStorage.getItem("shramik_user_city");
      const cachedSource = localStorage.getItem("shramik_user_city_source");

      if (
        cached &&
        cached !== "Mumbai, Maharashtra" &&
        cached !== "Pune, Maharashtra" &&
        cached !== "Detecting location..." &&
        (cachedSource === "manual" || cachedSource === "gps" || cached.toLowerCase().includes("jalgaon"))
      ) {
        setSelectedCity(cached);
        setLocationSource((cachedSource as any) || "manual");
      } else {
        // Default to user's real location: Jalgaon, Maharashtra
        setSelectedCity("Jalgaon, Maharashtra");
        setLocationSource("default");
        localStorage.setItem("shramik_user_city", "Jalgaon, Maharashtra");
        localStorage.setItem("shramik_user_city_source", "default");
      }
    } catch {
      setSelectedCity("Jalgaon, Maharashtra");
    }

    // Attempt non-invasive GPS check (only changes if true GPS coordinates succeed)
    detectLocation(false);
  }, [detectLocation]);

  const handleVoiceClick = () => {
    if (isAuthenticated) {
      setShowVoiceModal(true);
    } else {
      router.push("/login?feature=voice-ai&redirect=/consumer/book");
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(`/#${id}`);
    }
  };

  const handleVoiceJobConfirm = (jobData: { category: string }) => {
    setShowVoiceModal(false);
    const target = `/consumer/book?service=${encodeURIComponent(jobData.category)}`;
    if (isAuthenticated) {
      router.push(target);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(target)}`);
    }
  };

  const services = [
    {
      slug: "electrician",
      title: "Electrical Work",
      description: "Wiring, installations, lighting fixtures, circuit breaker repairs, and general troubleshooting.",
      startingPrice: "₹50",
      icon: Zap,
    },
    {
      slug: "plumber",
      title: "Plumbing",
      description: "Leak repairs, pipe installations, drain cleaning, fixture replacements, and water heaters.",
      startingPrice: "₹50",
      icon: Droplets,
    },
    {
      slug: "carpenter",
      title: "Carpentry",
      description: "Furniture assembly, custom woodworking, door/window repairs, and structural fixes.",
      startingPrice: "₹50",
      icon: Hammer,
    },
    {
      slug: "appliance",
      title: "Appliance Repair",
      description: "AC servicing, washing machine repair, refrigerators, ovens, and other household appliances.",
      startingPrice: "₹50",
      icon: Wrench,
    },
    {
      slug: "painter",
      title: "Painting",
      description: "Interior and exterior painting, touch-ups, color consultations, and wall preparations.",
      startingPrice: "₹50",
      icon: Paintbrush,
    },
    {
      slug: "construction",
      title: "Construction Work",
      description: "Minor renovations, plastering, tiling, masonry, and general home improvement projects.",
      startingPrice: "₹50",
      icon: HardHat,
    },
  ];

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FCFBFA] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#800020] mb-3" />
        <p className="text-sm font-semibold text-slate-700">Opening your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBFA] text-slate-900 font-sans selection:bg-[#800020] selection:text-white">
      <Navbar />

      {/* =========================================================================
          SECTION 1: HERO SECTION (Matching Image 1 with Maroon Theme & Floating Phone)
         ========================================================================= */}
      <section className="relative overflow-hidden min-h-[calc(100vh-5rem)] flex flex-col justify-center pt-16 pb-28 sm:pb-36 lg:pt-20 lg:pb-44 border-b border-slate-200/70 bg-gradient-to-b from-[#FFFDFB] via-[#FFF9F7] to-[#FCFBFA]">
        {/* Soft background ambient radial glows */}
        <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-rose-100/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -z-10 h-96 w-96 rounded-full bg-amber-50/60 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            {/* LEFT COLUMN: Main Tagline, Intro, Downloads & Voice CTA */}
            <div className="lg:col-span-4 flex flex-col justify-center space-y-6 text-left">
              {/* Pill Tag */}
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#800020]/10 border border-[#800020]/20 px-4 py-1.5 text-xs font-bold text-[#800020] shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 fill-[#800020] text-[#800020]" />
                <span>cooperative-owned digital service marketplace platform</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-slate-900 leading-[1.15]">
                All home <br />
                <span className="text-[#800020]">services you need</span> <br />
                at one place
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
                सर्वकर्मक्षमः (Sarvakarmakshamah) connects you directly with nearby skilled electricians, plumbers, carpenters,
                and repair experts. Browse, connect directly by call or chat — no commission, no middlemen.
              </p>

              {/* Store Download / Quick Action Pill Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {/* App Store Pill Button -> navigates to /download */}
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-5 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.67-.97 1.74-.86 2.76 1.01.08 2.05-.51 2.58-1.26z" />
                  </svg>
                  <span>App Store</span>
                </Link>

                {/* Google Play Pill Button -> navigates to /download */}
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-rose-50/50 border-2 border-[#800020] text-[#800020] px-5 py-2.5 text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-98"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186c-.37-.34-.61-.83-.61-1.39V3.204c0-.56.24-1.05.61-1.39zm11.233 11.233l2.298 2.298-11.83 6.83 9.532-9.128zm0-2.094L5.31 1.825l11.83 6.83-2.298 2.298zM18.73 10.37l2.88 1.66c.52.3.52.8 0 1.1l-2.88 1.66-2.15-2.21 2.15-2.21z" />
                  </svg>
                  <span>Google Play</span>
                </Link>

                {/* Voice Booking Shortcut Button */}
                <button
                  type="button"
                  onClick={handleVoiceClick}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-2.5 text-xs font-bold text-[#800020] shadow-xs transition-colors"
                >
                  <Mic className="h-3.5 w-3.5 text-[#800020]" />
                  <span>Voice AI Booking</span>
                </button>
              </div>

              {/* Direct Booking Action CTA */}
              <div className="pt-2">
                <Link
                  href={isAuthenticated ? "/consumer/book" : "/login?redirect=/consumer/book"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#800020] hover:bg-[#66001a] text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <span>Book a Verified Technician Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* CENTER COLUMN: Main Floating Mobile Phone Mockup */}
            <div className="lg:col-span-4 relative flex items-center justify-center py-6 lg:py-0">
              {/* Floating Container */}
              <div className="relative animate-float">
                {/* FLOATING BADGE 1: PLUG (Top-left) */}
                <div className="absolute -left-6 sm:-left-10 top-14 z-20 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white shadow-xl border border-slate-100 animate-float-slow">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-[#800020]" />
                  </div>
                </div>

                {/* FLOATING BADGE 2: HAMMER (Bottom-left) */}
                <div className="absolute -left-5 sm:-left-7 bottom-20 z-20 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white shadow-xl border border-slate-100 animate-float-delayed">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                    <Hammer className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>

                {/* FLOATING BADGE 3: WATER TAP (Mid-right) */}
                <div className="absolute -right-5 sm:-right-8 top-1/2 -translate-y-1/2 z-20 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white shadow-xl border border-slate-100 animate-float">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                    <Droplets className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>

                {/* Mobile Device Body */}
                <div className="relative w-[280px] sm:w-[310px] rounded-[48px] border-[10px] border-slate-900 bg-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-24 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-slate-900 ml-auto mr-3" />
                  </div>

                  {/* Phone Screen: RICH MAROON BACKGROUND */}
                  <div className="bg-[#800020] text-white pt-8 pb-10 px-5 rounded-[38px] min-h-[570px] flex flex-col justify-between relative overflow-hidden">
                    {/* Screen Subtle Glow */}
                    <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />

                    <div>
                      {/* Status Bar / Location Row with Live Dynamic Location */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setShowLocationModal(true)}
                          className="text-left group/loc cursor-pointer rounded-xl hover:bg-white/10 p-1 -ml-1 transition-colors"
                          title="Click to change or detect location"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-white/70 uppercase tracking-wider">
                            <span>Location</span>
                            {isLocating ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin text-white/80" />
                            ) : (
                              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live location active" />
                            )}
                            <span className="text-[9px] text-emerald-300 font-mono font-medium">
                              {locationSource === "gps" ? "GPS" : locationSource === "default" ? "Real" : "City"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold text-white group-hover/loc:text-white/90">
                            <MapPin className="h-3.5 w-3.5 text-rose-300 shrink-0" />
                            <span className="truncate max-w-[145px]">{selectedCity}</span>
                            <ChevronRight className="h-3 w-3 text-white/60 group-hover/loc:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                        <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Screen Title */}
                      <h2 className="text-xl sm:text-2xl font-black text-white mt-6 leading-tight">
                        What do you need
                        <br />
                        help with?
                      </h2>

                      {/* Screen Search Input */}
                      <div className="mt-4 relative">
                        <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-white/70" />
                        <input
                          type="text"
                          placeholder="Search services..."
                          value={issueQuery}
                          onChange={(e) => setIssueQuery(e.target.value)}
                          className="w-full rounded-full bg-white/20 backdrop-blur-sm border border-white/25 py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/70 focus:outline-none focus:bg-white/30"
                        />
                      </div>

                      {/* Categories Header */}
                      <div className="flex items-center justify-between mt-5 mb-3">
                        <span className="text-sm font-bold text-white">Categories</span>
                        <Link href="/consumer/book" className="text-xs text-white/80 hover:text-white font-medium">
                          See All
                        </Link>
                      </div>

                      {/* 2x2 Service Cards Grid inside Phone */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* 1. Electrician */}
                        <Link
                          href={isAuthenticated ? "/consumer/book?service=electrician" : "/login?redirect=/consumer/book?service=electrician"}
                          className="rounded-2xl bg-white p-3 flex flex-col items-center justify-center text-center shadow-md hover:scale-103 transition-transform cursor-pointer"
                        >
                          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                            <Zap className="h-4 w-4 fill-blue-600" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Electrician</span>
                        </Link>

                        {/* 2. Plumber */}
                        <Link
                          href={isAuthenticated ? "/consumer/book?service=plumber" : "/login?redirect=/consumer/book?service=plumber"}
                          className="rounded-2xl bg-white p-3 flex flex-col items-center justify-center text-center shadow-md hover:scale-103 transition-transform cursor-pointer"
                        >
                          <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-1.5">
                            <Droplets className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Plumber</span>
                        </Link>

                        {/* 3. Carpenter */}
                        <Link
                          href={isAuthenticated ? "/consumer/book?service=carpenter" : "/login?redirect=/consumer/book?service=carpenter"}
                          className="rounded-2xl bg-white p-3 flex flex-col items-center justify-center text-center shadow-md hover:scale-103 transition-transform cursor-pointer"
                        >
                          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5">
                            <Hammer className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Carpenter</span>
                        </Link>

                        {/* 4. Painter */}
                        <Link
                          href={isAuthenticated ? "/consumer/book?service=painter" : "/login?redirect=/consumer/book?service=painter"}
                          className="rounded-2xl bg-white p-3 flex flex-col items-center justify-center text-center shadow-md hover:scale-103 transition-transform cursor-pointer"
                        >
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                            <Paintbrush className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">Painter</span>
                        </Link>
                      </div>
                    </div>

                    {/* Bottom Status bar inside phone */}
                    <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[10px] text-white/80">
                      <span>Direct OTP Verified</span>
                      <span className="font-bold text-emerald-300">0% Commission</span>
                    </div>

                    {/* Location Selector Drawer inside phone */}
                    {showLocationModal && (
                      <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-xs rounded-[38px] p-3 flex flex-col justify-end animate-fade-in text-slate-900">
                        <div className="bg-white rounded-3xl p-4 shadow-2xl flex flex-col max-h-[92%] overflow-y-auto">
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-[#800020]" />
                              <span className="text-xs font-bold text-slate-900">Change Location</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowLocationModal(false)}
                              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="py-2.5 space-y-3">
                            {/* Current Active Location Display */}
                            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                  Current Location
                                </div>
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {selectedCity}
                                </div>
                              </div>
                              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {locationSource === "gps" ? "GPS Active" : locationSource === "default" ? "Real Base" : "Manual"}
                              </span>
                            </div>

                            {/* Status notice */}
                            {locationNotice && (
                              <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-2 text-[10px] text-[#800020] flex items-start gap-1.5 leading-tight">
                                <MapPin className="h-3.5 w-3.5 text-[#800020] shrink-0 mt-0.5" />
                                <span>{locationNotice}</span>
                              </div>
                            )}

                            {/* GPS Auto-detect Button */}
                            <button
                              type="button"
                              disabled={isLocating}
                              onClick={async () => {
                                await detectLocation(true);
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 py-2.5 px-3 text-xs font-bold text-[#800020] transition-colors disabled:opacity-70 cursor-pointer"
                            >
                              {isLocating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#800020]" />
                              ) : (
                                <Crosshair className="h-3.5 w-3.5 text-[#800020]" />
                              )}
                              <span>{isLocating ? "Requesting Live GPS..." : "Detect Live Location (GPS)"}</span>
                            </button>

                            {/* Custom City Input */}
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Or Enter City / Area
                              </span>
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (customCityInput.trim()) {
                                    setSelectedCity(customCityInput.trim());
                                    setLocationSource("manual");
                                    try {
                                      localStorage.setItem("shramik_user_city", customCityInput.trim());
                                      localStorage.setItem("shramik_user_city_source", "manual");
                                    } catch {}
                                    setCustomCityInput("");
                                    setShowLocationModal(false);
                                  }
                                }}
                                className="flex gap-1.5"
                              >
                                <input
                                  type="text"
                                  value={customCityInput}
                                  onChange={(e) => setCustomCityInput(e.target.value)}
                                  placeholder="e.g. Jalgaon, Bhusawal, Nashik..."
                                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#800020]"
                                />
                                <button
                                  type="submit"
                                  className="rounded-lg bg-[#800020] text-white px-3 py-1.5 text-xs font-bold shrink-0 hover:bg-[#66001a] transition-colors"
                                >
                                  Set
                                </button>
                              </form>
                            </div>

                            {/* Popular Cities Quick Select with Jalgaon at the top */}
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Quick Select Cities
                              </span>
                              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                {[
                                  { name: "Jalgaon, Maharashtra", label: "Jalgaon (Base)", isBase: true },
                                  { name: "Bhusawal, Maharashtra", label: "Bhusawal" },
                                  { name: "Dhule, Maharashtra", label: "Dhule" },
                                  { name: "Nashik, Maharashtra", label: "Nashik" },
                                  { name: "Chhatrapati Sambhajinagar, Maharashtra", label: "Sambhajinagar" },
                                  { name: "Pune, Maharashtra", label: "Pune" },
                                  { name: "Mumbai, Maharashtra", label: "Mumbai" },
                                  { name: "Nagpur, Maharashtra", label: "Nagpur" },
                                ].map((c) => (
                                  <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCity(c.name);
                                      setLocationSource("manual");
                                      try {
                                        localStorage.setItem("shramik_user_city", c.name);
                                        localStorage.setItem("shramik_user_city_source", "manual");
                                      } catch {}
                                      setShowLocationModal(false);
                                    }}
                                    className={`rounded-lg p-1.5 text-left border truncate transition-colors cursor-pointer ${
                                      selectedCity === c.name
                                        ? "bg-[#800020] text-white border-[#800020] font-bold shadow-xs"
                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-[#800020] hover:text-[#800020]"
                                    }`}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Kept empty for user to add content later */}
            <div className="hidden lg:block lg:col-span-4" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: HOW IT WORKS (Matching Image 2 with Maroon Badges & Clean Cards)
         ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-[#800020] tracking-tight">
              How It Works
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              We&apos;re a marketplace—you find nearby providers and connect with them directly.
              No booking system, no commission.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Step 1: Find Services */}
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs hover:shadow-md transition-shadow">
              {/* Number Badge */}
              <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#800020] text-xs font-bold text-white">
                1
              </div>

              {/* Centered Icon Container */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                <Smartphone className="h-8 w-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">Find Services</h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Browse by category—electrical, plumbing, carpentry, and more. See verified technicians and service providers near you.
              </p>
            </div>

            {/* Step 2: Connect Directly */}
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs hover:shadow-md transition-shadow">
              {/* Number Badge */}
              <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#800020] text-xs font-bold text-white">
                2
              </div>

              {/* Centered Icon Container */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                <UserCheck className="h-8 w-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">Connect Directly</h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Call or chat with the professional you choose. No booking fees, no commission—you deal directly with them.
              </p>
            </div>

            {/* Step 3: Get Work Done */}
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs hover:shadow-md transition-shadow">
              {/* Number Badge */}
              <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#800020] text-xs font-bold text-white">
                3
              </div>

              {/* Centered Icon Container */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">Get Work Done</h3>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Agree on scope and terms with the professional. When the job is done, leave a review to help others.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: SERVICES YOU CAN FIND (Matching Image 3 with Maroon Theme)
         ========================================================================= */}
      <section id="services" className="py-20 bg-[#FCFBFA] border-b border-slate-200/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-[#800020] tracking-tight">
              Services You Can Find
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              From quick fixes to major repairs, find verified technicians and providers in these categories.
            </p>
          </div>

          {/* 6 Grid Service Cards */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((item, idx) => {
              const Icon = item.icon;
              const bookHref = isAuthenticated
                ? `/consumer/book?service=${item.slug}`
                : `/login?redirect=${encodeURIComponent(`/consumer/book?service=${item.slug}`)}`;

              return (
                <div
                  key={item.slug}
                  className={`rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                    idx === 0 ? "border-t-4 border-t-[#800020]" : "hover:border-t-4 hover:border-t-[#800020]"
                  }`}
                >
                  <div>
                    {/* Icon Container */}
                    <div className="h-12 w-12 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        Starts {item.startingPrice}
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Verified Technicians</span>
                    <Link
                      href={bookHref}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#800020] hover:text-[#66001a] group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Find Pros</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action button at bottom */}
          <div className="mt-10 text-center">
            <Link
              href={isAuthenticated ? "/consumer/book" : "/login?redirect=/consumer/book"}
              className="inline-flex items-center gap-2 rounded-full bg-[#800020] hover:bg-[#66001a] px-7 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-98"
            >
              <span>Explore All Verified Technicians</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: WHY CHOOSE SHRAMIK? (Matching Image 4 with Maroon Heading & Trust Card)
         ========================================================================= */}
      <section id="why-shramik" className="py-20 bg-white border-b border-slate-200/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: 4 Key Value Props */}
            <div className="lg:col-span-7">
              <h2 className="text-3xl sm:text-4xl font-black text-[#800020] tracking-tight">
                Why Choose सर्वकर्मक्षमः?
              </h2>
              <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
                We are a marketplace—we connect you with nearby service providers. You connect directly; we don&apos;t take commission or act as a middleman.
              </p>

              {/* 2x2 Feature List */}
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {/* 1. Verified Providers */}
                <div className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#800020]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Verified Providers</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Every technician and supplier on the platform goes through verification so you can connect with confidence.
                  </p>
                </div>

                {/* 2. Direct Connect */}
                <div className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#800020]">
                    <Zap className="h-5 w-5 fill-[#800020]" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Direct Connect</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Call or chat with professionals instantly. No booking flow—just find, connect, and get your work done.
                  </p>
                </div>

                {/* 3. No Commission */}
                <div className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#800020]">
                    <Tag className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">No Commission</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    We don&apos;t charge you or the service provider. What you agree with the pro is what you pay.
                  </p>
                </div>

                {/* 4. You Deal Direct */}
                <div className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#800020]">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">You Deal Direct</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Agree on scope, price, and payment directly with the professional. No hidden platform fees.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: High-Converting Trust Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-lg relative overflow-hidden">
                {/* 3 Overlapping Avatars */}
                <div className="flex items-center justify-center -space-x-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#800020] text-white border-2 border-white text-xs font-bold shadow-xs">
                    RK
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-600 text-white border-2 border-white text-xs font-bold shadow-xs">
                    SP
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-700 text-white border-2 border-white text-xs font-bold shadow-xs">
                    AM
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900">Direct Technician Network</h3>
                <p className="mt-1 text-xs text-slate-500">Connecting households directly with verified technicians</p>

                {/* 3 Sub-stat boxes */}
                <div className="mt-8 grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="text-lg font-black text-slate-900">100%</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">AADHAAR VERIFIED</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="text-lg font-black text-slate-900">0%</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">MIDDLEMAN CUT</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="text-lg font-black text-[#800020]">₹50</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">BASE RATE</div>
                  </div>
                </div>

                {/* Verification reassurance */}
                <div className="mt-6 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full py-1.5 px-4 w-fit mx-auto">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified & secure</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guaranteed Direct Doorstep Protection Band */}
          <div className="mt-16 pt-12 border-t border-slate-200/80">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/60 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs mb-3">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Direct Guarantees</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Honest Doorstep Work. <span className="text-[#800020]">Zero Hidden Surprises.</span>
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl">
                  Every service is backed by verified Aadhaar credentials, live 4-digit security OTPs, and direct UPI settlements.
                </p>
              </div>
              <Link
                href={isAuthenticated ? "/consumer/book" : "/login?redirect=/consumer/book"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all shrink-0 self-start md:self-auto active:scale-98"
              >
                <span>Book a Verified Technician Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0 border border-rose-100 mb-3">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">100% Aadhaar Verified</h4>
                  <p className="text-xs text-slate-500 mt-1">DigiLocker verified professionals near you</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-100 mb-3">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">₹50 Base Labour Rate</h4>
                  <p className="text-xs text-slate-500 mt-1">Fixed standard formula with zero surge fees</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 mb-3">
                    <Tag className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">0% Commission Cut</h4>
                  <p className="text-xs text-slate-500 mt-1">100% labour goes straight to the technician</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100 mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Doorstep 4-Digit OTP</h4>
                  <p className="text-xs text-slate-500 mt-1">Work timer only begins upon physical arrival</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: EXPERIENCE THE APP (Matching Image 5 with Second Floating Phone)
         ========================================================================= */}
      <section id="app" className="py-20 bg-[#FCFBFA] border-b border-slate-200/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-[#800020] tracking-tight">
              Experience The App
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Find verified pros near you, connect in seconds, and manage everything from one place—no commission, no middlemen.
            </p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Floating Smartphone Showing Live In-App Results */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="animate-float">
                <div className="relative w-[280px] sm:w-[320px] rounded-[48px] border-[10px] border-slate-900 bg-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-24 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-slate-900 ml-auto mr-3" />
                  </div>

                  {/* App Screen inside phone */}
                  <div className="bg-gradient-to-b from-[#8B0020] to-[#550014] text-white pt-8 pb-4 px-4 rounded-[38px] min-h-[580px] flex flex-col justify-between">
                    <div>
                      {/* Top Time and Network */}
                      <div className="flex items-center justify-between text-[11px] text-white/80 px-2 pt-1 font-semibold">
                        <span>9:41</span>
                        <div className="flex items-center gap-1">
                          <span>5G</span>
                          <div className="h-2.5 w-4 rounded-xs border border-white/80 p-0.5">
                            <div className="h-full w-full bg-white rounded-2xs" />
                          </div>
                        </div>
                      </div>

                      {/* Header Greeting */}
                      <div className="mt-4 px-2">
                        <span className="text-lg font-bold text-white block">Good morning</span>
                      </div>

                      {/* Search Bar */}
                      <div className="mt-3 relative">
                        <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-white/70" />
                        <input
                          type="text"
                          readOnly
                          placeholder="Search electricians, plumbers..."
                          className="w-full rounded-full bg-white/20 backdrop-blur-sm border border-white/20 py-2 pl-9 pr-3 text-[11px] text-white placeholder:text-white/70"
                        />
                      </div>

                      {/* Filter Chips */}
                      <div className="mt-3 flex items-center gap-1.5 px-1 overflow-x-auto text-[10px]">
                        <span className="rounded-full bg-white text-[#800020] font-bold px-2.5 py-1 shadow-xs">
                          Nearby
                        </span>
                        <span className="rounded-full bg-white/20 text-white font-medium px-2.5 py-1">
                          Verified
                        </span>
                        <span className="rounded-full bg-white/20 text-white font-medium px-2.5 py-1">
                          Top rated
                        </span>
                      </div>

                      {/* Live Nearby Technician Cards */}
                      <div className="mt-4 space-y-2.5">
                        {/* Technician 1: Electrician */}
                        <div className="rounded-2xl bg-white p-3 shadow-md text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                            <Zap className="h-4 w-4 fill-[#800020]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">Electrician</span>
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                                ★ 4.9
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              2 km away · {selectedCity.split(",")[0] || "Local"}
                            </span>
                          </div>
                        </div>

                        {/* Technician 2: Plumber */}
                        <div className="rounded-2xl bg-white p-3 shadow-md text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <Droplets className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">Plumber</span>
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                                ★ 5.0
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              0.8 km away · {selectedCity.split(",")[0] || "Local"}
                            </span>
                          </div>
                        </div>

                        {/* Technician 3: Carpenter */}
                        <div className="rounded-2xl bg-white p-3 shadow-md text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                            <Hammer className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">Carpenter</span>
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                                ★ 4.8
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              1.2 km away · {selectedCity.split(",")[0] || "Local"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Navigation Bar Inside Mobile */}
                    <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-around text-white">
                      <div className="flex flex-col items-center">
                        <Smartphone className="h-4 w-4" />
                        <span className="text-[9px] mt-0.5 font-bold">Home</span>
                      </div>
                      <div className="flex flex-col items-center text-white/70">
                        <PhoneCall className="h-4 w-4" />
                        <span className="text-[9px] mt-0.5">Direct</span>
                      </div>
                      <div className="flex flex-col items-center text-white/70">
                        <User className="h-4 w-4" />
                        <span className="text-[9px] mt-0.5">Profile</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Options near the mobile */}
            <div className="lg:col-span-7 space-y-6">
              {/* Floating Options Title */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1 text-xs font-bold text-[#800020] mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Platform Navigation</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Jump Directly To Sections
                </h3>
              </div>

              {/* 4 Floating Options near the second mobile */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* 1. How It Works */}
                <Link
                  href="/how-it-works"
                  className="animate-float rounded-2xl border-2 border-slate-200/90 hover:border-[#800020] bg-white p-4 shadow-sm hover:shadow-lg transition-all group flex items-center gap-3.5 cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-xl bg-rose-50 text-[#800020] group-hover:bg-[#800020] group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#800020] transition-colors">
                        How It Works
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#800020] group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                      3-step zero-commission flow
                    </span>
                  </div>
                </Link>

                {/* 2. Use the App */}
                <Link
                  href="/download"
                  className="animate-float-delayed rounded-2xl border-2 border-slate-200/90 hover:border-[#800020] bg-white p-4 shadow-sm hover:shadow-lg transition-all group flex items-center gap-3.5 cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-xl bg-rose-50 text-[#800020] group-hover:bg-[#800020] group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#800020] transition-colors">
                        Use the App
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#800020] group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                      Download iOS & Android App
                    </span>
                  </div>
                </Link>

                {/* 3. Pricing */}
                <Link
                  href="/pricing"
                  className="animate-float-slow rounded-2xl border-2 border-slate-200/90 hover:border-[#800020] bg-white p-4 shadow-sm hover:shadow-lg transition-all group flex items-center gap-3.5 cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-xl bg-rose-50 text-[#800020] group-hover:bg-[#800020] group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                    <Calculator className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#800020] transition-colors">
                        Pricing
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#800020] group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                      Base ₹50 + ₹15 travel rule
                    </span>
                  </div>
                </Link>

                {/* 4. Join as Technician */}
                <Link
                  href="/register?role=WORKER"
                  className="animate-float-reverse rounded-2xl border-2 border-slate-200/90 hover:border-[#800020] bg-white p-4 shadow-sm hover:shadow-lg transition-all group flex items-center gap-3.5 cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-xl bg-rose-50 text-[#800020] group-hover:bg-[#800020] group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#800020] transition-colors">
                        Join as Technician
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#800020] group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                      0% Commission · Direct payout
                    </span>
                  </div>
                </Link>
              </div>

              {/* 4 Progression Cards (01 Discover, 02 Connect, 03 Near you, 04 Trust the profile) */}
              <div className="pt-4 border-t border-slate-200/70 grid gap-3 sm:grid-cols-2">
                {/* Card 01: Discover */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-[#800020]/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-[#800020] bg-rose-50 px-1.5 py-0.2 rounded">01</span>
                        <h4 className="text-xs font-bold text-slate-900">Discover</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Browse categories and see verified technicians near you on map.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 02: Connect */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-[#800020]/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                      <PhoneCall className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-[#800020] bg-rose-50 px-1.5 py-0.2 rounded">02</span>
                        <h4 className="text-xs font-bold text-slate-900">Connect</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Call or chat directly—no booking queue or platform fees.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 03: Near you */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-[#800020]/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-[#800020] bg-rose-50 px-1.5 py-0.2 rounded">03</span>
                        <h4 className="text-xs font-bold text-slate-900">Near you</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Location-aware results whether you&apos;re at home or on a job site.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 04: Trust the profile */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:border-[#800020]/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-[#800020] bg-rose-50 px-1.5 py-0.2 rounded">04</span>
                        <h4 className="text-xs font-bold text-slate-900">Trust the profile</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Check ratings, reviews, and services before you connect.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: FOR TECHNICIANS - FAIR ONBOARDING & 0% TO 7% COMMISSION (Third Floating Phone)
         ========================================================================= */}
      <section id="technicians" className="py-20 lg:py-28 bg-gradient-to-b from-[#FFFDFB] via-[#FFF8F6] to-[#FCFBFA] border-b border-slate-200/70 relative overflow-hidden">
        {/* Soft background ambient radial glows */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-rose-100/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-amber-50/70 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#800020]/10 border border-[#800020]/20 px-4 py-1.5 text-xs font-bold text-[#800020] shadow-2xs mb-3">
              <HardHat className="h-3.5 w-3.5 text-[#800020]" />
              <span>Technician Onboarding</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Built For Technicians. <br />
              <span className="text-[#800020]">Verified Dignity &amp; 0% to 7% Fair Commission.</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
              DigiLocker verification, practical skill assessment, and <strong className="text-slate-900">0% commission</strong> when using tools from our cooperative store.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Floating Third Smartphone (Same Maroon Theme & Clean Cards) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative animate-float">
                {/* FLOATING BADGE 1: SHIELD (Top-left) */}
                <div className="absolute -left-5 sm:-left-7 top-14 z-20 flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-white shadow-xl border border-slate-100 animate-float-slow">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>

                {/* FLOATING BADGE 2: PERCENT (Top-right) */}
                <div className="absolute -right-5 sm:-right-7 top-24 z-20 flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-white shadow-xl border border-slate-100 animate-float-delayed">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                    <Percent className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>

                {/* FLOATING BADGE 3: AWARD (Bottom-left) */}
                <div className="absolute -left-4 sm:-left-6 bottom-20 z-20 flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-white shadow-xl border border-slate-100 animate-float">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-rose-50 text-[#800020]">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>

                {/* Mobile Device Frame */}
                <div className="relative w-[280px] sm:w-[320px] rounded-[48px] border-[10px] border-slate-900 bg-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-24 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-slate-900 ml-auto mr-3" />
                  </div>

                  {/* Phone Screen: Exact Same Maroon Gradient as Mobiles 1 & 2 */}
                  <div className="bg-gradient-to-b from-[#8B0020] to-[#550014] text-white pt-8 pb-4 px-4 rounded-[38px] min-h-[580px] flex flex-col justify-between relative overflow-hidden">
                    {/* Screen Subtle Glow */}
                    <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />

                    <div>
                      {/* Top Time and Network (Matching Mobiles 1 & 2) */}
                      <div className="flex items-center justify-between text-[11px] text-white/80 px-2 pt-1 font-semibold">
                        <span>9:41</span>
                        <div className="flex items-center gap-1">
                          <span>5G</span>
                          <div className="h-2.5 w-4 rounded-xs border border-white/80 p-0.5">
                            <div className="h-full w-full bg-white rounded-2xs" />
                          </div>
                        </div>
                      </div>

                      {/* Technician Profile Header */}
                      <div className="flex items-center justify-between mt-3 px-1">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] text-white/70 block font-medium">Technician Mode</span>
                            <span className="text-xs font-bold text-white">Verified Partner</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Online
                        </span>
                      </div>

                      {/* Screen Title */}
                      <h2 className="text-xl sm:text-2xl font-black text-white mt-5 leading-tight">
                        Worker Hub
                      </h2>

                      {/* Quick Status Chips */}
                      <div className="mt-3 flex items-center gap-1.5 px-1 overflow-x-auto text-[10px]">
                        <span className="rounded-full bg-white text-[#800020] font-bold px-2.5 py-1 shadow-xs">
                          DigiLocker ✓
                        </span>
                        <span className="rounded-full bg-white/20 text-white font-medium px-2.5 py-1">
                          Skill Tested
                        </span>
                        <span className="rounded-full bg-white/20 text-white font-medium px-2.5 py-1">
                          0% Fee
                        </span>
                      </div>

                      {/* Minimal, Simple Cards inside Phone */}
                      <div className="mt-4 space-y-2.5">
                        {/* 1. DigiLocker Identity */}
                        <div className="rounded-2xl bg-white p-3 shadow-md text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">DigiLocker Identity</span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                              Aadhaar &amp; Police Check
                            </span>
                          </div>
                        </div>

                        {/* 2. Trade Skill */}
                        <div className="rounded-2xl bg-white p-3 shadow-md text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <Award className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">Trade Skill</span>
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Level 2</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                              Practical Assessment Passed
                            </span>
                          </div>
                        </div>

                        {/* 3. 0% Commission */}
                        <div className="rounded-2xl bg-white p-3 shadow-md text-slate-900 flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-rose-50 text-[#800020] flex items-center justify-center shrink-0">
                            <Percent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">0% Commission</span>
                              <span className="text-[10px] font-bold text-[#800020] bg-rose-50 px-1.5 py-0.5 rounded">Store Tools</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                              ₹0 fee on marketplace tools (Max 7%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Navigation Bar Inside Mobile (Matching Mobile 2) */}
                    <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-around text-white">
                      <div className="flex flex-col items-center">
                        <Smartphone className="h-4 w-4" />
                        <span className="text-[9px] mt-0.5 font-bold">Jobs</span>
                      </div>
                      <div className="flex flex-col items-center opacity-70">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-[9px] mt-0.5 font-medium">Verify</span>
                      </div>
                      <div className="flex flex-col items-center opacity-70">
                        <Percent className="h-4 w-4" />
                        <span className="text-[9px] mt-0.5 font-medium">Earnings</span>
                      </div>
                      <div className="flex flex-col items-center opacity-70">
                        <User className="h-4 w-4" />
                        <span className="text-[9px] mt-0.5 font-medium">Profile</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 4 Simple & Understandable Explanatory Cards */}
            <div className="lg:col-span-7 space-y-3">
              {/* Step 1: DigiLocker Verification */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-[#800020]/40 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Step 01
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        DigiLocker Verification
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Instant paperless Aadhaar verification for trusted and safe service.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Skill Assessment */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-[#800020]/40 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        Step 02
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Skill Assessment
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Quick trade evaluation in Marathi, Hindi, or English to certify skills.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: 0% to 7% Commission */}
              <div className="rounded-2xl border-2 border-[#800020]/30 bg-rose-50/20 p-4 shadow-2xs hover:border-[#800020] transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#800020] border border-rose-200 shrink-0">
                    <Percent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-[#800020] bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                        Step 03
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        0% Commission on Tools
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      0% commission when using tools from our cooperative store (max 7% otherwise).
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Direct OTP & Instant UPI */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-[#800020]/40 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Step 04
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Direct UPI Payout
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      4-digit arrival OTP handshake with instant direct UPI bank payout.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button: Single Clean CTA without any technician portal button */}
              <div className="pt-2">
                <Link
                  href="/register?role=WORKER"
                  className="inline-flex items-center gap-2 rounded-full bg-[#800020] hover:bg-[#66001a] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <span>Join as Verified Technician</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: TRANSPARENT PRICING & DUAL PORTAL ACCESS (Features Intact)
         ========================================================================= */}
      <section id="pricing" className="py-20 bg-white border-b border-slate-200/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#800020] bg-rose-50 border border-rose-200 px-3 py-1 rounded-full mb-3">
              <Calculator className="h-3.5 w-3.5 text-[#800020]" />
              <span>Standard Pricing Formula</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900">
              Low-Cost & Distance-Based Pricing Rules
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              All prices are calculated with clear standard base rates starting at ₹50. Zero hidden markups.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* Price Components */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#800020]">Price Components</h3>
              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">1. Base Service Rate</span>
                  <span className="text-xs font-black text-[#800020]">Starts at ₹50.00</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Basic repairs: fan blade tightening, switch fix, tap washer change, door latch repairs.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">2. Standard Travel Fee (≤ 5.0 km)</span>
                  <span className="text-xs font-black text-slate-900">₹15.00 Flat</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Guaranteed travel fee compensation for technicians visiting within standard 5 km.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">3. Extra Distance (&gt; 5.0 km)</span>
                  <span className="text-xs font-black text-slate-900">₹3.25 / km</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Formula: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">₹15 + (Distance - 5.0) × ₹3.25</code>
                </p>
              </div>
            </div>

            {/* Example Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Calculated Examples</h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Distance</th>
                      <th className="p-3">Base</th>
                      <th className="p-3">Travel</th>
                      <th className="p-3 text-[#800020] font-black">Estimated Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="p-3 font-semibold">3.0 km (Local)</td>
                      <td className="p-3">₹50.00</td>
                      <td className="p-3">₹15.00</td>
                      <td className="p-3 font-bold text-slate-900">₹65.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">5.0 km (Standard)</td>
                      <td className="p-3">₹50.00</td>
                      <td className="p-3">₹15.00</td>
                      <td className="p-3 font-bold text-slate-900">₹65.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">8.0 km (+3 km)</td>
                      <td className="p-3">₹50.00</td>
                      <td className="p-3">₹24.75</td>
                      <td className="p-3 font-bold text-slate-900">₹74.75</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] text-[#800020]">
                <strong>0% Platform Deductions:</strong> Full payment goes directly to the technician upon customer OTP completion.
              </div>
            </div>
          </div>

          {/* DUAL PORTAL ACCESS: Customer & Technician Portals */}
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Customer Card */}
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-[#800020]/50 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#800020] font-bold">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Customer Portal</h3>
                      <p className="text-xs text-slate-500 font-medium">Book repairs, track ETA, verify OTP</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Customer
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                <Link
                  href={isAuthenticated ? "/consumer/book" : "/login?redirect=/consumer/book"}
                  className="rounded-xl bg-[#800020] hover:bg-[#66001a] px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  Book a Repair
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register?role=CONSUMER"
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors"
                >
                  DigiLocker Register
                </Link>
              </div>
            </div>

            {/* Worker Card */}
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-[#800020]/50 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 font-bold">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Technician Portal</h3>
                      <p className="text-xs text-slate-500 font-medium">Accept local requests, direct payouts</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    Technician
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                <Link
                  href={isAuthenticated ? "/worker/dashboard" : "/login?redirect=/worker/dashboard"}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  Worker Dashboard
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors"
                >
                  Technician Login
                </Link>
                <Link
                  href="/register?role=WORKER"
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-[#800020] transition-colors"
                >
                  Join as Technician
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Multilingual Voice AI Booking Modal (Marathi / Hindi / English) */}
      <VoiceJobModal
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onConfirmJob={handleVoiceJobConfirm}
      />

      {/* Mobile-Only PWA App Installation Prompt */}
      <MobilePwaInstallPrompt />
    </div>
  );
}
