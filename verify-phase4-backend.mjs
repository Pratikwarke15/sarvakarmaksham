import axios from "axios";

const API_BASE = "http://localhost:4000/api/v1";

async function main() {
  console.log("=== PHASE 4 COMPREHENSIVE BACKEND & STATE MACHINE TEST ===");

  // 1. Authenticate Consumer (Priya Malhotra - 9812345601)
  console.log("\n1. Authenticating Consumer (Priya Malhotra)...");
  const consumerLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    phone: "9812345601",
    password: "password123",
  });
  const consumerToken = consumerLoginRes.data.data.token;
  const consumerUser = consumerLoginRes.data.data.user;
  console.log(`✓ Consumer authenticated: ${consumerUser.name} (${consumerUser.id})`);

  // 2. Authenticate Worker (Ramesh Gupta - 9876543201)
  console.log("\n2. Authenticating Worker 1 (Ramesh Gupta - AVAILABLE)...");
  const worker1LoginRes = await axios.post(`${API_BASE}/auth/login`, {
    phone: "9876543201",
    password: "password123",
  });
  const worker1Token = worker1LoginRes.data.data.token;
  const worker1User = worker1LoginRes.data.data.user;
  console.log(`✓ Worker 1 authenticated: ${worker1User.name} (${worker1User.id})`);

  // 3. Authenticate Worker 2 (Suresh Verma - 9876543202 - OFF_DUTY)
  console.log("\n3. Authenticating Worker 2 (Suresh Verma - OFF_DUTY)...");
  const worker2LoginRes = await axios.post(`${API_BASE}/auth/login`, {
    phone: "9876543202",
    password: "password123",
  });
  const worker2Token = worker2LoginRes.data.data.token;
  const worker2User = worker2LoginRes.data.data.user;
  console.log(`✓ Worker 2 authenticated: ${worker2User.name} (${worker2User.id})`);

  // 4. Create Draft Problem Request (Steps 1-5)
  console.log("\n4. Creating Problem Request Draft (Step 1-5)...");
  const categoriesRes = await axios.get(`${API_BASE}/services/categories?available=true`);
  const plumbingCat = categoriesRes.data.data.find((c) => c.slug === "plumbing");
  const tapSubcat = plumbingCat.subcategories.find((s) => s.slug === "tap-mixer");
  const problem = tapSubcat.problems[0];
  console.log(`Selected Problem: ${problem.name} (${problem.id})`);

  const draftRes = await axios.post(
    `${API_BASE}/problem-requests/draft`,
    {
      categoryId: plumbingCat.id,
      subcategoryId: tapSubcat.id,
      problemId: problem.id,
      textDescription: "Kitchen tap leaking continuously at the spindle.",
      address: "Flat 402, Royal Palms, Connaught Place, New Delhi 110001",
      latitude: 28.628,
      longitude: 77.2195,
    },
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  const draft = draftRes.data.data;
  console.log(`✓ Draft created: ${draft.requestRef} (${draft.id})`);

  // 5. Test Worker Discovery & Dynamic Availability
  console.log("\n5. Testing Worker Discovery API (GET /pricing/problem-requests/:id/workers)...");
  const workersDiscoveryRes = await axios.get(
    `${API_BASE}/pricing/problem-requests/${draft.id}/workers`,
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  const discoveredWorkers = workersDiscoveryRes.data.data;
  console.log(`Discovered ${discoveredWorkers.length} matching cooperative workers:`);

  for (const w of discoveredWorkers) {
    console.log(
      ` - ${w.name}: dutyState=${w.dutyState}, isOnDuty=${w.isOnDuty}, isAvailableNow=${w.isAvailableNow}, distance=${w.distanceDisplay}, photo=${Boolean(w.avatarUrl)}, skills=${w.skills?.join(", ")}`
    );
  }

  // Validate requirements:
  // 1. "Available Now" should only appear when the worker is currently ON DUTY and available.
  const ramesh = discoveredWorkers.find((w) => w.name.includes("Ramesh"));
  const suresh = discoveredWorkers.find((w) => w.name.includes("Suresh"));
  if (!ramesh || !ramesh.isAvailableNow) {
    throw new Error("Ramesh Gupta should be availableNow: true");
  }
  if (!suresh || suresh.isAvailableNow || suresh.dutyState !== "OFF_DUTY") {
    throw new Error("Suresh Verma should be OFF_DUTY and availableNow: false");
  }
  console.log("✓ Dynamic availability correctly calculated: Ramesh is AVAILABLE NOW, Suresh is OFF DUTY.");

  // 6. Test Confirm Order Creation (Step 6 -> Step 7 -> Step 8)
  console.log("\n6. Creating Order Request to Ramesh Gupta (status: REQUESTED)...");
  const orderRes = await axios.post(
    `${API_BASE}/orders`,
    {
      problemRequestId: draft.id,
      workerId: ramesh.workerId,
      bookingMode: "IMMEDIATE",
      address: "Flat 402, Royal Palms, Connaught Place, New Delhi 110001",
      latitude: 28.628,
      longitude: 77.2195,
    },
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  const order = orderRes.data.data;
  console.log(`✓ Order created: ${order.orderRef} (${order.id}), status: ${order.status}`);
  if (order.status !== "REQUESTED") {
    throw new Error(`Expected order status REQUESTED, got ${order.status}`);
  }

  // 7. Test Distance Privacy Enforcement Before Acceptance
  console.log("\n7. Verifying Distance Privacy Enforcement for Worker (Before Acceptance)...");
  const workerRequestsRes = await axios.get(`${API_BASE}/orders/worker/requests`, {
    headers: { Authorization: `Bearer ${worker1Token}` },
  });
  const incoming = workerRequestsRes.data.data.find((o) => o.id === order.id);
  if (!incoming) {
    throw new Error("Worker 1 should see the newly dispatched order request.");
  }
  console.log("Worker view of incoming order:");
  console.log(` - Address: "${incoming.address}"`);
  console.log(` - Coordinates: lat=${incoming.latitude}, lng=${incoming.longitude}`);
  console.log(` - Approximate Area: "${incoming.approxArea}"`);
  console.log(` - Approximate Distance: ${incoming.approxDistanceKm} km`);
  console.log(` - Problem Title: "${incoming.problemTitle}"`);
  console.log(` - Consumer Name: "${incoming.consumer?.name}"`);

  if (!incoming.address.includes("[Protected]") && !incoming.isAddressMasked) {
    throw new Error("Privacy violation: Exact address was NOT masked for worker before acceptance!");
  }
  if (incoming.latitude !== null || incoming.longitude !== null) {
    throw new Error("Privacy violation: Exact coordinates were revealed before acceptance!");
  }
  if (!incoming.approxDistanceKm || incoming.approxDistanceKm <= 0) {
    throw new Error("Approximate distance must be provided to worker!");
  }
  console.log("✓ Distance Privacy verified: Address masked, coordinates hidden, approximate distance visible.");

  // 8. Test Worker Rejection Flow with Mandatory Reason
  console.log("\n8. Testing Worker Rejection Flow...");
  try {
    await axios.post(
      `${API_BASE}/orders/${order.id}/reject`,
      {},
      { headers: { Authorization: `Bearer ${worker1Token}` } }
    );
    throw new Error("Rejection without reason should have failed with 400!");
  } catch (err) {
    if (err.response?.status === 400) {
      console.log("✓ Rejecting without reason properly rejected with HTTP 400.");
    } else {
      throw err;
    }
  }

  // Reject with valid reason
  const rejectRes = await axios.post(
    `${API_BASE}/orders/${order.id}/reject`,
    {
      reason: "Too far",
      customNote: "Currently handling an urgent emergency nearby.",
    },
    { headers: { Authorization: `Bearer ${worker1Token}` } }
  );
  const rejectedOrder = rejectRes.data.data;
  console.log(`✓ Order rejected: status=${rejectedOrder.status}, reason="${rejectedOrder.rejectionReason}"`);

  // Consumer checks rejected order
  const consumerCheckRes = await axios.get(`${API_BASE}/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${consumerToken}` },
  });
  const consumerViewOfRejected = consumerCheckRes.data.data;
  if (consumerViewOfRejected.status !== "REJECTED") {
    throw new Error(`Consumer should see REJECTED status, got ${consumerViewOfRejected.status}`);
  }
  console.log(`✓ Consumer receives rejection status and reason: "${consumerViewOfRejected.rejectionReason}"`);

  // 9. Test Reassigning to Another Worker (Suresh Verma)
  console.log("\n9. Testing Reassignment to Another Worker (Suresh Verma)...");
  const reassignRes = await axios.post(
    `${API_BASE}/orders/${order.id}/reassign`,
    { workerId: suresh.workerId },
    { headers: { Authorization: `Bearer ${consumerToken}` } }
  );
  const reassignedOrder = reassignRes.data.data;
  console.log(`✓ Order reassigned: status=${reassignedOrder.status}, workerId=${reassignedOrder.workerId}`);
  if (reassignedOrder.status !== "REQUESTED") {
    throw new Error(`Expected REQUESTED after reassignment, got ${reassignedOrder.status}`);
  }

  // 10. Test Worker 2 Acceptance Flow
  console.log("\n10. Testing Worker Acceptance Flow (Worker 2 Suresh Verma accepts)...");
  const acceptRes = await axios.post(
    `${API_BASE}/orders/${order.id}/accept`,
    {},
    { headers: { Authorization: `Bearer ${worker2Token}` } }
  );
  const acceptedOrder = acceptRes.data.data;
  console.log(`✓ Order accepted: status=${acceptedOrder.status}`);
  if (acceptedOrder.status !== "ACCEPTED") {
    throw new Error(`Expected ACCEPTED status, got ${acceptedOrder.status}`);
  }

  // Verify Worker 2 now sees UNMASKED address
  const worker2ViewRes = await axios.get(`${API_BASE}/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${worker2Token}` },
  });
  const unmaskedOrder = worker2ViewRes.data.data;
  console.log(`Unmasked Address for accepted order: "${unmaskedOrder.address}"`);
  if (unmaskedOrder.address.includes("[Protected]")) {
    throw new Error("Address should be UNMASKED after acceptance!");
  }
  console.log("✓ Location disclosed after acceptance verified.");

  // 11. Test State Machine Transition Validation
  console.log("\n11. Testing State Machine Invalid Transition Protection...");
  try {
    // Attempting an illegal jump: ACCEPTED -> PAID directly
    await axios.post(
      `${API_BASE}/orders/${order.id}/accept`, // already accepted
      {},
      { headers: { Authorization: `Bearer ${worker2Token}` } }
    );
    throw new Error("Calling accept on already ACCEPTED order should fail!");
  } catch (err) {
    if (err.response?.status === 400) {
      console.log(`✓ Invalid transition properly blocked with HTTP 400: ${err.response.data.error}`);
    } else {
      throw err;
    }
  }

  console.log("\n=======================================================");
  console.log(">>> ALL BACKEND & STATE MACHINE CHECKS PASSED! <<<");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("Test failed:", err.response?.data || err.message);
  process.exit(1);
});
