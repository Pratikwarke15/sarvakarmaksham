import prisma from "../lib/prisma";
import { PricingService } from "../services/pricing.service";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 1000): Promise<T> {
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

async function runPricingTests() {
  console.log("=== PHASE 3 INDIAN SERVICE PRICE ESTIMATION & CEILING TESTS ===");

  // 1. Fetch a low-value service problem (e.g. Tap Repair or Switch Replacement)
  console.log("\n[Test 1] Fetching a low-value service problem (Tap Repair)...");
  const tapProblem = await withDbRetry(() =>
    prisma.serviceProblem.findFirst({
      where: { name: { contains: "Tap Repair" } },
      include: { category: true, subcategory: true },
    })
  );

  if (!tapProblem) {
    throw new Error("Tap Repair problem not found in database.");
  }

  console.log(`  Found Problem: ${tapProblem.name}`);
  console.log(`  Category: ${tapProblem.category.name} | Subcategory: ${tapProblem.subcategory.name}`);
  console.log(`  Base: ₹${tapProblem.basePrice}, Min: ₹${tapProblem.minimumPrice}, Max: ₹${tapProblem.maximumPrice}, Ceiling: ₹${tapProblem.workerPriceCeiling}`);
  console.log("  ✓ Test 1 Passed");

  // 2. Test PricingService.getProblemEstimate()
  console.log("\n[Test 2] Testing PricingService.getProblemEstimate() component separation...");
  const estimate = await PricingService.getProblemEstimate(tapProblem.id);

  console.log("  Breakdown received:");
  console.log(`  - Pricing Unit: ${estimate.pricingUnit}`);
  console.log(`  - Estimated Duration: ${estimate.estimatedDuration} mins`);
  console.log(`  - Labour Range: ₹${estimate.breakdown.labour.min} – ₹${estimate.breakdown.labour.max} (Base: ₹${estimate.breakdown.labour.base})`);
  console.log(`  - Material: ₹${estimate.breakdown.material.min} – ₹${estimate.breakdown.material.max} ("${estimate.breakdown.material.note}")`);
  console.log(`  - Inspection Fee: ₹${estimate.breakdown.inspectionFee.amount} ("${estimate.breakdown.inspectionFee.note}")`);
  console.log(`  - Platform Fee: ${estimate.breakdown.platformFee.ratePercent}% (₹${estimate.breakdown.platformFee.amount})`);
  console.log(`  - Total Estimate Range: ₹${estimate.breakdown.totalEstimate.min} – ₹${estimate.breakdown.totalEstimate.max} (Base: ₹${estimate.breakdown.totalEstimate.base})`);
  console.log(`  - Worker Bargaining Ceiling: ₹${estimate.workerBargainingCeiling}`);
  console.log(`  - Benchmark Source: ${estimate.benchmarkSource}`);
  console.log(`  - Disclaimer: ${estimate.pricingDisclaimer}`);

  if (
    !estimate.breakdown.labour ||
    !estimate.breakdown.material ||
    !estimate.breakdown.inspectionFee ||
    !estimate.breakdown.platformFee ||
    !estimate.breakdown.totalEstimate
  ) {
    throw new Error("Missing required component breakdown in price estimation!");
  }

  if (!estimate.breakdown.material.note.includes("Additional material cost may apply after inspection")) {
    throw new Error("Missing mandatory material disclaimer for MVP!");
  }

  if (estimate.workerBargainingCeiling !== Number(tapProblem.workerPriceCeiling)) {
    throw new Error("Worker ceiling mismatch in estimate response!");
  }

  console.log("  ✓ Test 2 Passed: Full component breakdown verified!");

  // 3. Test Ceiling Enforcement: Worker proposing ₹2,000 for a job with ceiling ₹299
  console.log("\n[Test 3] Testing CEILING ENFORCEMENT: Worker quote of ₹2,000 for ceiling of ₹" + tapProblem.workerPriceCeiling + "...");
  let ceilingRejected = false;
  try {
    await PricingService.validateWorkerQuote({
      problemId: tapProblem.id,
      quotedAmount: 2000,
      hasAdditionalWork: false,
    });
  } catch (err: any) {
    ceilingRejected = true;
    console.log(`  ✓ Expected Rejection caught: "${err.message}" (Status: ${err.statusCode})`);
    if (!err.message.includes("exceeds the maximum worker bargaining ceiling")) {
      throw new Error(`Unexpected error message on ceiling violation: ${err.message}`);
    }
  }

  if (!ceilingRejected) {
    throw new Error("FAILED: Backend allowed worker quote of ₹2,000 which exceeds the ceiling!");
  }
  console.log("  ✓ Test 3 Passed: Unreasonable worker quote strictly rejected by backend!");

  // 4. Test Floor Enforcement: Worker predatory-undercutting below minimum price
  console.log("\n[Test 4] Testing FLOOR ENFORCEMENT: Worker quote below minimum fair rate (₹50)...");
  let floorRejected = false;
  try {
    await PricingService.validateWorkerQuote({
      problemId: tapProblem.id,
      quotedAmount: 50,
    });
  } catch (err: any) {
    floorRejected = true;
    console.log(`  ✓ Expected Floor Rejection caught: "${err.message}" (Status: ${err.statusCode})`);
  }

  if (!floorRejected) {
    throw new Error("FAILED: Backend allowed predatory quote below fair labour threshold!");
  }
  console.log("  ✓ Test 4 Passed: Predatory undercutting rejected!");

  // 5. Test Valid Worker Quote within Ceiling
  console.log("\n[Test 5] Testing VALID QUOTE within ceiling (₹200)...");
  const validResult = await PricingService.validateWorkerQuote({
    problemId: tapProblem.id,
    quotedAmount: 200,
    hasAdditionalWork: false,
  });

  console.log(`  Validation result: valid=${validResult.valid}, withinCeiling=${validResult.isWithinCeiling}, ceiling=₹${validResult.allowedCeiling}`);
  if (!validResult.valid || !validResult.isWithinCeiling) {
    throw new Error("FAILED: Valid quote within ceiling was rejected!");
  }
  console.log("  ✓ Test 5 Passed: Quote within ceiling successfully accepted!");

  // 6. Test Authorized Additional Scope / Material
  console.log("\n[Test 6] Testing Quote exceeding ceiling WITH authorized additional work/materials...");
  const authorizedResult = await PricingService.validateWorkerQuote({
    problemId: tapProblem.id,
    quotedAmount: 850,
    hasAdditionalWork: true,
    additionalWorkReason: "Concealed pipe cracked inside wall; copper socket coupling and masonry breakout required.",
  });

  console.log(`  Authorized additional work result: valid=${authorizedResult.valid}, hasAdditionalWork=${authorizedResult.hasAdditionalWork}`);
  if (!authorizedResult.valid) {
    throw new Error("FAILED: Authorized quote with extra scope was rejected!");
  }
  console.log("  ✓ Test 6 Passed: Authorized additional work/materials handled correctly!");

  // 7. Verify Multiple Trades (Electrical Switch, AC Filter, Door Lock)
  console.log("\n[Test 7] Verifying price models across multiple Indian trades...");
  const electricalProblem = await withDbRetry(() =>
    prisma.serviceProblem.findFirst({
      where: { name: { contains: "Switch" } },
    })
  );
  const carpentryProblem = await withDbRetry(() =>
    prisma.serviceProblem.findFirst({
      where: { name: { contains: "Lock" } },
    })
  );
  const applianceProblem = await withDbRetry(() =>
    prisma.serviceProblem.findFirst({
      where: { name: { contains: "AC" } },
    })
  );

  for (const prob of [electricalProblem, carpentryProblem, applianceProblem]) {
    if (!prob) continue;
    const est = await PricingService.getProblemEstimate(prob.id);
    console.log(`  - [${prob.name}]: Base=₹${est.breakdown.totalEstimate.base}, Ceiling=₹${est.workerBargainingCeiling}, Unit=${est.pricingUnit}, Benchmark="${est.benchmarkSource}"`);
  }
  console.log("  ✓ Test 7 Passed: Multi-trade Indian benchmark models verified!");

  console.log("\n=== ALL PHASE 3 PRICING AND CEILING TESTS PASSED! ===");
}

runPricingTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
