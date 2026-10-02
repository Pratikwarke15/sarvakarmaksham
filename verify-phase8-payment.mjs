import { spawn } from "child_process";
import fs from "fs";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const API_BASE = "http://localhost:4000/api/v1";
const WEB_BASE = "http://localhost:3000";
const prisma = new PrismaClient();
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

async function apiPatchWithRetry(url, data, config, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.patch(url, data, config);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000);
    }
  }
}

class CDPClient {
  constructor(wsUrl, name = "Client") {
    this.wsUrl = wsUrl;
    this.name = name;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        const text = msg.params.args.map((a) => a.value || a.description).join(" ");
        console.log(`  [${this.name} Browser Error]`, text.substring(0, 160));
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("DOM.enable");
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`[${this.name}] Evaluation error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async navigateTo(url) {
    await this.send("Page.navigate", { url });
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      try {
        const state = await this.evaluate("document.readyState");
        if (state === "complete") break;
      } catch {}
    }
  }

  async waitForCondition(fnExpr, timeoutMs = 25000, description = "condition") {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await this.evaluate(fnExpr);
        if (res) return res;
      } catch {}
      await sleep(500);
    }
    let currentUrl = "unknown";
    let snippet = "empty";
    try {
      currentUrl = await this.evaluate("window.location.href");
      snippet = await this.evaluate("document.body ? document.body.innerText.substring(0, 400) : 'none'");
    } catch {}
    throw new Error(`[${this.name}] Timeout after ${timeoutMs}ms waiting for: ${description}. URL: ${currentUrl}. Page snippet: ${JSON.stringify(snippet)}`);
  }

  async captureScreenshot(filepath) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(filepath, Buffer.from(data, "base64"));
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

async function dbRetry(fn, maxRetries = 5, delayMs = 1000) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.log(`  [Database] Retry ${attempt}/${maxRetries} after error: ${err.message || err}`);
      await sleep(delayMs * attempt);
    }
  }
  throw lastErr;
}

async function runPhase81PaymentVerification() {
  console.log("================================================================================");
  console.log("   PHASE 8.1 — PAYMENT SETTLEMENT CORRECTION & 5% LEVY VERIFICATION            ");
  console.log("================================================================================\n");

  const testResults = {};

  const bravePath = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
  const userDataDir = `/tmp/brave-phase81-${Date.now()}`;
  const debugPort = 9229;
  const artifactDir = "/Users/apple/.gemini/antigravity-ide/brain/a5eb2677-40ff-48ad-a2a2-b4b557f63bdf";

  console.log(`[Step 1] Launching Headless Browser (CDP on port ${debugPort})...`);
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

  let consumerCdp = null;
  let workerCdp = null;

  try {
    let connected = false;
    for (let i = 0; i < 25; i++) {
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

    if (!connected) throw new Error("Could not connect to Brave browser on port 9229");

    const tabsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const tabs = await tabsRes.json();
    const firstTabWs = tabs[0].webSocketDebuggerUrl;
    consumerCdp = new CDPClient(firstTabWs, "Consumer");
    await consumerCdp.connect();
    console.log("  ✓ Consumer Tab attached to CDP");

    const newTabRes = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" });
    const newTabData = await newTabRes.json();
    workerCdp = new CDPClient(newTabData.webSocketDebuggerUrl, "Worker");
    await workerCdp.connect();
    console.log("  ✓ Worker Tab attached to CDP");

    // -------------------------------------------------------------------------
    // Step 2: Authenticate Consumer and Worker
    // -------------------------------------------------------------------------
    console.log("\n[Step 2] Authenticating Consumer and Worker accounts...");
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

    console.log(`  ✓ Consumer Authenticated: ${consumerUser.name} (${consumerUser.id})`);
    console.log(`  ✓ Worker Authenticated: ${workerUser.name} (${workerUser.id})`);

    // Clean up any stale active orders for test consumer to ensure clean testbed
    await dbRetry(() => prisma.order.updateMany({
      where: {
        consumerId: consumerUser.id,
        status: { in: ["REQUESTED", "ACCEPTED", "NEGOTIATION", "CONFIRMED", "TRAVELLING", "ARRIVED", "IN_PROGRESS", "PAYMENT_PENDING"] }
      },
      data: { status: "CANCELLED" }
    }));

    // Record initial worker earnings before test
    const initialSummary = await apiGetWithRetry(`${API_BASE}/workers/dashboard-summary`, workerHeaders);
    const initialWallet = Number(initialSummary.data.data.earnings.walletBalance || 0);
    const initialTotalEarned = Number(initialSummary.data.data.earnings.totalEarnings || 0);
    const initialCompletedCount = initialSummary.data.data.completedJobs?.length || 0;
    console.log(`  ✓ Baseline Worker Balance: ₹${initialWallet}, Total Earned: ₹${initialTotalEarned}, Completed Jobs: ${initialCompletedCount}`);

    // -------------------------------------------------------------------------
    // Step 3: Create a Fresh Service Order with Agreed Amount ₹500
    // -------------------------------------------------------------------------
    console.log("\n[Step 3] Creating a fresh service order with service amount ₹500 (Concrete test transaction)...");
    const catalogRes = await apiGetWithRetry(`${API_BASE}/services/categories?available=true`, consumerHeaders);
    const plumbingCat = catalogRes.data.data.find((c) => c.slug === "plumbing") || catalogRes.data.data[0];
    const tapSubcat = plumbingCat.subcategories[0];
    const problem = tapSubcat.problems[0];

    const workerProfileRes = await apiGetWithRetry(`${API_BASE}/workers/profile`, workerHeaders);
    const workerProfileId = workerProfileRes.data.data.id;

    const draftRes = await apiPostWithRetry(
      `${API_BASE}/problem-requests/draft`,
      {
        categoryId: plumbingCat.id,
        subcategoryId: tapSubcat.id,
        problemId: problem.id,
        textDescription: "Comprehensive Sanitary & Water Line Repair",
        address: "Flat 501, Nilgiri Heights, Viman Nagar, Pune",
        latitude: 18.5679,
        longitude: 73.9143,
      },
      consumerHeaders
    );

    const createOrderRes = await apiPostWithRetry(
      `${API_BASE}/orders`,
      {
        problemRequestId: draftRes.data.data.id,
        workerId: workerProfileId,
        bookingMode: "IMMEDIATE",
        address: "Flat 501, Nilgiri Heights, Viman Nagar, Pune",
        latitude: 18.5679,
        longitude: 73.9143,
      },
      consumerHeaders
    );
    const order = createOrderRes.data.data;
    const orderId = order.id;

    // Authoritative agreed final price: ₹500
    const TEST_FINAL_PRICE = 500;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        basePrice: TEST_FINAL_PRICE,
        finalPrice: TEST_FINAL_PRICE,
        quotedPrice: TEST_FINAL_PRICE,
        isPriceLocked: true,
      },
    });

    console.log(`  ✓ Created Order: ${order.orderRef} (${orderId}) with agreed price ₹${TEST_FINAL_PRICE}`);
    console.log(`  ✓ Initial Payment Status: ${order.paymentStatus || "NOT_DUE"}`);

    // -------------------------------------------------------------------------
    // Step 4: Advance Operational Lifecycle: Worker accepts -> travels -> arrives -> works
    // -------------------------------------------------------------------------
    console.log("\n[Step 4] Advancing operational stages: Worker accepts -> travels -> arrives -> starts work...");
    await apiPostWithRetry(`${API_BASE}/orders/${orderId}/accept`, {}, workerHeaders);
    console.log("  ✓ Stage 2: ACCEPTED");

    await apiPatchWithRetry(`${API_BASE}/orders/${orderId}/operational-state`, { operationalState: "TRAVELLING" }, workerHeaders);
    console.log("  ✓ Stage 3: TRAVELLING");

    await apiPatchWithRetry(`${API_BASE}/orders/${orderId}/operational-state`, { operationalState: "ARRIVED" }, workerHeaders);
    console.log("  ✓ Stage 4: ARRIVED");

    await apiPatchWithRetry(`${API_BASE}/orders/${orderId}/operational-state`, { operationalState: "WORKING" }, workerHeaders);
    console.log("  ✓ Stage 5: IN_PROGRESS (Service being performed)");

    // -------------------------------------------------------------------------
    // TEST 1 — COMPLETED → PAYMENT_PENDING
    // -------------------------------------------------------------------------
    console.log("\n[Step 5] Worker completes service work. Advancing to COMPLETED operational state...");
    const workCompleteRes = await apiPatchWithRetry(
      `${API_BASE}/orders/${orderId}/operational-state`,
      { operationalState: "COMPLETED" },
      workerHeaders
    );
    console.log(`  ✓ Operational state advanced: ${workCompleteRes.data.operationalState}`);

    const orderCheckRes = await apiGetWithRetry(`${API_BASE}/orders/${orderId}`, consumerHeaders);
    const orderAfterWork = orderCheckRes.data.data;
    console.log(`  ✓ Current Order Status: ${orderAfterWork.status}`);
    console.log(`  ✓ Current Payment Status: ${orderAfterWork.paymentStatus}`);
    console.log(`  ✓ Work Completed At: ${orderAfterWork.workCompletedAt}`);
    console.log(`  ✓ Final Confirmed Price: ₹${orderAfterWork.finalPrice}`);

    if (orderAfterWork.status === "PAYMENT_PENDING" && orderAfterWork.paymentStatus === "PAYMENT_PENDING" && orderAfterWork.workCompletedAt) {
      testResults["TEST 1 — COMPLETED → PAYMENT_PENDING"] = "PASSED";
      console.log("  ✓ TEST 1 PASSED: Order transitioned to PAYMENT_PENDING upon work completion with timestamp");
    } else {
      throw new Error(`TEST 1 FAILED: Expected PAYMENT_PENDING status, got ${orderAfterWork.status}/${orderAfterWork.paymentStatus}`);
    }

    // Verify worker wallet is NOT yet credited
    const midWorkerSummary = await apiGetWithRetry(`${API_BASE}/workers/dashboard-summary`, workerHeaders);
    const midWallet = Number(midWorkerSummary.data.data.earnings.walletBalance || 0);
    console.log(`  ✓ Worker Wallet balance before payment: ₹${midWallet} (Unchanged: ${midWallet === initialWallet})`);
    if (midWallet !== initialWallet) {
      throw new Error("Worker wallet balance was prematurely credited before payment!");
    }

    // -------------------------------------------------------------------------
    // TEST 2 — Consumer sees Pay Now
    // -------------------------------------------------------------------------
    console.log("\n[Step 6] Navigating Consumer Tab to verify Pay Now presentation...");
    await consumerCdp.navigateTo(`${WEB_BASE}/`);
    await sleep(600);
    await consumerCdp.evaluate(`(() => {
      const token = ${JSON.stringify(consumerToken)};
      const user = ${JSON.stringify(consumerUser)};
      sessionStorage.setItem("coopgig_token", token);
      localStorage.setItem("coopgig_token", token);
      sessionStorage.setItem("coopgig_user", typeof user === 'string' ? user : JSON.stringify(user));
      localStorage.setItem("coopgig_user", typeof user === 'string' ? user : JSON.stringify(user));
    })()`);
    await consumerCdp.navigateTo(`${WEB_BASE}/consumer/dashboard`);
    await consumerCdp.waitForCondition(`document.getElementById("consumer-order-payment-status") !== null`, 25000, "Consumer Payment Status Badge");

    const consumerBadgeText = await consumerCdp.evaluate(`document.getElementById("consumer-order-payment-status").innerText`);
    const hasPayNowBtn = await consumerCdp.evaluate(`document.getElementById("pay-now-btn") !== null`);
    console.log(`  ✓ Consumer UI Payment Badge: "${consumerBadgeText}"`);
    console.log(`  ✓ Consumer "Pay Now" Button visible: ${hasPayNowBtn}`);

    if (consumerBadgeText.includes("PAYMENT_PENDING") && hasPayNowBtn) {
      testResults["TEST 2 — Consumer sees Pay Now"] = "PASSED";
      console.log("  ✓ TEST 2 PASSED: Consumer dashboard displays PAYMENT_PENDING badge and [Pay Now] action");
    } else {
      throw new Error("TEST 2 FAILED: Pay Now button or PAYMENT_PENDING badge missing");
    }

    await consumerCdp.captureScreenshot(`${artifactDir}/phase8-payment-pending-consumer.png`);
    console.log("  ✓ Screenshot saved: phase8-payment-pending-consumer.png");

    // Also verify worker sees awaiting payment status
    await workerCdp.navigateTo(`${WEB_BASE}/`);
    await sleep(600);
    await workerCdp.evaluate(`(() => {
      const token = ${JSON.stringify(workerToken)};
      const user = ${JSON.stringify(workerUser)};
      sessionStorage.setItem("coopgig_token", token);
      localStorage.setItem("coopgig_token", token);
      sessionStorage.setItem("coopgig_user", typeof user === 'string' ? user : JSON.stringify(user));
      localStorage.setItem("coopgig_user", typeof user === 'string' ? user : JSON.stringify(user));
    })()`);
    await workerCdp.navigateTo(`${WEB_BASE}/worker/dashboard`);
    await workerCdp.waitForCondition(`document.getElementById("worker-awaiting-payment-badge") !== null`, 25000, "Worker Awaiting Payment Badge");
    console.log("  ✓ Worker Dashboard spotlight reflects work completed & awaiting consumer payment");
    await workerCdp.captureScreenshot(`${artifactDir}/phase8-worker-awaiting-payment.png`);
    console.log("  ✓ Screenshot saved: phase8-worker-awaiting-payment.png");

    // -------------------------------------------------------------------------
    // TEST 10 — Failed payment can retry
    // -------------------------------------------------------------------------
    console.log("\n[Step 7] Testing payment failure recording and clean retry capability...");
    const createPaymentOrderRes = await apiPostWithRetry(
      `${API_BASE}/orders/${orderId}/payment/create-order`,
      {},
      consumerHeaders
    );
    const rzpOrderData = createPaymentOrderRes.data.data;

    const failRes = await apiPostWithRetry(
      `${API_BASE}/orders/${orderId}/payment/fail`,
      {
        razorpayOrderId: rzpOrderData.razorpayOrderId,
        errorCode: "BAD_REQUEST_ERROR",
        errorDescription: "Consumer cancelled simulated modal",
        reason: "User cancelled modal",
      },
      consumerHeaders
    );
    const failData = failRes.data.data;
    console.log(`  ✓ Failure recorded: paymentStatus is now "${failData.paymentStatus}", canRetry: ${failData.canRetry}`);

    // Verify retry button remains available
    await consumerCdp.evaluate(`document.getElementById("consumer-order-status-badge")?.click()`);
    await sleep(1000);
    const retryAvailable = await consumerCdp.evaluate(`document.getElementById("pay-now-btn") !== null`);

    if (failData.paymentStatus === "PAYMENT_FAILED" && failData.canRetry && retryAvailable) {
      testResults["TEST 10 — Failed payment can retry"] = "PASSED";
      console.log("  ✓ TEST 10 PASSED: PAYMENT_FAILED cleanly recorded without order corruption; Pay Now retry button active");
    } else {
      throw new Error("TEST 10 FAILED: Clean retry not available after payment failure");
    }

    // -------------------------------------------------------------------------
    // TEST 3 & TEST 4 — Correct 5% platform fee and worker net earnings calculated
    // -------------------------------------------------------------------------
    console.log("\n[Step 8] Verifying authoritative 5% platform fee and net worker earnings calculation...");
    const reCreatePaymentRes = await apiPostWithRetry(
      `${API_BASE}/orders/${orderId}/payment/create-order`,
      {},
      consumerHeaders
    );
    const settlementData = reCreatePaymentRes.data.data;
    const grossAmount = settlementData.grossAmount;
    const platformFee = settlementData.platformFee;
    const workerEarnings = settlementData.workerEarnings;

    console.log(`  Concrete Transaction Breakdown:`);
    console.log(`    Gross Amount (X)  : ₹${grossAmount}`);
    console.log(`    Platform Fee (5%) : ₹${platformFee} (Formula: ${grossAmount} × 5% = ${grossAmount * 0.05})`);
    console.log(`    Worker Net Payout : ₹${workerEarnings} (Formula: ${grossAmount} - ${platformFee} = ${grossAmount - platformFee})`);

    const expectedFee = Math.round(grossAmount * 0.05);
    const expectedWorkerNet = grossAmount - expectedFee;

    if (platformFee === expectedFee && platformFee === 25) {
      testResults["TEST 3 — Correct 5% platform fee calculated"] = "PASSED";
      console.log(`  ✓ TEST 3 PASSED: Authoritative 5% platform fee correctly calculated as ₹${platformFee}`);
    } else {
      throw new Error(`TEST 3 FAILED: Expected platformFee to be ₹${expectedFee}, got ₹${platformFee}`);
    }

    if (workerEarnings === expectedWorkerNet && workerEarnings === 475) {
      testResults["TEST 4 — Correct worker net earnings calculated"] = "PASSED";
      console.log(`  ✓ TEST 4 PASSED: Authoritative worker net earnings correctly calculated as ₹${workerEarnings}`);
    } else {
      throw new Error(`TEST 4 FAILED: Expected workerEarnings to be ₹${expectedWorkerNet}, got ₹${workerEarnings}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5 — Test payment succeeds
    // -------------------------------------------------------------------------
    console.log("\n[Step 9] Executing backend-verified test payment confirmation...");
    await consumerCdp.evaluate(`document.getElementById("pay-now-btn").click()`);
    await consumerCdp.waitForCondition(`document.getElementById("order-payment-modal") !== null`, 15000, "Order Payment Modal");
    console.log("  ✓ Payment Modal opened");

    // Initiate test checkout
    await consumerCdp.evaluate(`document.getElementById("test-checkout-btn")?.click() || document.getElementById("pay-via-razorpay-btn")?.click()`);
    await consumerCdp.waitForCondition(`document.getElementById("test-pay-confirm-btn") !== null`, 15000, "Test Payment Confirm Button");
    await consumerCdp.captureScreenshot(`${artifactDir}/phase8-payment-modal.png`);
    console.log("  ✓ Screenshot saved: phase8-payment-modal.png");

    // Authorize & Pay
    await consumerCdp.evaluate(`document.getElementById("test-pay-confirm-btn").click()`);
    await sleep(3500);

    const paidOrderCheck = await apiGetWithRetry(`${API_BASE}/orders/${orderId}`, consumerHeaders);
    const paidOrder = paidOrderCheck.data.data;
    console.log(`  ✓ Order Settlement Confirmed: status=${paidOrder.status}, paymentStatus=${paidOrder.paymentStatus}`);
    console.log(`  ✓ Payment Completed At: ${paidOrder.paymentCompletedAt}`);

    if (paidOrder.status === "COMPLETED" && paidOrder.paymentStatus === "PAID" && paidOrder.paymentCompletedAt) {
      testResults["TEST 5 — Test payment succeeds"] = "PASSED";
      console.log("  ✓ TEST 5 PASSED: Backend confirms payment successfully and marks order COMPLETED/PAID");
    } else {
      throw new Error("TEST 5 FAILED: Order not marked COMPLETED and PAID");
    }

    // -------------------------------------------------------------------------
    // TEST 6 — Worker wallet credited exactly once
    // -------------------------------------------------------------------------
    console.log("\n[Step 10] Verifying worker wallet credited with net earnings...");
    const postPaymentWorkerSummary = await apiGetWithRetry(`${API_BASE}/workers/dashboard-summary`, workerHeaders);
    const postWallet = Number(postPaymentWorkerSummary.data.data.earnings.walletBalance || 0);
    const postTotalEarned = Number(postPaymentWorkerSummary.data.data.earnings.totalEarnings || 0);
    const postCompletedCount = postPaymentWorkerSummary.data.data.completedJobs?.length || 0;

    console.log(`  ✓ Initial Wallet: ₹${initialWallet} -> Post Wallet: ₹${postWallet} (+₹${postWallet - initialWallet})`);
    console.log(`  ✓ Initial Total: ₹${initialTotalEarned} -> Post Total: ₹${postTotalEarned} (+₹${postTotalEarned - initialTotalEarned})`);
    console.log(`  ✓ Completed Jobs: ${postCompletedCount} (Increased: ${postCompletedCount > initialCompletedCount})`);

    if (postWallet === initialWallet + expectedWorkerNet && postTotalEarned === initialTotalEarned + expectedWorkerNet) {
      testResults["TEST 6 — Worker wallet credited exactly once"] = "PASSED";
      console.log(`  ✓ TEST 6 PASSED: Worker wallet credited by exact net earnings (+₹${expectedWorkerNet})`);
    } else {
      throw new Error(`TEST 6 FAILED: Wallet expected ₹${initialWallet + expectedWorkerNet}, got ₹${postWallet}`);
    }

    // -------------------------------------------------------------------------
    // TEST 7 — Duplicate verification does not double-credit
    // -------------------------------------------------------------------------
    console.log("\n[Step 11] Verifying idempotency: Replaying payment verification...");
    const duplicateRes = await apiPostWithRetry(
      `${API_BASE}/orders/${orderId}/payment/verify`,
      {
        razorpay_order_id: settlementData.razorpayOrderId,
        isTestPayment: true,
      },
      consumerHeaders
    );
    console.log(`  ✓ Duplicate verification response: success=${duplicateRes.data.success}, message="${duplicateRes.data.message || 'Payment confirmed'}"`);

    const idempotentWorkerSummary = await apiGetWithRetry(`${API_BASE}/workers/dashboard-summary`, workerHeaders);
    const idempotentWallet = Number(idempotentWorkerSummary.data.data.earnings.walletBalance || 0);
    const idempotentTotal = Number(idempotentWorkerSummary.data.data.earnings.totalEarnings || 0);

    if (idempotentWallet === postWallet && idempotentTotal === postTotalEarned) {
      testResults["TEST 7 — Duplicate verification does not double-credit"] = "PASSED";
      console.log("  ✓ TEST 7 PASSED: Idempotency enforced. Replay verification did NOT credit worker twice");
    } else {
      throw new Error(`TEST 7 FAILED: Duplicate verification credited worker twice! (${postWallet} -> ${idempotentWallet})`);
    }

    // -------------------------------------------------------------------------
    // TEST 8 — Consumer receipt shows correct amount
    // -------------------------------------------------------------------------
    console.log("\n[Step 12] Verifying Consumer receipt presentation...");
    await consumerCdp.navigateTo(`${WEB_BASE}/consumer/dashboard`);
    await consumerCdp.waitForCondition(`document.getElementById("view-receipt-btn") !== null`, 20000, "View Receipt Button");
    await consumerCdp.evaluate(`document.getElementById("view-receipt-btn").click()`);
    await consumerCdp.waitForCondition(`document.getElementById("payment-receipt-modal") !== null`, 15000, "Payment Receipt Modal");

    const consumerReceiptText = await consumerCdp.evaluate(`document.getElementById("payment-receipt-modal").innerText`);
    console.log("  ✓ Consumer Receipt snippet:\n   ", consumerReceiptText.split("\n").slice(0, 8).join("\n    "));
    await consumerCdp.captureScreenshot(`${artifactDir}/phase8-payment-receipt-consumer.png`);

    if (consumerReceiptText.includes("Payment Successful") && consumerReceiptText.includes(`₹${grossAmount}`)) {
      testResults["TEST 8 — Consumer receipt shows correct amount"] = "PASSED";
      console.log(`  ✓ TEST 8 PASSED: Consumer receipt shows Payment Successful and exact gross amount paid (₹${grossAmount})`);
    } else {
      throw new Error("TEST 8 FAILED: Consumer receipt does not display correct amount");
    }

    // Close modal
    await consumerCdp.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const doneBtn = btns.find(b => b.innerText.trim() === "Done");
      if (doneBtn) doneBtn.click();
    })()`);
    await sleep(500);

    // -------------------------------------------------------------------------
    // TEST 9 — Worker receipt shows gross amount, 5% fee and net earnings
    // -------------------------------------------------------------------------
    console.log("\n[Step 13] Verifying Worker receipt modal shows gross, 5% fee, and net earnings...");
    await workerCdp.navigateTo(`${WEB_BASE}/worker/dashboard`);
    await sleep(1500);

    // Switch to Completed Jobs tab
    await workerCdp.waitForCondition(`document.getElementById("tab-btn-completed") !== null`, 20000, "Completed Jobs Tab Button");
    await workerCdp.evaluate(`document.getElementById("tab-btn-completed").click()`);
    await workerCdp.waitForCondition(
      `document.getElementById("view-worker-receipt-btn-${orderId}") !== null || document.querySelector("button[id^='view-worker-receipt-btn']") !== null`,
      20000,
      "View Worker Receipt Button"
    );

    // Click View Receipt
    await workerCdp.evaluate(`(() => {
      const btn = document.getElementById("view-worker-receipt-btn-${orderId}") || document.querySelector("button[id^='view-worker-receipt-btn']");
      if (btn) btn.click();
    })()`);
    await workerCdp.waitForCondition(`document.getElementById("payment-receipt-modal") !== null`, 15000, "Worker Payment Receipt Modal");

    const workerReceiptText = await workerCdp.evaluate(`document.getElementById("payment-receipt-modal").innerText`);
    console.log("  ✓ Worker Receipt snippet:\n   ", workerReceiptText.split("\n").slice(0, 14).join("\n    "));
    await workerCdp.captureScreenshot(`${artifactDir}/phase8-payment-receipt-worker.png`);

    const hasGrossOnReceipt = workerReceiptText.includes(`₹${grossAmount}`);
    const hasFeeOnReceipt = workerReceiptText.includes(`₹${platformFee}`) && (workerReceiptText.includes("5%") || workerReceiptText.includes("Cooperative"));
    const hasNetOnReceipt = workerReceiptText.includes(`₹${workerEarnings}`);

    if (hasGrossOnReceipt && hasFeeOnReceipt && hasNetOnReceipt) {
      testResults["TEST 9 — Worker receipt shows gross amount, 5% fee and net earnings"] = "PASSED";
      console.log(`  ✓ TEST 9 PASSED: Worker receipt presents Gross (₹${grossAmount}), 5% Fee (₹${platformFee}), and Net Earnings (₹${workerEarnings})`);
    } else {
      throw new Error(`TEST 9 FAILED: Worker receipt missing required financial breakdown. Text: ${workerReceiptText}`);
    }

    // -------------------------------------------------------------------------
    // TEST 11 — Refresh after PAID does not request payment again
    // -------------------------------------------------------------------------
    console.log("\n[Step 14] Verifying return flow on consumer reload...");
    await consumerCdp.navigateTo(`${WEB_BASE}/consumer/dashboard`);
    await consumerCdp.waitForCondition(`document.getElementById("view-receipt-btn") !== null`, 20000, "View Receipt Button");

    const payNowBtnOnReload = await consumerCdp.evaluate(`document.getElementById("pay-now-btn") !== null`);
    const pageTextOnReload = await consumerCdp.evaluate(`document.body.innerText`);

    if (!payNowBtnOnReload && pageTextOnReload.includes("Payment Completed — Order Settled")) {
      testResults["TEST 11 — Refresh after PAID does not request payment again"] = "PASSED";
      console.log("  ✓ TEST 11 PASSED: Reloading consumer dashboard displays 'Payment Completed — Order Settled' without requesting payment again");
    } else {
      throw new Error("TEST 11 FAILED: Consumer re-prompted to pay after settlement");
    }

    // -------------------------------------------------------------------------
    // TEST 12 — Worker completed history persists
    // -------------------------------------------------------------------------
    console.log("\n[Step 15] Verifying worker completed jobs card and persisted history...");
    await workerCdp.navigateTo(`${WEB_BASE}/worker/dashboard`);
    await sleep(1500);

    // Switch to Completed Jobs tab
    await workerCdp.waitForCondition(`document.getElementById("tab-btn-completed") !== null`, 20000, "Completed Jobs Tab Button");
    await workerCdp.evaluate(`document.getElementById("tab-btn-completed").click()`);
    await workerCdp.waitForCondition(
      `document.getElementById("completed-job-card-${orderId}") !== null || document.body.innerText.includes("Completed Job #")`,
      20000,
      "Completed Job Card"
    );

    const workerDashboardText = await workerCdp.evaluate(`document.body.innerText`);
    const hasJobRef = workerDashboardText.includes(order.orderRef) || workerDashboardText.includes("Completed Job #");
    const hasFinalPrice = workerDashboardText.includes(`₹${grossAmount}`);
    const hasEarned = workerDashboardText.includes(`₹${workerEarnings}`);
    const hasPlatformFee = workerDashboardText.includes(`₹${platformFee}`) || workerDashboardText.includes("5%");

    await workerCdp.captureScreenshot(`${artifactDir}/phase8-worker-completed-earnings.png`);
    console.log("  ✓ Screenshot saved: phase8-worker-completed-earnings.png");

    if (hasJobRef && hasFinalPrice && hasEarned && hasPlatformFee) {
      testResults["TEST 12 — Worker completed history persists"] = "PASSED";
      console.log(`  ✓ TEST 12 PASSED: Worker completed jobs history persists with Ref, Final Amount ₹${grossAmount}, Earned ₹${workerEarnings}, and 5% Fee ₹${platformFee}`);
    } else {
      throw new Error("TEST 12 FAILED: Worker completed history card missing required breakdown");
    }

    // -------------------------------------------------------------------------
    // TEST 13 — Database settlement values match the UI
    // -------------------------------------------------------------------------
    console.log("\n[Step 16] Verifying database records match authoritative settlement values...");
    const dbOrder = await dbRetry(() => prisma.order.findUnique({ where: { id: orderId } }));
    const dbPayment = await dbRetry(() => prisma.orderPayment.findFirst({ where: { orderId, status: "PAID" } }));
    const dbTx = await dbRetry(() => prisma.walletTransaction.findFirst({ where: { orderId, type: "PAYMENT" } }));

    console.log(`  DB Order Records: grossAmount=${dbOrder.grossAmount}, platformFee=${dbOrder.platformFee}, workerEarnings=${dbOrder.workerEarnings}`);
    console.log(`  DB Payment Record: grossAmount=${dbPayment.grossAmount}, platformFee=${dbPayment.platformFee}, workerEarnings=${dbPayment.workerEarnings}`);
    console.log(`  DB Wallet Tx: amount=${dbTx.amount}, balanceAfter=${dbTx.balanceAfter}`);

    const dbOrderMatches =
      Number(dbOrder.grossAmount) === grossAmount &&
      Number(dbOrder.platformFee) === platformFee &&
      Number(dbOrder.workerEarnings) === workerEarnings;

    const dbPaymentMatches =
      Number(dbPayment.grossAmount) === grossAmount &&
      Number(dbPayment.platformFee) === platformFee &&
      Number(dbPayment.workerEarnings) === workerEarnings;

    const dbTxMatches = Number(dbTx.amount) === workerEarnings;

    if (dbOrderMatches && dbPaymentMatches && dbTxMatches) {
      testResults["TEST 13 — Database settlement values match the UI"] = "PASSED";
      console.log("  ✓ TEST 13 PASSED: Database records (Order, OrderPayment, WalletTransaction) match UI settlement values 100%");
    } else {
      throw new Error("TEST 13 FAILED: Database values mismatch UI settlement calculation");
    }

    // -------------------------------------------------------------------------
    // TEST 14 — No existing Phase 3 pricing behavior was broken
    // -------------------------------------------------------------------------
    console.log("\n[Step 17] Verifying Phase 3 pricing benchmarks and estimates remain intact...");
    const benchmarksRes = await apiGetWithRetry(`${API_BASE}/pricing/benchmarks`, consumerHeaders);
    const benchmarks = benchmarksRes.data.data;

    const estimateRes = await apiGetWithRetry(`${API_BASE}/pricing/estimate/${problem.id}`, consumerHeaders);
    const estimate = estimateRes.data.data;

    console.log(`  Phase 3 Benchmarks Title: "${benchmarks.title}"`);
    console.log(`  Phase 3 Problem Estimate: "${estimate.problemName}", Base: ₹${estimate.breakdown.totalEstimate.base}`);
    console.log(`  Platform Fee Rate in Phase 3: ${estimate.breakdown.platformFee.ratePercent}% (Amount: ₹${estimate.breakdown.platformFee.amount})`);

    const hasPhase3Benchmarks = benchmarks.primarySources?.length > 0;
    const hasPhase3Estimate = estimate.breakdown?.labour && estimate.breakdown?.platformFee?.ratePercent === 5;

    if (hasPhase3Benchmarks && hasPhase3Estimate) {
      testResults["TEST 14 — No existing Phase 3 pricing behavior was broken"] = "PASSED";
      console.log("  ✓ TEST 14 PASSED: Phase 3 CPWD labour benchmarks and 5% pricing estimate engine verified intact with 0 regressions");
    } else {
      throw new Error("TEST 14 FAILED: Phase 3 pricing behavior was disrupted");
    }

    // -------------------------------------------------------------------------
    // Summary of Results
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    console.log("   ALL 14 PHASE 8.1 VERIFICATION TESTS PASSED SUCCESSFULLY!                    ");
    console.log("================================================================================\n");
    for (const [testName, result] of Object.entries(testResults)) {
      console.log(`  [✓] ${testName}: ${result}`);
    }
    console.log("\n================================================================================\n");

    return true;
  } finally {
    if (consumerCdp) consumerCdp.close();
    if (workerCdp) workerCdp.close();
    try {
      braveProcess.kill();
    } catch {}
    await prisma.$disconnect();
  }
}

runPhase81PaymentVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ VERIFICATION FAILED:", err);
    process.exit(1);
  });
