import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { OrderPaymentService } from "../services/order-payment.service";

const router = Router({ mergeParams: true });

/**
 * POST /api/v1/orders/:id/payment/create-order
 * Create or retrieve Razorpay payment order for post-completion payment.
 */
router.post(
  "/create-order",
  authenticate,
  authorize("CONSUMER"),
  asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const result = await OrderPaymentService.createPaymentOrder(orderId, req.user!.id);
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * POST /api/v1/orders/:id/payment/verify
 * Backend authoritative verification and atomic settlement.
 */
router.post(
  "/verify",
  authenticate,
  authorize("CONSUMER"),
  asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, isTestPayment } = req.body;
    const result = await OrderPaymentService.confirmPayment(orderId, req.user!.id, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      isTestPayment: Boolean(isTestPayment),
    });
    res.status(200).json({ success: true, data: result, message: "Payment successfully confirmed" });
  })
);

/**
 * POST /api/v1/orders/:id/payment/fail
 * Record payment failure / cancellation and enable retry.
 */
router.post(
  "/fail",
  authenticate,
  authorize("CONSUMER"),
  asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const { reason } = req.body;
    const result = await OrderPaymentService.recordPaymentFailure(orderId, req.user!.id, reason);
    res.status(200).json({ success: true, data: result });
  })
);

/**
 * GET /api/v1/orders/:id/payment/receipt
 * Authoritative receipt for consumer and worker.
 */
router.get(
  "/receipt",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.id;
    const result = await OrderPaymentService.getPaymentReceipt(orderId, req.user!.id);
    res.status(200).json({ success: true, data: result });
  })
);

export default router;
