# MiniLedger — Full-Stack Friend Loan Tracker

MiniLedger is a full-stack financial tracking application designed to help users track money they have lent to friends. It features a React Native (Expo) mobile frontend with TypeScript, a hardened Node.js/Express TypeScript backend, Prisma ORM backed by PostgreSQL, exact monetary calculations, mock OTP authentication, and an optional receipt upload bonus feature.

---
LINK : https://miniledger-dp5n.vercel.app/

## ⚡ Quick Start: How to Run in 10 Seconds

### Option A: 1-Click Launchers (Windows)
In the root directory, simply double-click:
1. **`start-backend.bat`** — Launches the Express API server at `http://localhost:4000`. Keep this window open to view printed mock OTP codes.
2. **`start-web.bat`** — Opens the mobile app directly in your web browser at `http://localhost:8081`.
3. *(Optional)* **`run-tests.bat`** — Runs all 13 automated API integration tests.

### Option B: Command Line (PowerShell / Terminal)
```bash
# Terminal 1: Start Express Backend
cd apps/api
npm run dev

# Terminal 2: Start Mobile / Web App
cd apps/mobile
npm run web     # For desktop browser
# OR
npm start       # To scan QR code with Expo Go on physical mobile phone
```

---

## 📦 How to Push this Repository to GitHub

Your local repository is fully committed and ready to be pushed to your GitHub account (`PuneetkumarHegde`).

### Step 1: Create an Empty Repository on GitHub
1. Go to: **[https://github.com/new](https://github.com/new)**
2. Set **Repository name**: `miniledger`
3. Select **Public** or **Private**.
4. ⚠️ **Do NOT** check *"Add a README file"*, *"Add .gitignore"*, or *"Choose a license"* (the project already contains complete versions of all three).
5. Click **Create repository**.

### Step 2: Push the Code
Run either the launcher or the terminal command:

- **Option A (1-Click)**: Double-click **`push-to-github.bat`** and press **Enter**.
- **Option B (Terminal)**:
  ```bash
  git remote add origin https://github.com/PuneetkumarHegde/miniledger.git
  git branch -M main
  git push -u origin main
  ```

---

## Table of Contents

1. [Project Overview & Key Features](#1-project-overview--key-features)
2. [Architecture & Technology Choices](#2-architecture--technology-choices)
3. [Prerequisites](#3-prerequisites)
4. [PostgreSQL Database Setup](#4-postgresql-database-setup)
5. [Environment Variable Configuration](#5-environment-variable-configuration)
6. [Prisma Migrations & Database Commands](#6-prisma-migrations--database-commands)
7. [Starting the Backend API](#7-starting-the-backend-api)
8. [Starting the Expo Mobile Application](#8-starting-the-expo-mobile-application)
9. [Testing on Emulators, Physical Devices, and Web](#9-testing-on-emulators-physical-devices-and-web)
10. [Obtaining the Mock OTP from the Server Terminal](#10-obtaining-the-mock-otp-from-the-server-terminal)
11. [API Endpoint Documentation & Examples](#11-api-endpoint-documentation--examples)
12. [Running Automated Tests](#12-running-automated-tests)
13. [Known Limitations & Production Security Considerations](#13-known-limitations--production-security-considerations)
14. [Suggested 2–3 Minute Demo Walkthrough](#14-suggested-23-minute-demo-walkthrough)

---

## 1. Project Overview & Key Features

MiniLedger replaces informal text messages and mental bookkeeping with a structured, reliable ledger:

- **Mock OTP Authentication**: Passwordless phone number login defaulting to India (`+91`), cryptographically secure 6-digit OTP printed directly to the server terminal, 5-minute expiry, 5-attempt limit, timing-safe SHA-256 hash verification, and one-time-use invalidation.
- **Strict Tenant Isolation**: All queries and mutations are strictly scoped to the authenticated user's ID extracted from signed JWT session tokens. One user cannot view, modify, or repay another user's loan.
- **Exact Decimal Arithmetic**: PostgreSQL `NUMERIC(12, 2)` column storage and Prisma `Decimal` arithmetic prevent floating-point inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`). All monetary amounts are formatted as exact decimal strings (e.g. `"1500.00"`).
- **Standardized Due Date & Overdue Policy**:
  - Due dates represent calendar days in UTC/ISO format.
  - **Overdue Rule**: A borrower is granted the entire due date to repay. A loan becomes **OVERDUE** strictly after the calendar day has ended (i.e. `now > dueDateEndOfDay`). A loan due today is marked as "Due Today" (neutral), while a loan due yesterday or earlier is marked as "Overdue" (red warning).
- **Repayment Integrity**: An idempotent repayment endpoint (`PATCH /api/loans/:id/repay`) transitions a pending loan to `REPAID`, records `repaidAt`, and prevents duplicate repayment calls from corrupting accounting totals.
- **Dashboard & Dynamic Metrics**:
  - **Total Lent**: Sum of all loans recorded by the user.
  - **Total Repaid**: Sum of all loans marked `REPAID`.
  - **Overdue Amount**: Sum of `PENDING` loans whose due date has elapsed.
  - Pull-to-refresh, status filter tabs (All, Pending, Overdue, Repaid), and instant optimistic updates.
- **Receipt Upload Bonus**: Optional file attachment (JPEG, PNG, WebP, PDF up to 5MB) with server-side validation and protected file access checking user ownership.

---

## 2. Architecture & Technology Choices

### Repository Structure (Monorepo)

```text
miniledger/
├── apps/
│   ├── api/                           # Express TypeScript Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Database schema (User, Otp, Loan)
│   │   │   └── migrations/            # Version-controlled SQL migrations
│   │   ├── src/
│   │   │   ├── config/env.ts          # Zod-validated environment config
│   │   │   ├── lib/                   # Singletons (prisma, crypto, jwt, dateUtils)
│   │   │   ├── middleware/            # Auth JWT verification, centralized error handler
│   │   │   ├── routes/                # Express routers (auth, loans, upload)
│   │   │   ├── services/              # Business logic & Decimal summary calculations
│   │   │   ├── validators/            # Zod request validation schemas
│   │   │   └── tests/                 # Vitest + Supertest integration tests
│   │   ├── uploads/                   # Local storage for receipt attachments
│   │   └── package.json
│   │
│   └── mobile/                        # Expo React Native Application
│       ├── src/
│       │   ├── components/            # Reusable components (SummaryCard, LoanCard, modals)
│       │   ├── config/api.ts          # Centralized API config with dynamic IP resolution
│       │   ├── context/AuthContext.tsx# Authentication session provider
│       │   ├── screens/               # LoginScreen, OtpScreen, DashboardScreen, AddLoanScreen
│       │   ├── services/              # api.ts (Fetch wrapper), storage.ts (AsyncStorage)
│       │   ├── theme/colors.ts        # Clean light theme with restrained green accents
│       │   └── types/index.ts         # TypeScript interfaces
│       ├── App.tsx                    # Root navigation container & stack
│       └── package.json
│
├── package.json                       # Monorepo root scripts
└── README.md
```

### Technology Highlights

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Mobile** | React Native, Expo SDK 58, TypeScript | Fast cross-platform development across iOS, Android, and Web with native navigation and smooth animations. |
| **Styling** | React Native StyleSheet, Custom Design System | Pure Vanilla StyleSheet avoiding heavy third-party UI runtimes; clean light theme with emerald green accents. |
| **Backend** | Node.js, Express, TypeScript | Lightweight, fast HTTP framework with clean middleware separation and strong typing. |
| **Database** | PostgreSQL 18 & Prisma ORM | ACID-compliant relational database, type-safe queries, automatic migration tracking, and PostgreSQL `NUMERIC` decimal precision. |
| **Validation** | Zod | Runtime schema validation and phone number normalization at API boundaries. |
| **Auth** | Mock OTP + JSON Web Tokens (JWT) | Fast local development without paid SMS providers; constant-time SHA-256 OTP verification and signed Bearer token sessions. |
| **Testing** | Vitest & Supertest | Sub-second test execution against live PostgreSQL test databases. |

---

## 3. Prerequisites

Before running the project, ensure you have:

- **Node.js**: v18.0.0 or higher (tested on Node v22.23.2)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14 or higher running locally (tested on PostgreSQL 18)
- **Expo Go App** (Optional): If testing on a physical iOS or Android phone.

---

## 4. PostgreSQL Database Setup

1. Verify that your PostgreSQL service is running:
   - On Windows: Run `Get-Service *postgres*` in PowerShell.
   - On macOS/Linux: `sudo systemctl status postgresql` or `brew services list`.

2. Create the `miniledger` database:
   ```bash
   psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE miniledger;"
   ```
   *(Enter your PostgreSQL password when prompted, default is `postgres`).*

---

## 5. Environment Variable Configuration

Both `apps/api` and `apps/mobile` include `.env.example` templates.

### Backend (`apps/api/.env`)

Create `apps/api/.env`:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/miniledger?schema=public"

# JWT Authentication
JWT_SECRET="supersecret_jwt_key_miniledger_change_in_production"
JWT_EXPIRES_IN="7d"

# OTP Security Settings
OTP_EXPIRY_MINUTES=5
MAX_OTP_ATTEMPTS=5

# Receipt Uploads
UPLOAD_DIR="./uploads"
```

### Mobile App (`apps/mobile/.env`)

Create `apps/mobile/.env`:

```env
# Point to your computer's local Wi-Fi IP for physical mobile device testing
# Or http://localhost:4000 for browser / iOS simulator testing
EXPO_PUBLIC_API_URL=http://localhost:4000
```

> **Tip for Physical Phones**: If testing via the Expo Go app on your physical mobile device over Wi-Fi, set `EXPO_PUBLIC_API_URL=http://192.168.1.34:4000` (substitute your computer's LAN IP). Alternatively, use the in-app **Settings (Gear Icon)** in the mobile app to set the server IP at any time without rebuilding.

---

## 6. Prisma Migrations & Database Commands

Navigate to `apps/api`:

```bash
cd apps/api

# Run existing migrations to bring database schema up to date
npx prisma migrate dev

# Generate the type-safe Prisma client
npx prisma generate

# (Optional) Open Prisma Studio visual database browser
npx prisma studio
```

---

## 7. Starting the Backend API

From the repository root:

```bash
npm run dev:api
```

Or directly from `apps/api`:

```bash
cd apps/api
npm run dev
```

The server will start at:
- **Local URL**: `http://localhost:4000`
- **Network URL**: `http://0.0.0.0:4000` (accessible by physical devices on your LAN)

---

## 8. Starting the Expo Mobile Application

From the repository root:

```bash
# Start Expo development server
npm run dev:mobile

# Or open directly in your web browser
npm run dev:web
```

Or directly inside `apps/mobile`:

```bash
cd apps/mobile
npx expo start
```

Press:
- `w` to open in your web browser.
- `a` to open in an Android Emulator.
- `i` to open in the iOS Simulator.
- Or scan the QR code using the **Expo Go** app on your physical phone!

---

## 9. Testing on Emulators, Physical Devices, and Web

MiniLedger is fully responsive and supports all three environments:

1. **Web Browser (`npm run dev:web`)**:
   - Opens on `http://localhost:8081`. Connects directly to backend at `http://localhost:4000`.
2. **Physical Phone via Expo Go**:
   - Ensure your phone and development computer are connected to the same Wi-Fi network.
   - If using `EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:4000`, the mobile app will communicate directly with your computer's backend.
   - If you need to change the IP on the fly, tap the **Settings (Gear Icon)** at the top right of the Login screen or Dashboard to adjust the backend URL instantly.
3. **Android Studio Emulator**:
   - Standard Android loopback `http://10.0.2.2:4000` is supported.

---

## 10. Obtaining the Mock OTP from the Server Terminal

When requesting an OTP in the mobile app:
1. Enter your phone number (e.g., `9876543210`) and tap **Get Verification Code**.
2. Look at the terminal where `npm run dev:api` is running. You will see a clear, formatted log output:

```text
======================================================
🔑 [AUTH SERVICE] MOCK OTP FOR +919876543210
👉 CODE: >>> 389529 <<<
⏰ Valid for 5 minutes (expires at: 10:34:37 am)
======================================================
```

3. Enter the 6-digit code on the OTP screen and tap **Verify & Proceed**.
4. The backend securely checks the hash, invalidates the OTP, creates/finds your user account, and logs you into the dashboard.

---

## 11. API Endpoint Documentation & Examples

Base URL: `http://localhost:4000`

### Authentication Endpoints

#### 1. Request OTP
- **Endpoint**: `POST /api/auth/request-otp`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "phoneNumber": "+919876543210"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "OTP sent successfully. Please check server console in development.",
    "expiresInSeconds": 300
  }
  ```

#### 2. Verify OTP
- **Endpoint**: `POST /api/auth/verify-otp`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "phoneNumber": "+919876543210",
    "otp": "389529"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cmvj2njee0003ai5c6ob9834t",
      "phoneNumber": "+919876543210",
      "createdAt": "2026-10-22T04:59:37.334Z"
    }
  }
  ```

#### 3. Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "user": {
      "id": "cmvj2njee0003ai5c6ob9834t",
      "phoneNumber": "+919876543210",
      "createdAt": "2026-10-22T04:59:37.334Z",
      "updatedAt": "2026-10-22T04:59:37.334Z"
    }
  }
  ```

---

### Loan Endpoints (Authenticated)

#### 4. Get Loan Summary
- **Endpoint**: `GET /api/loans/summary`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "totalLent": "3500.50",
      "totalRepaid": "2500.50",
      "overdueAmount": "1000.00",
      "currency": "INR",
      "timezonePolicy": "Due dates are calendar-day UTC; loans become overdue strictly after the calendar due date has elapsed."
    }
  }
  ```

#### 5. List User Loans
- **Endpoint**: `GET /api/loans`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cmvj2njf30005ai5cfuvqj76a",
        "userId": "cmvj2njee0003ai5c6ob9834t",
        "friendName": "Aman Verma",
        "amount": "2500.50",
        "dueDate": "2026-11-01T00:00:00.000Z",
        "status": "REPAID",
        "repaidAt": "2026-10-22T04:59:37.386Z",
        "isOverdue": false,
        "receiptUrl": null,
        "receiptOriginalName": null,
        "createdAt": "2026-10-22T04:59:37.359Z",
        "updatedAt": "2026-10-22T04:59:37.388Z"
      }
    ],
    "count": 1
  }
  ```

#### 6. Create Loan
- **Endpoint**: `POST /api/loans`
- **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "friendName": "Pooja Hegde",
    "amount": 1000.00,
    "dueDate": "2026-10-15",
    "receiptUrl": "/api/upload/receipts/example.png",
    "receiptOriginalName": "receipt.png"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "id": "cmvj2njff0007ai5c4pobdjrw",
      "userId": "cmvj2njee0003ai5c6ob9834t",
      "friendName": "Pooja Hegde",
      "amount": "1000.00",
      "dueDate": "2026-10-15T00:00:00.000Z",
      "status": "PENDING",
      "repaidAt": null,
      "isOverdue": true,
      "createdAt": "2026-10-22T04:59:37.371Z"
    }
  }
  ```

#### 7. Mark Loan as Repaid
- **Endpoint**: `PATCH /api/loans/:id/repay`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Loan successfully marked as repaid",
    "data": {
      "id": "cmvj2njf30005ai5cfuvqj76a",
      "status": "REPAID",
      "repaidAt": "2026-10-22T04:59:37.386Z"
    }
  }
  ```
- **Error if already repaid** (`400 Bad Request`):
  ```json
  {
    "success": false,
    "error": "Loan is already marked as repaid on 2026-10-22T04:59:37.386Z. Duplicate repayment is prohibited."
  }
  ```

---

### Receipt Upload Bonus Endpoints

#### 8. Upload Receipt
- **Endpoint**: `POST /api/upload`
- **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
- **Body**: Form data with field `receipt` (image file or PDF, max 5MB)
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "fileUrl": "/api/upload/receipts/0a5b281b-5e45-42e7-a9a7-33a7e48b5327.png",
      "filename": "0a5b281b-5e45-42e7-a9a7-33a7e48b5327.png",
      "originalName": "upi_receipt.png",
      "mimeType": "image/png",
      "size": 142050
    }
  }
  ```

#### 9. Protected Receipt Download / Preview
- **Endpoint**: `GET /api/upload/receipts/:filename`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Access Control**: Validates user session and verifies that the receipt belongs to a loan owned by the requester.

---

## 12. Running Automated Tests

The backend test suite is powered by **Vitest** and **Supertest**. It validates authentication flows, phone normalization, attempt limits, expiration, tenant isolation, loan validation, duplicate repayment prevention, and exact decimal calculations for summary totals.

From the root directory:

```bash
npm test
```

Or from `apps/api`:

```bash
cd apps/api
npm test
```

### Test Suite Summary:
- **`src/tests/auth.test.ts`**:
  - Request OTP normalization and SHA-256 hash persistence.
  - Invalid phone number format rejection.
  - Attempt count increment on wrong code.
  - Successful OTP verification, token issue, user upsertion, and one-time-use invalidation.
  - Expired OTP rejection.
- **`src/tests/loans.test.ts`**:
  - Authentication check and input validation (amounts <= 0, empty names).
  - Exact Decimal representation in responses.
  - Tenant isolation (User A cannot view User B's loans).
  - Repayment state transitions and duplicate repayment prevention.
  - Summary metrics calculation with exact decimal precision and overdue calendar policy.
- **`src/tests/receipt.test.ts`**:
  - Receipt upload with file metadata.
  - Attachment to loans and authenticated file download authorization.

---

## 13. Known Limitations & Production Security Considerations

As requested for this internship submission, this project uses a mock OTP system for demonstration without incurring paid third-party SMS gateway costs. In a production deployment, the following enhancements should be implemented:

1. **SMS Provider Integration**: Integrate a verified SMS provider (such as Twilio, AWS SNS, or MSG91) with DLT registration and delivery receipts.
2. **Rate Limiting & IP Throttling**: Add Redis-based rate limiting (`express-rate-limit` / `rate-limiter-flexible`) to limit OTP requests per IP and phone number to prevent SMS toll fraud or denial of service.
3. **Cloud Object Storage**: Transition receipt uploads from local disk storage (`uploads/`) to Amazon S3, Google Cloud Storage, or Cloudflare R2 with pre-signed upload and download URLs.
4. **Token Refresh Mechanism**: Upgrade single JWT tokens to an access token (15-minute expiry) + secure HTTP-only refresh token rotation pattern.
5. **Multi-Currency Support**: Currently defaults to Indian Rupees (INR). Production systems can support dynamic currency codes with foreign exchange rate normalization.

---

## 14. Suggested 2–3 Minute Demo Walkthrough

Follow these steps for a live interview or review walkthrough:

1. **Start the Backend**:
   - Run `npm run dev:api` in one terminal window.
   - Point out the clean terminal banner indicating `http://localhost:4000`.

2. **Start the Mobile App**:
   - Run `npm run dev:web` (or `npm run dev:mobile`) in a second terminal.
   - The app opens with the **MiniLedger** light-theme sign-in screen.

3. **Demonstrate Authentication**:
   - Type a 10-digit mobile number: `9876543210`.
   - Click **Get Verification Code**.
   - Show the reviewer the server terminal where the mock OTP code is clearly printed:
     `👉 CODE: >>> XXXXXX <<<`.
   - Type the 6-digit code into the interactive OTP box and tap **Verify & Proceed**.
   - The user is authenticated and lands on the clean Dashboard.

4. **Demonstrate the Dashboard & Adding Loans**:
   - The initial summary cards show `Total Lent: ₹0.00`, `Total Repaid: ₹0.00`, `Overdue: ₹0.00` with the friendly empty state.
   - Tap **+ Add Loan** (or the floating action button).
   - Enter Friend Name: `Rahul Sharma`, Amount: `1500.50`, select `+1 Week` due date preset.
   - Tap **Record Loan**.
   - The dashboard updates immediately: `Total Lent: ₹1,500.50`.

5. **Demonstrate Overdue Warning Logic**:
   - Tap **+ Add Loan** again.
   - Enter Friend Name: `Pooja Verma`, Amount: `800.00`.
   - Set the due date to a past date (e.g. `2026-10-15`).
   - Tap **Record Loan**.
   - Show that Pooja's loan is highlighted with an **OVERDUE** red warning card and badge.
   - Show that the top summary card dynamically reflects `Overdue: ₹800.00`.

6. **Demonstrate Repayment & Integrity**:
   - Tap **Mark as Repaid** on Rahul's pending loan.
   - An accessible confirmation modal appears: *"Are you sure you want to mark the loan of ₹1,500.50 to Rahul Sharma as repaid?"*
   - Tap **Yes, Mark Repaid**.
   - Rahul's card immediately transitions to the completed green state with a "Completed" date badge.
   - The top summary cards now display `Total Repaid: ₹1,500.50`.

7. **Demonstrate Filter Tabs**:
   - Switch between **Pending**, **Overdue**, and **Repaid** tabs to filter the list.

8. **Show Automated Test Suite**:
   - In a terminal, run `npm test`.
   - Show that all 13 integration tests pass cleanly in under 2 seconds.

---

## 15. Deploying to Vercel (Production Setup & Cloud Database)

### ❓ Is a Database Needed on Vercel?
**YES, a database is strictly required.**

Here is why:
1. **Localhost is unreachable from the Cloud**: When developing locally, the backend connects to `localhost:5432` on your machine. Vercel runs in AWS cloud data centers, which cannot access your local laptop's `localhost`.
2. **Serverless Functions are Ephemeral**: Vercel runs the backend as stateless serverless functions. Any in-memory storage disappears once a function finishes responding.
3. **MiniLedger Relational Core**: MiniLedger requires PostgreSQL to persist user profiles, phone OTP sessions, loans, repayments, and audit calculations.

### 🆓 Recommended Free Cloud PostgreSQL Databases
You can set up a free managed cloud PostgreSQL database in under 60 seconds (no credit card required):
- **[Neon.tech](https://neon.tech)** *(Recommended)*: Free tier, instant provisioning, optimized for serverless Prisma connections with SSL pooling.
- **[Supabase](https://supabase.com)**: Free tier PostgreSQL with connection pooling.
- **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)**: Built directly into Vercel dashboard.

---

### 🚀 Step-by-Step Vercel Deployment Guide

#### Step 1: Provision your Free Database (Neon.tech)
1. Sign up for free at [neon.tech](https://neon.tech).
2. Create a new project (e.g. `miniledger-db`).
3. Copy your PostgreSQL connection string:
   ```
   postgresql://username:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### Step 2: Initialize Database Schema
From your local terminal, apply the Prisma schema to your cloud database:
```bash
# Set your DATABASE_URL in apps/api/.env or export it in your shell:
npx --prefix apps/api prisma db push
```
*(This creates all tables: `User`, `OtpRecord`, `Loan`, `Repayment` in your cloud database instantly.)*

#### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `PuneetkumarHegde/miniledger`.
4. Leave **Framework Preset** as **Other** (or Auto-detected).
5. In **Environment Variables**, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` | Your Cloud PostgreSQL connection string |
   | `JWT_SECRET` | `any-secure-random-string-at-least-32-chars` | Signing secret for session tokens |
   | `NODE_ENV` | `production` | Production environment flag |
6. Click **Deploy**!

#### Architecture on Vercel:
- **Frontend**: The Expo React Native Web app is pre-rendered and served as an ultra-fast static SPA directly from Vercel's global CDN (`apps/mobile/dist`).
- **Backend API**: The Express server runs serverless via `api/index.ts` handling all `/api/*` endpoints.
- **Unified Domain**: Both frontend and backend share the same Vercel URL (e.g. `https://miniledger.vercel.app`), completely eliminating cross-origin (CORS) complications.

