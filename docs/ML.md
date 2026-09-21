# Shramik Machine Learning & AI Pipeline

## 1. Overview
The machine learning pipeline inside Shramik delivers:
1. **Trilingual Natural Language Understanding (NLU)** for English, Hindi, and Marathi job requests.
2. **Price Estimation Engine** (Quantile Regression: p25, p50, p75).
3. **Worker Recommendation & Ranking Engine** (PostGIS nearest-neighbor candidate generation + Multicriteria ML scoring).
4. **Multi-Job Schedule Optimization** (Google OR-Tools local solver).

---

## 2. Job Classification & Skill Extraction
- **Input**: Spoken or written natural language transcript.
- **Languages Supported**: `en` (English), `hi` (Hindi), `mr` (Marathi).
- **Core Methodology**:
  - Language detection via vocabulary distributions and script unicode ranges (Devanagari vs Latin).
  - Domain-specific Indic entity and symptom extractor:
    - Electrical: पंखा, लाइट, स्पार्क, फ्यूज, वायरिंग, शॉर्ट सर्किट, switchboard, shock.
    - Plumbing: नळ, पाणी, गळती, पाइप, टाकी, लीकेज, tap, drain, flush.
    - Carpentry: दरवाजा, टेबल, कपाट, लाकूड, hinge, furniture, lock.
    - AC Repair: एसी, थंड, गॅस, पाणी गळणे, cooling, compressor.
  - Generates an immutable **JobToken** (e.g., `JOB-2026-A83F1C`) with extracted category, required skills, and urgency.

---

## 3. Price Estimation Engine
- **Model**: Quantile Regression (`scikit-learn` GradientBoostingRegressor / Empirical Quantile Estimator).
- **Features**:
  - `category_slug`: Trade category (Electrician, Plumber, etc.)
  - `estimated_duration_minutes`: Estimated labor time
  - `urgency`: Normal (1.0x), High (1.25x), Emergency (1.5x)
  - `distance_km`: Distance from technician base location
  - `historical_coop_rates`: Platform cooperative baseline rates
- **Outputs**:
  - `p25`: Lower bound (25th percentile)
  - `p50`: Expected median market price
  - `p75`: Upper bound (75th percentile)
  - `explanation`: Transparent factor breakdown displayed to the consumer.

---

## 4. Worker Recommendation & Ranking
- **Stage 1 (Candidate Generation)**:
  - PostGIS geospatial query: `ST_DWithin(worker_location, consumer_location, radius_meters)`
  - Filters: `isOnDuty = TRUE`, `isAvailable = TRUE`, skill match.
- **Stage 2 (Multi-Attribute Ranking Score)**:
  $$\text{Score} = w_1 \cdot \text{SkillMatch} + w_2 \cdot \text{DistanceScore} + w_3 \cdot \text{RatingScore} + w_4 \cdot \text{VerificationScore} + w_5 \cdot \text{CompletionScore}$$
  - Default weights:
    - Skill match: 30%
    - Proximity & ETA: 25%
    - Government / Assessment Verification: 20%
    - Customer Rating: 15%
    - Historical Completion Rate: 10%

---

## 5. Multi-Job Route Optimization (Google OR-Tools)
- **Objective**: Solve Traveling Salesperson Problem (TSP) / Vehicle Routing Problem (VRP) across a worker's daily bookings.
- **Constraints**:
  - Start at worker's current GPS coordinate.
  - Incorporate OSRM road travel time between each pair of stops.
  - Account for estimated service durations (30-60 mins per booking).
- **Result**: Optimal stop sequence minimizing total travel time and travel distance.
