# Database Schemas & Field Definitions — SecureRide Platform
**Document Version:** 1.0 (Production Enterprise Data Schemas)  
**Database Technology:** MongoDB Atlas (Dedicated Replica Set) + Redis Cluster (In-Memory Real-Time Tier)  
**Document Object Mapper:** Mongoose 8+ with TypeScript Interfaces  
**Compliance Standards:** Bangladesh Digital Security Act 2018, Apple App Store Guidelines 5.1.1(v)  
**Derived From:** `database.md` (Section 2: Data Schemas & Field Definitions)  
**Last Updated:** 2026-10-31  
**Status:** Approved Technical Architecture Artifact  

---

## Table of Contents
1. [Collection: `users`](#21-collection-users)
2. [Collection: `driver_profiles`](#22-collection-driver_profiles)
3. [Collection: `vehicles`](#23-collection-vehicles)
4. [Collection: `trips`](#24-collection-trips)
5. [Collection: `payments`](#25-collection-payments)
6. [Collection: `wallet_transactions`](#26-collection-wallet_transactions)
7. [Collection: `passenger_wallet_transactions`](#27-collection-passenger_wallet_transactions)
8. [Collection: `telemetry_logs`](#28-collection-telemetry_logs)
9. [Collection: `device_blacklists`](#29-collection-device_blacklists)
10. [Collection: `nid_blacklist`](#210-collection-nid_blacklist)
11. [Collection: `sos_audit_logs`](#211-collection-sos_audit_logs)
12. [Collection: `chat_messages`](#212-collection-chat_messages)
13. [Collection: `loyalty_points`](#213-collection-loyalty_points)
14. [Collection: `loyalty_transactions`](#214-collection-loyalty_transactions)
15. [Collection: `commission_passes`](#215-collection-commission_passes)

---

## 2. Data Schemas & Field Definitions

### 2.1 Collection: `users`
Represents all system actors (Passengers, Drivers, and Platform Administrators).

```json
{
  "_id": "ObjectId — Primary Key",
  "phone_number": "String — Normalized E.164 (+8801XXXXXXXXX) [Unique, Indexed]",
  "email": "String — RFC 5322 Compliant Email [Nullable, Unique Sparse, Lowercase]",
  "password_hash": "String — Argon2id Cryptographic Password Hash",
  "role": "String — Enum: ['passenger', 'driver', 'admin']",
  "admin_sub_role": "String — Enum: ['ops', 'safety', 'super', null] [Default: null]",
  "full_name": "String — User display name (Length: 2-80)",
  "profile_photo_url": "String — Pre-signed Cloudflare R2 / S3 CDN Image URL [Nullable]",
  "emergency_contacts": [
    {
      "name": "String — Contact name",
      "phone_number": "String — Valid Bangladeshi phone number",
      "relationship": "String — e.g., 'Spouse', 'Parent', 'Sibling', 'Friend'"
    }
  ],
  "saved_addresses": [
    {
      "label": "String — 'Home' | 'Work' | 'Other'",
      "address_text": "String — Formatted location string",
      "location": {
        "type": "String — 'Point'",
        "coordinates": "[Number, Number] — [Longitude, Latitude]"
      }
    }
  ],
  "passenger_wallet_balance": "Decimal128 — Available in-app cash shortage / refund balance [Default: 0.00]",
  "rating_avg": "Double — Rolling bilateral rating score (Range: 1.00 - 5.00) [Default: 5.00]",
  "total_ratings_count": "Int32 — Total ratings received [Default: 0]",
  "language_preference": "String — Enum: ['bn', 'en'] [Default: 'bn']",
  "fcm_tokens": ["String — Active Firebase Cloud Messaging device registration tokens"],
  "deletion_status": "String — Enum: ['active', 'pending_deletion', 'deleted'] [Default: 'active']",
  "deletion_requested_at": "Date — Timestamp when deletion was initiated [Nullable]",
  "scheduled_deletion_at": "Date — Timestamp when PII will be purged (requested_at + 30 days) [Nullable]",
  "created_at": "Date — Timestamp of account creation",
  "updated_at": "Date — Timestamp of last document modification"
}
```

### 2.2 Collection: `driver_profiles`
Maintains operational compliance, legal documentation, payout routing, and penalty tracking for drivers.

```json
{
  "_id": "ObjectId — Primary Key",
  "user_id": "ObjectId — Foreign Key referencing users._id [Unique, Indexed]",
  "nid_number": "String — Smart National Identity Card number (10 or 17 digits) [Indexed]",
  "nid_document_front_url": "String — Cloudflare R2 Encrypted Media URL",
  "nid_document_back_url": "String — Cloudflare R2 Encrypted Media URL",
  "license_number": "String — BRTA Driving License identifier [Unique, Indexed]",
  "license_category": "String — Enum: ['motorcycle', 'light_vehicle'] [Indexed]",
  "license_expiry_date": "Date — Driving license expiration date (Must be in future)",
  "license_document_url": "String — Cloudflare R2 Encrypted Media URL",
  "live_selfie_url": "String — Cloudflare R2 Encrypted Media URL",
  "facial_vector_hash": "String — SHA-256 Digest of Biometric Facial Embedding (64 chars) [Indexed]",
  "verification_status": "String — Enum: ['pending', 'approved', 'rejected'] [Default: 'pending', Indexed]",
  "failed_verification_attempts": "Int32 — Consecutive failed verification counter [Default: 0]",
  "lockout_until": "Date — 1-hour cooldown timestamp following a rejected submission [Nullable]",
  "bkash_payout_number": "String — Mandatory verified bKash mobile wallet number",
  "nagad_payout_number": "String — Mandatory verified Nagad mobile wallet number",
  "current_wallet_balance": "Decimal128 — Net wallet balance (Minimum allowed: -500.00 BDT) [Default: 0.00]",
  "active_vehicle_id": "ObjectId — Foreign Key referencing vehicles._id [Nullable, Indexed]",
  "commission_pass_active": "Boolean — True if valid Pro-Captain pass is active [Default: false]",
  "commission_pass_type": "String — Enum: ['daily', 'weekly', null] [Default: null]",
  "commission_pass_expiry": "Date — Timestamp when active commission pass expires [Nullable]",
  "cancellation_count_7d": "Int32 — Rolling 7-day driver cancellations count [Default: 0]",
  "total_offers_7d": "Int32 — Rolling 7-day ride offers accepted/declined [Default: 0]",
  "deprioritized_until": "Date — Dispatch de-prioritization penalty timestamp (if cancel rate > 15%) [Nullable]",
  "vehicle_mismatch_count": "Int32 — Number of vehicle mismatch violations logged [Default: 0]",
  "offline_collusion_strikes": "Int32 — Cumulative offline collusion penalty count (Warning -> 7d deprioritize -> Ban) [Default: 0]",
  "suspended_until": "Date — Account suspension timestamp (7 days on 1st mismatch) [Nullable]",
  "is_permanently_banned": "Boolean — Permanent platform ban status (on 2nd mismatch / 3-strike) [Default: false]",
  "created_at": "Date — Profile creation timestamp",
  "updated_at": "Date — Profile last updated timestamp"
}
```

### 2.3 Collection: `vehicles`
Maintains legal registration, fitness documentation, and physical specifications of vehicles.

```json
{
  "_id": "ObjectId — Primary Key",
  "driver_id": "ObjectId — Foreign Key referencing driver_profiles._id [Indexed]",
  "brta_plate_number": "String — Official registration (e.g., 'Dhaka Metro-HA 12-3456') [Unique, Indexed]",
  "tax_token_number": "String — BRTA Tax Token identifier",
  "tax_token_expiry": "Date — Tax Token expiry date (Must be >= Today + 15 days) [Indexed]",
  "vehicle_class": "String — Enum: ['bike', 'car_sedan', 'microbus'] [Indexed]",
  "brand": "String — Vehicle manufacturer (e.g., 'Yamaha', 'Toyota', 'Honda')",
  "model_name": "String — Model designation (e.g., 'FZS V3', 'Corolla Axio', 'HiAce')",
  "color": "String — Exterior body color (e.g., 'Metallic Black', 'Pearl White')",
  "front_photo_url": "String — Cloudflare R2 Media URL showing license plate",
  "rear_photo_url": "String — Cloudflare R2 Media URL showing vehicle rear",
  "registration_document_url": "String — Cloudflare R2 Encrypted Media URL",
  "is_approved": "Boolean — Operational approval gate flag [Default: false, Indexed]",
  "created_at": "Date — Vehicle registration timestamp",
  "updated_at": "Date — Vehicle last updated timestamp"
}
```

### 2.4 Collection: `trips`
The central operational document encapsulating the complete lifecycle of a ride.

```json
{
  "_id": "ObjectId — Primary Key",
  "trip_code": "String — Unique alphanumeric trip identifier (e.g., 'TRX-20261030-8901') [Unique, Indexed]",
  "passenger_id": "ObjectId — Foreign Key referencing users._id [Indexed]",
  "driver_id": "ObjectId — Foreign Key referencing driver_profiles._id [Nullable, Indexed]",
  "vehicle_id": "ObjectId — Foreign Key referencing vehicles._id [Nullable, Indexed]",
  "pickup_address": "String — Textual pickup location description",
  "pickup_geo": {
    "type": "String — 'Point'",
    "coordinates": "[Number, Number] — [Longitude, Latitude] [2dsphere Indexed]"
  },
  "dropoff_address": "String — Textual destination location description",
  "dropoff_geo": {
    "type": "String — 'Point'",
    "coordinates": "[Number, Number] — [Longitude, Latitude] [2dsphere Indexed]"
  },
  "status": "String — Enum: ['requested', 'matched', 'arrived', 'in_progress', 'completed', 'canceled', 'interrupted'] [Indexed]",
  "vehicle_class": "String — Enum: ['bike', 'car_sedan', 'microbus']",
  "upfront_fare": "Decimal128 — Guaranteed locked fare in BDT (Computed prior to dispatch)",
  "surge_multiplier": "Double — Dynamic surge multiplier applied (Range: 1.00 - 1.50) [Default: 1.00]",
  "payment_method": "String — Enum: ['bkash', 'nagad', 'cash'] [Indexed]",
  "special_request": "String — Passenger custom notes (Max 150 chars, sanitized) [Nullable]",
  "pickup_otp_hash": "String — Hash of 4-digit pickup code or offline TOTP cryptographic seed",
  "rescue_ride": "Boolean — True if ride is an automated breakdown replacement trip [Default: false]",
  "route_breadcrumbs": [
    {
      "location": {
        "type": "String — 'Point'",
        "coordinates": "[Number, Number] — [Longitude, Latitude]"
      },
      "altitude_m": "Double — Barometric/GPS elevation in meters",
      "speed": "Double — Ground speed in km/h",
      "timestamp": "Date — Sample timestamp (Sampled every 10 seconds)"
    }
  ],
  "cancellation_metadata": {
    "canceled_by": "String — 'passenger' | 'driver' | 'system' | null",
    "reason": "String — Structured cancellation tag",
    "fee_charged": "Decimal128 — Cancellation penalty (৳30 Bike / ৳50 Car / ৳70 Microbus / ৳0)",
    "timestamp": "Date — Cancellation timestamp"
  },
  "sos_events": [
    {
      "triggered_by": "String — 'passenger' | 'driver'",
      "triggered_at": "Date — SOS trigger timestamp",
      "audio_recording_url": "String — Cloudflare R2 audio recording key/URL (sos-audio/{tripId}/{timestamp}.aac) [Nullable]",
      "resolved_at": "Date — Safety incident resolution timestamp [Nullable]",
      "resolution_notes": "String — Admin resolution summary [Nullable]"
    }
  ],
  "insurance_policy_id": "String — Partner policy number (Green Delta / Pragati) [Nullable, Indexed]",
  "passenger_rating": "Int32 — Rating given to driver (Range: 1 - 5) [Nullable]",
  "passenger_review_tags": ["String — e.g., 'Safe Driver', 'Clean Vehicle', 'Polite'"],
  "driver_rating": "Int32 — Rating given to passenger (Range: 1 - 5) [Nullable]",
  "driver_review_tags": ["String — e.g., 'Prompt Arrival', 'Rude Behavior', 'Asked Offline Ride'"],
  "started_at": "Date — Meter start timestamp (OTP verified) [Nullable]",
  "completed_at": "Date — Destination completion timestamp [Nullable]",
  "created_at": "Date — Booking creation timestamp [Indexed]"
}
```

### 2.5 Collection: `payments`
Tracks monetary transactions, gateway webhooks, and refunds.

```json
{
  "_id": "ObjectId — Primary Key",
  "trip_id": "ObjectId — Foreign Key referencing trips._id [Unique, Indexed]",
  "payer_user_id": "ObjectId — Foreign Key referencing users._id [Indexed]",
  "payee_driver_id": "ObjectId — Foreign Key referencing driver_profiles._id [Nullable, Indexed]",
  "payment_method": "String — Enum: ['bkash', 'nagad', 'cash']",
  "gross_amount": "Decimal128 — Total trip fare paid",
  "wallet_discount_applied": "Decimal128 — Passenger wallet credit applied [Default: 0.00]",
  "net_amount_charged": "Decimal128 — Final monetary amount processed",
  "status": "String — Enum: ['pending', 'completed', 'failed', 'refunded'] [Indexed]",
  "external_transaction_id": "String — MFS TrxID returned by bKash/Nagad [Nullable, Indexed]",
  "mfs_callback_payload": "String — Encrypted raw webhook JSON payload [Nullable]",
  "initiated_at": "Date — Timestamp when checkout was initialized",
  "settled_at": "Date — Timestamp when final settlement callback was verified [Nullable]"
}
```

### 2.6 Collection: `wallet_transactions`
The immutable double-entry financial ledger for drivers.

```json
{
  "_id": "ObjectId — Primary Key",
  "driver_id": "ObjectId — Foreign Key referencing driver_profiles._id [Indexed]",
  "trip_id": "ObjectId — Foreign Key referencing trips._id [Nullable, Indexed]",
  "transaction_type": "String — Enum: ['commission_deduct', 'trip_credit', 'topup', 'cashout', 'cancellation_credit'] [Indexed]",
  "entry_type": "String — Enum: ['debit', 'credit']",
  "amount": "Decimal128 — Monetary transaction value (BDT)",
  "balance_before": "Decimal128 — Driver wallet balance prior to mutation",
  "balance_after": "Decimal128 — Driver wallet balance immediately following mutation",
  "status": "String — Enum: ['pending', 'settled', 'failed'] [Default: 'settled', Indexed]",
  "external_trx_id": "String — bKash/Nagad transaction reference for top-up/cash-out [Nullable, Indexed]",
  "notes": "String — Audit explanation (e.g., '10% Platform fee for Trip TRX-9901')",
  "created_at": "Date — Immutable ledger creation timestamp [Indexed]"
}
```

### 2.7 Collection: `passenger_wallet_transactions`
The immutable financial ledger for passenger change balances and refunds.

```json
{
  "_id": "ObjectId — Primary Key",
  "user_id": "ObjectId — Foreign Key referencing users._id [Indexed]",
  "trip_id": "ObjectId — Foreign Key referencing trips._id [Nullable, Indexed]",
  "transaction_type": "String — Enum: ['cash_change_credit', 'loyalty_redemption', 'detour_refund', 'ride_fare_deduction'] [Indexed]",
  "amount": "Decimal128 — Monetary transaction value (BDT)",
  "balance_before": "Decimal128 — Passenger wallet balance prior to mutation",
  "balance_after": "Decimal128 — Passenger wallet balance immediately following mutation",
  "description": "String — Explanation (e.g., 'Change shortage credited by driver for trip TRX-1020')",
  "created_at": "Date — Immutable transaction timestamp [Indexed]"
}
```

### 2.8 Collection: `telemetry_logs`
High-density sensor logs used for colocation verification, detour auditing, and crash detection.

```json
{
  "_id": "ObjectId — Primary Key",
  "trip_id": "ObjectId — Foreign Key referencing trips._id [Indexed]",
  "user_role": "String — Enum: ['passenger', 'driver']",
  "user_id": "ObjectId — Foreign Key referencing users._id",
  "location": {
    "type": "String — 'Point'",
    "coordinates": "[Number, Number] — [Longitude, Latitude] [2dsphere Indexed]"
  },
  "speed": "Double — Speed in km/h",
  "heading": "Double — Bearing in degrees (0 - 360)",
  "accelerometer_magnitude": "Double — Total G-force magnitude sqrt(x^2 + y^2 + z^2)",
  "altitude_m": "Double — GNSS/Barometric elevation in meters",
  "barometer_hpa": "Double — Atmospheric pressure in hPa",
  "is_mock": "Boolean — Flagged true if Android mock location provider is active",
  "timestamp": "Date — Device hardware timestamp",
  "expires_at": "Date — TTL purge timestamp (timestamp + 48 hours) [TTL Indexed]"
}
```

### 2.9 Collection: `device_blacklists`
Maintains hardware fingerprints and multi-factor identifiers of banned devices.

```json
{
  "_id": "ObjectId — Primary Key",
  "imei_hash": "String — Salted SHA-256 hash of hardware IMEI / Serial [Indexed]",
  "android_id": "String — Salted SHA-256 hash of Android ID / iOS IDFV [Indexed]",
  "nid_hash": "String — Salted SHA-256 hash of Smart NID [Indexed]",
  "license_hash": "String — Salted SHA-256 hash of Driving License [Indexed]",
  "facial_vector_hash": "String — SHA-256 hash of biometric face embedding [Indexed]",
  "integrity_verdict": "String — Google Play Integrity verdict (e.g., 'NO_INTEGRITY', 'MEETS_BASIC_INTEGRITY')",
  "ban_type": "String — Enum: ['kyc_fraud', 'vehicle_mismatch', 'offline_collusion', 'device_tamper']",
  "ban_reason": "String — Detailed compliance explanation",
  "banned_by_admin_id": "ObjectId — Foreign Key referencing users._id [Nullable]",
  "created_at": "Date — Ban issuance timestamp [Indexed]"
}
```

### 2.10 Collection: `nid_blacklist`
Dedicated national identity blacklist preventing re-registration before OTP dispatch.

```json
{
  "_id": "ObjectId — Primary Key",
  "nid_hash": "String — Salted SHA-256 hash of National Identity Number [Unique, Indexed]",
  "license_hash": "String — Salted SHA-256 hash of Driving License [Nullable, Indexed]",
  "facial_vector_hash": "String — SHA-256 hash of biometric facial embedding [Nullable, Indexed]",
  "ban_reason": "String — Formal regulatory reason",
  "created_at": "Date — Blacklist creation timestamp"
}
```

### 2.11 Collection: `sos_audit_logs`
Compliance audit log tracking all actions taken on emergency incidents.

```json
{
  "_id": "ObjectId — Primary Key",
  "trip_id": "ObjectId — Foreign Key referencing trips._id [Indexed]",
  "admin_id": "ObjectId — Foreign Key referencing users._id (Safety Officer) [Indexed]",
  "action": "String — Enum: ['audio_playback', 'audio_download', 'police_999_escalate', 'contacts_notified']",
  "audio_recording_url": "String — Cloudflare R2 audio recording key/URL accessed during audit [Nullable]",
  "ip_address": "String — Client IP of the accessing administrator",
  "user_agent": "String — Browser User-Agent header",
  "accessed_at": "Date — Audit access timestamp [Indexed]"
}
```

### 2.12 Collection: `chat_messages`
Temporary persistence layer for in-app messaging.

```json
{
  "_id": "ObjectId — Primary Key",
  "trip_id": "ObjectId — Foreign Key referencing trips._id [Indexed]",
  "sender_id": "ObjectId — Foreign Key referencing users._id",
  "sender_role": "String — Enum: ['passenger', 'driver']",
  "message_text": "String — Sanitized message text (Length: 1 - 500 chars)",
  "sent_at": "Date — Message dispatch timestamp",
  "expires_at": "Date — TTL expiration timestamp (sent_at + 7 days) [TTL Indexed]"
}
```

### 2.13 Collection: `loyalty_points`
Maintains rewards balances for passengers.

```json
{
  "_id": "ObjectId — Primary Key",
  "passenger_id": "ObjectId — Foreign Key referencing users._id [Unique, Indexed]",
  "points_balance": "Int32 — Total redeemable loyalty points [Default: 0]",
  "lifetime_points_earned": "Int32 — Cumulative lifetime points earned [Default: 0]",
  "last_earned_at": "Date — Timestamp of last points credit",
  "expires_after": "Date — Expiry date (last_earned_at + 12 months) [Indexed]",
  "updated_at": "Date — Balance last updated timestamp"
}
```

### 2.14 Collection: `loyalty_transactions`
Auditable movements of loyalty points.

```json
{
  "_id": "ObjectId — Primary Key",
  "passenger_id": "ObjectId — Foreign Key referencing users._id [Indexed]",
  "trip_id": "ObjectId — Foreign Key referencing trips._id [Nullable, Indexed]",
  "type": "String — Enum: ['earn', 'redeem', 'expired'] [Indexed]",
  "points_delta": "Int32 — Points added (+ve) or deducted (-ve)",
  "balance_after": "Int32 — Points balance following mutation",
  "created_at": "Date — Transaction timestamp [Indexed]"
}
```

### 2.15 Collection: `commission_passes`
Tracks purchased zero-commission subscription passes for drivers.

```json
{
  "_id": "ObjectId — Primary Key",
  "driver_id": "ObjectId — Foreign Key referencing driver_profiles._id [Indexed]",
  "pass_type": "String — Enum: ['daily', 'weekly']",
  "price_bdt": "Decimal128 — Cost of pass (৳99 for daily, ৳599 for weekly)",
  "purchase_transaction_id": "String — MFS payment transaction reference",
  "activated_at": "Date — Pass activation timestamp",
  "expires_at": "Date — Expiry timestamp (+24h for daily, +7 days for weekly) [Indexed]",
  "created_at": "Date — Document creation timestamp"
}
```

---

