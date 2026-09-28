# सर्वकर्मक्षमः (Sarvakarmakshamah)

> **Decentralized Platform Cooperative for Skilled & Blue-Collar Services**  
> **Smart India Hackathon 2026 | Problem Statement ID: SIH26089**  
> *"Empowering India's informal workforce through democratic ownership, fair compensation, and statutory social security."*

---

## 📌 Executive Summary

India's on-demand home and doorstep services sector is projected to reach **$35 Billion by 2030**, supporting over **23.5 Million gig workers** (*NITI Aayog, 2022*). However, existing corporate aggregators extract **25%–35% in platform commissions**, enforce opaque algorithmic penalties, and offer zero formal social security nets for over 90% of technicians (*Fairwork India, 2023*).

**सर्वकर्मक्षमः (Sarvakarmakshamah)** is a decentralized, full-stack platform cooperative engineered to eliminate predatory intermediary rent-seeking. By capping operational commissions at **0%–5%**, redistributing annual surplus via **patronage dividends**, automating **Social Security Micro-Vaults** (ESI, accident coverage, micro-pensions), and verifying identities via **UIDAI Paperless Offline XML e-KYC**, सर्वकर्मक्षमः provides an institutional-grade, transparent public digital infrastructure for blue-collar gig economies.

---

## 🌐 Live Deployments & Repository

| Service | Environment / URL | Details |
| :--- | :--- | :--- |
| **Web Application & PWA** | [https://sarvakarmakshamah.vercel.app](https://sarvakarmakshamah.vercel.app) | Responsive Next.js 14 PWA with Offline Support |
| **Backend REST API** | `https://coopgig.onrender.com` / `http://localhost:4000` | Node.js Express & TypeScript Microservice |
| **Interactive API Docs** | `https://coopgig.onrender.com/docs` | OpenAPI / Swagger Documentation |
| **Source Code** | [https://github.com/Pratikwarke15/shramik-co](https://github.com/Pratikwarke15/shramik-co) | GitHub Monorepo |

---

## ⚡ Key Value Propositions & Differentiators

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Corporate Aggregators       │  vs   │     सर्वकर्मक्षमः (Cooperative) │
├─────────────────────────────────┼───────┼─────────────────────────────────┤
│ • 25% – 35% commission cuts     │       │ • 0% – 5% operational cost cap  │
│ • Zero health / pension nets    │       │ • Automated Social Security     │
│ • Arbitrary account debarment   │       │ • Democratic worker governance  │
│ • Surge & opaque pricing        │       │ • Transparent base rates (₹50+) │
│ • English-heavy UI friction     │       │ • Trilingual Voice AI Interface │
│ • Shareholder profit extraction │       │ • Patronage Dividend rebates    │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

1. **0% – 5% Commission Cap:** Server-enforced smart escrow logic ensures workers retain 95%+ of their hard-earned labor income.
2. **Social Security Micro-Vault:** Compliant with Chapter IX of India's *Code on Social Security, 2020*. A micro-fraction of every transaction is earmarked directly into the worker's dedicated social vault (ESI, medical cover, accidental insurance, and retirement).
3. **Paperless UIDAI e-KYC & DigiLocker:** Privacy-preserving identity verification using offline digitally signed XML files and share codes without storing plaintext 12-digit Aadhaar numbers.
4. **Doorstep 4-Digit Handshake OTP:** Eliminates bogus service completions and protects both the customer and the artisan before work begins.
5. **Trilingual Voice Accessibility:** Integrated speech-to-text recognition supporting **English, हिन्दी (Hindi), and मराठी (Marathi)** for vernacular and low-literacy artisans.
6. **Offline-First Progressive Web App (PWA):** Workbox-powered client-side caching ensures job schedules, worker profiles, and emergency contacts remain accessible in poor network zones (2G/3G Tier-2 & Tier-3 belts).
7. **Patronage Dividend Distribution:** Year-end platform operating surpluses are rebated back to worker-members proportional to their work volume and quality ratings.

---

## 📐 System Architecture

The project is structured as an enterprise-grade TypeScript monorepo with clean separation of concerns:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Frontend PWA                         │
│   App Router · TypeScript · TailwindCSS · TanStack Query · Recharts    │
│   Roles: Consumer · Worker / Artisan · Co-op Admin · Federation Admin   │
│   Trilingual i18n (en / hi / mr) · Offline Service Worker (`sw.js`)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / JSON & WebSockets
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Express.js REST API (`apps/api`)                    │
│   TypeScript · Socket.IO · Helmet · Winston Logger · Swagger OpenAPI   │
│   Escrow Payment Flow · Zod Schemas · JWT Auth & Dev OTP Fallback      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma Client
┌───────────────────────────────────▼────────────────────────────────────┐
│                    PostgreSQL / Supabase Database                      │
│   Multi-tenant Cooperative Data Model · Connection Pooler (PgBouncer)   │
│   Prisma ORM (`packages/db`) · Seed Data for Testing & Demonstration    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
   ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
   │ Razorpay Test │        │ UIDAI Offline │        │ Demand Trend  │
   │ Escrow Engine │        │ e-KYC Engine  │        │ Forecasting   │
   └───────────────┘        └───────────────┘        └───────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Framework & Technologies |
| :--- | :--- |
| **Frontend Framework** | **Next.js 14** (App Router), **React 18**, **TypeScript 5.5** |
| **PWA & Mobile Native** | `@ducanh2912/next-pwa`, Workbox, `@capacitor/android` |
| **Styling & Design System** | **TailwindCSS 3.4**, PostCSS, Autoprefixer, Custom Devanagari Typography |
| **State & Data Fetching** | **TanStack Query (React Query v5)**, **Zustand 5**, React Hook Form, **Zod** |
| **UI Components & Charts** | Radix UI Primitives, Lucide Icons, Recharts Analytics |
| **Backend REST API** | **Express.js 4.21**, **TypeScript**, Socket.IO (Real-Time Tracking) |
| **Security & Middleware** | Helmet, CORS, Morgan HTTP Logger, Winston Logging, JWT Bearer Auth |
| **Database & ORM** | **PostgreSQL**, **Prisma ORM 5.22**, Supabase PgBouncer Connection Pooler |
| **Internationalization** | Trilingual lightweight i18n catalogs (`en`, `hi`, `mr`) |
| **Payments & Escrow** | Razorpay Test Mode SDK with Commission Split & Payout Routing |

---

## 📦 Monorepo Directory Layout

```text
├── apps/
│   ├── api/                     # Node.js + Express TypeScript REST API
│   │   ├── src/
│   │   │   ├── controllers/     # Route handlers (auth, bookings, workers, etc.)
│   │   │   ├── middleware/      # JWT auth, RBAC guards, error handling
│   │   │   ├── routes/          # Express route definitions & Swagger JSDoc
│   │   │   ├── services/        # Escrow payments, OTP, cooperative logic
│   │   │   └── index.ts         # Server bootstrap & WebSocket setup
│   │   └── package.json
│   └── web/                     # Next.js 14 App Router PWA Frontend
│       ├── public/              # Manifest, icons, logos, service worker
│       ├── src/
│       │   ├── app/             # App Router pages (Consumer, Worker, Co-op Admin)
│       │   ├── components/      # UI components, voice search, PWA prompts
│       │   ├── hooks/           # Custom React hooks (auth, i18n, socket)
│       │   ├── i18n/            # Trilingual language catalogs (en, hi, mr)
│       │   └── store/           # Zustand global state slices
│       └── package.json
├── backend/                     # Python microservice (Aadhaar QR, statistical ML)
├── packages/
│   └── db/                      # Prisma schema, migrations, and seed scripts
│       └── prisma/
│           ├── schema.prisma    # Cooperative data models & relational schema
│           └── seed.ts          # Comprehensive testing fixtures
├── docs/                        # Architecture, API specifications, and security audits
├── docker-compose.yml           # Local container orchestration
└── package.json                 # Monorepo root scripts & workspace definitions
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** instance (Local or hosted via Supabase / Docker)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Pratikwarke15/shramik-co.git
cd shramik-co
npm install
```

### 2. Environment Configuration
Create `.env` in the project root (and `apps/web/.env.local` for client variables):

```env
# Database (PostgreSQL / Supabase PgBouncer URL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/sarvakarmakshamah?sslmode=disable"

# Authentication & Security
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
CORS_ORIGIN="http://localhost:3000"

# Public API URL for Frontend
NEXT_PUBLIC_API_URL="http://localhost:4000"

# Razorpay Test Credentials (Optional for payment flows)
RAZORPAY_KEY_ID="rzp_test_mock_key"
RAZORPAY_KEY_SECRET="mock_secret"
```

### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npx prisma generate --schema=packages/db/prisma/schema.prisma

# Push schema directly to the database
npx prisma db push --schema=packages/db/prisma/schema.prisma

# Seed demo users, cooperatives, and service categories
npm run seed --workspace=packages/db
```

### 4. Run Development Servers
Start both the Frontend and Backend concurrently with a single command:
```bash
npm run dev
```

- **Web Application & PWA:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000](http://localhost:4000)
- **Swagger Documentation:** [http://localhost:4000/docs](http://localhost:4000/docs)

---

## 🔑 Demo & Test Credentials

The database seed provides pre-configured role profiles for evaluation:

| Role | Phone Number | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Consumer** | `9812345601` | `password123` | Search artisans, voice booking, doorstep OTP verification |
| **Worker / Artisan** | `9876543201` | `password123` | Job acceptance, OTP handshake, wallet & Social Security Vault |
| **Cooperative Admin** | `9890000001` | `password123` | Worker approval, trade rate setup, dispute management |
| **Federation Admin** | `9999999999` | `admin123` | National cooperative oversight, regulatory compliance |

### Development OTP Handshake
When running in development or when SMS gateway credentials are not configured, OTP verification automatically logs to the server console:
```text
[AuthService] Generated OTP for +91 9812345601: 123456
```
Enter `123456` in the interface to verify your phone number.

---

## ⚖️ Statutory Alignment & Policy Compliance

* **The Code on Social Security, 2020 (Act No. 36 of 2020):** Aligned with Section 114 mandating aggregator welfare contributions to the National Social Security Board.
* **Ministry of Cooperation (*Sahakar Se Samriddhi*):** Promotes democratic multi-stakeholder governance and transparent patronage dividend allocation.
* **UIDAI Paperless Verification:** Strictly avoids storing 12-digit Aadhaar numbers in plaintext. Employs SHA-256 mobile hashes and offline XML digital signatures.

---

## 🤝 Contributing & Code Quality

Contributions, issues, and feature requests are welcome!

```bash
# Typecheck across all workspaces
npm run typecheck --workspace=apps/web
npm run typecheck --workspace=apps/api

# Run linting
npm run lint

# Production build validation
npm run build
```

---

## 📜 License

This project is licensed under the **MIT License** — feel free to inspect, modify, and build upon this platform cooperative framework.
