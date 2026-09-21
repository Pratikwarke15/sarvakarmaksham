"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBookingStore } from "@/store/bookingStore";
import { ServiceCard } from "@/components/booking/ServiceCard";
import { WorkerCard } from "@/components/booking/WorkerCard";
import { OpenStreetMap } from "@/components/maps/OpenStreetMap";
import { VoiceJobModal } from "@/components/booking/VoiceJobModal";
import { MapPlaceholder } from "@/components/ui/map-placeholder";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/providers/ToastProvider";
import { AlertCircle, Check, Loader2, MapPin, Mic, ShieldAlert, Sparkles } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import type { ApiResponse, Booking, Service, WorkerProfile } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface NearbyWorker {
  workerId: string;
  workerName: string;
  skillTags: string[];
  avgRating: number;
  totalJobs: number;
  bio?: string | null;
  experienceYears: number;
  distanceKm: number;
  etaMinutes?: number;
  matchScore?: number;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  mock?: boolean;
}

const DEFAULT_LOCATION = { lat: 28.6139, lng: 77.209 };
const steps = ["Select Service", "Location & Details", "Choose Worker", "Confirm"];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function toWorkerProfile(worker: NearbyWorker): WorkerProfile & {
  distanceKm: number;
  etaMinutes?: number;
  matchScore?: number;
} {
  return {
    id: worker.workerId,
    userId: worker.workerId,
    user: {
      id: worker.workerId,
      name: worker.workerName,
      phone: "",
      role: "WORKER",
      locale: "en",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
    status: "VERIFIED",
    skillTags: worker.skillTags,
    bio: worker.bio || undefined,
    experienceYears: worker.experienceYears,
    isAvailable: true,
    isOnDuty: true,
    avgRating: worker.avgRating,
    totalJobs: worker.totalJobs,
    totalEarnings: 0,
    walletBalance: 0,
    kycStatus: "VERIFIED",
    aadhaarVerified: true,
    distanceKm: worker.distanceKm,
    etaMinutes: worker.etaMinutes,
    matchScore: worker.matchScore,
  };
}

function parseError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function BookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    step,
    selectedService,
    setStep,
    setSelectedService,
    bookingAddress,
    setBookingAddress,
    bookingDescription,
    setBookingDescription,
    bookingLatitude,
    bookingLongitude,
    setBookingLocation,
    clearBooking,
  } = useBookingStore();

  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [nearbyWorkers, setNearbyWorkers] = useState<Array<WorkerProfile & { distanceKm: number; etaMinutes?: number; matchScore?: number }>>([]);
  const [selectedWorker, setSelectedWorker] = useState<(WorkerProfile & { distanceKm?: number; matchScore?: number }) | null>(null);
  const [paying, setPaying] = useState(false);
  const [latInput, setLatInput] = useState(String(bookingLatitude ?? DEFAULT_LOCATION.lat));
  const [lngInput, setLngInput] = useState(String(bookingLongitude ?? DEFAULT_LOCATION.lng));
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Guard: if unauthenticated, redirect to login with return target
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("coopgig_token");
      if (!token) {
        const query = window.location.search;
        router.replace(`/login?redirect=/consumer/book${query ? encodeURIComponent(query) : ""}`);
      }
    }
  }, [router]);

  const handleVoiceJobConfirm = (jobData: {
    category: string;
    skills: string[];
    problem: string;
    urgency: string;
    priceEstimate: { p25: number; p50: number; p75: number };
    workerId?: string;
    workerName?: string;
  }) => {
    setBookingDescription(jobData.problem);
    const matched = services.find((s) =>
      s.categorySlug.toLowerCase().includes(jobData.category.toLowerCase()) ||
      jobData.category.toLowerCase().includes(s.categorySlug.toLowerCase()) ||
      s.name.toLowerCase().includes(jobData.category.toLowerCase())
    ) || services[0];

    if (matched) {
      setSelectedService(matched);
    }
    if (!bookingAddress) {
      setBookingAddress("Connaught Place, New Delhi");
    }
    setShowVoiceModal(false);
    toast({
      title: `AI Matched: ${jobData.category.toUpperCase()}`,
      description: `Estimated ₹${jobData.priceEstimate.p25} - ₹${jobData.priceEstimate.p75}. Proceeding to confirmation!`,
      variant: "success",
    });
    setStep(2);
  };

  const commissionAmount = useMemo(() => {
    if (!selectedService) return 0;
    const commissionRate = Math.min(Number(selectedService.coop?.commissionRate ?? selectedService.coop?.maxCommissionRate ?? 5), 5);
    return Math.round(selectedService.basePrice * (commissionRate / 100) * 100) / 100;
  }, [selectedService]);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    apiGet<ApiResponse<Service[]>>("/coops/services")
      .then((res) => {
        if (res.success && res.data) {
          setServices(res.data);
          // Pre-select service from URL parameter if provided
          if (typeof window !== "undefined") {
            const requested = new URLSearchParams(window.location.search).get("service")?.toLowerCase();
            if (requested) {
              const matched = res.data.find(
                (s) =>
                  s.categorySlug.toLowerCase().includes(requested) ||
                  requested.includes(s.categorySlug.toLowerCase()) ||
                  s.name.toLowerCase().includes(requested)
              );
              if (matched) {
                setSelectedService(matched);
                setStep(2);
              }
            }
          }
        }
      })
      .catch((error) => {
        toast({ title: parseError(error, "Failed to load services"), variant: "danger" });
      })
      .finally(() => setServicesLoading(false));
  }, [toast, setSelectedService, setStep]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location is not available in this browser", variant: "danger" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLatInput(lat);
        setLngInput(lng);
        setBookingLocation(Number(lat), Number(lng));
        toast({ title: "Location detected", variant: "success" });
      },
      () => toast({ title: "Could not detect location", variant: "danger" })
    );
  };

  const fetchNearbyWorkers = async () => {
    if (!selectedService) return;
    const lat = Number(latInput) || DEFAULT_LOCATION.lat;
    const lng = Number(lngInput) || DEFAULT_LOCATION.lng;
    if (!bookingAddress.trim()) {
      setBookingAddress("Connaught Place, New Delhi");
    }

    setBookingLocation(lat, lng);
    setWorkersLoading(true);
    setSelectedWorker(null);
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(selectedService.coop?.radiusKm ?? 15),
        skills: [selectedService.categorySlug, selectedService.categoryName].join(","),
        coopId: selectedService.coopId,
      });
      const res = await apiGet<ApiResponse<NearbyWorker[]>>(`/bookings/nearby-workers?${params.toString()}`);
      setNearbyWorkers((res.data || []).map(toWorkerProfile));
      setStep(3);
    } catch (error) {
      toast({ title: parseError(error, "Failed to load nearby workers"), variant: "danger" });
    } finally {
      setWorkersLoading(false);
    }
  };

  const createBooking = async (): Promise<Booking> => {
    if (!selectedService) throw new Error("Select a service first");
    const lat = Number(latInput) || DEFAULT_LOCATION.lat;
    const lng = Number(lngInput) || DEFAULT_LOCATION.lng;
    const res = await apiPost<ApiResponse<Booking>>("/bookings", {
      serviceId: selectedService.id,
      workerId: selectedWorker?.id,
      address: bookingAddress.trim() || "Connaught Place, New Delhi",
      description: bookingDescription || undefined,
      latitude: lat,
      longitude: lng,
    });
    if (!res.success || !res.data) {
      throw new Error(res.error || "Booking could not be created");
    }
    return res.data;
  };

  const confirmMockPayment = async (booking: Booking, order: RazorpayOrder) => {
    const paymentId = `pay_mock_${Date.now()}`;
    const res = await apiPost<ApiResponse>("/payments/verify", {
      orderId: order.id,
      paymentId,
      signature: "mock_signature",
      bookingId: booking.id,
    });
    if (!res.success) throw new Error(res.error || "Mock payment verification failed");
    toast({ title: "Booking confirmed and payment successful", variant: "success" });
    clearBooking();
    router.push(`/consumer/bookings/${booking.id}`);
  };

  const handlePay = async () => {
    if (!selectedService || !bookingAddress.trim()) return;
    setPaying(true);
    try {
      const booking = await createBooking();

      const paymentInit = await apiPost<ApiResponse>("/payments/initiate", { bookingId: booking.id });
      if (!paymentInit.success) throw new Error(paymentInit.error || "Payment could not be initiated");

      const orderRes = await apiPost<ApiResponse<RazorpayOrder>>("/payments/create-order", { bookingId: booking.id });
      if (!orderRes.success || !orderRes.data) throw new Error(orderRes.error || "Razorpay order could not be created");

      const keyRes = await apiGet<ApiResponse<{ keyId: string; mock?: boolean }>>("/payments/key");
      if (!keyRes.success || !keyRes.data) throw new Error(keyRes.error || "Razorpay key is not configured");

      if (keyRes.data.mock || orderRes.data.mock) {
        await confirmMockPayment(booking, orderRes.data);
        return;
      }

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        throw new Error("Razorpay checkout failed to load");
      }

      const options = {
        key: keyRes.data.keyId,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Shramik Co",
        description: `Payment for ${selectedService.name}`,
        order_id: orderRes.data.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await apiPost<ApiResponse>("/payments/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              bookingId: booking.id,
            });
            if (!verifyRes.success) throw new Error(verifyRes.error || "Payment verification failed");
            toast({ title: "Booking confirmed and payment successful", variant: "success" });
            clearBooking();
            router.push(`/consumer/bookings/${booking.id}`);
          } catch (error) {
            toast({ title: parseError(error, "Payment verification failed"), variant: "danger" });
          } finally {
            setPaying(false);
          }
        },
        prefill: { name: "", contact: "" },
        theme: { color: "#ea580c" },
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", () => {
        setPaying(false);
        toast({ title: "Payment failed. Please try again.", variant: "danger" });
      });
      checkout.open();
    } catch (error) {
      setPaying(false);
      toast({ title: parseError(error, "Something went wrong"), variant: "danger" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-heading">Book a Service</h1>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex shrink-0 items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold", i + 1 <= step ? "bg-orange-500 text-white shadow-xs" : "bg-gray-200 text-gray-500")}>
              {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm font-medium", i + 1 <= step ? "text-gray-900 font-bold" : "text-gray-400")}>{s}</span>
            {i < steps.length - 1 && <div className="h-0.5 w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="animate-slide-up space-y-4">
          {/* AI Voice Job Creation Banner */}
          <div className="rounded-2xl border-2 border-dashed border-orange-300 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20">
                  <Mic className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 font-heading">Describe Problem with AI Voice</h3>
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-900 border border-orange-200">
                      AI Powered · Trilingual
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Speak or type in <strong className="text-orange-700">English, Hindi, or Marathi</strong> — our voice engine extracts the trade, estimates fair price, and matches verified nearby workers!
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setShowVoiceModal(true)}
                className="shrink-0 shadow-md"
              >
                <Sparkles className="mr-2 h-4 w-4" /> Start AI Voice Job
              </Button>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">Or Choose a Service Manually</h2>
          {servicesLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
          ) : services.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={selectedService?.id === service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep(2);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">
              No active services are available right now.
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="max-w-2xl space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900">Enter Location & Details</h2>
          <Input label="Address" placeholder="Enter your service address" value={bookingAddress} onChange={(e) => setBookingAddress(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={bookingDescription}
              onChange={(e) => setBookingDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Latitude" type="number" step="any" value={latInput} onChange={(e) => setLatInput(e.target.value)} />
            <Input label="Longitude" type="number" step="any" value={lngInput} onChange={(e) => setLngInput(e.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={detectLocation}>
            <MapPin className="mr-2 h-4 w-4" /> Use Current Location
          </Button>
          <OpenStreetMap
            lat={Number(latInput) || DEFAULT_LOCATION.lat}
            lng={Number(lngInput) || DEFAULT_LOCATION.lng}
            zoom={14}
            className="h-64 rounded-xl border"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={fetchNearbyWorkers} disabled={!bookingAddress.trim() || workersLoading} loading={workersLoading}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900">Nearby Skilled Workers</h2>
          {workersLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-orange-600" /></div>
          ) : nearbyWorkers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {nearbyWorkers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  distance={worker.distanceKm}
                  onBook={() => {
                    setSelectedWorker(worker);
                    setStep(4);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
              <p className="mt-3 font-medium text-gray-900">No approved on-duty worker found nearby</p>
              <p className="mt-1 text-sm text-gray-500">You can still create the booking and the co-op can assign a worker later.</p>
              <Button className="mt-4" onClick={() => setStep(4)}>Continue Without Worker</Button>
            </div>
          )}
          <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-lg space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Booking</h2>
          <Card>
            <CardHeader><CardTitle className="text-base">Booking Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Service</span><span className="font-medium">{selectedService?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Worker</span><span className="font-medium">{selectedWorker?.user?.name || "Co-op will assign"}</span></div>
              {selectedWorker?.matchScore != null && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Worker Match</span><span className="font-medium">{selectedWorker.matchScore}%</span></div>
              )}
              <div className="flex justify-between text-sm"><span className="text-gray-500">Address</span><span className="max-w-[60%] text-right font-medium">{bookingAddress}</span></div>
              <div className="border-t pt-3">
                <div className="flex justify-between"><span className="text-gray-500">Service Price</span><span className="font-medium">{formatCurrency(selectedService?.basePrice || 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Max Commission</span><span className="text-gray-400">{formatCurrency(commissionAmount)}</span></div>
                <div className="mt-2 flex justify-between text-lg font-bold"><span>Total</span><span className="text-indigo-600">{formatCurrency(selectedService?.basePrice || 0)}</span></div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)} disabled={paying}>Back</Button>
            <Button className="flex-1" onClick={handlePay} disabled={paying || !selectedService || !bookingAddress.trim()} loading={paying}>
              {`Confirm & Pay ${formatCurrency(selectedService?.basePrice || 0)}`}
            </Button>
          </div>
        </div>
      )}

      <VoiceJobModal
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onConfirmJob={handleVoiceJobConfirm}
      />
    </div>
  );
}
