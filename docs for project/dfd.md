# Data Flow Diagram (DFD) Specification — SecureRide Platform
**Document Version:** 2.0 (Production Enterprise Architecture Specification — Hardened & Verified)  
**System Name:** SecureRide Intelligent Ride-Sharing Platform  
**Target Architecture:** Layered Modular Monolith (Next.js + Express.js + MongoDB Atlas + Redis)  
**Document Standard:** Gane-Sarson & Yourdon/DeMarco Hybrid Notation  
**Last Updated:** 2026-10-30  
**Status:** Approved Technical Architecture Artifact  

---

## Table of Contents
1. [Executive Summary & DFD Conventions](#1-executive-summary--dfd-conventions)
2. [Context Diagram (Level 0 DFD)](#2-context-diagram-level-0-dfd)
   - [2.1 Context Diagram Narrative](#21-context-diagram-narrative)
   - [2.2 Context Diagram Mermaid Visual](#22-context-diagram-mermaid-visual)
3. [Level 1 Data Flow Diagram](#3-level-1-data-flow-diagram)
   - [3.1 Level 1 System Decomposition](#31-level-1-system-decomposition)
   - [3.2 Level 1 Mermaid Visual](#32-level-1-mermaid-visual)
4. [Level 2 Data Flow Diagrams (Detailed Functional Decomposition)](#4-level-2-data-flow-diagrams-detailed-functional-decomposition)
   - [4.1 Sub-Process 2.0: Driver KYC, Liveness & Vehicle Verification](#41-sub-process-20-driver-kyc-liveness--vehicle-verification)
   - [4.2 Sub-Process 3.0: Fare Quotation, Dynamic Surge & Geospatial Dispatch](#42-sub-process-30-fare-quotation-dynamic-surge--geospatial-dispatch)
   - [4.3 Sub-Process 5.0: Anti-Offline AI & Spatio-Temporal Colocation Engine](#43-sub-process-50-anti-offline-ai--spatio-temporal-colocation-engine)
   - [4.4 Sub-Process 6.0: Payment Settlement, Double-Entry Ledger & Wallet Management](#44-sub-process-60-payment-settlement-double-entry-ledger--wallet-management)
5. [Data Dictionary](#5-data-dictionary)
   - [5.1 External Entity Catalog](#51-external-entity-catalog)
   - [5.2 Data Store Catalog (Composite Schema Data Structures)](#52-data-store-catalog-composite-schema-data-structures)
   - [5.3 Data Element Catalog (Primitive & Structured Attributes)](#53-data-element-catalog-primitive--structured-attributes)
6. [Data Flow Table](#6-data-flow-table)
7. [Process Specification Table](#7-process-specification-table)
8. [Data Store Table](#8-data-store-table)
9. [Complete Draw.io (mxGraph) XML Model](#9-complete-drawio-mxgraph-xml-model)
10. [DFD Architectural Validation & Integrity Report](#10-dfd-architectural-validation--integrity-report)

---

## 1. Executive Summary & DFD Conventions

This document provides the formal **Data Flow Diagram (DFD)** model for **SecureRide**, an enterprise-grade ride-sharing platform designed for emerging urban markets with automated fraud deterrence, biometric onboarding verification, real-time dispatching, and double-entry financial settlement.

### DFD Notation Standards
- **External Entities (Squares/Rectangles with double border):** Autonomous actors or external systems outside the system boundary (e.g., Passenger, Driver, bKash Gateway, AWS Textract).
- **Processes (Rounded Rectangles / Circles):** Transformations that convert input data flows into output data flows (numbered hierarchical notation: $0$ for Context, $1.0 - 9.0$ for Level 1, $X.1 - X.5$ for Level 2).
- **Data Stores (Open-ended Rectangles / Cylinders `D1 - D10`):** Data repositories at rest, mapping directly to MongoDB collections and Redis state layers.
- **Data Flows (Directed Solid Arrows):** Directed transmission of data packets labeled with explicit naming conventions.

### Modeling Principles Adhered To:
1. **Conservation of Data (No Miracles):** A process cannot produce output data without having received the necessary input data.
2. **No Black Holes:** A process cannot absorb inputs without generating an output or updating a data store.
3. **No Gray Holes:** A process cannot produce outputs whose required attributes were not present in the inputs.
4. **No Direct Entity-to-Store Coupling:** External entities never read or write directly to a data store; all interactions must pass through an intermediary process.
5. **No Process Self-Loops:** Inter-process data flows strictly represent data transmission between distinct elements. Internal computational logic and decision rules reside within Process Specifications (P-Specs).
6. **Level Balancing:** All data inputs entering and outputs leaving a parent process correspond exactly across hierarchical levels.

---

## 2. Context Diagram (Level 0 DFD)

### 2.1 Context Diagram Narrative
The Context Diagram establishes the boundary of the **SecureRide Core System (Process 0)**. It captures all high-level inputs flowing from primary actors (Passengers, Drivers, System Administrators) and third-party SaaS services (Mobile Financial Services, SMS Aggregators, Routing Engines, Computer Vision APIs, Weather Providers, Emergency Police Systems, and Transit Insurance Partners), as well as all system outputs dispatched to those external entities.

### 2.2 Context Diagram Mermaid Visual

```mermaid
flowchart TD
    %% External Entities
    E1["Passenger (Commuter)"]
    E2["Driver (Captain)"]
    E3["Platform Admin (Ops / Safety / Super)"]
    E4["MFS Payment Gateways (bKash / Nagad)"]
    E5["SMS Gateway (SSL Wireless / Greenweb)"]
    E6["Map & Geocoding Service (Mapbox / OSRM)"]
    E7["Cloud Media Storage (Cloudflare R2 / S3)"]
    E8["AI Vision Suite (AWS Rekognition & Textract)"]
    E9["Weather API (OpenWeatherMap)"]
    E10["Emergency Dispatch & SIP Proxy (999 / Telecom)"]
    E11["Transit Insurer (Green Delta / Pragati Life)"]

    %% Process 0
    P0(("Process 0:<br/><b>SecureRide Core Platform</b><br/>(Monolith Engine)"))

    %% Passenger Flows
    E1 -->|"1. Registration, Login, Profile & Search Pins"| P0
    E1 -->|"2. Booking Request, Special Notes & Fare Selection"| P0
    E1 -->|"3. Sensor Telemetry (Altitude/Barometer/GPS)"| P0
    E1 -->|"4. In-App Chat, SOS Trigger & Ratings"| P0
    E1 -->|"5. MFS Payment Authorizations & Wallet Top-up"| P0
    P0 -->|"6. Upfront Fares, Vehicle Catalog & ETA"| E1
    P0 -->|"7. Matched Driver HUD, Plate & Masked Call Proxy"| E1
    P0 -->|"8. Itemized Digital Receipt & Change Wallet Credit"| E1
    P0 -->|"9. Live Trip Tracking & Safety Alerts"| E1

    %% Driver Flows
    E2 -->|"10. Driver KYC Docs, Tax Token, License & Live Selfie"| P0
    E2 -->|"11. Continuous GPS Telemetry (3s cadence) & Online State"| P0
    E2 -->|"12. Dispatch Acceptance / Decline (15s timer)"| P0
    E2 -->|"13. Pickup OTP Input, Trip Meter & Cash Confirmations"| P0
    E2 -->|"14. Pro Pass Purchase & Wallet Cash-Out Requests"| P0
    P0 -->|"15. Onboarding Verification Status & Lockout Alerts"| E2
    P0 -->|"16. Radial Ride Offers (Fare, Route, Special Request)"| E2
    P0 -->|"17. Passenger Pickup Coordinates & Masked Call Relay"| E2
    P0 -->|"18. Wallet Ledger, Commission Dues & Net Payouts"| E2

    %% Admin Flows
    E3 -->|"19. KYC Document Audits, Pricing Rules & Ban Overrides"| P0
    E3 -->|"20. SOS Audio Interventions & Dispute Arbitration"| P0
    P0 -->|"21. Document Review Queue, Colocation Fraud Flags"| E3
    P0 -->|"22. Real-Time SOS Incidents, GPS Streams & Audit Logs"| E3

    %% External Services Flows
    P0 -->|"23. OTP SMS, SOS Tracking Links & Notifications"| E5
    E5 -->|"24. SMS Delivery Receipts & Carrier Status"| P0

    P0 -->|"25. Route Distance, Matrix & Geocoding Queries"| E6
    E6 -->|"26. Waypoint Geometries, Optimal ETA & Distances"| P0

    P0 -->|"27. Raw Document Photos, Audio & KYC Media"| E7
    E7 -->|"28. Encrypted Secure Object URIs"| P0

    P0 -->|"29. Selfie & NID Photo Pairs, Document Scans"| E8
    E8 -->|"30. Face Similarity Score (≥90%) & Extracted OCR Text"| P0

    P0 -->|"31. Zone Geohash Coordinates Query"| E9
    E9 -->|"32. Real-time Precipitation / Rain Status"| P0

    P0 -->|"33. MFS Payment Tokenization & Payout Requests"| E4
    E4 -->|"34. Webhook Transaction Status & Settlement Signals"| P0

    P0 -->|"35. Active Trip SOS Webhooks & Masked Audio Session"| E10
    E10 -->|"36. National Emergency Call Bridging & Telephony State"| P0

    P0 -->|"37. Trip Start Policy Enrollment & Claim Submissions"| E11
    E11 -->|"38. Policy Registration IDs & Claim Settlement Status"| P0

    %% Styling
    classDef process fill:#1e293b,stroke:#3b82f6,stroke-width:3px,color:#ffffff,font-weight:bold;
    classDef external fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#f8fafc;
    class P0 process;
    class E1,E2,E3,E4,E5,E6,E7,E8,E9,E10,E11 external;
```

---

## 3. Level 1 Data Flow Diagram

### 3.1 Level 1 System Decomposition
The system is partitioned into nine core functional business processes corresponding to the modular monolith architecture:
- **1.0 User Authentication & Profile Governance:** Manages registration, OTP issuance, password hashing, and account deletion lifecycle.
- **2.0 Driver Onboarding, KYC & Vehicle Verification:** Coordinates biometric liveness detection, OCR extraction, BRTA compliance, and device ban enforcement.
- **3.0 Fare Quotation, Surge Pricing & Dispatch Matchmaking:** Computes upfront pricing, evaluates elevation heuristics, queries Redis geospatial indices, and broadcasts 15s ride offers.
- **4.0 Trip Lifecycle, Telemetry & Metering:** Handles pickup OTP verification (including offline TOTP), turns GPS tracking on, meters mileage, and detects vehicle breakdowns.
- **5.0 Anti-Offline AI & Colocation Monitoring:** Executes 15-minute post-cancellation background tracking, computes Fréchet distance, suppresses public transit falses, and applies sanctions.
- **6.0 Payment Settlement, Digital Wallet & Double-Entry Ledger:** Processes bKash/Nagad transactions, manages driver cash commissions, credits passenger change balances, and validates subscription passes.
- **7.0 Real-Time Communications & Masked Telephony:** Routes WebSocket in-app chats and bridges voice calls through virtual telecom SIP numbers.
- **8.0 Safety Desk, SOS Audio & Incident Escalation:** Controls 3-second abort countdowns, initiates emergency audio capture to Cloudflare R2, dispatches SMS tracking links, and alerts 999.
- **9.0 Loyalty Rewards, Rating & Dispute Arbitration:** Allocates ride points, collects 5-star bilateral feedback, and analyzes GPS detour breadcrumbs for automatic wallet refunds.

### 3.2 Level 1 Mermaid Visual

```mermaid
flowchart TB
    %% External Entities
    subgraph Entities["External Entities"]
        PASS["Passenger"]
        DRV["Driver (Captain)"]
        ADM["Platform Administrator"]
        MFS["MFS Gateway (bKash/Nagad)"]
        SMS["SMS Aggregator"]
        MAP["Map / OSRM API"]
        R2["Cloudflare R2 Storage"]
        AI["AWS Rekognition / Textract"]
        WTH["OpenWeatherMap API"]
        EMG["Emergency 999 / SIP Proxy"]
        INS["Transit Insurer"]
    end

    %% Data Stores
    subgraph Stores["Persistence Layer (MongoDB Atlas & Redis)"]
        D1[("D1: USERS")]
        D2[("D2: DRIVER_PROFILES")]
        D3[("D3: VEHICLES")]
        D4[("D4: TRIPS")]
        D5[("D5: PAYMENTS & LEDGER")]
        D6[("D6: TELEMETRY & GEO_INDEX")]
        D7[("D7: SECURITY & BLACKLISTS")]
        D8[("D8: CHAT & NOTIFICATIONS")]
        D9[("D9: LOYALTY_POINTS")]
        D10[("D10: COMMISSION_PASSES")]
    end

    %% Processes
    subgraph Processes["Core Monolith Domains"]
        P1["1.0<br/>User Authentication & Profile Governance"]
        P2["2.0<br/>Driver Onboarding, KYC & Verification"]
        P3["3.0<br/>Fare Quotation, Surge & Geospatial Dispatch"]
        P4["4.0<br/>Trip Lifecycle, Metering & Offline TOTP"]
        P5["5.0<br/>Anti-Offline AI & Colocation Monitoring"]
        P6["6.0<br/>Payment Settlement, Wallet & Ledger"]
        P7["7.0<br/>Real-Time Communication & Masked Telephony"]
        P8["8.0<br/>Safety Desk, SOS Audio & Escalation"]
        P9["9.0<br/>Loyalty, Rating & Route Detour Arbitration"]
    end

    %% Process 1.0 Flows
    PASS -->|"Phone, Password, Register Details"| P1
    DRV -->|"Contact Number, Password"| P1
    P1 -->|"SMS OTP Request"| SMS
    SMS -->|"OTP Delivery Signal"| P1
    P1 <-->|"Read/Write User Accounts & Deletion Status"| D1
    P1 <-->|"Verify Device & NID Blacklist"| D7
    P1 -->|"JWT Session Tokens & Profile"| PASS
    P1 -->|"JWT Session Tokens & Dashboard"| DRV

    %% Process 2.0 Flows
    DRV -->|"NID, License, Vehicle Papers, Live Selfie"| P2
    P2 -->|"Raw Docs & Selfie Media"| R2
    R2 -->|"Secured Media URLs"| P2
    P2 -->|"Selfie & NID Face Image"| AI
    AI -->|"Face Match Score & OCR Text"| P2
    P2 <-->|"Create / Update User Records"| D1
    P2 <-->|"Write / Update Driver KYC Data"| D2
    P2 <-->|"Write / Update Vehicle Specs & Tax Token"| D3
    P2 <-->|"Log Failed Verification & Blacklist Fingerprint"| D7
    P2 -->|"KYC Review Package"| ADM
    ADM -->|"Approval / Rejection Decision"| P2
    P2 -->|"Account Verification Result & Cooldown Timer"| DRV

    %% Process 3.0 Flows
    PASS -->|"Pickup/Drop Pins, Vehicle Type, Special Note"| P3
    PASS -->|"Sensor Stream (Altitude & Barometer)"| P3
    P3 -->|"Route Distance & Duration Query"| MAP
    MAP -->|"Optimal Route Matrix & Geometry"| P3
    P3 -->|"Zone Weather Query"| WTH
    WTH -->|"Rain Status (Floor 1.2x)"| P3
    P3 <-->|"Fetch Online Driver Locations (GEOADD / GEORADIUS)"| D6
    P3 <-->|"Check Approved Vehicles & Tax Token Validity"| D3
    P3 <-->|"Check 7-day Cancellation Deprioritization"| D2
    P3 <-->|"Read Active Surge Multipliers & Config"| D4
    P3 -->|"15s Radial Ride Offer"| DRV
    DRV -->|"Offer Accept / Decline"| P3
    P3 <-->|"Set Redlock Mutex & Create Trip Record"| D4
    P3 -->|"Trip Confirmation, Upfront Fare & Driver HUD"| PASS

    %% Process 4.0 Flows
    DRV -->|"Continuous GPS Telemetry (3s)"| P4
    P4 -->|"Update Real-time Driver Positions"| D6
    PASS -->|"4-Digit Pickup OTP"| DRV
    DRV -->|"Submit Pickup OTP"| P4
    P4 <-->|"Verify OTP Hash / Cryptographic Offline Seed"| D4
    P4 -->|"Trip Start Event & Policy Enrollment"| INS
    INS -->|"Insurance Policy ID"| P4
    P4 <-->|"Log Trip Breadcrumbs (10s intervals)"| D4
    DRV -->|"Mid-Trip Breakdown / Destination Update"| P4
    P4 -->|"Prorated Fare & Rescue Dispatch Signal"| P3
    DRV -->|"Arrived at Destination Meter Stop"| P4
    P4 <-->|"Set Status = Completed"| D4

    %% Process 5.0 Flows
    D4 -->|"Trip Cancelled Event"| P5
    PASS -.->|"15-min Post-Cancel Telemetry"| P5
    DRV -.->|"15-min Post-Cancel Telemetry"| P5
    P5 <-->|"Read/Write Post-Cancellation Sensor Data"| D6
    P5 <-->|"Log Violations & Escalation Ladder"| D2
    P5 <-->|"Add Device / NID to Permanent Blacklist"| D7
    P5 -->|"Urgent Warning & Insurance Deactivation Alert"| PASS
    P5 -->|"Disciplinary Sanction Notification"| DRV
    P5 -->|"Collusion Audit Alert"| ADM

    %% Process 6.0 Flows
    PASS -->|"bKash / Nagad Checkout Authorization"| P6
    P6 -->|"Initialize Payment / Query Status"| MFS
    MFS -->|"Payment Webhook Confirmation"| P6
    DRV -->|"Confirm Cash Received & Shortage Amount"| P6
    DRV -->|"Purchase Pro-Captain Pass / Cash-Out Request"| P6
    P6 <-->|"Check Active Pass Status"| D10
    P6 <-->|"Deduct Commission / Deduct Wallet Debt"| D2
    P6 <-->|"Credit Shortage Balance to Passenger Wallet"| D1
    P6 <-->|"Immutable Double-Entry Ledger Posting"| D5
    P6 -->|"Itemized Payment Receipt"| PASS
    P6 -->|"Cash Settlement & Balance Update"| DRV

    %% Process 7.0 Flows
    PASS <-->|"Real-Time Live Chat Messages"| P7
    DRV <-->|"Real-Time Live Chat Messages"| P7
    P7 <-->|"Persist Messages with 7-Day TTL"| D8
    PASS -->|"Masked Call Initiation"| P7
    DRV -->|"Masked Call Initiation"| P7
    P7 <-->|"Bridge Masked Virtual Voice Call"| EMG

    %% Process 8.0 Flows
    PASS -->|"Press SOS Button (3s Abort Countdown)"| P8
    DRV -->|"Press SOS Button (3s Abort Countdown)"| P8
    P8 -->|"Upload Ambient Audio (30m max)"| R2
    P8 <-->|"Log SOS Audit Trail"| D7
    P8 -->|"Dispatch SMS Live Web-Tracking Link"| SMS
    P8 -->|"Trigger High-Priority Incident Webhook & Siren"| ADM
    P8 -->|"Auto-Dial National Emergency Police"| EMG

    %% Process 9.0 Flows
    D4 -->|"Trip Completed Event"| P9
    P9 <-->|"Award 1 Point / ৳10 Digital Spend"| D9
    PASS -->|"Submit 5-Star Rating & Review Tags"| P9
    DRV -->|"Submit 5-Star Rating & Review Tags"| P9
    P9 <-->|"Update Aggregate Rating Scores"| D1
    P9 <-->|"Update Aggregate Rating Scores"| D2
    PASS -->|"Submit Unreasonable Detour Report"| P9
    P9 <-->|"Fetch Trip Breadcrumbs & Recompute OSRM Path"| D4
    P9 -->|"Credit Detour Refund"| P6

    %% Styling
    classDef proc fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef store fill:#172554,stroke:#60a5fa,stroke-width:2px,color:#93c5fd;
    classDef ent fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#f8fafc;
    class P1,P2,P3,P4,P5,P6,P7,P8,P9 proc;
    class D1,D2,D3,D4,D5,D6,D7,D8,D9,D10 store;
    class PASS,DRV,ADM,MFS,SMS,MAP,R2,AI,WTH,EMG,INS ent;
```

---

## 4. Level 2 Data Flow Diagrams (Detailed Functional Decomposition)

> [!NOTE]
> **Architectural Principle: Selective Functional Leveling**  
> In accordance with structured analysis standards, Level 2 functional decomposition is applied specifically to the four highest-complexity, revenue-critical, and safety-sensitive subsystems:
> - **Sub-Process 2.0:** Driver KYC, Liveness & Vehicle Verification
> - **Sub-Process 3.0:** Fare Quotation, Surge & Geospatial Dispatch
> - **Sub-Process 5.0:** Anti-Offline AI & Colocation Monitoring
> - **Sub-Process 6.0:** Payment Settlement, Wallet & Double-Entry Ledger  
> Processes 1.0, 4.0, 7.0, 8.0, and 9.0 operate as single-transformation functional primitives fully defined at Level 1 and documented in the Process Specification Table.

---

### 4.1 Sub-Process 2.0: Driver KYC, Liveness & Vehicle Verification
This sub-process decomposes the driver onboarding verification pipeline, detailing the two-step vetting gateway, on-device liveness challenge evaluation, AWS Textract OCR extraction, license-vehicle cross-matching, and the 3-strike device ban penalty ladder.

```mermaid
flowchart TD
    DRV["Driver (Applicant)"]
    ADM["Operations Admin"]
    R2["Cloudflare R2 Bucket"]
    AI_REKOG["AWS Rekognition CompareFaces"]
    AI_OCR["AWS Textract OCR"]
    
    D1[("D1: USERS")]
    D2[("D2: DRIVER_PROFILES")]
    D3[("D3: VEHICLES")]
    D7[("D7: SECURITY & BLACKLISTS")]

    P21["2.1<br/>Capture & Verify Mobile OTP & Device Fingerprint"]
    P22["2.2<br/>On-Device Biometric Liveness & Server Face Match"]
    P23["2.3<br/>Document Upload & AWS Textract OCR Extraction"]
    P24["2.4<br/>License Category vs Vehicle Class Cross-Match"]
    P25["2.5<br/>Admin Review Queue & 3-Strike Blacklist Engine"]

    %% Flow connections
    DRV -->|"Step 1: Contact No, Payout Accounts (bKash & Nagad)"| P21
    P21 <-->|"Check Device Fingerprint & NID Blacklist"| D7
    P21 <-->|"Create Driver User Record (role = 'driver')"| D1
    P21 -->|"Initiate Driver KYC Verification Session"| P22

    DRV -->|"Step 2: Live Video Challenge (Blink/Head Turn) + Smart NID Photo"| P22
    P22 -->|"Store Encrypted Selfie & NID Scans"| R2
    R2 -->|"Return Pre-signed Media URIs"| P22
    P22 -->|"Submit Pair: Live Selfie + NID Photo"| AI_REKOG
    AI_REKOG -->|"Similarity Score (Threshold ≥ 90%)"| P22
    P22 <-->|"Update Biometric Facial Vector Hash"| D2
    P22 -->|"Verified Biometric Profile Package"| P24

    DRV -->|"Step 3: Upload Driving License, BRTA Plate Doc & Tax Token"| P23
    P23 -->|"Send Image Buffer to Textract"| AI_OCR
    AI_OCR -->|"Extracted Metadata: License Class, Expiry, Plate No"| P23
    P23 -->|"Parsed License Category & Tax Token Expiry (≥ 15d)"| P24

    P24 -->|"Cross-Match Result: Match / Mismatch"| P25

    P25 <-->|"Enforce Attempt Limit (Max 3 Chances)"| D2
    P25 -->|"Enforce 1-Hour Cooldown or Blacklist Device & NID"| D7
    P25 -->|"Push Pre-populated Review Package"| ADM
    ADM -->|"Approve / Reject Action"| P25
    P25 <-->|"Set is_approved = true, active_vehicle_id"| D2
    P25 <-->|"Register Vehicle Record"| D3
    P25 -->|"Notification: Account Activated or Cooldown Notice"| DRV

    classDef proc fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef store fill:#172554,stroke:#60a5fa,stroke-width:2px,color:#93c5fd;
    classDef ent fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#f8fafc;
    class P21,P22,P23,P24,P25 proc;
    class D1,D2,D3,D7 store;
    class DRV,ADM,R2,AI_REKOG,AI_OCR ent;
```

---

### 4.2 Sub-Process 3.0: Fare Quotation, Dynamic Surge & Geospatial Dispatch
This sub-process decomposes the dispatch matchmaking engine, showing how passenger route inputs, live weather data, flyover elevation heuristics, and Redis geospatial distributed locks determine driver matching within 1.5 seconds.

```mermaid
flowchart TD
    PASS["Passenger"]
    DRV["Candidate Drivers"]
    MAP["Mapbox / OSRM Routing Engine"]
    WTH["OpenWeatherMap API"]

    D2[("D2: DRIVER_PROFILES")]
    D3[("D3: VEHICLES")]
    D4[("D4: TRIPS")]
    D6[("D6: REDIS GEO & SENSOR INDEX")]

    P31["3.1<br/>Route Computation & Base Fare Estimation"]
    P32["3.2<br/>Dynamic Surge Multiplier Calculation (5m cron)"]
    P33["3.3<br/>Flyover Elevation & Vector Heading Heuristic"]
    P34["3.4<br/>Radial Geospatial Discovery & Candidate Sorting"]
    P35["3.5<br/>Redis Redlock Mutual Exclusion & Offer Broadcast"]

    %% Flow connections
    PASS -->|"Pickup Pin & Destination Coordinates"| P31
    P31 -->|"Query Route Distance & Traffic Duration"| MAP
    MAP -->|"Optimal Road Path Geometry, Distance (km), Duration (min)"| P31
    P31 -->|"Unsurged Fare & Route Geometry"| P32

    WTH -->|"Precipitation Data (Every 10 mins per Zone)"| P32
    D6 -->|"Active Requests vs Online Drivers Count"| P32
    P32 -->|"Locked Upfront Fare Quote"| PASS
    P32 -->|"Surged Upfront Fare Parameter"| P34

    PASS -->|"Continuous Altitude & Barometer Telemetry"| P33
    D6 -->|"Driver Real-Time Altitude & Speed Vector"| P33
    P33 -->|"Vertical Tier Filter (Flyover Separation > 10m Separation Score)"| P34

    P34 <-->|"GEORADIUS Query: 1km (0-15s) → 2.5km (15-35s) → 4km (35-60s)"| D6
    P34 <-->|"Filter: Approved Vehicles Only (Tax Token ≥ 15d)"| D3
    P34 <-->|"Filter: Exclude 24h Deprioritized Drivers (Cancel Rate > 15%)"| D2
    P34 -->|"Sorted Candidate Driver Queue (Shortest Road ETA First)"| P35

    P35 <-->|"Acquire Distributed Mutex: SET lock:driver:{id} NX EX 15"| D6
    P35 -->|"Socket.io Emit 'dispatch:ride_offer' (15s Timer)"| DRV
    DRV -->|"Decision: Accept or Decline"| P35
    P35 -- "Decline / 15s Timeout" -->|"Release Lock: DEL lock:driver:{id} & Advance to Next Driver"| D6
    P35 -- "Accept" -->|"Create Active Trip Document & Lock Fare"| D4
    P35 -->|"Socket.io Emit 'driver:matched' (Driver Info, Vehicle Plate)"| PASS

    classDef proc fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef store fill:#172554,stroke:#60a5fa,stroke-width:2px,color:#93c5fd;
    classDef ent fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#f8fafc;
    class P31,P32,P33,P34,P35 proc;
    class D2,D3,D4,D6 store;
    class PASS,DRV,MAP,WTH ent;
```

---

### 4.3 Sub-Process 5.0: Anti-Offline AI & Spatio-Temporal Colocation Engine
This sub-process details the fraud prevention engine that protects platform revenue and passenger safety by analyzing background GPS/sensor data for 15 minutes post-cancellation.

```mermaid
flowchart TD
    PASS["Passenger Device"]
    DRV["Driver Device"]
    ADM["Trust & Safety Admin"]

    D2[("D2: DRIVER_PROFILES")]
    D4[("D4: TRIPS")]
    D6[("D6: TELEMETRY_LOGS (Redis/Atlas)")]
    D7[("D7: SECURITY & BLACKLISTS")]

    P51["5.1<br/>Post-Cancellation Telemetry Daemon Initiator"]
    P52["5.2<br/>Spatio-Temporal Fréchet Trajectory Evaluator"]
    P53["5.3<br/>Kinematic Covariance & Sensor Fusion Engine"]
    P54["5.4<br/>Public Transit Footprint & Metro Rail Mask"]
    P55["5.5<br/>Disciplinary Penalty Ladder & Blacklist Enforcer"]

    %% Flow connections
    D4 -->|"Trip Cancelled Mid-Route or Post-Arrival Signal"| P51
    P51 -->|"Trigger 15-Minute Background Tracking Daemon"| PASS
    P51 -->|"Trigger 15-Minute Background Tracking Daemon"| DRV
    PASS -->|"Background GPS & Accelerometer Stream"| P51
    DRV -->|"Background GPS & Accelerometer Stream"| P51
    P51 -->|"Buffer Telemetry in Redis with 15m Window"| D6

    D6 -->|"Retrieve Co-located Coordinate Series"| P52
    P52 -->|"Fréchet Distance Result (Δd < 50m & Correlation > 85%)"| P53

    P53 -->|"Kinematic Motion Signature & Dwell Profiles"| P54

    P54 -- "Multi-Commuter Density > 5 & Matches Metro/Bus" -->|"Legitimate Public Transit: Auto-Purge Telemetry (48h TTL)"| D6
    P54 -- "Private Vehicle Pattern Confirmed" -->|"Collusion Detected Signal"| P55

    P55 -->|"Revoke Active Transit Insurance & SOS Coverage Alert"| PASS
    P55 -->|"Push Offline Violation Warning Alert"| DRV
    P55 <-->|"Advance Driver Penalty Ladder: 1st=Warn → 2nd=7d Suspend → 3rd=Ban"| D2
    P55 <-->|"Permanent Hardware Fingerprint & NID Blacklist Posting"| D7
    P55 -->|"Escalate Incident to Fraud Analyst Incident Desk"| ADM

    classDef proc fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef store fill:#172554,stroke:#60a5fa,stroke-width:2px,color:#93c5fd;
    classDef ent fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#f8fafc;
    class P51,P52,P53,P54,P55 proc;
    class D2,D4,D6,D7 store;
    class PASS,DRV,ADM ent;
```

---

### 4.4 Sub-Process 6.0: Payment Settlement, Double-Entry Ledger & Wallet Management
This sub-process decomposes financial clearing, driver cash commission recovery, pro-captain subscription pass evaluation, and passenger cash shortage wallet credits.

```mermaid
flowchart TD
    PASS["Passenger"]
    DRV["Driver (Captain)"]
    MFS["bKash / Nagad API Gateway"]

    D1[("D1: USERS (Passenger Wallet)")]
    D2[("D2: DRIVER_PROFILES (Driver Wallet)")]
    D4[("D4: TRIPS")]
    D5[("D5: PAYMENTS & LEDGER")]
    D10[("D10: COMMISSION_PASSES")]

    P61["6.1<br/>Digital Payment Checkout & Two-Phase Reconciliation"]
    P62["6.2<br/>Pro-Captain Pass Validation & Commission Waiver"]
    P63["6.3<br/>Cash Commission Deduction & Debt Limit Enforcer"]
    P64["6.4<br/>Cash Change Shortage Crediting Engine"]
    P65["6.5<br/>Double-Entry Ledger Posting & Instant Cash-Out"]

    %% Flow connections
    PASS -->|"Select Payment: bKash / Nagad Tokenized Checkout"| P61
    P61 -->|"Direct MFS Debit Request"| MFS
    MFS -->|"Webhook Authorization Payload (HMAC Signature)"| P61
    P61 <-->|"Reconcile Pending Status via BullMQ Worker (2m Polling)"| D5

    D4 -->|"Trip Completed Event (Gross Fare, Payment Rail)"| P62
    P62 <-->|"Check Valid Pass: Daily (৳99) or Weekly (৳599)"| D10
    P62 -- "Active Pass Valid" -->|"Set Commission Rate = 0%"| P63
    P62 -- "No Active Pass" -->|"Set Platform Commission = 10%–12%"| P63

    DRV -->|"Confirm 100% Physical Cash Collected from Passenger"| P63
    P63 <-->|"Deduct Commission from Driver Balance"| D2
    P63 -->|"Check Balance Threshold: If < -৳500 → Suspend Cash Rides"| D2

    DRV -->|"Input Actual Physical Cash Given (e.g. ৳500 for ৳460 Fare)"| P64
    P64 <-->|"Credit Remaining Change (৳40) to passenger_wallet_balance"| D1
    P64 -->|"Instant Notification: Change Stored in Wallet"| PASS

    P61 -->|"Post Digital Settlement Transaction"| P65
    P63 -->|"Post Commission Debit Entry"| P65
    P64 -->|"Post Change Shortage Ledger Entry"| P65
    P65 <-->|"Append-Only Immutable Ledger Audit Record"| D5
    
    DRV -->|"Tap 'Cash-Out' (Withdraw Net Earnings to bKash/Nagad)"| P65
    P65 -->|"Initiate Instant B2C MFS Disbursement"| MFS
    MFS -->|"Disbursement Success Receipt"| P65
    P65 <-->|"Update Driver Current Balance"| D2

    classDef proc fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef store fill:#172554,stroke:#60a5fa,stroke-width:2px,color:#93c5fd;
    classDef ent fill:#0f172a,stroke:#64748b,stroke-width:2px,color:#f8fafc;
    class P61,P62,P63,P64,P65 proc;
    class D1,D2,D4,D5,D10 store;
    class PASS,DRV,MFS ent;
```

---

## 5. Data Dictionary

The Data Dictionary defines every external entity, composite data store, and primitive data element within the SecureRide ecosystem.

### 5.1 External Entity Catalog

| Entity Identifier | Entity Name | Description | Key Inflowing Data | Key Outflowing Data |
|:---|:---|:---|:---|:---|
| **E1** | **Passenger** | Urban commuter booking and experiencing rides. | Upfront fares, driver details, live tracking, receipts, wallet credits. | Phone, password, GPS pins, payment method, special requests, SOS, ratings. |
| **E2** | **Driver (Captain)** | Verified operator providing rides with authorized vehicles. | Incoming ride offers (15s), navigation, earnings, lockout notices. | KYC documents, vehicle papers, liveness selfie, 3s GPS telemetry, cash confirmations. |
| **E3** | **Platform Admin** | Platform operations, trust & safety, and financial supervisors. | Document verification queue, SOS sirens, audio feeds, fraud flags. | KYC approvals/rejections, ban overrides, zone pricing configurations, police escalations. |
| **E4** | **MFS Payment Gateways** | Mobile financial infrastructure (bKash & Nagad APIs). | Checkout initialization, refund queries, B2C cash-out requests. | Transaction webhook callbacks, payment tokens, settlement confirmations. |
| **E5** | **SMS Gateway** | Telecommunications SMS aggregators (SSL Wireless / Greenweb). | SMS OTP payloads, emergency SOS web links, account alerts. | Carrier delivery receipts, message transit timestamps, failure codes. |
| **E6** | **Map & Routing Service** | Spatial and geocoding engines (Mapbox Directions, Google Places, OSRM). | Origin/destination coordinates, waypoint arrays, geocoding queries. | Road route geometries, distance matrices, polyline vectors, duration estimates. |
| **E7** | **Cloud Media Storage** | S3-compatible encrypted blob store (Cloudflare R2). | Raw driver KYC document scans, vehicle photos, 30m emergency audio blobs. | Pre-signed secure object access URIs, CDN asset endpoints. |
| **E8** | **AI Vision Suite** | Automated facial recognition and OCR service (AWS Rekognition & Textract). | Live selfie + NID photo pairs, document bitmap image buffers. | Facial vector similarity percentages, structured OCR text fields with confidence scores. |
| **E9** | **Weather API** | Meteorological telemetry service (OpenWeatherMap). | Zone geohash spatial coordinates. | Precipitation indicators, rain volume, thunderstorm condition flags. |
| **E10** | **Emergency Dispatch & SIP** | Virtual telephony proxy and National Police emergency call center (999). | Masked call bridge commands, active SOS incident metadata with live tracking link. | Virtual session IDs, call audio connection states, emergency response acknowledgments. |
| **E11** | **Transit Insurer** | Underwriting partner providing accidental transit coverage (Green Delta / Pragati). | Trip commencement events, passenger/driver IDs, incident claim bundles. | Policy registration numbers, underwriting confirmations, claim resolution status. |

---

### 5.2 Data Store Catalog (Composite Schema Data Structures)

#### D1: USERS (Passenger & Core User Profiles)
```
USERS = @user_id + phone_number + email + password_hash + role + [admin_sub_role] 
        + 1{emergency_contact}3 + rating_avg + language_preference 
        + passenger_wallet_balance + deletion_status + [scheduled_deletion_at] + created_at
```

#### D2: DRIVER_PROFILES (Driver Verification, Compliance & Wallet Ledger)
```
DRIVER_PROFILES = @driver_profile_id + user_id* + nid_number + license_number 
                  + license_category + verification_status + failed_verification_attempts 
                  + [lockout_until] + bkash_payout_number + nagad_payout_number 
                  + current_wallet_balance + active_vehicle_id* + commission_pass_active 
                  + [commission_pass_expiry] + cancellation_count_7d + total_offers_7d 
                  + [deprioritized_until] + vehicle_mismatch_count + [offline_collusion_strikes] 
                  + [suspended_until] + is_permanently_banned
```

#### D3: VEHICLES (Authorized Vehicle Fleet Registry)
```
VEHICLES = @vehicle_id + driver_id* + brta_plate_number + tax_token_number 
           + tax_token_expiry + vehicle_class + brand + color 
           + front_photo_url + rear_photo_url + is_approved
```

#### D4: TRIPS (Ride Contract, Route Telemetry & Lifecycle)
```
TRIPS = @trip_id + trip_code + passenger_id* + driver_id* + vehicle_id* 
        + pickup_geo + dropoff_geo + status + upfront_fare + payment_method 
        + [special_request] + pickup_otp_hash + [rescue_ride] 
        + 0{route_breadcrumbs}n + [cancellation_metadata] + 0{sos_events}n + [insurance_policy_id] 
        + [passenger_rating] + [driver_rating] + started_at + [completed_at]
```

#### D5: PAYMENTS & FINANCIAL LEDGER (Double-Entry Financial Store)
```
PAYMENTS = @payment_id + trip_id* + user_id* + payment_method + amount 
           + status + external_transaction_id + [mfs_callback_payload] + settled_at

WALLET_TRANSACTIONS = @trx_id + driver_id* + [trip_id*] + entry_type + transaction_type 
                      + amount + balance_before + balance_after + status + [external_trx_id] + created_at

PASSENGER_WALLET_TRANSACTIONS = @p_trx_id + user_id* + trip_id* + transaction_type 
                                + amount + balance_after + created_at
```

#### D6: TELEMETRY & REAL-TIME GEO INDEX (Spatial Sensor & Position Store)
```
REDIS_GEO = driver_id* + longitude + latitude + heading + speed + timestamp (TTL 10s)

TELEMETRY_LOGS = @telemetry_id + trip_id* + user_role + location_geo + speed 
                 + heading + accelerometer_magnitude + [altitude_m] 
                 + [barometer_hpa] + timestamp + expires_at (TTL 48h)
```

#### D7: SECURITY, BLACKLISTS & AUDIT LOGS
```
DEVICE_BLACKLISTS = @blacklist_id + imei_hash + android_id + nid_hash + license_hash 
                    + facial_vector_hash + integrity_verdict + ban_type + ban_reason + created_at

NID_BLACKLIST = @nid_blacklist_id + nid_hash + license_hash + facial_vector_hash + ban_reason + created_at

SOS_AUDIT_LOGS = @audit_id + trip_id* + admin_id* + action + [audio_recording_url] + accessed_at
```

#### D8: CHAT & NOTIFICATIONS
```
CHAT_MESSAGES = @message_id + trip_id* + sender_id* + sender_role + message_text 
                + sent_at + expires_at (TTL 7d)
```

#### D9: LOYALTY & REWARDS
```
LOYALTY_POINTS = @loyalty_id + passenger_id* + points_balance + last_earned_at + expires_after (12m)
LOYALTY_TRANSACTIONS = @loyalty_trx_id + passenger_id* + trip_id* + type + points_delta + created_at
```

#### D10: COMMISSION_PASSES (Subscription Passes)
```
COMMISSION_PASSES = @pass_id + driver_id* + pass_type + activated_at + expires_at + purchase_transaction_id
```

---

### 5.3 Data Element Catalog (Primitive & Structured Attributes)

| Element Name | Data Type | Permissible Values / Formatting Regex | Business Rules & Constraints |
|:---|:---|:---|:---|
| `phone_number` | String | `^(?:\+8801\|01)[3-9]\d{8}$` | Primary unique mobile identifier across Bangladesh carriers. |
| `password_hash` | String | Argon2id Hash String ($64\text{ chars}$) | Memory-hard cryptographic password digest. |
| `role` | String (Enum) | `['passenger', 'driver', 'admin']` | Top-level role boundary for platform security guards. |
| `admin_sub_role` | String (Enum) | `['ops', 'safety', 'super', null]` | Internal administrative permission partitioning. |
| `nid_number` | String | `^\d{10}$ \| ^\d{17}$` | Smart NID card registration number. |
| `license_category` | String (Enum) | `['motorcycle', 'light_vehicle']` | Extracted by OCR; must match vehicle class. |
| `brta_plate_number` | String | `^(Dhaka\|Chatto\|Sylhet\|Raj\|Khulna\|Bari\|Rang)\sMetro-[A-Z]{1,2}\s\d{2}-\d{4}$` | Formal metropolitan registration standard. |
| `tax_token_expiry` | Date | `YYYY-MM-DD` | Must be $\ge \text{Today} + 15\text{ days}$ to remain online. |
| `verification_status`| String (Enum) | `['pending', 'approved', 'rejected']` | Zero-access gate flag before dispatch eligibility. |
| `facial_vector_hash` | String | SHA-256 Hex Digest ($64\text{ chars}$) | Biometric face embedding hash stored for 3-strike device bans. |
| `pickup_geo` | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }` | 2dsphere index coordinate within Bangladesh bounding box. |
| `upfront_fare` | Decimal | Monetary (BDT $\ge 40.00$) | Fare dynamically locked prior to booking broadcast. |
| `surge_multiplier` | Float | `1.0` to `1.5` | Dynamic multiplier (Microbus max 1.3x, Bike max 1.4x, Car max 1.5x, Rain floor 1.2x). |
| `pickup_otp_hash` | String | Argon2id / SHA-256 Hash | Hashed 4-digit pickup code or offline TOTP cryptographic signature. |
| `status` (Trip) | String (Enum) | `['requested', 'matched', 'arrived', 'in_progress', 'completed', 'canceled', 'interrupted']` | State transition machine invariant. |
| `route_breadcrumbs` | Array | `[{ lat: Float, lng: Float, timestamp: Date }]` | Telemetry points sampled every 10 seconds for detour audit. |
| `passenger_wallet_balance` | Decimal | BDT $\ge 0.00$ | Passenger in-app credit for change shortage & refunds. |
| `current_wallet_balance` | Decimal | BDT $\ge -500.00$ | Driver balance; restricted from cash rides if $< -৳500$. |
| `cancellation_count_7d` | Integer | $\ge 0$ | Rolling 7-day driver cancellations; $>15\%$ triggers deprioritization. |
| `offline_collusion_strikes` | Integer | $\ge 0$ | Cumulative offline ride violation counter (Warning -> 7d deprioritize -> Ban). |
| `altitude_m` | Float | Meters above sea level | Barometric/GNSS altitude for flyover vertical tier separation. |

---

## 6. Data Flow Table

| Flow ID | Context Ref (Level 0 #) | Source Process / Entity | Destination Process / Entity | Data Packet Transferred | Business Description & Trigger Condition |
|:---|:---:|:---|:---|:---|:---|
| **DF01** | #1 | Passenger (E1) | 1.0 Auth & Profile | Phone, Password, Reg Profile | Account registration or direct login attempt. |
| **DF02** | #23 | 1.0 Auth & Profile | SMS Gateway (E5) | Phone Number, 6-digit OTP | Dispatched on new registration or password reset (TTL: 120s). |
| **DF03** | #1 | 1.0 Auth & Profile | USERS (D1) | Sanitized User Document | Account persistence, profile update, or deletion timestamp. |
| **DF04** | #10 | Driver (E2) | 2.0 KYC & Onboarding | NID, License, Tax Token, Live Selfie | Driver initial onboarding submission package. |
| **DF05** | #29, #30 | 2.0 KYC & Onboarding | AI Vision Suite (E8) | Live Selfie, NID Scans, Tax Token | Face similarity comparison ($\ge 90\%$) and OCR text parsing. |
| **DF06** | #15, #19 | 2.0 KYC & Onboarding | DRIVER_PROFILES (D2) | KYC Review Status, Vehicle Mappings | Driver record update (Pending, Approved, or Cooldown Lock). |
| **DF07** | #19 | 2.0 KYC & Onboarding | SECURITY & BLACKLISTS (D7)| Fingerprint (IMEI/Android ID, NID, Face) | 3-strike ban execution or vehicle mismatch penalty logging. |
| **DF08** | #2 | Passenger (E1) | 3.0 Fare & Dispatch | Pickup/Drop Coordinates, Vehicle Class | Ride quotation request and booking confirmation. |
| **DF09** | #3 | Passenger (E1) | 3.0 Fare & Dispatch | Altitude, Barometer Telemetry | Emitted every 5s during search for flyover elevation filtering. |
| **DF10** | #25, #26 | 3.0 Fare & Dispatch | Map & Routing (E6) | Waypoints Coordinates Array | Road route geometry, distance, and duration calculation. |
| **DF11** | #31, #32 | Weather API (E9) | 3.0 Fare & Dispatch | Zone Precipitation Indicator | Rain condition detection enforcing 1.2x surge floor. |
| **DF12** | #16 | 3.0 Fare & Dispatch | Driver (E2) | Ride Offer Card (Fare, Route, Note) | Broadcast to candidate drivers with 15s acceptance timer. |
| **DF13** | #12 | Driver (E2) | 3.0 Fare & Dispatch | Accept / Decline Response | Driver dispatch decision; triggers Redis Redlock mutex. |
| **DF14** | #6, #7 | 3.0 Fare & Dispatch | TRIPS (D4) | Active Trip Entity | Trip creation with locked upfront fare and status = 'matched'. |
| **DF15** | #13 | Driver (E2) | 4.0 Trip Lifecycle | 4-Digit Pickup OTP | Delivered by passenger; verifies physical pickup before meter start. |
| **DF16** | #37, #38 | 4.0 Trip Lifecycle | Transit Insurer (E11) | Trip ID, Commuter Metadata | Instant per-trip transit insurance policy enrollment. |
| **DF17** | #11 | Driver (E2) | 4.0 Trip Lifecycle | Continuous GNSS Telemetry | Sent every 3s to update driver positions in Redis GEO index. |
| **DF18** | #9 | 4.0 Trip Lifecycle | TRIPS (D4) | Breadcrumb Waypoints | 10s sampled coordinate breadcrumbs for detour arbitration. |
| **DF19** | #9 | TRIPS (D4) | 5.0 Anti-Offline AI | Trip Cancelled Event | Trigger for 15-minute post-cancellation background monitoring. |
| **DF20** | #3, #11 | Passenger & Driver | 5.0 Anti-Offline AI | Post-Cancel GPS & Accelerometer | Background telemetry streams collected for colocation audit. |
| **DF21** | #18, #21 | 5.0 Anti-Offline AI | DRIVER_PROFILES (D2) | Fraud Violation Flag | Penalty ladder increment (Warning $\rightarrow$ 7d Suspend $\rightarrow$ Permanent Ban). |
| **DF22** | #5 | Passenger (E1) | 6.0 Payment & Ledger | bKash / Nagad Payment Tokens | Digital checkout authorization via MFS API redirect. |
| **DF23** | #33, #34 | MFS Gateway (E4) | 6.0 Payment & Ledger | Webhook HMAC Payment Receipt | Asynchronous payment status signal (Settled / Failed). |
| **DF24** | #13 | Driver (E2) | 6.0 Payment & Ledger | Physical Cash Received Total | Driver confirmation of cash fare; calculates shortage credit. |
| **DF25** | #8 | 6.0 Payment & Ledger | USERS (D1) | Wallet Shortage Credit Delta | Credits excess cash to passenger wallet for future deductions. |
| **DF26** | #18 | 6.0 Payment & Ledger | DRIVER_PROFILES (D2) | Commission Debit Delta | Auto-deducts 10%–12% fee from driver digital wallet. |
| **DF27** | #18 | 6.0 Payment & Ledger | PAYMENTS & LEDGER (D5) | Double-Entry Audit Ledger Records | Immutable financial posting ensuring zero ledger discrepancies. |
| **DF28** | #4 | Passenger & Driver | 7.0 Real-Time Chat | Chat Message Text Strings | Real-time WebSocket messages persisted with 7-day TTL. |
| **DF29** | #4 | Passenger / Driver | 8.0 Safety & SOS | SOS Panic Button Press | Activates 3s abort timer and begins 30m audio capture. |
| **DF30** | #27, #28 | 8.0 Safety & SOS | Cloudflare R2 (E7) | Encrypted AAC Audio Stream | Saved to secure bucket for 90 days for safety evidence. |
| **DF31** | #23 | 8.0 Safety & SOS | SMS Gateway (E5) | Emergency Tracking Web Link | Sent to 3 emergency contacts with single-use 2h JWT token. |
| **DF32** | #22 | 8.0 Safety & SOS | Admin Safety Desk (E3) | High-Priority Audible Alert | Incident room push with live GPS, caller unmasking, and 999 link. |
| **DF33** | #8 | TRIPS (D4) | 9.0 Loyalty & Detour | Trip Completed Event | Triggers loyalty point calculation (1 pt per ৳10 digital spend). |
| **DF34** | #4 | Passenger (E1) | 9.0 Loyalty & Detour | Unreasonable Detour Claim | Triggers OSRM route comparison against stored breadcrumbs. |
| **DF35** | #8 | 9.0 Loyalty & Detour | 6.0 Payment & Ledger | Automated Detour Refund Credit | Issues prorated wallet refund if detour $>25\%$ without traffic. |

---

## 7. Process Specification Table

| Process ID | Process Name | Primary Inputs | Primary Outputs | Transformation Logic & Invariants |
|:---|:---|:---|:---|:---|
| **1.0** | **User Authentication & Profile Governance** | Mobile No, Password, OTP, Deletion Request | JWT Session Tokens, SMS OTP, Account Status | Validates phone format, hashes passwords via Argon2id, verifies OTP within 120s, enforces 30-day account deletion grace period before PII purge. |
| **2.0** | **Driver Onboarding, KYC & Verification** | NID, License, Vehicle Papers, Live Selfie | Approval/Reject Alerts, Device Blacklist Entry | Coordinates on-device liveness (Google ML Kit $\ge 0.85$), AWS Rekognition face match ($\ge 90\%$), AWS Textract OCR extraction ($\ge 85\%$), cross-matches license category to vehicle type, creates driver credentials in USERS, and enforces 3-strike device ban. |
| **3.0** | **Fare Quotation, Surge & Geospatial Dispatch** | Pins, Sensor Stream, Weather Data, Driver Locations | Upfront Fare Quote, 15s Radial Offer, Matched HUD | Computes route via OSRM, evaluates demand ratio ($>1.5$) & weather rain floor ($1.2\text{x}$), executes flyover elevation filter, runs 1km $\rightarrow$ 2.5km $\rightarrow$ 4km radial Redis sweep, acquires Redlock mutex. |
| **4.0** | **Trip Lifecycle, Metering & Offline TOTP** | Pickup OTP, 3s GPS Telemetry, Breakdown Alert | Trip Status Events, Insurance Policy ID, Breadcrumbs | Validates pickup OTP via hash or offline TOTP cryptographic signature, enlists transit insurance, tracks live route breadcrumbs (10s intervals), prorates fare on mechanical breakdown. |
| **5.0** | **Anti-Offline AI & Colocation Monitoring** | 15m Post-Cancel GPS & Accelerometer | Fraud Collusion Warnings, Disciplinary Sanctions | Computes discrete Fréchet distance ($\Delta d < 50\text{m}$) and velocity covariance ($>0.85$), filters out public transit corridor footprints, escalates driver penalty ladder (Warn $\rightarrow$ 7d Suspend $\rightarrow$ Ban). |
| **6.0** | **Payment Settlement, Wallet & Ledger** | MFS Callback, Cash Amounts, Pro-Pass Purchase | Itemized Receipts, Commission Debits, Wallet Credits | Verifies MFS webhook signatures, checks active Pro-Captain passes for 0% commission waiver, deducts 10%–12% commission from driver wallet, credits cash shortages to passenger wallet, posts double-entry ledger. |
| **7.0** | **Real-Time Communication & Telephony** | Live Chat Strings, Phone Call Triggers | WebSocket Frames, Virtual SIP Voice Relay | Routes bidirectional messages between matched parties, saves chat with 7-day TTL, bridges voice calls via virtual IVR numbers to conceal real telephone identities. |
| **8.0** | **Safety Desk, SOS Audio & Escalation** | SOS Button Trigger, 3s Countdown Cancel | R2 Audio URI, Emergency SMS Link, 999 Dialer | Manages 3-second abort window, records ambient audio to Cloudflare R2 (90-day retention), issues public tracking link with 2h JWT to trusted contacts, triggers audible alarm at Admin Incident Desk. |
| **9.0** | **Loyalty, Rating & Route Detour Arbitration** | 5-Star Ratings, Review Tags, Detour Reports | Loyalty Points Delta, Aggregate Ratings, Wallet Refund | Awards 1 point per ৳10 digital spend (100 pts = ৳10 discount), updates rolling 5-star averages, analyzes actual breadcrumbs vs optimal route, auto-credits refund if route deviation $>25\%$. |

---

## 8. Data Store Table

| Store ID | Physical Collection / Engine | Primary Key | Key Indexes | Read By Processes | Written By Processes | Retention & Purge Policy |
|:---|:---|:---|:---|:---|:---|:---|
| **D1** | `USERS` (MongoDB Atlas) | `_id (ObjectId)` | `phone_number` (UK), `email` (Sparse) | 1.0, 2.0, 3.0, 6.0, 8.0, 9.0 | 1.0, 2.0, 6.0, 9.0 | Active until deleted; PII purged 30 days after deletion request. |
| **D2** | `DRIVER_PROFILES` (MongoDB Atlas) | `_id (ObjectId)` | `user_id` (UK), `license_number` (UK) | 2.0, 3.0, 5.0, 6.0, 9.0 | 2.0, 5.0, 6.0, 9.0 | Retained permanently for regulatory licensing compliance. |
| **D3** | `VEHICLES` (MongoDB Atlas) | `_id (ObjectId)` | `brta_plate_number` (UK), `driver_id` | 2.0, 3.0, 4.0 | 2.0 | Retained permanently across fleet history. |
| **D4** | `TRIPS` (MongoDB Atlas) | `_id (ObjectId)` | `pickup_geo` (2dsphere), `trip_code` (UK) | 3.0, 4.0, 5.0, 6.0, 9.0 | 3.0, 4.0, 9.0 | Retained for 7 years for financial and statutory audit. |
| **D5** | `PAYMENTS & LEDGER` (MongoDB Atlas) | `_id (ObjectId)` | `trip_id`, `driver_id`, `external_trx_id` | 6.0, Admin Reports | 6.0 | Immutable append-only store; permanent statutory retention. |
| **D6** | `TELEMETRY & REDIS GEO` (Redis + Atlas) | Key / `_id` | `GEOADD drivers:locations`, `expires_at` (TTL) | 3.0, 4.0, 5.0 | 4.0, 5.0 | Redis real-time keys (TTL 10s); non-fraud Atlas logs auto-purged in 48 hours. |
| **D7** | `SECURITY & BLACKLISTS` (MongoDB Atlas) | `_id (ObjectId)` | `imei_hash`, `nid_hash`, `facial_vector_hash` | 1.0, 2.0, 3.0, 5.0, 8.0 | 2.0, 5.0, 8.0 | Permanent blacklist; audit logs stored minimum 1 year. |
| **D8** | `CHAT_MESSAGES` (MongoDB Atlas) | `_id (ObjectId)` | `trip_id`, `expires_at` (TTL 7 days) | 7.0, 8.0 (Safety Desk) | 7.0 | Auto-purged 7 days post-trip completion via TTL index. |
| **D9** | `LOYALTY_POINTS` (MongoDB Atlas) | `_id (ObjectId)` | `passenger_id` (UK), `expires_after` | 3.0, 9.0 | 9.0 | Points expire after 12 months of passenger account inactivity. |
| **D10**| `COMMISSION_PASSES` (MongoDB Atlas) | `_id (ObjectId)` | `driver_id`, `expires_at` | 6.0 | 6.0 | Historical record kept; active check bound to `expires_at`. |

---

## 9. Complete Draw.io (mxGraph) XML Model

The XML document below represents the complete, fully formed **Context Diagram (Level 0) and Level 1 DFD** for SecureRide.

### How to Import into Draw.io / Diagrams.net:
1. Open [draw.io](https://app.diagrams.net) in your browser.
2. Select **Arrange** $\rightarrow$ **Insert** $\rightarrow$ **Advanced** $\rightarrow$ **XML...** (or press `Ctrl+Shift+B`).
3. Copy the entire code block below and paste it into the dialog.
4. Click **Insert** to render the complete interactive, vector diagram.

```xml
<mxfile host="app.diagrams.net" modified="2026-10-30T12:20:00.000Z" agent="SecureRide Engineering Architecture Team" version="24.0.0" type="device">
  <diagram id="SecureRide-DFD-L0-L1" name="SecureRide Architecture DFD">
    <mxGraphModel dx="1600" dy="1100" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2400" pageHeight="1800" background="#0f172a" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />

        <!-- ==================== EXTERNAL ENTITIES (COLUMN 1 & 5) ==================== -->
        <mxCell id="E1" value="&lt;b&gt;PASSENGER&lt;/b&gt;&lt;br/&gt;(Commuter)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#38bdf8;fontColor=#f8fafc;fontSize=13;" vertex="1" parent="1">
          <mxGeometry x="60" y="380" width="160" height="90" as="geometry" />
        </mxCell>

        <mxCell id="E2" value="&lt;b&gt;DRIVER&lt;/b&gt;&lt;br/&gt;(Captain)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#38bdf8;fontColor=#f8fafc;fontSize=13;" vertex="1" parent="1">
          <mxGeometry x="60" y="660" width="160" height="90" as="geometry" />
        </mxCell>

        <mxCell id="E3" value="&lt;b&gt;ADMINISTRATOR&lt;/b&gt;&lt;br/&gt;(Ops / Safety / Super)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#38bdf8;fontColor=#f8fafc;fontSize=13;" vertex="1" parent="1">
          <mxGeometry x="60" y="940" width="160" height="90" as="geometry" />
        </mxCell>

        <mxCell id="E4" value="&lt;b&gt;MFS GATEWAY&lt;/b&gt;&lt;br/&gt;(bKash / Nagad APIs)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#f59e0b;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="300" width="160" height="80" as="geometry" />
        </mxCell>

        <mxCell id="E5" value="&lt;b&gt;SMS AGGREGATOR&lt;/b&gt;&lt;br/&gt;(SSL Wireless/Greenweb)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#f59e0b;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="160" width="160" height="80" as="geometry" />
        </mxCell>

        <mxCell id="E6" value="&lt;b&gt;MAP &amp; ROUTING&lt;/b&gt;&lt;br/&gt;(Mapbox / OSRM API)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#f59e0b;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="440" width="160" height="80" as="geometry" />
        </mxCell>

        <mxCell id="E7" value="&lt;b&gt;OBJECT STORAGE&lt;/b&gt;&lt;br/&gt;(Cloudflare R2 Bucket)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#f59e0b;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="580" width="160" height="80" as="geometry" />
        </mxCell>

        <mxCell id="E8" value="&lt;b&gt;AI VISION SUITE&lt;/b&gt;&lt;br/&gt;(AWS Rekog &amp; Textract)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#f59e0b;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="720" width="160" height="80" as="geometry" />
        </mxCell>

        <mxCell id="E9" value="&lt;b&gt;WEATHER API&lt;/b&gt;&lt;br/&gt;(OpenWeatherMap)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#f59e0b;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="860" width="160" height="80" as="geometry" />
        </mxCell>

        <mxCell id="E10" value="&lt;b&gt;EMERGENCY &amp; SIP&lt;/b&gt;&lt;br/&gt;(999 Police / Telecom)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#ef4444;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="1000" width="160" height="80" as="geometry" />
        </mxCell>

        <mxCell id="E11" value="&lt;b&gt;TRANSIT INSURER&lt;/b&gt;&lt;br/&gt;(Green Delta / Pragati)" style="shape=rectangle;whiteSpace=wrap;html=1;rounded=0;strokeWidth=2;fillColor=#1e293b;strokeColor=#10b981;fontColor=#f8fafc;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1940" y="1140" width="160" height="80" as="geometry" />
        </mxCell>

        <!-- ==================== PROCESSES (COLUMN 2 & 3) ==================== -->
        <mxCell id="P1" value="&lt;b&gt;1.0&lt;/b&gt;&lt;br/&gt;User Auth &amp;&lt;br/&gt;Profile Governance" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="500" y="140" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P2" value="&lt;b&gt;2.0&lt;/b&gt;&lt;br/&gt;Driver Onboarding &amp;&lt;br/&gt;KYC Verification" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="500" y="380" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P3" value="&lt;b&gt;3.0&lt;/b&gt;&lt;br/&gt;Fare Quotation &amp;&lt;br/&gt;Geospatial Dispatch" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="500" y="620" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P4" value="&lt;b&gt;4.0&lt;/b&gt;&lt;br/&gt;Trip Lifecycle &amp;&lt;br/&gt;Offline TOTP Meter" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="500" y="860" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P5" value="&lt;b&gt;5.0&lt;/b&gt;&lt;br/&gt;Anti-Offline AI &amp;&lt;br/&gt;Colocation Engine" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="500" y="1100" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P6" value="&lt;b&gt;6.0&lt;/b&gt;&lt;br/&gt;Payment Settlement &amp;&lt;br/&gt;Ledger Accounting" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="840" y="240" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P7" value="&lt;b&gt;7.0&lt;/b&gt;&lt;br/&gt;Real-Time Chat &amp;&lt;br/&gt;Masked Telephony" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="840" y="520" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P8" value="&lt;b&gt;8.0&lt;/b&gt;&lt;br/&gt;Safety Desk, SOS &amp;&lt;br/&gt;Emergency Escalation" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="840" y="800" width="150" height="150" as="geometry" />
        </mxCell>

        <mxCell id="P9" value="&lt;b&gt;9.0&lt;/b&gt;&lt;br/&gt;Loyalty Points &amp;&lt;br/&gt;Detour Arbitration" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#0284c7;strokeColor=#38bdf8;strokeWidth=3;fontColor=#ffffff;fontSize=13;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="840" y="1080" width="150" height="150" as="geometry" />
        </mxCell>

        <!-- ==================== DATA STORES (COLUMN 4) ==================== -->
        <mxCell id="D1" value="&lt;b&gt;D1: USERS&lt;/b&gt;&lt;br/&gt;(Accounts, PII, Wallets)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="140" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D2" value="&lt;b&gt;D2: DRIVER_PROFILES&lt;/b&gt;&lt;br/&gt;(KYC, Payouts, Limits)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="240" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D3" value="&lt;b&gt;D3: VEHICLES&lt;/b&gt;&lt;br/&gt;(BRTA Plates, Tax Tokens)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="340" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D4" value="&lt;b&gt;D4: TRIPS&lt;/b&gt;&lt;br/&gt;(Contracts, Breadcrumbs)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="440" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D5" value="&lt;b&gt;D5: PAYMENTS &amp; LEDGER&lt;/b&gt;&lt;br/&gt;(Double-Entry Ledgers)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="540" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D6" value="&lt;b&gt;D6: TELEMETRY &amp; GEO&lt;/b&gt;&lt;br/&gt;(Redis Index, Sensor Logs)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="640" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D7" value="&lt;b&gt;D7: SECURITY &amp; BANS&lt;/b&gt;&lt;br/&gt;(Fingerprints, NID Blacklist)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="740" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D8" value="&lt;b&gt;D8: CHAT &amp; NOTICES&lt;/b&gt;&lt;br/&gt;(7-Day TTL Messages)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="840" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D9" value="&lt;b&gt;D9: LOYALTY_POINTS&lt;/b&gt;&lt;br/&gt;(Point Balances &amp; Trx)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="940" width="220" height="50" as="geometry" />
        </mxCell>

        <mxCell id="D10" value="&lt;b&gt;D10: COMMISSION_PASS&lt;/b&gt;&lt;br/&gt;(Pro Captain Passes)" style="shape=partialRectangle;whiteSpace=wrap;html=1;right=0;left=0;fillColor=#0f172a;strokeColor=#38bdf8;strokeWidth=3;fontColor=#93c5fd;fontSize=12;" vertex="1" parent="1">
          <mxGeometry x="1300" y="1040" width="220" height="50" as="geometry" />
        </mxCell>

        <!-- ==================== FLOW CONNECTORS (CORE CHANNELS) ==================== -->
        <mxCell id="F1" value="Phone, Password, OTP" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#38bdf8;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="E1" target="P1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F2" value="SMS OTP Request" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#f59e0b;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P1" target="E5">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F3" value="KYC Docs &amp; Live Selfie" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#38bdf8;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="E2" target="P2">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F4" value="Face Match &amp; OCR Scan" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#f59e0b;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P2" target="E8">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F5" value="Pickup/Drop Pins, Special Note" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#38bdf8;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="E1" target="P3">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F6" value="Optimal Distance / Polyline" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#f59e0b;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P3" target="E6">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F7" value="15s Dispatch Offer Broadcast" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=1;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#38bdf8;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P3" target="E2">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F8" value="Active Trip Record" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#38bdf8;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P3" target="D4">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F9" value="Trip Start Policy Enrollment" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#10b981;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P4" target="E11">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F10" value="Post-Cancel Background Sensor Feed" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#ef4444;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P5" target="E2">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F11" value="MFS Digital Checkout Webhook" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#f59e0b;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P6" target="E4">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F12" value="Immutable Ledger Audit Posting" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#38bdf8;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P6" target="D5">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F13" value="SOS Audio Streaming (30m max)" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#ef4444;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P8" target="E7">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <mxCell id="F14" value="National 999 Police Bridge" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#ef4444;strokeWidth=2;fontColor=#e2e8f0;fontSize=11;" edge="1" parent="1" source="P8" target="E10">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## 10. DFD Architectural Validation & Integrity Report

To ensure that the SecureRide DFD model conforms to formal structured systems analysis specifications, the entire model was subjected to an algorithmic rule-based audit:

### 10.1 Conservation of Data & Process Defect Audit

| Anomaly Type | Theoretical Rule | SecureRide Audit Finding | Resolution Status |
|:---|:---|:---|:---:|
| **Black Hole** | A process that accepts data inputs but generates no outputs or data store writes. | **Zero Black Holes:** Every process ($1.0 - 9.0$) has at least one outbound edge to an entity, store, or sibling process. | ✅ **Pass** |
| **Miracle** | A process that generates outputs spontaneously without receiving any data inputs. | **Zero Miracles:** Every process is stimulated by entity inputs or triggered by data store events. | ✅ **Pass** |
| **Gray Hole** | A process whose outputs contain fields that were neither in the inputs nor derivable from store records. | **Zero Gray Holes:** Fare calculations, surge steps, biometric vectors, and ledger deltas strictly trace to verified inputs. | ✅ **Pass** |
| **Process Self-Loop** | Inter-process data flows cannot loop back to the same process; internal transformations belong in P-Specs. | **Zero Self-Loops:** All Level 1 and Level 2 diagrams feature purely directed inter-node data transmissions. | ✅ **Pass** |
| **Direct Entity-to-Store** | External entities cannot read or write to data stores directly without passing through a process. | **Zero Direct Links:** All entity queries to MongoDB and Redis route through REST/WebSocket process boundaries. | ✅ **Pass** |
| **Direct Store-to-Store** | Data stores cannot transmit data to another store without an intermediary processing algorithm. | **Zero Direct Store Links:** Transfers (e.g., Trip completed $\rightarrow$ Wallet deducted) are governed by Process $6.0$. | ✅ **Pass** |

---

### 10.2 Hierarchical Level Balancing Audit (Level 0 vs Level 1)

Every data flow passing across the system boundary at the Context Level (Level 0) corresponds to an external interface flow in the Level 1 DFD:

- **Passenger Inputs (Level 0 $\rightarrow$ Level 1):**
  - Registration & Auth (Context #1) $\rightarrow$ Flowing into **Process 1.0**
  - Ride booking & sensor stream (Context #2, #3) $\rightarrow$ Flowing into **Process 3.0**
  - Live chat, masked call (Context #4) $\rightarrow$ Flowing into **Process 7.0**
  - Cash payment confirmations & wallet top-up (Context #5) $\rightarrow$ Flowing into **Process 6.0**
  - SOS button press (Context #4) $\rightarrow$ Flowing into **Process 8.0**
  - Rating & detour claims (Context #4) $\rightarrow$ Flowing into **Process 9.0**
- **Driver Inputs (Level 0 $\rightarrow$ Level 1):**
  - Driver onboarding docs, liveness selfie (Context #10) $\rightarrow$ Flowing into **Process 2.0**
  - 3-second GNSS location telemetry (Context #11) $\rightarrow$ Flowing into **Process 4.0**
  - Dispatch 15s acceptance / decline (Context #12) $\rightarrow$ Flowing into **Process 3.0**
  - Pickup OTP submission (Context #13) $\rightarrow$ Flowing into **Process 4.0**
  - Pro pass purchase & cash out (Context #14) $\rightarrow$ Flowing into **Process 6.0**
- **External Third-Party Gateways (Level 0 $\rightarrow$ Level 1):**
  - SMS Gateway (E5): Bi-directional with **Process 1.0** and **Process 8.0** (Context #23, #24)
  - Map / OSRM API (E6): Bi-directional with **Process 3.0** and **Process 9.0** (Context #25, #26)
  - Cloudflare R2 (E7): Bi-directional with **Process 2.0** and **Process 8.0** (Context #27, #28)
  - AWS Rekognition & Textract (E8): Bi-directional with **Process 2.0** (Context #29, #30)
  - OpenWeatherMap (E9): Input into **Process 3.0** (Context #31, #32)
  - bKash & Nagad (E4): Bi-directional with **Process 6.0** (Context #33, #34)
  - 999 Police & SIP Proxy (E10): Bi-directional with **Process 7.0** and **Process 8.0** (Context #35, #36)
  - Transit Insurer (E11): Bi-directional with **Process 4.0** (Context #37, #38)

---

### 10.3 CRUD Entity-Store Matrix

| Data Store | Process 1.0 (Auth) | Process 2.0 (KYC) | Process 3.0 (Dispatch) | Process 4.0 (Trip) | Process 5.0 (AI Offline) | Process 6.0 (Payment) | Process 7.0 (Chat) | Process 8.0 (SOS) | Process 9.0 (Loyalty) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **D1: USERS** | **C, R, U** | **C, R, U** | **R** | — | — | **U** | — | **R** | **U** |
| **D2: DRIVER_PROFILES** | — | **C, R, U** | **R** | — | **U** | **U** | — | — | **U** |
| **D3: VEHICLES** | — | **C, R, U** | **R** | **R** | — | — | — | — | — |
| **D4: TRIPS** | — | — | **C** | **U** | **R** | **R** | **R** | **R** | **R** |
| **D5: PAYMENTS & LEDGER** | — | — | — | — | — | **C, R** | — | — | — |
| **D6: TELEMETRY & GEO** | — | — | **R, U** | **C, U** | **C, R, D** | — | — | **R** | — |
| **D7: SECURITY & BANS** | **R** | **C, R, U** | — | — | **C, U** | — | — | **C, R** | — |
| **D8: CHAT_MESSAGES** | — | — | — | — | — | — | **C, R** | **R** | — |
| **D9: LOYALTY_POINTS** | — | — | **R** | — | — | — | — | — | **C, R, U** |
| **D10: COMMISSION_PASSES** | — | — | — | — | — | **C, R** | — | — | — |

*Legend: **C** = Create, **R** = Read, **U** = Update, **D** = Delete (or Auto-Purge TTL).*  
*(Note: Process 2.0 creates driver user credentials in `D1: USERS` and initializes the corresponding compliance profile in `D2: DRIVER_PROFILES`).*

---

### 10.4 Final Sign-off Statement
This Data Flow Diagram document provides the comprehensive, mathematically balanced, and functionally complete representation of the **SecureRide** ride-sharing software ecosystem. All processes, external entities, data stores, data flows, and state transitions map directly to the technical specifications defined in [PRD.md](file:///c%3A/Users/hp/OneDrive/Documents/rider%20sharing%3Dproject/PRD.md) (v5.0) and [architecture.md](file:///c%3A/Users/hp/OneDrive/Documents/rider%20sharing%3Dproject/architecture.md) (v2.0).
