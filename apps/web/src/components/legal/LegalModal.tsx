"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, FileText, ShieldCheck, ExternalLink, Scale, CheckCircle2, Lock, EyeOff } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "terms" | "privacy";
}

export function LegalModal({ isOpen, onClose, defaultTab = "terms" }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(defaultTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, defaultTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FDFBF9]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#800020] flex items-center justify-center text-white shadow-xs">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading">
                Legal & Governance Charter
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Sarvakarmakshamah Platform Cooperative
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={activeTab === "terms" ? "/terms" : "/privacy"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#800020] hover:text-[#68001a] px-3 py-1.5 rounded-xl hover:bg-rose-50 transition"
              title="Open full page in new tab"
            >
              <span>Full Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition -mb-px ${
              activeTab === "terms"
                ? "border-[#800020] text-[#800020]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Terms of Use</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition -mb-px ${
              activeTab === "privacy"
                ? "border-[#800020] text-[#800020]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-slate-700 text-xs leading-relaxed">
          {activeTab === "terms" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#800020]/20 bg-rose-50/40 p-4">
                <h4 className="font-bold text-[#800020] text-sm mb-1">
                  Cooperative Bylaws Summary
                </h4>
                <p className="text-slate-600">
                  Sarvakarmakshamah is an open democratic platform cooperative. By using this service,
                  consumers and workers agree to cooperative governance, wage security, and dispute resolution.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">1. Member Rights & Responsibilities</h5>
                <p>
                  All workers and consumers join as participatory members under the cooperative charter.
                  Workers retain democratic voting rights (one member, one vote) regarding commission caps
                  and dispute resolution protocols.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">2. 0% to 5% Democratic Commission Cap</h5>
                <p>
                  Unlike private gig apps extracting 20–35% commissions, platform commissions are capped
                  between 0% and 5% exclusively to fund platform hosting, insurance, and social security.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">3. Verification & Digital Identity</h5>
                <p>
                  To ensure safety, members undergo paperless Aadhaar e-KYC or DigiLocker authorization.
                  Members agree to provide accurate credentials and adhere to platform safety codes.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">4. Code on Social Security 2020</h5>
                <p>
                  All active gig workers receive direct access to cooperative social security vaults
                  covering accidental insurance, health benefits, and emergency micro-credits.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">5. Dispute Mediation</h5>
                <p>
                  Disputes between consumers and service providers are mediated by an elected worker-consumer
                  cooperative committee prior to any external legal arbitration.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                <h4 className="font-bold text-emerald-800 text-sm mb-1">
                  DPDP Act 2023 & UIDAI Compliance
                </h4>
                <p className="text-slate-600">
                  As a cooperative data fiduciary, we never sell user data. Aadhaar numbers are never stored
                  in plain text, and credentials are encrypted using AES-256 bit protocols.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">1. Data Minimization</h5>
                <p>
                  We collect strictly what is needed for identity authentication, matching service providers
                  with nearby consumers, and issuing cooperative payout disbursements.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">2. UIDAI & Aadhaar Privacy</h5>
                <p>
                  Full 12-digit Aadhaar numbers are securely routed to UIDAI/DigiLocker verification gateways
                  and never logged in plain text. Only masked references (XXXX-XXXX-1234) are stored.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">3. Zero Third-Party Advertising</h5>
                <p>
                  We do not sell, rent, or trade your personal or work data to third-party ad networks,
                  surveillance brokers, or credit bureaus.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-sm">4. Member Control & Right to Erasure</h5>
                <p>
                  Members may request an export of their transaction records or delete their profile at any time,
                  subject to statutory cooperative audit retention periods.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-[#FDFBF9]">
          <span className="text-[11px] text-slate-500">
            Effective: Jan 1, 2026 • v2.4 Platform Cooperative Framework
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
