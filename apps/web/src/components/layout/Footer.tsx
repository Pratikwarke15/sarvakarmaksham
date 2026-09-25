"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-700" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & Description */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs overflow-hidden border border-slate-200 group-hover:border-[#800020] transition-colors p-1 shrink-0">
                <img
                  src="/images/logo.png"
                  alt="सर्वकर्मक्षमः"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-[#800020] font-heading tracking-tight">
                  सर्वकर्मक्षमः.
                </span>
                <span className="text-[10px] font-semibold text-slate-500 -mt-0.5 tracking-wider uppercase">
                  Sarvakarmakshamah • People Work Together
                </span>
              </div>
            </Link>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs">
              Direct doorstep services connecting customers with verified local technicians. Fair pricing with 0% hidden platform cuts.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#800020] mb-3.5">
              Quick Links
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/consumer/book" className="hover:text-[#800020] transition-colors">
                  Book a Repair
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#800020] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#800020] transition-colors">
                  Transparent Pricing
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-[#800020] transition-colors">
                  Download Mobile App
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: For Technicians */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#800020] mb-3.5">
              For Technicians
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/register?role=WORKER" className="hover:text-[#800020] transition-colors font-medium">
                  Join as Technician
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#800020] transition-colors">
                  Technician Login
                </Link>
              </li>
              <li>
                <Link href="/worker/dashboard" className="hover:text-[#800020] transition-colors">
                  Worker Dashboard
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#800020] transition-colors">
                  0% Commission &amp; Tool Rules
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#800020] mb-3.5">
              Contact
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#800020] shrink-0 mt-0.5" />
                <span>Godavari College of Engineering, Jalgaon, Maharashtra 425003</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#800020] shrink-0" />
                <a href="tel:+919834171226" className="hover:text-[#800020] transition-colors font-medium">
                  +91 9834171226
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#800020] shrink-0" />
                <a href="mailto:kalpeshwarke05@gmail.com" className="hover:text-[#800020] transition-colors font-medium">
                  kalpeshwarke05@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            © 2026 <strong className="text-[#800020] font-bold">सर्वकर्मक्षमः</strong> (Sarvakarmakshamah). All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="hover:text-[#800020] transition-colors">
              How It Works
            </Link>
            <span>·</span>
            <Link href="/pricing" className="hover:text-[#800020] transition-colors">
              Pricing
            </Link>
            <span>·</span>
            <Link href="/download" className="hover:text-[#800020] transition-colors">
              App
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
