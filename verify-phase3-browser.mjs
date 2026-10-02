import { spawn } from "child_process";
import fs from "fs";

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserVerification() {
  console.log("=== STARTING PHASE 3 REAL BROWSER & CEILING VERIFICATION (BRAVE / CHROMIUM) ===");

  const bravePath = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
  const userDataDir = `/tmp/brave-test-${Date.now()}`;
  const debugPort = 9222;

  // 1. Launch Brave Browser in headless mode with remote debugging port
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
    // Wait for CDP port to be open
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
      throw new Error("Could not connect to Brave DevTools Protocol on port 9222");
    }

    // Get list of targets/pages
    const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    console.log(`  Target Page WebSocket: ${pageTarget.webSocketDebuggerUrl}`);

    // Create simple CDP Client using native WebSocket
    cdpWs = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let msgId = 1;
    const pending = new Map();
    const consoleLogs = [];
    const networkFailures = [];

    cdpWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.consoleAPICalled") {
        const text = msg.params.args.map((a) => a.value || a.description || "").join(" ");
        consoleLogs.push(`[Console ${msg.params.type}] ${text}`);
      }
      if (msg.method === "Network.responseReceived") {
        const { status, url } = msg.params.response;
        if (status >= 400 && !url.includes("favicon")) {
          networkFailures.push(`${status} ${url}`);
        }
      }
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
      let loaded = false;
      for (let i = 0; i < 30; i++) {
        await sleep(500);
        const state = await evaluate("document.readyState");
        if (state === "complete") {
          loaded = true;
          break;
        }
      }
      if (!loaded) console.warn(`Page didn't reach readyState complete for ${url}`);
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

    // 2. Perform Real UI Login at http://localhost:3000/login?role=CONSUMER
    console.log("\n[Step 2] Testing UI Login page at http://localhost:3000/login?role=CONSUMER...");
    await navigateTo("http://localhost:3000/login?role=CONSUMER");
    await waitForCondition(`Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Priya"))`, 25000, "Waiting for Priya quick login button");

    console.log("  Clicking 'Demo Consumer (Priya - 9812345601)' quick login button...");
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find(b => b.textContent.includes("Priya") || b.textContent.includes("9812345601"));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);

    // Submit the credentials form
    console.log("  Submitting credentials form (Connect as Consumer)...");
    await evaluate(`
      (() => {
        const submitBtn = Array.from(document.querySelectorAll("button[type='submit']")).find(b => b.textContent.includes("Connect"));
        if (submitBtn) submitBtn.click();
      })()
    `);

    // Wait for OTP step or error
    await sleep(2000);
    const bodyText = await evaluate("document.body.innerText");
    if (bodyText.toLowerCase().includes("network error")) {
      throw new Error(`Login failed with Network Error! Page body text: ${bodyText.slice(0, 300)}`);
    }

    console.log("  No Network Error! Waiting for OTP verification prompt...");
    await waitForCondition(
      `document.body.textContent.includes("Verify code") || document.body.textContent.includes("Auto-Fill")`,
      15000,
      "Waiting for OTP verification screen"
    );

    // Click Auto-Fill button for demo OTP
    console.log("  Clicking Auto-Fill button for OTP...");
    await evaluate(`
      (() => {
        const autoFillBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Auto-Fill"));
        if (autoFillBtn) autoFillBtn.click();
      })()
    `);

    // Wait for redirect to /consumer/dashboard
    console.log("  Waiting for redirect to /consumer/dashboard...");
    await waitForCondition(
      `window.location.href.includes("/consumer/dashboard")`,
      15000,
      "Waiting for consumer dashboard redirect after login"
    );
    console.log("  Successfully logged in via real UI form!");

    // 3. Navigate to problem selection
    console.log("\n[Step 3] Navigating to http://localhost:3000/consumer/problem-selection...");
    await navigateTo("http://localhost:3000/consumer/problem-selection");
    await waitForCondition(`document.body.textContent.includes("Plumbing")`, 30000, "Categories rendered");

    // 4. Select Plumbing
    console.log("\n[Step 4] Selecting Plumbing Category...");
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("button"));
        const plumbingCard = cards.find(c => c.textContent.includes("Plumbing"));
        if (plumbingCard) plumbingCard.click();
      })()
    `);
    await waitForCondition(`document.body.textContent.includes("Tap & Mixer")`, 15000, "Subcategory rendered");

    // 5. Select Tap & Mixer
    console.log("\n[Step 5] Selecting 'Tap & Mixer' Subcategory...");
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("button"));
        const card = cards.find(c => c.textContent.includes("Tap & Mixer"));
        if (card) card.click();
      })()
    `);
    await waitForCondition(`document.body.textContent.includes("Tap Repair (Leakage / Dripping)")`, 15000, "Problems rendered");

    // 6. Select Tap Repair
    console.log("\n[Step 6] Selecting 'Tap Repair (Leakage / Dripping)'...");
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const btn = btns.find(b => b.textContent.includes("Tap Repair (Leakage / Dripping)"));
        if (btn) btn.click();
      })()
    `);
    await waitForCondition(`document.body.textContent.includes("Explain Your Problem")`, 8000, "Step 4 Explain");

    // 7. Type explanation
    console.log("\n[Step 7] Entering problem explanation in textarea...");
    await evaluate(`
      (() => {
        const textarea = document.querySelector("textarea");
        if (textarea) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
          nativeSetter.call(textarea, "Kitchen sink mixer tap leaking continuously from valve spindle. Requires washer replacement.");
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
        }
      })()
    `);
    await sleep(800);

    // 8. Proceed to Step 5: View Estimate & Summary
    console.log("\n[Step 8] Clicking 'View Estimate & Summary' to enter Step 5...");
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("View Estimate"));
        if (btn) btn.click();
      })()
    `);
    await waitForCondition(`document.body.textContent.includes("Step 5") || document.body.textContent.includes("Official Price Estimate")`, 15000, "Step 5 Estimate Page");

    // 9. Verify Phase 3 Separated Cost Components in Browser DOM
    console.log("\n[Step 9] Verifying Phase 3 Separated Cost Components in Browser DOM...");
    const breakdownChecks = await evaluate(`
      (() => {
        const text = document.body.innerText.toLowerCase();
        return {
          hasProblemName: text.includes("tap repair (leakage / dripping)"),
          hasDuration: text.includes("30 mins") || text.includes("duration"),
          hasPricingUnit: text.includes("per tap"),
          hasLabour: text.includes("estimated labour"),
          hasMaterialDisclaimer: text.includes("additional material cost may apply after inspection"),
          hasInspectionFee: text.includes("visit / inspection fee") || text.includes("inspection fee"),
          hasPlatformFee: text.includes("platform fee"),
          hasCeiling: text.includes("price ceiling") || text.includes("ceiling"),
          hasDisclaimer: text.includes("pricing disclaimer:"),
          hasContinueBtn: Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Continue to Worker Selection")),
          hasSaveDraftBtn: Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Save Problem Draft")),
        };
      })()
    `);

    console.log("  DOM Checks Result:", JSON.stringify(breakdownChecks, null, 2));

    if (!breakdownChecks.hasProblemName) throw new Error("Missing problem name on estimate page");
    if (!breakdownChecks.hasLabour) throw new Error("Missing Estimated Labour component breakdown");
    if (!breakdownChecks.hasMaterialDisclaimer) throw new Error("Missing mandatory Material disclaimer");
    if (!breakdownChecks.hasInspectionFee) throw new Error("Missing Visit / Inspection fee separation");
    if (!breakdownChecks.hasPlatformFee) throw new Error("Missing Platform fee separation");
    if (!breakdownChecks.hasCeiling) throw new Error("Missing Worker Price Ceiling display");
    if (!breakdownChecks.hasDisclaimer) throw new Error("Missing Pricing Disclaimer");
    if (!breakdownChecks.hasContinueBtn) throw new Error("Missing 'Continue to Worker Selection' button");
    console.log("  ✓ All Phase 3 estimate components and disclaimers verified in DOM!");

    // 10. Click "Continue to Worker Selection"
    console.log("\n[Step 10] Clicking 'Continue to Worker Selection'...");
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Continue to Worker Selection"));
        if (btn) btn.click();
      })()
    `);

    // 11. Verify Step 6: Worker Selection Screen
    console.log("\n[Step 11] Verifying Step 6: Worker Selection Screen...");
    await waitForCondition(`
      document.body.textContent.includes("Select Cooperative Technician") &&
      Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Select Worker"))
    `, 25000, "Step 6 Worker Selection Screen and Worker Cards");

    const workerScreenChecks = await evaluate(`
      (() => {
        const text = document.body.innerText.toLowerCase();
        return {
          hasHeading: text.includes("select cooperative technician"),
          hasCeilingNotice: text.includes("cooperative price ceiling protection"),
          hasWorkers: text.includes("rajesh kumar") || text.includes("ramesh verma") || text.includes("verified"),
          hasSelectWorkerBtn: Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("Select Worker")),
        };
      })()
    `);

    console.log("  Worker Screen Checks:", JSON.stringify(workerScreenChecks, null, 2));
    if (!workerScreenChecks.hasHeading || !workerScreenChecks.hasCeilingNotice) {
      throw new Error("Failed to render Worker Selection screen with price ceiling protection notice");
    }
    console.log("  ✓ Worker Selection interface verified with cooperative ceiling protection notice!");

    // 12. Select a technician
    console.log("\n[Step 12] Selecting first available cooperative technician...");
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Select Worker"));
        if (btn) btn.click();
      })()
    `);

    // 13. Verify Worker Assigned & Price Locked Confirmation
    console.log("\n[Step 13] Verifying Worker Assigned Confirmation...");
    await waitForCondition(`
      document.body.textContent.includes("Cooperative Technician Assigned!") ||
      document.body.textContent.includes("Worker Selected")
    `, 10000, "Worker Assigned Confirmation Screen");

    const confirmationInfo = await evaluate(`
      (() => {
        const text = document.body.innerText;
        const refMatch = text.match(/PR-\\d+-[A-Z0-9]+/);
        return {
          ref: refMatch ? refMatch[0] : null,
          isAssigned: text.includes("Cooperative Technician Assigned!"),
          hasCeilingNotice: text.includes("Price Protection Notice"),
        };
      })()
    `);

    console.log("  Confirmation Details:", JSON.stringify(confirmationInfo, null, 2));
    if (!confirmationInfo.isAssigned || !confirmationInfo.ref) {
      throw new Error("Worker assignment confirmation screen failed");
    }
    console.log(`  ✓ Successfully selected worker for reference ${confirmationInfo.ref}!`);

    // 14. Backend Ceiling Enforcement API Verification
    console.log("\n[Step 14] Testing Backend Ceiling Enforcement API (HTTP 400 rejection on excessive quotes)...");
    const problemId = await evaluate(`
      (async () => {
        const res = await fetch("http://localhost:4000/api/v1/services/categories/plumbing");
        const data = await res.json();
        const sub = data.data.subcategories.find(s => s.slug === "tap-mixer");
        const prob = sub.problems.find(p => p.name.includes("Tap Repair"));
        return prob.id;
      })()
    `);

    // Propose ₹2,000 for ceiling ₹299
    const rejectionRes = await evaluate(`
      (async () => {
        const res = await fetch("http://localhost:4000/api/v1/pricing/validate-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemId: "${problemId}",
            quotedAmount: 2000,
            hasAdditionalWork: false
          })
        });
        const body = await res.json();
        return { status: res.status, body };
      })()
    `);

    console.log(`  API Response for ₹2,000 quote (Ceiling ₹299): HTTP ${rejectionRes.status}`);
    console.log(`  API Error Message: "${rejectionRes.body.error}"`);
    if (rejectionRes.status !== 400 || !rejectionRes.body.error.includes("exceeds the maximum worker bargaining ceiling")) {
      throw new Error(`Expected HTTP 400 rejection for quote above ceiling, got: ${rejectionRes.status}`);
    }
    console.log("  ✓ Backend strictly rejected excessive quote outside ceiling!");

    // Propose valid quote ₹180
    const acceptanceRes = await evaluate(`
      (async () => {
        const res = await fetch("http://localhost:4000/api/v1/pricing/validate-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemId: "${problemId}",
            quotedAmount: 180,
            hasAdditionalWork: false
          })
        });
        const body = await res.json();
        return { status: res.status, body };
      })()
    `);

    console.log(`  API Response for ₹180 quote (Ceiling ₹299): HTTP ${acceptanceRes.status}`);
    if (acceptanceRes.status !== 200 || !acceptanceRes.body.data.valid) {
      throw new Error(`Expected HTTP 200 acceptance for valid quote, got: ${acceptanceRes.status}`);
    }
    console.log("  ✓ Backend accepted fair quote within ceiling!");

    console.log("\n=== ALL 14 PHASE 3 REAL BROWSER & CEILING TESTS COMPLETED SUCCESSFULLY! ===");
  } finally {
    if (cdpWs) cdpWs.close();
    braveProcess.kill("SIGTERM");
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

runBrowserVerification().catch((err) => {
  console.error("Phase 3 Browser Verification failed:", err);
  process.exit(1);
});
