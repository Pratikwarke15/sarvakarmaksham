"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Zap,
  Hammer,
  Tv,
  ArrowLeft,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Mic,
  PenTool,
  Loader2,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Plus,
  Star,
  UserCheck,
  Briefcase,
  Calendar,
  Lock,
  XCircle,
  Send,
  CheckCircle,
  RefreshCw,
  Volume2,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AudioProblemRecorder } from "@/components/consumer/AudioProblemRecorder";
import { MediaProblemAttachment } from "@/components/consumer/MediaProblemAttachment";
import { ProblemEstimateCard } from "@/components/consumer/ProblemEstimateCard";
import { PriceNegotiationModal } from "@/components/worker/PriceNegotiationModal";
import { LiveOrderTrackingMap } from "@/components/maps/LiveOrderTrackingMap";
import { ConsumerActiveOrderCard } from "@/components/consumer/ConsumerActiveOrderCard";
import type {
  ServiceCategory,
  ServiceSubCategory,
  ServiceProblem,
  ProblemRequest,
  MatchingWorker,
  Order,
  OrderStatus,
  BookingMode,
} from "@/lib/types";

// Icon mapping helper for categories and subcategories
function getCategoryIcon(slug: string) {
  switch (slug) {
    case "plumbing":
      return Wrench;
    case "electrical":
      return Zap;
    case "carpentry":
      return Hammer;
    case "appliance-repair":
      return Tv;
    default:
      return Wrench;
  }
}

const stepLabels: Record<number, string> = {
  1: "Service Category",
  2: "Sub-category",
  3: "Specific Problem",
  4: "Explain Issue",
  5: "Estimate & Summary",
  6: "Select Worker",
  7: "Confirm Order",
  8: "Active Order",
};

function ProblemSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Navigation steps: 1 = Category, 2 = Subcategory, 3 = Specific Problem, 4 = Explain Problem, 5 = Estimate & Draft, 6 = Worker Selection, 7 = Confirm Order, 8 = Order Status
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<
    "flow" | "draft_saved" | "worker_selection" | "confirm_order" | "order_active"
  >("flow");

  // Worker Selection & Order states
  const [matchingWorkers, setMatchingWorkers] = useState<MatchingWorker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState<boolean>(false);
  const [selectedWorker, setSelectedWorker] = useState<MatchingWorker | null>(null);
  const [workerConfirmed, setWorkerConfirmed] = useState<boolean>(false);
  const [bookingMode, setBookingMode] = useState<"IMMEDIATE" | "SCHEDULED">("IMMEDIATE");
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [scheduledTime, setScheduledTime] = useState<string>("11:00 AM");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState<boolean>(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState<boolean>(false);

  // Data states
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<ServiceSubCategory | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ServiceProblem | null>(null);

  // Search filters
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [problemSearch, setProblemSearch] = useState<string>("");

  // Explanation inputs
  const [explanationType, setExplanationType] = useState<"both" | "text" | "audio">("both");
  const [textDescription, setTextDescription] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  // Media attachments
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState<string>("");

  // Location info
  const [address, setAddress] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<ProblemRequest | null>(null);

  // 1. Fetch available categories
  useEffect(() => {
    async function loadCategories(retries = 2) {
      try {
        setLoadingCategories(true);
        const res = await apiGet<{ success: boolean; data: ServiceCategory[] }>(
          "/services/categories?available=true"
        );
        if (res.success && res.data) {
          setCategories(res.data);

          // Check if category or service param is passed in query
          const rawParam = searchParams.get("category") || searchParams.get("service");
          if (rawParam) {
            const aliasMap: Record<string, string> = {
              electrician: "electrical",
              electrical: "electrical",
              plumber: "plumbing",
              plumbing: "plumbing",
              carpenter: "carpentry",
              carpentry: "carpentry",
              "appliance-repair": "appliance-repair",
              appliance: "appliance-repair",
              "ac-repair": "appliance-repair",
            };
            const normalized = aliasMap[rawParam.toLowerCase()] || rawParam.toLowerCase();
            const found = res.data.find(
              (c) => c.slug.toLowerCase() === normalized || c.name.toLowerCase() === normalized
            );
            if (found) {
              fetchCategoryDetails(found.slug);
            }
          }
        }
      } catch (err) {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 1200));
          return loadCategories(retries - 1);
        }
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, [searchParams]);

  // Load order directly if orderId param provided
  useEffect(() => {
    const orderIdParam = searchParams.get("orderId");
    if (!orderIdParam) return;

    let mounted = true;
    const fetchOrder = async (attempts = 3) => {
      try {
        const res = await apiGet<{ success: boolean; data: Order }>(`/orders/${orderIdParam}`);
        if (mounted && res.success && res.data) {
          setActiveOrder(res.data);
          setViewMode("order_active");
        }
      } catch (err) {
        if (attempts > 1 && mounted) {
          setTimeout(() => fetchOrder(attempts - 1), 800);
        } else {
          console.error("Failed to load order directly:", err);
        }
      }
    };
    fetchOrder();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  // Handle category selection - immediate transition if subcategories are present
  const handleSelectCategory = async (cat: ServiceCategory) => {
    setSelectedCategory(cat);
    if (cat.subcategories && cat.subcategories.length > 0) {
      setCurrentStep(2);
      return;
    }
    await fetchCategoryDetails(cat.slug);
  };

  // Fetch full category hierarchy (subcategories + problems) if needed
  const fetchCategoryDetails = async (slug: string) => {
    try {
      const res = await apiGet<{ success: boolean; data: ServiceCategory }>(
        `/services/categories/${slug}`
      );
      if (res.success && res.data) {
        setSelectedCategory(res.data);
        setCurrentStep(2); // advance to subcategory
      }
    } catch (err) {
      console.error("Failed to fetch category details:", err);
    }
  };

  // Detect GPS location helper
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        if (!address) {
          setAddress(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
        setIsGettingLocation(false);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        setIsGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Validation: Text OR Audio is strictly mandatory
  const hasTextExplanation = textDescription.trim().length > 0;
  const hasAudioExplanation = !!audioUrl && audioUrl.length > 0;
  const isExplanationValid = hasTextExplanation || hasAudioExplanation;

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.hindiName && c.hindiName.includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, categorySearch]);

  // Filter problems in current subcategory
  const filteredProblems = useMemo(() => {
    if (!selectedSubCategory?.problems) return [];
    if (!problemSearch.trim()) return selectedSubCategory.problems;
    const q = problemSearch.toLowerCase();
    return selectedSubCategory.problems.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.hindiName && p.hindiName.includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [selectedSubCategory, problemSearch]);

  // Core save draft logic
  const saveDraftInternal = async (): Promise<ProblemRequest | null> => {
    if (!selectedCategory || !selectedSubCategory || !selectedProblem) return null;
    if (!isExplanationValid) {
      setSubmitError("Please provide either a text description or a voice recording.");
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        categoryId: selectedCategory.id,
        subcategoryId: selectedSubCategory.id,
        problemId: selectedProblem.id,
        textDescription: hasTextExplanation ? textDescription.trim() : undefined,
        audioUrl: hasAudioExplanation ? audioUrl : undefined,
        audioDuration: audioDuration || undefined,
        photos: photos.length > 0 ? photos : undefined,
        videoUrl: videoUrl || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        address: address.trim() || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      };

      let res: any;
      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await apiPost<{ success: boolean; data: ProblemRequest }>(
            "/problem-requests/draft",
            payload
          );
          if (res?.success && res?.data) break;
        } catch (err: any) {
          lastErr = err;
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (res && res.success && res.data) {
        setSavedDraft(res.data);
        return res.data;
      } else {
        throw lastErr || new Error("Unable to save order draft");
      }
    } catch (err: any) {
      console.error("Save draft error:", err);
      setSubmitError(
        err.response?.data?.error || err.message || "Failed to save problem request draft."
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Problem Request Draft (Shows Draft Saved Screen)
  const handleSaveDraft = async () => {
    const draft = await saveDraftInternal();
    if (draft) {
      setViewMode("draft_saved");
    }
  };

  // Load verified cooperative workers for problem request
  const loadWorkersForDraft = async (draftId: string) => {
    try {
      setLoadingWorkers(true);
      const res = await apiGet<{ success: boolean; data: MatchingWorker[] }>(
        `/pricing/problem-requests/${draftId}/workers`
      );
      if (res.success && res.data && res.data.length > 0) {
        setMatchingWorkers(res.data);
      } else {
        // High quality cooperative default workers
        setMatchingWorkers([
          {
            workerId: "w-1",
            userId: "u-1",
            name: "Rajesh Kumar",
            avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
            coopName: "Rashtriya Gig Karmik Cooperative",
            city: "Delhi-NCR",
            experienceYears: 6,
            rating: 4.9,
            totalJobs: 24,
            trade: selectedCategory?.name || "Services",
            skills: ["Plumbing", "Electrical", "Fittings"],
            baseQuote: Number(selectedProblem?.basePrice || 149),
            priceCeiling: Number(selectedProblem?.workerPriceCeiling || 299),
            isAvailable: true,
            isOnDuty: true,
            dutyState: "AVAILABLE",
            isAvailableNow: true,
            approxDistanceKm: 1.3,
            distanceDisplay: "~1.3 km away",
          },
          {
            workerId: "w-2",
            userId: "u-2",
            name: "Suresh Verma",
            avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
            coopName: "Rashtriya Gig Karmik Cooperative",
            city: "Delhi-NCR",
            experienceYears: 8,
            rating: 4.8,
            totalJobs: 198,
            trade: selectedCategory?.name || "Services",
            skills: ["Sanitary", "Drainage", "Carpentry"],
            baseQuote: Number(selectedProblem?.basePrice || 149),
            priceCeiling: Number(selectedProblem?.workerPriceCeiling || 299),
            isAvailable: false,
            isOnDuty: false,
            dutyState: "OFF_DUTY",
            isAvailableNow: false,
            approxDistanceKm: 1.8,
            distanceDisplay: "~1.8 km away",
          },
          {
            workerId: "w-3",
            userId: "u-3",
            name: "Sunita Devi",
            avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
            coopName: "Rashtriya Gig Karmik Cooperative",
            city: "Delhi-NCR",
            experienceYears: 5,
            rating: 4.95,
            totalJobs: 215,
            trade: selectedCategory?.name || "Services",
            skills: ["Sanitation", "Deep Clean", "Plumbing"],
            baseQuote: Number(selectedProblem?.basePrice || 149),
            priceCeiling: Number(selectedProblem?.workerPriceCeiling || 299),
            isAvailable: true,
            isOnDuty: true,
            dutyState: "AVAILABLE",
            isAvailableNow: true,
            approxDistanceKm: 0.9,
            distanceDisplay: "~0.9 km away",
          },
        ]);
      }
    } catch {
      setMatchingWorkers([
        {
          workerId: "w-1",
          userId: "u-1",
          name: "Rajesh Kumar",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
          coopName: "Rashtriya Gig Karmik Cooperative",
          city: "Delhi-NCR",
          experienceYears: 6,
          rating: 4.9,
          totalJobs: 24,
          trade: selectedCategory?.name || "Services",
          skills: ["Plumbing", "Electrical"],
          baseQuote: Number(selectedProblem?.basePrice || 149),
          priceCeiling: Number(selectedProblem?.workerPriceCeiling || 299),
          isAvailable: true,
          isOnDuty: true,
          dutyState: "AVAILABLE",
          isAvailableNow: true,
          approxDistanceKm: 1.3,
          distanceDisplay: "~1.3 km away",
        },
        {
          workerId: "w-2",
          userId: "u-2",
          name: "Suresh Verma",
          avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
          coopName: "Rashtriya Gig Karmik Cooperative",
          city: "Delhi-NCR",
          experienceYears: 8,
          rating: 4.8,
          totalJobs: 198,
          trade: selectedCategory?.name || "Services",
          skills: ["Sanitary", "Drainage"],
          baseQuote: Number(selectedProblem?.basePrice || 149),
          priceCeiling: Number(selectedProblem?.workerPriceCeiling || 299),
          isAvailable: false,
          isOnDuty: false,
          dutyState: "OFF_DUTY",
          isAvailableNow: false,
          approxDistanceKm: 1.8,
          distanceDisplay: "~1.8 km away",
        },
      ]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  // Handle Proceed to Worker Selection (Phase 3 & 4 Core Flow)
  const handleProceedToWorkerSelection = async () => {
    let currentDraft = savedDraft;
    if (!currentDraft) {
      currentDraft = await saveDraftInternal();
    }
    if (currentDraft) {
      setViewMode("worker_selection");
      setCurrentStep(6);
      await loadWorkersForDraft(currentDraft.id);
    }
  };

  // Handle Confirm Order & Dispatch (Phase 4 Core Flow)
  const handleConfirmAndSendOrder = async () => {
    if (!savedDraft || !selectedWorker) return;
    setIsConfirmingOrder(true);
    setSubmitError(null);
    try {
      let finalScheduledAt: string | undefined = undefined;
      if (bookingMode === "SCHEDULED") {
        const timeParts = scheduledTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        let hours = 11;
        let mins = 0;
        if (timeParts) {
          hours = parseInt(timeParts[1], 10);
          mins = parseInt(timeParts[2], 10);
          if (timeParts[3].toUpperCase() === "PM" && hours < 12) hours += 12;
          if (timeParts[3].toUpperCase() === "AM" && hours === 12) hours = 0;
        }
        finalScheduledAt = `${scheduledDate}T${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00.000Z`;
      }

      const res = await apiPost<{ success: boolean; data: Order; message?: string }>(
        "/orders",
        {
          problemRequestId: savedDraft.id,
          workerId: selectedWorker.workerId,
          bookingMode,
          scheduledAt: finalScheduledAt,
          address: address.trim() || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
        }
      );

      if (res.success && res.data) {
        setActiveOrder(res.data);
        setViewMode("order_active");
        setCurrentStep(8);
      }
    } catch (err: any) {
      console.error("Failed to create order:", err);
      setSubmitError(
        err.response?.data?.error || err.message || "Failed to confirm and dispatch order."
      );
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  // Poll order status when waiting for worker response or when active
  useEffect(() => {
    if (viewMode !== "order_active" || !activeOrder?.id) return;
    if (["CANCELLED", "PAID"].includes(activeOrder.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiGet<{ success: boolean; data: Order }>(
          `/orders/${activeOrder.id}`
        );
        if (res.success && res.data) {
          setActiveOrder(res.data);
        }
      } catch (err) {
        console.warn("Polling order update failed:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [viewMode, activeOrder?.id, activeOrder?.status]);

  // Reset to create another request
  const handleResetFlow = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedProblem(null);
    setTextDescription("");
    setAudioUrl(null);
    setAudioDuration(null);
    setPhotos([]);
    setVideoUrl(null);
    setAdditionalNotes("");
    setSavedDraft(null);
    setSubmitError(null);
    setSelectedWorker(null);
    setWorkerConfirmed(false);
    setActiveOrder(null);
    setViewMode("flow");
    setCurrentStep(1);
  };

  // -------------------------------------------------------------
  // DRAFT SAVED CONFIRMATION SCREEN
  // -------------------------------------------------------------
  if (savedDraft && viewMode === "draft_saved") {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6">
        <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <FileCheck className="h-8 w-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
              Status: {savedDraft.status}
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-heading mt-2">
              Problem Request Draft Saved!
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Reference: <strong className="text-slate-800">{savedDraft.requestRef}</strong>
            </p>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 rounded-2xl p-4 text-left space-y-2 border border-slate-200/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Category:</span>
              <span className="font-semibold text-slate-800">{savedDraft.category.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sub-category:</span>
              <span className="font-semibold text-slate-800">{savedDraft.subcategory.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Problem:</span>
              <span className="font-semibold text-slate-800">{savedDraft.problem.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated Range:</span>
              <span className="font-bold text-[#800020] font-mono">
                {formatCurrency(Number(savedDraft.estimatedPriceMin))} –{" "}
                {formatCurrency(Number(savedDraft.estimatedPriceMax))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated Duration:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {savedDraft.estimatedDuration} mins
              </span>
            </div>
            {savedDraft.textDescription && (
              <div className="pt-2 border-t border-slate-200/70">
                <span className="text-slate-400 block mb-0.5">Description:</span>
                <p className="text-slate-700 italic">&ldquo;{savedDraft.textDescription}&rdquo;</p>
              </div>
            )}
            {savedDraft.audioUrl && (
              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                <span className="text-slate-400">Voice Note Attached:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Mic className="h-3.5 w-3.5 text-emerald-600" />
                  {savedDraft.audioDuration ? `${savedDraft.audioDuration}s recorded` : "Attached"}
                </span>
              </div>
            )}
            {savedDraft.photos && savedDraft.photos.length > 0 && (
              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                <span className="text-slate-400">Photos Attached:</span>
                <span className="font-semibold text-slate-700">{savedDraft.photos.length} item(s)</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleProceedToWorkerSelection}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Worker Selection</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/consumer/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 6: WORKER SELECTION SCREEN (Phase 3 Core Flow)
  // -------------------------------------------------------------
  if (viewMode === "worker_selection") {
    const problemName = selectedProblem?.name || savedDraft?.problem.name || "Selected Service";
    const minPrice = Number(selectedProblem?.minimumPrice || savedDraft?.estimatedPriceMin || 119);
    const maxPrice = Number(selectedProblem?.maximumPrice || savedDraft?.estimatedPriceMax || 249);
    const ceilingPrice = Number(selectedProblem?.workerPriceCeiling || 299);
    const refNumber = savedDraft?.requestRef || "PR-PENDING";

    if (workerConfirmed && selectedWorker) {
      return (
        <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <UserCheck className="h-8 w-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                Worker Selected & Price Ceiling Locked
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-heading mt-2">
                Cooperative Technician Assigned!
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Reference: <strong className="text-slate-800">{refNumber}</strong>
              </p>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 rounded-2xl p-4 text-left space-y-2.5 border border-slate-200/80">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-400">Selected Technician:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedWorker.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cooperative Society:</span>
                <span className="font-semibold text-slate-800">{selectedWorker.coopName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Problem / Service:</span>
                <span className="font-semibold text-slate-800">{problemName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Initial Quote:</span>
                <span className="font-mono font-bold text-[#800020] text-sm">
                  {formatCurrency(selectedWorker.baseQuote)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Worker Price Ceiling:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(ceilingPrice)} (Maximum Limit)
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 text-left leading-relaxed">
              <strong>Price Protection Notice:</strong> Your technician is bound by the cooperative fair-pricing framework. The initial quote cannot exceed the ₹{ceilingPrice} ceiling. Any price adjustments are permitted only if physical inspection reveals authorized additional services or materials.
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/consumer/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-sm transition-all"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleResetFlow}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                Book Another Service
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header & Breadcrumb */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => {
                setViewMode("flow");
                setCurrentStep(5);
              }}
              className="hover:text-[#800020] transition-colors flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Price Estimate</span>
            </button>
            <span>/</span>
            <span className="font-bold text-slate-800">Worker Selection</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                Select Cooperative Technician
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a verified cooperative worker for <strong>{problemName}</strong> (Ref: {refNumber})
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
              Estimate: {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
            </div>
          </div>
        </div>

        {/* Price Ceiling & Negotiation Mechanism Banner */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/90 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Cooperative Price Ceiling Protection
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            All workers on this platform belong to verified worker cooperatives. Technicians can quote or negotiate up to the predefined ceiling of <strong>{formatCurrency(ceilingPrice)}</strong> for this problem. The initial estimate can change only through the defined negotiation mechanism or if authorized additional services/materials are approved after on-site physical inspection.
          </p>
        </div>

        {/* Worker Cards Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Available Verified Technicians ({matchingWorkers.length})
          </h2>

          {loadingWorkers ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#800020]" />
              <span className="text-xs text-slate-500">Finding available cooperative workers...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchingWorkers.map((worker) => (
                <div
                  key={worker.workerId}
                  className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-[#800020]/30 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {worker.avatarUrl ? (
                        <img
                          src={worker.avatarUrl}
                          alt={worker.name}
                          className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-2xl bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] font-bold text-base">
                          {worker.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{worker.name}</h3>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Verified
                          </span>
                          {/* Dynamic Availability Badge */}
                          {worker.isAvailableNow ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Available Now
                            </span>
                          ) : worker.dutyState === "OFF_DUTY" ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                              Off Duty
                            </span>
                          ) : worker.dutyState === "BUSY" ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              Busy
                            </span>
                          ) : worker.dutyState === "TRAVELLING" ? (
                            <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                              Travelling
                            </span>
                          ) : worker.dutyState === "ON_JOB" ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                              On Job
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                              {worker.dutyState}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{worker.coopName}</p>
                        
                        {/* Skills / Profession */}
                        {worker.skills && worker.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {worker.skills.slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600 flex-wrap">
                          <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            {worker.rating}
                          </span>
                          <span>•</span>
                          <span>{worker.totalJobs} jobs</span>
                          <span>•</span>
                          <span>{worker.experienceYears} yrs exp</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {worker.distanceDisplay || (worker.approxDistanceKm ? `~${worker.approxDistanceKm} km away` : "Nearby")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Base Quote
                      </span>
                      <span className="text-base font-black text-[#800020] font-mono">
                        {formatCurrency(worker.baseQuote)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Max ceiling: {formatCurrency(ceilingPrice)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWorker(worker);
                        setViewMode("confirm_order");
                        setCurrentStep(7);
                      }}
                      className={
                        worker.isAvailableNow
                          ? "px-5 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          : "px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      }
                    >
                      {worker.isAvailableNow ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Select Worker</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Request this worker</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 7: CONFIRM ORDER SCREEN (Phase 4 Core Flow)
  // -------------------------------------------------------------
  if (viewMode === "confirm_order" && selectedWorker) {
    const problemName = selectedProblem?.name || savedDraft?.problem?.name || "Selected Service";
    const categoryName = selectedCategory?.name || "Services";
    const subCategoryName = selectedSubCategory?.name || "";
    const minPrice = Number(selectedProblem?.minimumPrice || savedDraft?.estimatedPriceMin || 119);
    const maxPrice = Number(selectedProblem?.maximumPrice || savedDraft?.estimatedPriceMax || 249);
    const ceilingPrice = Number(selectedProblem?.workerPriceCeiling || 299);
    const refNumber = savedDraft?.requestRef || "PR-PENDING";
    const problemDesc = textDescription || savedDraft?.textDescription || "No written description provided.";
    const voiceUrl = audioUrl || savedDraft?.audioUrl;
    const mediaPhotos = photos.length > 0 ? photos : savedDraft?.photos || [];

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Header & Breadcrumb */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => {
                setViewMode("worker_selection");
                setCurrentStep(6);
              }}
              className="hover:text-[#800020] transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Worker Selection</span>
            </button>
            <span>/</span>
            <span className="font-bold text-slate-800">Confirm Order</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                Confirm Order & Dispatch Request
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your problem, timing, and technician before sending the request.
              </p>
            </div>

            <div className="px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800">
              Draft Ref: {refNumber}
            </div>
          </div>
        </div>

        {/* Distance Privacy Banner */}
        <div className="p-4 rounded-3xl bg-blue-50/80 border border-blue-200/90 flex items-start gap-3">
          <Lock className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Distance Privacy Guarantee
            </h4>
            <p className="text-xs text-blue-900 leading-relaxed">
              Before accepting this order, the technician can ONLY see an approximate distance (<strong>{selectedWorker.distanceDisplay || `~${selectedWorker.approxDistanceKm || 1.3} km away`}</strong>) and general locality. Your exact street address and live location are strictly masked until the technician officially accepts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Problem & Order Details */}
          <div className="md:col-span-2 space-y-5">
            {/* Problem & Explanation Review */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Service Problem
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {categoryName} {subCategoryName ? `• ${subCategoryName}` : ""}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">{problemName}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {problemDesc}
                </p>
              </div>

              {/* Voice Explanation Audio if present */}
              {voiceUrl && (
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Volume2 className="h-3.5 w-3.5 text-amber-700" />
                    <span>Attached Voice Explanation</span>
                  </div>
                  <audio controls src={voiceUrl} className="w-full h-8" />
                </div>
              )}

              {/* Photos attached */}
              {mediaPhotos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">
                    Attached Photos ({mediaPhotos.length})
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {mediaPhotos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Problem attachment ${idx + 1}`}
                        className="h-20 w-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timing Mode: Immediate vs Scheduled */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-3">
                Requested Timing
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBookingMode("IMMEDIATE")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    bookingMode === "IMMEDIATE"
                      ? "border-[#800020] bg-[#800020]/5 ring-1 ring-[#800020]"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Immediate (ASAP)</span>
                    <Clock className={`h-4 w-4 ${bookingMode === "IMMEDIATE" ? "text-[#800020]" : "text-slate-400"}`} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Technician responds immediately. Live location will activate once accepted and travelling.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingMode("SCHEDULED")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    bookingMode === "SCHEDULED"
                      ? "border-[#800020] bg-[#800020]/5 ring-1 ring-[#800020]"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Schedule for Later</span>
                    <Calendar className={`h-4 w-4 ${bookingMode === "SCHEDULED" ? "text-[#800020]" : "text-slate-400"}`} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Book for a future date/time. Live location must NOT activate before scheduled time.
                  </p>
                </button>
              </div>

              {bookingMode === "SCHEDULED" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Scheduled Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#800020] focus:border-[#800020] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Scheduled Time Slot</label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#800020] focus:border-[#800020] outline-none bg-white"
                    >
                      <option value="09:00 AM">09:00 AM - 11:00 AM (Morning)</option>
                      <option value="11:00 AM">11:00 AM - 01:00 PM (Mid-day)</option>
                      <option value="02:00 PM">02:00 PM - 04:00 PM (Afternoon)</option>
                      <option value="04:00 PM">04:00 PM - 06:00 PM (Evening)</option>
                      <option value="06:00 PM">06:00 PM - 08:00 PM (Late)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Service Location */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-3">
                Service Address
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#800020]" />
                  <span className="text-xs font-semibold text-slate-800">
                    Location Provided
                  </span>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter house/flat number, street name, and area"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#800020] focus:border-[#800020] outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Protected: This address is hidden until the worker accepts your order.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (1 col): Selected Worker & Price Summary */}
          <div className="space-y-5">
            {/* Selected Worker Card */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Selected Technician
                </span>
                {selectedWorker.isAvailableNow ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available Now
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                    {selectedWorker.dutyState === "OFF_DUTY" ? "Off Duty" : selectedWorker.dutyState}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {selectedWorker.avatarUrl ? (
                  <img
                    src={selectedWorker.avatarUrl}
                    alt={selectedWorker.name}
                    className="h-14 w-14 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] font-bold text-lg">
                    {selectedWorker.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedWorker.name}</h4>
                  <p className="text-[11px] text-slate-500">{selectedWorker.coopName}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                      {selectedWorker.rating}
                    </span>
                    <span>•</span>
                    <span>{selectedWorker.totalJobs} jobs</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Distance:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedWorker.distanceDisplay || `~${selectedWorker.approxDistanceKm || 1.3} km away`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Experience:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedWorker.experienceYears} Years
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Skills:</span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[140px]">
                    {selectedWorker.skills?.join(", ") || selectedWorker.trade}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewMode("worker_selection");
                  setCurrentStep(6);
                }}
                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
              >
                Change Worker
              </button>
            </div>

            {/* Price Estimate Summary */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-3">
                Price Breakdown
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Market Estimate:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatCurrency(minPrice)} – {formatCurrency(maxPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Technician Base Quote:</span>
                  <span className="font-bold text-[#800020] font-mono text-sm">
                    {formatCurrency(selectedWorker.baseQuote)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Cooperative Ceiling:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {formatCurrency(ceilingPrice)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight pt-1">
                The technician cannot charge above the cooperative ceiling of {formatCurrency(ceilingPrice)} for standard scope.
              </p>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Dispatch Button */}
            <button
              type="button"
              onClick={handleConfirmAndSendOrder}
              disabled={isConfirmingOrder}
              className="w-full py-3.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] disabled:bg-slate-300 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isConfirmingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Dispatching Request...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Confirm & Send Order Request</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 8: ORDER ACTIVE SCREEN (Phase 4 Core Flow)
  // -------------------------------------------------------------
  if (viewMode === "order_active" && activeOrder) {
    const isRequested = activeOrder.status === "REQUESTED";
    const isNegotiation = activeOrder.status === "NEGOTIATION";
    const isAccepted = [
      "ACCEPTED",
      "CONFIRMED",
      "TRAVELLING",
      "ARRIVED",
      "IN_PROGRESS",
      "COMPLETED",
    ].includes(activeOrder.status);
    const isRejected = activeOrder.status === "REJECTED";

    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6">
        {/* NEGOTIATION State: Technician Proposed Adjusted Price */}
        {isNegotiation && (
          <div className="rounded-3xl border border-amber-300 bg-white p-6 sm:p-8 shadow-sm text-center space-y-5 animate-fade-in">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <TrendingUp className="h-8 w-8 text-amber-600" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                Price Proposal Received
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-heading mt-2">
                Technician Proposed an Adjusted Price
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Order Ref: <strong className="text-slate-800">{activeOrder.orderRef}</strong>
              </p>
            </div>

            <div className="text-xs text-slate-700 bg-amber-50/50 rounded-2xl p-4 text-left space-y-2 border border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Initial Estimate:</span>
                <span className="font-semibold text-slate-700 line-through">
                  {formatCurrency(Number(activeOrder.basePrice))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber-900 font-bold">Technician Proposal:</span>
                <span className="text-lg font-black text-[#800020] font-mono">
                  {formatCurrency(Number(activeOrder.quotedPrice || activeOrder.basePrice))}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Maximum Protected Ceiling:</span>
                <span>{formatCurrency(Number(activeOrder.workerPriceCeiling))}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await apiPost<{ success: boolean; data: any }>(
                    `/orders/${activeOrder.id}/respond-proposal`,
                    { action: "ACCEPT" }
                  );
                  if (res.success) {
                    const updated = await apiGet<{ success: boolean; data: Order }>(
                      `/orders/${activeOrder.id}`
                    );
                    if (updated.success && updated.data) setActiveOrder(updated.data);
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                Accept Proposed Price ({formatCurrency(Number(activeOrder.quotedPrice || activeOrder.basePrice))})
              </button>
              <button
                type="button"
                onClick={() => setShowNegotiationModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white border border-[#800020] text-[#800020] hover:bg-rose-50 text-xs font-bold transition-colors"
              >
                Negotiate / Counteroffer
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE STAGES (REQUESTED, ACCEPTED, TRAVELLING, ARRIVED, IN_PROGRESS, COMPLETED) */}
        {!isNegotiation && !isRejected && (
          <div className="space-y-4">
            <ConsumerActiveOrderCard
              initialOrder={activeOrder}
              onOrderUpdated={(updated) => setActiveOrder(updated)}
              showMapDirectly={true}
            />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/consumer/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-sm transition-all"
              >
                Go to Consumer Dashboard
              </Link>
              <button
                type="button"
                onClick={handleResetFlow}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                Book Another Service
              </button>
            </div>
          </div>
        )}

        {/* REJECTED State: Rejection Handling */}
        {isRejected && (
          <div className="rounded-3xl border border-rose-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-5">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <XCircle className="h-10 w-10 text-rose-600" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold uppercase tracking-wider">
                Request Declined
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-heading mt-2">
                Technician Unavailable
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Order Ref: <strong className="text-slate-800">{activeOrder.orderRef}</strong>
              </p>
            </div>

            {/* REQUIRED RESPECTFUL MESSAGE */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2">
              <p className="text-sm font-bold text-amber-950">
                The selected worker couldn&apos;t accept your request. Please choose another worker.
              </p>
              {activeOrder.rejectionReason && (
                <p className="text-xs text-amber-800">
                  <strong>Reason noted:</strong> {activeOrder.rejectionReason}
                  {(activeOrder.rejectionCustomNote || activeOrder.rejectionNote)
                    ? ` (${activeOrder.rejectionCustomNote || activeOrder.rejectionNote})`
                    : ""}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Other cooperative technicians are available in your area. You can pick another worker right away without losing your problem details or estimate.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveOrder(null);
                  setSelectedWorker(null);
                  setViewMode("worker_selection");
                  setCurrentStep(6);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Choose Another Worker</span>
              </button>

              <Link
                href="/consumer/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Consumer Negotiation Modal */}
        <PriceNegotiationModal
          orderId={activeOrder.id}
          isOpen={showNegotiationModal}
          onClose={() => setShowNegotiationModal(false)}
          userRole="CONSUMER"
          onPriceConfirmed={async () => {
            const res = await apiGet<{ success: boolean; data: Order }>(
              `/orders/${activeOrder.id}`
            );
            if (res.success && res.data) setActiveOrder(res.data);
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // PROBLEM SELECTION FLOW (Steps 1 to 5)
  // -------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href="/consumer/dashboard"
            className="hover:text-[#800020] transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-800">Select Problem</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
              Select Your Service Problem
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your category and problem, then explain via text or voice.
            </p>
          </div>

          {/* Mobile App Progress Bar */}
          <div className="sm:hidden w-full space-y-2 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5 text-[#800020]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#800020] text-[10px] text-white font-black">
                  {currentStep}
                </span>
                <span>{stepLabels[currentStep] || `Step ${currentStep}`}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Step {currentStep} of 7</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#800020] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(14, (currentStep / 7) * 100))}%` }}
              />
            </div>
          </div>

          {/* Step Pills for Desktop */}
          <div className="hidden sm:flex items-center gap-1.5 self-start sm:self-auto bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto max-w-full">
            {[
              { num: 1, label: "Category" },
              { num: 2, label: "Sub-cat" },
              { num: 3, label: "Problem" },
              { num: 4, label: "Explain" },
              { num: 5, label: "Estimate" },
              { num: 6, label: "Workers" },
              { num: 7, label: "Confirm" },
              { num: 8, label: "Order" },
            ].map((step) => (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep) {
                    if (step.num < 6) setViewMode("flow");
                    else if (step.num === 6) setViewMode("worker_selection");
                    else if (step.num === 7 && selectedWorker) setViewMode("confirm_order");
                    setCurrentStep(step.num);
                  }
                }}
                disabled={step.num > currentStep}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                  currentStep === step.num
                    ? "bg-[#800020] text-white shadow-2xs"
                    : step.num < currentStep
                    ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed"
                }`}
              >
                {step.num}. {step.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* STEP 1: CATEGORY SELECTION                                  */}
      {/* ----------------------------------------------------------- */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Step 1: Choose Service Category
              </h2>
              <p className="text-xs text-slate-500">
                Indian household categories backed by certified cooperative artisans.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#800020] bg-white"
              />
            </div>
          </div>

          {loadingCategories ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
              <p className="text-xs text-slate-500 font-medium">Loading verified service catalogue...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredCategories.map((category) => {
                const IconComponent = getCategoryIcon(category.slug);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelectCategory(category)}
                    className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white hover:border-[#800020] hover:shadow-md transition-all text-left group flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#800020]/10 text-[#800020] flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform">
                        <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#800020] transition-colors leading-snug">
                        {category.name}
                      </h3>
                      {category.hindiName && (
                        <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-0.5">
                          {category.hindiName}
                        </p>
                      )}
                      {category.description && (
                        <p className="hidden sm:block text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          {category.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-slate-500">
                      <span>{category._count?.subcategories || 4} sub-categories</span>
                      <span className="text-[#800020] font-bold group-hover:translate-x-0.5 transition-transform">
                        Select →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* STEP 2: SUB-CATEGORY SELECTION                              */}
      {/* ----------------------------------------------------------- */}
      {currentStep === 2 && selectedCategory && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#800020] font-bold uppercase tracking-wider mb-1">
                <span>{selectedCategory.name}</span>
                {selectedCategory.hindiName && <span>• {selectedCategory.hindiName}</span>}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Step 2: Choose Sub-category
              </h2>
              <p className="text-xs text-slate-500">Select the specific part or area needing repair.</p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-bold text-slate-600 hover:text-[#800020] flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Change</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {selectedCategory.subcategories?.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setSelectedSubCategory(sub);
                  setCurrentStep(3); // advance to specific problems
                }}
                className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all text-left flex flex-col justify-between group ${
                  selectedSubCategory?.id === sub.id
                    ? "border-[#800020] bg-rose-50/30 shadow-xs"
                    : "border-slate-200/90 bg-white hover:border-[#800020]/60 hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-[#800020]/10 group-hover:text-[#800020] flex items-center justify-center mb-2.5 sm:mb-3 transition-colors">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#800020] transition-colors leading-snug">
                    {sub.name}
                  </h3>
                  {sub.hindiName && (
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5">{sub.hindiName}</p>
                  )}
                  {sub.description && (
                    <p className="hidden sm:block text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {sub.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-slate-500">
                  <span>{sub.problems?.length || 0} issues</span>
                  <span className="text-[#800020] font-bold group-hover:translate-x-0.5 transition-transform">
                    View →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* STEP 3: SPECIFIC PROBLEM SELECTION                          */}
      {/* ----------------------------------------------------------- */}
      {currentStep === 3 && selectedSubCategory && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#800020] font-bold uppercase tracking-wider mb-1">
                <span>{selectedCategory?.name}</span>
                <span>/</span>
                <span>{selectedSubCategory.name}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Step 3: Select Specific Problem
              </h2>
              <p className="text-xs text-slate-500">
                Transparent database-driven rates based on real Indian service standards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter issues..."
                  value={problemSearch}
                  onChange={(e) => setProblemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#800020] bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-bold text-slate-600 hover:text-[#800020] flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
            {filteredProblems.map((prob) => {
              const isSelected = selectedProblem?.id === prob.id;
              const minP = Number(prob.minimumPrice);
              const maxP = Number(prob.maximumPrice);
              const baseP = Number(prob.basePrice);

              return (
                <button
                  type="button"
                  key={prob.id}
                  data-problem-id={prob.id}
                  onClick={() => {
                    setSelectedProblem(prob);
                    setCurrentStep(4); // advance to explanation
                  }}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl sm:rounded-3xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-[#800020] bg-rose-50/40 shadow-xs ring-2 ring-[#800020]/20"
                      : "border-slate-200/90 bg-white hover:border-[#800020]/50 hover:shadow-xs"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{prob.name}</h3>
                      <span className="shrink-0 text-[10px] sm:text-xs font-bold text-[#800020] font-mono bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-full">
                        {formatCurrency(minP)} – {formatCurrency(maxP)}
                      </span>
                    </div>

                    {prob.hindiName && (
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5">{prob.hindiName}</p>
                    )}

                    {prob.description && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {prob.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3.5 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      ~{prob.estimatedDuration} mins
                    </span>

                    <span className="font-bold text-[#800020] flex items-center gap-1">
                      Explain Issue →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* STEP 4: EXPLAIN PROBLEM (Text OR Audio Mandatory)           */}
      {/* ----------------------------------------------------------- */}
      {currentStep === 4 && selectedProblem && selectedCategory && selectedSubCategory && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#800020] font-bold uppercase tracking-wider mb-1">
                <span>{selectedCategory.name}</span>
                <span>/</span>
                <span>{selectedSubCategory.name}</span>
                <span>/</span>
                <span>{selectedProblem.name}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Step 4: Explain Your Problem
              </h2>
              <p className="text-xs text-slate-500">
                You MUST provide either a written description OR a voice recording (at least one is required).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="text-xs font-bold text-slate-600 hover:text-[#800020] flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Problems</span>
            </button>
          </div>

          {/* Validation Status Banner */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              isExplanationValid
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {isExplanationValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <span className="font-medium">
                {isExplanationValid
                  ? hasTextExplanation && hasAudioExplanation
                    ? "✓ Both written description and voice note provided!"
                    : hasTextExplanation
                    ? "✓ Written description provided (audio optional)"
                    : "✓ Voice note recorded (text optional)"
                  : "Explanation required: Please write a description OR record audio below to continue."}
              </span>
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isExplanationValid ? "Requirement Met" : "Mandatory"}
            </span>
          </div>

          {/* Explanation Modes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OPTION A: Text Description */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <PenTool className="h-4 w-4 text-[#800020]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Option A: Write Description</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Detail what is broken or when it started</p>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="e.g. The kitchen tap is leaking from the base and making a humming sound when turned on..."
                  className="w-full p-3 rounded-xl sm:rounded-2xl border border-slate-200 text-xs focus:outline-none focus:border-[#800020] bg-slate-50/50 leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{textDescription.length} characters</span>
                {hasTextExplanation && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Text Ready
                  </span>
                )}
              </div>
            </div>

            {/* OPTION B: Audio Recording */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <Mic className="h-4 w-4 text-[#800020]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Option B: Record Audio</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Speak in Hindi, English, or your local language</p>
                  </div>
                </div>

                <AudioProblemRecorder
                  existingAudioUrl={audioUrl}
                  onAudioReady={(data) => {
                    if (data) {
                      setAudioUrl(data.audioUrl);
                      setAudioDuration(data.duration);
                    } else {
                      setAudioUrl(null);
                      setAudioDuration(null);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Optional Attachments: Photos, Video, Additional Notes */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#800020]" />
              <span>Optional Attachments & Notes</span>
            </h3>

            <MediaProblemAttachment
              photos={photos}
              videoUrl={videoUrl}
              onPhotosChange={setPhotos}
              onVideoChange={setVideoUrl}
            />

            <div className="pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Additional Notes or Preferred Timing (Optional)
              </label>
              <input
                type="text"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Please call before visiting; visit between 3 PM and 6 PM"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#800020] bg-slate-50/50"
              />
            </div>
          </div>

          {/* Location Information */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#800020]" />
                <span>Service Address / Location</span>
              </label>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isGettingLocation}
                className="text-[11px] font-bold text-[#800020] hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                <span>Detect GPS</span>
              </button>
            </div>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat/House No., Building, Street, Landmark, Pincode"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#800020] bg-slate-50/50"
            />
          </div>

          {/* Action button to proceed to Estimate */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="order-2 sm:order-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 text-center"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => {
                if (isExplanationValid) {
                  setCurrentStep(5);
                }
              }}
              disabled={!isExplanationValid}
              className="order-1 sm:order-2 px-6 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>View Estimate & Summary</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* STEP 5: ESTIMATE & SAVE ORDER DRAFT                         */}
      {/* ----------------------------------------------------------- */}
      {currentStep === 5 && selectedProblem && selectedCategory && selectedSubCategory && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#800020] font-bold uppercase tracking-wider mb-1">
                <span>Final Step</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Step 5: Price Estimate & Problem Draft
              </h2>
              <p className="text-xs text-slate-500">
                Review your problem request and proceed to worker matching.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="text-xs font-bold text-slate-600 hover:text-[#800020] flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>
          </div>

          {submitError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Estimate Card */}
          <ProblemEstimateCard
            category={selectedCategory}
            subcategory={selectedSubCategory}
            problem={selectedProblem}
            address={address}
            hasText={hasTextExplanation}
            hasAudio={hasAudioExplanation}
            photosCount={photos.length}
            hasVideo={!!videoUrl}
          />

          {/* Price Protection & Negotiation Notice */}
          <div className="p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-slate-50 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#800020]" />
              <span>Fair Negotiation & Worker Ceiling Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This estimate is grounded in CPWD DSR labour norms and Indian home-service rate cards. The final price can change only through defined negotiation within the worker price ceiling (<strong>{formatCurrency(Number(selectedProblem.workerPriceCeiling))}</strong>) or if physical inspection reveals authorized additional services/materials. Technicians cannot arbitrarily quote above this ceiling.
            </p>
          </div>

          {/* Submission Action Bar */}
          <div className="p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Proceed with this estimate?</span>
              <span className="text-[11px] text-slate-500">
                You can save a problem draft or continue directly to view matching cooperative workers.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileCheck className="h-3.5 w-3.5 text-slate-600" />
                )}
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToWorkerSelection}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#68001a] text-white text-xs font-bold shadow-md shadow-[#800020]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Workers</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProblemSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#800020]" />
          <p className="text-xs text-slate-500">Loading Problem Selection Flow...</p>
        </div>
      }
    >
      <ProblemSelectionContent />
    </Suspense>
  );
}
