# Shramik Security & Compliance

## 1. Authentication & Session Management
- **Credentials**: Passwords hashed using bcrypt / Argon2id with salt.
- **Tokens**: Short-lived JWT access tokens with rotating refresh tokens stored securely in HTTP-only cookies where applicable.
- **Role-Based Access Control (RBAC)**:
  - `CONSUMER`: Can create bookings, initiate payments, submit reviews.
  - `WORKER`: Can accept bookings, update job status, view earnings, take skill tests.
  - `COOP_ADMIN`: Can manage cooperative services, assign workers, oversee disputes.
  - `MINISTRY_SUPER_ADMIN`: Can verify documents, audit ledger transactions, manage platform rules.

---

## 2. Financial Integrity & Payments
- **Server-Authoritative State**: No financial transaction is marked successful merely based on a client-side callback.
- **HMAC-SHA256 Verification**: Every Razorpay payment confirmation verifies the cryptographic signature:
  $$\text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{RAZORPAY\_KEY\_SECRET})$$
- **Integer Paise Arithmetic**: All monetary fields (`quotedPrice`, `commissionAmount`, `workerPayout`) are calculated in integer paise / rounded cents to eliminate floating-point rounding errors.
- **Platform Commission Cap**: Cooperative regulations enforce that platform commissions cannot exceed 5%.

---

## 3. PII & Identity Verification Protection
- **No Plaintext Aadhaar Storage**: The platform never stores 12-digit Aadhaar numbers in plaintext.
- **UIDAI Offline e-KYC**: Validates XML digital signatures using UIDAI public certificates.
- **Audit Logging**: Sensitive operations (login attempts, verification reviews, payouts) are logged in structured JSON without exposing secrets or OTPs.
