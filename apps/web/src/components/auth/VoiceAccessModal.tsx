"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mic, X, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface VoiceAccessModalProps {
  currentPath?: "login" | "register";
}

export function VoiceAccessModal({ currentPath = "login" }: VoiceAccessModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const feature = params.get("feature");
      if (feature === "voice-ai") {
        setIsOpen(true);
      }
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-rose-200 animate-slide-up text-left">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#800020] border border-rose-200">
            <Mic className="h-6 w-6 text-[#800020] animate-pulse" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#800020]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#800020] uppercase tracking-wide">
              <Sparkles className="h-3 w-3" /> Voice AI Feature
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">Account Required</h2>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Please <strong>log in</strong> or <strong>create a free account</strong> to access our regional Voice AI booking. You will be able to speak your issue in Marathi, Hindi, or English to match nearby verified technicians instantly!
        </p>

        {/* Benefit bullets */}
        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3.5 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Instant voice audio analysis in मराठी, हिंदी & English</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Automatic diagnostic rates starting at ₹50</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          {currentPath === "login" ? (
            <>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl bg-[#800020] hover:bg-[#66001a] py-2.5 px-4 text-xs font-bold text-white shadow-xs transition-colors text-center"
              >
                Log In Below
              </button>
              <Link
                href="/register?feature=voice-ai&redirect=/consumer/book"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 px-4 text-xs font-bold text-slate-700 transition-colors text-center inline-flex items-center justify-center gap-1"
              >
                <span>Create Account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl bg-[#800020] hover:bg-[#66001a] py-2.5 px-4 text-xs font-bold text-white shadow-xs transition-colors text-center"
              >
                Register Below
              </button>
              <Link
                href="/login?feature=voice-ai&redirect=/consumer/book"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 px-4 text-xs font-bold text-slate-700 transition-colors text-center inline-flex items-center justify-center gap-1"
              >
                <span>Log In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
