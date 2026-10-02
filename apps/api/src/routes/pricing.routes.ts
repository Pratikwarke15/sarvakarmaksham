import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { PricingService } from "../services/pricing.service";

const router = Router();

/**
 * GET /api/v1/pricing/estimate/:problemId
 * Returns official price estimation breakdown for a problem
 */
router.get(
  "/estimate/:problemId",
  asyncHandler(async (req, res) => {
    const { problemId } = req.params;
    const { city, skillLevel } = req.query as { city?: string; skillLevel?: string };

    const estimate = await PricingService.getProblemEstimate(problemId, { city, skillLevel });

    res.json({
      success: true,
      data: estimate,
    });
  })
);

/**
 * POST /api/v1/pricing/validate-quote
 * Validates whether a proposed worker quote is within the legal bargaining ceiling.
 */
router.post(
  "/validate-quote",
  asyncHandler(async (req, res) => {
    const { problemId, quotedAmount, labourAmount, materialAmount, hasAdditionalWork, additionalWorkReason } =
      req.body;

    const validation = await PricingService.validateWorkerQuote({
      problemId,
      quotedAmount: Number(quotedAmount),
      labourAmount: labourAmount ? Number(labourAmount) : undefined,
      materialAmount: materialAmount ? Number(materialAmount) : undefined,
      hasAdditionalWork: !!hasAdditionalWork,
      additionalWorkReason,
    });

    res.json({
      success: true,
      message: "Quote is within allowed bargaining ceiling.",
      data: validation,
    });
  })
);

/**
 * GET /api/v1/pricing/benchmarks
 * Returns documented Indian labour rate benchmarks & reference sources
 */
router.get(
  "/benchmarks",
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      data: {
        title: "Indian Service Pricing & Labour Rate Benchmark Framework",
        primarySources: [
          {
            name: "CPWD Delhi Schedule of Rates (DSR) 2023",
            authority: "Central Public Works Department, Government of India",
            scope: "Sanitary, electrical, carpentry, and building fittings labour wage benchmarks",
            skilledDayWageRef: "₹850 – ₹950 per 8-hour shift (~₹110–₹125/hr standard skilled rate)",
          },
          {
            name: "Indian Urban Gig Economy Cooperative Rate Cards",
            authority: "Worker Cooperative Federations (Delhi-NCR, Mumbai, Bengaluru, Pune)",
            scope: "Minor repair minimum job charges, inspection fees, and fair-wage floors",
            standardInspectionFee: "₹99 (waived/adjusted towards total service labour)",
            platformFeeRate: "5% (Cooperative social security and operational maintenance)",
          },
        ],
        pricingPrinciples: [
          "Every service problem is backed by minimum, base, maximum, and ceiling pricing.",
          "Workers may negotiate site complexity only within the predetermined bargaining ceiling.",
          "Quotes exceeding the ceiling are strictly rejected unless explicit additional scope is documented.",
          "Material cost is segregated from labour and clearly labeled as subject to physical inspection.",
        ],
      },
    });
  })
);

/**
 * POST /api/v1/pricing/problem-requests/:id/quotes
 * Submit a worker proposal within the defined ceiling
 */
router.post(
  "/problem-requests/:id/quotes",
  authenticate,
  authorize("WORKER"),
  asyncHandler(async (req, res) => {
    const problemRequestId = req.params.id;
    const workerUserId = req.user!.id;
    const { quotedAmount, labourAmount, materialAmount, notes, hasAdditionalWork, additionalWorkReason } =
      req.body;

    const quote = await PricingService.submitWorkerQuote({
      problemRequestId,
      workerUserId,
      quotedAmount: Number(quotedAmount),
      labourAmount: labourAmount ? Number(labourAmount) : undefined,
      materialAmount: materialAmount ? Number(materialAmount) : undefined,
      notes,
      hasAdditionalWork: !!hasAdditionalWork,
      additionalWorkReason,
    });

    res.status(201).json({
      success: true,
      message: "Quote submitted successfully within allowed price ceiling.",
      data: quote,
    });
  })
);

/**
 * GET /api/v1/pricing/problem-requests/:id/quotes
 * Get all quotes submitted for a problem request
 */
router.get(
  "/problem-requests/:id/quotes",
  authenticate,
  asyncHandler(async (req, res) => {
    const quotes = await PricingService.getProblemQuotes(req.params.id);

    res.json({
      success: true,
      data: quotes,
    });
  })
);

/**
 * GET /api/v1/pricing/problem-requests/:id/workers
 * Get available cooperative workers matching the problem trade for "Worker Selection"
 */
router.get(
  "/problem-requests/:id/workers",
  authenticate,
  asyncHandler(async (req, res) => {
    const workers = await PricingService.getMatchingWorkers(req.params.id);

    res.json({
      success: true,
      data: workers,
    });
  })
);

export default router;
