# SecureRide Backend Implementation Prompts — Master Engineering Roadmap
**Document Version:** 1.0 (Production Implementation Specification)  
**System Name:** SecureRide Intelligent Ride-Sharing Platform (Backend First)  
**Target Stack:** Node.js 20+ • Express.js • TypeScript 5+ • MongoDB Atlas (Mongoose 8+) • Redis Cluster (ioredis) • BullMQ • Socket.io  
**Governing Documents:**  
- `PRD.md` (Product Requirements Document v5.0)  
- `architecture.md` (System Architecture Specification v2.0)  
- `database.md` & `database-schema.md` (Data Architecture & Field Definitions v1.0)  
- `api-spec.md` (REST API & WebSocket Specification v1.0)  
- `dfd.md` (Data Flow Diagram Specification v2.0)  
**Last Updated:** 2026-11-04  
**Status:** Approved Technical Execution Guide  

---

## Roadmap Overview & Execution Principles

This document contains **14 modular, feature-by-feature implementation prompts** designed to build the entire SecureRide backend from zero to production readiness.

### How to Use These Prompts:
1. **Execute Sequentially:** Each phase builds upon the artifacts, types, and database models created in preceding phases. Do not skip phases.
2. **Backend First:** All database models, domain business rules, RESTful endpoints, background workers, and real-time WebSocket contracts are built and verified with integration tests before frontend client consumption.
3. **Strict Conformity:** Every prompt enforces exact schema naming from `database-schema.md`, route paths from `api-spec.md`, and business rules from `PRD.md`.
4. **Clean Architecture:** Code must follow the modular layered monolith pattern (`server/src/modules/`, `server/src/models/`, `server/src/jobs/`, `server/src/websocket/`).

---

## Phase 0: Project Scaffolding, TypeScript Config & Core Infrastructure

```markdown
### TASK: Phase 0 — Project Initialization, Environment & Core Utilities

#### Objective:
Initialize the `server/` Node.js TypeScript project, install core dependencies, configure environment management, connect to MongoDB Atlas and Redis, and establish global middleware (RFC 7807 error handling, API version gating, Winston logging, and security headers).

#### Reference Documents:
- `architecture.md` Section 2 (Directory Structure) & Section 11 (Resilience)
- `api-spec.md` Section 1 (Global Standards), Module 13 (Version Control), Module 14 (Error Handling)

#### Target File Tree:
```
server/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── logger.config.ts
│   │   └── s3.config.ts
│   └── common/
│       ├── constants/
│       │   ├── errorCodes.constant.ts
│       │   └── roles.constant.ts
│       ├── errors/
│       │   └── appError.ts
│       ├── middlewares/
│       │   ├── errorHandler.middleware.ts
│       │   ├── versionGate.middleware.ts
│       │   └── rateLimiter.middleware.ts
│       └── utils/
│           ├── response.util.ts
│           └── crypto.util.ts
```

#### Detailed Requirements:
1. **Dependencies:**
   - Runtime: `express`, `mongoose`, `ioredis`, `bullmq`, `jsonwebtoken`, `argon2`, `zod`, `cors`, `helmet`, `winston`, `socket.io`, `dotenv`, `opossum`, `cookie-parser`, `uuid`.
   - DevDependencies: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/cookie-parser`, `@types/uuid`, `ts-node-dev`, `jest`, `@types/jest`, `supertest`, `@types/supertest`.
2. **Environment Configuration (`env.config.ts`):**
   - Validate environment variables using Zod schema (`PORT`, `NODE_ENV`, `MONGODB_URI`, `REDIS_HOST`, `REDIS_PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDFLARE_R2_BUCKET`, `AWS_REGION`, etc.).
3. **Database & Cache Connection:**
   - `database.config.ts`: Mongoose connection with connection pooling (`maxPoolSize: 50`), auto-reconnect, and error event listeners.
   - `redis.config.ts`: `ioredis` client with exponential backoff retry strategy.
4. **API Version Gating Middleware (`versionGate.middleware.ts`):**
   - Check `X-App-Version` header against Redis key `config:min_supported_version:{platform}`.
   - Return `HTTP 426 Upgrade Required` with localized message if version is outdated.
5. **Global RFC 7807 Error Handler (`errorHandler.middleware.ts`):**
   - Intercept `AppError`, Zod validation errors, and uncaught exceptions.
   - Return standardized JSON envelope (`success: false`, `statusCode`, `errorCode`, `message`, `message_bn`, `errors[]`, `recoveryAction`, `meta.requestId`). Strip stack traces in production.
6. **Express Application Bootstrap (`app.ts` & `server.ts`):**
   - Configure Helmet security headers, CORS with strict origin validation, JSON parser with 10MB limit, and cookie parser.
   - Health check route: `GET /health` returning DB and Redis status.

#### Verification & Acceptance Criteria:
- Run `npm run build` with zero TypeScript errors (`noImplicitAny: true`, `strict: true`).
- Run `npm run dev` and test:
  - `GET /health` returns `{"status": "ok", "database": "connected", "redis": "connected"}`.
  - Sending `X-App-Version: 1.0.0` when min version is `2.2.0` triggers `426 Upgrade Required`.
```

---

## Phase 1: Mongoose Models & Database Schemas (All 15 Collections)

```markdown
### TASK: Phase 1 — Comprehensive Data Modeling & MongoDB Index Initialization

#### Objective:
Implement all fifteen (15) MongoDB Mongoose schemas, TypeScript interfaces, and index configurations strictly adhering to `database-schema.md` and `database.md`.

#### Reference Documents:
- `database-schema.md` (Sections 2.1 to 2.15)
- `database.md` (Section 4: Indexing Strategy, Section 5: $jsonSchema, Section 9: Mongoose Schemas)

#### Target File Tree:
```
server/src/models/
├── user.model.ts
├── driverProfile.model.ts
├── vehicle.model.ts
├── trip.model.ts
├── payment.model.ts
├── walletTransaction.model.ts
├── passengerWalletTransaction.model.ts
├── deviceBlacklist.model.ts
├── nidBlacklist.model.ts
├── sosAuditLog.model.ts
├── telemetryLog.model.ts
├── chatMessage.model.ts
├── loyaltyPoints.model.ts
├── loyaltyTransaction.model.ts
├── commissionPass.model.ts
└── index.ts
```

#### Detailed Requirements:
1. **User Model (`user.model.ts`):**
   - Fields: `phone_number` (unique), `email` (sparse), `password_hash`, `role` (`passenger` | `driver` | `admin`), `admin_sub_role` (`ops` | `safety` | `super` | `null`), `full_name`, `emergency_contacts` (validated array, max 3 items), `saved_addresses`, `passenger_wallet_balance` (Decimal128, default 0.00), `rating_avg` (1.00 - 5.00), `language_preference` (`bn` | `en`), `deletion_status` (`active` | `pending_deletion` | `deleted`).
2. **Driver Profile Model (`driverProfile.model.ts`):**
   - References `users._id`. Fields: `nid_number`, `license_number` (unique), `license_category` (`motorcycle` | `light_vehicle`), `facial_vector_hash`, `verification_status` (`pending` | `approved` | `rejected`), `current_wallet_balance` (Decimal128), `active_vehicle_id` (ref `vehicles`), `commission_pass_active`, `vehicle_mismatch_count`, `offline_collusion_strikes` (default 0), `deprioritized_until`, `is_permanently_banned`.
3. **Trip Model (`trip.model.ts`):**
   - Fields: `trip_code` (unique), `passenger_id`, `driver_id`, `vehicle_id`, `pickup_geo` (2dsphere Point), `dropoff_geo` (2dsphere Point), `status` (`requested` | `matched` | `arrived` | `in_progress` | `completed` | `canceled` | `interrupted`), `upfront_fare` (Decimal128), `surge_multiplier`, `payment_method` (`bkash` | `nagad` | `cash`), `pickup_otp_hash`, `route_breadcrumbs` array, `sos_events` array (with `audio_recording_url`), `cancellation_metadata`.
4. **Financial Ledger Models (`walletTransaction.model.ts` & `passengerWalletTransaction.model.ts`):**
   - Double-entry fields: `entry_type` (`credit` | `debit`), `transaction_type`, `amount` (Decimal128), `balance_before`, `balance_after`, `status`. Immutable append-only design.
5. **Compliance & Privacy Models:**
   - `telemetryLog.model.ts`: Geospatial coordinates + barometer/altitude + TTL index expiring in 48 hours.
   - `chatMessage.model.ts`: Trip messaging with TTL index expiring in 7 days.
   - `deviceBlacklist.model.ts`: Multi-factor 3-strike hardware ban hashes.
   - `nidBlacklist.model.ts`: Pre-registration NID blacklist.
   - `sosAuditLog.model.ts`: Audit log of audio playbacks and 999 escalations.
6. **Index Bootstrap Script (`server/src/scripts/initIndexes.ts`):**
   - Automates creation of compound, sparse, TTL, and 2dsphere indexes.

#### Verification & Acceptance Criteria:
- Write unit tests in `tests/models/` verifying schema validation rules (e.g. attempting to push 4 emergency contacts throws ValidationError).
- Verify all 15 models export both TypeScript interfaces (`IUser`, `ITrip`, etc.) and Mongoose models.
- Index creation script executes successfully against test MongoDB container.
```

---

## Phase 2: Authentication, Identity & RBAC Module (`/auth`)

```markdown
### TASK: Phase 2 — Dual-Tier Authentication, Argon2id, JWT Rotation & Blacklist Gates

#### Objective:
Implement user registration, SMS OTP dispatch with Redis TTL, Argon2id password hashing, single-use Refresh Token Rotation, and role-based access control (RBAC) middleware supporting Admin sub-roles.

#### Reference Documents:
- `PRD.md` Stories P1, D1
- `architecture.md` Section 6 (Auth Architecture & RBAC)
- `api-spec.md` Module 1 (Endpoints 2.1 to 2.6)

#### Target File Tree:
```
server/src/modules/auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.repository.ts
├── auth.validation.ts
├── auth.routes.ts
└── auth.types.ts
server/src/common/middlewares/
├── auth.middleware.ts
├── role.middleware.ts
└── deviceGuard.middleware.ts
server/src/common/utils/
├── jwt.util.ts
├── otp.util.ts
└── sms.util.ts
```

#### Detailed Requirements:
1. **SMS OTP Generation & Rate Limiting (`POST /auth/send-otp`):**
   - Validate mobile number with regex `^(?:\+8801|01)[3-9]\d{8}$`.
   - Check `NID_BLACKLIST` collection if NID is provided; if match found, reject with `403 AUTH_NID_BLACKLISTED`.
   - Rate limit: Max 3 requests / 10 minutes stored in Redis.
   - Generate cryptographically secure 6-digit OTP, store in Redis with 120s TTL (`otp:{phone}`), dispatch via SMS aggregator interface.
2. **OTP Verification (`POST /auth/verify-otp`):**
   - Max 5 failed attempts before 15-minute phone lockout.
   - If verified:
     - If existing user $\rightarrow$ Generate Access Token + Refresh Token cookie.
     - If new user $\rightarrow$ Store registration ticket in Redis (10m TTL) and return ticket to client.
3. **Registration (`POST /auth/register`):**
   - Validate registration ticket.
   - Hash password using **Argon2id** (`m=65536, t=3, p=4`).
   - If role is `driver`, atomically create linked `driver_profiles` record in pending state.
4. **Login & Device Check (`POST /auth/login`):**
   - Verify phone & password.
   - Query `DEVICE_BLACKLISTS` using submitted hardware hashes (`imei_hash`, `android_id`); reject with `403 AUTH_DEVICE_BANNED` if banned.
5. **JWT Token Rotation (`POST /auth/refresh-token`):**
   - Access Token: RS256 signed, 15m expiration, payload `{ userId, role, admin_sub_role }`.
   - Refresh Token: Stored hashed in MongoDB with token family ID. If an already-used refresh token is presented, revoke the entire token family (theft detection).
6. **Security Middleware:**
   - `auth.middleware.ts`: Verifies Bearer JWT, attaches `req.user`.
   - `role.middleware.ts`: Enforces role boundaries (`passenger`, `driver`, `admin_ops`, `admin_safety`, `admin_super`).

#### Verification & Acceptance Criteria:
- Test complete registration flow via Postman/Supertest: Send OTP $\rightarrow$ Verify OTP $\rightarrow$ Register $\rightarrow$ Receive valid JWT.
- Test rate limit: 4th OTP request within 10 minutes returns `429 AUTH_OTP_RATE_LIMIT`.
- Test refresh token reuse: Presenting an old refresh token invalidates all sessions for that user.
```

---

## Phase 3: Passenger Profile & Account Lifecycle Module (`/passengers`)

```markdown
### TASK: Phase 3 — Commuter Profile, Saved Addresses & 30-Day Account Deletion

#### Objective:
Implement passenger profile management, emergency contact validation, address book persistence, and the automated 30-day grace period account deletion lifecycle complying with regulatory standards.

#### Reference Documents:
- `PRD.md` Story P2
- `architecture.md` Section 11.4 (Account Deletion Lifecycle)
- `api-spec.md` Module 2 (Endpoints 3.1 to 3.6)

#### Target File Tree:
```
server/src/modules/passenger/
├── passenger.controller.ts
├── passenger.service.ts
├── passenger.validation.ts
├── passenger.routes.ts
└── passenger.types.ts
server/src/jobs/
└── accountDeletionWorker.ts
```

#### Detailed Requirements:
1. **Profile Management (`GET /passengers/me`, `PATCH /passengers/me`):**
   - Return passenger identity, rating average, in-app wallet balance, and localized preference (`bn` | `en`).
   - Allow updating display name, email, profile photo URL, and language preference.
2. **Emergency Contacts (`PUT /passengers/emergency-contacts`):**
   - Enforce maximum 3 emergency contacts with Zod validation.
   - Each contact requires `name`, `phone_number` (valid BD mobile), and `relationship`.
3. **Saved Address Book (`POST`, `GET`, `DELETE /passengers/saved-addresses`):**
   - Store favorite places (`Home`, `Work`, `Other`) with formatted address string and GeoJSON `[longitude, latitude]`.
4. **Account Deletion Lifecycle (`POST /passengers/account-deletion`):**
   - Require password confirmation.
   - Set `deletion_status = 'pending_deletion'`, `deletion_requested_at = now`, `scheduled_deletion_at = now + 30 days`.
   - Passenger can revoke deletion before 30 days via `DELETE /passengers/account-deletion`.
5. **BullMQ Daily Cron Worker (`accountDeletionWorker.ts`):**
   - Runs daily at 02:00 AM.
   - Finds all accounts where `scheduled_deletion_at <= now` AND `deletion_status = 'pending_deletion'`.
   - **PII Scrubbing:** Nullify `full_name`, `email`, `phone_number`, `profile_photo_url`, `emergency_contacts`.
   - Retain anonymized `trips` and `passenger_wallet_transactions` records for 7-year statutory financial audit compliance.
   - Mark `deletion_status = 'deleted'`.

#### Verification & Acceptance Criteria:
- Unit test: Submitting 4 emergency contacts fails with `400 VALIDATION_FAILED`.
- Integration test: Requesting deletion sets `scheduled_deletion_at` 30 days ahead; worker execution scrubs PII while preserving financial history.
```

---

## Phase 4: Driver Onboarding, KYC Verification & Fleet Management (`/drivers`)

```markdown
### TASK: Phase 4 — Two-Step KYC, AWS OCR/Face Match, Fleet Vehicles & Pro Passes

#### Objective:
Implement driver onboarding with document parsing, AWS Rekognition facial comparison, BRTA vehicle fleet registration, active vehicle dispatch selection, and Pro-Captain zero-commission subscription passes.

#### Reference Documents:
- `PRD.md` Stories D2, D3, D7, D10
- `architecture.md` Section 8.1 (Driver KYC Verification), Section 9.2 (Commission Passes)
- `api-spec.md` Module 3 (Endpoints 4.1 to 4.6)

#### Target File Tree:
```
server/src/modules/driver/
├── driver.controller.ts
├── driver.service.ts
├── driver.validation.ts
├── driver.routes.ts
└── driver.types.ts
server/src/common/services/
├── ocr.service.ts         # AWS Textract wrapper
├── rekognition.service.ts # AWS Rekognition CompareFaces wrapper
└── storage.service.ts     # Cloudflare R2 S3-compatible client
server/src/jobs/
└── taxTokenExpiryWorker.ts
```

#### Detailed Requirements:
1. **Step 1 Document Upload (`POST /drivers/kyc/step1-identity`):**
   - Accept multipart upload of Smart NID (front/back) and BRTA Driving License.
   - Upload encrypted files to Cloudflare R2 bucket.
   - Call AWS Textract to parse NID number, license number, and category (`motorcycle` | `light_vehicle`). Verify license expiry date is in the future.
2. **Step 2 Biometrics & Face Match (`POST /drivers/kyc/step2-biometrics`):**
   - Accept live selfie and liveness SDK token.
   - Call AWS Rekognition `CompareFaces` comparing live selfie against NID face portrait.
   - If similarity $\ge 90\%$, queue profile for Admin review.
   - If similarity $< 90\%$, increment `failed_verification_attempts`. If failed, set `lockout_until = now + 1 hour` (`422 DRIVER_FACIAL_MISMATCH`). If 3 consecutive failures occur, invoke 3-strike device ban.
3. **Vehicle Fleet Registry (`POST /drivers/vehicles`):**
   - Validate BRTA registration format (e.g. `Dhaka Metro-HA 45-8912`).
   - Validate Tax Token expiry date is $\ge \text{Today} + 15\text{ days}$.
   - Multiple vehicles can be registered under one driver; only approved vehicles can be activated.
4. **Active Vehicle Selector (`PATCH /drivers/vehicles/:id/activate`):**
   - Points `driver_profiles.active_vehicle_id` to selected approved vehicle.
5. **Online/Offline Dispatch Gate (`PATCH /drivers/status/online`):**
   - Block online toggle if driver has no approved active vehicle (`400 DRIVER_NO_ACTIVE_VEHICLE`).
   - Block online toggle if driver wallet balance is below debt threshold ($< -৳500.00$) (`403 DRIVER_WALLET_DEBT_LIMIT`).
6. **Pro-Captain Commission Pass Purchase (`POST /drivers/commission-pass/purchase`):**
   - Daily Pass (৳99 / 24h) or Weekly Pass (৳599 / 7 days).
   - Records `commission_passes` entry and sets `commission_pass_active = true` on driver profile.
7. **Tax Token Expiry Worker (`taxTokenExpiryWorker.ts`):**
   - Daily cron: Checks vehicles where `tax_token_expiry < Today + 15 days`. Sets `is_approved = false` and notifies driver.

#### Verification & Acceptance Criteria:
- Mock AWS services in unit tests to test face similarity $\ge 90\%$ vs $< 90\%$.
- Verify driver with wallet balance of -৳505.00 cannot go online.
- Verify Pro-Captain pass grants 0% commission status until expiry.
```

---

## Phase 5: Fare Quotation, Dynamic Surge & Radial Dispatch Engine (`/dispatch`)

```markdown
### TASK: Phase 5 — Upfront Pricing, Flyover Elevation Heuristic & Redis Redlock Dispatch

#### Objective:
Implement upfront fare quotation with dynamic surge, weather floors, flyover elevation filtering, 3-tier radial search, and Redis Redlock distributed mutual exclusion for driver offer acceptance.

#### Reference Documents:
- `PRD.md` Stories P3, P4, P6, D4
- `architecture.md` Section 7 (Dispatch, Geospatial Indexing & Upfront Fare Engine)
- `api-spec.md` Module 4 (Endpoints 5.1 to 5.3)

#### Target File Tree:
```
server/src/modules/dispatch/
├── dispatch.controller.ts
├── dispatch.service.ts
├── dispatch.validation.ts
├── dispatch.routes.ts
├── fareCalculator.service.ts
└── radialMatcher.service.ts
server/src/jobs/
├── surgeCalculationWorker.ts
└── searchTimeoutWorker.ts
```

#### Detailed Requirements:
1. **Fare Quotation Algorithm (`POST /dispatch/fare-quote`):**
   - Calculate road distance and travel duration via Mapbox Directions API (with OSRM fallback).
   - Formula:
     $$\text{Fare} = \max(\text{BaseFare}, (\text{Base} + (\text{Dist} \times \text{PerKm}) + (\text{Dur} \times \text{PerMin})) \times \text{Surge}) - \text{Discount}$$
   - Apply vehicle caps: Bike (max 1.4x), Car (max 1.5x), Microbus (max 1.3x).
   - Cache quote in Redis with 5-minute TTL (`quote:{quoteId}`).
2. **Surge Multiplier Worker (`surgeCalculationWorker.ts`):**
   - BullMQ cron running every 5 minutes per zone geohash.
   - If $\frac{\text{pending\_requests}}{\text{online\_drivers}} > 1.5 \rightarrow$ trigger surge multiplier step.
   - Check OpenWeatherMap API: if rain detected $\rightarrow$ enforce minimum surge floor of **1.2x**.
3. **Flyover Elevation Heuristic:**
   - In urban corridors (Mayor Hanif Flyover), compare passenger altitude with candidate driver altitude:
     $$\text{Separation Score} = w_1 \cdot |\text{Alt}_{\text{passenger}} - \text{Alt}_{\text{driver}}| + w_2 \cdot (1 - \cos(\theta_{\text{diff}}))$$
   - If altitude difference $>10\text{m}$ and heading vectors diverge, mark driver as "Vertical Tier Mismatch" and filter out.
4. **Ride Booking & Radial Search (`POST /dispatch/request-ride`):**
   - Verify passenger does not have an active trip (`409 DISPATCH_CONCURRENT_RIDE`).
   - Query candidate drivers using Redis `GEORADIUS drivers:locations`:
     - Tier 1: 1km radius (0–15s)
     - Tier 2: 2.5km radius (15–35s)
     - Tier 3: 4km radius (35–60s)
   - Exclude deprioritized drivers (cancellation penalty) from Tier 1.
5. **Driver Acceptance & Redis Redlock Mutex (`POST /dispatch/respond`):**
   - Verify Google Play Integrity token (`X-Play-Integrity-Token`) or Apple DeviceCheck token.
   - Driver claims trip using distributed lock `lock:trip:{tripId}` (TTL 15s).
   - If acquired $\rightarrow$ set trip status = `matched`, assign driver, release lock.
   - If lock acquisition fails $\rightarrow$ return `409 DISPATCH_OFFER_CLAIMED`.

#### Verification & Acceptance Criteria:
- Test concurrent acceptances: Simulate 5 drivers accepting the same trip offer simultaneously; verify exactly 1 driver succeeds and 4 receive `409 DISPATCH_OFFER_CLAIMED`.
- Verify rain detection correctly enforces 1.2x surge floor.
- Verify vertical tier filter excludes drivers on flyover when passenger is at surface level.
```

---

## Phase 6: Trip Execution, Metering & Offline Resiliency (`/trips`)

```markdown
### TASK: Phase 6 — Trip Lifecycle State Machine, Offline TOTP & Breakdown Rescues

#### Objective:
Implement trip state machine transitions (`requested` $\rightarrow$ `matched` $\rightarrow$ `arrived` $\rightarrow$ `in_progress` $\rightarrow$ `completed` / `canceled` / `interrupted`), boarding verification with offline TOTP seeds, vehicle breakdown rescue dispatch, and physical cash change shortage wallet crediting.

#### Reference Documents:
- `PRD.md` Stories P5, P7, P8, P10, D5, D6, D11
- `architecture.md` Section 7.4 (Breakdown Dispatch), Section 11.1 (Offline Resiliency)
- `api-spec.md` Module 5 (Endpoints 6.1 to 6.8)

#### Target File Tree:
```
server/src/modules/trip/
├── trip.controller.ts
├── trip.service.ts
├── trip.validation.ts
├── trip.routes.ts
└── trip.stateMachine.ts
server/src/jobs/
└── cancellationRateWorker.ts
```

#### Detailed Requirements:
1. **Boarding Verification with Offline TOTP (`POST /trips/:tripId/verify-otp`):**
   - Upon booking, generate 4-digit pickup code AND offline HMAC-TOTP seed cached on both devices.
   - If offline in basement/parking dead zone, driver app computes and verifies HMAC locally.
   - On network reconnection, server verifies OTP hash and moves state to `in_progress`.
2. **Mid-Trip Destination Change (`PATCH /trips/:tripId/destination`):**
   - Passenger updates destination while `status = 'in_progress'`.
   - Recalculates distance from current GPS position to new destination and dynamically adjusts upfront fare.
3. **Vehicle Breakdown & Rescue Dispatch (`POST /trips/:tripId/breakdown`):**
   - Driver reports mechanical failure. Trip meter halts immediately.
   - Calculate prorated fare based on km covered:
     $$\text{Prorated Fare} = \frac{\text{km\_covered}}{\text{total\_booked\_km}} \times \text{upfront\_fare}$$
   - Mark trip `status = 'interrupted'`.
   - Automatically create priority replacement trip (`rescue_ride = true`) with **15% rescue discount** broadcasted to nearby drivers.
4. **Cancellation Policy (`POST /trips/:tripId/cancel`):**
   - Passenger cancels $>2$ minutes after match or after driver arrives $\rightarrow$ apply penalty fee (৳30 Bike / ৳50 Car / ৳70 Microbus). Fee waived if driver is delayed $>5$ minutes past ETA.
   - Enqueue 15-minute background telemetry colocation job to inspect potential offline collusion.
5. **Physical Cash Change Shortage (`POST /trips/:tripId/cash-change`):**
   - If passenger pays ৳500 for a ৳460 fare and driver lacks change, driver inputs ৳500 collected.
   - Execute ACID transaction: Credit ৳40.00 to passenger's digital wallet balance and post ledger entry in `passenger_wallet_transactions`.
6. **Bilateral Rating (`POST /trips/:tripId/rate`):**
   - Both parties rate 1–5 stars with structured tags (e.g. `Safe Driver`, `Clean Vehicle`).
   - Updates rolling bilateral rating averages on `users` and `driver_profiles`.
7. **Rolling 7-Day Cancellation Worker (`cancellationRateWorker.ts`):**
   - Daily cron: Calculates driver cancellation rate over rolling 7 days.
   - If cancellation rate $>15\% \rightarrow$ set `deprioritized_until = now + 24h`.

#### Verification & Acceptance Criteria:
- Unit test state machine: Invalid transitions (e.g. attempting to complete a trip that is only `matched`) throw `400 TRIP_STATE_INVALID`.
- Test breakdown endpoint: Confirms fare proration, sets `status = 'interrupted'`, and generates linked rescue ride.
- Verify cash shortage transaction updates passenger balance atomically.
```

---

## Phase 7: Real-Time Telemetry & Anti-Offline Collusion AI (`/telemetry`)

```markdown
### TASK: Phase 7 — High-Frequency GPS Ingestion & Spatio-Temporal Colocation AI

#### Objective:
Implement real-time driver GPS tracking, dead-zone offline batch syncing, and the BullMQ anti-offline collusion engine calculating Fréchet distance and velocity covariance between passenger and driver devices post-cancellation.

#### Reference Documents:
- `PRD.md` Module 6 (Anti-Offline Collusion Detection Engine)
- `architecture.md` Section 9.1 (Anti-Offline Collusion Detection Engine)
- `database.md` Section 6.1 (Pipeline 1: Anti-Offline Colocation Trajectory Correlation)
- `api-spec.md` Module 6 (Endpoints 7.1 & 7.2)

#### Target File Tree:
```
server/src/modules/telemetry/
├── telemetry.controller.ts
├── telemetry.service.ts
├── telemetry.validation.ts
├── telemetry.routes.ts
└── colocationEngine.ts
server/src/jobs/
└── antiOfflineWorker.ts
```

#### Detailed Requirements:
1. **Real-Time GPS Ping (`POST /telemetry/ping`):**
   - Drivers emit location every 3 seconds while online.
   - Update Redis spatial index: `GEOADD drivers:locations <lng> <lat> <driverId>`.
   - Detect speed transition anomalies: if distance between 3s pings implies speed $>120\text{ km/h}$, flag as GPS spoofing.
   - Reject mock location providers (`is_mock_location: true`).
2. **Offline Batch Sensor Sync (`POST /telemetry/sync-batch`):**
   - Ingest array of buffered GPS points with altitude, speed, and barometer data collected during dead zones.
   - Batch insert into `telemetry_logs` collection.
3. **BullMQ Anti-Offline Colocation Worker (`antiOfflineWorker.ts`):**
   - Triggered whenever a ride is canceled after driver match.
   - Runs **15 minutes** post-cancellation.
   - Executes aggregation pipeline correlating passenger and driver GPS coordinates sampled within 15-second time buckets.
4. **Colocation Evaluation Heuristics (`colocationEngine.ts`):**
   - **Discrete Fréchet Distance:** Calculate maximum spatial separation between trajectories. Colocated if $\Delta d < 50\text{ meters}$.
   - **Velocity Covariance:** Calculate speed correlation vector over 15 minutes. Match if correlation $> 0.85$.
   - **Public Transit Suppression:** Match coordinates against Dhaka Metro Rail (MRT Line 6) and bus transit GTFS polygons. If speeds match transit schedule ($<25\text{ km/h}$ stop-and-go), suppress collusion flag.
5. **Progressive Penalty Enforcement:**
   - If collusion confirmed:
     - 1st Offense: Issue warning push notification + increment `offline_collusion_strikes`.
     - 2nd Offense: 7-day dispatch de-prioritization penalty.
     - 3rd Offense: Permanent platform ban + hardware fingerprint blacklisted in `device_blacklists`.

#### Verification & Acceptance Criteria:
- Unit test colocation math: Mock two parallel trajectories within 20m and verify collusion score $>0.90$.
- Verify transit suppression: Mock parallel trajectories overlapping MRT Line 6 polygon; verify collusion score is suppressed.
- Verify 3rd strike penalty permanently bans driver profile and logs device fingerprint.
```

---

## Phase 8: Emergency SOS, Safety Desk & Masked Telephony (`/safety` & `/chat`)

```markdown
### TASK: Phase 8 — Safety Incident Desk, 30-Minute Audio Capture & Virtual Phone Relay

#### Objective:
Implement in-trip SOS escalation, 3-second abort window, automated emergency SMS with 2-hour JWT tracking URLs, 30-minute background ambient audio storage in Cloudflare R2, masked telephony proxy calling, and 7-day auto-purged chat.

#### Reference Documents:
- `PRD.md` Stories P9, D5, A3
- `architecture.md` Section 8.3 (SOS Escalation), Section 5.3 (Emergency Tracking URL)
- `api-spec.md` Modules 7 & 10 (Endpoints 8.1 to 8.3, 11.1 & 11.2)

#### Target File Tree:
```
server/src/modules/safety/
├── safety.controller.ts
├── safety.service.ts
├── safety.validation.ts
├── safety.routes.ts
└── emergencyToken.util.ts
server/src/modules/chat/
├── chat.controller.ts
├── chat.service.ts
├── chat.validation.ts
└── chat.routes.ts
```

#### Detailed Requirements:
1. **SOS Trigger (`POST /safety/sos/trigger`):**
   - Generates active safety incident in `trips.sos_events`.
   - Issues 2-hour time-limited emergency JWT: `{ tripId, role: 'emergency_viewer' }`.
   - Public tracking URL format: `https://secride.bd/track/{tripId}?token={jwt}`.
   - Sends emergency SMS via SMS Gateway to user's up to 3 emergency contacts with the live tracking link.
   - Emits priority alarm event `safety:sos_trigger` to `/admin` WebSocket namespace.
2. **30-Minute Ambient Audio Storage (`POST /safety/sos/upload-audio`):**
   - Mobile app captures background audio in 30-minute AAC chunks.
   - Uploads audio to Cloudflare R2: `sos-audio/{tripId}/{timestamp}.aac`.
   - Stores URL in `trips.sos_events.audio_recording_url`.
3. **Public Emergency Tracking Endpoint (`GET /trips/:tripId/public-track`):**
   - Requires valid emergency JWT query parameter.
   - Returns real-time driver coordinates, vehicle plate, commuter identity, and destination without requiring login.
4. **Masked Virtual Telephony (`POST /chat/masked-call`):**
   - When commuter or driver taps "Call", never reveal real mobile numbers.
   - Returns virtual PSTN IVR proxy number (`+8809612000001`) with temporary 4-digit extension PIN matching trip session.
5. **In-App Live Chat (`GET /chat/:tripId/messages`, `POST /chat/:tripId/send`):**
   - Messages stored in `chat_messages` collection with 7-day TTL index.
   - Sanitizes text against XSS/script injection.

#### Verification & Acceptance Criteria:
- Test SOS trigger: Verify emergency SMS mock receives tracking URL with valid 2h JWT.
- Access public track endpoint with valid token $\rightarrow 200$; with expired/tampered token $\rightarrow 401$.
- Verify audio recording URL is securely stored in trip document.
```

---

## Phase 9: Payments, Digital MFS & Double-Entry Financial Wallets (`/payments` & `/wallets`)

```markdown
### TASK: Phase 9 — bKash/Nagad Tokenized Checkout, Ledger ACID Transactions & Cash-Out

#### Objective:
Implement tokenized digital MFS checkout (bKash/Nagad), cryptographic HMAC webhook callbacks, circuit breakers for MFS downtime, double-entry financial ledger transactions, and driver instant cash-out disbursements.

#### Reference Documents:
- `PRD.md` Stories P4, D7, D9
- `architecture.md` Section 9.2 (Dual-Tier Cash Collection & Double-Entry Ledger), Section 11.2 (Payment Degradation)
- `database.md` Section 7.1 (Transaction 1: Commission Deduction & Ledger Posting)
- `api-spec.md` Module 8 (Endpoints 9.1 to 9.4)

#### Target File Tree:
```
server/src/modules/payment/
├── payment.controller.ts
├── payment.service.ts
├── payment.validation.ts
├── payment.routes.ts
├── bkash.gateway.ts
├── nagad.gateway.ts
└── circuitBreaker.ts
server/src/modules/wallet/
├── wallet.controller.ts
├── wallet.service.ts
├── wallet.routes.ts
└── ledger.service.ts
server/src/jobs/
└── paymentReconciliationWorker.ts
```

#### Detailed Requirements:
1. **bKash Tokenized Checkout (`POST /payments/bkash/create`, `callback`):**
   - Create payment URL using bKash API.
   - Verify HMAC-SHA256 signature on callback webhook.
   - Mark payment `completed`, update trip settlement status.
2. **Circuit Breaker & Graceful Degradation (`circuitBreaker.ts`):**
   - Wrap MFS calls with Opossum circuit breaker.
   - If error rate $>15\%$ in rolling 3 minutes $\rightarrow$ trip open circuit.
   - Return `503 PAYMENT_GATEWAY_DOWN`. Client UI disables MFS radio buttons and prompts cash payment.
3. **Cash Commission Double-Entry Ledger Transaction (`ledger.service.ts`):**
   - Execute inside multi-document MongoDB transaction session:
     ```typescript
     // Check if Pro-Captain pass is active (0% commission)
     const commissionRate = driver.commission_pass_active ? 0.0 : 0.12;
     const commissionDue = fare * commissionRate;
     driver.current_wallet_balance -= commissionDue;
     await driver.save({ session });
     await WalletTransaction.create([{
       driver_id, trip_id, entry_type: 'debit', transaction_type: 'commission_deduct',
       amount: commissionDue, balance_before, balance_after: driver.current_wallet_balance, status: 'settled'
     }], { session });
     ```
4. **Negative Debt Threshold Enforcement:**
   - If driver wallet balance falls below -৳500.00 $\rightarrow$ block driver from receiving cash ride dispatches until balance is restored.
5. **Driver Instant Cash-Out (`POST /wallets/driver/cashout`):**
   - Minimum cash-out: ৳100.00.
   - Initiates B2C disbursement API call to driver's verified bKash/Nagad payout number.
   - Deducts balance and records immutable ledger credit entry.
6. **Payment Reconciliation Worker (`paymentReconciliationWorker.ts`):**
   - Runs every 2 minutes. Queries pending MFS transactions older than 5 minutes and queries gateway status API to resolve stuck authorizations.

#### Verification & Acceptance Criteria:
- Test commission deduction: Verify driver with Pro-Pass is charged 0% commission and ledger reflects ৳0.00 debit.
- Test debt threshold: Driver with -৳500.01 balance receives `403 DRIVER_WALLET_DEBT_LIMIT` on online toggle.
- Verify ACID rollback: Simulating an error during ledger insertion rolls back wallet balance mutation.
```

---

## Phase 10: Loyalty Rewards & Route Detour Arbitration (`/loyalty` & `/disputes`)

```markdown
### TASK: Phase 10 — Loyalty Rewards Points & Automated GPS Route Detour Refunds

#### Objective:
Implement passenger loyalty points accrual (1 pt / ৳10) and redemption, automated route detour arbitration comparing GPS breadcrumbs against optimal road baseline, and transit micro-insurance policy issuance.

#### Reference Documents:
- `PRD.md` Stories P8, P11, A5, Module 8 (Transit Micro-Insurance)
- `architecture.md` Section 9.3 (Dynamic Surge & Detour Arbitration)
- `api-spec.md` Module 9 (Endpoints 10.1 & 10.2)

#### Target File Tree:
```
server/src/modules/loyalty/
├── loyalty.controller.ts
├── loyalty.service.ts
├── loyalty.routes.ts
└── loyalty.types.ts
server/src/modules/disputes/
├── dispute.controller.ts
├── dispute.service.ts
├── dispute.validation.ts
├── dispute.routes.ts
└── detourArbitrator.service.ts
server/src/jobs/
├── detourRefundWorker.ts
├── loyaltyPointsWorker.ts
└── insurancePolicyWorker.ts
```

#### Detailed Requirements:
1. **Loyalty Points Accrual & Redemption:**
   - On digital payment completion, award **1 loyalty point per ৳10 spent**.
   - Redemption: 100 points = ৳10 fare discount during upfront fare booking.
   - Expiration worker (`loyaltyPointsWorker.ts`): Points expire after 12 months of passenger account inactivity.
2. **Automated Route Detour Arbitration (`POST /disputes/detour-claim`):**
   - Passenger files claim for excessive unauthorized route deviation.
   - `detourArbitrator.service.ts`:
     - Compares recorded `trips.route_breadcrumbs` against initial Mapbox optimal route polyline.
     - Calculate actual km traveled vs baseline km.
     - Check live traffic congestion data during ride window.
     - If deviation $>25\%$ without traffic justification:
       - Automatically approve dispute.
       - Calculate excess fare difference.
       - Auto-credit refund to passenger's digital wallet (`passenger_wallet_transactions`).
3. **Transit Micro-Insurance Integration (`insurancePolicyWorker.ts`):**
   - On trip start (`status = 'in_progress'`), call Green Delta / Pragati Life Insurance API to issue instant transit coverage certificate.
   - Save policy ID in `trips.insurance_policy_id`.
   - Queue policy requests via Redis/BullMQ with 3 retries.

#### Verification & Acceptance Criteria:
- Unit test detour arbitrator: Feed breadcrumbs with 30% route inflation; verify automatic refund verdict is returned.
- Feed breadcrumbs with 10% deviation; verify dispute is marked for manual review.
- Verify loyalty point calculation: ৳460 ride earns 46 points.
```

---

## Phase 11: Admin Operations, Safety Incident Desk & Pricing Config (`/admin`)

```markdown
### TASK: Phase 11 — Admin Review Queue, Safety Incident Audio Stream & Surge Controls

#### Objective:
Implement administrative endpoints partitioned by sub-roles (`admin_ops`, `admin_safety`, `admin_super`) for driver KYC queue management, live SOS audio playback auditing, manual surge pricing overrides, and multi-factor blacklist controls.

#### Reference Documents:
- `PRD.md` Stories A1 to A6
- `architecture.md` Section 6.2 (Role-Based Access Control Matrix)
- `api-spec.md` Module 11 (Endpoints 12.1 to 12.7)

#### Target File Tree:
```
server/src/modules/admin/
├── admin.controller.ts
├── admin.service.ts
├── admin.validation.ts
├── admin.routes.ts
└── admin.types.ts
```

#### Detailed Requirements:
1. **Driver KYC Queue (`GET /admin/kyc/queue`, `PATCH /admin/kyc/:id/review`):**
   - Scoped to `admin_ops` and `admin_super`.
   - List pending driver submissions with OCR parsed data and AI face match confidence scores.
   - Action `approve` sets driver `verification_status = 'approved'` and sends welcome SMS.
   - Action `reject` sets status = `rejected` with reasons, locking driver for 1 hour.
2. **Safety Incident Desk (`GET /admin/safety/incidents`, `POST /admin/safety/.../audio-playback`):**
   - Scoped to `admin_safety` and `admin_super`.
   - List active SOS events with live coordinates and contact statuses.
   - Generate pre-signed URL to stream ambient audio from Cloudflare R2.
   - **Audit Compliance:** Every audio playback or download creates an immutable record in `sos_audit_logs` tracking `admin_id`, `ip_address`, `user_agent`, and `accessed_at`.
   - Escalate to Police 999: Transmit structured incident packet to emergency dispatch.
3. **Manual Surge Multiplier Override (`POST`, `DELETE /admin/pricing/surge`):**
   - Scoped to `admin_ops` and `admin_super`.
   - Manually set surge level for a zone geohash (e.g. 1.4x for Gulshan corridor during VIP movements) with TTL.
   - Delete endpoint clears override and returns zone to algorithmic pricing.
4. **Multi-Factor Blacklists (`GET /admin/blacklists`, `POST /admin/blacklists/device`):**
   - Scoped to `admin_super`.
   - Query and manage `device_blacklists` (IMEI, Android ID, NID, Face Vector hashes).

#### Verification & Acceptance Criteria:
- Test RBAC boundaries: Requesting `/admin/safety/incidents` with an `admin_ops` token returns `403 FORBIDDEN`.
- Verify audio stream endpoint writes an audit record to `sos_audit_logs`.
- Verify manual surge override reflects immediately in `/dispatch/fare-quote`.
```

---

## Phase 12: Real-Time WebSocket Infrastructure (Socket.io & Redis Adapter)

```markdown
### TASK: Phase 12 — Multi-Namespace Socket.io Cluster & Distributed Event Handlers

#### Objective:
Implement clustered Socket.io infrastructure with Redis adapter across three isolated namespaces (`/passenger`, `/driver`, `/admin`), dynamic rooms, and all eight real-time event handlers.

#### Reference Documents:
- `architecture.md` Section 5.1 (WebSocket Namespaces) & Section 5.2 (Key Real-Time Event Contracts)
- `api-spec.md` Module 12 (Real-Time WebSocket Event Contracts)

#### Target File Tree:
```
server/src/websocket/
├── socketServer.ts
├── middlewares/
│   └── socketAuth.middleware.ts
└── handlers/
    ├── location.handler.ts
    ├── dispatch.handler.ts
    ├── trip.handler.ts
    ├── chat.handler.ts
    └── safety.handler.ts
```

#### Detailed Requirements:
1. **Server Initialization (`socketServer.ts`):**
   - Attach Socket.io to HTTP server with `@socket.io/redis-adapter` for horizontal multi-instance scaling.
   - Isolated namespaces: `/passenger`, `/driver`, `/admin`.
2. **Socket Authentication Middleware (`socketAuth.middleware.ts`):**
   - Extract and verify Bearer JWT from handshake `auth` object or headers.
   - Attach user payload to socket; disconnect unauthorized connections immediately.
3. **Dynamic Room Management:**
   - `trip_{tripId}`: Joined by passenger, driver, and assigned safety officers.
   - `geo_grid_{geohash}`: Proximity room for nearby active drivers.
   - `admin_incident_room`: Safety desk officers listening for SOS alarms.
4. **Event Handlers:**
   - `driver:location_update`: Receives `{ driverId, lat, lng, heading, speed }` every 3s. Broadcasts to active `trip_{tripId}` room and updates Redis GEO.
   - `dispatch:ride_offer`: Emits 15-second countdown offer card to candidate driver socket.
   - `trip:status_change`: Broadcasts state changes (`matched`, `arrived`, `in_progress`, `completed`, `canceled`, `interrupted`) to passenger and driver.
   - `chat:send_message`: Routes messages between parties with sub-300ms latency.
   - `safety:sos_trigger`: High-priority broadcast triggering audio alarm at `admin_incident_room`.
   - `passenger:sensor_update`: Receives altitude and barometer updates during search phase.

#### Verification & Acceptance Criteria:
- Write integration test using `socket.io-client` simulating passenger and driver in `trip_{tripId}` room.
- Verify location update emitted by driver socket is received by passenger socket within 50ms.
- Verify unauthorized socket handshake is rejected with `Authentication error`.
```

---

## Phase 13: Background Workers, Integration Testing, Docker & Production Readiness

```markdown
### TASK: Phase 13 — BullMQ Workers, E2E Test Suite, Docker Multi-Stage & DB Seeding

#### Objective:
Assemble all BullMQ workers, write an end-to-end integration test suite, create production multi-stage Dockerfiles, Docker Compose environment, and a comprehensive database seed script with Dhaka localization.

#### Reference Documents:
- `architecture.md` Section 12 (Deployment & Infrastructure), Section 13 (Implementation Roadmap)
- `database.md` Section 8 (Production Sample Data - Dhaka Context)

#### Target File Tree:
```
server/
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── worker.ts          # Dedicated background worker process entrypoint
│   └── scripts/
│       └── seed.ts        # Database seed script
└── tests/
    ├── integration/
    │   ├── auth.test.ts
    │   ├── dispatch.test.ts
    │   ├── tripLifecycle.test.ts
    │   └── payment.test.ts
    └── helpers/
        └── testDb.ts
```

#### Detailed Requirements:
1. **Worker Process Entrypoint (`worker.ts`):**
   - Dedicated standalone process running all 10 BullMQ workers:
     - `antiOfflineWorker.ts`
     - `searchTimeoutWorker.ts`
     - `paymentReconciliationWorker.ts`
     - `surgeCalculationWorker.ts`
     - `cancellationRateWorker.ts`
     - `detourRefundWorker.ts`
     - `accountDeletionWorker.ts`
     - `insurancePolicyWorker.ts`
     - `loyaltyPointsWorker.ts`
     - `taxTokenExpiryWorker.ts`
2. **Database Seeder (`seed.ts`):**
   - Populates realistic Dhaka test data:
     - Admin users (`super`, `ops`, `safety`).
     - 5 verified drivers with registered vehicles (Yamaha FZS V3, Toyota Axio, HiAce Microbus) and approved statuses.
     - 5 test passengers with wallet balances and saved addresses (Dhanmondi, Banani, Gulshan, Kuril, Agargaon).
     - Pricing rules and zone polygons.
3. **End-to-End Integration Tests (Jest + Supertest):**
   - Complete ride lifecycle test:
     1. Passenger requests fare quote.
     2. Passenger books ride.
     3. Driver accepts offer.
     4. Driver arrives & verifies pickup OTP.
     5. Telemetry points stream during transit.
     6. Driver completes trip.
     7. bKash payment settles & platform commission debits driver wallet.
     8. Passenger rates driver & earns loyalty points.
4. **Containerization:**
   - `Dockerfile`: Multi-stage build (`builder` $\rightarrow$ `production` using `node:20-alpine`, non-root user).
   - `docker-compose.yml`: Services for `api`, `worker`, `mongodb` (replica set), and `redis`.

#### Verification & Acceptance Criteria:
- `docker compose up --build` boots all services cleanly.
- `npm test` runs full integration suite with 100% passing tests.
- Database seeder runs idempotently via `npm run seed`.
```

---

## Prompt Execution Checklist & Tracking Matrix

| Phase | Domain Focus | Target Deliverable | Dependencies | Status |
|:---:|:---|:---|:---|:---:|
| **0** | Core Scaffolding | Express, TS, Config, Error Handler, Version Gate | None | Ready |
| **1** | Data Modeling | 15 Mongoose Models, Interfaces & Indexes | Phase 0 | Ready |
| **2** | Auth & Identity | Dual-Tier SMS OTP, Argon2id, JWT Rotation, RBAC | Phase 0, 1 | Ready |
| **3** | Passenger Domain | Profile, Contacts ($\le 3$), 30d Account Deletion | Phase 1, 2 | Ready |
| **4** | Driver & KYC | 2-Step KYC, AWS OCR/Face Match, Fleet, Passes | Phase 1, 2 | Ready |
| **5** | Dispatch & Surge | Upfront Fare, Surge Worker, Flyover Heuristic, Redlock | Phase 1, 2, 4 | Ready |
| **6** | Trip Execution | State Machine, Offline TOTP, Breakdown, Cash Change | Phase 1, 4, 5 | Ready |
| **7** | Telemetry & AI | GPS Ingestion, Fréchet Colocation Worker, Bans | Phase 1, 6 | Ready |
| **8** | Safety & SOS | SOS Escalation, R2 Audio, 2h Public Token, Telephony | Phase 1, 6 | Ready |
| **9** | Payments & Wallets| bKash/Nagad Checkout, Double-Entry ACID, Cash-Out | Phase 1, 4, 6 | Ready |
| **10**| Loyalty & Detour | Loyalty Points (1 pt / ৳10), Detour Auto-Refund | Phase 1, 6, 9 | Ready |
| **11**| Admin Desk | KYC Queue, Live SOS Audio Audit, Manual Surge | Phase 1, 4, 8 | Ready |
| **12**| WebSockets | Sockets Clustered, 3 Namespaces, 8 Event Contracts | Phase 0, 5, 6, 8 | Ready |
| **13**| Production Ready | 10 BullMQ Workers, E2E Tests, Docker Compose, Seed | All Phases | Ready |

---
**Document Status:** Complete and Production Ready. Formulated specifically to build the SecureRide platform backend sequentially and flawlessly.

