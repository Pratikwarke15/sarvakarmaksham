"use client";

import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ShieldCheck,
  CheckCircle2,
  Zap,
  MapPin,
  KeyRound,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Smartphone,
  PhoneCall,
  Coins,
} from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Request a Service in Seconds",
    desc: "Tell us what’s broken using voice booking or 1-tap categories. Our platform immediately detects your neighborhood and broadcasts to certified local electricians, plumbers, and carpenters.",
    icon: Smartphone,
  },
  {
    step: "02",
    title: "Direct Technician Connection",
    desc: "A nearby verified pro accepts the work order. You see their full profile, Aadhaar badge, ratings, and live arrival status with turn-by-turn ETA. Call or chat directly without intermediaries.",
    icon: MapPin,
  },
  {
    step: "03",
    title: "Secure 4-Digit Doorstep Start OTP",
    desc: "When the technician arrives at your door, share your secret 4-digit start OTP. Work cannot be initiated or billed without your explicit physical confirmation.",
    icon: KeyRound,
  },
  {
    step: "04",
    title: "Transparent Labour & Real Material Receipts",
    desc: "Labour starts at the transparent ₹50 base rate. If replacement hardware is required, the technician uploads store bill photos for your 1-tap digital approval before purchase.",
    icon: FileText,
  },
  {
    step: "05",
    title: "Inspect, Provide Completion OTP & Pay",
    desc: "Test the repair. Once you are 100% satisfied, share your completion OTP. Pay securely via direct UPI or cash. 100% of the labour fee goes directly to the technician.",
    icon: CheckCircle2,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#FCFBFA] flex flex-col justify-between text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200/60 px-4 py-1.5 text-xs font-bold text-[#800020]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>End-to-End Workflow Guide</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            How <span className="text-[#800020]">सर्वकर्मक्षमः</span> Works
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Connecting customers directly with verified technicians for doorstep repair and maintenance. Transparent low-cost pricing starting at ₹50.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="group rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-rose-50 text-[#800020] flex items-center justify-center border border-rose-100">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-3xl font-black text-slate-200 group-hover:text-[#800020]/20 transition-colors font-heading">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="rounded-3xl bg-slate-950 text-white p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="text-2xl font-bold">Ready to Book a Doorstep Technician?</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-lg">
              Find verified plumbers, electricians, and carpenters near you. Starting at ₹50.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/consumer/book"
              className="rounded-full bg-[#800020] hover:bg-[#66001a] text-white px-7 py-3 text-xs font-bold shadow-md transition-all active:scale-98"
            >
              Book a Repair Now
            </Link>
            <Link
              href="/download"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 text-xs font-bold transition-colors"
            >
              Download App
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
