# Shramik Co — Feature & Architecture Specification

Detailed breakdown of every platform feature, the data model, the authorization model, and
end-to-end data-flow workflows.

---

## 1. Dual-Role Authentication & Verification

**Endpoints:** `POST /api/v1/auth/register`, `/login`, `/send-otp`, `/verify-otp`, `/refresh`, `GET /me`

- **Consumer** auth via phone + password, with optional OTP verification.
- **Worker** onboarding: `POST /api/v1/workers/register` creates a `WorkerProfile` with
  `skillTags`, `experienceYears`, `coopId`, and a DigiLocker verification **mock** flag
  (`digiLockerVerified`).
- **Co-op Admin** and **Federation (Ministry) Admin** roles are seeded/assigned server-side.
- **OTP / 2FA:** `OtpVerification` records are created on `send-otp`. Operates purely via
  Server OTP: cryptographically secure code generated and verified directly on the server.
- **JWT:** access token signed with `JWT_SECRET`, `7d` expiry, carries `{ id, phone, role }`.
- **Passwords:** bcrypt hashed (`bcryptjs`, cost 10).

**Data flow (register):** UI → `POST /auth/register` → Zod validate → `authService.register`
(phone uniqueness check, optional email uniqueness, bcrypt hash, `User` + role profile create,
JWT sign) → 201 + token → frontend stores token in `localStorage`, user in `authStore`.

---

## 2. Geospatial Worker Matching & On-Demand Dispatch

- **Location capture:** `PATCH /api/v1/workers/location` updates `WorkerProfile.latitude/longitude`.
- **Nearby workers:** `GET /api/v1/bookings/nearby-workers?lat=&lng=&radius=` returns workers
  within a radius using an **application-level Haversine** formula over `WorkerProfile`
  coordinates (schema stores `Decimal` lat/long, PostGIS-compatible). *Production note: the
  Supabase Postgres instance can be upgraded to enable `PostGIS` and `ST_DWithin`; the service
  layer isolates the distance function so it can be swapped for `ST_DWithin` without API changes.*
- **Dispatch modes:**
  - Instant booking: consumer books → status `PENDING` → worker accepts (`PATCH /:id/status` → `ACCEPTED` → `EN_ROUTE` → `IN_PROGRESS` → `COMPLETED`).
  - Scheduled: `scheduledAt` on booking.
  - Emergency dispatch: flagged via booking `description`/`priority` and surfaced in worker job queue.

---

## 3. AI Demand Forecasting & Workforce Allocation Engine  *(CRITICAL)*

**Endpoint:** `GET /api/v1/analytics/demand-forecast` (Co-op Admin, Federation Admin)

**Model:** `apps/api/src/services/forecast.service.ts`
- **Type:** Seasonal-weighted historical aggregation + linear-trend regression (no external ML
  service required; runs in-process, stateless, fast).
- **Inputs:** last 120 days of `Booking` rows (category slug, co-op, `createdAt`, status),
  optional `days` (1–30), optional `weather` (`temperatureC`, `condition`).
- **Features:** day-of-week multiplier, month/season multiplier (`SEASON_MULTIPLIER`),
  weather multiplier (`WEATHER_MULTIPLIER`: rain +18%, heavy rain +32%, heatwave +22%, cold +12%),
  and a least-squares **linear regression** trend on daily volume.
- **Outputs:**
  - `forecast[]`: per-date, per-category `predictedDemand` + `confidence` + `weatherFactor`.
  - `hotspots[]`: aggregated demand per (co-op, category) ranked with `riskLevel` LOW/MEDIUM/HIGH.
  - `recommendations[]`: `recommendedWorkers = ceil(predictedDemand / 3)` per hotspot with rationale.
  - `insights[]`: human-readable narrative (peak day, busiest category, weather impact).
- **Why statistical (not heavy ML):** zero infrastructure cost, explainable, and retrains on every
  request from live data — ideal for SIH demonstration and for co-op admins to act on immediately.

**Data flow:** Co-op Admin dashboard → `GET /analytics/demand-forecast` →
`forecastService.forecastDemand` (Prisma query → aggregate → regress → rank) → JSON →
frontend renders heatmap cards + recommendation list.

---

## 4. Cooperative Governance & Financial Engine

- **Dynamic commission (<5%):** `CoOp.commissionRate` + `MAX_COMMISSION_RATE` (default 5).
  On payment, `commissionAmount = amount * commissionRate/100`, `workerPayout = amount − commission`.
  Enforced in `payment.service.ts`; commission held in escrow (`HELD_IN_ESCROW`) until completion.
- **Patronage Dividend Ledger:** `POST /api/v1/coops/:id/dividends` computes a quarterly profit
  pool from `WalletTransaction` commission accrual and distributes `Dividend` records to workers
  proportional to jobs completed (`Dividend` model).
- **Social Security Vault:** `SocialSecurityVault` rows per worker per fund type
  (`EMERGENCY_HEALTH`, `PENSION`, `SKILL_FUND`). Micro-deductions (`SOCIAL_SECURITY_RATE`, default 1%)
  taken from earnings; `GET /api/v1/social-security/contributions` lists balances +
  employer match. `GET /api/v1/social-security/history/:fundType` shows history.
- **Co-op settings:** `PATCH /api/v1/coops/:id/settings` (commission rate, radius, fixed pricing).

---

## 5. Service Quality, Disputes & Admin Dashboard

- **Two-way rating:** `POST /api/v1/bookings/:id/rate` (consumer) → `Review` + `Booking.rating/review`;
  workers rate via `Review` on completion.
- **Disputes:** `POST /api/v1/disputes` (raisedBy consumer/worker) → `Dispute` (status OPEN, priority)
  → Co-op Admin resolves via `GET /api/v1/coops/:id/disputes` + admin action.
- **Federation Admin dashboard:** `GET /api/v1/coops/:id/dashboard` aggregates workers, bookings,
  revenue, commission, services; plus the AI demand heatmap from §3.
- **Multilingual:** see README §i18n (en/hi/mr).

---

## 6. Database Schemas (Prisma / Supabase Postgres)

> Full schema: `packages/db/prisma/schema.prisma`. Key entities:

| Model | Purpose | Key fields |
|-------|---------|-----------|
| `User` | Auth identity | `phone` (unique), `passwordHash`, `role`, `email?` |
| `ConsumerProfile` / `WorkerProfile` | Role profiles | worker: `skillTags`, `coopId`, `latitude`, `longitude`, `isAvailable`, `digiLockerVerified`, wallet balances |
| `CoOp` | Cooperative | `commissionRate`, `maxCommissionRate`, `radiusKm`, `latitude`, `longitude` |
| `CoopAdminProfile` | Co-op admin link | `coopId`, `userId` |
| `CoOpServiceArea` | Service zones | `coopId`, `categorySlug`, `basePrice` |
| `Service` | Catalog item | `coopId`, `categorySlug`, `name`, `basePrice`, `estimatedDuration` |
| `ServiceCategory` | Category master | `slug`, `name`, `icon` |
| `Booking` | Job | `consumerId`, `workerId?`, `serviceId`, `status`, coords, `quotedPrice`, `commission*`, `workerPayout`, `paymentStatus` |
| `WalletTransaction` | Ledger | `userId`, `type`, `amount`, `bookingId?`, `commissionAccrued?` |
| `Dividend` | Patronage payout | `coopId`, `workerId`, `amount`, `period` |
| `SocialSecurityVault` | SS fund | `workerId`, `fundType`, `totalContributed`, `employerMatch`, `balance`, `isOptedIn` |
| `Review` | Rating | `bookingId`, `rating`, `comment` |
| `Dispute` | Grievance | `bookingId`, `raisedBy`, `category`, `status`, `priority` |
| `OtpVerification` | 2FA | `phone`, `otp`, `purpose`, `expiresAt`, `verified` |
| `Notification` | Realtime msg | `userId`, `type`, `read`, `data` (Json) |
| `FileUpload` | Storage ref | `userId`, `path`, `url`, `bucket` |

---

## 7. Authorization Model (RLS equivalent)

The platform uses **application-layer authorization** (express `authenticate` + `authorize`
middleware) rather than Supabase Row-Level Security, because auth is JWT-based and the API owns
the data layer. The equivalent guarantees:

- `authenticate` validates the JWT and attaches `req.user` (`id`, `phone`, `role`).
- `authorize("CONSUMER")` / `"WORKER"` / `"COOP_ADMIN"` / `"MINISTRY_SUPER_ADMIN"` restricts routes.
- **Row scoping:** every query is scoped by `req.user.id` / `coopId` — e.g. a worker only reads
  their own `WalletTransaction`; a co-op admin only reads their own co-op's `Dispute`/`dashboard`.
- **Public reads:** worker search, nearby-workers, co-op public info, payment key are unauthenticated.
- **To migrate to Supabase RLS:** enable RLS policies keyed on `auth.uid()` = `User.id` and replace
  the JWT with Supabase Auth; the service queries would pass the user id through unchanged.

---

## 8. End-to-End Data-Flow Workflows

### Booking → Payment → Worker Payout
```
Consumer UI ──POST /bookings──▶ bookings route (auth+CONSUMER)
   └─▶ bookingService.create ──▶ Booking(PENDING) + WalletTransaction(escrow)
Worker UI   ──PATCH /bookings/:id/status (ACCEPTED…COMPLETED)──▶ bookingService.updateStatus
Consumer UI ──POST /payments/initiate──▶ paymentService (commission calc, HELD_IN_ESCROW)
   ──▶ razorpay.createOrder (test) ──▶ POST /payments/confirm ──▶ worker wallet credit
   ──▶ Booking (COMPLETED) + Review + Notification (Socket.IO push)
```

### OTP Login
```
UI ──POST /auth/send-otp──▶ generateOTP ──▶ Server OtpVerification record
UI ──POST /auth/verify-otp──▶ verifyOTP ──▶ if existing user → JWT; else → "complete registration"
```

### AI Forecast → Allocation
```
Co-op Admin UI ──GET /analytics/demand-forecast──▶ forecastService.forecastDemand
   └─▶ Prisma(Booking 120d) ──▶ aggregate + regress + rank ──▶ hotspots + recommendations
   ──▶ UI heatmap cards + "pre-position N workers" actions
```

### Realtime
`setupWebSocket(server)` (Socket.IO) pushes `Notification` events (booking accepted, dispute updated,
payout credited) to authenticated sockets keyed by `userId`.
