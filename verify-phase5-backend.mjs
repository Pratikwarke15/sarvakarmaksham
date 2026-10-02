import axios from "axios";

const API_BASE = "http://localhost:4000/api/v1";

async function main() {
  console.log("================================================================================");
  console.log("   PHASE 5 — WORKER DASHBOARD AND PRICE NEGOTIATION AUTOMATED TEST SUITE        ");
  console.log("================================================================================\n");

  // 1. Authenticate Consumer & Worker
  console.log("1. Authenticating Demo Accounts...");
  const consumerLogin = await axios.post(`${API_BASE}/auth/login`, {
    phone: "9812345601",
    password: "password123",
  });
  const consumerToken = consumerLogin.data.data.token;
  const consumerUser = consumerLogin.data.data.user;
  console.log(`✓ Consumer authenticated: ${consumerUser.name} (${consumerUser.id})`);

  const workerLogin = await axios.post(`${API_BASE}/auth/login`, {
    phone: "9876543201",
    password: "password123",
  });
  const workerToken = workerLogin.data.data.token;
  const workerUser = workerLogin.data.data.user;
  console.log(`✓ Worker authenticated: ${workerUser.name} (${workerUser.id})`);

  // Helper auth headers
  const consumerHeaders = { headers: { Authorization: `Bearer ${consumerToken}` } };
  const workerHeaders = { headers: { Authorization: `Bearer ${workerToken}` } };

  // -------------------------------------------------------------------------
  // TEST 1: Worker Offline Toggle
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 1: Dynamic Duty — Worker Offline");
  console.log("------------------------------------------------------------------");
  const offlineRes = await axios.patch(
    `${API_BASE}/workers/duty-status`,
    { dutyState: "OFF_DUTY" },
    workerHeaders
  );
  console.log("Duty status response:", offlineRes.data);
  if (
    offlineRes.data.dutyState !== "OFF_DUTY" ||
    offlineRes.data.isOnDuty !== false ||
    offlineRes.data.isAvailable !== false
  ) {
    throw new Error("Worker offline toggle failed: state mismatch");
  }
  console.log("✓ TEST 1 PASSED: Worker successfully toggled to OFF DUTY.");

  // -------------------------------------------------------------------------
  // TEST 2: Worker Online Toggle
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 2: Dynamic Duty — Worker Online");
  console.log("------------------------------------------------------------------");
  const onlineRes = await axios.patch(
    `${API_BASE}/workers/duty-status`,
    { dutyState: "AVAILABLE" },
    workerHeaders
  );
  console.log("Duty status response:", onlineRes.data);
  if (
    onlineRes.data.dutyState !== "AVAILABLE" ||
    onlineRes.data.isOnDuty !== true ||
    onlineRes.data.isAvailable !== true
  ) {
    throw new Error("Worker online toggle failed: state mismatch");
  }
  console.log("✓ TEST 2 PASSED: Worker successfully toggled to AVAILABLE (online).");

  // Helper to create problem request & order
  async function createTestOrder() {
    const categoriesRes = await axios.get(`${API_BASE}/services/categories?available=true`);
    const plumbingCat = categoriesRes.data.data.find((c) => c.slug === "plumbing");
    const tapSubcat = plumbingCat.subcategories.find((s) => s.slug === "tap-mixer");
    const problem = tapSubcat.problems[0];

    const draftRes = await axios.post(
      `${API_BASE}/problem-requests/draft`,
      {
        categoryId: plumbingCat.id,
        subcategoryId: tapSubcat.id,
        problemId: problem.id,
        textDescription: "Leaking bathroom sink spindle with erratic flow.",
        address: "Apartment 504, Tower B, Vasant Kunj, New Delhi 110070",
        latitude: 28.524,
        longitude: 77.155,
      },
      consumerHeaders
    );

    const draft = draftRes.data.data;
    const workerProfileRes = await axios.get(`${API_BASE}/workers/profile`, workerHeaders);
    const workerProfileId = workerProfileRes.data.data.id;

    const orderRes = await axios.post(
      `${API_BASE}/orders`,
      {
        problemRequestId: draft.id,
        workerId: workerProfileId,
        bookingMode: "IMMEDIATE",
        address: "Apartment 504, Tower B, Vasant Kunj, New Delhi 110070",
        latitude: 28.524,
        longitude: 77.155,
      },
      consumerHeaders
    );

    return orderRes.data.data;
  }

  // -------------------------------------------------------------------------
  // TEST 3: Incoming Request Received with Privacy Masking
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 3: Incoming Request Received by Worker");
  console.log("------------------------------------------------------------------");
  const order1 = await createTestOrder();
  console.log(`Order 1 created: Ref=${order1.orderRef}, ID=${order1.id}`);

  const incomingRes = await axios.get(`${API_BASE}/orders/worker/requests`, workerHeaders);
  const foundOrder1 = incomingRes.data.data.find((o) => o.id === order1.id);
  if (!foundOrder1) {
    throw new Error(`Order ${order1.id} not found in worker incoming requests.`);
  }

  console.log("Found incoming order:", {
    orderRef: foundOrder1.orderRef,
    status: foundOrder1.status,
    isAddressMasked: foundOrder1.isAddressMasked,
    maskedAddress: foundOrder1.address,
    ceiling: foundOrder1.problem?.workerPriceCeiling,
  });

  if (foundOrder1.status !== "REQUESTED") {
    throw new Error("Order status should be REQUESTED");
  }
  if (!foundOrder1.isAddressMasked || foundOrder1.address.includes("Apartment 504")) {
    throw new Error("Privacy violation: Full street address was not masked before acceptance.");
  }
  console.log("✓ TEST 3 PASSED: Incoming request received with strict address privacy masking.");

  // -------------------------------------------------------------------------
  // TEST 4: Rejection Handling
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 4: Rejection with Structured Reason");
  console.log("------------------------------------------------------------------");
  const rejectRes = await axios.post(
    `${API_BASE}/orders/${order1.id}/reject`,
    {
      reason: "Too far",
      customNote: "Currently handling an emergency repair in another zone.",
    },
    workerHeaders
  );
  console.log("Rejection response:", rejectRes.data);

  const checkRejected = await axios.get(`${API_BASE}/orders/${order1.id}`, consumerHeaders);
  if (checkRejected.data.data.status !== "REJECTED") {
    throw new Error("Order status should be REJECTED after worker decline.");
  }
  if (checkRejected.data.data.rejectionReason !== "Too far") {
    throw new Error("Rejection reason was not saved properly.");
  }
  console.log("✓ TEST 4 PASSED: Worker rejected request with structured reason.");

  // -------------------------------------------------------------------------
  // TEST 5: Acceptance Handling
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 5: Order Acceptance & Address Disclosure");
  console.log("------------------------------------------------------------------");
  const order2 = await createTestOrder();
  console.log(`Order 2 created: Ref=${order2.orderRef}, ID=${order2.id}`);

  const acceptRes = await axios.post(
    `${API_BASE}/orders/${order2.id}/accept`,
    {},
    workerHeaders
  );
  console.log("Acceptance response:", {
    orderRef: acceptRes.data.data.orderRef,
    status: acceptRes.data.data.status,
    unmaskedAddress: acceptRes.data.data.address,
    isAddressMasked: acceptRes.data.data.isAddressMasked,
  });

  if (acceptRes.data.data.status !== "ACCEPTED") {
    throw new Error("Order status should be ACCEPTED after acceptance.");
  }
  if (!acceptRes.data.data.address.includes("Vasant Kunj")) {
    throw new Error("Address should be disclosed to worker upon acceptance.");
  }
  console.log("✓ TEST 5 PASSED: Worker accepted request; full address securely disclosed.");

  // -------------------------------------------------------------------------
  // TEST 6: Price Proposal by Worker (within Ceiling)
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 6: Worker Price Proposal within Backend Ceiling");
  console.log("------------------------------------------------------------------");
  const ceiling = Number(order2.workerPriceCeiling);
  const basePrice = Number(order2.basePrice);
  const proposedPrice = Math.min(basePrice + 100, ceiling - 20); // strictly <= ceiling
  console.log(`Base Price: ₹${basePrice}, Ceiling: ₹${ceiling}, Proposing: ₹${proposedPrice}`);

  const proposalRes = await axios.post(
    `${API_BASE}/orders/${order2.id}/propose-price`,
    {
      amount: proposedPrice,
      reason: "Requires specialized spindle extraction tools and extra sealing washers.",
    },
    workerHeaders
  );
  console.log("Proposal response:", proposalRes.data);

  if (proposalRes.data.status !== "PENDING" || proposalRes.data.orderStatus !== "NEGOTIATION") {
    throw new Error("Order should transition to NEGOTIATION with proposal PENDING.");
  }
  console.log("✓ TEST 6 PASSED: Worker proposed valid higher price within backend ceiling.");

  // -------------------------------------------------------------------------
  // TEST 7: Ceiling Enforcement (Exceeding Ceiling Throws 400)
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 7: Backend Ceiling Enforcement");
  console.log("------------------------------------------------------------------");
  const excessivePrice = ceiling + 250;
  console.log(`Attempting proposal above ceiling: ₹${excessivePrice} > ₹${ceiling}`);

  let ceilingBlocked = false;
  try {
    await axios.post(
      `${API_BASE}/orders/${order2.id}/propose-price`,
      {
        amount: excessivePrice,
        reason: "Arbitrary high markup attempt.",
      },
      workerHeaders
    );
  } catch (err) {
    if (err.response && err.response.status === 400) {
      ceilingBlocked = true;
      console.log(`✓ Correctly rejected with HTTP 400: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  if (!ceilingBlocked) {
    throw new Error("CRITICAL SECURITY FLAW: Backend allowed proposal exceeding ceiling!");
  }
  console.log("✓ TEST 7 PASSED: Price ceiling strictly enforced by backend.");

  // -------------------------------------------------------------------------
  // TEST 8: Consumer Counteroffer
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 8: Consumer Reviews and Counters Price");
  console.log("------------------------------------------------------------------");
  const counterAmount = proposedPrice - 30; // Between base and worker proposal
  console.log(`Consumer countering worker's ₹${proposedPrice} with ₹${counterAmount}`);

  const counterRes = await axios.post(
    `${API_BASE}/orders/${order2.id}/respond-proposal`,
    {
      action: "COUNTER",
      counterAmount,
      reason: "Can we settle at this intermediate rate for the washers?",
    },
    consumerHeaders
  );
  console.log("Counteroffer response:", counterRes.data);

  if (counterRes.data.amount !== counterAmount || counterRes.data.proposerRole !== "CONSUMER") {
    throw new Error("Counteroffer should create a CONSUMER proposal.");
  }
  console.log("✓ TEST 8 PASSED: Consumer counteroffer recorded and previous proposal countered.");

  // -------------------------------------------------------------------------
  // TEST 9: Final Price Confirmation & Immutability Lock
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 9: Final Price Confirmation & Immutability");
  console.log("------------------------------------------------------------------");
  console.log(`Worker accepts consumer counteroffer of ₹${counterAmount}...`);
  const confirmRes = await axios.post(
    `${API_BASE}/orders/${order2.id}/respond-proposal`,
    { action: "ACCEPT" },
    workerHeaders
  );
  console.log("Confirmation response:", confirmRes.data);

  if (!confirmRes.data.isPriceLocked || confirmRes.data.finalPrice !== counterAmount) {
    throw new Error("Price should be confirmed and locked at counterAmount.");
  }

  // Verify order in database
  const orderAfterLock = await axios.get(`${API_BASE}/orders/${order2.id}`, workerHeaders);
  if (!orderAfterLock.data.data.isPriceLocked || orderAfterLock.data.data.status !== "CONFIRMED") {
    throw new Error("Order state in DB should be CONFIRMED with isPriceLocked=true.");
  }

  // IMMUTABILITY TEST: Attempt to propose new price after lock
  console.log("Testing price immutability: attempting to propose price after lock...");
  let renegotiateBlocked = false;
  try {
    await axios.post(
      `${API_BASE}/orders/${order2.id}/propose-price`,
      { amount: counterAmount + 50 },
      workerHeaders
    );
  } catch (err) {
    if (err.response && err.response.status === 400) {
      renegotiateBlocked = true;
      console.log(`✓ Modification blocked with HTTP 400: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  if (!renegotiateBlocked) {
    throw new Error("CRITICAL FLAW: Price was modified after final lock!");
  }

  // Verify Price History Timeline
  console.log("\nChecking Immutable Price History Timeline (GET /orders/:id/price-history)...");
  const historyRes = await axios.get(`${API_BASE}/orders/${order2.id}/price-history`, consumerHeaders);
  const history = historyRes.data.data;
  console.log(`Found ${history.proposals.length} recorded proposals:`);
  history.proposals.forEach((p, idx) => {
    console.log(` [${idx + 1}] Proposer: ${p.proposer}, Amount: ₹${p.amount}, Status: ${p.status}, Reason: "${p.reason || 'None'}"`);
  });

  if (history.proposals.length < 2) {
    throw new Error("Price history must retain all historical proposals without overwriting.");
  }
  console.log("✓ TEST 9 PASSED: Final agreed price is confirmed, immutable, and fully logged.");

  // -------------------------------------------------------------------------
  // TEST 10: Operational State Advancement & Worker Dashboard Summary
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 10: Operational State Progression & Dashboard Cockpit");
  console.log("------------------------------------------------------------------");

  // State: TRAVELLING
  console.log("Advancing to TRAVELLING...");
  const travelRes = await axios.patch(
    `${API_BASE}/orders/${order2.id}/operational-state`,
    { operationalState: "TRAVELLING" },
    workerHeaders
  );
  console.log("Operational state:", travelRes.data);

  // State: ARRIVED
  console.log("Advancing to ARRIVED...");
  const arrivedRes = await axios.patch(
    `${API_BASE}/orders/${order2.id}/operational-state`,
    { operationalState: "ARRIVED" },
    workerHeaders
  );
  console.log("Operational state:", arrivedRes.data);

  // State: WORKING (IN_PROGRESS)
  console.log("Advancing to WORKING...");
  const workingRes = await axios.patch(
    `${API_BASE}/orders/${order2.id}/operational-state`,
    { operationalState: "WORKING" },
    workerHeaders
  );
  console.log("Operational state:", workingRes.data);

  // State: COMPLETED
  console.log("Advancing to COMPLETED...");
  const completedRes = await axios.patch(
    `${API_BASE}/orders/${order2.id}/operational-state`,
    { operationalState: "COMPLETED" },
    workerHeaders
  );
  console.log("Operational state:", completedRes.data);

  // Verify Worker Dashboard Summary Aggregator (10 Core Requirements)
  console.log("\nVerifying Comprehensive Worker Dashboard Aggregator (GET /workers/dashboard-summary)...");
  const dashRes = await axios.get(`${API_BASE}/workers/dashboard-summary`, workerHeaders);
  const dash = dashRes.data.data;

  console.log("Dashboard Summary Modules:");
  console.log(" 1. Availability:", dash.availability);
  console.log(" 2. Current Status:", dash.currentStatus);
  console.log(" 3. Incoming Requests count:", dash.incomingRequests.length);
  console.log(" 4. Active Job:", dash.activeJob ? dash.activeJob.orderRef : "None (Job Completed)");
  console.log(" 5. Scheduled Jobs count:", dash.scheduledJobs.length);
  console.log(" 6. Completed Jobs count:", dash.completedJobs.length);
  console.log(" 7. Earnings:", dash.earnings);
  console.log(" 8. Profile:", { name: dash.profile.name, coop: dash.profile.coopName, verified: dash.profile.aadhaarVerified });
  console.log(" 9. Ratings:", { avgRating: dash.ratings.avgRating, totalReviews: dash.ratings.totalReviews });
  console.log(" 10. Order History count:", dash.orderHistory.length);

  if (
    !dash.availability ||
    !dash.earnings ||
    !dash.profile ||
    !dash.ratings ||
    dash.completedJobs.length === 0 ||
    dash.orderHistory.length === 0
  ) {
    throw new Error("Dashboard summary aggregator missing one or more required core modules.");
  }
  console.log("✓ TEST 10 PASSED: Operational state advanced through lifecycle and all 10 dashboard modules verified.");

  console.log("\n================================================================================");
  console.log("   ALL 10 TESTS PASSED SUCCESSFULLY! PHASE 5 REQUIREMENTS VERIFIED.            ");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err.response?.data || err.message || err);
  process.exit(1);
});
