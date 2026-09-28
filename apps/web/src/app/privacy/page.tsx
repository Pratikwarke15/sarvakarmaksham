"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, FileCheck, CheckCircle2, ChevronRight } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF9] text-slate-900 selection:bg-[#800020] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#800020] transition rounded-xl px-3 py-1.5 hover:bg-rose-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#800020] flex items-center justify-center text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-heading font-black text-sm text-slate-900">
              सर्वकर्मक्षमः <span className="text-[#800020]">Privacy</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#800020]/8 via-transparent to-transparent pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <Lock className="h-3.5 w-3.5" />
            <span>Digital Personal Data Protection Act, 2023 Compliant</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
            Privacy Policy & Data Protection Charter
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            At Sarvakarmakshamah, privacy is a fundamental human right. As a member-owned platform
            cooperative, we never sell your data, monetize surveillance, or profile workers for
            algorithmic exploitation.
          </p>

          <div className="pt-2 text-xs font-semibold text-slate-500">
            Last Updated: January 2026 • Certified by National Platform Cooperative Trust
          </div>
        </div>
      </section>

      {/* Main Privacy Sections */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 space-y-10">
        {/* Key Guarantees Card */}
        <div className="rounded-3xl border border-[#800020]/25 bg-gradient-to-br from-[#800020]/5 to-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2.5 mb-4">
            <EyeOff className="h-5 w-5 text-[#800020]" />
            Our Four Non-Negotiable Privacy Commitments
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero Commercialization:</strong> We will never sell, rent, or trade your personal or work data to advertisers or data brokers.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>UIDAI Privacy Compliance:</strong> Full 12-digit Aadhaar numbers are never stored in plain text. Masked identifiers (XXXX-XXXX-1234) only.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>AES-256 Bit Encryption:</strong> All sensitive credentials, tokens, and bank details are encrypted at rest and in transit.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Data Minimization:</strong> We only collect what is strictly necessary to route gigs, complete bookings, and distribute cooperative dividends.
              </span>
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">1.</span> Scope & Data Fiduciary Role
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Sarvakarmakshamah National Cooperative Digital Federation acts as a Data Fiduciary under the
            Digital Personal Data Protection (DPDP) Act, 2023. This policy covers all digital interactions on the web
            portal, mobile progressive web applications, and cooperative dashboard APIs.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">2.</span> Data We Collect & Collection Purpose
          </h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900 mb-1">A. Authentication & Account Data</h3>
              <p className="text-xs text-slate-600">
                Mobile number, email address, password hash (bcrypt), and server-generated 6-digit one-time passwords
                (which expire in 10 minutes and are cryptographically randomized).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900 mb-1">B. Geolocation Data</h3>
              <p className="text-xs text-slate-600">
                Coarse and precise GPS coordinates are collected solely when a worker is actively &quot;On Duty&quot; or when a
                consumer searches for local service availability. Geolocation tracking terminates automatically when
                a worker goes off-duty.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900 mb-1">C. DigiLocker & Identity Verification Data</h3>
              <p className="text-xs text-slate-600">
                To prevent fraud and maintain safety, our sandbox and production verification flows access authorized
                DigiLocker document metadata (Citizen Name, Date of Birth, Address, and Skill Certificates). Real biometric
                data is NEVER requested or accessible.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">3.</span> How Your Information Is Shared
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Data is strictly shared on a need-to-know basis:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
            <li>
              <strong>Between Consumer & Worker:</strong> Only necessary job dispatch details (first name, phone number,
              service address, rating, and verified badge) are shared during an active booking.
            </li>
            <li>
              <strong>With Cooperative Admin:</strong> Local cooperative managers monitor worker welfare, safety alerts,
              and dispute resolution records within their geographic cluster.
            </li>
            <li>
              <strong>Statutory Compliance:</strong> Social security contribution records are shared with the Ministry of
              Labour & Employment social security portal pursuant to the Code on Social Security 2020.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">4.</span> Technical Security Measures
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Server className="h-4 w-4 text-[#800020]" />
              Data Security Architecture
            </div>
            <p>
              • All network communication uses TLS 1.3 encryption.
              <br />
              • Database instances in PostgreSQL/Supabase employ transparent data encryption with row-level security.
              <br />
              • Session tokens utilize signed JSON Web Tokens (JWT) with mandatory expiration and redis blacklisting upon logout.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">5.</span> Member Rights & Grievance Redressal
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Under the DPDP Act 2023, you have the right to request access to your stored profile data, export your work
            and earnings history, or request full account deletion.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-900">Data Protection Officer (DPO) Contact:</div>
            <div>DPO Office, Sarvakarmakshamah National Cooperative</div>
            <div>Email: privacy@sarvakarmakshamah.gov.in</div>
            <div>Response turnaround time: Maximum 72 business hours.</div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
          <Link
            href="/terms"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white text-slate-800 px-6 py-3 text-sm font-bold hover:bg-slate-50 transition"
          >
            <span>← Read Terms of Use</span>
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#800020] text-white px-6 py-3 text-sm font-bold shadow-md shadow-[#800020]/20 hover:bg-[#68001a] transition"
          >
            <span>Back to Login</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
