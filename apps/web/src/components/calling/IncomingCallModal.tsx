"use client";

import React from "react";
import Image from "next/image";
import { Phone, PhoneOff, Shield, User, Volume2 } from "lucide-react";
import type { IncomingCallData } from "./VoiceCallContext";

interface IncomingCallModalProps {
  incomingCall: IncomingCallData;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({
  incomingCall,
  onAccept,
  onReject,
}: IncomingCallModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-6 sm:p-7 text-center overflow-hidden">
        {/* Animated ambient pulse rings */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[#800020]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Incoming PWA Voice Call</span>
        </div>

        {/* Caller Avatar with pulsing ripples */}
        <div className="relative mx-auto mb-4 w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full border border-emerald-500/30 animate-pulse" />
          {incomingCall.callerPhoto ? (
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-400 shadow-lg">
              <Image
                src={incomingCall.callerPhoto}
                alt={incomingCall.callerName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 to-[#800020] border-2 border-emerald-400 flex items-center justify-center text-white text-3xl font-black shadow-lg">
              {incomingCall.callerName ? (
                incomingCall.callerName.charAt(0).toUpperCase()
              ) : (
                <User className="h-10 w-10" />
              )}
            </div>
          )}
        </div>

        {/* Caller Details */}
        <h3
          id="incoming-call-title"
          className="text-xl font-bold font-heading text-white truncate"
        >
          {incomingCall.callerName || "Service Partner"}
        </h3>

        <p className="text-xs text-slate-400 mt-1 font-medium">
          {incomingCall.callerRole === "WORKER"
            ? "Verified Technician"
            : "Consumer Resident"}
        </p>

        {/* Privacy & Security banner */}
        <div className="my-5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>No phone numbers shared • Peer-to-peer WebRTC</span>
        </div>

        {/* Action Buttons: Accept / Reject */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onReject}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 active:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-bold text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          >
            <PhoneOff className="h-4 w-4" />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all animate-bounce focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
          >
            <Phone className="h-4 w-4" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
