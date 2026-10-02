"use client";

import React, { createContext, useContext } from "react";

export type CallState =
  | "IDLE"
  | "INITIATING"
  | "RINGING"
  | "INCOMING"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "ENDED"
  | "FAILED";

export interface CallParticipant {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  role: "CONSUMER" | "WORKER";
  trade?: string;
}

export interface ActiveCallData {
  callId: string;
  orderId: string;
  isCaller: boolean;
  participant: CallParticipant;
  durationSec: number;
}

export interface IncomingCallData {
  callId: string;
  orderId: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string | null;
  callerRole: "CONSUMER" | "WORKER";
  sdp: RTCSessionDescriptionInit;
}

export interface VoiceCallContextType {
  callState: CallState;
  activeCall: ActiveCallData | null;
  incomingCall: IncomingCallData | null;
  isMuted: boolean;
  isSpeaker: boolean;
  micPermissionError: string | null;
  startCall: (params: {
    orderId: string;
    targetUserId: string;
    counterpartName: string;
    counterpartAvatar?: string | null;
    counterpartRole: "CONSUMER" | "WORKER";
    counterpartTrade?: string;
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  activeNegotiationOrderId: string | null;
  openNegotiationModal: (orderId: string) => void;
  closeNegotiationModal: () => void;
}

export const VoiceCallContext = createContext<VoiceCallContextType | null>(null);

export function useVoiceCall(): VoiceCallContextType {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error("useVoiceCall must be used within a VoiceCallProvider");
  }
  return context;
}
