"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { io, Socket } from "socket.io-client";
import { getStoredToken } from "@/lib/storage";
import { getWebSocketUrl } from "@/lib/websocket";
import { useToast } from "@/components/providers/ToastProvider";
import {
  VoiceCallContext,
  CallState,
  ActiveCallData,
  IncomingCallData,
} from "./VoiceCallContext";
import { IncomingCallModal } from "./IncomingCallModal";
import { ActiveCallOverlay } from "./ActiveCallOverlay";
import { PriceNegotiationModal } from "@/components/worker/PriceNegotiationModal";
import { useAuth } from "@/hooks/useAuth";
import {
  notifyIncomingCall,
  notifyBookingUpdate,
  notifyBookingRequest,
  notifyConsent,
  closeSystemNotification,
} from "@/lib/notifications";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

const CALL_RINGING_TIMEOUT_SEC = 30;

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private ringInterval: any = null;

  getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  playIncomingRing() {
    this.stopRing();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const playToneBurst = () => {
      if (!this.ctx || this.ctx.state === "closed") return;
      try {
        const now = this.ctx.currentTime;
        const playBeep = (startTime: number, dur: number) => {
          if (!this.ctx || this.ctx.state === "closed") return;
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(440, startTime); // Standard Telephone Dual-Frequency
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(480, startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(startTime + dur);
          osc2.stop(startTime + dur);
        };

        // Realistic double-ring bell cadence: burst 1 (0.5s) -> pause (0.2s) -> burst 2 (0.5s) -> quiet (2.2s)
        playBeep(now, 0.5);
        playBeep(now + 0.7, 0.5);
      } catch (e) {}
    };

    playToneBurst();
    this.ringInterval = setInterval(playToneBurst, 3400);
  }

  playRingback() {
    this.stopRing();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const playToneBurst = () => {
      if (!this.ctx || this.ctx.state === "closed") return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(425, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
      } catch (e) {}
    };

    playToneBurst();
    this.ringInterval = setInterval(playToneBurst, 3600);
  }

  playEndChime() {
    this.stopRing();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.35);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  stopRing() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

async function getAudioMediaStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Microphone capture is not supported in this browser.");
  }

  // 1. Try with high quality voice processing
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    return stream;
  } catch (err: any) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      throw err;
    }
    console.warn("Enhanced audio constraint failed, falling back to basic audio...", err.name, err.message);
  }

  // 2. Fallback to basic audio constraint (works universally on all mobile & desktop hardware)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    return stream;
  } catch (err: any) {
    console.error("Basic audio getUserMedia failed:", err);
    throw err;
  }
}

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [callState, setCallState] = useState<CallState>("IDLE");
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [activeNegotiationOrderId, setActiveNegotiationOrderId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<SoundSynthesizer | null>(null);
  const timeoutTimerRef = useRef<any>(null);
  const durationTimerRef = useRef<any>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteAudioCtxSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  // Initialize sound synthesizer & PWA Service Worker on mount
  useEffect(() => {
    soundRef.current = new SoundSynthesizer();

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handleUnlock = () => {
      soundRef.current?.unlock();
    };

    window.addEventListener("click", handleUnlock, { passive: true });
    window.addEventListener("touchstart", handleUnlock, { passive: true });
    window.addEventListener("pointerdown", handleUnlock, { passive: true });
    window.addEventListener("keydown", handleUnlock, { passive: true });

    return () => {
      soundRef.current?.stopRing();
      window.removeEventListener("click", handleUnlock);
      window.removeEventListener("touchstart", handleUnlock);
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
    };
  }, []);

  // Helper to start call duration timer
  const startDurationTimer = useCallback(() => {
    if (!durationTimerRef.current) {
      durationTimerRef.current = setInterval(() => {
        setActiveCall((prev) =>
          prev ? { ...prev, durationSec: prev.durationSec + 1 } : null
        );
      }, 1000);
    }
  }, []);

  // Helper to stop timers
  const clearTimers = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // Cleanup WebRTC connection & local tracks
  const cleanupMedia = useCallback(() => {
    clearTimers();
    soundRef.current?.stopRing();
    iceCandidateQueueRef.current = [];

    if (remoteAudioCtxSourceRef.current) {
      try {
        remoteAudioCtxSourceRef.current.disconnect();
      } catch (e) {}
      remoteAudioCtxSourceRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setIsMuted(false);
  }, [clearTimers]);

  // Connect Socket.IO for WebRTC signaling and real-time communication consent
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    const socketUrl = getWebSocketUrl();

    const socket = io(socketUrl, {
      path: "/ws",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebRTC signaling socket connected:", socket.id);
      if (user?.id) {
        socket.emit("join:user", user.id);
      }
    });

    // Realtime Consent Updates
    socket.on("order:communication_consent_updated", (data: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("order:consent_updated", { detail: data }));
      }
    });

    socket.on("order:consent_request_received", (data: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("order:consent_updated", { detail: data }));
      }
      notifyConsent(
        data.title || "📞 Call Consent Requested",
        data.message || "A party requested communication permission for this order.",
        data.orderId
      );
      toast({
        title: data.title || "Call Consent Requested",
        description: data.message || "A party requested communication permission for this order.",
        variant: "default",
      });
    });

    socket.on("order:consent_granted", (data: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("order:consent_updated", { detail: data }));
      }
      notifyConsent(
        data.title || "🟢 Call Permission Active",
        data.message || "Both parties have granted consent. You can now place in-app voice calls.",
        data.orderId
      );
      toast({
        title: data.title || "Call Permission Active",
        description: data.message || "Both parties have granted consent. You can now place in-app voice calls.",
        variant: "success",
      });
    });

    // Realtime Booking Status Updates on System Notification Bar
    socket.on("order:status_update", (data: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("order:status_updated", { detail: data }));
      }
      if (data?.status) {
        notifyBookingUpdate(
          data.orderRef || data.orderId?.slice(-6) || "Update",
          data.status,
          data.message,
          data.orderId
        );
      }
    });

    // Realtime Worker Incoming Job Requests on System Notification Bar
    socket.on("order:incoming", (data: any) => {
      notifyBookingRequest(
        data.problemTitle || data.category || "Service Job",
        data.consumer?.name || data.consumerName,
        data.id || data.orderId
      );
    });

    socket.on("worker_update", (data: any) => {
      if (data?.type === "NEW_REQUEST" || data?.problemTitle || data?.orderId) {
        notifyBookingRequest(
          data.problemTitle || data.category || "Service Job",
          data.consumer?.name || data.consumerName,
          data.id || data.orderId
        );
      }
    });

    // Incoming Call Event
    socket.on("call:incoming", (data: IncomingCallData) => {
      console.log("WebRTC received incoming call:", data.callId, "from", data.callerName);
      currentCallIdRef.current = data.callId;
      setIncomingCall(data);
      setCallState("INCOMING");
      soundRef.current?.playIncomingRing();

      // Show real OS / system notification bar alert
      notifyIncomingCall(data.callerName, data.callId, data.orderId);

      // Immediately acknowledge to server and caller that this recipient device is actively ringing!
      socket.emit("call:ringing", {
        callId: data.callId,
        callerId: data.callerId,
        orderId: data.orderId,
      });

      // Recipient 30s ringing timeout
      clearTimers();
      timeoutTimerRef.current = setTimeout(() => {
        soundRef.current?.stopRing();
        closeSystemNotification(`call-${data.callId}`);
        setIncomingCall(null);
        setCallState("IDLE");
        toast({
          title: "Missed Call",
          description: `Call from ${data.callerName || "Service Partner"} timed out.`,
          variant: "default",
        });
      }, CALL_RINGING_TIMEOUT_SEC * 1000);
    });

    // Caller: server acknowledged call initiation (state: CALLING, recipient device has not answered or rung yet)
    socket.on("call:initiated", (data: { callId: string; orderId: string }) => {
      console.log("WebRTC call initiated on server:", data.callId);
      currentCallIdRef.current = data.callId;
      setCallState("CALLING");
      setActiveCall((prev) => (prev ? { ...prev, callId: data.callId } : prev));
    });

    // Caller: recipient acknowledged receiving call and is ringing!
    socket.on("call:ringing", (data: { callId: string }) => {
      console.log("WebRTC recipient device is ringing! Playing ringback tone:", data.callId);
      if (data.callId) currentCallIdRef.current = data.callId;
      setCallState("RINGING");
      soundRef.current?.playRingback();
    });

    // Caller: callee answered
    socket.on(
      "call:answered",
      async (data: { callId: string; sdp: RTCSessionDescriptionInit; responderId: string }) => {
        try {
          if (data.callId) currentCallIdRef.current = data.callId;
          soundRef.current?.stopRing();
          if (timeoutTimerRef.current) {
            clearTimeout(timeoutTimerRef.current);
            timeoutTimerRef.current = null;
          }

          if (pcRef.current && data.sdp) {
            if (pcRef.current.signalingState === "have-local-offer") {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription(data.sdp)
              );
            }
          }

          // Flush any queued ICE candidates received before answer
          if (pcRef.current && iceCandidateQueueRef.current.length > 0) {
            for (const cand of iceCandidateQueueRef.current) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            iceCandidateQueueRef.current = [];
          }

          if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.play().catch(() => {});
          }

          setCallState("CONNECTED");
          startDurationTimer();

          toast({
            title: "Call Connected",
            description: "Voice communication is active. Audio is peer-to-peer and unrecorded.",
            variant: "success",
          });
        } catch (err: any) {
          console.error("Error setting remote description on answer:", err);
          setCallState("CONNECTED");
          startDurationTimer();
        }
      }
    );

    // ICE Candidate exchange with queueing support
    socket.on("call:ice_candidate", async (data: { callId: string; candidate: any }) => {
      try {
        if (!data.candidate) return;
        const pc = pcRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          // Queue candidate until remote description is applied
          iceCandidateQueueRef.current.push(data.candidate);
        }
      } catch (err: any) {
        console.warn("ICE candidate addition error:", err);
      }
    });

    // Caller/Callee: call rejected or cancelled by other party
    socket.on("call:rejected", (data: { callId: string; reason?: string }) => {
      console.log("WebRTC call rejected received:", data.callId);
      closeSystemNotification(`call-${data.callId}`);
      if (currentCallIdRef.current) {
        closeSystemNotification(`call-${currentCallIdRef.current}`);
      }
      soundRef.current?.stopRing();
      soundRef.current?.playEndChime();
      cleanupMedia();
      setIncomingCall(null);
      setCallState("ENDED");
      toast({
        title: "Call Declined",
        description: data.reason || "The other party declined the call.",
        variant: "default",
      });
      setTimeout(() => {
        setActiveCall(null);
        setCallState("IDLE");
      }, 1500);
    });

    // Call ended by either party mid-call or during ringing
    socket.on("call:ended", (data: { callId: string; reason?: string; durationSec?: number }) => {
      console.log("WebRTC call ended received:", data.callId);
      closeSystemNotification(`call-${data.callId}`);
      if (currentCallIdRef.current) {
        closeSystemNotification(`call-${currentCallIdRef.current}`);
      }
      soundRef.current?.stopRing();
      soundRef.current?.playEndChime();
      cleanupMedia();
      setIncomingCall(null);
      setCallState("ENDED");
      toast({
        title: "Call Ended",
        description: data.reason || "The voice call has finished.",
        variant: "default",
      });
      setTimeout(() => {
        setActiveCall(null);
        setCallState("IDLE");
      }, 1500);
    });

    // Call failed (e.g. not authorized, database error)
    socket.on("call:failed", (data: { message?: string }) => {
      soundRef.current?.stopRing();
      cleanupMedia();
      setCallState("FAILED");
      toast({
        title: "Call Failed",
        description: data.message || "Could not complete call.",
        variant: "danger",
      });
      setTimeout(() => {
        setActiveCall(null);
        setCallState("IDLE");
      }, 3000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [cleanupMedia, clearTimers, toast, user?.id]);

  // Window unload / refresh cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeCall && socketRef.current) {
        socketRef.current.emit("call:end", {
          callId: activeCall.callId,
          targetUserId: activeCall.participant.userId,
          orderId: activeCall.orderId,
          durationSec: activeCall.durationSec,
          reason: "tab_closed",
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeCall]);

  // Initiate call
  const startCall = useCallback(
    async (params: {
      orderId: string;
      targetUserId: string;
      counterpartName: string;
      counterpartAvatar?: string | null;
      counterpartRole: "CONSUMER" | "WORKER";
      counterpartTrade?: string;
    }) => {
      try {
        setMicPermissionError(null);
        setCallState("CALLING");

        // 1. Acquire microphone
        let stream: MediaStream;
        try {
          stream = await getAudioMediaStream();
        } catch (micErr: any) {
          if (
            micErr.name === "NotAllowedError" ||
            micErr.name === "PermissionDeniedError"
          ) {
            setMicPermissionError(
              "Microphone permission was denied. Please allow microphone access in your browser bar."
            );
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access in browser settings to make voice calls.",
              variant: "danger",
            });
            setCallState("IDLE");
            return;
          }
          throw micErr;
        }

        localStreamRef.current = stream;

        // 2. Setup RTCPeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Join order signaling room
        socketRef.current?.emit("join:order", params.orderId);

        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit("call:ice_candidate", {
              callId: "",
              orderId: params.orderId,
              targetUserId: params.targetUserId,
              candidate: event.candidate,
            });
          }
        };

        const setupRemoteAudio = (remoteStream: MediaStream) => {
          console.log("Caller remote audio stream tracks:", remoteStream.getAudioTracks());
          remoteStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });

          // 1. Play via HTML5 <audio>
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.play().catch((err) => {
              console.warn("HTML5 audio play catch:", err);
            });
          }

          // 2. Play via Web Audio API AudioContext for guaranteed unmuted mobile PWA voice
          try {
            const ctx = soundRef.current?.getAudioContext();
            if (ctx) {
              if (ctx.state === "suspended") {
                ctx.resume().catch(() => {});
              }
              if (remoteAudioCtxSourceRef.current) {
                try {
                  remoteAudioCtxSourceRef.current.disconnect();
                } catch (e) {}
              }
              const source = ctx.createMediaStreamSource(remoteStream);
              remoteAudioCtxSourceRef.current = source;
              const gainNode = ctx.createGain();
              gainNode.gain.value = 1.0;
              source.connect(gainNode);
              gainNode.connect(ctx.destination);
              console.log("Caller remote voice routed to AudioContext destination successfully!");
            }
          } catch (ctxErr) {
            console.warn("Web Audio media stream routing note:", ctxErr);
          }
        };

        pc.ontrack = (event) => {
          console.log("Caller received remote track:", event.streams[0]);
          if (event.streams[0]) {
            setupRemoteAudio(event.streams[0]);
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log("Caller ICE connection state:", pc.iceConnectionState);
          if (pc.iceConnectionState === "disconnected") {
            setCallState("RECONNECTING");
          } else if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            setCallState("CONNECTED");
            startDurationTimer();
          } else if (pc.iceConnectionState === "failed") {
            try {
              pc.restartIce();
            } catch (e) {}
          }
        };

        // 3. Create Offer SDP
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);

        // 4. Emit call initiation via Socket.IO
        socketRef.current?.emit("call:initiate", {
          orderId: params.orderId,
          targetUserId: params.targetUserId,
          sdp: offer,
          callerName: user?.name || "Customer",
          callerPhoto: user?.avatarUrl || null,
          callerRole: user?.role === "WORKER" ? "WORKER" : "CONSUMER",
        });

        setActiveCall({
          callId: `call_${Date.now()}`,
          orderId: params.orderId,
          isCaller: true,
          participant: {
            userId: params.targetUserId,
            name: params.counterpartName,
            avatarUrl: params.counterpartAvatar,
            role: params.counterpartRole,
            trade: params.counterpartTrade,
          },
          durationSec: 0,
        });

        // 5. 30s Outgoing Timeout
        clearTimers();
        timeoutTimerRef.current = setTimeout(() => {
          soundRef.current?.stopRing();
          cleanupMedia();
          setCallState("ENDED");
          toast({
            title: "No Answer",
            description: `${params.counterpartName} is not answering. Please try again later.`,
            variant: "default",
          });
          setTimeout(() => {
            setActiveCall(null);
            setCallState("IDLE");
          }, 2500);
        }, CALL_RINGING_TIMEOUT_SEC * 1000);
      } catch (err: any) {
        console.error("startCall error:", err);
        cleanupMedia();
        setCallState("IDLE");
        toast({
          title: "Calling Error",
          description: err.message || "Failed to start call.",
          variant: "danger",
        });
      }
    },
    [cleanupMedia, clearTimers, toast, user]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      soundRef.current?.stopRing();
      clearTimers();
      setCallState("CONNECTING");

      // 1. Acquire microphone
      let stream: MediaStream;
      try {
        stream = await getAudioMediaStream();
      } catch (micErr: any) {
        if (
          micErr.name === "NotAllowedError" ||
          micErr.name === "PermissionDeniedError"
        ) {
          setMicPermissionError("Microphone permission denied.");
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to talk on call.",
            variant: "danger",
          });
        }
        throw micErr;
      }

      localStreamRef.current = stream;

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Join order signaling room
      socketRef.current?.emit("join:order", incomingCall.orderId);

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("call:ice_candidate", {
            callId: incomingCall.callId,
            orderId: incomingCall.orderId,
            targetUserId: incomingCall.callerId,
            candidate: event.candidate,
          });
        }
      };

      const setupRemoteAudio = (remoteStream: MediaStream) => {
        console.log("Recipient remote audio stream tracks:", remoteStream.getAudioTracks());
        remoteStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        // 1. Play via HTML5 <audio>
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          remoteAudioRef.current.play().catch((err) => {
            console.warn("HTML5 audio play catch:", err);
          });
        }

        // 2. Play via Web Audio API AudioContext for guaranteed unmuted mobile PWA voice
        try {
          const ctx = soundRef.current?.getAudioContext();
          if (ctx) {
            if (ctx.state === "suspended") {
              ctx.resume().catch(() => {});
            }
            if (remoteAudioCtxSourceRef.current) {
              try {
                remoteAudioCtxSourceRef.current.disconnect();
              } catch (e) {}
            }
            const source = ctx.createMediaStreamSource(remoteStream);
            remoteAudioCtxSourceRef.current = source;
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            console.log("Recipient remote voice routed to AudioContext destination successfully!");
          }
        } catch (ctxErr) {
          console.warn("Web Audio media stream routing note:", ctxErr);
        }
      };

      pc.ontrack = (event) => {
        console.log("Recipient received remote track:", event.streams[0]);
        if (event.streams[0]) {
          setupRemoteAudio(event.streams[0]);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("Recipient ICE connection state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected") {
          setCallState("RECONNECTING");
        } else if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          setCallState("CONNECTED");
          startDurationTimer();
        } else if (pc.iceConnectionState === "failed") {
          try {
            pc.restartIce();
          } catch (e) {}
        }
      };

      // 3. Set Remote Offer & Create Answer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));

      // Flush any queued ICE candidates received before acceptCall
      if (iceCandidateQueueRef.current.length > 0) {
        for (const cand of iceCandidateQueueRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        iceCandidateQueueRef.current = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 4. Emit call:answer
      socketRef.current?.emit("call:answer", {
        callId: incomingCall.callId,
        orderId: incomingCall.orderId,
        targetUserId: incomingCall.callerId,
        sdp: answer,
      });

      setActiveCall({
        callId: incomingCall.callId,
        orderId: incomingCall.orderId,
        isCaller: false,
        participant: {
          userId: incomingCall.callerId,
          name: incomingCall.callerName,
          avatarUrl: incomingCall.callerPhoto,
          role: incomingCall.callerRole,
        },
        durationSec: 0,
      });

      closeSystemNotification(`call-${incomingCall.callId}`);
      currentCallIdRef.current = incomingCall.callId;
      setIncomingCall(null);
      setCallState("CONNECTED");
      startDurationTimer();
    } catch (err: any) {
      console.error("acceptCall error:", err);
      cleanupMedia();
      setIncomingCall(null);
      setCallState("IDLE");
      toast({
        title: "Could Not Connect Call",
        description: err.message || "Failed to establish audio connection.",
        variant: "danger",
      });
    }
  }, [cleanupMedia, clearTimers, incomingCall, toast]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    const callId = incomingCall.callId;
    closeSystemNotification(`call-${callId}`);
    if (currentCallIdRef.current) {
      closeSystemNotification(`call-${currentCallIdRef.current}`);
    }

    soundRef.current?.stopRing();
    clearTimers();

    socketRef.current?.emit("call:reject", {
      callId,
      targetUserId: incomingCall.callerId,
      orderId: incomingCall.orderId,
      reason: "Call declined by user.",
    });

    cleanupMedia();
    setIncomingCall(null);
    setCallState("IDLE");
  }, [clearTimers, cleanupMedia, incomingCall]);

  // End active call or cancel outgoing call
  const endCall = useCallback(() => {
    soundRef.current?.stopRing();
    soundRef.current?.playEndChime();

    const callIdToUse = activeCall?.callId || incomingCall?.callId || currentCallIdRef.current;
    const targetUserId = activeCall?.participant?.userId || incomingCall?.callerId;
    const orderId = activeCall?.orderId || incomingCall?.orderId;
    const duration = activeCall?.durationSec || 0;

    if (callIdToUse) {
      closeSystemNotification(`call-${callIdToUse}`);
      socketRef.current?.emit("call:end", {
        callId: callIdToUse,
        targetUserId,
        orderId,
        durationSec: duration,
        reason: "user_ended",
      });
    }

    cleanupMedia();
    setIncomingCall(null);
    setCallState("ENDED");

    setTimeout(() => {
      setActiveCall(null);
      setCallState("IDLE");
    }, 1500);
  }, [activeCall, cleanupMedia, incomingCall]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        toast({
          title: !audioTrack.enabled ? "Microphone Muted" : "Microphone Active",
          description: !audioTrack.enabled
            ? "Other party cannot hear you."
            : "Other party can hear you.",
          variant: "default",
        });
      }
    }
  }, [toast]);

  // Toggle Speaker / Output
  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      const nextSpeakerState = !isSpeaker;
      setIsSpeaker(nextSpeakerState);
      remoteAudioRef.current.muted = !nextSpeakerState;
      toast({
        title: nextSpeakerState ? "Audio Output Enabled" : "Audio Output Muted",
        description: nextSpeakerState
          ? "Playing incoming audio."
          : "Incoming audio muted.",
        variant: "default",
      });
    }
  }, [isSpeaker, toast]);

  // Structured negotiation popup trigger
  const openNegotiationModal = useCallback((orderId: string) => {
    setActiveNegotiationOrderId(orderId);
  }, []);

  const closeNegotiationModal = useCallback(() => {
    setActiveNegotiationOrderId(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      callState,
      activeCall,
      incomingCall,
      isMuted,
      isSpeaker,
      micPermissionError,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleSpeaker,
      activeNegotiationOrderId,
      openNegotiationModal,
      closeNegotiationModal,
    }),
    [
      callState,
      activeCall,
      incomingCall,
      isMuted,
      isSpeaker,
      micPermissionError,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleSpeaker,
      activeNegotiationOrderId,
      openNegotiationModal,
      closeNegotiationModal,
    ]
  );

  return (
    <VoiceCallContext.Provider value={contextValue}>
      {children}

      {/* Remote audio stream playback element with active DOM presence */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: "none",
        }}
      />

      {/* Incoming Call Modal */}
      {incomingCall && callState === "INCOMING" && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Active Call Floating Overlay */}
      {activeCall && (
        <ActiveCallOverlay
          callState={callState}
          activeCall={activeCall}
          isMuted={isMuted}
          isSpeaker={isSpeaker}
          micPermissionError={micPermissionError}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onEndCall={endCall}
          onOpenNegotiation={openNegotiationModal}
        />
      )}

      {/* Structured Price Negotiation Modal when triggered during or after call */}
      {activeNegotiationOrderId && (
        <PriceNegotiationModal
          orderId={activeNegotiationOrderId}
          isOpen={Boolean(activeNegotiationOrderId)}
          onClose={closeNegotiationModal}
          userRole={user?.role === "WORKER" ? "WORKER" : "CONSUMER"}
        />
      )}
    </VoiceCallContext.Provider>
  );
}
