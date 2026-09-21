# Shramik External Integrations & Provider Abstractions

## 1. Provider Pattern Overview
Every external dependency is architected behind an abstract interface in `backend/app/core/providers/`.
This guarantees that transitioning from local zero-cost hackathon demonstration to official production deployment requires only changing environment configurations without touching business logic.

---

## 2. Integration Catalog

### A. Maps & Road Routing
- **Interface**: `RoutingProvider` (`backend/app/core/providers/routing_provider.py`)
- **Default (SIH Demo)**: `OSRMProvider`
  - Calls self-hosted OSRM container or public OpenStreetMap road engine.
  - Fallback: Local road-curvature haversine algorithm (zero external dependencies).
- **Production Provider**: `GoogleRoutesProvider`
  - Enabled when `ROUTING_PROVIDER=google` and `GOOGLE_MAPS_API_KEY` is provided.

### B. Multi-Job Optimization
- **Interface**: `MultiJobRouteOptimizer` (`backend/app/core/providers/optimization_provider.py`)
- **Default**: Google OR-Tools Local VRP Solver (zero API cost).
- **Production**: Google Route Optimization API / Fleet Engine.

### C. Identity & Document Verification
- **Interface**: `GovernmentVerificationProvider` (`backend/app/core/providers/verification_provider.py`)
- **Implementations**:
  - `OfficialGovernmentProvider`: Connects to authorized UIDAI e-KYC or DigiLocker partner endpoints.
  - `SandboxProvider`: Connects to government sandbox test APIs.
  - `DevelopmentMockProvider`: Offline simulation returning standard verification payloads.

### D. Payments & Payouts
- **Provider**: Razorpay Test Mode
  - Test Key: `rzp_test_YourKeyHere`
  - Test Secret: `YourSecretHere`
  - Automated HMAC-SHA256 signature verification.

### E. Speech & Voice AI
- **Interface**: `AIJobUnderstandingProvider` (`backend/app/core/providers/ai_provider.py`)
- **Default**: Trilingual rule & keyword NLU with Web Speech API browser frontend.
- **Production**: AI4Bharat IndicConformer (ASR), IndicTrans2 (Translation), Indic-TTS.
