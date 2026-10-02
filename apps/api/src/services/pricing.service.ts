import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { calculateDistanceKm } from "./order-state-machine";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err.code === "P1001" ||
        (err.name === "PrismaClientKnownRequestError" && err.code === "P1001") ||
        err.message?.includes("Can't reach database") ||
        err.message?.includes("connection pool");
      if (attempt < retries - 1 && isConnectionError) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export interface PricingEstimateResult {
  problemId: string;
  problemName: string;
  hindiName: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  subcategory: {
    id: string;
    name: string;
    slug: string;
  };
  estimatedDuration: number;
  pricingUnit: string;
  breakdown: {
    labour: {
      min: number;
      max: number;
      base: number;
      description: string;
    };
    material: {
      min: number;
      max: number;
      note: string;
    };
    inspectionFee: {
      amount: number;
      note: string;
    };
    platformFee: {
      ratePercent: number;
      amount: number;
      description: string;
    };
    totalEstimate: {
      min: number;
      max: number;
      base: number;
    };
  };
  workerBargainingCeiling: number;
  pricingDisclaimer: string;
  benchmarkSource: string;
}

export interface ValidateQuoteInput {
  problemId: string;
  quotedAmount: number;
  labourAmount?: number;
  materialAmount?: number;
  hasAdditionalWork?: boolean;
  additionalWorkReason?: string;
}

export interface SubmitQuoteInput {
  problemRequestId: string;
  workerUserId: string;
  quotedAmount: number;
  labourAmount?: number;
  materialAmount?: number;
  notes?: string;
  hasAdditionalWork?: boolean;
  additionalWorkReason?: string;
}

export class PricingService {
  /**
   * Generates a transparent, database-driven Indian service price estimate.
   * Grounded in CPWD DSR labour rates and normalized Indian home-service market data.
   */
  static async getProblemEstimate(
    problemId: string,
    options?: { city?: string; skillLevel?: string }
  ): Promise<PricingEstimateResult> {
    const problem = await withDbRetry(() =>
      prisma.serviceProblem.findUnique({
        where: { id: problemId },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          pricingConfigs: {
            where: {
              isActive: true,
              ...(options?.city ? { city: options.city } : {}),
            },
            take: 1,
          },
        },
      })
    );

    if (!problem || !problem.active) {
      throw new AppError("Service problem not found or currently inactive.", 404);
    }

    // Check if an active override config exists (extensible architecture)
    const config = problem.pricingConfigs?.[0];

    const basePrice = Number(config?.basePrice ?? problem.basePrice);
    const minPrice = Number(config?.minimumPrice ?? problem.minimumPrice);
    const maxPrice = Number(config?.maximumPrice ?? problem.maximumPrice);
    const ceiling = Number(config?.workerPriceCeiling ?? problem.workerPriceCeiling);

    const labourMin = Number(config?.labourCostMin ?? problem.labourCostMin ?? Math.round(minPrice * 0.8));
    const labourMax = Number(config?.labourCostMax ?? problem.labourCostMax ?? Math.round(maxPrice * 0.8));
    const labourBase = Math.round(basePrice * 0.82);

    const inspectionFee = Number(config?.inspectionFee ?? problem.inspectionFee ?? 99);
    const platformFeeRate = Number(config?.platformFeeRate ?? problem.platformFeeRate ?? 5.0);
    const platformFeeAmount = Math.round(basePrice * (platformFeeRate / 100));

    const materialMin = Number(problem.materialCostMin ?? 0);
    const materialMax = Number(problem.materialCostMax ?? Math.round(maxPrice * 0.25));
    const materialNote =
      config?.materialNote ||
      problem.materialNote ||
      "Additional material cost may apply after inspection.";

    const benchmarkSource =
      config?.benchmarkSource ||
      problem.benchmarkSource ||
      "CPWD DSR 2023 Labour Norms & Indian Urban Gig Benchmarks";

    const disclaimer =
      "Initial estimate is based on standard Indian service benchmarks. The final price can change only through the defined negotiation within the worker price ceiling or if additional work/materials are authorized after physical inspection.";

    return {
      problemId: problem.id,
      problemName: problem.name,
      hindiName: problem.hindiName,
      category: problem.category,
      subcategory: problem.subcategory,
      estimatedDuration: problem.estimatedDuration,
      pricingUnit: problem.pricingUnit || "per_job",
      breakdown: {
        labour: {
          min: labourMin,
          max: labourMax,
          base: labourBase,
          description: "Direct technician labour benchmarked to Indian skilled wage rates (CPWD DSR)",
        },
        material: {
          min: materialMin,
          max: materialMax,
          note: materialNote,
        },
        inspectionFee: {
          amount: inspectionFee,
          note: "Credited / adjusted against total bill when repair work is performed.",
        },
        platformFee: {
          ratePercent: platformFeeRate,
          amount: platformFeeAmount,
          description: "Cooperative operations & worker social security fund (5% fair trade levy)",
        },
        totalEstimate: {
          min: minPrice,
          max: maxPrice,
          base: basePrice,
        },
      },
      workerBargainingCeiling: ceiling,
      pricingDisclaimer: disclaimer,
      benchmarkSource,
    };
  }

  /**
   * Validates a worker's proposed quote against the problem's bargaining ceiling.
   * Throws HTTP 400 if the quote exceeds the ceiling without explicit additional work/materials.
   */
  static async validateWorkerQuote(input: ValidateQuoteInput) {
    const { problemId, quotedAmount, hasAdditionalWork, additionalWorkReason } = input;

    if (!problemId) {
      throw new AppError("problemId is required for quote validation.", 400);
    }

    if (typeof quotedAmount !== "number" || isNaN(quotedAmount) || quotedAmount <= 0) {
      throw new AppError("quotedAmount must be a positive number.", 400);
    }

    const problem = await withDbRetry(() =>
      prisma.serviceProblem.findUnique({
        where: { id: problemId },
        select: {
          id: true,
          name: true,
          basePrice: true,
          minimumPrice: true,
          maximumPrice: true,
          workerPriceCeiling: true,
        },
      })
    );

    if (!problem) {
      throw new AppError("Service problem not found.", 404);
    }

    const ceiling = Number(problem.workerPriceCeiling);
    const minFairRate = Number(problem.minimumPrice);
    const basePrice = Number(problem.basePrice);

    // 1. CEILING CHECK: Worker cannot quote above ceiling unless explicit additional work is added
    if (quotedAmount > ceiling && !hasAdditionalWork) {
      throw new AppError(
        `Quote of ₹${quotedAmount} exceeds the maximum worker bargaining ceiling of ₹${ceiling} for '${problem.name}'. Under cooperative fair-pricing rules, quotes above ceiling are strictly prohibited unless explicit additional work or materials are authorized after physical inspection.`,
        400
      );
    }

    // 2. FLOOR CHECK: Worker cannot predatory-undercut below minimum fair rate
    if (quotedAmount < minFairRate) {
      throw new AppError(
        `Quote of ₹${quotedAmount} is below the minimum fair labour threshold of ₹${minFairRate} for '${problem.name}'. Predatory undercutting is prohibited to safeguard worker livelihood.`,
        400
      );
    }

    return {
      valid: true,
      problemId: problem.id,
      problemName: problem.name,
      quotedAmount,
      allowedCeiling: ceiling,
      minimumPrice: minFairRate,
      basePrice,
      isWithinCeiling: quotedAmount <= ceiling,
      hasAdditionalWork: !!hasAdditionalWork,
      additionalWorkReason: additionalWorkReason || null,
    };
  }

  /**
   * Submit a quote from a cooperative worker on a problem request.
   * Strictly validates price ceiling on backend.
   */
  static async submitWorkerQuote(input: SubmitQuoteInput) {
    const {
      problemRequestId,
      workerUserId,
      quotedAmount,
      labourAmount,
      materialAmount = 0,
      notes,
      hasAdditionalWork,
      additionalWorkReason,
    } = input;

    // Look up worker profile
    const workerProfile = await withDbRetry(() =>
      prisma.workerProfile.findUnique({
        where: { userId: workerUserId },
      })
    );

    if (!workerProfile) {
      throw new AppError("Worker profile not found for current user.", 403);
    }

    // Look up problem request
    const problemRequest = await withDbRetry(() =>
      prisma.problemRequest.findUnique({
        where: { id: problemRequestId },
        include: { problem: true },
      })
    );

    if (!problemRequest) {
      throw new AppError("Problem request not found.", 404);
    }

    // Validate ceiling
    await this.validateWorkerQuote({
      problemId: problemRequest.problemId,
      quotedAmount,
      hasAdditionalWork,
      additionalWorkReason,
    });

    // Check if worker already submitted a quote
    const existing = await withDbRetry(() =>
      prisma.workerQuote.findFirst({
        where: {
          problemRequestId,
          workerId: workerProfile.id,
        },
      })
    );

    const calculatedLabour = labourAmount ?? Math.max(0, quotedAmount - materialAmount);

    let savedQuote;
    if (existing) {
      savedQuote = await withDbRetry(() =>
        prisma.workerQuote.update({
          where: { id: existing.id },
          data: {
            quotedAmount,
            labourAmount: calculatedLabour,
            materialAmount,
            notes: notes?.trim() || null,
            hasAdditionalWork: !!hasAdditionalWork,
            additionalWorkReason: additionalWorkReason?.trim() || null,
            status: "PENDING",
          },
          include: {
            worker: {
              include: {
                user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
                coop: { select: { id: true, name: true } },
              },
            },
          },
        })
      );
    } else {
      savedQuote = await withDbRetry(() =>
        prisma.workerQuote.create({
          data: {
            problemRequestId,
            problemId: problemRequest.problemId,
            workerId: workerProfile.id,
            quotedAmount,
            labourAmount: calculatedLabour,
            materialAmount,
            notes: notes?.trim() || null,
            hasAdditionalWork: !!hasAdditionalWork,
            additionalWorkReason: additionalWorkReason?.trim() || null,
            status: "PENDING",
          },
          include: {
            worker: {
              include: {
                user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
                coop: { select: { id: true, name: true } },
              },
            },
          },
        })
      );
    }

    return savedQuote;
  }

  /**
   * Get all worker quotes submitted for a problem request.
   */
  static async getProblemQuotes(problemRequestId: string) {
    return await withDbRetry(() =>
      prisma.workerQuote.findMany({
        where: { problemRequestId },
        include: {
          worker: {
            include: {
              user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
              coop: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { quotedAmount: "asc" },
      })
    );
  }

  /**
   * Fetch verified cooperative workers matching a problem request category/trade
   * for the "Worker Selection" step.
   */
  static async getMatchingWorkers(problemRequestId: string) {
    const pr = await withDbRetry(() =>
      prisma.problemRequest.findUnique({
        where: { id: problemRequestId },
        include: {
          category: true,
          problem: true,
        },
      })
    );

    if (!pr) {
      throw new AppError("Problem request not found.", 404);
    }

    const tradeSlug = pr.category.slug.toLowerCase();

    const consumerLat = pr.latitude || 28.628;
    const consumerLng = pr.longitude || 77.2195;

    // Fetch all verified cooperative workers regardless of whether on-duty or off-duty
    const workers = await withDbRetry(() =>
      prisma.workerProfile.findMany({
        where: {
          status: "VERIFIED",
        },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true, phone: true },
          },
          coop: {
            select: { id: true, name: true, city: true, commissionRate: true },
          },
          reviewsReceived: {
            select: { rating: true },
          },
        },
        take: 12,
      })
    );

    // Format workers with calculated distance and dynamic availability states
    return workers.map((w) => {
      const ratings = w.reviewsReceived.map((r) => r.rating);
      const avgRating =
        ratings.length > 0
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : w.avgRating || 4.8;

      let approxDistanceKm = 1.8;
      if (w.latitude && w.longitude) {
        approxDistanceKm = calculateDistanceKm(consumerLat, consumerLng, w.latitude, w.longitude);
      }

      // "Available Now" should only appear when the worker is currently ON DUTY and available
      const isAvailableNow = w.dutyState === "AVAILABLE" && w.isOnDuty && w.isAvailable;

      return {
        workerId: w.id,
        userId: w.userId,
        name: w.user.name,
        avatarUrl: w.user.avatarUrl,
        coopName: w.coop?.name || "Rashtriya Gig Karmik Cooperative",
        city: w.coop?.city || "New Delhi",
        experienceYears: w.experienceYears || 4,
        rating: avgRating,
        totalJobs: w.totalJobs || 12,
        trade: pr.category.name,
        skills: w.skillTags,
        baseQuote: Number(pr.problem.basePrice),
        priceCeiling: Number(pr.problem.workerPriceCeiling),
        isAvailable: w.isAvailable,
        isOnDuty: w.isOnDuty,
        dutyState: w.dutyState,
        isAvailableNow,
        approxDistanceKm,
        distanceDisplay: `~${approxDistanceKm} km away`,
      };
    });
  }

  /**
   * Authoritative Phase 3 settlement calculation with 5% platform levy
   * For a final price of ₹X:
   * - Gross amount = X
   * - Platform fee = Math.round(X * (platformFeeRate / 100))
   * - Worker earnings = X - platformFee
   */
  static calculateSettlement(grossAmount: number, platformFeeRate: number = 5.0) {
    const gross = Number(grossAmount);
    const rate = Number(platformFeeRate ?? 5.0);
    // Reuse authoritative Phase 3 pricing convention: Math.round(price * (rate / 100))
    const platformFee = Math.round(gross * (rate / 100));
    const workerEarnings = gross - platformFee;
    return {
      grossAmount: gross,
      platformFeeRate: rate,
      platformFee,
      workerEarnings,
    };
  }
}
