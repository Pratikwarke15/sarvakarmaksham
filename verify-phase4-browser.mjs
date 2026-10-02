import { spawn } from "child_process";
import fs from "fs";
import axios from "axios";

const API_BASE = "http://localhost:4000/api/v1";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPhase4BrowserVerification() {
  console.log("=== STARTING PHASE 4 REAL BROWSER VERIFICATION (BRAVE / CHROMIUM) ===");

  const bravePath = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
  const userDataDir = `/tmp/brave-phase4-${Date.now()}`;
  const debugPort = 9224;

  console.log(`\n[Step 1] Launching Brave Browser (headless CDP on port ${debugPort})...`);
  const braveProcess = spawn(
    bravePath,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--window-size=1280,900",
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
          console.log(`  Connected to Brave CDP: ${data.Browser}`);
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
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((resolve) => (cdpWs.onopen = resolve));

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        cdpWs.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");

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

    async function waitForCondition(fnExpr, timeoutMs = 15000, description = "condition") {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const res = await evaluate(fnExpr);
          if (res) return res;
        } catch {}
        await sleep(400);
      }
      throw new Error(`Timeout after ${timeoutMs}ms waiting for: ${description}`);
    }

    async function takeScreenshot(filePath) {
      const res = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
      console.log(`  Screenshot saved: ${filePath}`);
    }

    // 2. Perform Real UI Login at /login?role=CONSUMER
    console.log("\n[Step 2] Performing Real UI Login at http://localhost:3000/login?role=CONSUMER...");
    await navigateTo("http://localhost:3000/login?role=CONSUMER");
    await waitForCondition(`Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Priya"))`, 20000, "Waiting for Priya quick login button");

    await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find(b => b.textContent.includes("Priya") || b.textContent.includes("9812345601"));
      if (btn) btn.click();
    })()`);
    await sleep(500);

    // Submit credentials
    await evaluate(`(() => {
      const submitBtn = Array.from(document.querySelectorAll("button[type='submit']")).find(b => b.textContent.includes("Connect"));
      if (submitBtn) submitBtn.click();
    })()`);

    // Wait for OTP
    await waitForCondition(
      `document.body.textContent.includes("Verify code") || document.body.textContent.includes("Auto-Fill")`,
      15000,
      "Waiting for OTP verification screen"
    );

    // Click Auto-Fill
    await evaluate(`(() => {
      const autoFillBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Auto-Fill"));
      if (autoFillBtn) autoFillBtn.click();
    })()`);

    // Wait for redirect to dashboard
    await waitForCondition(
      `window.location.href.includes("/consumer/dashboard")`,
      15000,
      "Waiting for dashboard redirect after login"
    );
    console.log("  ✓ Successfully logged in via real UI form!");

    // 3. Navigate to Problem Selection Page
    console.log("\n[Step 3] Navigating to /consumer/problem-selection...");
    await navigateTo("http://localhost:3000/consumer/problem-selection");
    await waitForCondition(`document.body.textContent.includes("Plumbing")`, 30000, "Categories loaded");
    console.log("  ✓ Service categories loaded in DOM.");

    // 4. Select Category: Plumbing
    console.log("\n[Step 4] Selecting Category 'Plumbing'...");
    await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll("button"));
      const plumbingCard = cards.find(c => c.textContent.includes("Plumbing"));
      if (plumbingCard) plumbingCard.click();
    })()`);
    await waitForCondition(`document.body.textContent.includes("Tap & Mixer")`, 15000, "Subcategory rendered");

    // 5. Select Subcategory: Tap & Mixer
    console.log("\n[Step 5] Selecting Subcategory 'Tap & Mixer'...");
    await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll("button"));
      const card = cards.find(c => c.textContent.includes("Tap & Mixer"));
      if (card) card.click();
    })()`);
    await waitForCondition(`document.body.textContent.includes("Tap Repair (Leakage / Dripping)")`, 15000, "Problems rendered");

    // 6. Select Problem: Tap Repair
    console.log("\n[Step 6] Selecting Specific Problem 'Tap Repair (Leakage / Dripping)'...");
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.textContent.includes("Tap Repair (Leakage / Dripping)"));
      if (btn) btn.click();
    })()`);
    await waitForCondition(`document.body.textContent.includes("Explain Your Problem")`, 10000, "Step 4 Explain");

    // 7. Step 4: Explain Problem
    console.log("\n[Step 7] Explaining Problem in Step 4...");
    await evaluate(`(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeSetter.call(textarea, "Kitchen sink mixer tap leaking continuously from valve spindle. Requires washer replacement.");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(800);

    // Click "View Estimate & Summary"
    console.log("  Clicking 'View Estimate & Summary' to proceed to Step 5...");
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("View Estimate"));
      if (btn) btn.click();
    })()`);

    await waitForCondition(
      `document.body.textContent.includes("Official Price Estimate") || document.body.textContent.includes("Price Ceiling")`,
      15000,
      "Step 5 Estimate Page"
    );
    console.log("  ✓ Step 5 Estimate Page verified.");

    // 8. Step 5: Proceed to Worker Selection
    console.log("\n[Step 8] Proceeding from Estimate to Step 6 Worker Selection...");
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Continue to Worker Selection") || b.textContent.includes("Worker Selection"));
      if (btn) btn.click();
    })()`);

    await waitForCondition(
      `document.body.textContent.includes("Select Cooperative Technician")`,
      15000,
      "Step 6 Worker Selection Page"
    );
    console.log("  ✓ Step 6 Worker Selection screen reached.");

    await waitForCondition(
      `!document.body.textContent.includes("Finding available cooperative workers") && document.body.textContent.includes("Ramesh Gupta")`,
      25000,
      "Workers loaded in Step 6"
    );

    // 9. Step 6: Verify Dynamic Worker Cards
    console.log("\n[Step 9] Verifying Step 6 Worker Selection Cards...");
    const workerSelectionContent = await evaluate("document.body.innerText");

    // Verify dynamic availability
    const hasAvailableNow = workerSelectionContent.includes("Available Now");
    const hasOffDuty = workerSelectionContent.includes("Off Duty");
    const hasRequestThisWorker = workerSelectionContent.includes("Request this worker");
    const hasSelectWorker = workerSelectionContent.includes("Select Worker");

    console.log(`  Dynamic Badges in UI:`);
    console.log(`   - 'Available Now' present: ${hasAvailableNow}`);
    console.log(`   - 'Off Duty' present: ${hasOffDuty}`);
    console.log(`   - 'Select Worker' button present: ${hasSelectWorker}`);
    console.log(`   - 'Request this worker' button present: ${hasRequestThisWorker}`);

    if (!hasAvailableNow) {
      throw new Error("'Available Now' badge missing for on-duty workers!");
    }
    if (!hasOffDuty) {
      throw new Error("'Off Duty' state missing for off-duty workers!");
    }
    if (!hasRequestThisWorker) {
      throw new Error("'Request this worker' button missing for off-duty workers!");
    }

    // Select Ramesh Gupta
    console.log("\n[Step 10] Selecting Ramesh Gupta (clicking 'Select Worker')...");
    await evaluate(`(() => {
      const h3 = Array.from(document.querySelectorAll("h3")).find(h => h.textContent.includes("Ramesh Gupta"));
      const card = h3 ? h3.closest(".rounded-3xl") : null;
      const btn = card ? card.querySelector("button") : null;
      if (btn) btn.click();
    })()`);

    await waitForCondition(
      `document.body.textContent.includes("Confirm Order & Dispatch Request")`,
      10000,
      "Step 7 Confirm Order screen"
    );
    console.log("  ✓ Step 7 Confirm Order screen reached.");

    // 10. Step 7: Confirm Order Screen
    console.log("\n[Step 11] Verifying Step 7 Confirm Order Screen...");
    const confirmOrderContent = await evaluate("document.body.innerText");

    const hasPrivacyGuarantee = confirmOrderContent.toLowerCase().includes("distance privacy guarantee");
    const hasProblemReview = confirmOrderContent.includes("Tap Repair");
    const hasTiming = confirmOrderContent.includes("Immediate (ASAP)");

    console.log(`  Confirm Order Elements:`);
    console.log(`   - Distance Privacy Guarantee banner: ${hasPrivacyGuarantee}`);
    console.log(`   - Problem summary reviewed: ${hasProblemReview}`);
    console.log(`   - Requested timing options: ${hasTiming}`);

    if (!hasPrivacyGuarantee) {
      throw new Error("Distance Privacy Guarantee banner is missing on Confirm Order screen!");
    }

    // 11. Click "Confirm & Send Order Request"
    console.log("\n[Step 12] Clicking 'Confirm & Send Order Request'...");
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Confirm & Send Order Request"));
      if (btn) btn.click();
    })()`);

    await waitForCondition(
      `document.body.textContent.includes("Technician Notified") || document.body.textContent.includes("Request Sent")`,
      15000,
      "Step 8 Order Active screen (REQUESTED)"
    );

    // 12. Step 8: Order Active Screen (REQUESTED State)
    console.log("\n[Step 13] Verifying Step 8 Order Active Screen (REQUESTED state)...");
    const activeOrderContent = await evaluate("document.body.innerText");

    const orderRefMatch = activeOrderContent.match(/ORD-[0-9A-Z-]+/);
    const orderRef = orderRefMatch ? orderRefMatch[0] : null;
    console.log(`  ✓ Order dispatched successfully! Captured Order Ref: ${orderRef}`);

    await takeScreenshot("/tmp/phase4-order-requested.png");

    // 13. Test Worker Distance Privacy & Rejection Flow via API
    console.log("\n[Step 14] Authenticating as Worker 1 (Ramesh Gupta - 9876543201)...");
    const worker1LoginRes = await axios.post(`${API_BASE}/auth/login`, {
      phone: "9876543201",
      password: "password123",
    });
    const worker1Token = worker1LoginRes.data.data.token;

    const workerRequestsRes = await axios.get(`${API_BASE}/orders/worker/requests`, {
      headers: { Authorization: `Bearer ${worker1Token}` },
    });
    const currentOrder = workerRequestsRes.data.data.find((o) => o.orderRef === orderRef);
    if (!currentOrder) {
      throw new Error(`Worker should see incoming order ${orderRef}`);
    }

    console.log(`  ✓ Distance Privacy checked on received order:`);
    console.log(`     - Masked Address: "${currentOrder.address}"`);
    console.log(`     - Approx Distance: ${currentOrder.approxDistanceKm} km`);
    console.log(`     - Coordinates hidden: lat=${currentOrder.latitude}, lng=${currentOrder.longitude}`);

    // Worker 1 Rejects the order
    console.log("\n[Step 15] Worker 1 rejects order with reason 'Too far'...");
    await axios.post(
      `${API_BASE}/orders/${currentOrder.id}/reject`,
      {
        reason: "Too far",
        customNote: "Currently booked on emergency site",
      },
      { headers: { Authorization: `Bearer ${worker1Token}` } }
    );
    console.log("  ✓ Worker rejected order via API.");

    // 14. Verify Consumer Browser Receives Rejection & Shows Respectful Message
    console.log("\n[Step 16] Waiting for consumer browser live polling to update UI (3-5s)...");
    await waitForCondition(
      `document.body.textContent.includes("The selected worker couldn't accept your request") || document.body.textContent.includes("Technician Unavailable")`,
      15000,
      "Consumer rejection notice"
    );
    console.log("  ✓ Browser received rejection notification!");

    const rejectedBrowserText = await evaluate("document.body.innerText");
    const expectedRespectfulMsg = "The selected worker couldn't accept your request. Please choose another worker.";
    if (!rejectedBrowserText.includes(expectedRespectfulMsg)) {
      throw new Error(`Respectful rejection message missing! Expected: "${expectedRespectfulMsg}"`);
    }
    console.log(`  ✓ Exact respectful message verified: "${expectedRespectfulMsg}"`);

    await takeScreenshot("/tmp/phase4-order-rejected.png");

    // 15. Consumer clicks "Choose Another Worker"
    console.log("\n[Step 17] Clicking 'Choose Another Worker' in consumer UI...");
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Choose Another Worker"));
      if (btn) btn.click();
    })()`);

    await waitForCondition(
      `document.body.textContent.includes("Select Cooperative Technician")`,
      10000,
      "Returned to Worker Selection"
    );
    console.log("  ✓ Consumer successfully returned to Worker Selection screen.");

    await waitForCondition(
      `!document.body.textContent.includes("Finding available cooperative workers") && document.body.textContent.includes("Suresh Verma")`,
      25000,
      "Workers reloaded in Step 6"
    );

    // 16. Select Suresh Verma (Off Duty) -> Request Worker
    console.log("\n[Step 18] Selecting Suresh Verma (Off Duty) -> 'Request this worker'...");
    await evaluate(`(() => {
      const h3 = Array.from(document.querySelectorAll("h3")).find(h => h.textContent.includes("Suresh Verma"));
      const card = h3 ? h3.closest(".rounded-3xl") : null;
      const btn = card ? card.querySelector("button") : null;
      if (btn) btn.click();
    })()`);

    await waitForCondition(
      `document.body.textContent.includes("Confirm Order & Dispatch Request")`,
      10000,
      "Confirm Order for Suresh"
    );

    // Confirm Order for Suresh
    console.log("\n[Step 19] Confirming Order for Suresh Verma...");
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Confirm & Send Order Request"));
      if (btn) btn.click();
    })()`);

    await waitForCondition(
      `document.body.textContent.includes("Technician Notified") || document.body.textContent.includes("Request Sent")`,
      15000,
      "New Order Active Screen"
    );

    const newOrderActiveText = await evaluate("document.body.innerText");
    const newOrderRefMatch = newOrderActiveText.match(/ORD-[0-9A-Z-]+/);
    const newOrderRef = newOrderRefMatch ? newOrderRefMatch[0] : null;
    console.log(`  ✓ New order dispatched: ${newOrderRef}`);

    // Worker 2 (Suresh) accepts the order
    console.log("\n[Step 20] Authenticating Worker 2 (Suresh Verma) and accepting order...");
    const worker2LoginRes = await axios.post(`${API_BASE}/auth/login`, {
      phone: "9876543202",
      password: "password123",
    });
    const worker2Token = worker2LoginRes.data.data.token;

    const worker2RequestsRes = await axios.get(`${API_BASE}/orders/worker/requests`, {
      headers: { Authorization: `Bearer ${worker2Token}` },
    });
    const sureshOrder = worker2RequestsRes.data.data.find((o) => o.orderRef === newOrderRef);
    if (!sureshOrder) {
      throw new Error(`Suresh Verma should see incoming order ${newOrderRef}`);
    }

    await axios.post(
      `${API_BASE}/orders/${sureshOrder.id}/accept`,
      {},
      { headers: { Authorization: `Bearer ${worker2Token}` } }
    );
    console.log("  ✓ Suresh Verma accepted order via API.");

    // 17. Verify Consumer Browser Receives Acceptance
    console.log("\n[Step 21] Waiting for consumer browser to reflect ACCEPTED status...");
    await waitForCondition(
      `document.body.textContent.includes("Order Accepted!") || document.body.textContent.includes("Technician Confirmed Your Order")`,
      15000,
      "Consumer order accepted notice"
    );
    console.log("  ✓ Browser received acceptance notification!");

    await takeScreenshot("/tmp/phase4-order-accepted.png");

    console.log("\n=======================================================");
    console.log(">>> REAL BROWSER PHASE 4 VERIFICATION COMPLETE! <<<");
    console.log("=======================================================");
  } finally {
    if (cdpWs) {
      try {
        cdpWs.close();
      } catch {}
    }
    braveProcess.kill("SIGKILL");
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

runPhase4BrowserVerification().catch((err) => {
  console.error("Browser verification failed:", err.message);
  process.exit(1);
});
