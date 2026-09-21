# Shramik Platform Architecture

## 1. System Overview
**Shramik** is an Indian skilled-worker discovery, job marketplace, verification, AI-assisted job creation, intelligent worker recommendation, navigation, payment, and worker-efficiency platform.

The system is designed with a **Provider Abstraction Architecture** to allow seamless local development and demonstration with ₹0 external service fees, while remaining fully swappable for official production providers without modifying any core business logic.

```
+-----------------------------------------------------------------------------------+
|                            SHRAMIK FULL-STACK SYSTEM                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   |                        WEB FRONTEND (Next.js 15+)                         |   |
|   |   - The Mistry inspired commercial marketplace UI                         |   |
|   |   - Interactive OpenStreetMap route rendering                             |   |
|   |   - Trilingual Voice AI Interface (EN, HI, MR)                            |   |
|   |   - Multi-Job Route Optimizer & Worker Schedule                           |   |
|   |   - Skill Assessment Quiz Engine (Path B)                                 |   |
|   |   - Razorpay Test Checkout                                                |   |
|   +-------------------------------------+-------------------------------------+   |
|                                         | HTTP / JSON REST / WebSockets           |
|                                         v                                         |
|   +---------------------------------------------------------------------------+   |
|   |                     BACKEND SERVICE (FastAPI Python)                      |   |
|   |   +-------------------------------------------------------------------+   |   |
|   |   | Routers: /auth, /bookings, /workers, /skills, /ai, /routes, etc.  |   |   |
|   |   +-------------------------------------------------------------------+   |   |
|   |   | Service Layer: Pricing, Recommendation, Commission, Verification  |   |   |
|   |   +-------------------------------------------------------------------+   |   |
|   |   | Core Providers (Swappable Abstraction Pattern):                   |   |   |
|   |   |   - GovernmentVerificationProvider (Official / Sandbox / Mock)    |   |   |
|   |   |   - RoutingProvider (OSRM / GoogleRoutes)                         |   |   |
|   |   |   - MultiJobRouteOptimizer (OR-Tools / VRP Solver)                |   |   |
|   |   |   - AIJobUnderstandingProvider (Trilingual NLU / Speech ASR)      |   |   |
|   |   |   - PriceEstimationService (Quantile Regression p25, p50, p75)    |   |   |
|   |   |   - WorkerRecommendationEngine (PostGIS Nearest Neighbor + ML)   |   |   |
|   |   +-------------------------------------------------------------------+   |   |
|   +-------------------+--------------------+--------------------+-------------+   |
|                       |                    |                    |                 |
|                       v                    v                    v                 |
|          +----------------------+  +--------------+  +--------------------+       |
|          | PostgreSQL + PostGIS |  |   Redis 7    |  | Self-Hosted OSRM / |       |
|          | (Geospatial Indices) |  | (PubSub/TTL) |  |   OpenStreetMap    |       |
|          +----------------------+  +--------------+  +--------------------+       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Provider Abstraction Matrix

| Capability | Local / Demo Provider | Production Target | Zero-Cost Mechanism |
| :--- | :--- | :--- | :--- |
| **Maps & Routing** | `OSRMProvider` | `GoogleRoutesProvider` | OpenStreetMap road network via OSRM |
| **Route Optimization** | `MultiJobRouteOptimizer` | Google Fleet Engine / VRP API | Google OR-Tools Local Solver |
| **AI / NLU** | `AIJobUnderstandingProvider` | IndicTrans2 / Whisper / Claude | Local keyword + semantic rule parser |
| **Price Estimation** | `PriceEstimationService` | scikit-learn / XGBoost Regressor | Historical Quantiles (p25, p50, p75) |
| **Worker Matching** | `WorkerRecommendationEngine`| LightGBM Learning-to-Rank | PostGIS k-NN + Multicriteria Scoring |
| **Identity Verification**| `DevelopmentMockProvider` | UIDAI Offline e-KYC / DigiLocker | Offline XML digital signature validator |
| **Payments** | Razorpay Test Mode | Razorpay Live Gateway | HMAC-SHA256 signature verification |
| **SMS / OTP** | `DevelopmentMockSMSProvider` | MSG91 / Textlocal | Console logger + configurable dev OTP |

---

## 3. Database Architecture (PostgreSQL + PostGIS)
All geospatial queries utilize the PostGIS spatial extension.
Key entities:
- `users`: Core identity with role-based access control (`CONSUMER`, `WORKER`, `COOP_ADMIN`, `MINISTRY_SUPER_ADMIN`).
- `consumer_profiles`: Address, coordinates (`ST_Point`), booking history.
- `worker_profiles`: GPS locations, duty status, verification level, avg rating, wallet balance.
- `coops`: Local cooperative management entities with defined service radii (`radiusKm`) and commission caps (≤5%).
- `services`: Service catalog mapped to trade categories (Electrician, Plumber, Carpenter, etc.).
- `bookings`: Finite state machine (`PENDING` -> `ACCEPTED` -> `EN_ROUTE` -> `IN_PROGRESS` -> `COMPLETED` -> `CANCELLED`).
- `worker_skills`: Trade associations linked to Path A (Government certificates) or Path B (Platform assessment).
