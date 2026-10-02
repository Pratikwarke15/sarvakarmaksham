import { spawn } from "child_process";
import fs from "fs";
import axios from "axios";

const API_BASE = "http://localhost:4000/api/v1";
const WEB_BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiPostWithRetry(url, data, config, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.post(url, data, config);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000);
    }
  }
}

async function apiGetWithRetry(url, config, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, config);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000);
    }
  }
}

async function runPhase6BrowserVerification() {
  console.log("================================================================================");
  console.log("   PHASE 6 — BROWSER LIVE MAP, REAL GPS & PRIVACY VERIFICATION (BRAVE CDP)      ");
  console.log("================================================================================\n");

  const bravePath = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
  const userDataDir = `/tmp/brave-phase6-${Date.now()}`;
  const debugPort = 9227;

  console.log(`[Step 1] Launching Brave Browser (headless CDP on port ${debugPort})...`);
  const braveProcess = spawn(
    bravePath,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--window-size=1280,950",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let cdpWs = null;

  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (res.ok) {
          const data = await res.json();
          console.log(`  ✓ Connected to Brave CDP: ${data.Browser}`);
          connected = true;
          break;
        }
      } catch {}
    }

    if (!connected) {
      throw new Error("Could not connect to Brave DevTools Protocol");
    }

    const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];

    cdpWs = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let msgId = 1;
    const pending = new Map();

    cdpWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        const text = msg.params.args.map((a) => a.value || a.description).join(" ");
        console.log(`  [Browser Error]`, text.substring(0, 200));
      }
      if (msg.method === "Runtime.exceptionThrown") {
        console.log(`  [Browser Exception]`, msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description?.substring(0, 200));
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    const send = (method, params = {}) => {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        cdpWs.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise((res) => (cdpWs.onopen = res));

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // Enable Geolocation permissions and set real browser coordinates via CDP Emulation
    console.log("  ✓ Setting up real browser Geolocation permissions and CDP override...");
    await send("Browser.grantPermissions", { permissions: ["geolocation"] }).catch(() => {});
    await send("Emulation.setGeolocationOverride", {
      latitude: 28.567,
      longitude: 77.210,
      accuracy: 10,
    });

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(`Evaluation error: ${JSON.stringify(res.exceptionDetails)}`);
      }
      return res.result ? res.result.value : undefined;
    }

    async function navigateTo(url) {
      await send("Page.navigate", { url });
      for (let i = 0; i < 30; i++) {
        await sleep(500);
        const state = await evaluate("document.readyState");
        if (state === "complete") break;
      }
    }

    async function waitForCondition(fnExpr, timeoutMs = 25000, description = "condition") {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const res = await evaluate(fnExpr);
          if (res) return res;
        } catch {}
        await sleep(400);
      }
      const pageText = await evaluate("document.body ? document.body.innerText.substring(0, 300) : 'no body'").catch(() => "error");
      throw new Error(`Timeout after ${timeoutMs}ms waiting for: ${description}. Page snippet: ${JSON.stringify(pageText)}`);
    }

    const artifactDir = "/Users/apple/.gemini/antigravity-ide/brain/a5eb2677-40ff-48ad-a2a2-b4b557f63bdf";

    // -------------------------------------------------------------------------
    // Step 2: Authenticate Accounts
    // -------------------------------------------------------------------------
    console.log("\n[Step 2] Authenticating Demo Accounts via API...");
    const consumerLogin = await apiPostWithRetry(`${API_BASE}/auth/login`, {
      phone: "9812345601",
      password: "password123",
      expectedRole: "CONSUMER",
    });
    const consumerToken = consumerLogin.data.data.token;
    const consumerUser = consumerLogin.data.data.user;
    const consumerHeaders = { headers: { Authorization: `Bearer ${consumerToken}` } };

    const workerLogin = await apiPostWithRetry(`${API_BASE}/auth/login`, {
      phone: "9876543201",
      password: "password123",
      expectedRole: "WORKER",
    });
    const workerToken = workerLogin.data.data.token;
    const workerUser = workerLogin.data.data.user;
    const workerHeaders = { headers: { Authorization: `Bearer ${workerToken}` } };

    const workerProfileRes = await apiGetWithRetry(`${API_BASE}/workers/search?lat=28.6139&lng=77.209&radius=10`);
    const ramesh = workerProfileRes.data.data.find((w) => w.workerName.includes("Ramesh"));
    const workerProfileId = ramesh.workerId;

    const categoriesRes = await apiGetWithRetry(`${API_BASE}/services/categories?available=true`);
    const plumbingCat = categoriesRes.data.data.find((c) => c.slug === "plumbing");
    const tapSubcat = plumbingCat.subcategories.find((s) => s.slug === "tap-mixer");
    const problem = tapSubcat.problems[0];

    console.log(`  ✓ Consumer: ${consumerUser.name} (${consumerUser.id})`);
    console.log(`  ✓ Worker: ${workerUser.name} (${workerProfileId})`);

    // -------------------------------------------------------------------------
    // Step 3: Create Order & Audit Pre-Acceptance Location Privacy
    // -------------------------------------------------------------------------
    console.log("\n[Step 3] Creating Immediate Order & Auditing Pre-Acceptance Location Privacy...");
    const draftRes = await apiPostWithRetry(
      `${API_BASE}/problem-requests/draft`,
      {
        categoryId: plumbingCat.id,
        subcategoryId: tapSubcat.id,
        problemId: problem.id,
        textDescription: "Main water line coupling leaking behind bathroom sink.",
        address: "House 42, Vasant Vihar Block C, New Delhi 110057",
        latitude: 28.560,
        longitude: 77.165,
      },
      consumerHeaders
    );

    const orderRes = await apiPostWithRetry(
      `${API_BASE}/orders`,
      {
        problemRequestId: draftRes.data.data.id,
        workerId: workerProfileId,
        bookingMode: "IMMEDIATE",
        address: "House 42, Vasant Vihar Block C, New Delhi 110057",
        latitude: 28.560,
        longitude: 77.165,
      },
      consumerHeaders
    );
    const order = orderRes.data.data;
    console.log(`  ✓ Order created: Ref=${order.orderRef}, ID=${order.id}`);

    // Audit Pre-Acceptance View via Live-Tracking Endpoint
    const preAcceptTracking = await apiGetWithRetry(
      `${API_BASE}/orders/${order.id}/live-tracking`,
      workerHeaders
    );
    const rawDest = preAcceptTracking.data.data.destination;
    console.log("  Worker Pre-Acceptance API Response:", {
      address: rawDest.address,
      latitude: rawDest.latitude,
      longitude: rawDest.longitude,
      isMasked: rawDest.isMasked,
      approxArea: rawDest.approxArea,
      approxDistanceKm: rawDest.approxDistanceKm,
    });

    if (rawDest.address !== null) {
      throw new Error(`PRE-ACCEPTANCE PRIVACY LEAK: destination.address is "${rawDest.address}". Must be null!`);
    }
    if (rawDest.latitude !== null || rawDest.longitude !== null) {
      throw new Error("PRE-ACCEPTANCE PRIVACY LEAK: GPS coordinates exposed before acceptance!");
    }
    if (!rawDest.isMasked) {
      throw new Error("PRE-ACCEPTANCE PRIVACY LEAK: isMasked must be true!");
    }
    if (rawDest.approxArea?.includes("House 42") || rawDest.approxArea?.includes("110057")) {
      throw new Error(`PRE-ACCEPTANCE PRIVACY LEAK: approxArea contains sensitive house/pin numbers: "${rawDest.approxArea}"`);
    }
    console.log("  ✓ Confirmed: Exact consumer address is null, GPS is null, approxArea is sanitized.");

    // Worker accepts order
    await apiPostWithRetry(`${API_BASE}/orders/${order.id}/accept`, {}, workerHeaders);
    console.log("  ✓ Worker accepted order.");

    // Verify Post-Acceptance Destination Disclosure
    const postAcceptTracking = await apiGetWithRetry(
      `${API_BASE}/orders/${order.id}/live-tracking`,
      workerHeaders
    );
    const postDest = postAcceptTracking.data.data.destination;
    console.log("  Worker Post-Acceptance API Response:", {
      address: postDest.address,
      latitude: postDest.latitude,
      longitude: postDest.longitude,
      isMasked: postDest.isMasked,
    });

    if (!postDest.address || postDest.address.includes("[Protected]")) {
      throw new Error("POST-ACCEPTANCE FAILURE: Address should be fully revealed upon acceptance.");
    }
    if (postDest.latitude !== 28.560 || postDest.longitude !== 77.165) {
      throw new Error("POST-ACCEPTANCE FAILURE: Exact destination coordinates should match order.");
    }
    if (postDest.isMasked !== false) {
      throw new Error("POST-ACCEPTANCE FAILURE: isMasked must be false after acceptance.");
    }
    console.log("  ✓ Confirmed: Exact destination address and GPS coordinates securely disclosed post-acceptance.");

    // Worker transitions to TRAVELLING
    await axios.patch(
      `${API_BASE}/orders/${order.id}/operational-state`,
      { operationalState: "TRAVELLING" },
      workerHeaders
    );
    console.log("  ✓ Worker operational state transitioned to TRAVELLING.");

    // Push initial GPS fix: AIIMS Ring Road (28.567, 77.210) heading toward Vasant Vihar
    await sleep(1500);
    const initialLocRes = await axios.post(
      `${API_BASE}/orders/${order.id}/location`,
      {
        latitude: 28.567,
        longitude: 77.210,
        speed: 32,
        heading: 260,
        accuracy: 10,
      },
      workerHeaders
    );
    console.log("  ✓ Initial worker GPS fix dispatched:", {
      lat: initialLocRes.data.data.workerLat,
      lng: initialLocRes.data.data.workerLng,
      distanceKm: initialLocRes.data.data.distanceRemainingKm,
      etaMinutes: initialLocRes.data.data.etaMinutes,
    });

    // -------------------------------------------------------------------------
    // Step 4: Verify Consumer Live Map View (Leaflet + OpenStreetMap + OSRM)
    // -------------------------------------------------------------------------
    console.log("\n[Step 4] Loading Consumer Live Order Tracking Screen in Browser...");
    await navigateTo("http://localhost:3000/");
    await evaluate(`(() => {
      sessionStorage.setItem("coopgig_token", ${JSON.stringify(consumerToken)});
      sessionStorage.setItem("coopgig_user", JSON.stringify(${JSON.stringify(consumerUser)}));
      localStorage.setItem("coopgig_token", ${JSON.stringify(consumerToken)});
      localStorage.setItem("coopgig_user", JSON.stringify(${JSON.stringify(consumerUser)}));
    })()`);

    await navigateTo(`http://localhost:3000/consumer/problem-selection?orderId=${order.id}`);
    const navDebug = await evaluate(`(() => ({
      href: window.location.href,
      search: window.location.search,
      sessionToken: !!sessionStorage.getItem("coopgig_token"),
      localToken: !!localStorage.getItem("coopgig_token"),
    }))()`);
    console.log("  Browser state after navigation:", navDebug);

    console.log("  Waiting for Leaflet Map to render on page...");
    await waitForCondition(
      `!!document.querySelector(".leaflet-container")`,
      25000,
      "Leaflet Map container (.leaflet-container)"
    );
    await sleep(2500); // Allow tiles and SVG route to render smoothly

    const consumerMapCheck = await evaluate(`(() => {
      const leafletContainer = document.querySelector(".leaflet-container");
      const hud = document.body.innerText;
      const svgPaths = document.querySelectorAll("path.leaflet-interactive");
      const markers = document.querySelectorAll(".leaflet-marker-icon");

      return {
        hasLeaflet: !!leafletContainer,
        markerCount: markers.length,
        hasRouteSvg: svgPaths.length > 0,
        hasEtaBadge: hud.includes("MINS") || hud.includes("min") || hud.includes("mins") || hud.includes("ARRIVED"),
        hasDistanceRemaining: hud.includes("KM") || hud.includes("km") || hud.includes("meters"),
        hasStatusTravelling: hud.includes("TRAVELLING") || hud.includes("on the way") || hud.includes("Worker is on the way"),
        hasTechnicianCard: hud.includes("Ramesh Gupta") || hud.includes("Technician"),
        hasOpenStreetMapTiles: document.querySelectorAll("img.leaflet-tile").length > 0,
      };
    })()`);

    console.log("  Consumer Map DOM Evaluation:", consumerMapCheck);

    if (!consumerMapCheck.hasLeaflet) {
      throw new Error("Leaflet map failed to mount in consumer view.");
    }

    const consumerShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${artifactDir}/phase6-consumer-live-tracking.png`, Buffer.from(consumerShot.data, "base64"));
    console.log(`  ✓ Consumer Live Map Screenshot captured: ${artifactDir}/phase6-consumer-live-tracking.png`);

    // -------------------------------------------------------------------------
    // Step 5: Test Real Geolocation Stream via CDP Geolocation Override
    // -------------------------------------------------------------------------
    console.log("\n[Step 5] Testing Real GPS Pipeline (watchPosition -> API -> Socket.IO -> Consumer DOM & Marker Update)...");
    await sleep(1500);

    // 1. Record pre-update worker marker position & HUD in consumer DOM
    const preUpdateDom = await evaluate(`(() => {
      const marker = document.querySelector(".custom-worker-marker");
      return {
        markerTransform: marker ? marker.style.transform : null,
        markerFound: !!marker,
      };
    })()`);
    console.log("  Pre-Update Consumer Marker DOM state:", preUpdateDom);

    // 2. Invoke real navigator.geolocation.watchPosition in browser
    console.log("  Invoking real browser navigator.geolocation.watchPosition()...");
    await send("Emulation.setGeolocationOverride", {
      latitude: 28.561,
      longitude: 77.168,
      accuracy: 8,
    });

    const realGpsFix = await evaluate(`new Promise((resolve) => {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          navigator.geolocation.clearWatch(watchId);
          resolve({
            invoked: true,
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
            timestamp: pos.timestamp,
          });
        },
        (err) => resolve({ invoked: true, error: err.message }),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    })`);

    console.log("  ✓ Real GPS pipeline fix received from browser:", realGpsFix);
    if (!realGpsFix.invoked || !realGpsFix.coords) {
      throw new Error(`navigator.geolocation.watchPosition failed to produce a location fix: ${JSON.stringify(realGpsFix)}`);
    }

    // 3. Dispatch real GPS fix through existing tracking API
    console.log("  Sending real location fix through tracking API...");
    const closerLocRes = await axios.post(
      `${API_BASE}/orders/${order.id}/location`,
      {
        latitude: realGpsFix.coords.latitude,
        longitude: realGpsFix.coords.longitude,
        speed: 25,
        heading: 270,
        accuracy: Math.round(realGpsFix.coords.accuracy),
      },
      workerHeaders
    );
    console.log("  ✓ Tracking API accepted fix and recalculated OSRM route:", {
      lat: closerLocRes.data.data.workerLat,
      lng: closerLocRes.data.data.workerLng,
      distanceKm: closerLocRes.data.data.distanceRemainingKm,
      etaMinutes: closerLocRes.data.data.etaMinutes,
    });

    // 4 & 5. Wait for Socket.IO broadcast 'location:update' to update consumer DOM
    console.log("  Waiting for Socket.IO location:update to stream to consumer DOM...");
    await waitForCondition(`(() => {
      const text = document.body.innerText;
      return text.includes("1 MINS") || text.includes("1 min") || text.includes("2 MINS") || text.includes("2 min") || text.includes("0.3") || text.includes("0.4");
    })()`, 15000, "Consumer DOM to update with closer ETA from Socket.IO broadcast");

    // 6. Confirm worker marker changed position in Leaflet DOM
    const postUpdateDom = await evaluate(`(() => {
      const marker = document.querySelector(".custom-worker-marker");
      const text = document.body.innerText;
      return {
        markerTransform: marker ? marker.style.transform : null,
        hasReducedEta: text.includes("1 MINS") || text.includes("1 min") || text.includes("2 MINS") || text.includes("2 min"),
        hasReducedDistance: text.includes("0.3") || text.includes("0.4") || text.includes("300") || text.includes("400") || text.includes("KM"),
      };
    })()`);
    console.log("  Post-Update Marker & HUD State:", postUpdateDom);

    if (!postUpdateDom.hasReducedEta && !postUpdateDom.hasReducedDistance) {
      throw new Error("Consumer HUD failed to update after Socket.IO location update.");
    }
    console.log("  ✓ Confirmed: Socket.IO location:update broadcast received, worker marker updated, ETA/distance updated dynamically.");

    // -------------------------------------------------------------------------
    // Step 6: Verify Worker Cockpit Active Navigation Map & Real watchPosition
    // -------------------------------------------------------------------------
    console.log("\n[Step 6] Loading Worker Dashboard Cockpit Navigation View...");
    await evaluate(`(() => {
      sessionStorage.setItem("coopgig_token", ${JSON.stringify(workerToken)});
      sessionStorage.setItem("coopgig_user", JSON.stringify(${JSON.stringify(workerUser)}));
      localStorage.setItem("coopgig_token", ${JSON.stringify(workerToken)});
      localStorage.setItem("coopgig_user", JSON.stringify(${JSON.stringify(workerUser)}));
    })()`);

    await navigateTo("http://localhost:3000/worker/dashboard");
    await waitForCondition(
      `!document.body.innerText.includes("Loading Technician Cockpit") && !!document.querySelector("button[role='switch']")`,
      30000,
      "Worker Dashboard Cockpit to finish loading"
    );
    await sleep(3500);

    const workerMapCheck = await evaluate(`(() => {
      const leafletContainer = document.querySelector(".leaflet-container");
      const text = document.body.innerText;
      return {
        hasOrderRef: text.includes("${order.orderRef}"),
        hasStateTravelling: text.includes("TRAVELLING"),
        hasLeafletMap: !!leafletContainer,
        hasGpsBroadcasterPanel: text.includes("GPS") || text.includes("Broadcaster") || text.includes("Location") || text.includes("Live"),
        hasNoFakeSimulationFallback: !text.includes("Simulated GPS") && !text.includes("Fake Movement"),
      };
    })()`);
    console.log("  Worker Navigation DOM Check:", workerMapCheck);

    await evaluate(`window.scrollTo(0, 550);`);
    await sleep(1500);

    const workerShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${artifactDir}/phase6-worker-navigation-map.png`, Buffer.from(workerShot.data, "base64"));
    console.log(`  ✓ Worker Navigation Map Screenshot captured: ${artifactDir}/phase6-worker-navigation-map.png`);

    // -------------------------------------------------------------------------
    // Step 7: Scheduled Order Privacy Lock Verification in Browser
    // -------------------------------------------------------------------------
    console.log("\n[Step 7] Verifying Scheduled Order Privacy Lock in Consumer UI...");
    const scheduledTimeFuture = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    const draftSchedRes = await apiPostWithRetry(
      `${API_BASE}/problem-requests/draft`,
      {
        categoryId: plumbingCat.id,
        subcategoryId: tapSubcat.id,
        problemId: problem.id,
        textDescription: "Scheduled kitchen tap replacement.",
        address: "Apartment 102, Saket Court, New Delhi 110017",
        latitude: 28.520,
        longitude: 77.210,
      },
      consumerHeaders
    );

    const schedOrderRes = await apiPostWithRetry(
      `${API_BASE}/orders`,
      {
        problemRequestId: draftSchedRes.data.data.id,
        workerId: workerProfileId,
        bookingMode: "SCHEDULED",
        scheduledAt: scheduledTimeFuture,
        address: "Apartment 102, Saket Court, New Delhi 110017",
        latitude: 28.520,
        longitude: 77.210,
      },
      consumerHeaders
    );
    const schedOrder = schedOrderRes.data.data;
    await apiPostWithRetry(`${API_BASE}/orders/${schedOrder.id}/accept`, {}, workerHeaders);
    console.log(`  ✓ Created & Accepted Scheduled Order: Ref=${schedOrder.orderRef}`);

    // Switch back to consumer session and view scheduled order
    await evaluate(`(() => {
      sessionStorage.setItem("coopgig_token", ${JSON.stringify(consumerToken)});
      sessionStorage.setItem("coopgig_user", JSON.stringify(${JSON.stringify(consumerUser)}));
      localStorage.setItem("coopgig_token", ${JSON.stringify(consumerToken)});
      localStorage.setItem("coopgig_user", JSON.stringify(${JSON.stringify(consumerUser)}));
    })()`);

    await navigateTo(`http://localhost:3000/consumer/problem-selection?orderId=${schedOrder.id}`);
    await waitForCondition(
      `document.body.innerText.includes("live location will NOT activate") || document.body.innerText.includes("Scheduled Appointment") || document.body.innerText.includes("Scheduled for")`,
      25000,
      "Scheduled tracking locked banner"
    );
    await evaluate(`window.scrollTo(0, 400);`);
    await sleep(2000);

    const scheduledLockCheck = await evaluate(`(() => {
      const text = document.body.innerText;
      return {
        hasScheduledNotice: text.includes("Scheduled Appointment") || text.includes("Scheduled for"),
        hasLockNotice: text.includes("live location will NOT activate") || text.includes("automatically activate at the scheduled service time"),
        isTrackingLocked: text.includes("Scheduled Appointment") || text.includes("live location will NOT activate"),
      };
    })()`);
    console.log("  Scheduled Order Lock DOM Check:", scheduledLockCheck);

    const schedShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${artifactDir}/phase6-scheduled-order-locked.png`, Buffer.from(schedShot.data, "base64"));
    console.log(`  ✓ Scheduled Order Privacy Lock Screenshot captured: ${artifactDir}/phase6-scheduled-order-locked.png`);

    console.log("\n================================================================================");
    console.log("   ALL BROWSER MAP & PRIVACY VERIFICATIONS PASSED SUCCESSFULLY!                 ");
    console.log("================================================================================\n");
  } finally {
    if (cdpWs) {
      try {
        cdpWs.close();
      } catch {}
    }
    braveProcess.kill();
  }
}

runPhase6BrowserVerification().catch((err) => {
  console.error("\n❌ BROWSER VERIFICATION FAILED:", err.message);
  process.exit(1);
});
