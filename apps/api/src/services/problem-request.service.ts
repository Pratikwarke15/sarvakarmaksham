import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import crypto from "crypto";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err.code === "P1001" ||
        err.name === "PrismaClientKnownRequestError" && err.code === "P1001" ||
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

export interface CreateProblemDraftInput {
  categoryId: string;
  subcategoryId: string;
  problemId: string;
  textDescription?: string;
  audioUrl?: string;
  audioDuration?: number;
  photos?: string[];
  videoUrl?: string;
  additionalNotes?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export class ProblemRequestService {
  /**
   * Generates a readable reference like PR-2610-ABCD
   */
  private static generateReference(): string {
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    return `PR-${datePrefix}-${randomHex}`;
  }

  /**
   * Create an Order Draft / Problem Request
   * Validates that at least Text OR Audio explanation is provided.
   */
  static async createDraft(consumerId: string, input: CreateProblemDraftInput) {
    const {
      categoryId,
      subcategoryId,
      problemId,
      textDescription,
      audioUrl,
      audioDuration,
      photos = [],
      videoUrl,
      additionalNotes,
      address,
      latitude,
      longitude,
    } = input;

    // 1. Mandatory validation: Text OR Audio must be provided
    const trimmedText = textDescription?.trim();
    const hasText = !!trimmedText && trimmedText.length > 0;
    const hasAudio = !!audioUrl && audioUrl.trim().length > 0;

    if (!hasText && !hasAudio) {
      throw new AppError(
        "Explanation is mandatory. Please provide either a written description or a voice audio recording of the problem.",
        400
      );
    }

    // 2. Validate problem exists and matches category / subcategory
    const problem = await withDbRetry(() =>
      prisma.serviceProblem.findUnique({
        where: { id: problemId },
        include: {
          category: true,
          subcategory: true,
        },
      })
    );

    if (!problem || !problem.active) {
      throw new AppError("The selected service problem is invalid or inactive.", 404);
    }

    if (problem.categoryId !== categoryId || problem.subcategoryId !== subcategoryId) {
      throw new AppError("The selected problem does not match the category hierarchy.", 400);
    }

    // 3. Generate unique requestRef
    let requestRef = this.generateReference();
    // Safety check for uniqueness
    while (await withDbRetry(() => prisma.problemRequest.findUnique({ where: { requestRef } }))) {
      requestRef = this.generateReference();
    }

    // 4. Create ProblemRequest record with status DRAFT
    const problemRequest = await withDbRetry(() =>
      prisma.problemRequest.create({
        data: {
          requestRef,
          consumerId,
          categoryId,
          subcategoryId,
          problemId,
          textDescription: hasText ? trimmedText : null,
          audioUrl: hasAudio ? audioUrl.trim() : null,
          audioDuration: audioDuration ? Math.round(audioDuration) : null,
          photos: Array.isArray(photos) ? photos : [],
          videoUrl: videoUrl?.trim() || null,
          additionalNotes: additionalNotes?.trim() || null,
          address: address?.trim() || null,
          latitude: typeof latitude === "number" ? latitude : null,
          longitude: typeof longitude === "number" ? longitude : null,
          estimatedPriceMin: problem.minimumPrice,
          estimatedPriceMax: problem.maximumPrice,
          estimatedDuration: problem.estimatedDuration,
          pricingUnit: problem.pricingUnit || "per_job",
          labourCostMin: problem.labourCostMin,
          labourCostMax: problem.labourCostMax,
          inspectionFee: problem.inspectionFee,
          platformFeeRate: problem.platformFeeRate,
          materialNote: problem.materialNote,
          workerPriceCeiling: problem.workerPriceCeiling,
          status: "DRAFT",
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true, hindiName: true, icon: true },
          },
          subcategory: {
            select: { id: true, name: true, slug: true, hindiName: true, icon: true },
          },
          problem: {
            select: {
              id: true,
              name: true,
              hindiName: true,
              description: true,
              basePrice: true,
              minimumPrice: true,
              maximumPrice: true,
              workerPriceCeiling: true,
              estimatedDuration: true,
              pricingUnit: true,
              labourCostMin: true,
              labourCostMax: true,
              inspectionFee: true,
              platformFeeRate: true,
              materialCostMin: true,
              materialCostMax: true,
              materialNote: true,
              benchmarkSource: true,
            },
          },
          consumer: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      })
    );

    return problemRequest;
  }

  /**
   * Get ProblemRequest by ID or requestRef
   */
  static async getByIdOrRef(idOrRef: string, consumerId?: string) {
    const isRef = idOrRef.startsWith("PR-");
    const problemRequest = await withDbRetry(() =>
      prisma.problemRequest.findFirst({
        where: {
          ...(isRef ? { requestRef: idOrRef } : { id: idOrRef }),
          ...(consumerId ? { consumerId } : {}),
        },
        include: {
          category: true,
          subcategory: true,
          problem: true,
          consumer: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      })
    );

    if (!problemRequest) {
      throw new AppError("Problem request draft not found", 404);
    }

    return problemRequest;
  }

  /**
   * Get Consumer's recent drafts
   */
  static async getConsumerDrafts(consumerId: string) {
    return withDbRetry(() =>
      prisma.problemRequest.findMany({
        where: {
          consumerId,
          status: "DRAFT",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          category: true,
          subcategory: true,
          problem: true,
        },
      })
    );
  }
}
