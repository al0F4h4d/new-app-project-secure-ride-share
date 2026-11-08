# REST API & WebSocket Specification — SecureRide Platform
**Document Version:** 1.0 (Production Enterprise Architecture Specification)  
**Base URL:** `https://api.secride.bd/api/v1`  
**API Architecture:** RESTful JSON over HTTPS + Socket.io WebSockets + SSE Fallbacks  
**Compliance Standards:** Bangladesh Digital Security Act 2018, Apple App Store Guidelines 5.1.1(v)  
**Security Headers:** Strict Transport Security, CORS, Argon2id, JWT Rotation, DeviceCheck / Play Integrity  
**Last Updated:** 2026-11-04  
**Status:** Approved Technical Architecture Artifact  

---

## Table of Contents
1. [Global API Standards & Conventions](#1-global-api-standards--conventions)
   - [1.1 Base URL & Content Negotiation](#11-base-url--content-negotiation)
   - [1.2 Authentication & Authorization Headers](#12-authentication--authorization-headers)
   - [1.3 Uniform Envelope Format](#13-uniform-envelope-format)
   - [1.4 Rate Limiting & Throttling](#14-rate-limiting--throttling)
   - [1.5 API Version Control Strategy (URI & Header Gate)](#15-api-version-control-strategy-uri--header-gate)
   - [1.6 Enterprise Error Handling Paradigm & Problem Details Envelope](#16-enterprise-error-handling-paradigm--problem-details-envelope)
2. [Module 1: Authentication & Identity (`/auth`)](#2-module-1-authentication--identity-auth)
3. [Module 2: Passenger Profile & Account Lifecycle (`/passengers`)](#3-module-2-passenger-profile--account-lifecycle-passengers)
4. [Module 3: Driver Onboarding, KYC & Fleet Management (`/drivers`)](#4-module-3-driver-onboarding-kyc--fleet-management-drivers)
5. [Module 4: Fare Quotation & Dispatch Engine (`/dispatch`)](#5-module-4-fare-quotation--dispatch-engine-dispatch)
6. [Module 5: Trip Lifecycle & Execution Metering (`/trips`)](#6-module-5-trip-lifecycle--execution-metering-trips)
7. [Module 6: Telemetry, Colocation & Anti-Offline Engine (`/telemetry`)](#7-module-6-telemetry-colocation--anti-offline-engine-telemetry)
8. [Module 7: Emergency SOS & Safety Desk (`/safety`)](#8-module-7-emergency-sos--safety-desk-safety)
9. [Module 8: Digital MFS Payments & Double-Entry Wallets (`/payments` & `/wallets`)](#9-module-8-digital-mfs-payments--double-entry-wallets-payments--wallets)
10. [Module 9: Loyalty Rewards & Route Detour Arbitration (`/loyalty` & `/disputes`)](#10-module-9-loyalty-rewards--route-detour-arbitration-loyalty--disputes)
11. [Module 10: In-App Chat & Masked Telephony (`/chat`)](#11-module-10-in-app-chat--masked-telephony-chat)
12. [Module 11: Admin Operations, Safety Desk & Configuration (`/admin`)](#12-module-11-admin-operations-safety-desk--configuration-admin)
13. [Module 12: Real-Time WebSocket Event Contracts](#13-module-12-real-time-websocket-event-contracts)
14. [Module 13: API Version Control & Deprecation Lifecycle](#14-module-13-api-version-control--deprecation-lifecycle)
15. [Module 14: Enterprise Error Handling Architecture & Fault-Tolerance](#15-module-14-enterprise-error-handling-architecture--fault-tolerance)
16. [Module 15: Comprehensive Domain Error Code Matrix](#16-module-15-comprehensive-domain-error-code-matrix)
17. [Module 16: Summary Specification Coverage Matrix](#17-module-16-summary-specification-coverage-matrix)

---

## 1. Global API Standards & Conventions

### 1.1 Base URL & Content Negotiation
- **Production URL:** `https://api.secride.bd/api/v1`
- **Staging URL:** `https://staging-api.secride.bd/api/v1`
- **Media Upload Host:** `https://media.secride.bd` (Cloudflare R2 Encrypted Bucket)
- **Content-Type:** `application/json` (except multipart document uploads: `multipart/form-data`)
- **Character Encoding:** `UTF-8` (mandatory for localized Bengali and English strings)

### 1.2 Authentication & Authorization Headers
All protected endpoints require an HTTP Bearer Token in the `Authorization` header:
```http
Authorization: Bearer <jwt_access_token>
X-Device-Fingerprint: <sha256_hash_of_device_identifiers>
X-App-Version: 2.4.0
X-Platform: android | ios | web
```

#### Roles & Permission Scopes:
- **`Public`**: No authorization required.
- **`Passenger`**: Authenticated user with `role = 'passenger'`.
- **`Driver`**: Authenticated user with `role = 'driver'`.
- **`Admin: Ops`**: Platform administrator with `role = 'admin'` and `admin_sub_role in ['ops', 'super']`.
- **`Admin: Safety`**: Platform administrator with `role = 'admin'` and `admin_sub_role in ['safety', 'super']`.
- **`Admin: Super`**: Platform super-administrator with `role = 'admin'` and `admin_sub_role = 'super'`.

### 1.3 Uniform Envelope Format

#### Success Response Envelope (HTTP 200 / 201):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully.",
  "data": {},
  "meta": {
    "requestId": "req_01HZX8901AB23C",
    "timestamp": "2026-11-04T08:30:00.000Z"
  }
}
```

#### Error Response Envelope (HTTP 4xx / 5xx):
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "INVALID_PHONE_NUMBER",
  "message": "Must be a valid Bangladeshi mobile number starting with +8801 or 01.",
  "errors": [
    {
      "field": "phone_number",
      "rule": "regex",
      "expected": "^(?:\\+8801|01)[3-9]\\d{8}$"
    }
  ],
  "meta": {
    "requestId": "req_01HZX8901AB23C",
    "timestamp": "2026-11-04T08:30:00.000Z"
  }
}
```

### 1.4 Rate Limiting & Throttling
- **Standard Public Endpoints:** 100 requests / minute / IP
- **OTP Dispatch (`/auth/send-otp`):** 3 requests / 10 minutes / phone number & IP
- **OTP Verification (`/auth/verify-otp`):** 5 failed attempts / OTP before 15-minute phone lockout
- **Live Driver GPS Telemetry (`/telemetry/ping`):** 1 request / 3 seconds / driver

### 1.5 API Version Control Strategy (URI & Header Gate)
- **Path Versioning:** Strict major version prefixing: `https://api.secride.bd/api/v1/...`
- **Client Header Contract:** Mobile/Web apps must provide `X-App-Version: 2.4.0` and `X-Platform: android | ios | web`.
- **Forced Update Enforcement:** Server verifies client version against Redis minimum threshold. Obsolete clients receive `HTTP 426 Upgrade Required` directing them to the Google Play Store / Apple App Store.
- **Deprecation Lifecycle:** Deprecated endpoints emit standard IETF headers (`Deprecation: true`, `Sunset: <date>`, and `Link: <migration_url>`) minimum 6 months prior to decommissioning (see detailed policy in [Module 13](#14-module-13-api-version-control--deprecation-lifecycle)).

### 1.6 Enterprise Error Handling Paradigm & Problem Details Envelope
- **Unified Format:** All errors conform to an enterprise specialization of **RFC 7807 (Problem Details for HTTP APIs)**.
- **Bilingual Error Messages:** Every error response includes both technical English (`message`) and localized Bangla (`message_bn`) for immediate native mobile rendering.
- **Machine-Readable Codes:** Strict, uppercase categorized error codes (e.g. `AUTH_INVALID_CREDENTIALS`, `DRIVER_LOCKOUT_ACTIVE`, `DISPATCH_OFFER_ALREADY_CLAIMED`).
- **Field-Level Validation Array:** Zod/Joi validation failures return structured field paths, failed validation rules, expected constraints, and actual received values.
- **Fault Tolerance & Circuit Breakers:** Third-party gateway outages (bKash/Nagad down) degrade gracefully to cash rides rather than returning unhandled 500 exceptions (see complete catalog in [Module 14](#15-module-14-enterprise-error-handling-architecture--fault-tolerance) and [Module 15](#16-module-15-comprehensive-domain-error-code-matrix)).

---

## 2. Module 1: Authentication & Identity (`/auth`)

### 2.1 Request Registration / Login SMS OTP
Dispatches a 6-digit cryptographic OTP via SMS. Checks `NID_BLACKLIST` prior to sending.

- **Path:** `/auth/send-otp`
- **Method:** `POST`
- **Auth:** `Public`
- **Rate Limit:** 3 requests / 10 minutes

#### Request Body:
```json
{
  "phone_number": "+8801712345678",
  "nid_number": "5912345678",
  "app_signature_hash": "aB34dEf89G1"
}
```
*Field constraints:*
- `phone_number`: *String, Required.* Regex: `^(?:\+8801|01)[3-9]\d{8}$`
- `nid_number`: *String, Optional.* 10-digit Smart NID or 17-digit legacy NID.
- `app_signature_hash`: *String, Optional.* Android SMS Retriever API hash for automatic code reading.

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP has been successfully dispatched via SMS.",
  "data": {
    "phone_number": "+8801712345678",
    "expires_in_seconds": 120,
    "resend_available_in_seconds": 60
  }
}
```

#### Error Responses:
- `400 Bad Request`: `{"errorCode": "INVALID_PHONE_NUMBER"}`
- `403 Forbidden`: `{"errorCode": "NID_PERMANENTLY_BLACKLISTED", "message": "This NID is legally blacklisted from SecureRide platform."}`
- `429 Too Many Requests`: `{"errorCode": "OTP_RATE_LIMIT_EXCEEDED", "retryAfterSeconds": 540}`

---

### 2.2 Verify SMS OTP
Verifies the 6-digit OTP stored in Redis and returns a temporary token for profile registration or existing session credentials.

- **Path:** `/auth/verify-otp`
- **Method:** `POST`
- **Auth:** `Public`

#### Request Body:
```json
{
  "phone_number": "+8801712345678",
  "otp": "492018"
}
```

#### Success Response — Existing User Login (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP verified successfully. Login authorized.",
  "data": {
    "is_new_user": false,
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "_id": "67223a10e4b011e4c8d50101",
      "phone_number": "+8801712345678",
      "role": "passenger",
      "full_name": "Tanvir Ahmed",
      "language_preference": "bn"
    }
  }
}
```
*Note: Refresh token is securely set in an `HttpOnly; Secure; SameSite=Strict` cookie (`__Secure-SR-RefreshToken`).*

#### Success Response — New User Registration Gate (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP verified. Proceed to account registration.",
  "data": {
    "is_new_user": true,
    "registration_ticket": "reg_ticket_991827bfae812",
    "ticket_expires_in": 600
  }
}
```

---

### 2.3 Complete User Registration
Creates the master `users` record. If role is `driver`, initiates a corresponding `driver_profiles` document.

- **Path:** `/auth/register`
- **Method:** `POST`
- **Auth:** `Public` (Requires `registration_ticket`)

#### Request Body:
```json
{
  "registration_ticket": "reg_ticket_991827bfae812",
  "password": "SecurePassword123@",
  "full_name": "Tanvir Ahmed",
  "email": "tanvir.ahmed@example.com",
  "role": "passenger",
  "language_preference": "bn",
  "emergency_contacts": [
    {
      "name": "Nusrat Jahan",
      "phone_number": "+8801819876543",
      "relationship": "Spouse"
    }
  ]
}
```
*Field constraints:*
- `password`: *String, Required.* Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special symbol.
- `emergency_contacts`: *Array, Optional.* Max 3 elements.

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully.",
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "user": {
      "_id": "67223a10e4b011e4c8d50101",
      "phone_number": "+8801712345678",
      "role": "passenger",
      "full_name": "Tanvir Ahmed",
      "language_preference": "bn",
      "passenger_wallet_balance": "0.00",
      "rating_avg": 5.0
    }
  }
}
```

---

### 2.4 User Login (Phone + Password)
Direct authentication for returning users with device fingerprint checks.

- **Path:** `/auth/login`
- **Method:** `POST`
- **Auth:** `Public`

#### Request Body:
```json
{
  "phone_number": "+8801712345678",
  "password": "SecurePassword123@",
  "device_fingerprint": {
    "imei_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "android_id": "78a9c011e5f2",
    "platform": "android",
    "app_version": "2.4.0"
  }
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful.",
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "expires_in": 900,
    "user": {
      "_id": "67223a10e4b011e4c8d50101",
      "phone_number": "+8801712345678",
      "role": "driver",
      "full_name": "Rafiqul Islam",
      "driver_profile_id": "67223a20e4b011e4c8d50202",
      "verification_status": "approved"
    }
  }
}
```

#### Error Responses:
- `401 Unauthorized`: `{"errorCode": "INVALID_CREDENTIALS", "message": "Incorrect mobile number or password."}`
- `403 Forbidden`: `{"errorCode": "DEVICE_PERMANENTLY_BANNED", "ban_reason": "Platform 3-strike multi-factor hardware ban."}`

---

### 2.5 Refresh JWT Session Token
Implements single-use Refresh Token Rotation with automatic theft revocation.

- **Path:** `/auth/refresh-token`
- **Method:** `POST`
- **Auth:** `Public` (Reads cookie `__Secure-SR-RefreshToken`)

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Token refreshed successfully.",
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "expires_in": 900
  }
}
```

---

### 2.6 User Logout
Invalidates the refresh token family and terminates active sessions.

- **Path:** `/auth/logout`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Any Role)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Successfully logged out. Refresh session revoked."
}
```

---

## 3. Module 2: Passenger Profile & Account Lifecycle (`/passengers`)

### 3.1 Get Passenger Profile
- **Path:** `/passengers/me`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Passenger)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "_id": "67223a10e4b011e4c8d50101",
    "phone_number": "+8801712345678",
    "email": "tanvir.ahmed@example.com",
    "full_name": "Tanvir Ahmed",
    "profile_photo_url": "https://cdn.secride.bd/profiles/pass_67223a10.webp",
    "passenger_wallet_balance": "40.00",
    "rating_avg": 4.92,
    "total_ratings_count": 28,
    "language_preference": "bn",
    "emergency_contacts": [
      {
        "name": "Nusrat Jahan",
        "phone_number": "+8801819876543",
        "relationship": "Spouse"
      }
    ],
    "saved_addresses_count": 2,
    "deletion_status": "active"
  }
}
```

---

### 3.2 Update Passenger Profile & Language Preference
- **Path:** `/passengers/me`
- **Method:** `PATCH`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "full_name": "Tanvir Ahmed Chowdhury",
  "email": "tanvir.chowdhury@example.com",
  "language_preference": "en",
  "profile_photo_url": "https://cdn.secride.bd/profiles/new_pass_67223a10.webp"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully.",
  "data": {
    "full_name": "Tanvir Ahmed Chowdhury",
    "language_preference": "en"
  }
}
```

---

### 3.3 Manage Emergency Contacts (Max 3 Contacts)
- **Path:** `/passengers/emergency-contacts`
- **Method:** `PUT`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "emergency_contacts": [
    { "name": "Nusrat Jahan", "phone_number": "+8801819876543", "relationship": "Spouse" },
    { "name": "Farhan Ahmed", "phone_number": "+8801711223344", "relationship": "Brother" },
    { "name": "Kamal Hossain", "phone_number": "+8801911998877", "relationship": "Father" }
  ]
}
```
*Validation:* Reject with `400 Bad Request` if array contains $>3$ contacts.

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Emergency contacts successfully updated (3/3 configured).",
  "data": {
    "emergency_contacts": [
      { "name": "Nusrat Jahan", "phone_number": "+8801819876543", "relationship": "Spouse" },
      { "name": "Farhan Ahmed", "phone_number": "+8801711223344", "relationship": "Brother" },
      { "name": "Kamal Hossain", "phone_number": "+8801911998877", "relationship": "Father" }
    ]
  }
}
```

---

### 3.4 Save Address Book Location
- **Path:** `/passengers/saved-addresses`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "label": "Work",
  "address_text": "IDB Bhaban, Rokeya Sarani, Agargaon, Dhaka-1207",
  "coordinates": [90.3789, 23.7776]
}
```

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Address saved successfully.",
  "data": {
    "label": "Work",
    "address_text": "IDB Bhaban, Rokeya Sarani, Agargaon, Dhaka-1207",
    "location": {
      "type": "Point",
      "coordinates": [90.3789, 23.7776]
    }
  }
}
```

---

### 3.5 Initiate Account Deletion (30-Day Grace Period)
Complies with Apple App Store 5.1.1(v) and Bangladesh Digital Security Act 2018.

- **Path:** `/passengers/account-deletion`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "confirmation_password": "SecurePassword123@",
  "feedback_reason": "No longer commuting in Dhaka"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Account deletion initiated. Your account is scheduled for permanent purge in 30 days. You may log in anytime before this date to cancel.",
  "data": {
    "deletion_status": "pending_deletion",
    "deletion_requested_at": "2026-11-04T08:30:00.000Z",
    "scheduled_deletion_at": "2026-12-04T08:30:00.000Z"
  }
}
```

---

### 3.6 Revoke Account Deletion Request
- **Path:** `/passengers/account-deletion`
- **Method:** `DELETE`
- **Auth:** `Bearer JWT (Passenger)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Account deletion canceled. Your profile has been restored to active status.",
  "data": {
    "deletion_status": "active"
  }
}
```

---

## 4. Module 3: Driver Onboarding, KYC & Fleet Management (`/drivers`)

### 4.1 Step 1: Submit Identity & License Documents
Uploads Smart NID and BRTA Driving License scans to Cloudflare R2 and triggers AWS Textract OCR.

- **Path:** `/drivers/kyc/step1-identity`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`
- **Content-Type:** `multipart/form-data`

#### Form-Data Fields:
- `nid_number`: `5912345678` (String, Required)
- `license_number`: `DK0948201` (String, Required)
- `license_category`: `motorcycle` | `light_vehicle` (Enum, Required)
- `license_expiry_date`: `2029-05-10` (ISO Date, Required, must be future)
- `nid_document_front`: Binary image (JPG/PNG, Max 5MB)
- `nid_document_back`: Binary image (JPG/PNG, Max 5MB)
- `license_document`: Binary image (JPG/PNG, Max 5MB)

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Step 1 identity documents uploaded successfully. OCR parsing complete.",
  "data": {
    "ocr_extracted": {
      "nid_number": "5912345678",
      "license_number": "DK0948201",
      "ocr_confidence_score": 94.6
    },
    "step1_completed": true,
    "next_step": "step2-biometrics"
  }
}
```

---

### 4.2 Step 2: Submit Biometric Live Selfie
Uploads liveness-tested selfie. Performs AWS Rekognition CompareFaces ($\ge 90\%$ similarity).

- **Path:** `/drivers/kyc/step2-biometrics`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`
- **Content-Type:** `multipart/form-data`

#### Form-Data Fields:
- `live_selfie`: Binary image (JPG/PNG, Max 5MB)
- `liveness_sdk_token`: `tok_live_091823abf` (String, Required)

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Biometrics verified and queued for admin operations approval.",
  "data": {
    "verification_status": "pending",
    "face_match_confidence": 96.2,
    "estimated_review_time": "15-30 minutes"
  }
}
```

#### Error Response — Mismatch with Cooldown (`422 Unprocessable Entity`):
```json
{
  "success": false,
  "statusCode": 422,
  "errorCode": "FACIAL_MISMATCH",
  "message": "Face on live selfie does not match the photo on your Smart NID. You have been locked out for 1 hour.",
  "data": {
    "failed_verification_attempts": 1,
    "lockout_until": "2026-11-04T09:30:00.000Z"
  }
}
```

---

### 4.3 Register Fleet Vehicle
Adds a vehicle under the driver profile. Validates Tax Token ($\ge \text{Today} + 15\text{ days}$).

- **Path:** `/drivers/vehicles`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`
- **Content-Type:** `multipart/form-data`

#### Form-Data Fields:
- `brta_plate_number`: `Dhaka Metro-HA 45-8912` (String, Required)
- `tax_token_number`: `TT-2026-904123` (String, Required)
- `tax_token_expiry`: `2027-04-30` (ISO Date, Required)
- `vehicle_class`: `bike` | `car_sedan` | `microbus` (Enum, Required)
- `brand`: `Yamaha`
- `model_name`: `FZS V3 ABS`
- `color`: `Matte Blue`
- `front_photo`: Binary image
- `rear_photo`: Binary image
- `registration_document`: Binary document

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Vehicle submitted for regulatory verification.",
  "data": {
    "vehicle_id": "67223a30e4b011e4c8d50303",
    "brta_plate_number": "Dhaka Metro-HA 45-8912",
    "vehicle_class": "bike",
    "is_approved": false
  }
}
```

---

### 4.4 Set Active Operational Vehicle
Selects which verified vehicle the driver is currently operating.

- **Path:** `/drivers/vehicles/:vehicleId/activate`
- **Method:** `PATCH`
- **Auth:** `Bearer JWT (Driver)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vehicle activated successfully. You can now accept rides in this vehicle class.",
  "data": {
    "active_vehicle_id": "67223a30e4b011e4c8d50303",
    "vehicle_class": "bike",
    "brta_plate_number": "Dhaka Metro-HA 45-8912"
  }
}
```

---

### 4.5 Toggle Online / Offline Dispatch Availability
- **Path:** `/drivers/status/online`
- **Method:** `PATCH`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "is_online": true,
  "current_coordinates": [90.4043, 23.7937]
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Driver is now ONLINE and discoverable for dispatch.",
  "data": {
    "is_online": true,
    "active_vehicle": "Dhaka Metro-HA 45-8912",
    "wallet_balance": "840.50",
    "commission_pass_active": true
  }
}
```

#### Error Response — Negative Balance Debt Block (`403 Forbidden`):
```json
{
  "success": false,
  "statusCode": 403,
  "errorCode": "WALLET_DEBT_LIMIT_EXCEEDED",
  "message": "Your wallet balance (-৳520.00) is below the minimum allowed threshold (-৳500.00). Top up via bKash/Nagad to resume cash dispatches."
}
```

---

### 4.6 Purchase Pro-Captain Zero-Commission Subscription Pass
- **Path:** `/drivers/commission-pass/purchase`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "pass_type": "daily",
  "payment_method": "bkash"
}
```
*Pass Pricing:*
- `daily`: ৳99.00 (Valid for 24 hours, 0% platform commission)
- `weekly`: ৳599.00 (Valid for 7 days, 0% platform commission)

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pro-Captain Daily Pass activated successfully. 0% platform commission applied for 24 hours.",
  "data": {
    "pass_id": "67223c10e4b011e4c8d50909",
    "pass_type": "daily",
    "price_bdt": "99.00",
    "activated_at": "2026-11-04T08:30:00.000Z",
    "expires_at": "2026-11-05T08:30:00.000Z"
  }
}
```

---

## 5. Module 4: Fare Quotation & Dispatch Engine (`/dispatch`)

### 5.1 Request Upfront Fare Quotation
Calculates guaranteed upfront fare quote across available vehicle classes with road routing, elevation heuristic, weather surge, and zone demand ratio.

- **Path:** `/dispatch/fare-quote`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "pickup_address": "House 14, Road 7, Dhanmondi, Dhaka",
  "pickup_coordinates": [90.3752, 23.7461],
  "dropoff_address": "Jamuna Future Park, Kuril, Dhaka",
  "dropoff_coordinates": [90.4244, 23.8135],
  "passenger_altitude_m": 8.5
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "quote_id": "qte_99812fa091",
    "expires_in_seconds": 300,
    "route_metrics": {
      "distance_km": 11.4,
      "estimated_duration_minutes": 38,
      "optimal_polyline": "u{~vE...encodedPolyline..."
    },
    "quotes": [
      {
        "vehicle_class": "bike",
        "fare_bdt": "185.00",
        "surge_multiplier": 1.2,
        "surge_reason": "Rain Floor (1.2x)",
        "eta_minutes": 3
      },
      {
        "vehicle_class": "car_sedan",
        "fare_bdt": "460.00",
        "surge_multiplier": 1.2,
        "surge_reason": "Rain Floor (1.2x)",
        "eta_minutes": 6
      },
      {
        "vehicle_class": "microbus",
        "fare_bdt": "720.00",
        "surge_multiplier": 1.2,
        "surge_reason": "Rain Floor (1.2x)",
        "eta_minutes": 10
      }
    ],
    "loyalty_reward_available": {
      "user_points_balance": 250,
      "max_discount_bdt": "20.00"
    }
  }
}
```

---

### 5.2 Confirm Ride Booking & Initiate Radial Search
Locks upfront fare and begins 3-tier radial search (1km $\rightarrow$ 2.5km $\rightarrow$ 4km).

- **Path:** `/dispatch/request-ride`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "quote_id": "qte_99812fa091",
  "vehicle_class": "bike",
  "payment_method": "bkash",
  "special_request": "Please bring clean extra helmet",
  "redeem_loyalty_points": 100
}
```
*Field constraints:*
- `special_request`: *String, Optional.* Max 150 characters, sanitized.
- `payment_method`: *Enum.* `bkash` | `nagad` | `cash`
- `redeem_loyalty_points`: *Integer, Optional.* Multiples of 100 points (100 pts = ৳10 discount).

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Ride requested. Searching for nearby captains...",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "trip_code": "TRX-20261104-9102",
    "status": "requested",
    "upfront_fare": "175.00",
    "loyalty_discount_applied": "10.00",
    "search_timeout_seconds": 60,
    "transit_insurance_enrolled": true,
    "insurance_partner": "Green Delta Insurance Company"
  }
}
```

---

### 5.3 Respond to Broadcasted Dispatch Offer (Driver)
Driver accepts or declines a 15-second radial offer card. Acquires Redis Redlock distributed mutex.

- **Path:** `/dispatch/respond`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`
- **Header:** `X-Play-Integrity-Token: <token_string>`

#### Request Body:
```json
{
  "trip_id": "67223b50e4b011e4c8d50404",
  "decision": "accept"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trip successfully claimed. Proceed to pickup location.",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "status": "matched",
    "passenger": {
      "full_name": "Tanvir A.",
      "rating_avg": 4.92,
      "pickup_address": "House 14, Road 7, Dhanmondi, Dhaka",
      "pickup_coordinates": [90.3752, 23.7461],
      "special_request": "Please bring clean extra helmet"
    },
    "fare_bdt": "175.00"
  }
}
```

#### Error Response — Mutex Race Lost (`409 Conflict`):
```json
{
  "success": false,
  "statusCode": 409,
  "errorCode": "OFFER_ALREADY_CLAIMED",
  "message": "This ride offer has expired or was already accepted by another captain."
}
```

---

## 6. Module 5: Trip Lifecycle & Execution Metering (`/trips`)

### 6.1 Get Active Trip Details
Fetches state machine data, waypoints, and masked telephony proxy for an in-progress ride.

- **Path:** `/trips/current`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Passenger | Driver)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "trip_code": "TRX-20261104-9102",
    "status": "matched",
    "pickup_address": "House 14, Road 7, Dhanmondi, Dhaka",
    "pickup_geo": { "type": "Point", "coordinates": [90.3752, 23.7461] },
    "dropoff_address": "Jamuna Future Park, Kuril, Dhaka",
    "dropoff_geo": { "type": "Point", "coordinates": [90.4244, 23.8135] },
    "upfront_fare": "175.00",
    "payment_method": "bkash",
    "driver": {
      "full_name": "Rafiqul Islam",
      "phone_proxy": "+8809612000001,,4921",
      "rating_avg": 4.88,
      "vehicle": {
        "class": "bike",
        "brand": "Yamaha",
        "model_name": "FZS V3",
        "color": "Matte Blue",
        "brta_plate_number": "Dhaka Metro-HA 45-8912"
      }
    },
    "pickup_otp_display": "4921"
  }
}
```

---

### 6.2 Verify Pickup OTP / Offline TOTP (Driver)
Validates the 4-digit code provided verbally by the passenger upon physical boarding. Starts the meter.

- **Path:** `/trips/:tripId/verify-otp`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "otp": "4921",
  "driver_coordinates": [90.3753, 23.7462]
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP verified successfully. Trip status updated to in_progress.",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "status": "in_progress",
    "started_at": "2026-11-04T08:42:10.000Z"
  }
}
```

---

### 6.3 Mid-Trip Destination Change (Passenger)
Modifies the destination coordinates during an active ride. Dynamically updates upfront fare.

- **Path:** `/trips/:tripId/destination`
- **Method:** `PATCH`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "new_dropoff_address": "Airport Terminal 1, Dhaka",
  "new_dropoff_coordinates": [90.4074, 23.8433]
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Destination updated. Fare dynamically recalculated based on updated distance.",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "original_fare": "175.00",
    "new_upfront_fare": "240.00",
    "fare_difference": "+65.00",
    "new_distance_km": 15.2
  }
}
```

---

### 6.4 Report In-Trip Vehicle Breakdown & Emergency Rescue
Driver reports mechanical breakdown. Meter stops, fare is prorated, and trip status is marked `interrupted`.

- **Path:** `/trips/:tripId/breakdown`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "reason": "engine_failure",
  "current_coordinates": [90.3951, 23.7820],
  "km_covered": 5.7
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Breakdown recorded. Trip status marked as interrupted. Automated rescue dispatch initiated for passenger.",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "status": "interrupted",
    "original_fare": "175.00",
    "prorated_fare_due": "87.50",
    "rescue_ride_created": true,
    "rescue_trip_id": "67223b90e4b011e4c8d50505"
  }
}
```

---

### 6.5 Cancel Ride (Passenger / Driver)
Applies structured cancellation fees (৳30 Bike / ৳50 Car / ৳70 Microbus). Triggers 15-minute anti-offline telemetry job.

- **Path:** `/trips/:tripId/cancel`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger | Driver)`

#### Request Body:
```json
{
  "reason": "driver_delayed",
  "cancellation_notes": "Driver was stationary for over 7 minutes"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trip canceled successfully.",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "status": "canceled",
    "cancellation_fee_applied": "0.00",
    "fee_waiver_reason": "Driver arrival delay exceeded 5 minutes threshold."
  }
}
```

---

### 6.6 Complete Trip (Driver)
Stops meter at dropoff location and moves trip to settlement stage.

- **Path:** `/trips/:tripId/complete`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "dropoff_coordinates": [90.4245, 23.8136],
  "total_km_metered": 11.6
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trip completed successfully. Ready for payment settlement.",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "status": "completed",
    "gross_fare": "175.00",
    "payment_method": "bkash",
    "completed_at": "2026-11-04T09:20:15.000Z"
  }
}
```

---

### 6.7 Record Physical Cash Change Shortage
If driver lacks physical change for a cash ride, the excess amount is instantly credited to the passenger's wallet.

- **Path:** `/trips/:tripId/cash-change`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "cash_collected_bdt": 200.0,
  "fare_due_bdt": 175.0
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "৳25.00 change shortage successfully credited to passenger digital wallet.",
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "shortage_credited_bdt": "25.00",
    "new_passenger_wallet_balance": "65.00"
  }
}
```

---

### 6.8 Submit Bilateral Rating & Review
- **Path:** `/trips/:tripId/rate`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger | Driver)`

#### Request Body:
```json
{
  "rating": 5,
  "review_tags": ["Safe Driver", "Clean Extra Helmet", "Polite"]
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thank you! Rating recorded.",
  "data": {
    "rating": 5,
    "loyalty_points_awarded": 18
  }
}
```

---

## 7. Module 6: Telemetry, Colocation & Anti-Offline Engine (`/telemetry`)

### 7.1 Real-Time Driver Location Ping
Updates Redis `GEOADD` and checks speed anomaly jumps ($>120\text{ km/h}$).

- **Path:** `/telemetry/ping`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "latitude": 23.7937,
  "longitude": 90.4043,
  "speed_kmh": 34.2,
  "heading_degrees": 182.5,
  "is_mock_location": false,
  "timestamp": "2026-11-04T08:30:15.000Z"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": { "ack": true }
}
```

---

### 7.2 Bulk Sync Offline Buffered Sensor Points
Uploads buffered SQLite / IndexedDB telemetry records collected during dead-zone rides.

- **Path:** `/telemetry/sync-batch`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver | Passenger)`

#### Request Body:
```json
{
  "trip_id": "67223b50e4b011e4c8d50404",
  "points": [
    {
      "latitude": 23.7937,
      "longitude": 90.4043,
      "speed": 28.5,
      "altitude_m": 7.8,
      "barometer_hpa": 1012.4,
      "accelerometer_magnitude": 1.02,
      "timestamp": "2026-11-04T08:50:00.000Z"
    },
    {
      "latitude": 23.7945,
      "longitude": 90.4051,
      "speed": 31.0,
      "altitude_m": 8.0,
      "barometer_hpa": 1012.3,
      "accelerometer_magnitude": 1.05,
      "timestamp": "2026-11-04T08:50:10.000Z"
    }
  ]
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Successfully synchronized 2 buffered telemetry points.",
  "data": { "synced_count": 2 }
}
```

---

## 8. Module 7: Emergency SOS & Safety Desk (`/safety`)

### 8.1 Trigger Emergency SOS
Activates high-priority audible incident at Admin Safety Desk, sends emergency SMS with public tracking link to trusted contacts, and initializes ambient audio capture.

- **Path:** `/safety/sos/trigger`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger | Driver)`

#### Request Body:
```json
{
  "trip_id": "67223b50e4b011e4c8d50404",
  "coordinates": [90.3951, 23.7820],
  "reason": "Driver taking unknown detour / verbal altercation"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "EMERGENCY SOS ACTIVATED. Safety desk notified. SMS alerts sent to your 3 emergency contacts.",
  "data": {
    "sos_incident_id": "sos_091823ab",
    "public_tracking_url": "https://secride.bd/track/67223b50e4b011e4c8d50404?token=eyJhbGciOi...",
    "contacts_notified_count": 3,
    "police_999_standby": true,
    "audio_recording_initiated": true
  }
}
```

---

### 8.2 Upload 30-Minute Ambient SOS Audio Recording
Uploads background ambient AAC audio stream to Cloudflare R2 (`sos-audio/{tripId}/{timestamp}.aac`).

- **Path:** `/safety/sos/upload-audio`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger | Driver)`
- **Content-Type:** `multipart/form-data`

#### Form-Data Fields:
- `trip_id`: `67223b50e4b011e4c8d50404` (String, Required)
- `audio_file`: Binary AAC file (Max 25MB)
- `duration_seconds`: 1800 (Integer, Required)

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "SOS ambient audio recording securely archived on Cloudflare R2.",
  "data": {
    "audio_recording_url": "https://media.secride.bd/sos-audio/67223b50e4b011e4c8d50404/1762245000.aac",
    "duration_seconds": 1800
  }
}
```

---

### 8.3 Public Emergency Tracking Stream (Emergency Responders & Family)
Public read-only tracking view secured by a time-limited 2-hour JWT generated at SOS time.

- **Path:** `/trips/:tripId/public-track`
- **Method:** `GET`
- **Auth:** `Public` (Requires query parameter `?token=JWT`)

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "trip_code": "TRX-20261104-9102",
    "passenger_name": "Tanvir A.",
    "driver_name": "Rafiqul Islam",
    "vehicle_plate": "Dhaka Metro-HA 45-8912",
    "vehicle_class": "bike",
    "current_location": {
      "latitude": 23.7820,
      "longitude": 90.3951,
      "speed_kmh": 32.5,
      "updated_at": "2026-11-04T08:55:10.000Z"
    },
    "destination": "Jamuna Future Park, Kuril, Dhaka",
    "sos_status": "active"
  }
}
```

---

## 9. Module 8: Digital MFS Payments & Double-Entry Wallets (`/payments` & `/wallets`)

### 9.1 Initiate bKash Tokenized Checkout
- **Path:** `/payments/bkash/create`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "trip_id": "67223b50e4b011e4c8d50404",
  "amount_bdt": "175.00"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "payment_id": "67223c50e4b011e4c8d50808",
    "bkash_redirect_url": "https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create/...",
    "payment_create_time": "2026-11-04T09:20:30.000Z"
  }
}
```

---

### 9.2 bKash Payment Callback Webhook
Receives encrypted callback from bKash gateway. Verifies HMAC-SHA256 signature and settles payment.

- **Path:** `/payments/bkash/callback`
- **Method:** `POST`
- **Auth:** `Public (HMAC Verified)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment verified and trip settled.",
  "data": {
    "status": "completed",
    "external_transaction_id": "BKH990182741"
  }
}
```

---

### 9.3 Get Driver Wallet & Double-Entry Ledger
- **Path:** `/wallets/driver/ledger`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Driver)`
- **Query Params:** `?page=1&limit=20`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "current_balance": "840.50",
    "negative_limit_threshold": "-500.00",
    "commission_pass_active": true,
    "transactions": [
      {
        "_id": "67223d10e4b011e4c8d50901",
        "entry_type": "debit",
        "transaction_type": "commission_deduct",
        "amount": "0.00",
        "balance_before": "840.50",
        "balance_after": "840.50",
        "status": "settled",
        "notes": "0% Pro-Captain Pass: Commission waived for Trip TRX-9102",
        "created_at": "2026-11-04T09:22:00.000Z"
      },
      {
        "_id": "67223d10e4b011e4c8d50902",
        "entry_type": "credit",
        "transaction_type": "topup",
        "amount": "500.00",
        "balance_before": "340.50",
        "balance_after": "840.50",
        "status": "settled",
        "external_trx_id": "BKH8819231",
        "notes": "Driver bKash wallet top-up",
        "created_at": "2026-11-03T14:10:00.000Z"
      }
    ]
  }
}
```

---

### 9.4 Driver Instant Cash-Out / Disbursement
Withdraws available wallet balance directly to verified bKash or Nagad number.

- **Path:** `/wallets/driver/cashout`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Driver)`

#### Request Body:
```json
{
  "amount_bdt": 500.0,
  "channel": "bkash"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "৳500.00 disbursed instantly to your verified bKash number.",
  "data": {
    "disbursement_id": "disb_091823ab",
    "amount": "500.00",
    "channel": "bkash",
    "recipient_number": "+8801911223344",
    "new_wallet_balance": "340.50"
  }
}
```

---

## 10. Module 9: Loyalty Rewards & Route Detour Arbitration (`/loyalty` & `/disputes`)

### 10.1 Get Passenger Loyalty Rewards Balance
- **Path:** `/loyalty/points`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Passenger)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "points_balance": 250,
    "lifetime_points_earned": 580,
    "discount_value_bdt": "25.00",
    "expires_after": "2027-11-04T08:30:00.000Z",
    "conversion_rule": "1 point earned per ৳10 spent | 100 points = ৳10 fare discount"
  }
}
```

---

### 10.2 File Post-Trip Detour & Fare Dispute
Triggers algorithmic analysis comparing actual breadcrumbs against optimal route. Automatically issues refund if detour $>25\%$.

- **Path:** `/disputes/detour-claim`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger)`

#### Request Body:
```json
{
  "trip_id": "67223b50e4b011e4c8d50404",
  "dispute_reason": "Driver took an unnecessary detour through Mirpur without consent",
  "claimed_amount_bdt": 45.0
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dispute analyzed. Route detour algorithm confirmed 32% deviation without traffic justification. ৳45.00 automatically refunded to your passenger wallet.",
  "data": {
    "dispute_id": "dsp_091823ab",
    "verdict": "auto_refunded",
    "refund_amount_bdt": "45.00",
    "new_passenger_wallet_balance": "110.00"
  }
}
```

---

## 11. Module 10: In-App Chat & Masked Telephony (`/chat`)

### 11.1 Fetch Trip Chat Messages
Retrieves in-app chat history (purged automatically after 7 days).

- **Path:** `/chat/:tripId/messages`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Passenger | Driver)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "trip_id": "67223b50e4b011e4c8d50404",
    "messages": [
      {
        "_id": "67223e10e4b011e4c8d50999",
        "sender_role": "driver",
        "message_text": "I have arrived at Dhanmondi 7 gate.",
        "sent_at": "2026-11-04T08:40:00.000Z"
      },
      {
        "_id": "67223e10e4b011e4c8d50998",
        "sender_role": "passenger",
        "message_text": "Coming down the elevator now.",
        "sent_at": "2026-11-04T08:40:45.000Z"
      }
    ]
  }
}
```

---

### 11.2 Request Virtual Telecom Masked Calling
Initiates a PSTN voice call between commuter and driver through a virtual IVR bridge.

- **Path:** `/chat/masked-call`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Passenger | Driver)`

#### Request Body:
```json
{
  "trip_id": "67223b50e4b011e4c8d50404"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Virtual telephony bridge initiated. Dial the virtual session proxy.",
  "data": {
    "virtual_proxy_number": "+8809612000001",
    "extension_pin": "4921",
    "session_expires_in_seconds": 900
  }
}
```

---

## 12. Module 11: Admin Operations, Safety Desk & Configuration (`/admin`)

### 12.1 Get Driver KYC Review Queue
- **Path:** `/admin/kyc/queue`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Admin: Ops | Super)`
- **Query Params:** `?status=pending&page=1&limit=10`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "total_pending": 14,
    "items": [
      {
        "driver_id": "67223a20e4b011e4c8d50202",
        "full_name": "Rafiqul Islam",
        "phone_number": "+8801911223344",
        "nid_number": "5912345678",
        "license_number": "DK0948201",
        "license_category": "motorcycle",
        "license_expiry_date": "2029-05-10T00:00:00.000Z",
        "facial_vector_hash": "e3b0c44298fc...",
        "ai_match_confidence": 96.2,
        "nid_front_url": "https://media.secride.bd/kyc/nid_front_5912.enc",
        "nid_back_url": "https://media.secride.bd/kyc/nid_back_5912.enc",
        "live_selfie_url": "https://media.secride.bd/kyc/selfie_5912.enc",
        "submitted_at": "2026-11-04T07:15:00.000Z"
      }
    ]
  }
}
```

---

### 12.2 Review Driver KYC (Approve / Reject)
- **Path:** `/admin/kyc/:driverId/review`
- **Method:** `PATCH`
- **Auth:** `Bearer JWT (Admin: Ops | Super)`

#### Request Body:
```json
{
  "action": "approve",
  "review_notes": "All documents verified against BRTA and Smart NID databases."
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Driver KYC approved successfully. Welcome SMS dispatched.",
  "data": {
    "driver_id": "67223a20e4b011e4c8d50202",
    "verification_status": "approved"
  }
}
```

---

### 12.3 Safety Incident Desk: Live SOS Incidents
- **Path:** `/admin/safety/incidents`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Admin: Safety | Super)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "active_incidents": [
      {
        "trip_id": "67223b50e4b011e4c8d50404",
        "trip_code": "TRX-20261104-9102",
        "passenger_name": "Tanvir A.",
        "passenger_phone": "+8801712345678",
        "driver_name": "Rafiqul Islam",
        "driver_phone": "+8801911223344",
        "vehicle_plate": "Dhaka Metro-HA 45-8912",
        "triggered_at": "2026-11-04T08:52:00.000Z",
        "last_coordinates": [90.3951, 23.7820],
        "has_audio_recording": true,
        "audio_recording_url": "https://media.secride.bd/sos-audio/67223b50e4b011e4c8d50404/1762245000.aac"
      }
    ]
  }
}
```

---

### 12.4 Audit & Playback Ambient SOS Audio
Streams the 30-minute ambient audio and creates an immutable entry in `sos_audit_logs`.

- **Path:** `/admin/safety/incidents/:tripId/audio-playback`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Admin: Safety | Super)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Audio stream pre-signed URL generated. Access logged in sos_audit_logs.",
  "data": {
    "audio_stream_url": "https://media.secride.bd/sos-audio/67223b50e4b011e4c8d50404/stream.m3u8?token=...",
    "audit_log_id": "67223f10e4b011e4c8d50777",
    "accessed_at": "2026-11-04T09:02:15.000Z"
  }
}
```

---

### 12.5 Set Manual Surge Multiplier Override (Zone Geohash)
Overrides algorithmic surge multiplier for a zone geohash (e.g. during sudden traffic gridlocks or rallies).

- **Path:** `/admin/pricing/surge`
- **Method:** `POST`
- **Auth:** `Bearer JWT (Admin: Ops | Super)`

#### Request Body:
```json
{
  "zone_geohash": "wh0r8",
  "zone_name": "Gulshan 1 & 2 Corridor",
  "manual_surge_multiplier": 1.4,
  "expires_in_minutes": 60,
  "reason": "Sudden VIP protocol movement"
}
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Manual surge multiplier of 1.4x applied to zone wh0r8.",
  "data": {
    "zone_geohash": "wh0r8",
    "surge_multiplier": 1.4,
    "redis_ttl_seconds": 3600
  }
}
```

---

### 12.6 Remove Manual Surge Multiplier Override
- **Path:** `/admin/pricing/surge/:zoneGeohash`
- **Method:** `DELETE`
- **Auth:** `Bearer JWT (Admin: Ops | Super)`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Manual surge cleared. Zone returned to algorithmic supply-demand pricing."
}
```

---

### 12.7 Query Platform Device & NID Blacklists
- **Path:** `/admin/blacklists`
- **Method:** `GET`
- **Auth:** `Bearer JWT (Admin: Super)`
- **Query Params:** `?type=all&page=1&limit=20`

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "total_banned_devices": 42,
    "total_banned_nids": 18,
    "recent_bans": [
      {
        "_id": "67223a50e4b011e4c8d50606",
        "ban_type": "offline_collusion",
        "ban_reason": "3-strike penalty: Confirmed offline private ride solicitation",
        "imei_hash": "e3b0c442...",
        "nid_hash": "991823ab...",
        "created_at": "2026-11-02T11:20:00.000Z"
      }
    ]
  }
}
```

---

## 13. Module 12: Real-Time WebSocket Event Contracts

### 13.1 WebSocket Connection & Namespaces
- **Passenger Namespace:** `wss://api.secride.bd/passenger`
- **Driver Namespace:** `wss://api.secride.bd/driver`
- **Admin Namespace:** `wss://api.secride.bd/admin`

#### Connection Handshake Header:
```http
Authorization: Bearer <jwt_access_token>
```

### 13.2 Real-Time Event Matrix

| Event Name | Namespace | Direction | Payload Schema | Functional Description |
|:---|:---|:---:|:---|:---|
| `driver:location_update` | `/driver` | Client $\rightarrow$ Server | `{ "driverId": "string", "lat": 23.79, "lng": 90.40, "heading": 180, "speed": 35 }` | Pushed every 3 seconds while online. Server updates Redis `GEOADD`. |
| `dispatch:ride_offer` | `/driver` | Server $\rightarrow$ Client | `{ "tripId": "string", "fare": "175.00", "distanceKm": 11.4, "pickupAddress": "Dhanmondi 7", "ttl": 15 }` | Pushed to candidate driver. Triggers 15s acceptance countdown timer. |
| `dispatch:respond` | `/driver` | Client $\rightarrow$ Server | `{ "tripId": "string", "decision": "accept" \| "decline" }` | Driver acceptance response. Redis Redlock distributed mutex claims trip. |
| `trip:status_change` | `/passenger`, `/driver` | Server $\rightarrow$ Client | `{ "tripId": "string", "status": "matched" \| "arrived" \| "in_progress" \| "completed" \| "canceled" \| "interrupted" }` | Broadcast to `trip_{tripId}` room on lifecycle transitions. |
| `passenger:sensor_update` | `/passenger` | Client $\rightarrow$ Server | `{ "passengerId": "string", "lat": 23.79, "lng": 90.40, "altitude_m": 8.5, "barometer_hpa": 1012.4 }` | Emitted every 5s during search phase for flyover vertical tier separation. |
| `chat:send_message` | `/passenger`, `/driver` | Client $\rightarrow$ Server | `{ "tripId": "string", "message": "I am standing near Gate 2" }` | In-app live messaging. Saved with 7-day TTL and broadcast to `trip_{tripId}`. |
| `chat:receive_message` | `/passenger`, `/driver` | Server $\rightarrow$ Client | `{ "messageId": "string", "senderRole": "passenger" \| "driver", "message": "...", "timestamp": "..." }` | Incoming chat message frame. |
| `safety:sos_trigger` | `/passenger`, `/driver` | Client $\rightarrow$ Server | `{ "tripId": "string", "lat": 23.78, "lng": 90.39, "timestamp": "..." }` | Priority alarm broadcast to `/admin` safety desk room. |

---

## 14. Module 13: API Version Control & Deprecation Lifecycle

The SecureRide API follows strict lifecycle version control to support seamless continuous deployments and backwards compatibility across mobile native app releases (Android APK / Google Play, iOS IPA / Apple App Store) and Next.js web applications.

### 14.1 URI Versioning Architecture & Strategy
- **Major Version in URL Path:** The primary versioning mechanism is explicit URI path prefixing:
  ```
  https://api.secride.bd/api/v1/...
  ```
- **Stability Guarantee:** Within a major version (e.g. `v1`), all existing endpoints, parameter semantics, and response structures remain strictly backwards-compatible.
- **Breaking Change Boundary:** Breaking changes (e.g. altering parameter types, removing fields, modifying business state transitions) are strictly forbidden within `v1` and necessitate the release of a new major root (`/api/v2`).

### 14.2 Client SemVer & Automated Header Compatibility Gate
Mobile native applications and Web PWAs must include their semantic version (SemVer) and device platform with every HTTP and WebSocket request:

```http
X-App-Version: 2.4.0
X-Platform: android | ios | web
X-Build-Number: 1042
```

#### Middleware Implementation (`versionGate.middleware.ts`):
1. The API gateway extracts `X-App-Version` and `X-Platform`.
2. Compares against Redis cached version policies:
   - `config:min_supported_version:android` (e.g. `2.2.0`)
   - `config:latest_version:android` (e.g. `2.4.0`)
3. **Soft Update (Deprecation Warning):** If `min_supported <= client_version < latest`, request succeeds, but response includes warning header:
   ```http
   X-Update-Available: true
   X-Latest-Version: 2.4.0
   ```
4. **Hard Forced Update (`HTTP 426 Upgrade Required`):** If `client_version < min_supported`, the gateway halts execution immediately:
   ```json
   {
     "success": false,
     "statusCode": 426,
     "errorCode": "AUTH_APP_UPGRADE_REQUIRED",
     "message": "Your app version (2.1.0) is no longer supported. Please update to version 2.4.0 to continue using SecureRide.",
     "message_bn": "আপনার অ্যাপ ভার্সনটি (২.১.০) আর সমর্থিত নয়। সেবা চালিয়ে যেতে অনুগ্রহ করে গুগল প্লে স্টোর থেকে ভার্সন ২.৪.০ আপডেট করুন।",
     "data": {
       "current_version": "2.1.0",
       "minimum_supported_version": "2.2.0",
       "latest_version": "2.4.0",
       "store_url": "https://play.google.com/store/apps/details?id=bd.secride.passenger",
       "force_update": true
     },
     "meta": {
       "timestamp": "2026-11-04T08:30:00.000Z"
     }
   }
   ```

### 14.3 Backward Compatibility Rules

| Change Type | Classification | Policy | Example |
|:---|:---:|:---:|:---|
| **Add new endpoint** | Non-Breaking | Allowed in minor release (`v1`) | `POST /passengers/saved-addresses` |
| **Add optional request field** | Non-Breaking | Allowed in minor release (`v1`) | Adding optional `special_request` |
| **Add new field to response** | Non-Breaking | Allowed in minor release (`v1`) | Adding `loyalty_points_earned` |
| **Add new enum value** | Non-Breaking | Allowed if client handles unknown | Adding `interrupted` to trip status |
| **Remove / rename field** | **BREAKING** | **Forbidden in `v1` $\rightarrow$ Requires `v2`** | Renaming `upfront_fare` $\rightarrow$ `fare` |
| **Change field data type** | **BREAKING** | **Forbidden in `v1` $\rightarrow$ Requires `v2`** | Changing `coordinates` array to object |
| **Make optional field required** | **BREAKING** | **Forbidden in `v1` $\rightarrow$ Requires `v2`** | Requiring `email` during passenger login |
| **Modify error codes** | **BREAKING** | **Forbidden in `v1` $\rightarrow$ Requires `v2`** | Changing `INVALID_OTP` string |

### 14.4 Deprecation & Sunset Protocol
When an endpoint or major version is scheduled for retirement:
1. **Notice Period:** Minimum **6 months (180 days)** notice before sunsetting.
2. **IETF Standards Header Injection:** The API gateway injects standard headers into all responses:
   ```http
   Deprecation: @1794528000
   Sunset: Wed, 11 Nov 2027 00:00:00 GMT
   Link: <https://docs.secride.bd/api/migration-v1-to-v2>; rel="deprecation"
   ```
3. **Telemetry Tracking:** Traffic volume to deprecated routes is continuously aggregated by `telemetryLog.model.ts` to ensure $<0.5\%$ active users before final decommission.

### 14.5 Database Schema Coexistence (Dual-Read / Dual-Write)
During major version transitions:
- MongoDB Atlas schemas utilize **Additive Evolution**. Deprecated attributes are never deleted immediately.
- A dual-read / dual-write migration period is enforced via Mongoose middleware until collection migration scripts complete.

---

## 15. Module 14: Enterprise Error Handling Architecture & Fault-Tolerance

SecureRide utilizes a centralized, layered error handling architecture that guarantees high resilience against infrastructure failures, network dead-zones, and external gateway downtime.

### 15.1 Global Error Handling Pipeline Architecture

```mermaid
flowchart TD
    Req[Incoming HTTP Request] --> Val[Zod Schema Validation Middleware]
    Val -- Syntax/Validation Error --> Res400[HTTP 400 / 422 Structured Validation Response]
    Val -- Valid Payload --> Auth[JWT & RBAC Security Guard]
    Auth -- Invalid Token / Role Mismatch --> Res401[HTTP 401 / 403 Security Response]
    Auth -- Authorized --> Ctrl[Controller / Business Service]
    Ctrl -- Handled Business Rejection --> AppErr[throw new AppError(code, message, status)]
    Ctrl -- Third-Party Failure --> CB[Circuit Breaker Evaluation]
    Ctrl -- Unexpected Crash --> Unhandled[Native Exception / Bug]
    
    AppErr --> GlobalHandler[Global Error Handling Middleware]
    CB --> Fallback[Graceful Degradation / Fallback Execution]
    Unhandled --> Sanitizer[Security Sanitizer: Strip Stack & PII]
    
    Sanitizer --> GlobalHandler
    GlobalHandler --> StandardJSON[RFC 7807 Standard Error Response + Central Log]
```

### 15.2 Standard RFC 7807 Compliant Error Envelope

All error responses output a consistent, predictable structure containing machine-parsable error codes, localized messages, field validation arrays, and client recovery instructions:

```json
{
  "success": false,
  "statusCode": 422,
  "errorCode": "DRIVER_FACIAL_MISMATCH",
  "type": "https://errors.secride.bd/errors/DRIVER_FACIAL_MISMATCH",
  "message": "Face on live selfie does not match the photo on your Smart NID. Confidence: 64.2% (Required >= 90.0%).",
  "message_bn": "লাইভ সেলফির চেহারার সাথে স্মার্ট এনআইডির ছবির মিল পাওয়া যায়নি। রিকগনিশন কনফিডেন্স ৬৪.২% (কমপক্ষে ৯০.০% আবশ্যক)।",
  "errors": [
    {
      "field": "live_selfie",
      "rule": "face_similarity_threshold",
      "expected": ">= 90.0%",
      "actual": "64.2%"
    }
  ],
  "recoveryAction": "RETRY_WITH_BETTER_LIGHTING",
  "retryable": false,
  "cooldownSeconds": 3600,
  "meta": {
    "requestId": "req_01HZX8901AB23C",
    "timestamp": "2026-11-04T08:30:00.000Z",
    "path": "/api/v1/drivers/kyc/step2-biometrics"
  }
}
```

### 15.3 Field-Level Input Validation Error Format (Zod Integration)
When a request fails schema validation (e.g. invalid phone format, negative fare, missing coordinate):

```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VALIDATION_FAILED",
  "message": "The submitted payload contains 2 invalid fields.",
  "message_bn": "আপনার দেওয়া তথ্যগুলোতে ২ টি ত্রুটি রয়েছে। অনুগ্রহ করে সংশোধন করুন।",
  "errors": [
    {
      "field": "phone_number",
      "rule": "regex",
      "expected": "^(?:\\+8801|01)[3-9]\\d{8}$",
      "actual": "01234567890",
      "message": "Mobile number must belong to a valid Bangladeshi operator (Grameenphone, Banglalink, Robi, Teletalk)."
    },
    {
      "field": "emergency_contacts",
      "rule": "max_items",
      "expected": "<= 3",
      "actual": 4,
      "message": "A maximum of 3 emergency contacts can be configured."
    }
  ],
  "meta": {
    "requestId": "req_01HZX8901AB99Z",
    "timestamp": "2026-11-04T08:31:00.000Z",
    "path": "/api/v1/passengers/emergency-contacts"
  }
}
```

### 15.4 Third-Party Circuit Breaker & Graceful Degradation Strategy
To prevent cascading gateway timeouts, external microservice calls are wrapped with **Opossum Circuit Breakers**:

| External Dependency | Primary Provider | Error Threshold (Rolling 3m) | Fallback / Degradation Action | Client Impact |
|:---|:---|:---:|:---|:---|
| **MFS Checkout** | bKash / Nagad API | $> 15\%$ failure rate | Circuit breaker trips `OPEN`. Gateway returns `PAYMENT_GATEWAY_DOWN`. | Digital payment radio buttons disabled in UI; automatic switch to Cash payment with polite banner. |
| **SMS Gateway** | SSL Wireless | $> 10\%$ failure rate | Immediate transparent fallback to secondary provider (Twilio Verify API). | Zero user impact; OTP dispatch continues without delay. |
| **Route & Maps** | Mapbox Directions SDK | $> 15\%$ failure rate | Fallback to self-hosted OpenStreetMap (OSRM) instance. | Route & upfront fare quotation continues; minor aesthetic map tile changes. |
| **Face Match AI** | AWS Rekognition | $> 20\%$ failure rate | Submissions placed in asynchronous pending queue for manual Admin Ops review. | Driver informed: *"Verification queued for manual review within 30 minutes."* |

### 15.5 Security Sanitization & Information Leakage Prevention
- **Production Stripping (`NODE_ENV === 'production'`):** Internal stack traces, MongoDB BSON errors, database connection strings, server file paths, and environment variables are strictly scrubbed before transmitting responses.
- **Audit Logging:** Every unhandled error is written to a secure Winston audit log stream tagged with `requestId`, user identity, and sanitised payload for debugging.

---

## 16. Module 15: Comprehensive Domain Error Code Matrix

The table below catalogs every standardized machine-readable error code across all business domains of the platform:

| Error Code | HTTP Status | User Message (English) | User Message (Bengali) | Trigger Condition & Root Cause | Client Recovery Action |
|:---|:---:|:---|:---|:---|:---|
| **`AUTH_INVALID_PHONE`** | `400` | Invalid Bangladeshi mobile number format. | সঠিক বাংলাদেশী মোবাইল নম্বর প্রদান করুন। | Phone fails `^(?:\+8801\|01)[3-9]\d{8}$` regex. | Re-enter valid 11-digit mobile number. |
| **`AUTH_OTP_RATE_LIMIT`** | `429` | Too many OTP requests. Please wait. | আপনি খুব বেশিবার চেষ্টা করেছেন। কিছুক্ষণ অপেক্ষা করুন। | Exceeded 3 requests within 10 minutes. | Show countdown timer until `retryAfter`. |
| **`AUTH_INVALID_OTP`** | `400` | Incorrect 6-digit OTP code. | ওটিপি কোডটি সঠিক নয়। | Submitted code does not match Redis secret. | Re-enter 6-digit SMS code. |
| **`AUTH_OTP_EXPIRED`** | `410` | OTP code has expired. | ওটিপির মেয়াদ শেষ হয়ে গেছে। | Submitted code older than 120 seconds. | Tap "Resend OTP". |
| **`AUTH_INVALID_CREDENTIALS`**| `401` | Incorrect mobile number or password. | মোবাইল নম্বর অথবা পাসওয়ার্ড ভুল। | Argon2id password hash verification mismatch. | Verify credentials or use "Forgot Password".|
| **`AUTH_TOKEN_EXPIRED`** | `401` | Access token expired. Please refresh session. | আপনার সেশনের মেয়াদ শেষ। অনুগ্রহ করে রিফ্রেশ করুন। | JWT expiration timestamp $< \text{now}$. | Silent call to `/auth/refresh-token`. |
| **`AUTH_TOKEN_REVOKED`** | `401` | Session revoked due to concurrent login. | অন্য ডিভাইসে লগইন করার কারণে সেশন বন্ধ হয়েছে। | Refresh Token Rotation family reuse detected. | Redirect user to Login screen. |
| **`AUTH_NID_BLACKLISTED`** | `403` | This NID is permanently blacklisted. | এই জাতীয় পরিচয়পত্রটি প্ল্যাটফর্মে নিষিদ্ধ। | NID hash exists in `nid_blacklist` collection. | Display legal compliance contact modal. |
| **`AUTH_DEVICE_BANNED`** | `403` | Hardware banned due to 3-strike violations. | প্ল্যাটফর্মের নিয়ম ভঙ্গের কারণে ডিভাইসটি নিষিদ্ধ। | IMEI/Android ID hash in `device_blacklists`. | Block app launch; display ban support ID. |
| **`AUTH_FORBIDDEN_ROLE`** | `403` | Insufficient permissions for this action. | আপনার এই অ্যাকশনটি সম্পন্ন করার অনুমতি নেই। | Non-admin user accessing `/admin` endpoints. | Redirect to appropriate user dashboard. |
| **`AUTH_APP_UPGRADE_REQ`** | `426` | App update required to continue. | সেবা চালিয়ে যেতে অ্যাপটি আপডেট করুন। | Client version below minimum supported version. | Show non-dismissible Store Update modal. |
| **`DRIVER_KYC_PENDING`** | `403` | Driver account under regulatory review. | আপনার ড্রাইভার অ্যাকাউন্টটি রিভিউতে রয়েছে। | Driver `verification_status = 'pending'`. | Display KYC verification status banner. |
| **`DRIVER_LOCKOUT_ACTIVE`** | `423` | Account temporarily locked for 1 hour. | অ্যাকাউন্টটি ১ ঘণ্টার জন্য সাময়িক লক করা হয়েছে। | Consecutive KYC submission failures. | Show countdown timer for lockout expiration.|
| **`DRIVER_FACIAL_MISMATCH`** | `422` | Live selfie does not match NID photograph. | লাইভ সেলফির সাথে এনআইডির ছবির মিল পাওয়া যায়নি। | AWS Rekognition similarity $< 90.0\%$. | Retake photo in bright natural lighting. |
| **`DRIVER_TAX_TOKEN_EXP`** | `422` | BRTA Tax token expired or near expiration. | বিআরটিএ ট্যাক্স টোকেনটির মেয়াদ শেষ হয়ে গেছে। | Tax token expiry $< \text{Today} + 15\text{ days}$. | Upload renewed BRTA tax token document. |
| **`DRIVER_NO_ACTIVE_VEHICLE`**| `400` | No approved vehicle activated for online duty. | আপনার কোনো সক্রিয় গাড়ি নির্বাচন করা নেই। | Driver attempts online toggle without vehicle. | Redirect to Vehicle Selector screen. |
| **`DRIVER_WALLET_DEBT_LIMIT`**| `403` | Wallet balance below limit (-৳500.00). | আপনার ওয়ালেটের বকেয়া ঋণসীমা অতিক্রম করেছে। | Driver balance $< -৳500.00$. | Redirect to bKash/Nagad Wallet Top-Up. |
| **`DISPATCH_QUOTE_EXPIRED`** | `410` | Upfront fare quotation expired. | ভাড়ার কোটেশনের মেয়াদ শেষ হয়ে গেছে। | Fare quote age $> 300\text{ seconds}$. | Request a fresh fare quote. |
| **`DISPATCH_NO_DRIVERS`** | `404` | No captains found within 4km radius. | এই মুহূর্তে আশেপাশে কোনো ক্যাপ্টেন পাওয়া যায়নি। | 60-second radial search exhausted without match. | Prompt user to retry or switch vehicle class.|
| **`DISPATCH_OFFER_CLAIMED`** | `409` | Offer claimed by another captain or expired. | অফারটির সময় শেষ বা অন্য ক্যাপ্টেন গ্রহণ করেছেন। | Redis Redlock mutex acquisition failed. | Dismiss offer card; return driver to HUD. |
| **`DISPATCH_CONCURRENT_RIDE`**| `409` | You already have an active ride in progress. | আপনার ইতিমধ্যে একটি রাইড চলমান রয়েছে। | Passenger or driver already bound to active trip. | Redirect user to Active Ride Live Map. |
| **`DISPATCH_TIER_MISMATCH`** | `422` | Vertical elevation tier mismatch (Flyover). | ফ্লাইওভার ও নিচের রাস্তার উচ্চতার অমিল পাওয়া গেছে। | Elevation Separation Score $> 10\text{m}$. | Suppress false arrival; instruct turnaround. |
| **`DISPATCH_INTEGRITY_FAIL`** | `403` | Device integrity verification failed. | ডিভাইসের সিকিউরিটি ভেরিফিকেশন ব্যর্থ হয়েছে। | Play Integrity / DeviceCheck verdict negative. | Disable dispatch mode; report rooted device. |
| **`TRIP_NOT_FOUND`** | `404` | Specified trip record does not exist. | ট্রিপটির কোনো তথ্য পাওয়া যায়নি। | Invalid `tripId` supplied in route path. | Verify trip ID or return to booking screen. |
| **`TRIP_STATE_INVALID`** | `400` | Action forbidden in current trip state. | বর্তমান ট্রিপ স্ট্যাটাসে এই কাজটি করা সম্ভব নয়। | E.g. Calling `complete` before `in_progress`. | Refresh trip state from server. |
| **`TRIP_OTP_INVALID`** | `400` | Incorrect 4-digit pickup code. | পিকআপ ওটিপি কোডটি সঠিক নয়। | Submitted OTP hash does not match seed. | Ask passenger for correct 4-digit code. |
| **`TRIP_ALREADY_CANCELED`** | `409` | Trip was already canceled by other party. | অপরপক্ষ থেকে রাইডটি ইতিমধ্যে বাতিল করা হয়েছে। | Trip status already set to `canceled`. | Return to idle screen; display cancellation reason. |
| **`PAYMENT_GATEWAY_DOWN`** | `503` | Digital payment gateway experiencing downtime. | বিকাশ/নগদ গেটওয়ে সাময়িকভাবে অনুপলব্ধ রয়েছে। | bKash/Nagad circuit breaker is `OPEN`. | Fall back automatically to Cash payment. |
| **`PAYMENT_MFS_SIG_INVALID`** | `401` | Unauthorized webhook callback signature. | অবৈধ পেমেন্ট কলব্যাক সিগনেচার। | HMAC-SHA256 signature verification failed. | Reject webhook; alert security desk. |
| **`WALLET_INSUFFICIENT`** | `400` | Insufficient wallet balance for cash-out. | ক্যাশ-আউটের জন্য প্রয়োজনীয় ব্যালেন্স নেই। | Withdrawal amount $>$ available balance. | Adjust cash-out amount within balance limit. |
| **`WALLET_MIN_CASHOUT`** | `400` | Minimum cash-out amount is ৳100.00. | সর্বনিম্ন ক্যাশ-আউট পরিমাণ ১০০.০০ টাকা। | Withdrawal amount $< 100.00$. | Enter withdrawal amount $\ge ৳100.00$. |
| **`SAFETY_SOS_ACTIVE`** | `409` | Emergency SOS is already active for this ride. | এই ট্রিপটিতে ইতিমধ্যে ইমার্জেন্সি এসওএস চালু আছে। | SOS incident already triggered and active. | Safety modal remains open; audio continuing.|
| **`SYS_SERVER_ERROR`** | `500` | Internal server error. Incident logged. | সার্ভারে অভ্যন্তরীণ ত্রুটি হয়েছে। দ্রুত সমাধান করা হচ্ছে।| Uncaught native application exception. | Retry request; alert engineering team. |

---

## 17. Module 16: Summary Specification Coverage Matrix

| Feature Domain | PRD User Story Mapping | MongoDB Collection Ref | Endpoints Count | Key Architectural Protection |
|:---|:---:|:---:|:---:|:---|
| **Identity & Authentication** | Story P1, D1 | `users`, `nid_blacklist` | 6 | Argon2id, JWT Rotation, SMS Rate-Limiter |
| **Passenger Profile & Deletion** | Story P2 | `users` | 6 | 30-day grace period, Apple 5.1.1(v) compliance |
| **Driver Onboarding & Fleet** | Story D2, D3, D10 | `driver_profiles`, `vehicles` | 6 | 1h cooldown, 3-strike device ban, Tax token check |
| **Fare & Geospatial Dispatch** | Story P3, P4, P6, D4 | `trips`, `redis:driver_locations` | 3 | Locked upfront fare, Redis Redlock, Elevation filter |
| **Trip Execution & Metering** | Story P5, P7, P10, D11 | `trips`, `passenger_wallet_transactions` | 8 | Offline TOTP, Prorated breakdown rescue ride |
| **Telemetry & Anti-Offline AI** | Story P7, D6 | `telemetry_logs` | 2 | Fréchet distance, 48h TTL purge, SQLite sync |
| **Emergency SOS & Safety** | Story P9, A3 | `sos_audit_logs`, Cloudflare R2 | 3 | 30m ambient audio, 2h public emergency token |
| **Payments & Double-Entry Ledger**| Story D7, D9 | `payments`, `wallet_transactions` | 4 | bKash/Nagad tokens, -৳500 debt limit, Instant payout |
| **Loyalty & Detour Arbitration** | Story P8, P11, A5 | `loyalty_points`, `loyalty_transactions` | 2 | 1 pt / ৳10, Automated $>25\%$ detour refund |
| **Chat & Telecom Virtual Proxy** | Story D5 | `chat_messages` | 2 | 7-day TTL index, Virtual masked telephone proxy |
| **Admin Operations & Safety Desk**| Story A1, A2, A4, A6 | All Collections, `device_blacklists` | 7 | OCR review queue, Audio playback audit, Surge override |
| **Real-Time Sockets** | Global Real-Time | Redis Pub/Sub, WebSockets | 8 events | Isolated `/passenger`, `/driver`, `/admin` namespaces |
| **Version Control & Lifecycle** | Platform Governance | All Endpoints, Redis Config | Policies & Gate | SemVer `X-App-Version`, Forced update 426, Sunset header |
| **Error Handling & Resilience** | Platform Reliability | Global Express Middleware | 33 Error Codes | RFC 7807 Problem Details, Opossum Circuit Breakers |

---
**Document Status:** Complete and Production Ready. Conforms with `PRD.md`, `database-schema.md`, `database.md`, and `architecture.md`.

