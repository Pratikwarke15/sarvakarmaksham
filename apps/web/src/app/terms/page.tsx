"use client";

import Link from "next/link";
import { ArrowLeft, Shield, FileText, Scale, Users, CheckCircle2, ChevronRight } from "lucide-react";

export default function TermsOfUsePage() {
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
              <Scale className="h-4 w-4" />
            </div>
            <span className="font-heading font-black text-sm text-slate-900">
              सर्वकर्मक्षमः <span className="text-[#800020]">Legal</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#800020]/8 via-transparent to-transparent pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#800020]/10 border border-[#800020]/20 px-3.5 py-1 text-xs font-bold text-[#800020]">
            <FileText className="h-3.5 w-3.5" />
            <span>Platform Cooperative Bylaws & User Agreement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
            Terms of Use & Member Agreement
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Sarvakarmakshamah is a democratic platform cooperative owned collectively by gig and
            platform workers and cooperative societies across India. By accessing our services, you
            agree to these terms designed to preserve fair wages, transparent commission caps, and worker dignity.
          </p>

          <div className="pt-2 text-xs font-semibold text-slate-500">
            Effective Date: January 1, 2026 • Version 2.4 (Platform Cooperative Framework)
          </div>
        </div>
      </section>

      {/* Main Legal Content Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 space-y-10">
        {/* Key Cooperative Principles Card */}
        <div className="rounded-3xl border border-[#800020]/25 bg-gradient-to-br from-[#800020]/5 to-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2.5 mb-4">
            <Users className="h-5 w-5 text-[#800020]" />
            Core Cooperative Governance Principles
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>0% to 5% Maximum Commission:</strong> Payouts are directed directly to workers; no 20-30% venture-capital extractive commissions.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Democratic One Member, One Vote:</strong> Service standards, dispute policies, and fee structures are decided cooperatively.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Social Security Vault:</strong> Built-in contributions under the Code on Social Security 2020 for healthcare, accident insurance, and pensions.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Verified Trust & Safety:</strong> UIDAI paperless e-KYC and DigiLocker-based digital credential verification.
              </span>
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">1.</span> Acceptance of Terms & Cooperative Structure
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            By creating an account, browsing service listings, booking appointments, or registering as a service
            worker on Sarvakarmakshamah (&quot;the Platform&quot;), you enter into a legally binding contract with
            the Sarvakarmakshamah National Cooperative Federation. Unlike proprietary corporate ride-hailing or gig apps,
            this platform is an open digital cooperative operating pursuant to the Multi-State Co-operative Societies Act
            and India&apos;s digital public infrastructure.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">2.</span> Member Accounts & Verification Requirements
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            All users must provide accurate, verifiable identity details. Mobile authentication is validated through
            server-generated, variable 6-digit one-time passwords (OTP). For service providers (workers) and consumers requesting
            high-trust on-premise tasks, identity verification is facilitated via paperless digital verification such as
            DigiLocker and Aadhaar e-KYC sandbox channels.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
            <li>You may not impersonate any individual or cooperative entity.</li>
            <li>Accounts are strictly non-transferable.</li>
            <li>Verification documents uploaded to the platform must belong solely to the registered individual.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">3.</span> Transparent Pricing & Escrow Payment System
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            To ensure complete trust between consumers and workers:
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 text-sm text-slate-700 shadow-xs">
            <div className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#800020] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Escrow Protection:</strong> When a consumer confirms a booking, payment is secured in a designated cooperative escrow vault until job completion.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#800020] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Direct Payout:</strong> Upon verified job completion confirmed with consumer OTP or mutual sign-off, the agreed earnings are released directly to the worker&apos;s digital wallet or bank account.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-[#800020] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Administrative Cap:</strong> The platform deducts a capped cooperative maintenance fee (strictly between 0% and 5%), dedicated exclusively to cloud infrastructure, SMS gateways, and member insurance.
              </span>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">4.</span> Code on Social Security 2020 Compliance
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            In compliance with Section 114 of the Code on Social Security, 2020 (Government of India), Sarvakarmakshamah
            deducts a statutory welfare allocation directly into each worker&apos;s Social Security Vault. These funds
            are earmarked exclusively for:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
            <li>Accidental death and disability insurance during on-duty gigs.</li>
            <li>Emergency healthcare and outpatient medical coverage.</li>
            <li>Old-age pension and retirement corpus accumulation.</li>
            <li>Maternity and education grants for eligible worker families.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">5.</span> Mutual Respect, Anti-Discrimination & Safety
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            The platform enforces a zero-tolerance policy against caste, religion, gender, or regional discrimination.
            Both consumers and gig workers agree to maintain professional courtesy, safe work environments, and truthful
            reviews. Harassment, threats, non-payment, or unapproved cancellations result in immediate arbitration and potential
            account debarment.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">6.</span> Dispute Resolution & Peer Arbitration
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Unlike opaque algorithms that arbitrarily deactivate workers, Sarvakarmakshamah implements a democratic
            Peer Arbitration Tribunal. Any dispute involving booking quality, payment hold, or ratings is evaluated by an
            elected panel of cooperative members within 48 hours under the Arbitration and Conciliation Act, 1996.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span className="text-[#800020]">7.</span> Limitation of Liability & Contact
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            While Sarvakarmakshamah verifies credentials and inspects cooperative safety standards, users are responsible
            for adhering to safety precautions on premises. In no event shall the cooperative federation be liable for indirect
            or consequential damages beyond the value of the booking transaction in dispute.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            For legal inquiries or cooperative bylaws inspection:
            <br />
            <strong>Legal & Member Secretariat:</strong> legal@sarvakarmakshamah.gov.in
            <br />
            Sarvakarmakshamah National Cooperative Digital Federation, New Delhi, India.
          </div>
        </section>

        {/* Action Buttons */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#800020] text-white px-6 py-3 text-sm font-bold shadow-md shadow-[#800020]/20 hover:bg-[#68001a] transition"
          >
            <span>Proceed to Login</span>
            <ChevronRight className="h-4 w-4" />
          </Link>

          <Link
            href="/privacy"
            className="w-full sm:w-auto text-center text-xs font-bold text-slate-700 hover:text-[#800020] transition"
          >
            View Privacy Policy & Data Protections →
          </Link>
        </div>
      </main>
    </div>
  );
}
