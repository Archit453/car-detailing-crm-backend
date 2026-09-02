# 🚗 Car Detailing CRM - Backend REST API

A production-ready Express.js REST API backend for a Car Detailing CRM, integrated with Supabase PostgreSQL. Built with modular architecture, strict Zod validation, centralized error handling, CORS security, and out-of-the-box readiness for deployment on Vercel.

---

## 📑 Table of Contents

- [Features](#-features)
- [Project Architecture](#-project-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Supabase Database Setup](#-supabase-database-setup)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
  - [Health Check](#1-health-check)
  - [Create Lead](#2-create-lead)
  - [Get All Leads](#3-get-all-leads-with-filtering--pagination)
  - [Get Lead by ID](#4-get-lead-by-id)
  - [Update Lead Status](#5-update-lead-status)
  - [Delete Lead](#6-delete-lead)
- [Error Handling](#-error-handling)
- [Deployment on Vercel](#-deployment-on-vercel)
- [Phase 2: Production Deployment & Verification Guide](#-phase-2-production-deployment--verification-guide)
- [Phase 3: Framer Frontend & WhatsApp Lead Automation Integration](#-phase-3-framer-frontend--whatsapp-lead-automation-integration)
- [Phase 4: Instagram Direct Message Lead Bot Integration](#-phase-4-instagram-direct-message-lead-bot-integration)
- [🖥️ CRM Frontend Dashboard UI](#️-crm-frontend-dashboard-ui)

---

## ✨ Features

- **Express.js (ES Modules)**: Modern, clean, and fast backend.
- **Supabase PostgreSQL**: Scalable relational database with automatic `updated_at` triggers and index optimizations.
- **Zod Validation**: Robust type-safe validation for request body, URL parameters, and query parameters.
- **Layered Architecture**: Clear separation of concerns (`controllers`, `routes`, `validators`, `middlewares`, `config`, `utils`).
- **Security Best Practices**: Configured with `helmet` headers, configurable `cors` origin controls, and JSON body size limits.
- **Centralized Error Handling**: Unified JSON error envelopes with automatic mapping for Supabase / PostgreSQL errors.
- **Vercel Serverless Ready**: Includes `vercel.json` and `api/index.js` for one-click serverless deployment.

---

## 📁 Project Architecture

```
car-detailing-crm-backend/
├── api/
│   └── index.js                   # Vercel serverless function entrypoint
├── public/                        # 🖥️ CRM Frontend Dashboard (SPA)
│   ├── index.html                 # Modern responsive CRM dashboard UI
│   ├── styles.css                 # Dark automotive theme & glassmorphism
│   └── app.js                     # Client state, filters, Kanban & API sync
├── src/
│   ├── config/
│   │   ├── env.js                 # Environment variable validation & config
│   │   └── supabase.js            # Supabase client instance
│   ├── controllers/
│   │   ├── lead.controller.js     # Leads business logic (CRUD & status updates)
│   │   ├── whatsapp.controller.js # Meta WhatsApp Cloud API Bot handler
│   │   └── instagram.controller.js# Meta Instagram Graph API Bot handler
│   ├── middlewares/
│   │   ├── errorHandler.js        # Global error handler & Postgres error mapper
│   │   ├── notFound.js            # 404 Route handler
│   │   └── validate.js            # Generic Zod validation middleware
│   ├── routes/
│   │   ├── index.js               # API route combiner (/api)
│   │   ├── lead.routes.js         # /api/leads routes
│   │   ├── whatsapp.routes.js     # /api/webhook/whatsapp routes
│   │   └── instagram.routes.js    # /api/webhook/instagram routes
│   ├── validators/
│   │   └── lead.validator.js      # Zod validation schemas
│   ├── utils/
│   │   ├── apiError.js            # Custom ApiError operational error class
│   │   ├── apiResponse.js         # Standardized JSON response formatting
│   │   └── asyncHandler.js        # Async wrapper for controllers
│   ├── app.js                     # Express application initialization & middleware
│   └── server.js                  # Local development HTTP server listener
├── supabase/
│   └── schema.sql                 # SQL script for tables, indexes, triggers, & RLS
├── tests/
│   └── api.test.js                # Integration & unit test suite (25 tests)
├── .env.example                   # Environment variables example template
├── .gitignore                     # Git ignore rules
├── package.json                   # Node.js dependencies & scripts
├── test-api.http                  # HTTP request test collection
├── vercel.json                # Vercel deployment configuration
└── README.md                  # Complete documentation
```

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** / **pnpm**
- A **Supabase** account and project (free at [supabase.com](https://supabase.com))

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
cd car-detailing-crm-backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-or-service-role-key
```

### 3. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run at `http://localhost:5000`.

---

## 🗄️ Supabase Database Setup

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** tab on the left sidebar.
3. Open [`supabase/schema.sql`](file:///C:/Users/USER/.gemini/antigravity/scratch/car-detailing-crm-backend/supabase/schema.sql) from this project.
4. Paste the SQL code into the Supabase SQL Editor and click **Run**.

### Table Schema (`leads`):

| Column | Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, `gen_random_uuid()` | Unique lead identifier |
| `name` | `VARCHAR(255)` | `NOT NULL` | Customer name |
| `phone` | `VARCHAR(50)` | `NOT NULL` | Contact phone number |
| `service` | `VARCHAR(100)` | `NOT NULL` | Requested detailing service |
| `source` | `VARCHAR(100)` | `DEFAULT 'website'` | Lead source (e.g. instagram, website, referral) |
| `status` | `VARCHAR(50)` | `DEFAULT 'new'` | Status (`new`, `contacted`, `scheduled`, `in_progress`, `completed`, `cancelled`) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Last update timestamp |

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port for the local Express server |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `CORS_ORIGIN` | No | `*` | Allowed origins (e.g. `*` or `https://mycrm.com,http://localhost:3000`) |
| `SUPABASE_URL` | **Yes** | — | Project URL from Supabase Project Settings -> API |
| `SUPABASE_KEY` | **Yes** | — | Anon public key or Service Role key from Supabase Settings -> API |

---

## 📡 API Documentation

### Base URL
- Local: `http://localhost:5000`
- Vercel Production: `https://your-crm-backend.vercel.app`

---

### 1. Health Check
Checks if the server is running.

- **Method**: `GET`
- **Endpoint**: `/health`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Server is running healthy",
  "data": {
    "status": "healthy",
    "uptime": 12.34,
    "timestamp": "2026-08-30T11:45:00.000Z",
    "environment": "development"
  }
}
```

---

### 2. Create Lead
Creates a new prospective customer lead.

- **Method**: `POST`
- **Endpoint**: `/api/leads`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Alex Johnson",
  "phone": "+1-555-0199",
  "service": "Ceramic Coating",
  "source": "website",
  "status": "new"
}
```
- **Validation**:
  - `name`: String, required, 2-255 chars
  - `phone`: String, required, 5-50 chars
  - `service`: String, required, 2-100 chars
  - `source`: String, optional, default `'website'`
  - `status`: String, optional, default `'new'`
- **Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "e6a2b821-4688-4bb9-b7b5-24d1d86d6342",
    "name": "Alex Johnson",
    "phone": "+1-555-0199",
    "service": "Ceramic Coating",
    "source": "website",
    "status": "new",
    "created_at": "2026-08-30T11:45:10.000Z",
    "updated_at": "2026-08-30T11:45:10.000Z"
  }
}
```

---

### 3. Get All Leads (With Filtering & Pagination)
Retrieves a paginated list of leads with filtering and search support.

- **Method**: `GET`
- **Endpoint**: `/api/leads`
- **Query Parameters**:
  - `page` (optional, default: `1`): Page number
  - `limit` (optional, default: `20`, max: `100`): Items per page
  - `status` (optional): Filter by status (e.g. `new`, `contacted`, `scheduled`, `in_progress`, `completed`, `cancelled`)
  - `service` (optional): Filter by service substring (e.g. `Ceramic`, `Detail`)
  - `source` (optional): Filter by source (e.g. `instagram`, `website`, `referral`)
  - `search` (optional): Search query matching customer `name` or `phone`
  - `sortBy` (optional, default: `created_at`): `created_at`, `updated_at`, `name`, `status`, `service`
  - `order` (optional, default: `desc`): `asc` or `desc`

- **Example**: `GET /api/leads?status=new&page=1&limit=10&sortBy=created_at&order=desc`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Leads retrieved successfully",
  "data": [
    {
      "id": "e6a2b821-4688-4bb9-b7b5-24d1d86d6342",
      "name": "Alex Johnson",
      "phone": "+1-555-0199",
      "service": "Ceramic Coating",
      "source": "website",
      "status": "new",
      "created_at": "2026-08-30T11:45:10.000Z",
      "updated_at": "2026-08-30T11:45:10.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 4. Get Lead by ID
Retrieves a single lead by its UUID.

- **Method**: `GET`
- **Endpoint**: `/api/leads/:id`
- **Example**: `GET /api/leads/e6a2b821-4688-4bb9-b7b5-24d1d86d6342`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Lead retrieved successfully",
  "data": {
    "id": "e6a2b821-4688-4bb9-b7b5-24d1d86d6342",
    "name": "Alex Johnson",
    "phone": "+1-555-0199",
    "service": "Ceramic Coating",
    "source": "website",
    "status": "new",
    "created_at": "2026-08-30T11:45:10.000Z",
    "updated_at": "2026-08-30T11:45:10.000Z"
  }
}
```

---

### 5. Update Lead Status
Updates the status of an existing lead.

- **Method**: `PATCH`
- **Endpoint**: `/api/leads/:id/status`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "status": "scheduled"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Lead status updated successfully",
  "data": {
    "id": "e6a2b821-4688-4bb9-b7b5-24d1d86d6342",
    "name": "Alex Johnson",
    "phone": "+1-555-0199",
    "service": "Ceramic Coating",
    "source": "website",
    "status": "scheduled",
    "created_at": "2026-08-30T11:45:10.000Z",
    "updated_at": "2026-08-30T11:50:00.000Z"
  }
}
```

---

### 6. Delete Lead
Permanently deletes a lead by its UUID.

- **Method**: `DELETE`
- **Endpoint**: `/api/leads/:id`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Lead deleted successfully",
  "data": {
    "id": "e6a2b821-4688-4bb9-b7b5-24d1d86d6342",
    "deleted": true
  }
}
```

---

### 7. WhatsApp Webhook (Lead Automation)
Receives incoming messages from WhatsApp (Twilio or Meta Cloud API), guides the customer through service selection & name collection, and automatically stores the lead with `source: 'whatsapp'`.

- **Methods**: `GET` (handshake verification) / `POST` (message processing)
- **Endpoint**: `/api/webhook/whatsapp`
- **Supported Providers**: Twilio WhatsApp Sandbox / Numbers & Meta WhatsApp Cloud API
- **Response**: XML (TwiML) or JSON with auto-reply message text.

---

## 🛡️ Error Handling

All errors follow a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation Error: Invalid request payload or parameters",
    "details": [
      {
        "field": "phone",
        "message": "Phone number is required",
        "code": "invalid_type"
      }
    ]
  }
}
```

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `BAD_REQUEST` | Validation error, invalid UUID format, or malformed JSON |
| `404` | `NOT_FOUND` | Lead or requested route not found |
| `409` | `CONFLICT` | Resource collision |
| `500` | `INTERNAL_SERVER_ERROR` | Server or database query error |

---

## ⚡ Deployment on Vercel

This project includes [`vercel.json`](file:///C:/Users/USER/.gemini/antigravity/scratch/car-detailing-crm-backend/vercel.json) and [`api/index.js`](file:///C:/Users/USER/.gemini/antigravity/scratch/car-detailing-crm-backend/api/index.js) preconfigured for Vercel Serverless Functions.

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Run deploy:
   ```bash
   vercel
   ```
3. Set environment variables in Vercel:
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_KEY
   vercel env add CORS_ORIGIN
   ```
4. Deploy to production:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub / Vercel Dashboard

1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import your repository.
3. Under **Environment Variables**, add:
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_KEY`: Your Supabase Anon or Service Role key
   - `CORS_ORIGIN`: `*` (or your frontend URL)
4. Click **Deploy**.

---

## 🎯 Phase 2: Production Deployment & Verification Guide

Follow this step-by-step checklist to take your backend from deployment to a live, fully-functioning production API.

### Step 1: Configure Environment Variables in Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click on the project **`car-detailing-crm-backend`**.
3. Navigate to **Settings** &rarr; **Environment Variables**.
4. Add the following variables (available for Production, Preview, and Development):

| Variable Name | Example Value | Where to find in Supabase |
|---|---|---|
| `SUPABASE_URL` | `https://fgndnmgfcsceuxeuishf.supabase.co` | **Project Settings** &rarr; **API** &rarr; **Project URL** |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | **Project Settings** &rarr; **API** &rarr; **Project API keys** (`anon` `public` key) |
| `CORS_ORIGIN` | `*` *(or `https://your-frontend.vercel.app`)* | Your frontend domain, or `*` to allow all origins |

> [!IMPORTANT]
> In Vercel, after adding or updating environment variables, you **must redeploy** for the changes to take effect on running serverless instances.

---

### Step 2: Initialize Supabase Database Schema

1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/_/sql).
2. Open the **SQL Editor** from the left navigation bar.
3. Click **New query** and copy the entire contents of [`supabase/schema.sql`](file:///C:/Users/USER/.gemini/antigravity/scratch/car-detailing-crm-backend/supabase/schema.sql).
4. Click **Run** (or `Ctrl` + `Enter`).
5. Confirm that the `leads` table and its indexes/triggers were created:
   - Navigate to **Table Editor** &rarr; `leads`.
   - Verify columns: `id`, `name`, `phone`, `service`, `source`, `status`, `created_at`, `updated_at`.

---

### Step 3: Trigger a Production Redeployment on Vercel

To apply the environment variables and latest code changes:

- **Via Vercel Dashboard**:
  1. Go to your project's **Deployments** tab.
  2. Click the three dots `...` on the latest deployment &rarr; select **Redeploy**.
  3. Ensure "Include existing Build Cache" is unchecked (or proceed with standard redeploy).

- **Via Git / CLI**:
  ```bash
  # If using Git
  git add .
  git commit -m "fix: Vercel serverless cold start, root route, and Phase 2 guide"
  git push origin main

  # Or using Vercel CLI directly
  vercel --prod
  ```

---

### Step 4: Verify Your Live API Endpoints

Once the deployment completes, test your live production URL (e.g. `https://car-detailing-crm-backend.vercel.app`):

#### 1. Test Root Route
```bash
curl -i https://car-detailing-crm-backend.vercel.app/
```
**Expected Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Car Detailing CRM Backend API is online and operational",
  "data": {
    "name": "Car Detailing CRM REST API",
    "version": "1.0.0",
    "status": "online",
    "environment": "production",
    "endpoints": {
      "root": "GET /",
      "health": "GET /health",
      "apiDocs": "GET /api",
      "leads": "GET /api/leads"
    }
  }
}
```

#### 2. Test Health Check
```bash
curl -i https://car-detailing-crm-backend.vercel.app/health
```
**Expected Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Server is running healthy",
  "data": {
    "status": "healthy",
    "environment": "production"
  }
}
```

#### 3. Create a Test Lead
```bash
curl -i -X POST https://car-detailing-crm-backend.vercel.app/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bruce Wayne",
    "phone": "+1-555-0144",
    "service": "Full Paint Correction & Ceramic Coating",
    "source": "website",
    "status": "new"
  }'
```
**Expected Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "e6a2b821-4688-4bb9-b7b5-24d1d86d6342",
    "name": "Bruce Wayne",
    "phone": "+1-555-0144",
    "service": "Full Paint Correction & Ceramic Coating",
    "source": "website",
    "status": "new"
  }
}
```

#### 4. List All Leads
```bash
curl -i https://car-detailing-crm-backend.vercel.app/api/leads
```

---

### Step 5: Connect Your Frontend CRM Client

When integrating with a React, Next.js, Vue, or mobile frontend:

1. In your frontend `.env`:
   ```env
   VITE_API_BASE_URL=https://car-detailing-crm-backend.vercel.app
   # or for Next.js:
   NEXT_PUBLIC_API_URL=https://car-detailing-crm-backend.vercel.app
   ```
2. If restricting CORS, update `CORS_ORIGIN` in Vercel backend environment variables to match your frontend domain:
   ```env
   CORS_ORIGIN=https://my-detailing-crm.vercel.app
   ```

---

### 🔍 Phase 2 Troubleshooting Guide

| Issue | Cause | Solution |
|---|---|---|
| `503 Service Unavailable` with message: *"Supabase database service is not configured"* | `SUPABASE_URL` or `SUPABASE_KEY` is missing in Vercel settings | Add `SUPABASE_URL` and `SUPABASE_KEY` in Vercel Project Settings > Environment Variables, then **Redeploy**. |
| `500 Internal Server Error` with message: *"Database table does not exist"* | `supabase/schema.sql` has not been executed in your Supabase project | Run `supabase/schema.sql` in the Supabase SQL Editor. |
| `CORS Error: Origin not allowed` in browser console | The client's domain is not included in `CORS_ORIGIN` | Set `CORS_ORIGIN=*` or include your exact frontend URL (comma-separated if multiple). |
| `400 Bad Request` on lead creation | Request body failed Zod validation | Ensure `name` (>=2 chars), `phone` (>=5 chars), and `service` (>=2 chars) are provided in the JSON body. |
| Inspecting Live Logs | Need to trace runtime requests | Run `npx vercel logs` or open the **Logs** tab in your Vercel Dashboard. |

---

## 🚀 Phase 3: Framer Frontend & WhatsApp Lead Automation Integration

Phase 3 connects your live Framer landing page (`https://weekly-steps-579379.framer.app/`) and your business WhatsApp number directly into your Supabase CRM database.

```text
┌─────────────────────────────┐       POST /api/leads
│ Framer Lead Forms (x2)      │──────────────────────────────┐
│ (Hero & Contact Section)    │                              │
└─────────────────────────────┘                              ▼
                                                ┌─────────────────────────┐
┌─────────────────────────────┐  POST /api/     │ Vercel Backend          │
│ Customer WhatsApp Messages  │──webhook/──────▶│ (Express.js REST API)   │
│ ("Hi" -> Menu -> Name)      │  whatsapp       └────────────┬────────────┘
└─────────────────────────────┘                              │
                                                             ▼
                                                ┌─────────────────────────┐
                                                │ Supabase CRM Database   │
                                                │ - public.leads          │
                                                │ - whatsapp_sessions     │
                                                └─────────────────────────┘
```

---

### Part 1: Connect Framer Lead Forms (Website &rarr; Backend)

#### Method A: Framer Custom Code Component (⭐ Recommended)

This React component provides instant inline loading, validation, and a branded success state.

1. In your Framer Project, open the **Assets** tab on the left sidebar.
2. Under **Code**, click **+ New Component** &rarr; name it `LeadCaptureForm.tsx`.
3. Paste the following complete component:

```tsx
import React, { useState } from "react"
import { addPropertyControls, ControlType } from "framer"

interface FormProps {
    apiUrl: string
    title: string
    buttonText: string
    defaultService: string
    accentColor: string
}

export default function LeadCaptureForm(props: FormProps) {
    const {
        apiUrl = "https://car-detailing-crm-backend.vercel.app/api/leads",
        title = "Request a Free Protection Consultation",
        buttonText = "Book Free Consultation",
        defaultService = "PPF",
        accentColor = "#1f3555",
    } = props

    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [service, setService] = useState(defaultService)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatus("idle")
        setErrorMessage("")

        try {
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim(),
                    service: service,
                    source: "website",
                    status: "new",
                }),
            })

            const json = await res.json()

            if (!res.ok || !json.success) {
                const msg =
                    json.error?.details?.[0]?.message ||
                    json.error?.message ||
                    "Failed to submit. Please check your details."
                throw new Error(msg)
            }

            setStatus("success")
            setName("")
            setPhone("")
        } catch (err: any) {
            setStatus("error")
            setErrorMessage(err.message || "An unexpected error occurred.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={containerStyle}>
            {title && <h3 style={titleStyle}>{title}</h3>}

            {status === "success" ? (
                <div style={successBoxStyle}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
                    <h4 style={{ margin: "0 0 6px", color: "#ffffff", fontSize: "18px" }}>
                        Request Received!
                    </h4>
                    <p style={{ margin: 0, color: "#a1a1aa", fontSize: "14px", lineHeight: "1.4" }}>
                        Our detailing specialist will call you shortly to discuss your package.
                    </p>
                    <button
                        onClick={() => setStatus("idle")}
                        style={{ ...resetButtonStyle, backgroundColor: accentColor }}
                    >
                        Submit Another Inquiry
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} style={formStyle}>
                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Full Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Phone Number *</label>
                        <input
                            type="tel"
                            required
                            placeholder="e.g. +91 98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div style={inputGroupStyle}>
                        <label style={labelStyle}>Interested Service *</label>
                        <select
                            value={service}
                            onChange={(e) => setService(e.target.value)}
                            style={selectStyle}
                        >
                            <option value="PPF">Paint Protection Film (PPF)</option>
                            <option value="Ceramic Coating">Ceramic Coating</option>
                            <option value="Paint Correction">Paint Correction & Polish</option>
                            <option value="Interior Detailing">Deep Interior Detailing</option>
                            <option value="Full Detail Package">Full Detailing Package</option>
                        </select>
                    </div>

                    {status === "error" && (
                        <div style={errorBoxStyle}>
                            ⚠️ {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...submitButtonStyle,
                            backgroundColor: loading ? "#4b5563" : accentColor,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Submitting..." : buttonText}
                    </button>
                </form>
            )}
        </div>
    )
}

addPropertyControls(LeadCaptureForm, {
    apiUrl: {
        type: ControlType.String,
        title: "API URL",
        defaultValue: "https://car-detailing-crm-backend.vercel.app/api/leads",
    },
    title: {
        type: ControlType.String,
        title: "Heading",
        defaultValue: "Request a Free Consultation",
    },
    buttonText: {
        type: ControlType.String,
        title: "Button Text",
        defaultValue: "Book Free Consultation",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent Color",
        defaultValue: "#1f3555",
    },
})

// Styles
const containerStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "460px",
    padding: "24px",
    borderRadius: "16px",
    background: "#18181b",
    border: "1px solid #27272a",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
    fontFamily: "Inter, sans-serif",
    color: "#f4f4f5",
    boxSizing: "border-box",
}

const titleStyle: React.CSSProperties = {
    margin: "0 0 16px",
    fontSize: "20px",
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "left",
}

const formStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
}

const inputGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    textAlign: "left",
}

const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "#a1a1aa",
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    background: "#09090b",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
}

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
}

const submitButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    marginTop: "6px",
}

const successBoxStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "24px 12px",
}

const errorBoxStyle: React.CSSProperties = {
    padding: "10px",
    borderRadius: "6px",
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    fontSize: "13px",
}

const resetButtonStyle: React.CSSProperties = {
    marginTop: "16px",
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    cursor: "pointer",
}
```

4. Drag `LeadCaptureForm` into:
   - **Form 1 (Hero Section)**
   - **Form 2 (Contact / Bottom Section)**
5. Customize the heading, button text, and colors directly in Framer's sidebar without writing code.

---

#### Method B: Framer Native Form (Visual Builder)

1. Select your built-in Form element on the Framer canvas.
2. In the right panel under **Action**:
   * **Service**: `Custom` / `Webhook`
   * **URL**: `https://car-detailing-crm-backend.vercel.app/api/leads`
   * **Method**: `POST`
3. Name your input fields:
   * Name field &rarr; `name`
   * Phone field &rarr; `phone`
   * Service field &rarr; `service`

---

### Part 2: WhatsApp Lead Capture Flow (WhatsApp &rarr; CRM)

#### 1. Automated Chat Flow
When a customer sends a message ("Hi") to your business WhatsApp number:

1. **Step 1: Service Menu**
   ```text
   Welcome to Signature Detailing 🚗

   Which service are you interested in?

   1. PPF (Paint Protection Film)
   2. Ceramic Coating
   3. Paint Correction
   4. Interior Detailing

   Reply with 1, 2, 3, or 4 (or type the service name).
   ```
2. **Step 2: Collect Name** (User sends "2")
   ```text
   Great choice! Ceramic Coating is one of our specialty services. ✨

   May I know your full name?
   ```
3. **Step 3: Save to CRM** (User sends "Rahul Sharma")
   The backend automatically creates a lead in Supabase:
   ```json
   {
     "name": "Rahul Sharma",
     "phone": "+919876543210",
     "service": "Ceramic Coating",
     "source": "whatsapp",
     "status": "new"
   }
   ```
4. **Step 4: Confirmation & Handoff**
   ```text
   Thank you, Rahul Sharma! 🎉

   We have received your request for *Ceramic Coating*. Our detailing specialist will reach out to you shortly on this number.
   ```
5. **Human Takes Over**: Your detailing team member sees the lead in Supabase with `status: 'new'` and `source: 'whatsapp'`, and initiates direct personal follow-up.

---

#### 2. Supabase Table Setup for WhatsApp
Run this in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    phone VARCHAR(50) PRIMARY KEY,
    step VARCHAR(50) NOT NULL DEFAULT 'awaiting_service',
    selected_service VARCHAR(100),
    customer_name VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at ON public.whatsapp_sessions(updated_at DESC);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access to whatsapp_sessions"
    ON public.whatsapp_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

---

#### 3. Connect WhatsApp Webhook

* **Option A: Twilio WhatsApp (Fastest & Simplest)**:
  1. In [Twilio Console](https://console.twilio.com/) &rarr; **Messaging** &rarr; **Try WhatsApp**.
  2. Set **When a message comes in** to:
     ```text
     https://car-detailing-crm-backend.vercel.app/api/webhook/whatsapp
     ```
     (Method: `HTTP POST`).

* **Option B: Meta WhatsApp Cloud API (Official Meta for Developers)**:
  1. Go to [Meta for Developers](https://developers.facebook.com/) &rarr; Select your App &rarr; **WhatsApp** &rarr; **Configuration**.
  2. Under **Webhook**, click **Edit**:
     - **Callback URL**:
       ```text
       https://car-detailing-crm-backend.vercel.app/api/webhook/whatsapp
       ```
     - **Verify Token**:
       ```text
       signature_crm_verify_token
       ```
     - Click **Verify and Save**.
  3. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.
  4. In **WhatsApp** &rarr; **API Setup**:
     - Copy your **Phone Number ID** (e.g. `105938491...`).
     - Copy your **Temporary Access Token** (or generate a permanent System User Token in Business Settings &rarr; System Users &rarr; Generate Token with `whatsapp_business_messaging`).
  5. Add these two variables in your [Vercel Project Settings > Environment Variables](https://vercel.com/):
     - `WHATSAPP_TOKEN`: `<Your Meta Access Token>`
     - `WHATSAPP_PHONE_NUMBER_ID`: `<Your Phone Number ID>`
     - *(Optional)* `WHATSAPP_VERIFY_TOKEN`: `signature_crm_verify_token`

---

### Part 3: Phase 3 Verification Checklist

- [ ] **Framer Form Submission**: Fill in the form on `https://weekly-steps-579379.framer.app/` &rarr; verify `200 OK` and check that the new row appears in Supabase `leads` with `source: 'website'`.
- [ ] **WhatsApp Bot Test**: Send "Hi" from your phone to your WhatsApp business number &rarr; reply `1` &rarr; reply your name &rarr; verify that the lead appears in Supabase `leads` with `source: 'whatsapp'`.
- [ ] **CRM Status Follow-up**: Update `status` to `'contacted'` or `'scheduled'` via `PATCH /api/leads/:id/status` as your team works the lead.

---

## 📸 Phase 4: Instagram Direct Message Lead Bot Integration

Capture high-intent customer leads from Instagram Direct Messages directly into Supabase and view them in your CRM dashboard.

### How the Instagram Bot Works:
1. **User sends any DM**: Bot greets them and asks for their service of interest (`1. PPF`, `2. Ceramic Coating`, `3. Paint Correction`, `4. Interior Detailing`, `5. Full Detail`).
2. **User selects service**: Bot prompts for their Name and Phone number.
3. **User replies with Name & Phone**: Bot inserts the lead into `leads` with `source: 'instagram'`, sends a confirmation DM, and hands off to your team.

---

### Step-by-Step Meta Setup:

1. **Meta for Developers**: Go to [Meta for Developers](https://developers.facebook.com/) &rarr; Create or select your App (App Type: **Business**).
2. **Add Instagram Graph API**: Add the **Instagram Graph API** / **Messenger** product to your app.
3. **Set Webhook Callback URL**:
   - **Callback URL**:
     ```text
     https://car-detailing-crm-backend.vercel.app/api/webhook/instagram
     ```
   - **Verify Token**:
     ```text
     signature_crm_verify_token
     ```
   - Click **Verify and Save**.
4. **Subscribe to Fields**:
   - Subscribe to the `messages` and `messaging_postbacks` webhook fields.
5. **(Optional) Add Page Access Token for Auto-Reply**:
   - Generate a **Page Access Token** with `instagram_basic` and `instagram_manage_messages` permissions.
   - Add `INSTAGRAM_PAGE_ACCESS_TOKEN` in your Vercel Environment Variables.

---

## 🖥️ CRM Frontend Dashboard UI

A complete, production-ready dark-mode CRM dashboard is built and served directly from your backend at:

👉 **Live URL**: [`https://car-detailing-crm-backend.vercel.app/dashboard`](https://car-detailing-crm-backend.vercel.app/dashboard)  
👉 **Local URL**: `http://localhost:5000/dashboard`

### Dashboard Capabilities & Features:
1. **Live KPI Metric Cards**: Real-time counter for Total Leads, New Inquiries, Active Garage Jobs (Scheduled & In Progress), Completed Services, and Channel Split (WhatsApp vs. Website).
2. **Dual-View Modes**:
   - **Table View (📋)**: Real-time search, filters (Status, Service, Source), interactive status changers, and pagination.
   - **Kanban Board (📊)**: 5-column stage view (`New`, `Contacted`, `Scheduled`, `In Progress`, `Completed`) with quick-action cards.
3. **1-Click Customer Contact**:
   - 💬 **WhatsApp Button**: Opens WhatsApp Web / Mobile chat with an automatic pre-filled greeting.
   - 📞 **Direct Call Button**: Direct telephone dialer trigger.
4. **Manual Lead Entry ("Add Lead" Modal)**: Add walk-in, phone-in, or referral leads with instant validation and database sync.
5. **Export to CSV**: Download filtered leads into a `.csv` file with a single click.
6. **Zero Separate Setup**: Embedded directly in the backend repository under `public/`, fully responsive for mobile, tablet, and desktop.

---

## 🚀 Git Repository Setup & Push Guide

To push this codebase to a new GitHub repository:

1. Create a new repository on [GitHub](https://github.com/new) named `car-detailing-crm-backend` (leave "Initialize with README" unchecked).
2. Run the following commands in your terminal:

```bash
# 1. Initialize git and stage all files
git init
git add .

# 2. Commit the initial release
git commit -m "feat: complete Car Detailing CRM with WhatsApp & Instagram Meta bots and Dashboard UI"

# 3. Rename branch to main
git branch -M main

# 4. Link your remote GitHub repository
git remote add origin https://github.com/Archit453/car-detailing-crm-backend.git

# 5. Push to GitHub
git push -u origin main
```




