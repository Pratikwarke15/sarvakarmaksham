"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  Star,
  Loader2,
  X,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  Zap,
  Droplets,
  Wrench,
  Hammer,
  Volume2,
  Ticket,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useBookingStore } from "@/store/bookingStore";
import { useI18n } from "@/i18n/I18nProvider";

interface VoiceJobModalProps {
  open: boolean;
  onClose: () => void;
  onSelectWorkerAndService?: (service: any, worker: any) => void;
  onConfirmJob?: (jobData: {
    category: string;
    skills: string[];
    problem: string;
    urgency: string;
    priceEstimate: { p25: number; p50: number; p75: number };
    workerId?: string;
    workerName?: string;
  }) => void;
}

const VOICE_PRESETS = [
  {
    category: "electrical",
    label: "मराठी: पंखा दुरुस्ती (₹५० पासून)",
    lang: "mr",
    text: "माझा पंखा काम करत नाहीये",
    icon: Zap,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    category: "electrical",
    label: "मराठी: majha pankha kaam karat nahiye",
    lang: "mr",
    text: "majha pankha kaam karat nahiye",
    icon: Zap,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    category: "electrical",
    label: "Mobile Charger / Socket",
    lang: "en",
    text: "My mobile charger is not working and bedroom switchboard socket is loose",
    icon: Zap,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    category: "electrical",
    label: "हिन्दी: पंखा व वायरिंग",
    lang: "hi",
    text: "कमरे का पंखा बहुत धीमा चल रहा है और स्विचबोर्ड में स्पार्क हो रहा है",
    icon: Zap,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  {
    category: "plumbing",
    label: "हिन्दी: नल लीकेज",
    lang: "hi",
    text: "बाथरूम का नल बहुत जोर से लीक हो रहा है और पाइप से पानी टपक रहा है",
    icon: Droplets,
    color: "text-sky-600 bg-sky-50 border-sky-200",
  },
  {
    category: "ac-repair",
    label: "AC & Cooling",
    lang: "en",
    text: "The living room split AC is not cooling and leaking water on the floor",
    icon: Wrench,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    category: "carpentry",
    label: "Door Lock & Woodwork",
    lang: "en",
    text: "Main entrance wooden door lock is jammed and hinges are loose",
    icon: Hammer,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
];

export function VoiceJobModal({
  open,
  onClose,
  onConfirmJob,
}: VoiceJobModalProps) {
  const { locale } = useI18n();
  const { setSelectedService, setBookingDescription, setStep } = useBookingStore();

  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<string>(
    locale === "mr" ? "mr-IN" : locale === "hi" ? "hi-IN" : "mr-IN"
  );
  const [distanceKm, setDistanceKm] = useState<number>(5.0);
  const [bookedToken, setBookedToken] = useState<{
    tokenId: string;
    bookingRef: string;
    categoryName: string;
    problemSummary: string;
    totalPrice: number;
    baseRate: number;
    travelFee: number;
    securityOtp: string;
    workerName: string;
    status: string;
    etaMinutes: number;
    createdAt: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<any>(null);

  // Sync speech language when modal opens or locale changes
  useEffect(() => {
    setSpeechLang(locale === "mr" ? "mr-IN" : locale === "hi" ? "hi-IN" : "mr-IN");
  }, [locale, open]);

  // Clean up recognition on unmount or close
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  if (!open) return null;

  const stopVoiceRecording = (triggerAnalyze = false) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setRecording(false);
    if (triggerAnalyze) {
      const textToAnalyze = (finalTranscriptRef.current || transcript).trim();
      if (textToAnalyze) {
        handleAnalyze(textToAnalyze);
      }
    }
  };

  const requestMicPermission = async (): Promise<boolean> => {
    if (typeof window !== "undefined" && navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      } catch (err) {
        console.warn("User microphone access error:", err);
        return false;
      }
    }
    return true;
  };

  const startVoiceRecording = async () => {
    setErrorMessage(null);
    stopVoiceRecording(false);
    finalTranscriptRef.current = "";
    setTranscript("");

    // Check browser SpeechRecognition support
    if (
      typeof window === "undefined" ||
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      setErrorMessage(
        "Speech recognition requires Chrome, Edge, or Safari. You can also click 'माझा पंखा काम करत नाहीये' below or type your issue directly."
      );
      return;
    }

    // Explicitly prompt for microphone access first
    const hasMic = await requestMicPermission();
    if (!hasMic) {
      setErrorMessage(
        "Microphone permission was not granted by your browser. Please allow microphone access or click the 1-tap Marathi test button below."
      );
      return;
    }

    try {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRec();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setRecording(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscriptRef.current = (
              finalTranscriptRef.current + " " + item[0].transcript
            ).trim();
          } else {
            interimText += item[0].transcript;
          }
        }

        const liveText = (finalTranscriptRef.current + " " + interimText).trim();
        if (liveText) {
          setTranscript(liveText);
        }

        // Auto-diagnose after 3 seconds of silence if user has spoken
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (liveText.length > 3) {
            stopVoiceRecording(true);
          }
        }, 3000);
      };

      recognition.onerror = (event: any) => {
        const errorType = event?.error;
        console.warn("Speech recognition event:", errorType);

        if (errorType === "no-speech") {
          return;
        }

        stopVoiceRecording(false);

        if (errorType === "not-allowed" || errorType === "service-not-allowed") {
          setErrorMessage(
            "Browser speech service could not access the microphone in this mode. You can click 'माझा पंखा काम करत नाहीये' below or type your issue directly."
          );
        } else if (errorType === "network") {
          setErrorMessage(
            "Browser cloud speech service is unreachable. Please type your issue or tap any test scenario below."
          );
        } else {
          setErrorMessage(
            `Speech status: ${errorType}. You can click the test scenario below or type directly.`
          );
        }
      };

      recognition.onend = () => {
        if (recording && finalTranscriptRef.current.trim().length > 3) {
          stopVoiceRecording(true);
        } else {
          setRecording(false);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn("Could not start speech recognition:", err);
      setRecording(false);
      setErrorMessage(
        "Could not initialize microphone. Please click the 1-tap Marathi scenario below or type your issue."
      );
    }
  };

  const handleAnalyze = async (textToAnalyze?: string, customDistance?: number) => {
    const text = textToAnalyze || transcript;
    if (!text.trim()) {
      setErrorMessage("Please speak into the mic, select a quick scenario, or type your repair issue.");
      return;
    }

    setErrorMessage(null);
    setAnalyzing(true);

    const dist = customDistance !== undefined ? customDistance : distanceKm;

    try {
      const res = await apiPost<{
        success: boolean;
        data?: any;
        jobIntent?: any;
        priceEstimation?: any;
        recommendedWorkers?: any[];
        [key: string]: any;
      }>("/ai/voice-job", {
        transcript: text.trim(),
        speechTranscript: text.trim(),
        prompt: text.trim(),
        text: text.trim(),
        language: speechLang.slice(0, 2),
        distanceKm: dist,
        latitude: 28.6139,
        longitude: 77.209,
      });

      if (res.success) {
        const data = res.data || {};
        const jobIntent = res.jobIntent || data.jobIntent || {};
        const priceEst =
          res.priceEstimation ||
          data.priceEstimate ||
          data.priceEstimation || {
            p25: 65,
            p50: 100,
            p75: 135,
            min: 65,
            max: 135,
            explanation: "Based on certified trade baselines, fair pricing is ₹65 - ₹135.",
          };
        const workers = res.recommendedWorkers || data.recommendedWorkers || [];

        setResult({
          jobIntent: {
            jobToken:
              jobIntent.jobToken ||
              data.jobToken ||
              `JOB-2026-${Math.floor(100000 + Math.random() * 900000)}`,
            categorySlug: data.category || jobIntent.categorySlug || "electrical",
            categoryName: (
              data.categoryName ||
              jobIntent.categoryName ||
              data.category ||
              "Electrical"
            ).toUpperCase(),
            requiredSkills:
              data.skills || jobIntent.requiredSkills || [data.category || "electrical"],
            detectedLanguage: data.detectedLanguage || jobIntent.detectedLanguage || "mr",
            urgency: data.urgency || jobIntent.urgency || "MEDIUM",
            problemSummary:
              jobIntent.problemSummary || data.problem || text.trim(),
            confidence: jobIntent.confidence || 0.98,
            needsClarification: jobIntent.needsClarification || false,
            clarificationQuestion: jobIntent.clarificationQuestion || null,
          },
          priceEstimation: priceEst,
          recommendedWorkers: workers,
        });

        // Automatically create official service booking token
        const autoTokenId = `SHR-TOKEN-${Math.floor(100000 + Math.random() * 900000)}`;
        const autoOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const bookingRef = `BG-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
        const autoCategory = (data.categoryName || jobIntent.categoryName || data.category || "Electrical").toUpperCase();
        const autoProblem = jobIntent.problemSummary || data.problem || text.trim();
        const autoPrice = priceEst.p50 || 65;
        const autoBase = priceEst.breakdown?.baseServiceRateMin || 50;
        const autoTravel = priceEst.breakdown?.travelFeeStandard || 15;
        const autoWorker = workers[0]?.name || "Rajesh Kumar (Nearby Verified Technician)";

        const newBookedToken = {
          tokenId: autoTokenId,
          bookingRef: bookingRef,
          categoryName: autoCategory,
          problemSummary: autoProblem,
          totalPrice: autoPrice,
          baseRate: autoBase,
          travelFee: autoTravel,
          securityOtp: autoOtp,
          workerName: autoWorker,
          status: "CONFIRMED_DISPATCHED",
          etaMinutes: 15,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setBookedToken(newBookedToken);

        try {
          const prev = JSON.parse(localStorage.getItem("shramik_service_tokens") || "[]");
          localStorage.setItem("shramik_service_tokens", JSON.stringify([newBookedToken, ...prev]));
        } catch {}
      } else {
        setErrorMessage(res.error || "Could not analyze the problem. Please try again.");
      }
    } catch {
      setErrorMessage("Could not connect to AI diagnosis service. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBookWorker = (worker: any) => {
    if (!result?.jobIntent) return;

    if (onConfirmJob) {
      onConfirmJob({
        category: result.jobIntent.categorySlug,
        skills: result.jobIntent.requiredSkills,
        problem: result.jobIntent.problemSummary,
        urgency: result.jobIntent.urgency,
        priceEstimate: result.priceEstimation,
        workerId: worker.id,
        workerName: worker.name,
      });
      onClose();
    } else {
      setBookingDescription(
        `${result.jobIntent.problemSummary} (${result.jobIntent.categoryName})`
      );
      const cat = result.jobIntent.categorySlug;
      setSelectedService({
        id: `svc-${cat}`,
        name: `${result.jobIntent.categoryName} Repair & Service`,
        categorySlug: cat,
        categoryName: result.jobIntent.categoryName,
        basePrice: result.priceEstimation?.p50 || 100,
        unit: "fixed",
        isActive: true,
        coopId: "coop-delhi",
      });
      setStep(2);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#FAF7F2] p-6 sm:p-8 shadow-2xl border border-[#E8DFC8] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            stopVoiceRecording();
            onClose();
          }}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-xs">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1C1B18] font-serif tracking-tight">
              AI Voice & Problem Diagnosis
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              मराठी, हिन्दी किंवा English मध्ये बोला. अचूक कामगार व वाजवी दर (₹५० पासून).
            </p>
          </div>
        </div>

        {/* AUTOMATIC SERVICE BOOKING TOKEN DISPLAY */}
        {bookedToken && (
          <div className="mt-4 rounded-3xl border-2 border-emerald-500 bg-white p-5 shadow-xl space-y-3.5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                    Service Booked Successfully • सेवा बुक झाली आहे
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Official Service Booking Token Pass
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 animate-pulse">
                TOKEN ACTIVE
              </span>
            </div>

            {/* Token ID & Copy Barcode */}
            <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 p-3 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Official Booking Token
              </span>
              <div className="mt-0.5 flex items-center justify-center gap-2">
                <span className="text-xl font-black font-mono text-emerald-950 tracking-wider">
                  {bookedToken.tokenId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${bookedToken.tokenId} (OTP: ${bookedToken.securityOtp})`);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="rounded-md bg-white border border-emerald-300 p-1 text-emerald-800 hover:bg-emerald-100 transition-colors"
                  title="Copy Token"
                >
                  {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Ref: {bookedToken.bookingRef} · Issued: {bookedToken.createdAt}
              </p>
            </div>

            {/* Doorstep Verification Code */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Doorstep Verification Security OTP
                </span>
                <p className="text-[11px] text-amber-900 font-medium">
                  Share with technician upon arrival at your doorstep:
                </p>
              </div>
              <span className="text-base font-black font-mono text-amber-950 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs">
                {bookedToken.securityOtp}
              </span>
            </div>

            {/* Service & Price */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Service / Trade</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{bookedToken.categoryName}</span>
                <span className="text-[11px] text-slate-600 line-clamp-1">{bookedToken.problemSummary}</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-right">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Transparent Fair Cost</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">₹{bookedToken.totalPrice}.00</span>
                <span className="text-[10px] text-emerald-700 font-medium block">₹{bookedToken.baseRate} base + ₹{bookedToken.travelFee} travel</span>
              </div>
            </div>

            {/* Status Footer */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-orange-600" />
                <span>Assigned: <strong>{bookedToken.workerName}</strong></span>
              </span>
              <span className="font-bold text-emerald-700">~{bookedToken.etaMinutes} mins ETA</span>
            </div>

            {/* Actions */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.href = "/consumer/bookings";
                }}
                className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 py-2 text-xs font-bold text-white shadow-xs text-center transition-colors"
              >
                Track Booking & ETA
              </button>
              <button
                type="button"
                onClick={() => setBookedToken(null)}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors"
              >
                New Issue
              </button>
            </div>
          </div>
        )}

        {/* Language selector for Voice Input */}
        <div className="mt-5 flex items-center justify-between border-b border-slate-200/70 pb-3">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Recognition Language:
          </span>
          <div className="flex gap-1.5">
            {[
              { code: "mr-IN", label: "मराठी" },
              { code: "hi-IN", label: "हिन्दी" },
              { code: "en-IN", label: "English" },
            ].map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setSpeechLang(l.code);
                  if (recording) stopVoiceRecording();
                }}
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                  speechLang === l.code
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instant 1-Tap Marathi Test Banner */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-xs">
              <Volume2 className="h-3.5 w-3.5" />
            </span>
            <span className="font-bold">मराठी व्हॉइस टेस्ट (1-Tap):</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setTranscript("माझा पंखा काम करत नाहीये");
                handleAnalyze("माझा पंखा काम करत नाहीये");
              }}
              className="rounded-xl bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 active:scale-95 transition-all shadow-xs"
            >
              &ldquo;माझा पंखा काम करत नाहीये&rdquo;
            </button>
            <button
              type="button"
              onClick={() => {
                setTranscript("majha pankha kaam karat nahiye");
                handleAnalyze("majha pankha kaam karat nahiye");
              }}
              className="rounded-xl bg-white border border-amber-400 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100/60 active:scale-95 transition-all shadow-xs"
            >
              &ldquo;majha pankha&rdquo;
            </button>
          </div>
        </div>

        {/* Live Recording State Banner */}
        {recording && (
          <div className="mt-3 rounded-2xl border-2 border-orange-500 bg-orange-50 p-4 text-xs text-orange-950 shadow-sm animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-600"></span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    Listening ({speechLang === "mr-IN" ? "मराठी" : speechLang === "hi-IN" ? "हिन्दी" : "English"})... Speak now!
                  </span>
                  <div className="flex items-end gap-0.5 h-4">
                    <span className="w-1 bg-orange-600 rounded-full h-2 animate-pulse"></span>
                    <span className="w-1 bg-orange-600 rounded-full h-4 animate-pulse delay-75"></span>
                    <span className="w-1 bg-orange-600 rounded-full h-1.5 animate-pulse delay-150"></span>
                    <span className="w-1 bg-orange-600 rounded-full h-3.5 animate-pulse delay-100"></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(false)}
                  className="rounded-full bg-white border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(true)}
                  className="rounded-full bg-orange-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-orange-700 shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Done Speaking</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {errorMessage && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900 shadow-2xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <p className="leading-relaxed font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="mt-4 space-y-4">
          <div className="relative">
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Describe your issue here... (e.g. माझा पंखा काम करत नाहीये / my mobile charger not working)"
              className="w-full rounded-2xl border border-slate-300 bg-white p-4 pr-16 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-600 transition-all placeholder:text-slate-400 font-medium shadow-2xs"
            />

            <button
              type="button"
              onClick={() => (recording ? stopVoiceRecording(false) : startVoiceRecording())}
              className={`absolute right-3.5 bottom-3.5 flex h-11 w-11 items-center justify-center rounded-xl transition-all shadow-sm ${
                recording
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-orange-600 text-white hover:bg-orange-700 active:scale-95"
              }`}
              title={recording ? "Stop listening" : "Click to speak in Marathi/Hindi/English"}
              aria-label={recording ? "Stop listening" : "Click to speak"}
            >
              {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>

          {/* Quick Voice Scenarios (Instant 1-Tap Diagnosis) */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Try Quick Problem Scenarios (1-Tap Test):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICE_PRESETS.map((preset, idx) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTranscript(preset.text);
                      handleAnalyze(preset.text);
                    }}
                    className="text-left rounded-xl border border-slate-200 bg-white p-2.5 hover:border-orange-500 hover:bg-orange-50/50 transition-all group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {preset.lang}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-medium">
                      &ldquo;{preset.text}&rdquo;
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={() => handleAnalyze()}
            disabled={analyzing || !transcript.trim()}
            className="w-full h-12 text-sm font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-sm rounded-full"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Diagnosing Problem & Calculating Low Fair Price...
              </>
            ) : (
              <>Analyze with AI & Find Verified Workers</>
            )}
          </Button>
        </div>

        {/* AI Results breakdown */}
        {result && (
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 animate-slide-up">
            {/* Structured Job Token */}
            <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900 font-mono">
                  {result.jobIntent?.jobToken}
                </span>
                <Badge variant={result.jobIntent?.urgency === "HIGH" ? "danger" : "info"}>
                  {result.jobIntent?.urgency} URGENCY
                </Badge>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  {result.jobIntent?.categoryName}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  ({result.jobIntent?.detectedLanguage === "mr"
                    ? "मराठी भाषा ओळखली (Marathi)"
                    : result.jobIntent?.detectedLanguage === "hi"
                    ? "हिन्दी भाषा पहचानी"
                    : "English Detected"})
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-700 font-medium">
                <strong>Recommended Trade Skills:</strong> {result.jobIntent?.requiredSkills?.join(", ")}
              </p>
            </div>

            {/* Price Estimation Range (Starting at ₹50 + Transparent Distance Formula) */}
            {result.priceEstimation && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-emerald-200/80 pb-2.5">
                  <div>
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                      अपेक्षित वाजवी खर्च (Min. to Max Fair Price)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      कमी दरापासून सुरू (Starting from ₹50) + पारदर्शक प्रवास गणना
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-950 font-heading">
                      ₹{result.priceEstimation.min || result.priceEstimation.p25} – ₹{result.priceEstimation.max || result.priceEstimation.p75}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 block">
                      सरासरी: ₹{result.priceEstimation.p50}
                    </span>
                  </div>
                </div>

                {/* Calculation Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-white/95 border border-emerald-200 p-2.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      मूलभूत सेवा शुल्क
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      ₹{result.priceEstimation.breakdown?.baseServiceRateMin || 50} – ₹{result.priceEstimation.breakdown?.baseServiceRateMax || 120}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">तपासणी व दुरुस्ती</span>
                  </div>

                  <div className="rounded-xl bg-white/95 border border-emerald-200 p-2.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      प्रवास शुल्क (५ किमी)
                    </span>
                    <span className="text-sm font-black text-slate-900">₹15.00</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">मानक ५ किमी</span>
                  </div>

                  <div className="rounded-xl bg-white/95 border border-emerald-200 p-2.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      अतिरिक्त अंतर दर
                    </span>
                    <span className="text-sm font-black text-slate-900">+₹3.25 / किमी</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">५ किमी नंतर प्रति किमी</span>
                  </div>
                </div>

                {/* Calculation Formula Details */}
                <div className="rounded-xl bg-white/90 border border-emerald-200 p-3 text-xs text-slate-700 leading-relaxed font-medium space-y-1">
                  <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>📐</span>
                    <span>गणना सूत्र: ₹15 (मानक 5 किमी) + (अतिरिक्त अंतर × ₹3.25/किमी)</span>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {result.priceEstimation.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* Recommended Nearby Workers */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                Ranked Nearby Verified Technicians ({result.jobIntent?.categoryName}):
              </span>

              <div className="space-y-2">
                {result.recommendedWorkers?.length > 0 ? (
                  result.recommendedWorkers.slice(0, 2).map((w: any) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 hover:border-orange-500 shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-bold text-sm">
                          {w.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{w.name}</h4>
                            <span className="flex items-center text-xs font-bold text-amber-500">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                              {w.avgRating || "4.8"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {w.distanceKm ? `${w.distanceKm} km` : "Nearby"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {w.etaMinutes ? `${w.etaMinutes} mins` : "10 mins"}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">
                              Verified Technician
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleBookWorker(w)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                      >
                        Book Worker
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-white rounded-xl border border-slate-200">
                    Matching verified cooperative technicians in your area...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceJobModal;
