import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { OrderService } from "../services/order.service";

const router = Router();

// All order operations require authenticated session
router.use(authenticate);

/**
 * POST /api/v1/orders
 * Consumer confirms order and dispatches request to selected technician.
 */
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const order = await OrderService.createOrder(req.user!.id, req.body);
    res.status(201).json({
      success: true,
      data: order,
      message: "Order request created and dispatched to cooperative technician.",
    });
  })
);

/**
 * GET /api/v1/orders/consumer
 * Consumer lists all their orders.
 */
router.get(
  "/consumer",
  asyncHandler(async (req: Request, res: Response) => {
    const orders = await OrderService.getConsumerOrders(req.user!.id);
    res.status(200).json({
      success: true,
      data: orders,
    });
  })
);

/**
 * GET /api/v1/orders/consumer/active
 * Consumer retrieves their current active service order.
 */
router.get(
  "/consumer/active",
  asyncHandler(async (req: Request, res: Response) => {
    const activeOrder = await OrderService.getActiveConsumerOrder(req.user!.id);
    res.status(200).json({
      success: true,
      data: activeOrder,
    });
  })
);

/**
 * GET /api/v1/orders/worker/requests
 * Worker retrieves incoming order requests with strict location privacy masking.
 */
router.get(
  "/worker/requests",
  asyncHandler(async (req: Request, res: Response) => {
    const requests = await OrderService.getWorkerIncomingRequests(req.user!.id);
    res.status(200).json({
      success: true,
      data: requests,
    });
  })
);

/**
 * GET /api/v1/orders/:id
 * Retrieve details for a single order with role-aware privacy enforcement.
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const order = await OrderService.getOrderById(
      req.params.id,
      req.user!.id,
      req.user!.role
    );
    res.status(200).json({
      success: true,
      data: order,
    });
  })
);

/**
 * POST /api/v1/orders/:id/accept
 * Worker accepts the order request. Releasing full service address.
 */
router.post(
  "/:id/accept",
  asyncHandler(async (req: Request, res: Response) => {
    const acceptedOrder = await OrderService.acceptOrder(
      req.params.id,
      req.user!.id
    );
    res.status(200).json({
      success: true,
      data: acceptedOrder,
      message: "Order accepted successfully.",
    });
  })
);

/**
 * POST /api/v1/orders/:id/reject
 * Worker declines/rejects the order request with mandatory structured reason.
 */
router.post(
  "/:id/reject",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await OrderService.rejectOrder(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.status(200).json({
      success: true,
      data: result,
      message: "Order declined.",
    });
  })
);

/**
 * POST /api/v1/orders/:id/reassign
 * Consumer selects another technician after previous technician declined.
 */
router.post(
  "/:id/reassign",
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await OrderService.reassignWorker(
      req.params.id,
      req.user!.id,
      req.body.workerId
    );
    res.status(200).json({
      success: true,
      data: updated,
      message: "Order successfully reassigned to new technician.",
    });
  })
);

/**
 * POST /api/v1/orders/:id/propose-price
 * Propose price with ceiling enforcement and proposal history logging.
 */
router.post(
  "/:id/propose-price",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await OrderService.proposePrice(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.status(200).json(result);
  })
);

/**
 * POST /api/v1/orders/:id/respond-proposal
 * Accept, reject, or counter a price proposal.
 */
router.post(
  "/:id/respond-proposal",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await OrderService.respondToPriceProposal(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.status(200).json(result);
  })
);

/**
 * GET /api/v1/orders/:id/price-history
 * Retrieve price negotiation history timeline.
 */
router.get(
  "/:id/price-history",
  asyncHandler(async (req: Request, res: Response) => {
    const history = await OrderService.getPriceHistory(
      req.params.id,
      req.user!.id
    );
    res.status(200).json({
      success: true,
      data: history,
    });
  })
);

/**
 * PATCH /api/v1/orders/:id/operational-state
 * Advance active operational state: TRAVELLING, ARRIVED, WORKING, COMPLETED.
 */
router.patch(
  "/:id/operational-state",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await OrderService.updateOperationalState(
      req.params.id,
      req.user!.id,
      req.body.operationalState
    );
    res.status(200).json(result);
  })
);

import { CallService } from "../services/call.service";

/**
 * GET /api/v1/orders/:id/communication-consent
 * Check communication consent and calling authorization for this order
 */
router.get(
  "/:id/communication-consent",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await CallService.getCommunicationConsent(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data });
  })
);

/**
 * POST /api/v1/orders/:id/communication-consent/request
 * Grant or request communication consent for this order
 */
router.post(
  "/:id/communication-consent/request",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await CallService.requestConsent(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data });
  })
);

/**
 * POST /api/v1/orders/:id/communication-consent/revoke
 * Revoke communication consent for this order
 */
router.post(
  "/:id/communication-consent/revoke",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await CallService.revokeConsent(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data });
  })
);

/**
 * POST /api/v1/orders/:id/rate
 * Rate and review a settled order and technician
 */
router.post(
  "/:id/rate",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await OrderService.rateOrder(
      req.params.id,
      req.user!.id,
      Number(req.body.rating),
      req.body.comment
    );
    res.status(200).json(result);
  })
);

import trackingRoutes from "./tracking.routes";
import orderPaymentRoutes from "./order-payment.routes";

router.use("/:id/payment", orderPaymentRoutes);
router.use("/:id", trackingRoutes);

export default router;
