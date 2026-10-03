"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  User,
  Shield,
  TrendingUp,
  AlertCircle,
  Minimize2,
  Maximize2,
  RefreshCw,
  WifiOff,
  Radio,
  Loader2,
  PhoneCall,
} from "lucide-react";
import type { CallState, ActiveCallData } from "./VoiceCallContext";

interface ActiveCallOverlayProps {
  callState: CallState;
  activeCall: ActiveCallData | null;
  isMuted: boolean;
  isSpeaker: boolean;
  micPermissionError: string | null;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  onOpenNegotiation: (orderId: string) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ActiveCallOverlay({
  callState,
  activeCall,
  isMuted,
  isSpeaker,
  micPermissionError,
  onToggleMute,
  onToggleSpeaker,
  onEndCall,
  onOpenNegotiation,
}: ActiveCallOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!activeCall && callState === "IDLE") return null;

  const participant = activeCall?.participant;
  const durationText = formatDuration(activeCall?.durationSec || 0);

  // Status text & badge
  let statusBadge = {
    text: "Connected",
    subtext: "Voice stream active",
    bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400 animate-pulse",
  };

  if (callState === "CALLING" || callState === "INITIATING") {
    statusBadge = {
      text: "Calling...",
      subtext: `Reaching ${participant?.name || "partner"}...`,
      bg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400 animate-spin",
    };
  } else if (callState === "RINGING") {
    statusBadge = {
      text: "Ringing...",
      subtext: "Recipient's phone is ringing...",
      bg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400 animate-ping",
    };
  } else if (callState === "CONNECTING") {
    statusBadge = {
      text: "Connecting...",
      subtext: "Establishing voice connection...",
      bg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      dot: "bg-blue-400 animate-ping",
    };
  } else if (callState === "RECONNECTING") {
    statusBadge = {
      text: "Reconnecting Network...",
      subtext: "Restoring audio stream...",
      bg: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      dot: "bg-orange-400 animate-ping",
    };
  } else if (callState === "ENDED") {
    statusBadge = {
      text: "Call Ended",
      subtext: "Voice call finished",
      bg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      dot: "bg-rose-400",
    };
  }

  // Minimized floating bubble
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9990] flex items-center gap-3 bg-slate-900 border border-slate-700/80 text-white rounded-full p-2 pr-4 shadow-2xl backdrop-blur-md animate-fade-in">
        <div className="relative h-10 w-10 rounded-full overflow-hidden border border-emerald-500 bg-slate-800 flex items-center justify-center">
          {participant?.avatarUrl ? (
            <Image
              src={participant.avatarUrl}
              alt={participant.name}
              fill
              className="object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-emerald-400" />
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
        </div>

        <div className="text-left">
          <p className="text-xs font-bold truncate max-w-[100px]">
            {participant?.name || "Ongoing Call"}
          </p>
          <p className="text-[10px] text-emerald-400 font-mono font-bold">
            {callState === "CONNECTED" ? durationText : statusBadge.text}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Expand Call View"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onEndCall}
          className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
          title="End Call"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Active Voice Call"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9990] w-[calc(100vw-2.5rem)] sm:w-96 rounded-3xl bg-slate-900/95 border border-slate-800 text-white shadow-2xl backdrop-blur-lg overflow-hidden animate-slide-up"
    >
      {/* Top Banner / Minimize button */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusBadge.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.text}</span>
          </div>
          {callState === "CONNECTED" && (
            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
              {durationText}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Minimize to floating bubble"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Mic Warning if denied or unavailable */}
      {micPermissionError && (
        <div className="mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-tight">{micPermissionError}</p>
        </div>
      )}

      {/* Participant info & visual soundwave */}
      <div className="p-5 text-center space-y-3">
        <div className="relative mx-auto w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-md">
          {participant?.avatarUrl ? (
            <Image
              src={participant.avatarUrl}
              alt={participant.name}
              fill
              className="object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-slate-400" />
          )}

          {callState === "CONNECTED" && (
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-pulse pointer-events-none" />
          )}
        </div>

        <div>
          <h4 className="text-base font-bold text-white truncate">
            {participant?.name || "Speaking Partner"}
          </h4>
          <p className="text-xs text-slate-400">
            {participant?.trade ||
              (participant?.role === "WORKER"
                ? "Verified Technician"
                : "Resident")}
          </p>
        </div>

        {/* Dynamic status feedback & live audio indicator */}
        {callState === "CALLING" && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            <span>Calling... waiting for response</span>
          </div>
        )}

        {callState === "RINGING" && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse">
            <Radio className="h-3.5 w-3.5 text-amber-400" />
            <span>Ringing... bell active on partner&apos;s device</span>
          </div>
        )}

        {callState === "CONNECTING" && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
            <span>Connecting live audio stream...</span>
          </div>
        )}

        {callState === "CONNECTED" && (
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <div className="flex items-center gap-1 h-5">
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms] h-3" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms] h-5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms] h-4" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:450ms] h-2" />
              <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:200ms] h-4" />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">Live Voice Connected ({durationText})</span>
          </div>
        )}

        {/* Privacy Note */}
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <Shield className="h-3 w-3 text-emerald-400" />
          <span>In-PWA Encrypted Audio • Zero Recording</span>
        </p>

        {/* Structured Negotiation Advisory (Strict Phase 7 Requirement) */}
        {activeCall?.orderId && (
          <div className="p-3 rounded-2xl bg-[#800020]/20 border border-[#800020]/40 text-left space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-rose-200">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-rose-400" />
                <span>Job & Price Negotiation</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-tight">
              Verbal agreements during this call do not change the order price.
              Submit proposals formally via the structured UI.
            </p>
            <button
              type="button"
              onClick={() => onOpenNegotiation(activeCall.orderId)}
              className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#800020] font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <TrendingUp className="h-3 w-3" />
              <span>Open Price Proposal / Counteroffer</span>
            </button>
          </div>
        )}

        {/* Call Controls: Mute, Speaker, End Call */}
        <div className="pt-2 flex items-center justify-center gap-4">
          {/* Mute Button */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-3.5 rounded-full transition-all flex items-center justify-center ${
              isMuted
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Speaker Button */}
          <button
            type="button"
            onClick={onToggleSpeaker}
            className={`p-3.5 rounded-full transition-all flex items-center justify-center ${
              isSpeaker
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
            title={isSpeaker ? "Speaker On" : "Speaker Off"}
          >
            {isSpeaker ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={onEndCall}
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center"
            title="End Voice Call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
