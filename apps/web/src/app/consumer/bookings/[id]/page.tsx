"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { BookingTracker } from "@/components/booking/BookingTracker";
import { Rating } from "@/components/ui/rating";
import { OpenStreetMap } from "@/components/maps/OpenStreetMap";
import { MapPlaceholder } from "@/components/ui/map-placeholder";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";
import type { ApiResponse, Booking, BookingStatus } from "@/lib/types";

function parseError(error: unknown, fallback: string): string {
  const msg = (error as any)?.response?.data?.error || (error as any)?.message;
  return typeof msg === "string" && msg ? msg : fallback;
}

interface RazorpayOrder { id: string; amount: number; currency: string; mock?: boolean }

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const fetchBooking = useCallback(async () => {
    try {
      const res = await apiGet<ApiResponse<Booking>>(`/bookings/${params.id}`);
      if (res.success && res.data) setBooking(res.data);
      else toast({ title: res.error || "Booking not found", variant: "danger" });
    } catch {
      toast({ title: "Failed to load booking", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [params.id, toast]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const res = await apiPost<ApiResponse>(`/bookings/${booking.id}/cancel`, { reason: "Cancelled by consumer" });
      if (res.success) { toast({ title: "Booking cancelled", variant: "success" }); fetchBooking(); }
      else toast({ title: res.error || "Could not cancel", variant: "danger" });
    } catch { toast({ title: "Could not cancel booking", variant: "danger" }); }
    finally { setCancelling(false); }
  };

  const handlePay = async () => {
    if (!booking) return;
    setPaying(true);
    try {
      const paymentInit = await apiPost<ApiResponse>("/payments/initiate", { bookingId: booking.id });
      if (!paymentInit.success) throw new Error(paymentInit.error || "Payment could not be initiated");
      const orderRes = await apiPost<ApiResponse<RazorpayOrder>>("/payments/create-order", { bookingId: booking.id });
      if (!orderRes.success || !orderRes.data) throw new Error(orderRes.error || "Razorpay order could not be created");
      const keyRes = await apiGet<ApiResponse<{ keyId: string; mock?: boolean }>>("/payments/key");
      if (!keyRes.success || !keyRes.data) throw new Error(keyRes.error || "Razorpay key is not configured");

      if (keyRes.data.mock || orderRes.data.mock) {
        const res = await apiPost<ApiResponse>("/payments/verify", {
          orderId: orderRes.data.id, paymentId: `pay_mock_${Date.now()}`, signature: "mock_signature", bookingId: booking.id,
        });
        if (!res.success) throw new Error(res.error || "Mock payment verification failed");
        toast({ title: "Booking confirmed and payment successful", variant: "success" });
        fetchBooking();
        return;
      }

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !(window as any).Razorpay) throw new Error("Razorpay checkout failed to load");

      const options = {
        key: keyRes.data.keyId,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Shramik Co",
        description: `Payment for ${booking.service?.name || "service"}`,
        order_id: orderRes.data.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await apiPost<ApiResponse>("/payments/verify", {
              orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature, bookingId: booking.id,
            });
            if (!verifyRes.success) throw new Error(verifyRes.error || "Payment verification failed");
            toast({ title: "Booking confirmed and payment successful", variant: "success" });
            fetchBooking();
          } catch (error) { toast({ title: parseError(error, "Payment verification failed"), variant: "danger" }); }
          finally { setPaying(false); }
        },
        prefill: { name: "", contact: "" },
        theme: { color: "#4f46e5" },
      };
      const checkout = new (window as any).Razorpay(options);
      checkout.on("payment.failed", () => { setPaying(false); toast({ title: "Payment failed. Please try again.", variant: "danger" }); });
      checkout.open();
    } catch (error) {
      setPaying(false);
      toast({ title: parseError(error, "Something went wrong"), variant: "danger" });
    }
  };

  const handleSubmitReview = async () => {
    if (!booking) return;
    if (!reviewRating) { toast({ title: "Please select a rating", variant: "danger" }); return; }
    setSubmittingReview(true);
    try {
      const res = await apiPost<ApiResponse>(`/bookings/${booking.id}/rate`, { rating: reviewRating, comment: reviewText });
      if (res.success) { toast({ title: "Review submitted", variant: "success" }); fetchBooking(); }
      else toast({ title: res.error || "Could not submit review", variant: "danger" });
    } catch { toast({ title: "Could not submit review", variant: "danger" }); }
    finally { setSubmittingReview(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!booking) return <div className="py-24 text-center text-gray-500">Booking not found</div>;

  const needsPayment = booking.paymentStatus === "PENDING" || booking.paymentStatus === "FAILED";
  const canReview = booking.status === "COMPLETED" && !booking.rating;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Booking {booking.bookingRef}</h1>
          <p className="text-sm text-gray-500">{formatDateTime(booking.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(booking.status)}>{booking.status.replace("_", " ")}</Badge>
          <Badge className={getStatusColor(booking.paymentStatus)}>{booking.paymentStatus.replace("_", " ")}</Badge>
        </div>
      </div>

      <BookingTracker status={booking.status as BookingStatus} workerLatitude={booking.worker?.latitude} workerLongitude={booking.worker?.longitude} />

      {booking.worker && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Worker</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                {booking.worker.user.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{booking.worker.user.name}</h4>
                <p className="text-sm text-gray-500">{(booking.worker.skillTags || []).join(", ")}</p>
                <p className="text-xs text-gray-400">★ {booking.worker.avgRating || "—"} · {booking.worker.totalJobs || 0} jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Booking Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Service</span><span>{booking.service?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-right max-w-[60%]">{booking.address}</span></div>
          {booking.description && <div className="flex justify-between"><span className="text-gray-500">Description</span><span className="text-right max-w-[60%]">{booking.description}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-bold">{formatCurrency(booking.quotedPrice)}</span></div>
          {booking.commissionRate != null && <div className="flex justify-between"><span className="text-gray-500">Commission ({booking.commissionRate}%)</span><span>{formatCurrency(booking.commissionAmount || 0)}</span></div>}
        </CardContent>
      </Card>

      {(booking.latitude != null || booking.worker?.latitude != null) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Live Worker Route & Location</h3>
            <span className="text-xs text-emerald-600 font-semibold">Live GPS Navigation</span>
          </div>
          <OpenStreetMap
            lat={booking.worker?.latitude ?? booking.latitude ?? 28.6139}
            lng={booking.worker?.longitude ?? booking.longitude ?? 77.209}
            workerLat={booking.worker?.latitude}
            workerLng={booking.worker?.longitude}
            consumerLat={booking.latitude}
            consumerLng={booking.longitude}
            showRoute={!!(booking.worker?.latitude && booking.latitude)}
            zoom={13}
            className="h-72 rounded-xl border shadow-sm"
          />
        </div>
      )}

      {needsPayment && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handlePay} loading={paying}>Pay {formatCurrency(booking.quotedPrice)}</Button>
          </CardContent>
        </Card>
      )}

      {canReview && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rate Your Experience</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Rating value={reviewRating} onChange={setReviewRating} size="lg" />
            <textarea
              placeholder="Share your feedback..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
            <Button size="sm" onClick={handleSubmitReview} loading={submittingReview}>Submit Review</Button>
          </CardContent>
        </Card>
      )}

      {["PENDING", "ACCEPTED"].includes(booking.status) && (
        <Button variant="danger" onClick={handleCancel} loading={cancelling}>Cancel Booking</Button>
      )}

      <Button variant="ghost" size="sm" onClick={() => router.push("/consumer/bookings")}>← Back to bookings</Button>
    </div>
  );
}
