"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Phone,
  PhoneCall,
  Shield,
  ShieldCheck,
  Lock,
  Loader2,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import { useVoiceCall } from "./VoiceCallContext";
import { io, Socket } from "socket.io-client";
import { getStoredToken } from "@/lib/storage";

interface CommunicationConsentCardProps {
  orderId: string;
  userRole: "CONSUMER" | "WORKER";
  counterpartName?: string;
  counterpartAvatar?: string | null;
  counterpartTrade?: string;
  counterpartUserId?: string;
  onOpenNegotiation?: () => void;
}

interface ConsentStatusResponse {
  orderId: string;
  orderRef: string;
  orderStatus: string;
  callerRole: "CONSUMER" | "WORKER";
  communicationConsent: boolean;
  consumerConsentGranted: boolean;
  workerConsentGranted: boolean;
  isAuthorizedStatus: boolean;
  canCall: boolean;
  counterpart: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: "CONSUMER" | "WORKER";
    trade: string;
  };
}

export function CommunicationConsentCard({
  orderId,
  userRole,
  counterpartName: fallbackName,
  counterpartAvatar: fallbackAvatar,
  counterpartTrade: fallbackTrade,
  counterpartUserId: fallbackUserId,
  onOpenNegotiation,
}: CommunicationConsentCardProps) {
  const { toast } = useToast();
  const { startCall, callState } = useVoiceCall();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consentData, setConsentData] = useState<ConsentStatusResponse | null>(null);

  // Fetch consent details
  const fetchConsent = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: ConsentStatusResponse }>(
        `/calls/orders/${orderId}/consent`
      );
      if (res.success && res.data) {
        setConsentData(res.data);
      }
    } catch (err: any) {
      console.warn("Could not fetch communication consent status:", err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchConsent();

    // Listen to window-level consent events dispatched by global VoiceCallProvider
    const handleConsentEvent = (e: any) => {
      if (!e.detail?.orderId || e.detail.orderId === orderId) {
        fetchConsent();
      }
    };
    window.addEventListener("order:consent_updated", handleConsentEvent);

    // Setup Socket listener for real-time consent updates
    const token = getStoredToken();
    let socket: Socket | null = null;

    if (token) {
      const socketUrl =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1")
          ? "http://localhost:4000"
          : "";

      socket = io(socketUrl, {
        path: "/ws",
        auth: { token },
        transports: ["websocket", "polling"],
      });

      socket.emit("join:order", orderId);

      socket.on("order:communication_consent_updated", (payload: any) => {
        if (!payload || payload.orderId === orderId) {
          fetchConsent();
        }
      });

      socket.on("order:consent_request_received", (payload: any) => {
        if (!payload || payload.orderId === orderId) {
          fetchConsent();
        }
      });

      socket.on("order:consent_granted", (payload: any) => {
        if (!payload || payload.orderId === orderId) {
          fetchConsent();
        }
      });
    }

    return () => {
      window.removeEventListener("order:consent_updated", handleConsentEvent);
      if (socket) {
        socket.emit("leave:order", orderId);
        socket.disconnect();
      }
    };
  }, [fetchConsent, orderId]);

  // Request or Accept Consent
  const handleRequestConsent = async () => {
    try {
      setSubmitting(true);
      const res = await apiPost<{ success: boolean; data: any }>(
        `/calls/orders/${orderId}/consent/request`,
        {}
      );
      if (res.success) {
        toast({
          title: "Communication Consent Updated",
          description: res.data?.message || "Communication preference saved.",
          variant: "success",
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("order:consent_updated", { detail: { orderId } })
          );
        }
        await fetchConsent();
      }
    } catch (err: any) {
      toast({
        title: "Consent Request Failed",
        description: err.message || "Could not grant communication consent.",
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke Consent
  const handleRevokeConsent = async () => {
    try {
      setSubmitting(true);
      const res = await apiPost<{ success: boolean; data: any }>(
        `/calls/orders/${orderId}/consent/revoke`,
        {}
      );
      if (res.success) {
        toast({
          title: "Consent Revoked",
          description: "Voice calling has been disabled for this order.",
          variant: "default",
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("order:consent_updated", { detail: { orderId } })
          );
        }
        await fetchConsent();
      }
    } catch (err: any) {
      toast({
        title: "Failed to revoke",
        description: err.message || "Could not revoke consent.",
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Counterpart metadata
  const counterpartName =
    consentData?.counterpart?.name || fallbackName || (userRole === "CONSUMER" ? "Technician" : "Consumer");
  const counterpartAvatar =
    consentData?.counterpart?.avatarUrl || fallbackAvatar;
  const counterpartTrade =
    consentData?.counterpart?.trade || fallbackTrade || (userRole === "CONSUMER" ? "Artisan" : "Resident");
  const counterpartUserId =
    consentData?.counterpart?.id || fallbackUserId || "";

  const isCurrentUserGranted =
    userRole === "CONSUMER"
      ? Boolean(consentData?.consumerConsentGranted)
      : Boolean(consentData?.workerConsentGranted);

  const isCounterpartGranted =
    userRole === "CONSUMER"
      ? Boolean(consentData?.workerConsentGranted)
      : Boolean(consentData?.consumerConsentGranted);

  const isFullyConsented = Boolean(consentData?.communicationConsent);
  const canMakeCall = Boolean(consentData?.canCall && counterpartUserId);

  // Call counterpart handler
  const handleTriggerCall = async () => {
    if (!counterpartUserId) {
      toast({
        title: "Calling Unavailable",
        description: "Counterpart user identifier not found.",
        variant: "danger",
      });
      return;
    }

    await startCall({
      orderId,
      targetUserId: counterpartUserId,
      counterpartName,
      counterpartAvatar,
      counterpartRole: userRole === "CONSUMER" ? "WORKER" : "CONSUMER",
      counterpartTrade,
    });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#800020]" />
        <span>Loading communication permissions...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30 p-4 sm:p-5 shadow-2xs space-y-3.5">
      {/* Header with Privacy Guarantee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-rose-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#800020]/10 text-[#800020] flex items-center justify-center">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-heading">
              In-PWA Real-Time Voice Communication
            </h4>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-600" />
              <span>100% Private • No phone numbers • Zero external dialers</span>
            </p>
          </div>
        </div>

        {/* Mutual consent badge */}
        <div>
          {isFullyConsented ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Consent Verified</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
              <Lock className="h-3 w-3 text-amber-700" />
              <span>Consent Required</span>
            </span>
          )}
        </div>
      </div>

      {/* State-specific explanatory body */}
      {!isFullyConsented ? (
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center justify-between">
              <span>Calling Permission Status:</span>
              <span className="text-[11px] font-mono text-slate-500">
                {isCurrentUserGranted ? "Your Consent: Granted" : "Your Consent: Pending"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isCounterpartGranted && !isCurrentUserGranted
                ? `${counterpartName} has requested communication permission. Accept below to enable instant browser-to-browser voice calling.`
                : isCurrentUserGranted && !isCounterpartGranted
                ? `You have granted consent. Waiting for ${counterpartName} to accept communication permission.`
                : "Both parties must authorize communication before browser audio calls become active. Neither party's phone number will ever be revealed."}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            {!isCurrentUserGranted ? (
              <button
                type="button"
                onClick={handleRequestConsent}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#800020] hover:bg-[#68001a] active:bg-[#500014] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                <span>
                  {isCounterpartGranted
                    ? "Accept Communication"
                    : "Request/Accept communication"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRevokeConsent}
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5 text-slate-400" />
                <span>Revoke Consent</span>
              </button>
            )}

            {/* Inactive Call Button showing locked requirement */}
            <button
              type="button"
              disabled
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
              title="Calling unlocks when both parties consent"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{userRole === "CONSUMER" ? "Call Worker" : "Call Consumer"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Fully Consented State: In-PWA Voice Calling is ACTIVE! */
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">
                Direct Application-to-Application Calling Active
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Connected securely via WebRTC peer audio. Speak with {counterpartName} directly in this window.
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleTriggerCall}
              disabled={callState !== "IDLE" || !canMakeCall}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              <span>
                {userRole === "CONSUMER"
                  ? `Call Worker (${counterpartName})`
                  : `Call Consumer (${counterpartName})`}
              </span>
            </button>

            {onOpenNegotiation && (
              <button
                type="button"
                onClick={onOpenNegotiation}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-[#800020]/40 hover:bg-rose-50 text-[#800020] text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Discuss & Propose Price</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRevokeConsent}
              className="text-xs text-slate-400 hover:text-slate-600 underline py-1 px-2 self-center sm:self-auto sm:ml-auto"
            >
              Revoke Consent
            </button>
          </div>

          {/* Mandatory Negotiation Rule Notification */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Important:</strong> Verbal agreements on call do not change the order price.
              Any agreed modification must be formally submitted and confirmed through the
              structured price proposal UI.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
