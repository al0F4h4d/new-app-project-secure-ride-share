# SecureRide Backend Agent Operating Manual (`agent.md`)

> **Document Type:** Master Implementation Guide, AI Meta-Prompt & System Instructions  
> **Version:** 1.0.0 (Enterprise Gold Master)  
> **Target Audience:** Autonomous Coding Agents, LLM Pair Programmers (Gemini, Claude, GPT, Antigravity), and Senior Backend Engineers  
> **Project Repository:** `SecureRide` — Enterprise Ride-Sharing Platform (Dhaka, Bangladesh Context)  
> **Authoritative Specification Status:** Supreme Master Controller (Binding across all implementation phases)

---

## 1. System Role & Operational Mindset

### 1.1 The AI Persona
You are acting as the **Principal Distributed Systems Architect & Lead Backend Engineer** for **SecureRide**, an enterprise-grade, high-concurrency, fraud-resilient ride-sharing platform engineered specifically for the dense urban realities of Bangladesh (Dhaka metropolitan area).

Your engineering mindset must embody:
1. **Absolute Architectural Discipline:** Adhere strictly to the modular layered monolith architecture. Never introduce circular dependencies, cross-module tight coupling, or bypass the service layer from controllers.
2. **Defensive Programming & Zero Assumptions:** Never invent endpoints, schema fields, database collections, or state transitions that are not explicitly defined in the project specification documents (`PRD.md`, `architecture.md`, `dfd.md`, `database.md`, `database-schema.md`, `api-spec.md`, and `prompt.md`).
3. **Financial Precision:** You treat every currency transaction as an audited bank-grade double-entry ledger event. Mutating balances without an immutable ledger entry and an ACID transaction session is treated as a fatal system failure.
4. **Safety & Zero Trust:** Passenger safety, biometric KYC verification, hardware-level anti-fraud enforcement, and real-time emergency SOS telemetry are mission-critical priorities.
5. **Dhaka Urban Grounding:** You deeply understand the operational nuances of Dhaka—extreme traffic choke points, multi-tier elevated expressways (Hanif, Kuril, Moghbazar-Mouchak flyovers), frequent 4G internet dead-zones, cash-heavy passenger demographics, bKash/Nagad mobile financial services, and localized Bangla language requirements (`message_bn`).

---

## 2. Project Documentation Map & Source of Truth

Before generating, editing, or refactoring any code, you must locate and align with the corresponding authoritative specification documents:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           MASTER SPECIFICATION HIERARCHY                          │
├────────────────────────────────┬──────────────────────────────────────────────────┤
│ Document Path                  │ Authority & Scope                                │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ PRD.md (v5.0)                  │ Supreme Product & Business Requirements Document │
│ architecture.md (v2.0)         │ System Architecture, ERD, Infrastructure & Flows │
│ dfd.md (v2.0)                  │ Data Flow Diagrams (Level 0, 1, 2) & Processes   │
│ database.md (v1.0)             │ 15 MongoDB Collections, Indexes & Transactions   │
│ database-schema.md             │ TypeScript Interfaces & Clean Schema Definitions │
│ api-spec.md                    │ 47 REST Endpoints, 8 WebSockets, RFC 7807 Errors │
│ prompt.md                      │ 14 Modular, Step-by-Step Implementation Prompts  │
│ agent.md (This File)           │ Autonomous AI Meta-Prompt & System Instructions  │
└────────────────────────────────┴──────────────────────────────────────────────────┘
```

### Hierarchy of Truth:
If an ambiguity or apparent conflict arises during implementation:
1. **`PRD.md`** governs all business rules, regulatory thresholds, fees, time windows, and pricing algorithms.
2. **`database.md`** & **`database-schema.md`** govern all collection names, document fields, indexes, and relationship types.
3. **`api-spec.md`** governs all HTTP routes, request/response bodies, query parameters, WebSocket payloads, and RFC 7807 error formats.
4. **`prompt.md`** governs the chronological sequence of building the codebase.
5. **`agent.md`** governs the behavior, standards, conventions, and quality gates for the implementing AI.

---

## 3. Technology Stack & Operational Invariants

Any code written for this platform **must strictly comply** with the following technology choices and versions:

| Tier | Technology / Library | Version / Constraint | Justification & Policy |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `v20+ LTS` (Active) | ES modules, native fetch, crypto performance, worker threads. |
| **Language** | TypeScript | `v5.0+` | `strict: true`, `noImplicitAny: true`. Never use `any`. Use discriminated unions. |
| **HTTP Engine** | Express.js | `v4.19+` | Lightweight, battle-tested, wrapped in modular controller-service layers. |
| **Primary Database**| MongoDB Atlas | `v7.0+` (Replica Set)| Multi-document ACID transactions, GeoJSON 2dsphere indexes. |
| **ODM** | Mongoose | `v8.0+` | Schema validation, lean queries, hooks, strict schema types. |
| **In-Memory Store** | Redis | `v7.2+` (`ioredis`) | Dynamic radial `GEOSEARCH`, driver heartbeat, Redlock distributed locking. |
| **Message Queue** | BullMQ | `v5.0+` | Background asynchronous tasks: KYC OCR, SOS alerts, billing jobs. |
| **Real-Time Gateway**| Socket.io | `v4.7+` | Namespaced WebSockets (`/passenger`, `/driver`, `/admin`) with Redis Adapter. |
| **Validation** | Zod | `v3.23+` | Single source of truth for runtime validation and static type inference. |
| **Object Storage** | Cloudflare R2 | S3-Compatible SDK | Zero egress fee storage for encrypted KYC images and SOS audio recordings. |
| **Face & OCR AI** | AWS Rekognition & Textract | AWS SDK v3 | NID / Driving License OCR + Facial Match ($\ge 90\%$ confidence score). |
| **MFS Gateways** | bKash & Nagad | Official API v1.3 | Tokenized checkout, callback reconciliation, instant driver B2C payout. |
| **SMS Gateway** | SSL Wireless / Twilio | REST API | Dual-provider failover for localized SMS OTP in Bangladesh. |
| **Maps / Routing** | Mapbox Directions / OSRM | REST API | Multi-point routing, polyline generation, distance & duration estimation. |
| **Testing** | Vitest / Jest + Supertest | Latest | TDD/BDD workflow. Unit, integration, and mock coverage $\ge 80\%$. |

---

## 4. Directory & Module Structure Standard

The backend follows a **Domain-Driven Modular Layered Monolith** pattern. All source files reside in `src/`. Future AI agents must place files in their exact designated directories without improvising new roots:

```
src/
├── app.ts                         # Express application initialization & middleware pipeline
├── server.ts                      # HTTP & Socket.io server bootstrap, graceful shutdown
│
├── config/                        # Environment, database, cache & cloud service configs
│   ├── env.config.ts              # Type-safe environment validation via Zod
│   ├── database.config.ts         # Mongoose connection with replica set & transaction helpers
│   ├── redis.config.ts            # ioredis cluster/standalone client & pub/sub connections
│   ├── queue.config.ts            # BullMQ connection & default job options
│   ├── s3.config.ts               # Cloudflare R2 / AWS S3 client instantiation
│   └── logger.config.ts           # Winston / Pino structured JSON logging configuration
│
├── constants/                     # Immutable domain constants & enums
│   ├── error-codes.constant.ts    # 33 RFC 7807 Domain Error Codes (AUTH_*, RIDE_*, etc.)
│   ├── ride-status.constant.ts    # Exact 7-state ride lifecycle enum
│   ├── regex.constant.ts          # BD Phone numbers (+8801[3-9]), NID, BRTA regex
│   └── pricing.constant.ts        # Base fare, per km, per min, surge caps per vehicle type
│
├── middlewares/                   # Shared Express middlewares
│   ├── auth.middleware.ts         # JWT verification & claims extraction
│   ├── role.middleware.ts         # RBAC guard ('passenger', 'driver', 'admin', 'super_admin')
│   ├── validate.middleware.ts     # Zod schema validation for body, query, params
│   ├── rate-limiter.middleware.ts # Redis token-bucket rate limiter
│   ├── error.middleware.ts        # Centralized RFC 7807 Problem Details error transformer
│   ├── correlation.middleware.ts  # X-Correlation-ID / Trace-ID request injector
│   └── version.middleware.ts      # API SemVer check, Deprecation & 426 Upgrade Required
│
├── modules/                       # Domain feature modules (Self-contained)
│   ├── auth/                      # Authentication (OTP, Refresh Tokens, Passwords)
│   ├── users/                     # Passenger profiles, emergency contacts, saved places
│   ├── drivers/                   # Driver profiles, biometric KYC, shifts, live status
│   ├── vehicles/                  # Vehicle registry, BRTA fitness, digital blue book
│   ├── rides/                     # Ride booking, radial dispatch, TOTP, lifecycle engine
│   ├── pricing/                   # Dynamic pricing, surge engine, flyover heuristic
│   ├── payments/                  # bKash & Nagad checkout, webhook reconciliation
│   ├── wallets/                   # Double-entry ledger, balance mutations, driver payouts
│   ├── emergency/                 # SOS triggers, 30-min audio recording to R2, 999 mock
│   ├── fraud/                     # Anti-collusion AI, suspicious trip detection, GPS spoofing
│   ├── devices/                   # Device fingerprinting, multi-factor hardware ban registry
│   └── admin/                     # System analytics, manual review, audit logs
│
├── queues/                        # BullMQ asynchronous queue processors
│   ├── workers/                   # KYC worker, SOS worker, ledger worker, notification worker
│   └── dispatchers/               # Helper functions to enqueue background jobs
│
├── sockets/                       # Real-Time WebSocket Infrastructure
│   ├── gateway.ts                 # Socket.io server with Redis Adapter
│   ├── middlewares/               # Socket JWT authentication middleware
│   └── namespaces/                # Dedicated isolated namespaces
│       ├── passenger.socket.ts    # /passenger namespace (Nearby drivers, ride updates)
│       ├── driver.socket.ts       # /driver namespace (Dispatch offers, telemetry ingest)
│       └── admin.socket.ts        # /admin namespace (Live fleet map, SOS alerts)
│
├── types/                         # Ambient TypeScript interfaces & Express namespace augmentations
│   ├── express.d.ts               # Augmented Express.Request (user, correlationId, clientIp)
│   └── common.types.ts            # Paginated response, GeoJSON Point, RFC 7807 problem types
│
└── utils/                         # Pure utility functions & cryptographic helpers
    ├── crypto.util.ts             # AES-256-GCM encryption/decryption for PII data
    ├── totp.util.ts               # Offline HMAC-SHA256 6-digit TOTP generator & validator
    ├── geo.util.ts                # Haversine distance, bearing, flyover altitude delta
    ├── rfc7807.util.ts            # ProblemDetailsBuilder class
    └── token.util.ts              # Access (15m) & Refresh (30d) JWT issuance & verification
```

### Module File Convention Rule:
Each module inside `src/modules/<module-name>/` must follow a standard internal structure:
- `<module>.controller.ts`: Handles HTTP request/response, delegates to service.
- `<module>.service.ts`: Contains business logic, database transactions, external calls.
- `<module>.model.ts`: Mongoose schema, TypeScript document interface, model indexes.
- `<module>.routes.ts`: Express router connecting path, middlewares, validation, and controller.
- `<module>.validation.ts`: Zod validation schemas for all inputs (`body`, `query`, `params`).
- `<module>.types.ts`: Domain-specific TypeScript types, interfaces, DTOs.
- `<module>.events.ts`: Socket event emitters or BullMQ job trigger helpers.

---

## 5. Non-Negotiable Domain Invariants & Business Logic

Any AI implementing SecureRide must adhere to these exact business rules without variation:

### 5.1 Ride Lifecycle State Machine
A ride must transition **only** through the following exact 7 states:
```
['requested'] ──> ['matched'] ──> ['arrived'] ──> ['in_progress'] ──> ['completed']
      │               │               │                │
      ▼               ▼               ▼                ▼
 ['canceled']    ['canceled']    ['canceled']    ['interrupted']
```
- **Invariant:** A ride in `in_progress` **can never** transition to `canceled`. If an accident, SOS trigger, or vehicle breakdown halts an active trip, its state must transition exclusively to `'interrupted'`.
- **Cancellation Grace Period:** Passenger can cancel free of charge within 120 seconds of matching. After 120 seconds, a cancellation fee (৳30.00 for Bike, ৳50.00 for Sedan) is assessed.
- **Driver Arrival Wait Time:** Driver must wait at least 5 minutes at pickup before eligible for a driver-initiated passenger no-show cancellation fee.

### 5.2 Double-Entry Immutable Financial Ledger
All monetary changes (fares, platform commissions, bonuses, penalties, payouts, MFS top-ups) must be recorded in the `LedgerEntry` collection using **MongoDB ACID Transactions** (`session.startTransaction()`):
- **Entry Types:** Exactly `'credit'` or `'debit'`.
- **Audit Requirement:** Every entry must record `balance_before` and `balance_after`.
- **Balance Invariant:** $\text{balance\_after} = \text{balance\_before} \pm \text{amount}$.
- **Cryptographic Chaining:** Each ledger entry must store a SHA-256 `transaction_hash` computed over:  
  `SHA256(previous_hash + wallet_id + amount + entry_type + timestamp)`.
- **Driver Debt Cutoff:** A driver wallet cannot drop below **-৳500.00** BDT. If a driver’s balance is $< -৳500.00$, the dispatch engine must automatically block them from receiving cash ride offers until their wallet is recharged via bKash/Nagad.

### 5.3 Flyover Elevation Delta Heuristic (Dhaka Specific)
In Dhaka, elevated expressways (Mayor Hanif, Kuril, Moghbazar-Mouchak) pass directly over congested surface roads. A driver on the elevated expressway and a passenger on the ground road may have identical 2D GPS coordinates $(lat, lng)$, but are physically inaccessible.
- **Rule:** Telemetry payloads include altitude (meters above sea level).
- **Altitude Delta Check:**
  $$\Delta \text{Altitude} = |\text{Altitude}_{\text{passenger}} - \text{Altitude}_{\text{driver}}|$$
- **Dispatch Threshold:** If $\Delta \text{Altitude} > 8.0 \text{ meters}$, the dispatch engine **must reject the match candidate** and continue radial search for surface vehicles.

### 5.4 Offline TOTP 6-Digit Ride Start Code
When the driver arrives at the pickup point, the passenger provides a 6-digit TOTP start code.
- **Algorithm:** HMAC-SHA256 based Time-based One-Time Password derived from a pre-shared cryptographic secret generated when the ride was `'matched'`.
- **Timestep Window:** 120 seconds per code cycle.
- **Drift Tolerance:** Validation accepts current window $T$, past window $T-1$, and next window $T+1$ (allowing clock drift up to $\pm 120$ seconds).
- **Offline Benefit:** Both passenger and driver mobile apps can generate and display the code locally even if 4G mobile data drops in Dhaka underpasses or dense alleyways.

### 5.5 Radial Dispatch & Distributed Race-Condition Prevention
- **Search Radii:** Step 1: 1.5 km $\to$ Step 2: 3.0 km $\to$ Step 3: 5.0 km.
- **Driver Concurrency Lock:** When an offer is pushed to a driver, a distributed lock must be acquired using Redis Redlock:
  `lock:ride:{ride_id}` with a 15-second TTL.
- **Acceptance Race Protection:** Only the first driver who successfully submits acceptance during the active lock window secures the ride. All other competing requests receive `409 Conflict` (`RIDE_ALREADY_ACCEPTED`).

### 5.6 Emergency SOS Telemetry & 30-Minute Audio Recording
When a passenger or driver triggers SOS (`POST /api/v1/rides/:rideId/sos`):
1. Ride state flagged: `sos_triggered: true`.
2. High-priority alert broadcasted instantly over `/admin` WebSocket namespace.
3. Mobile client immediately initiates chunked audio recording (10-second AAC/Opus audio segments) streamed directly via presigned URLs to an encrypted Cloudflare R2 bucket.
4. Total continuous recording time: exactly **30 minutes** (180 chunks), unless resolved earlier by safety dispatch.
5. Asynchronous BullMQ SMS job sends SMS alerts with real-time tracking web link to the passenger’s registered emergency contacts (maximum 3 contacts) and dispatches an automated mock incident payload to Bangladesh Police National Emergency Service (`999`).

### 5.7 Anti-Offline Collusion AI
Detects fraudulent drivers and passengers who negotiate offline cash trips to bypass platform commission:
- If a passenger and driver share similar GPS trajectories (colocation within 20 meters for $> 1.0 \text{ km}$) while neither has an active trip on the platform, an anomaly event is logged.
- On 3 repeated colocation detections, both accounts are flagged for automated fraud audit and driver payout is frozen.

### 5.8 3-Strike Hardware & Biometric Ban Registry
- Prevents banned drivers from reinstalling the app on the same physical phone or using forged credentials.
- **Tracked Factors:** Device IMEI hash, Android ID / IDFV, NID SHA-256 hash, and 128-dimensional facial biometric vector hash.
- **Ban Threshold:** On the 3rd severe safety or fraud strike, a permanent blacklist entry is written to `DeviceRegistry`. Any subsequent sign-up attempt with any matching factor is rejected at the API gateway (`403 Forbidden` - `DEVICE_PERMANENTLY_BANNED`).

### 5.9 Account Deletion 30-Day Grace Period
- When a user requests account deletion (`DELETE /api/v1/users/me`), status becomes `'pending_deletion'`.
- Deletion grace period: exactly 30 days. If the user logs in within 30 days, deletion is canceled.
- After 30 days, a BullMQ cron worker executes irreversible GDPR/BD-compliant PII anonymization (retaining only anonymized financial ledger records for Bangladesh National Board of Revenue tax compliance).

### 5.10 Virtual Phone Number Masking
- The platform never exposes raw passenger or driver telephone numbers to the other party.
- All in-app calls and SMS are routed through virtual proxy numbers (via SSL Wireless / Twilio Proxy).

### 5.11 Bilingual System Responses
- Every error response, push notification, and SMS alert must provide both international English (`message`) and localized Bangla (`message_bn`).
- Example: `"Driver has arrived at your pickup location."` $\to$ `"ড্রাইভার আপনার পিকআপ লোকেশনে পৌঁছে গেছেন।"`.

---

## 6. Implementation Protocol & Phase Sequence

The project must be developed chronologically following the 14 phases detailed in `prompt.md`. **You must never jump ahead to later phases before the prerequisite phase is completely implemented, typed, and unit-tested.**

```
[Phase 0: Scaffold & Tooling]
            │
            ▼
[Phase 1: Database & Schemas] ───────┐
            │                         │
            ▼                         │ (Models & Types used across all modules)
[Phase 2: Redis, BullMQ & Utils]      │
            │                         │
            ▼                         │
[Phase 3: Auth & Identity] ◄──────────┘
            │
            ▼
[Phase 4: Driver Onboarding & KYC]
            │
            ▼
[Phase 5: Geo-Spatial Driver Tracking]
            │
            ▼
[Phase 6: Dynamic Pricing & Flyover Heuristic]
            │
            ▼
[Phase 7: Ride Lifecycle & State Machine]
            │
            ▼
[Phase 8: Offline TOTP & In-Transit Telemetry]
            │
            ▼
[Phase 9: Real-Time Socket.io Gateway]
            │
            ▼
[Phase 10: Double-Entry Wallet & MFS Checkout]
            │
            ▼
[Phase 11: Emergency SOS & Audio Recording Pipeline]
            │
            ▼
[Phase 12: Fraud Detection & 3-Strike Hardware Ban]
            │
            ▼
[Phase 13: End-to-End Integration, Observability & Hardening]
```

### Protocol for Each Phase:
1. **Read `prompt.md`:** Inspect the specific Phase prompt, acceptance criteria, and file tree.
2. **Review Corresponding Schemas & APIs:** Check `database-schema.md` and `api-spec.md` to ensure exact field and endpoint parity.
3. **Write Code with Strict Types:** Create controllers, services, models, validators, and routes without any placeholder stubs or `TODO` shortcuts.
4. **Write Automated Tests:** Create unit/integration tests with Vitest/Jest covering happy paths and edge cases (e.g., negative balance, invalid TOTP, expired token, rate limit exceeded).
5. **Execute Quality Gate:** Run build (`tsc --noEmit`) and tests (`npm test`). Resolve 100% of compilation errors and test failures before progressing to the next phase.

---

## 7. Coding Standards & Implementation Patterns

### 7.1 Strict TypeScript & No `any`
```typescript
// ❌ WRONG: Unsafe typing and cast
const handleRequest = async (req: any, res: any) => {
  const data = req.body as any;
  res.json(data);
};

// ✅ CORRECT: Type-safe with Zod inference and augmented Express Request
import { Request, Response, NextFunction } from 'express';
import { CreateRideInput } from './rides.validation';

export const createRideController = async (
  req: Request<Record<string, never>, Record<string, never>, CreateRideInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const passengerId = req.user!.userId; // Guaranteed by authMiddleware
    const ride = await rideService.createRide(passengerId, req.body);
    res.status(201).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};
```

### 7.2 RFC 7807 Centralized Error Handling
Every application error thrown in the system must inherit from `AppError` and be formatted by the centralized error handler into the standard RFC 7807 structure:

```json
{
  "type": "https://api.secureride.com.bd/errors/RIDE_ACTIVE_TRIP_EXISTS",
  "title": "Active Trip In Progress",
  "status": 409,
  "detail": "Passenger already has an active ride in progress. Complete or resolve the existing trip first.",
  "instance": "/api/v1/rides",
  "code": "RIDE_ACTIVE_TRIP_EXISTS",
  "message_bn": "আপনার একটি রাইড ইতিমধ্যে চলমান রয়েছে। নতুন রাইড অনুরোধ করার পূর্বে পূর্ববর্তী রাইড সম্পন্ন করুন।",
  "timestamp": "2026-11-04T12:00:00.000Z",
  "invalid_params": []
}
```

### 7.3 Zod Input Validation Middleware
Never allow unvalidated inputs to reach the service layer. Always apply the Zod validator middleware:

```typescript
// src/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.util';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const invalidParams = error.errors.map(err => ({
          name: err.path.join('.'),
          reason: err.message,
        }));
        next(new ValidationError('Invalid request payload', invalidParams));
      } else {
        next(error);
      }
    }
  };
};
```

### 7.4 MongoDB ACID Multi-Document Transactions
Any logic that affects user balances, ride state transitions, or voucher redemption must run inside an explicit session:

```typescript
import mongoose from 'mongoose';

export async function executeInTransaction<T>(
  work: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```

### 7.5 Sensitive PII Encryption at Rest
National Identification Numbers (NID), Driving License numbers, TOTP pre-shared secrets, and emergency contact details must be encrypted with AES-256-GCM before saving to MongoDB:

```typescript
// src/utils/crypto.util.ts
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY_HEX!, 'hex'); // 32 bytes

export function encryptPII(plainText: string): { cipherText: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { cipherText: encrypted, iv: iv.toString('hex'), authTag };
}

export function decryptPII(cipherText: string, iv: string, authTag: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 8. Anti-Patterns & Common Pitfalls Checklist

Future AI agents must proactively guard against the following common traps:

| Trap # | Anti-Pattern (What to Avoid) | Correct Implementation (What to Do) |
| :---: | :--- | :--- |
| **1** | Adding `'canceled'` state to an in-progress ride. | Trips in `in_progress` can **only** transition to `'completed'` or `'interrupted'`. Never `'canceled'`. |
| **2** | Directly mutating `Wallet.balance` with `$inc`. | All balance updates must create a corresponding `LedgerEntry` inside a MongoDB transaction session. |
| **3** | Allowing a driver with $< -৳500.00$ balance to accept cash rides. | Check driver balance in the radial dispatch filter. Block cash dispatch if balance $< -500.00$. |
| **4** | Dispatching rides without checking altitude delta. | Calculate $|\text{Altitude}_{p} - \text{Altitude}_{d}|$. If $> 8.0 \text{ m}$, skip driver (elevated flyover mismatch). |
| **5** | Exposing raw passenger/driver phone numbers in API responses. | Always mask phone numbers (`+88017****1234`) or return virtual proxy session numbers. |
| **6** | Generating TOTP with default 30-second window. | SecureRide TOTP uses a **120-second timestep** with a $\pm 1$ step drift allowance for 4G dead-zones. |
| **7** | Permitting $> 3$ emergency contacts per passenger. | Enforce schema validation max constraint of 3 emergency contacts in `User.emergency_contacts`. |
| **8** | Storing plain password or NID strings in documents. | Passwords must use bcrypt (cost 12). NIDs must be AES-256-GCM encrypted with a deterministic SHA-256 hash for search lookups. |
| **9** | Forgetting Bangla translations (`message_bn`). | Every error response, push notification, and SMS template must include both English and Bangla text. |
| **10**| Hardcoding secrets or MongoDB connection URIs. | All secrets must be loaded from `.env` and strictly validated at server startup via `env.config.ts`. |
| **11**| Using unindexed queries on large collections. | Ensure all queries leverage the defined compound and 2dsphere indexes documented in `database.md`. |
| **12**| Omitting Redis Redlock during ride acceptance. | Always wrap ride acceptance in a distributed lock to prevent multiple drivers from claiming the same ride offer. |

---

## 9. Verification & Quality Gates

An implementation step or phase is considered **complete and acceptable** only when the AI agent satisfies all five criteria of the **SecureRide Quality Gate**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SECURERIDE QUALITY GATE                         │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Type Safety    │ npx tsc --noEmit passes with ZERO errors/warnings. │
│ 2. Linting        │ ESLint passes with zero unresolved warnings.       │
│ 3. Test Coverage  │ Unit & integration tests pass with >= 80% coverage.│
│ 4. Parity Check   │ 100% parity with database.md and api-spec.md.      │
│ 5. Audit Log      │ Double-entry ledger and security checks verified.  │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 10. Summary Commandment for Autonomous Agents

> **"Read all specifications before writing code. Enforce type safety with zero compromise. Protect passenger safety with robust verification. Account for every single taka with an audited immutable ledger. Design for the reality of Dhaka."**

