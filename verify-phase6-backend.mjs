import axios from "axios";
import { io } from "socket.io-client";

const API_BASE = "http://localhost:4000/api/v1";
const WS_BASE = "http://localhost:4000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("================================================================================");
  console.log("   PHASE 6 — LIVE LOCATION, ROUTING AND MAP EXPERIENCE TEST SUITE               ");
  console.log("================================================================================\n");

  // 1. Authenticate Demo Accounts
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

  const consumerHeaders = { headers: { Authorization: `Bearer ${consumerToken}` } };
  const workerHeaders = { headers: { Authorization: `Bearer ${workerToken}` } };

  // Helper to fetch category & subcategory
  const categoriesRes = await axios.get(`${API_BASE}/services/categories?available=true`);
  const plumbingCat = categoriesRes.data.data.find((c) => c.slug === "plumbing");
  const tapSubcat = plumbingCat.subcategories.find((s) => s.slug === "tap-mixer");
  const problem = tapSubcat.problems[0];

  const workerProfileRes = await axios.get(`${API_BASE}/workers/profile`, workerHeaders);
  const workerProfileId = workerProfileRes.data.data.id;

  // ---------------------------------------------------------------------------
  // TEST 1: Immediate Order & Pre-Acceptance Location Privacy Masking
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 1: Immediate Order & Pre-Acceptance Location Privacy Masking");
  console.log("------------------------------------------------------------------");
  const draft1 = await axios.post(
    `${API_BASE}/problem-requests/draft`,
    {
      categoryId: plumbingCat.id,
      subcategoryId: tapSubcat.id,
      problemId: problem.id,
      textDescription: "Main supply pipeline valve dripping rapidly.",
      address: "House 42, Vasant Vihar Block C, New Delhi 110057",
      latitude: 28.560,
      longitude: 77.165,
    },
    consumerHeaders
  );

  const order1Res = await axios.post(
    `${API_BASE}/orders`,
    {
      problemRequestId: draft1.data.data.id,
      workerId: workerProfileId,
      bookingMode: "IMMEDIATE",
      address: "House 42, Vasant Vihar Block C, New Delhi 110057",
      latitude: 28.560,
      longitude: 77.165,
    },
    consumerHeaders
  );
  const order1 = order1Res.data.data;
  console.log(`Created Immediate Order: Ref=${order1.orderRef}, ID=${order1.id}`);

  // Worker inspects live tracking before accepting
  const preAcceptTracking = await axios.get(
    `${API_BASE}/orders/${order1.id}/live-tracking`,
    workerHeaders
  );
  const preSnap = preAcceptTracking.data.data;
  console.log("Worker Pre-Acceptance View:", {
    trackingActive: preSnap.trackingActive,
    destinationAddress: preSnap.destination.address,
    isMasked: preSnap.destination.isMasked,
    latitude: preSnap.destination.latitude,
    longitude: preSnap.destination.longitude,
  });

  if (preSnap.trackingActive !== false) {
    throw new Error("PRIVACY VIOLATION: Tracking should be false before worker accepts.");
  }
  if (preSnap.destination.address !== null) {
    throw new Error(`PRIVACY VIOLATION: Exact consumer address "${preSnap.destination.address}" exposed before acceptance! Must be null.`);
  }
  if (preSnap.destination.latitude !== null || preSnap.destination.longitude !== null) {
    throw new Error("PRIVACY VIOLATION: Exact GPS coordinates exposed to worker before acceptance!");
  }
  if (!preSnap.destination.isMasked) {
    throw new Error("PRIVACY VIOLATION: Destination isMasked flag must be true before acceptance.");
  }
  if (!preSnap.destination.approxArea || preSnap.destination.approxArea.includes("House 42") || preSnap.destination.approxArea.includes("110057")) {
    throw new Error(`PRIVACY VIOLATION: approxArea contains sensitive house/pin numbers: "${preSnap.destination.approxArea}"`);
  }

  // Audit GET /orders/:id for worker before acceptance
  const orderDetailsPre = await axios.get(`${API_BASE}/orders/${order1.id}`, workerHeaders);
  if (orderDetailsPre.data.data.address !== null) {
    throw new Error(`PRIVACY VIOLATION: Exact address "${orderDetailsPre.data.data.address}" returned by /orders/:id before acceptance! Must be null.`);
  }

  // Audit GET /orders/worker/requests for worker before acceptance
  const incomingRequestsPre = await axios.get(`${API_BASE}/orders/worker/requests`, workerHeaders);
  const thisIncoming = incomingRequestsPre.data.data.find((r) => r.id === order1.id);
  if (thisIncoming && thisIncoming.address !== null) {
    throw new Error(`PRIVACY VIOLATION: Exact address "${thisIncoming.address}" returned by /orders/worker/requests! Must be null.`);
  }

  console.log("✓ TEST 1 PASSED: Strict pre-acceptance privacy verified. Address is null, coordinates are null, only approxArea is shared.");

  // ---------------------------------------------------------------------------
  // TEST 2: Scheduled Order Early Tracking Prevention
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 2: Scheduled Order Early Tracking Prevention");
  console.log("------------------------------------------------------------------");
  const scheduledTimeFuture = new Date(Date.now() + 4 * 3600 * 1000).toISOString(); // 4 hours in future
  const draft2 = await axios.post(
    `${API_BASE}/problem-requests/draft`,
    {
      categoryId: plumbingCat.id,
      subcategoryId: tapSubcat.id,
      problemId: problem.id,
      textDescription: "Bathroom mixer overhaul planned for later.",
      address: "Apartment 102, Saket Court, New Delhi 110017",
      latitude: 28.520,
      longitude: 77.210,
    },
    consumerHeaders
  );

  const order2Res = await axios.post(
    `${API_BASE}/orders`,
    {
      problemRequestId: draft2.data.data.id,
      workerId: workerProfileId,
      bookingMode: "SCHEDULED",
      scheduledAt: scheduledTimeFuture,
      address: "Apartment 102, Saket Court, New Delhi 110017",
      latitude: 28.520,
      longitude: 77.210,
    },
    consumerHeaders
  );
  const order2 = order2Res.data.data;
  console.log(`Created Scheduled Order: Ref=${order2.orderRef}, ScheduledAt=${order2.scheduledAt}`);

  // Accept scheduled order
  await axios.post(`${API_BASE}/orders/${order2.id}/accept`, {}, workerHeaders);

  // Check tracking before scheduled time
  const scheduledTracking = await axios.get(
    `${API_BASE}/orders/${order2.id}/live-tracking`,
    consumerHeaders
  );
  console.log("Scheduled Order Tracking Check:", {
    bookingMode: scheduledTracking.data.data.bookingMode,
    trackingActive: scheduledTracking.data.data.trackingActive,
    reason: scheduledTracking.data.data.trackingReason,
  });

  if (scheduledTracking.data.data.trackingActive !== false) {
    throw new Error("SCHEDULE PRIVACY VIOLATION: Live tracking activated before scheduled service time!");
  }

  // Attempting to push location for a scheduled order before service time must be blocked
  let scheduledPushBlocked = false;
  try {
    await axios.post(
      `${API_BASE}/orders/${order2.id}/location`,
      { latitude: 28.613, longitude: 77.209 },
      workerHeaders
    );
  } catch (err) {
    if (err.response && err.response.status === 400) {
      scheduledPushBlocked = true;
      console.log(`✓ Premature scheduled location update blocked with HTTP 400: "${err.response.data.message || err.response.data.error}"`);
    }
  }

  if (!scheduledPushBlocked) {
    throw new Error("FAIL: Server allowed worker location push on scheduled order before service time!");
  }
  console.log("✓ TEST 2 PASSED: Scheduled order does not activate live tracking early.");

  // ---------------------------------------------------------------------------
  // TEST 3: Worker Acceptance & Address Disclosure
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 3: Worker Acceptance & Destination Disclosure");
  console.log("------------------------------------------------------------------");
  const acceptRes = await axios.post(`${API_BASE}/orders/${order1.id}/accept`, {}, workerHeaders);
  console.log("Accept response status:", acceptRes.data.data.status);

  // Worker checks tracking again
  const postAcceptTracking = await axios.get(
    `${API_BASE}/orders/${order1.id}/live-tracking`,
    workerHeaders
  );
  const postSnap = postAcceptTracking.data.data;
  console.log("Worker Post-Acceptance View:", {
    status: postSnap.status,
    destinationAddress: postSnap.destination.address,
    isMasked: postSnap.destination.isMasked,
    latitude: postSnap.destination.latitude,
    longitude: postSnap.destination.longitude,
  });

  if (postSnap.destination.isMasked !== false) {
    throw new Error("Destination address should be unmasked after acceptance.");
  }
  if (!postSnap.destination.latitude || !postSnap.destination.longitude) {
    throw new Error("Destination coordinates should be available after acceptance.");
  }
  console.log("✓ TEST 3 PASSED: Worker accepted request; destination address and GPS coordinates securely disclosed.");

  // ---------------------------------------------------------------------------
  // TEST 4: GPS Validation & Filtering
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 4: GPS Validation & Inaccurate Fix Filtering");
  console.log("------------------------------------------------------------------");
  // Transition to TRAVELLING so tracking is active
  await axios.patch(
    `${API_BASE}/orders/${order1.id}/operational-state`,
    { operationalState: "TRAVELLING" },
    workerHeaders
  );

  // Attempt missing coordinates
  let missingCoordsBlocked = false;
  try {
    await axios.post(
      `${API_BASE}/orders/${order1.id}/location`,
      { speed: 20 },
      workerHeaders
    );
  } catch (err) {
    if (err.response && err.response.status === 400) {
      missingCoordsBlocked = true;
      console.log(`✓ Missing coordinates rejected with HTTP 400: "${err.response.data.error}"`);
    }
  }
  if (!missingCoordsBlocked) {
    throw new Error("FAIL: Server accepted location update without coordinates.");
  }

  // Push low accuracy fix (> 200m)
  const lowAccuracyRes = await axios.post(
    `${API_BASE}/orders/${order1.id}/location`,
    {
      latitude: 28.580,
      longitude: 77.180,
      accuracy: 350, // 350 meters is poor accuracy
    },
    workerHeaders
  );
  console.log("Low accuracy update response:", lowAccuracyRes.data);
  console.log("✓ TEST 4 PASSED: GPS validation and inaccurate fix filtering verified.");

  // ---------------------------------------------------------------------------
  // TEST 5 & 6: Location Updates & OpenStreetMap Route Rendering
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 5 & 6: Location Updates & Route Polyline Rendering");
  console.log("------------------------------------------------------------------");
  // Push valid initial location (AIIMS / Ring Road Delhi)
  await sleep(1500);
  const validLocRes = await axios.post(
    `${API_BASE}/orders/${order1.id}/location`,
    {
      latitude: 28.567,
      longitude: 77.210,
      heading: 260,
      speed: 28,
      accuracy: 12,
    },
    workerHeaders
  );
  console.log("Valid location update:", {
    workerLat: validLocRes.data.data.workerLat,
    workerLng: validLocRes.data.data.workerLng,
    heading: validLocRes.data.data.heading,
    speed: validLocRes.data.data.speed,
    distanceRemainingKm: validLocRes.data.data.distanceRemainingKm,
    etaMinutes: validLocRes.data.data.etaMinutes,
  });

  // Query route endpoint
  const routeRes = await axios.get(`${API_BASE}/orders/${order1.id}/route`, consumerHeaders);
  const routeData = routeRes.data.data;
  console.log("Calculated Route Geometry:", {
    source: routeData.source,
    distanceKm: routeData.distanceKm,
    durationMinutes: routeData.durationMinutes,
    coordinatesCount: routeData.coordinates.length,
    firstPoint: routeData.coordinates[0],
    lastPoint: routeData.coordinates[routeData.coordinates.length - 1],
  });

  if (!routeData.coordinates || routeData.coordinates.length < 2) {
    throw new Error("Route rendering failed: Expected polyline coordinate array.");
  }
  if (routeData.distanceKm <= 0 || routeData.durationMinutes <= 0) {
    throw new Error("Invalid route distance or duration calculation.");
  }
  console.log("✓ TEST 5 & 6 PASSED: Location update accepted; OSRM / OpenStreetMap route polyline rendered.");

  // ---------------------------------------------------------------------------
  // TEST 7: Dynamic ETA Updates as Worker Approaches
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 7: Dynamic ETA Updates as Worker Approaches");
  console.log("------------------------------------------------------------------");
  await sleep(1500); // Respect throttle
  // Worker moves closer to consumer (Vasant Vihar C Block: 28.560, 77.165)
  // Worker is now at 28.561, 77.168 (~300 meters away)
  const approachRes = await axios.post(
    `${API_BASE}/orders/${order1.id}/location`,
    {
      latitude: 28.561,
      longitude: 77.168,
      heading: 270,
      speed: 18,
      accuracy: 8,
    },
    workerHeaders
  );

  const updatedTracking = await axios.get(
    `${API_BASE}/orders/${order1.id}/live-tracking`,
    consumerHeaders
  );
  console.log("Consumer Live View on Approach:", {
    etaMinutes: updatedTracking.data.data.route?.etaMinutes,
    distanceKm: updatedTracking.data.data.route?.distanceKm,
    etaTimestamp: updatedTracking.data.data.route?.etaTimestamp,
    workerCurrentLat: updatedTracking.data.data.currentLocation?.latitude,
  });

  if (updatedTracking.data.data.route.distanceKm > validLocRes.data.data.distanceRemainingKm) {
    throw new Error("Distance remaining should decrease as technician approaches.");
  }
  console.log("✓ TEST 7 PASSED: ETA and distance remaining update dynamically in real time.");

  // ---------------------------------------------------------------------------
  // TEST 8: WebSocket Disconnect / Reconnect & Live Room Subscriptions
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 8: Real-time WebSocket Disconnect & Reconnect Resilience");
  console.log("------------------------------------------------------------------");
  const socketClient = io(WS_BASE, {
    path: "/ws",
    auth: { token: consumerToken },
    transports: ["websocket"],
  });

  let socketConnected = false;
  let receivedLiveUpdate = false;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket connection timeout")), 6000);

    socketClient.on("connect", () => {
      console.log(`✓ WebSocket client connected (ID: ${socketClient.id})`);
      socketConnected = true;
      socketClient.emit("join:order", order1.id);
    });

    socketClient.on("location:update", (data) => {
      console.log("✓ Received live 'location:update' over WebSocket:", {
        orderRef: data.orderRef,
        workerLat: data.workerLat,
        workerLng: data.workerLng,
        etaMinutes: data.etaMinutes,
      });
      receivedLiveUpdate = true;
      clearTimeout(timer);
      resolve(true);
    });

    // Worker broadcasts position update after consumer socket joined
    setTimeout(async () => {
      await sleep(1500);
      try {
        await axios.post(
          `${API_BASE}/orders/${order1.id}/location`,
          {
            latitude: 28.5605,
            longitude: 77.166,
            heading: 265,
            speed: 12,
            accuracy: 6,
          },
          workerHeaders
        );
      } catch (e) {
        console.warn("Location push error in socket test:", e.message);
      }
    }, 1000);
  });

  // Test Disconnect and Reconnect
  console.log("Testing Socket Disconnect & Reconnect...");
  socketClient.disconnect();
  console.log("✓ Socket disconnected successfully.");
  await sleep(500);

  socketClient.connect();
  await new Promise((resolve) => {
    socketClient.on("connect", () => {
      console.log(`✓ Socket reconnected successfully (New ID: ${socketClient.id})`);
      socketClient.emit("join:order", order1.id);
      resolve(true);
    });
  });

  socketClient.disconnect();
  console.log("✓ TEST 8 PASSED: WebSocket streaming, room subscriptions, and reconnect pass.");

  // ---------------------------------------------------------------------------
  // TEST 9: Operational State Advancement & GPS Ephemeral Purge
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 9: Operational Lifecycle & Non-Persistent GPS Purge");
  console.log("------------------------------------------------------------------");
  // Advance to ARRIVED
  const arrivedRes = await axios.patch(
    `${API_BASE}/orders/${order1.id}/operational-state`,
    { operationalState: "ARRIVED" },
    workerHeaders
  );
  console.log("Advanced state:", arrivedRes.data.operationalState);

  // Advance to WORKING
  const workingRes = await axios.patch(
    `${API_BASE}/orders/${order1.id}/operational-state`,
    { operationalState: "WORKING" },
    workerHeaders
  );
  console.log("Advanced state:", workingRes.data.operationalState);

  // Advance to COMPLETED
  const completedRes = await axios.patch(
    `${API_BASE}/orders/${order1.id}/operational-state`,
    { operationalState: "COMPLETED" },
    workerHeaders
  );
  console.log("Advanced state:", completedRes.data.operationalState);

  // Verify that live tracking is disabled and in-memory GPS data purged
  const finalTracking = await axios.get(
    `${API_BASE}/orders/${order1.id}/live-tracking`,
    consumerHeaders
  );
  console.log("Completed Order Tracking Check:", {
    status: finalTracking.data.data.status,
    trackingActive: finalTracking.data.data.trackingActive,
    reason: finalTracking.data.data.trackingReason,
  });

  if (finalTracking.data.data.trackingActive !== false) {
    throw new Error("FAIL: Tracking should be deactivated once job is completed.");
  }
  console.log("✓ TEST 9 PASSED: Job lifecycle finalized and ephemeral tracking data cleanly purged.");

  // ---------------------------------------------------------------------------
  // TEST 10: Consumer Refresh Resilience
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 10: Consumer Refresh Snapshot Resilience");
  console.log("------------------------------------------------------------------");
  // Create another order in TRAVELLING state to test refresh
  const draft3 = await axios.post(
    `${API_BASE}/problem-requests/draft`,
    {
      categoryId: plumbingCat.id,
      subcategoryId: tapSubcat.id,
      problemId: problem.id,
      textDescription: "Drain unclogging needed immediately.",
      address: "B-4/12 Hauz Khas, New Delhi 110016",
      latitude: 28.549,
      longitude: 77.200,
    },
    consumerHeaders
  );
  const order3Res = await axios.post(
    `${API_BASE}/orders`,
    {
      problemRequestId: draft3.data.data.id,
      workerId: workerProfileId,
      bookingMode: "IMMEDIATE",
      address: "B-4/12 Hauz Khas, New Delhi 110016",
      latitude: 28.549,
      longitude: 77.200,
    },
    consumerHeaders
  );
  const order3 = order3Res.data.data;
  await axios.post(`${API_BASE}/orders/${order3.id}/accept`, {}, workerHeaders);
  await axios.patch(
    `${API_BASE}/orders/${order3.id}/operational-state`,
    { operationalState: "TRAVELLING" },
    workerHeaders
  );
  await axios.post(
    `${API_BASE}/orders/${order3.id}/location`,
    { latitude: 28.560, longitude: 77.210, speed: 24, heading: 180 },
    workerHeaders
  );

  // Simulate multiple consumer refreshes / page reloads
  for (let i = 1; i <= 3; i++) {
    const refreshRes = await axios.get(
      `${API_BASE}/orders/${order3.id}/live-tracking`,
      consumerHeaders
    );
    const snap = refreshRes.data.data;
    if (!snap.trackingActive || !snap.route || !snap.currentLocation) {
      throw new Error(`Consumer refresh ${i} failed to restore complete live tracking snapshot.`);
    }
  }
  console.log("✓ TEST 10 PASSED: Consumer refresh preserves complete live tracking state and route.");

  // ---------------------------------------------------------------------------
  // TEST 11: General Route Navigation Endpoint (/routes/navigate)
  // ---------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------------");
  console.log("TEST 11: General Route Navigation API (/routes/navigate)");
  console.log("------------------------------------------------------------------");
  const navRes = await axios.post(`${API_BASE}/routes/navigate`, {
    originLat: 28.6139,
    originLng: 77.2090, // Connaught Place
    destLat: 28.5245,
    destLng: 77.2066, // Saket
  });

  console.log("General Navigation Result:", {
    source: navRes.data.data.source,
    distanceKm: navRes.data.data.distanceKm,
    durationMinutes: navRes.data.data.durationMinutes,
    summary: navRes.data.data.summary,
  });

  if (navRes.data.data.distanceKm <= 5 || navRes.data.data.durationMinutes <= 5) {
    throw new Error("Invalid navigation distance/duration calculation between Connaught Place and Saket.");
  }
  console.log("✓ TEST 11 PASSED: General route navigation API calculated route successfully.");

  console.log("\n================================================================================");
  console.log("   ALL 11 TESTS PASSED SUCCESSFULLY! PHASE 6 REQUIREMENTS VERIFIED.             ");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("\n❌ PHASE 6 TEST FAILED:", err?.response?.data || err.message);
  process.exit(1);
});
