"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSarvksham, type SarvkshamPose } from "./SarvkshamContext";
import { Volume2, VolumeX, Sparkles, ShieldCheck, HelpCircle, Info, HeartHandshake } from "lucide-react";

interface SarvkshamAvatarProps {
  variant?: "desktop" | "compact" | "badge";
  className?: string;
}

const poseFileMap: Record<SarvkshamPose, string> = {
  hero_clean: "/sarvksham/hero_clean.png",
  hero_greeting: "/sarvksham/hero_greeting.png",
  pose_idle: "/sarvksham/pose_idle.png",
  pose_pointing: "/sarvksham/pose_pointing.png",
  pose_celebrating: "/sarvksham/pose_celebrating.png",
  pose_guiding: "/sarvksham/pose_guiding.png",
  pose_floating: "/sarvksham/pose_floating.png",
  pose_typing: "/sarvksham/pose_typing.png",
  exp_thinking: "/sarvksham/exp_thinking.png",
  exp_confused: "/sarvksham/exp_confused.png",
  exp_excited: "/sarvksham/exp_excited.png",
  exp_happy: "/sarvksham/exp_happy.png",
};

export function SarvkshamAvatar({ variant = "desktop", className = "" }: SarvkshamAvatarProps) {
  const {
    pose,
    message,
    subtext,
    userName,
    isSpeaking,
    speakCurrentMessage,
    setMessage,
    setPose,
  } = useSarvksham();

  const [activeTip, setActiveTip] = useState<string | null>(null);

  const spriteSrc = poseFileMap[pose] || "/sarvksham/hero_greeting.png";

  const handleQuickChip = (chip: "aadhaar" | "coop" | "help") => {
    if (chip === "aadhaar") {
      setPose("pose_guiding");
      setMessage(
        "Aadhaar verification safeguards our community against fraud. In this demo sandbox, UIDAI verification is simulated and zero raw Aadhaar numbers are ever stored.",
        "Privacy First: UIDAI Synthetic Sandbox"
      );
      setActiveTip("aadhaar");
    } else if (chip === "coop") {
      setPose("exp_happy");
      setMessage(
        "Sarvakarmakshamah is worker-owned. Platform fees are strictly capped at ≤5% and 80% of platform dividends flow back to verified gig partners!",
        "Economic Justice: 1 Worker = 1 Vote"
      );
      setActiveTip("coop");
    } else {
      setPose("pose_pointing");
      setMessage(
        "Need help? For demo accounts, click any pre-filled button or check the realistic push notification banner at the top of the screen!",
        "24/7 Sovereign Support Engine"
      );
      setActiveTip("help");
    }
  };

  // Compact Mobile Mode: A non-intrusive floating/docked card
  if (variant === "compact") {
    return (
      <div
        className={`w-full rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-lg backdrop-blur-md text-white transition-all duration-300 ${className}`}
      >
        <div className="flex items-start gap-3">
          {/* Avatar Sprite Circle */}
          <div className="relative flex-shrink-0">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-b from-[#800020]/40 to-slate-950 p-1 shadow-inner">
              <Image
                src={spriteSrc}
                alt="Sarvksham AI"
                fill
                sizes="56px"
                className="object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
                priority
              />
            </div>
            {/* Live Indicator Dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-500"></span>
            </span>
          </div>

          {/* Speech Text & Actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-rose-300 tracking-wide flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Sarvksham AI
                </span>
                {userName && (
                  <span className="rounded-full bg-rose-950/80 px-1.5 py-0.2 text-[10px] font-medium text-rose-200 border border-rose-800/40 truncate max-w-[100px]">
                    Hi, {userName}!
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={speakCurrentMessage}
                title="Read out loud"
                aria-label="Read guidance out loud"
                className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                {isSpeaking ? (
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-snug font-normal line-clamp-2">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Showcase Mode: Full companion studio
  return (
    <div className={`relative flex flex-col items-center text-center ${className}`}>
      {/* Background ambient maroon glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#800020]/25 blur-3xl pointer-events-none -z-10" />

      {/* Speech Bubble with Pointer */}
      <div className="relative mb-6 w-full max-w-md animate-in fade-in duration-300">
        <div className="relative rounded-3xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md text-white text-left">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#800020] text-white">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                  Sarvksham AI Companion
                  <span className="rounded-full bg-emerald-950 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-800/60">
                    Live Assistant
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={speakCurrentMessage}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-600 transition"
              title="Voice Guidance"
            >
              {isSpeaking ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-300">Speaking</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Listen</span>
                </>
              )}
            </button>
          </div>

          {/* Speech Message */}
          <p className="text-sm font-medium text-slate-100 leading-relaxed min-h-[44px]">
            {message}
          </p>

          {subtext && (
            <p className="mt-2 text-[11px] text-rose-300/90 font-medium flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-rose-400 flex-shrink-0" />
              {subtext}
            </p>
          )}

          {/* Speech bubble tail pointing down */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-slate-900 border-r border-b border-slate-700/80 transform rotate-45" />
        </div>
      </div>

      {/* Main Avatar Character Sprite */}
      <div className="relative group cursor-pointer" onClick={() => setPose("pose_celebrating")}>
        <div className="relative h-64 w-64 transition-transform duration-500 hover:scale-105">
          <Image
            src={spriteSrc}
            alt="Sarvksham Avatar"
            fill
            sizes="256px"
            className="object-contain drop-shadow-[0_15px_25px_rgba(128,0,32,0.35)] transition-all duration-300"
            priority
          />
        </div>

        {/* Dynamic Pose Pill */}
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-xs text-slate-300 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200 capitalize">
            {userName ? `Assisting ${userName}` : "Sarvksham Bot Active"}
          </span>
        </div>
      </div>

      {/* Interactive Quick Help Chips */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-sm">
        <button
          type="button"
          onClick={() => handleQuickChip("aadhaar")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition border ${
            activeTip === "aadhaar"
              ? "bg-[#800020] text-white border-rose-400 shadow-sm"
              : "bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
          }`}
        >
          🔒 Why Aadhaar?
        </button>
        <button
          type="button"
          onClick={() => handleQuickChip("coop")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition border ${
            activeTip === "coop"
              ? "bg-[#800020] text-white border-rose-400 shadow-sm"
              : "bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
          }`}
        >
          🤝 0-5% Commission
        </button>
        <button
          type="button"
          onClick={() => handleQuickChip("help")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition border ${
            activeTip === "help"
              ? "bg-[#800020] text-white border-rose-400 shadow-sm"
              : "bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
          }`}
        >
          💡 Need Demo Help?
        </button>
      </div>

      {/* Trust Guarantee Footnote */}
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 font-medium border-t border-slate-800/80 pt-4 w-full max-w-xs justify-center">
        <HeartHandshake className="h-4 w-4 text-emerald-400" />
        <span>India&apos;s 1st Co-operative Gig Platform</span>
      </div>
    </div>
  );
}
