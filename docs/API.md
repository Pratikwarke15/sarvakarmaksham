# Shramik REST API Documentation

Base URL: `http://localhost:4000/api/v1`

All responses follow the unified schema:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## 1. Authentication (`/auth`)
- `POST /auth/register`
  - Register a new consumer or worker account.
  - Body: `{ phone, password, role, name, email?, latitude?, longitude? }`
- `POST /auth/login`
  - Validate credentials and send OTP.
  - Body: `{ phone, password }`
- `POST /auth/verify-otp`
  - Verify OTP and issue JWT access token.
  - Body: `{ phone, otp }`
- `POST /auth/dev-login`
  - Direct login for seed accounts in development/demo mode.
  - Body: `{ phone, password, role }`

---

## 2. AI Voice & Job Understanding (`/ai`)
- `POST /ai/voice-job`
  - Natural language understanding and job parsing in English, Hindi, or Marathi.
  - Body:
    ```json
    {
      "transcript": "माझ्या घरचा AC चालू होत नाही आणि पाणी पण गळत आहे",
      "audio_base64": null,
      "language": "mr",
      "consumer_location": { "lat": 28.6139, "lng": 77.2090 }
    }
    ```
  - Response:
    - `jobIntent`: Structured JobToken (`JOB-2026-XXXXXX`), category slug, extracted skills, urgency.
    - `priceEstimation`: Statistical quantiles (`p25`, `p50`, `p75`), confidence, calculation basis.
    - `recommendedWorkers`: Ranked nearby verified technicians with match scores.
- `POST /ai/analyze-job`
  - Text-only parsing of unstructured job descriptions into structured tokens.

---

## 3. Navigation & Routing (`/routes`)
- `POST /routes/navigate`
  - OpenStreetMap / OSRM road distance, duration, and dynamic ETA calculation.
  - Body: `{ originLat, originLng, destLat, destLng }`
- `POST /routes/optimize`
  - Google OR-Tools multi-job sequence optimizer.
  - Body:
    ```json
    {
      "worker_id": "worker-1",
      "start_location": { "lat": 28.6139, "lng": 77.2090 },
      "jobs": [
        { "id": "j1", "lat": 28.625, "lng": 77.215, "address": "...", "duration_minutes": 45 },
        { "id": "j2", "lat": 28.640, "lng": 77.195, "address": "...", "duration_minutes": 60 }
      ]
    }
    ```
  - Response: Optimal stop sequence, travel times, total distance, and step arrival schedule.

---

## 4. Skills & Assessment Path B (`/skills`)
- `GET /skills/assessments/{category_slug}`
  - Retrieve randomized trade assessment questions (MCQs & scenarios).
- `POST /skills/assessments/{category_slug}/submit`
  - Submit answers, compute score percentage, and award "Assessment Verified" badge upon achieving ≥ 70%.

---

## 5. Verification (`/verification`)
- `POST /verification/aadhaar/verify`
  - Verify Aadhaar identity via offline XML digital signature or sandbox provider.
- `GET /verification/digilocker/start`
  - Initiate DigiLocker OAuth partner consent flow.
- `POST /verification/digilocker/callback`
  - Validate verified certificates (ITI trade certificate, NCVT, Skill India).
- `GET /verification/consumer/status`
  - Check consumer phone and identity verification status.

---

## 6. Bookings (`/bookings`)
- `GET /bookings`: List active and historical bookings for current user.
- `POST /bookings`: Create a new booking.
- `GET /bookings/{id}`: Booking details with live tracking data.
- `PATCH /bookings/{id}/status`: Transition booking state (`ACCEPTED`, `EN_ROUTE`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- `POST /bookings/{id}/rate`: Submit consumer or worker review.

---

## 7. Payments (`/payments`)
- `POST /payments/create-order`: Create Razorpay test order.
- `POST /payments/verify`: HMAC-SHA256 signature verification.
- `GET /payments/key`: Retrieve public test key.
