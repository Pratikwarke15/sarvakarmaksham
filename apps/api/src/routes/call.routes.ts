import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { CallService } from "../services/call.service";

const router = Router();

router.use(authenticate);

/**
 * GET /api/v1/calls/orders/:orderId/consent
 * Check communication consent and calling authorization for an order
 */
router.get(
  "/orders/:orderId/consent",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await CallService.getCommunicationConsent(req.params.orderId, req.user!.id);
    res.json({ success: true, data });
  })
);

/**
 * POST /api/v1/calls/orders/:orderId/consent/request
 * Request or grant communication consent
 */
router.post(
  "/orders/:orderId/consent/request",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await CallService.requestConsent(req.params.orderId, req.user!.id);
    res.json({ success: true, data });
  })
);

/**
 * POST /api/v1/calls/orders/:orderId/consent/revoke
 * Revoke communication consent
 */
router.post(
  "/orders/:orderId/consent/revoke",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await CallService.revokeConsent(req.params.orderId, req.user!.id);
    res.json({ success: true, data });
  })
);

/**
 * GET /api/v1/calls/orders/:orderId/history
 * Retrieve call session history (metadata only)
 */
router.get(
  "/orders/:orderId/history",
  asyncHandler(async (req: Request, res: Response) => {
    const data = await CallService.getOrderCalls(req.params.orderId, req.user!.id);
    res.json({ success: true, data });
  })
);

/**
 * POST /api/v1/calls/orders/:orderId/session
 * Initialize a call session audit record
 */
router.post(
  "/orders/:orderId/session",
  asyncHandler(async (req: Request, res: Response) => {
    const { receiverId, callerRole } = req.body;
    const session = await CallService.createCallSession(
      req.params.orderId,
      req.user!.id,
      receiverId,
      callerRole
    );
    res.status(201).json({ success: true, data: session });
  })
);

/**
 * PATCH /api/v1/calls/sessions/:callId
 * Update call session status / duration
 */
router.patch(
  "/sessions/:callId",
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await CallService.updateCallSession(req.params.callId, req.body);
    res.json({ success: true, data: updated });
  })
);

export default router;
