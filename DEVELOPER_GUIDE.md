# 🛠️ Car Detailing CRM - Developer Guide & Architecture Manual

Welcome to the **Car Detailing CRM & Lead Automation System** developer documentation. This manual provides a deep-dive reference for engineering, maintaining, extending, and deploying the system.

---

## 📑 Table of Contents

1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Local Development & Environment Setup](#2-local-development--environment-setup)
3. [Centralized Configuration (`src/config/env.js`)](#3-centralized-configuration-srcconfigenvjs)
4. [Database Architecture & Schema (`supabase/schema.sql`)](#4-database-architecture--schema-supabaseschema-sql)
5. [API Routes & Controller Reference](#5-api-routes--controller-reference)
6. [Meta WhatsApp Cloud API Integration](#6-meta-whatsapp-cloud-api-integration)
7. [Meta Instagram Direct Message Integration](#7-meta-instagram-direct-message-integration)
8. [Authentication & Session Security](#8-authentication--session-security)
9. [Automated Testing Suite (155 Tests)](#9-automated-testing-suite-155-tests)
10. [Deployment & Production Serverless Pipeline](#10-deployment--production-serverless-pipeline)

---

## 1. Architecture & System Overview

The system is built on a high-performance **Layered Serverless Architecture** using Node.js (ES Modules), Express, and Supabase PostgreSQL, designed to deploy seamlessly on Vercel Serverless Functions.

```
                  ┌─────────────────────────────────────────┐
                  │ Customer Channels (Web / WA / IG)      │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ Vercel Serverless / Express Router      │
                  └────────────────────┬────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌──────────────┐              ┌─────────────────┐             ┌──────────────────┐
│ Webhooks     │              │ Admin CRM UI    │             │ REST API         │
│ (WA & IG)    │              │ (/dashboard)    │             │ (/api/leads)     │
└──────┬───────┘              └────────┬────────┘             └────────┬─────────┘
       │                               │                               │
       └───────────────────────────────┼───────────────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ Supabase PostgreSQL Database            │
                  │ (leads, sessions, messages tables)      │
                  └─────────────────────────────────────────┘
```

### Core Design Principles:
* **Separation of Concerns**: Controllers handle business logic; middlewares enforce auth/validation; routes define endpoints; `env.js` manages configuration.
* **Single Configuration Source**: All tokens, keys, URLs, and phone numbers are managed through environment variables and mapped in `src/config/env.js`.
* **Zero Runtime Overhead**: Authentication uses stateless HMAC-SHA256 session signatures in HTTP-only cookies without requiring external session stores.
* **Database Resiliency**: Automated Vercel Cron jobs execute daily ping queries to keep the Supabase PostgreSQL database active and warm.

---

## 2. Local Development & Environment Setup

### Prerequisites
* **Node.js**: `v18.0.0` or higher (Node 22 recommended)
* **npm**: `v9.0.0` or higher
* **Git**

### Installation

```bash
# Clone repository
git clone https://github.com/Archit453/car-detailing-crm-backend.git
cd car-detailing-crm-backend

# Install dependencies
npm install

# Create local environment file
cp .env.example .env
```

### Running Locally

```bash
# Start development server with auto-reload (Nodemon)
npm run dev

# Start production HTTP server locally
npm start

# Run full 155-test suite
npm test
```

Local server listens at `http://localhost:5000`.

---

## 3. Centralized Configuration (`src/config/env.js`)

All system credentials, phone numbers, tokens, and business info are exposed via `config` from `src/config/env.js`:

```javascript
import { config } from './config/env.js';

// Access configuration values cleanly anywhere in the codebase:
const token = config.whatsapp.token;
const phoneId = config.whatsapp.phoneNumberId;
const website = config.business.websiteUrl;
```

### Environment Variable Mapping Table:

| Category | Env Variable Name | Default Fallback Value |
|---|---|---|
| **Server** | `PORT` | `5000` |
| **Server** | `NODE_ENV` | `development` |
| **Server** | `CORS_ORIGIN` | `*` |
| **Database** | `SUPABASE_URL` | `https://fgndnmgfcsceuxeuishf.supabase.co` |
| **Database** | `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| **Business** | `BUSINESS_NAME` | `Signature Detailing` |
| **Business** | `STUDIO_NAME` | `Creation Auto Detailing Studio` |
| **Business** | `WEBSITE_URL` | `https://weekly-steps-579379.framer.app/` |
| **Business** | `BUSINESS_PHONE` | `+91 98765 43210` |
| **WhatsApp** | `WHATSAPP_TOKEN` | `EAAPcKFDfS8s...` |
| **WhatsApp** | `WHATSAPP_PHONE_NUMBER_ID` | `1344182455438369` |
| **WhatsApp** | `WHATSAPP_VERIFY_TOKEN` | `signature_crm_verify_token` |
| **Instagram** | `INSTAGRAM_PAGE_ACCESS_TOKEN` | `IGAAO2AZAXVHNJ...` |
| **Instagram** | `INSTAGRAM_VERIFY_TOKEN` | `signature_crm_verify_token` |
| **Auth** | `ADMIN_USERNAME` | `admin` |
| **Auth** | `ADMIN_PASSWORD` | `SignatureCRM@2026!` |
| **Auth** | `SESSION_SECRET` | `crm_secret_key_signature_detailing_2026_super_secure` |

---

## 4. Database Architecture & Schema (`supabase/schema.sql`)

The database uses PostgreSQL hosted on Supabase.

### Tables & Relationships

#### 1. `public.leads`
Stores customer leads created via Framer website form, WhatsApp bot, Instagram DM bot, or manual admin entry.

```sql
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    service VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'website',
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimized query indexes
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_phone ON public.leads(phone);
```

#### 2. `public.whatsapp_sessions`
Tracks conversational state for active WhatsApp chat sessions.

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    phone VARCHAR(50) PRIMARY KEY,
    step VARCHAR(50) NOT NULL DEFAULT 'awaiting_service',
    selected_service VARCHAR(100),
    customer_name VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3. `public.whatsapp_messages`
Stores message history for the CRM Live Inbox and WhatsApp Business Mobile App coexistence sync.

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) DEFAULT 'Customer',
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('customer', 'bot', 'agent')),
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 4. `public.instagram_messages`
Stores Direct Message history for the CRM Instagram Live Inbox.

```sql
CREATE TABLE IF NOT EXISTS public.instagram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mid VARCHAR(255) UNIQUE,
    igsid VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) DEFAULT 'Instagram User',
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('customer', 'bot', 'agent')),
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. API Routes & Controller Reference

### Base Endpoints
* `GET /` — API status index & web browser redirect to `/dashboard`.
* `GET /health` — Health check endpoint returning uptime and environment status.
* `GET /login` — Serves administrative login page.
* `GET /dashboard` — Serves dark-theme CRM Kanban & Table Dashboard (Protected).

### Public Lead Ingestion
* `POST /api/leads` — Public endpoint used by Framer website forms and third-party webhooks to submit leads.

### Administrative API (Session Protected)
* `POST /api/auth/login` — Authenticates admin credentials and sets HTTP-only `crm_session` cookie.
* `POST /api/auth/logout` — Clears `crm_session` cookie.
* `GET /api/auth/me` — Verifies current active session state.
* `GET /api/leads` — Fetches paginated leads with filtering (`status`, `service`, `source`, `search`, `sortBy`).
* `GET /api/leads/:id` — Fetches a single lead by UUID.
* `PATCH /api/leads/:id/status` — Updates lead stage (`new`, `contacted`, `scheduled`, `in_progress`, `completed`, `cancelled`).
* `DELETE /api/leads/:id` — Deletes a lead record.

### CRM Live Inbox Endpoints
* `GET /api/inbox/whatsapp/conversations` — Retrieves WhatsApp conversation threads.
* `GET /api/inbox/whatsapp/messages/:phone` — Fetches message history for a phone number.
* `POST /api/inbox/whatsapp/send` — Sends outbound message from agent to customer on WhatsApp.
* `POST /api/inbox/whatsapp/bot-toggle` — Toggles bot auto-reply ON/OFF for a conversation.
* `GET /api/inbox/instagram/conversations` — Retrieves Instagram DM conversation threads.
* `POST /api/inbox/instagram/send` — Sends outbound Instagram DM to a numeric IGSID.

---

## 6. Meta WhatsApp Cloud API Integration

### Webhook Endpoints
* **GET `/api/webhook/whatsapp`**: Webhook verification handshake. Returns `hub.challenge` when `hub.verify_token` matches `config.whatsapp.verifyToken`.
* **POST `/api/webhook/whatsapp`**: Incoming webhook event listener for customer messages, interactive replies, coexistence phone app replies (`smb_message_echoes`), and media attachments.

### Supported Detailing Services:
1. `🛡️ PPF` (Paint Protection Film)
2. `✨ Ceramic Coating` (9H/10H Nano Armor)
3. `🚘 Paint Correction` (Swirl & Scratch Removal)
4. `🧼 Interior Detailing` (Steam Clean & Hygiene)
5. `🏎️ Full Detail Package` (Bumper-to-Bumper Transformation)

### Interactive Templates (Meta Cloud API Rules):
* **Button Template**: Maximum 3 buttons per bubble, title <= 20 chars.
* **List Template**: 2 Sections (`Exterior Protection`, `Interior & Full Detail`), row title <= 24 chars.

### Greetings & Session Reset Triggers:
Sending `"hi"`, `"hello"`, `"hey"`, `"hola"`, `"start"`, `"menu"`, `"services"`, `"reset"`, or `"restart"` automatically reactivates the bot and sends the interactive packages list.

---

## 7. Meta Instagram Direct Message Integration

### Webhook Endpoints
* **GET `/api/webhook/instagram`**: Verification handshake.
* **POST `/api/webhook/instagram`**: Listens for Instagram DMs, Carousel postback taps, Quick Replies, and Reel Comment mentions.

### Meta IGSID Delivery Rule:
Meta Instagram Graph API **requires a numeric Instagram-Scoped User ID (IGSID)** (e.g. `17841400123456789`) for outbound messages. Non-numeric username placeholders (e.g. `@john_doe`) are safely blocked with a clear warning.

---

## 8. Authentication & Session Security

The administrative CRM UI and API routes are secured via a lightweight, stateless HMAC-SHA256 token system:

1. Admin submits username & password to `POST /api/auth/login`.
2. Server validates credentials against `config.auth.adminUsername` and `config.auth.adminPassword`.
3. Server generates a signed session token: `username:expiry:signature` using `config.auth.sessionSecret`.
4. Token is stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie named `crm_session` valid for **30 days**.
5. `requireAuth` middleware validates the signature on every incoming administrative request.

---

## 9. Automated Testing Suite (155 Tests)

The repository includes a comprehensive integration and unit test suite in [`tests/api.test.js`](file:///c:/Users/USER/.gemini/antigravity/scratch/car-detailing-crm-backend/tests/api.test.js).

### Run Test Suite:

```bash
node tests/api.test.js
```

### Coverage Includes:
* Health check & route index endpoints
* Authentication login, session cookie validation, and logout
* Public lead creation & Zod body validation rules
* Admin lead CRUD, pagination, filtering, status updates, and deletions
* Meta WhatsApp webhook handshake, list replies, button taps, and coexistence echoes
* Meta Instagram webhook handshake, carousel postbacks, comment triggers, and IGSID validation
* Database keep-alive ping execution
* Error handling (400, 401, 404, 500)

---

## 10. Deployment & Production Serverless Pipeline

The backend is configured for serverless deployment on **Vercel**.

### Configuration Files:
* **`vercel.json`**: Specifies routes, rewrites to `api/index.js`, and Vercel Cron schedule (`0 4 * * *` for database keepalive).
* **`api/index.js`**: Imports `src/app.js` and exports it as a serverless request handler.

### Deploying to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Push environment variables
cmd /c "echo EAAPcKFDfS8s...| npx -y vercel env add WHATSAPP_TOKEN production"
cmd /c "echo 1344182455438369| npx -y vercel env add WHATSAPP_PHONE_NUMBER_ID production"

# Deploy to production
npx -y vercel --prod --yes
```

Production API & CRM Dashboard URL:  
`https://car-detailing-crm-backend.vercel.app`
