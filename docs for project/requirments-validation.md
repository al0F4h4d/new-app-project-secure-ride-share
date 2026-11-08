# Requirements Validation & Technical Audit Report
**Project:** SecureRide  
**Reviewed Document:** [PRD.md (v3.0)](file:///c:/Users/hp/OneDrive/Documents/rider%20sharing=project/PRD.md)  
**Auditor:** Senior Product & Technical Architect  
**Validation Date:** 2026-10-29  
**Status:** Comprehensive Gap & Edge-Case Analysis Complete  

---

## Executive Summary

This validation audit conducts an in-depth engineering and product review of **PRD v3.0** across eight critical dimensions:
1. **Missing Flow** — Gaps in user journeys and operational lifecycles.
2. **Edge Case** — Real-world scenarios that stress-test system assumptions.
3. **Error Handling** — Failure recovery across client, network, and gateway tiers.
4. **Security** — Vulnerability vectors, anti-fraud controls, and PII protection.
5. **Validation** — Data format, business logic boundaries, and schema integrity.
6. **Permission** — OS-level capabilities (Android & iOS) and consent UX.
7. **Notification** — Matrix of push, SMS, in-app alerts, and priority channels.
8. **Exception** — Disaster recovery, hardware failures, and critical fallback paths.

---

## 1. Missing Flow Analysis

While the 5 existing Mermaid flows cover core booking, onboarding, and mutual cancellation, several secondary and operational lifecycles are undocumented:

| # | Missing Flow | Business / Technical Impact | Recommended Specification |
|---|---|---|---|
| **1.1** | **Driver Vehicle Replacement / Addition Flow** | A verified driver who upgrades their motorcycle or acquires a car has no defined path to add or switch vehicles. | **Add "Manage Vehicles" in Driver Profile:** Driver submits new vehicle docs $\rightarrow$ enters 2-Step review queue $\rightarrow$ previous vehicle remains active until new vehicle is approved $\rightarrow$ driver selects active vehicle before going online. |
| **1.2** | **Driver Negative Wallet Top-Up Flow** | When driver wallet balance drops below -৳500 from cash commission deductions, the PRD states cash rides are paused, but lacks the UI/transactional top-up flow. | **Driver In-App Deposit Flow:** Driver opens Wallet $\rightarrow$ taps "Clear Dues / Top Up" $\rightarrow$ enters amount $\rightarrow$ redirects to bKash/Nagad checkout $\rightarrow$ instant credit to wallet $\rightarrow$ cash rides automatically unblocked. |
| **1.3** | **Fare Dispute & Overcharge Adjustment Flow** | Passenger overcharged due to driver route detour or meter error; driver underpaid due to passenger cash shortage. | **Post-Trip Dispute Ticket Flow:** In Ride History $\rightarrow$ tap "Report Fare Issue" $\rightarrow$ select category (*"Driver took unreasonable detour"*, *"Paid excess cash"*) $\rightarrow$ automated GPS route vs optimal route comparison $\rightarrow$ instant partial refund to passenger wallet if detour $>25\%$ without traffic justification. |
| **1.4** | **In-Trip Emergency SOS Escalation Flow** | The PRD mentions an SOS button, but lacks the complete dispatch and tracking workflow. | **SOS Execution Flow:** Passenger/Driver taps SOS $\rightarrow$ 3-second abort countdown $\rightarrow$ activates live audio recording $\rightarrow$ automated webhook triggers Platform Admin Incident Desk $\rightarrow$ automated SMS with live web-tracking URL dispatched to Emergency Contacts $\rightarrow$ auto-dialer links to 999. |
| **1.5** | **Account Deletion & Data Purge Flow** | Mandatory for Google Play & Apple App Store approval (Apple Guideline 5.1.1(v)). | **Self-Service Account Deletion:** Settings $\rightarrow$ Delete Account $\rightarrow$ password confirmation $\rightarrow$ verification check (no outstanding wallet debts or ongoing rides) $\rightarrow$ 30-day grace period $\rightarrow$ hard purge of personal data while preserving financial audit records for statutory periods. |

---

## 2. Edge Case Analysis

Ride-sharing in dense urban environments (e.g., Dhaka, Chittagong) introduces unique physical and environmental edge cases:

| # | Edge Case Scenario | Risk / Failure Mode | Recommended System Rule |
|---|---|---|---|
| **2.1** | **Flyover vs Surface Road GPS Ambiguity** | Passenger is on the elevated expressway or flyover (e.g., Mayor Hanif Flyover), but driver is on the surface road below. GPS coordinates match in 2D ($\Delta d < 20\text{m}$), but altitude and road tiers differ completely. | **Elevation & Bearing Heuristic:** Incorporate barometer/altitude sensor data and vector heading. If speed vector differs or no physical ramp access exists within 200m, flag vertical separation to prevent premature OTP verification. |
| **2.2** | **False-Positive AI Colocation on Public Transit** | Passenger cancels ride in Mirpur due to driver delay, and both passenger and driver coincidentally board the Dhaka Metro Rail or the same public bus heading south along the same corridor. | **Accelerometer Footprint & Speed Profile:** Public buses and trains have distinct acceleration/stopping cadence, multi-passenger Bluetooth beacons, and fixed transit station stops. If travel profile matches public transit corridors with high commuter density, suppress automatic fraud penalties and route to human review. |
| **2.3** | **Mid-Trip Destination Change** | Passenger decides to terminate the trip early or extend to a farther drop-off point mid-route. | **Dynamic Fare Recalculation:** Passenger taps "Edit Destination" in app $\rightarrow$ system computes updated distance $\rightarrow$ presents updated upfront fare to passenger $\rightarrow$ driver receives prompt to accept updated route $\rightarrow$ meter seamlessly adjusts without ending ride. |
| **2.4** | **Simultaneous Booking Collisions** | Two passengers in close proximity confirm booking at the same second, targeting the same single nearby driver. | **Distributed Lock (Redis Mutex):** The dispatch engine locks the driver ID with a 15-second TTL. The first passenger's request claims the lock; the second request automatically fans out to the next nearest driver tier without error. |
| **2.5** | **Physical Cash Currency Shortage at Drop-Off** | Fare is ৳175, passenger hands a ৳500 note, driver has zero change. | **In-App "Convert Change to Wallet Credit":** Driver inputs cash received (৳500) $\rightarrow$ system credits remaining ৳325 directly into passenger's SecureRide digital wallet for future trips. |
| **2.6** | **High-Density GPS Jitter (Motijheel / Kawran Bazar)** | Dense high-rise buildings reflect satellite signals, creating artificial 50m–100m location jumps while stationary. | **Kalman Filtering:** Implement client-side Kalman filter smoothing on raw GPS coordinates to eliminate multipath interference spikes. |

---

## 3. Error Handling Specifications

Failure modes across client apps, local telecom networks, and third-party APIs must degrade gracefully:

| # | Component / Layer | Potential Error | System Handling & Fallback Behavior |
|---|---|---|---|
| **3.1** | **Payment Gateway (bKash/Nagad)** | MFS API timeout, 5xx server error, or callback dropped after passenger PIN entry. | **Two-Phase Reconciliation:**<br>1. Background polling worker queries MFS payment status via transaction query API every 15s for 2 minutes.<br>2. If unconfirmed, trip status reverts to "Payment Pending" allowing passenger to retry or switch to Cash without holding up driver. |
| **3.2** | **Trip Start OTP Verification** | Driver in basement parking / network dead zone unable to send OTP to server to initiate ride. | **Offline Cryptographic OTP Fallback:**<br>The 4-digit OTP is generated using a Time-based One-Time Password (TOTP) algorithm seeded by `Trip_ID + Salt`. The driver app can validate the OTP offline via pre-cached trip signature, starting the offline trip meter locally. |
| **3.3** | **Map & Routing API Outage** | Google Maps / Mapbox routing API rate-limited or unavailable. | **Local Routing Cache & Haversine Fallback:** Fallback to open-source OpenStreetMap (OSM) tile server. If offline routing fails, calculate approximate fare using Haversine straight-line distance multiplied by a 1.28x urban detour constant. |
| **3.4** | **Driver Document Upload Crash** | High-resolution camera photos (10MB+) causing Out-Of-Memory (OOM) exceptions on 2GB RAM phones. | **Client-Side Image Compression:** Pre-process all camera captures via native bitmap resizing to max $1920\times1080$ resolution and JPEG quality 80% (under 1.5MB) before multi-part HTTP upload. |
| **3.5** | **WebSocket Connection Drop** | Cellular tower handover or 4G-to-3G drop breaking live chat and vehicle tracking sockets. | **Auto-Reconnection with Exponential Backoff:** Client attempts reconnect at 1s, 2s, 4s, 8s intervals with jitter. During disconnect, fall back to HTTP long-polling every 5s to maintain driver position updates. |

---

## 4. Security & Anti-Fraud Architecture

To defend against driver collusion, location spoofing, and identity theft, the following security controls must be strictly enforced:

| # | Security Vector | Vulnerability / Threat | Mitigation Control Specification |
|---|---|---|---|
| **4.1** | **Fake GPS & Location Mocking** | Drivers using mock location apps (e.g., FakeGPS, GPS JoyStick) to spoof proximity to high-surge zones or bypass offline detection. | **Anti-Mocking SDK:**<br>• Query `Location.isFromMockProvider()` on Android.<br>• Scan for active mock location permissions and developer mode hooks.<br>• Cross-reference cell tower ID and Wi-Fi BSSID triangulation against satellite coordinates. If mocked, terminate driver session instantly. |
| **4.2** | **Rooted / Jailbroken Device Detection** | Drivers rooting phones to bypass the 3-strike device fingerprint ban or tamper with app runtime memory. | **Integrity Attestation:** Integrate Google Play Integrity API (Android) and Apple DeviceCheck (iOS). Block devices failing basic integrity checks from accessing the driver application. |
| **4.3** | **Phone Number Exposure & Harassment** | Drivers or passengers obtaining real personal mobile numbers and initiating unwanted calls/messages post-trip. | **Virtual Number Masking (VoIP/PSTN Relay):** In-app call button routes through an interactive telecom SIP relay (masked virtual number proxy). Neither party ever sees the other's real phone number. |
| **4.4** | **OTP Brute-Force Attack** | Malicious driver guessing 4-digit pickup OTP to trigger ride start without passenger onboard. | **Attempt Rate Limiter:** Maximum 3 consecutive incorrect OTP entries allowed. On 3rd failure, 5-minute lockout is enforced and alert is pushed to passenger app asking: *"Is your driver attempting to start without you?"* |
| **4.5** | **Document & KYC Forgery** | Uploading forged NID cards, photoshop-altered tax tokens, or printed photos during live selfie checks. | **Active Liveness Detection:** Selfie capture must require randomized micro-actions (e.g., blink twice, turn head left) to defeat static photo replay attacks. Perform EXIF metadata validation on document uploads. |
| **4.6** | **API Man-in-the-Middle (MitM)** | Reverse-engineering mobile API traffic to intercept fare payloads or manipulate wallet balances. | **SSL Certificate Pinning:** Enforce TLS 1.3 with public key certificate pinning in native mobile code. All API payloads signed with HMAC-SHA256 headers. |

---

## 5. Input & Business Logic Validation Matrix

Strict validation rules must be applied at the client UI and validated redundantly at backend API gateways:

| Field / Object | Format / Regex Rule | Business Logic Constraint | Error Message Displayed |
|---|---|---|---|
| **Mobile Number** | `^(?:\+8801|01)[3-9]\d{8}$` | Must be a valid 11-digit Bangladeshi mobile carrier number. | *"Please enter a valid 11-digit Bangladeshi mobile number."* |
| **Email Address** | RFC 5322 Compliant | Optional for passenger, mandatory for driver. Unique in database. | *"Please enter a valid email address."* |
| **Password** | `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$` | Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special symbol. | *"Password must be at least 8 characters with upper, lower, number, and special character."* |
| **BRTA Number Plate** | `^(Dhaka|Chatto|Sylhet|Raj|Khulna|Bari|Rang)\sMetro-[A-Z]{1,2}\s\d{2}-\d{4}$` | Must match official BRTA metro registration format (e.g., `Dhaka Metro-HA 12-3456`). | *"Invalid BRTA number plate format. Example: Dhaka Metro-HA 12-3456"* |
| **Tax Token Expiry** | Date Format `YYYY-MM-DD` | Expiry date must be $\ge \text{Current Date} + 15\text{ days}$. | *"Tax Token is expired or expiring within 15 days. Please renew with BRTA."* |
| **Driving License Expiry** | Date Format `YYYY-MM-DD` | Expiry date must be in the future. | *"Driving License is expired. Valid license required."* |
| **Document Photos** | JPEG / PNG / WebP only | Max file size 5MB; minimum resolution $1024\times768\text{px}$. | *"File too large or low resolution. Upload clear image under 5MB."* |
| **Special Request Box** | String (Max 150 characters) | Strip HTML tags, script injection, and profanity filter. | *"Special request cannot exceed 150 characters."* |
| **Pickup / Drop Pins** | Lat/Long within Bangladesh Bounding Box (`20.5°N - 26.7°N`, `88.0°E - 92.7°E`) | Pickup and drop-off points cannot be identical (Distance $> 200\text{m}$). | *"Pickup and destination must be at least 200 meters apart."* |

---

## 6. OS Permission Matrix & Consent UX

Handling permissions transparently is critical for app store review compliance and user trust:

| OS Permission | Android Constant | iOS Info.plist Key | Purpose & Justification | Consent Modal UX Timing |
|---|---|---|---|---|
| **Foreground Location** | `ACCESS_FINE_LOCATION` | `NSLocationWhenInUseUsageDescription` | Real-time map positioning, nearby driver discovery, and navigation. | Prompted on initial launch after onboarding walkthrough. |
| **Background Location** | `ACCESS_BACKGROUND_LOCATION` | `NSLocationAlwaysAndWhenInUseUsageDescription` | Required for continuous ride tracking, geofence deviation detection, and 15-minute anti-offline fraud verification. | **Explicit In-App Disclosure Dialog** presented before OS prompt: explains safety/SOS benefits, states that tracking terminates after 15m post-cancel, and highlights low battery impact. |
| **Camera Access** | `CAMERA` | `NSCameraUsageDescription` | Live biometric selfie verification (driver) and document photo capture. | Prompted immediately upon tapping "Take Photo / Selfie" during onboarding. |
| **Photo / Storage Access** | `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` | `NSPhotoLibraryUsageDescription` | Uploading existing vehicle tax token and registration documents from gallery. | Prompted when selecting "Upload from Gallery". |
| **Push Notifications** | `POST_NOTIFICATIONS` (Android 13+) | UserNotifications framework | Critical ride updates, driver arrival alerts, payment receipts, and emergency alerts. | Prompted after successful phone number OTP verification. |
| **Battery Optimization Exemption** | `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Not Applicable (iOS manages via Background Modes) | Prevents Android OEM OS (Xiaomi MIUI, Samsung OneUI) from killing the driver background telemetry service mid-trip. | Prompted during driver onboarding with step-by-step visual guide for OEM settings. |

---

## 7. Multi-Channel Notification Matrix

Every notification must have an explicit channel, priority, and fallback:

| Event Trigger | Recipient | Channel | Priority | Payload / Content |
|---|---|---|---|---|
| **Driver Match Confirmed** | Passenger | Push + In-App Modal | High | *"Driver Found! [Driver Name] is arriving in 4 mins in a [Color] [Model] ([Plate])."* |
| **Driver Arrived at Pickup** | Passenger | Push + Audio Chime | Urgent | *"Your driver has arrived at the pickup location. Please share OTP [1234] to start."* |
| **Incoming Ride Request** | Driver | Push + Full-Screen HUD + Continuous Ringing | Urgent | *"New Ride Request: ৳240 • 4.2 km • Special Note: 'Need helmet'" (15s Countdown)* |
| **Trip Started** | Passenger | In-App Banner + Push | Normal | *"Trip started. Live GPS tracking and 24/7 SOS protection active."* |
| **Route Deviation Detected (>500m)** | Passenger & Driver | Push + Audible Beep | High | *"Vehicle has deviated from recommended route. Are you okay? Tap to access SOS."* |
| **Trip Completed & Receipt** | Passenger | Push + Email Receipt | Normal | *"Trip completed. Total Fare: ৳240 paid via bKash. Tap to rate your driver."* |
| **Cancellation Fee Charged** | Passenger | Push + SMS | High | *"Ride canceled after 2 mins. A cancellation fee of ৳30 has been charged for driver fuel compensation."* |
| **Driver Wallet Low Balance (<-৳300)** | Driver | In-App Warning Banner | Normal | *"Your wallet balance is -৳320. Top up soon to avoid cash ride suspension at -৳500."* |
| **Driver Verification Rejected** | Driver | Push + SMS | High | *"Document verification unsuccessful: License does not match vehicle type. You can re-apply in 1 hour (Attempt 1 of 3)."* |
| **AI Collusion Flag Triggered** | Both | Push Notification | Urgent | *"Warning: You are traveling outside SecureRide's protected app. Safety insurance and SOS disabled."* |
| **Emergency SOS Activated** | Emergency Contacts | SMS + Automated Web Link | Critical | *"EMERGENCY: [Passenger Name] pressed SOS during SecureRide trip. Live vehicle tracking: https://secride.bd/t/xyz99"* |

---

## 8. Exception & Disaster Recovery Handling

System behavior during critical infrastructure failures and unexpected hardware breakdowns:

| # | Catastrophic Event | Failure Scenario | Automated Recovery & Business Rule |
|---|---|---|---|
| **8.1** | **Driver Phone Dies / Battery 0% Mid-Trip** | Vehicle is moving with passenger onboard, but driver app suddenly goes offline. | **Passenger-Side Telemetry Continuity:**<br>1. Backend detects driver heartbeat loss for $>60\text{s}$.<br>2. Dispatch engine seamlessly promotes passenger device GPS as the primary tracking beacon.<br>3. When trip arrives at destination pin, passenger can tap "Driver Device Died - End Trip". Upfront fixed fare is honored without penalty. |
| **8.2** | **Vehicle Mechanical Breakdown / Accident Mid-Route** | Flat tire, engine failure, or minor collision prevents trip completion. | **Trip Abort & Prorated Rescue Dispatch:**<br>1. Driver or passenger taps "Vehicle Breakdown" in active trip menu.<br>2. Meter terminates immediately; system prorates fare based on exact km traveled up to breakdown point.<br>3. Dispatch engine auto-assigns a high-priority "Rescue Vehicle" to the breakdown coordinates at a 15% system discount. |
| **8.3** | **National MFS Network Blackout (bKash/Nagad Down)** | Scheduled maintenance or nationwide gateway outage prevents digital checkout. | **Automated Graceful Payment Degradation:**<br>System health-check detects MFS error rate $>15\% \rightarrow$ dynamically disables digital payment radio buttons $\rightarrow$ defaults booking modal to "Cash on Delivery" with a banner: *"MFS networks currently undergoing maintenance. Cash payment active."* |
| **8.4** | **Central Dispatch Server Outage / Crash** | Primary Kubernetes API cluster fails mid-operation. | **Multi-Zone Database State Rehydration:**<br>Active trip records are synchronized in real-time to geo-replicated Redis clusters. Standby region takes over DNS traffic via Cloudflare within 15 seconds. Mobile apps reconnect and rehydrate active trip states from cached `trip_id`. |
| **8.5** | **Driver App Uninstalled / Phone Wiped to Bypass Ban** | Banned driver factory resets phone or changes SIM card to re-register. | **Multi-Factor Fingerprint Persistence:** Device banning combines hardware identifiers (IMEI / Android ID / IDFV), SIM IMSI, National ID (NID) hash, and biometric facial vector hash. Changing the SIM or phone number does not clear the NID or facial vector blacklist. |

---

## 9. Recommendations & Engineering Action Plan

To bring the project to 100% development readiness, the following actions are recommended:

1. **Incorporate Section 1 (Missing Flows)** directly into the supplementary system architecture documentation (specifically Driver Wallet Top-Up and SOS Escalation).
2. **Implement Section 4 (Security Controls)** during Sprint 1 of mobile development (mock location prevention, certificate pinning, and device integrity checks).
3. **Adopt Section 5 (Validation Rules)** directly as the shared validation schema across frontend (React Native / Flutter) and backend (Node.js / Go / PostgreSQL).
4. **Configure Section 7 (Notification Matrix)** into the Firebase Cloud Messaging (FCM) and Twilio/local SMS aggregator queues.

---
*Report compiled and validated for SecureRide Core Engineering Team.*

