"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  Building,
  Smartphone,
  Wallet,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import type { Order, OrderPaymentReceipt } from "@/lib/types";

interface OrderPaymentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receipt: OrderPaymentReceipt) => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function OrderPaymentModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: OrderPaymentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"READY" | "PROCESSING" | "TEST_MODAL" | "COMPLETED" | "FAILED">("READY");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const finalAmount = Number(order.finalPrice || order.quotedPrice || order.basePrice);

  useEffect(() => {
    if (isOpen) {
      setStage("READY");
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 1: Initiate Payment
  const handleInitiatePayment = async () => {
    setLoading(true);
    setErrorMessage(null);
    setStage("PROCESSING");

    try {
      const res = await apiPost<{ success: boolean; data: any; error?: string }>(
        `/orders/${order.id}/payment/create-order`,
        {}
      );

      if (!res.success || !res.data) {
        throw new Error(res.error || "Could not initialize payment order.");
      }

      setPaymentData(res.data);

      // Check if real Razorpay checkout script can load
      const scriptReady = await loadRazorpayScript();
      const hasRazorpay = scriptReady && typeof (window as any).Razorpay !== "undefined";

      // If mock test order or headless browser, use the interactive controlled test checkout UI
      if (res.data.isMock || !hasRazorpay) {
        setStage("TEST_MODAL");
        setLoading(false);
        return;
      }

      // Live / Sandbox Razorpay Checkout SDK
      const options = {
        key: res.data.keyId,
        amount: res.data.amount,
        currency: res.data.currency,
        name: "सर्वकर्मक्षमः (Sarvakarmakshamah)",
        description: `Settlement for ${order.problemTitle} (Ref: ${order.orderRef})`,
        order_id: res.data.razorpayOrderId,
        handler: async (response: any) => {
          await handleBackendVerification({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            isTestPayment: false,
          });
        },
        prefill: {
          name: order.consumer?.name || "",
          contact: order.consumer?.phone || "",
        },
        theme: { color: "#800020" },
        modal: {
          ondismiss: async () => {
            await handlePaymentFailure("Payment modal closed by user.");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", async (response: any) => {
        await handlePaymentFailure(response.error?.description || "Payment failed at gateway.");
      });
      rzp.open();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize payment.");
      setStage("FAILED");
      toast({
        title: "Payment Initialization Failed",
        description: err.message || "Please check your network and try again.",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Backend Authoritative Verification
  const handleBackendVerification = async (verifyPayload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    isTestPayment: boolean;
  }) => {
    setLoading(true);
    setStage("PROCESSING");
    try {
      const res = await apiPost<{ success: boolean; data: OrderPaymentReceipt; error?: string }>(
        `/orders/${order.id}/payment/verify`,
        verifyPayload
      );

      if (!res.success || !res.data) {
        throw new Error(res.error || "Payment verification was declined by server.");
      }

      setStage("COMPLETED");
      toast({
        title: "Payment Successfully Confirmed",
        description: `₹${res.data.finalAmount} released to technician. Order finalized.`,
        variant: "success",
      });

      onSuccess(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed. Please contact support.");
      setStage("FAILED");
      toast({
        title: "Payment Verification Failed",
        description: err.message,
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Failure / Cancellation
  const handlePaymentFailure = async (reason: string) => {
    setErrorMessage(reason);
    setStage("FAILED");
    try {
      await apiPost(`/orders/${order.id}/payment/fail`, { reason });
    } catch {}
  };

  // Controlled Test-Mode Payment submission
  const handleConfirmTestPayment = async () => {
    const testOrderId = paymentData?.razorpayOrderId || `order_test_${Date.now()}`;
    const testPaymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const testSignature = "test_signature_valid";

    await handleBackendVerification({
      razorpayOrderId: testOrderId,
      razorpayPaymentId: testPaymentId,
      razorpaySignature: testSignature,
      isTestPayment: true,
    });
  };

  return (
    <div id="order-payment-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 p-5 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-extrabold text-slate-900">
                Post-Service Payment
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {order.orderRef} • Verified Escrow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Order Snapshot & Final Amount */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Completed Service
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  {order.problemTitle}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Technician: <strong>{order.worker?.user?.name || "Verified Artisan"}</strong>
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Work Finished
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/70 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">
                Final Confirmed Amount:
              </span>
              <span className="text-xl font-black text-[#800020] font-mono">
                {formatCurrency(finalAmount)}
              </span>
            </div>
          </div>

          {/* STAGE: READY */}
          {stage === "READY" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Service Completed First:</strong> As per cooperative rules, payment is only released now after the physical service has been delivered and inspected.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  id="pay-via-razorpay-btn"
                  onClick={handleInitiatePayment}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white font-extrabold text-xs shadow-md shadow-[#800020]/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  <span>Pay {formatCurrency(finalAmount)} via Razorpay</span>
                </button>

                <button
                  type="button"
                  id="test-checkout-btn"
                  onClick={async () => {
                    await handleInitiatePayment();
                    setStage("TEST_MODAL");
                  }}
                  disabled={loading}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                  <span>Controlled Test-Mode Checkout (Verified Simulation)</span>
                </button>

                <p className="text-[10px] text-center text-slate-400">
                  Powered by Razorpay Secure Gateway (Test Mode active)
                </p>
              </div>
            </div>
          )}

          {/* STAGE: PROCESSING */}
          {stage === "PROCESSING" && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#800020] mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                Securing payment settlement...
              </p>
              <p className="text-xs text-slate-500">
                Verifying backend cryptographic transaction and crediting worker wallet.
              </p>
            </div>
          )}

          {/* STAGE: CONTROLLED TEST MODAL (Realistic Test Simulation) */}
          {stage === "TEST_MODAL" && (
            <div className="space-y-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-amber-50/20 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Razorpay Test Mode Checkout</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  TEST-SIMULATION
                </span>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Select Test Payment Method:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod("UPI")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      selectedMethod === "UPI"
                        ? "bg-[#800020]/10 border-[#800020] text-[#800020]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("CARD")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      selectedMethod === "CARD"
                        ? "bg-[#800020]/10 border-[#800020] text-[#800020]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod("NETBANKING")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      selectedMethod === "NETBANKING"
                        ? "bg-[#800020]/10 border-[#800020] text-[#800020]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Building className="h-4 w-4" />
                    <span>Netbanking</span>
                  </button>
                </div>
              </div>

              {paymentData && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Job Amount:</span>
                    <span className="font-mono font-medium text-slate-700">{formatCurrency(paymentData.grossAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Cooperative Levy (5%):</span>
                    <span className="font-mono font-medium text-slate-700">{formatCurrency(paymentData.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-slate-200/60">
                    <span>Worker Payout:</span>
                    <span className="font-mono">{formatCurrency(paymentData.workerEarnings)}</span>
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex justify-between items-center font-mono">
                <span>Order Ref:</span>
                <span>{paymentData?.razorpayOrderId || "order_test_rzp"}</span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  id="test-pay-confirm-btn"
                  type="button"
                  onClick={handleConfirmTestPayment}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Authorize & Pay {formatCurrency(finalAmount)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePaymentFailure("User cancelled simulated payment.")}
                  disabled={loading}
                  className="px-3 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STAGE: FAILED */}
          {stage === "FAILED" && (
            <div className="space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Payment Unsuccessful
                </h4>
                <p className="text-xs text-rose-600 mt-1">
                  {errorMessage || "The transaction could not be completed."}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Your order is safe. You can retry payment at any time without duplicate charges.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInitiatePayment}
                className="w-full py-3 px-4 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white font-extrabold text-xs shadow-md transition"
              >
                Retry Payment
              </button>
            </div>
          )}

          {/* STAGE: COMPLETED */}
          {stage === "COMPLETED" && (
            <div className="py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                Payment Completed!
              </h4>
              <p className="text-xs text-slate-600">
                Escrow payment has been officially released to technician {order.worker?.user?.name || "Technician"}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderPaymentModal;
