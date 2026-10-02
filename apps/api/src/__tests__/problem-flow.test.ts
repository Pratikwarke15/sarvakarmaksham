import prisma from "../lib/prisma";
import { CatalogService } from "../services/catalog.service";
import { ProblemRequestService } from "../services/problem-request.service";

async function runTests() {
  console.log("=== PHASE 2 PROBLEM SELECTION FLOW TEST ===");

  // 1. Test Catalog retrieval
  console.log("\n[Test 1] Testing CatalogService.getCategories(true)...");
  const categories = await CatalogService.getCategories(true);
  console.log(`  Found ${categories.length} categories with active problems.`);
  if (categories.length < 4) {
    throw new Error(`Expected at least 4 MVP categories, found ${categories.length}`);
  }
  const slugs = categories.map((c) => c.slug);
  console.log(`  Categories: ${slugs.join(", ")}`);
  if (!slugs.includes("plumbing") || !slugs.includes("electrical") || !slugs.includes("carpentry") || !slugs.includes("appliance-repair")) {
    throw new Error("Missing expected MVP categories in catalogue!");
  }
  console.log("  ✓ Test 1 Passed");

  // 2. Test Category Details and Subcategories
  console.log("\n[Test 2] Testing CatalogService.getCategoryBySlug('plumbing')...");
  const plumbing = await CatalogService.getCategoryBySlug("plumbing");
  if (!plumbing || plumbing.subcategories.length === 0) {
    throw new Error("Plumbing category subcategories not found");
  }
  console.log(`  Plumbing has ${plumbing.subcategories.length} subcategories.`);
  const firstSub = plumbing.subcategories[0];
  console.log(`  Subcategory [${firstSub.name}] has ${firstSub.problems.length} specific problems.`);
  if (firstSub.problems.length === 0) {
    throw new Error("No specific problems in first subcategory");
  }
  const testProblem = firstSub.problems[0];
  console.log(`  Selected Problem: ${testProblem.name} (Base: ₹${testProblem.basePrice}, Min: ₹${testProblem.minimumPrice}, Max: ₹${testProblem.maximumPrice})`);
  console.log("  ✓ Test 2 Passed");

  // 3. Find or create a consumer user for testing
  let consumer = await prisma.user.findFirst({
    where: { role: "CONSUMER" },
  });
  if (!consumer) {
    consumer = await prisma.user.create({
      data: {
        name: "Test Consumer",
        phone: "+919876543210",
        role: "CONSUMER",
        passwordHash: "test_hash",
      },
    });
  }

  // 4. Test Validation: Neither Text nor Audio provided -> must throw AppError 400
  console.log("\n[Test 3] Testing validation: No text and no audio provided...");
  let rejected = false;
  try {
    await ProblemRequestService.createDraft(consumer.id, {
      categoryId: plumbing.id,
      subcategoryId: firstSub.id,
      problemId: testProblem.id,
      textDescription: "",
      audioUrl: "",
    });
  } catch (err: any) {
    if (err.statusCode === 400 && err.message.includes("mandatory")) {
      rejected = true;
      console.log(`  Correctly rejected: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!rejected) {
    throw new Error("Validation FAILED: draft was created without text OR audio!");
  }
  console.log("  ✓ Test 3 Passed (Mandatory text or audio validation enforced)");

  // 5. Test Draft Creation with Text Only
  console.log("\n[Test 4] Testing draft creation with text explanation...");
  const textDraft = await ProblemRequestService.createDraft(consumer.id, {
    categoryId: plumbing.id,
    subcategoryId: firstSub.id,
    problemId: testProblem.id,
    textDescription: "The kitchen tap has been dripping continuously since yesterday. Water is pooling around the sink.",
    photos: ["https://example.com/tap-leak-1.jpg"],
    address: "Flat 402, Green Glen Layout, Bellandur, Bengaluru",
    latitude: 12.9279,
    longitude: 77.6748,
  });
  console.log(`  Created Draft Ref: ${textDraft.requestRef}, Status: ${textDraft.status}`);
  console.log(`  Estimates snapshot: ₹${textDraft.estimatedPriceMin} - ₹${textDraft.estimatedPriceMax}, Duration: ${textDraft.estimatedDuration} mins`);
  if (textDraft.status !== "DRAFT" || !textDraft.requestRef.startsWith("PR-")) {
    throw new Error("Invalid draft created");
  }
  console.log("  ✓ Test 4 Passed");

  // 6. Test Draft Creation with Audio Only
  console.log("\n[Test 5] Testing draft creation with audio explanation...");
  const audioDraft = await ProblemRequestService.createDraft(consumer.id, {
    categoryId: plumbing.id,
    subcategoryId: firstSub.id,
    problemId: testProblem.id,
    audioUrl: "https://example.com/recordings/audio-123.webm",
    audioDuration: 24,
    additionalNotes: "Please come before 2 PM if possible.",
  });
  console.log(`  Created Audio Draft Ref: ${audioDraft.requestRef}, Audio Duration: ${audioDraft.audioDuration}s`);
  console.log("  ✓ Test 5 Passed");

  // 7. Test Retrieval
  console.log("\n[Test 6] Testing retrieval by requestRef...");
  const fetched = await ProblemRequestService.getByIdOrRef(textDraft.requestRef);
  if (!fetched || fetched.id !== textDraft.id) {
    throw new Error("Failed to fetch draft by requestRef");
  }
  console.log(`  Fetched: ${fetched.requestRef}, Category: ${fetched.category.name}, Problem: ${fetched.problem.name}`);
  console.log("  ✓ Test 6 Passed");

  console.log("\n=============================================");
  console.log("ALL PHASE 2 BACKEND INTEGRATION TESTS PASSED!");
  console.log("=============================================");
}

runTests()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
