> **Audience:** Contributors and developers navigating the source code.
> For deployment, API reference, and data architecture, see [`docs/developer/ARCHITECTURE.md`](./developer/ARCHITECTURE.md).

# Answering Service Module

**Last Updated:** 2026-03-26
**Version:** 1.6.0
**Status:** ✅ Active

---

## Overview

A white-label customer portal and operator admin for answering service businesses. Includes:

- **Client portal** — onboarding wizard, dashboard, messages/call logs, on-call scheduling, billing, settings
- **Operator platform** — client provisioning, branding management, billing templates, usage ingest, API keys and webhooks, telephony integration guide

All data is multi-tenant, scoped by `business_id`, enforced at both the application and RLS layers.

See the README for integration status (connecting a live telephony or billing provider).

---

## Client Portal

### Onboarding Wizard (`/answering-service/setup`)

**Location:** `app/(platform)/answering-service/setup/`, `components/answering-service/`

**Purpose:** 6-step guided configuration for new customers

**Steps:**
1. **Profile** — Business info, industry, contact details
2. **Greeting Script** — What callers hear when they call
3. **Business Hours** — Timezone, schedule, after-hours configuration
4. **Call Types** — Industry-specific call handling rules
5. **Message Delivery** — Notification preferences per call type
6. **Escalation Rules** — Emergency criteria and contacts

**Key Files:**
- `SetupWizardClient.tsx` — Main wizard orchestrator with state management
- `components/answering-service/steps/*.tsx` — Individual step components
- `WizardProgress.tsx` — Progress indicator
- `PathSelector.tsx` — Self-serve vs. concierge path selection
- `schemas/answeringServiceSchema.ts` — Zod validation schemas
- `lib/services/answering-service/wizardService.ts` — Database persistence

**Database:** `answering_service_wizard_sessions` — stores session state, current step, form data (JSONB), and build/onboarding status.

**Features:**
- Industry pre-population (Legal, Medical, Home Services, Real Estate, Professional Services)
- LLM-powered contextual coach (`/api/answering-service/coach`)
- Cal.com integration for concierge booking
- Build spec output with Mermaid diagrams
- Session auto-save and resume from any step

---

### Customer Dashboard (`/answering-service/dashboard`)

**Location:** `app/(platform)/answering-service/dashboard/`

**Features:** Summary cards (calls, balance, payment), recent activity feed, unread message indicator, onboarding status banner, Dashboard AI Helper.

**Key Files:** `AnsweringServiceDashboardClient.tsx`, `DashboardSummaryCard.tsx`, `RecentActivityFeed.tsx`, `DashboardHelper.tsx`

---

### Messages (`/answering-service/messages`)

**Location:** `app/(platform)/answering-service/messages/`

**Features:** Search, All / Unread / Priority tab filter, split view (call list + transcript), color-coded priority badges, QA flag, message actions (read/resolve).

---

### On-Call Scheduling (`/answering-service/on-call`)

**Location:** `app/(platform)/answering-service/on-call/`

**Features:** Contacts tab (reusable contact book), Shifts tab (weekly recurring windows with escalation chains), current coverage status card, overnight shift support.

**Public API:** `GET /api/v1/on-call/current` — see README for request/response format.

---

### Billing (`/answering-service/billing`)

**Location:** `app/(platform)/answering-service/billing/`

**Features:** Running monthly estimate, invoice history rows, day-of-month sub-text.

---

### Settings (`/answering-service/settings`)

**Location:** `app/(platform)/answering-service/settings/`

**Features:** API key manager — create with label, list active keys, revoke per-key.

---

### Auth Pages

**Location:** `app/(auth)/`

| Route | Purpose |
|-------|---------|
| `/login` | Email/password + magic link sign-in (two-panel layout) |
| `/login/forgot-password` | Send reset email |
| `/login/reset-password` | Set new password (magic-link redirect target) |
| `/login/magic-link-sent` | Confirmation screen after magic link email sent |

---

## Operator Platform

### Clients (`/operator/clients`)

**Location:** `app/(operator)/operator/clients/`

**Purpose:** View and manage all client businesses for the operator org.

**Features:**
- Health score table (computed: login recency, open high-priority calls, reviewed-within-7d %, onboarding status)
- Filter tabs: All / At risk / Inactive
- Internal search

**Key Files:**
- `components/operator/ClientTable.tsx` — Table with search + filter tabs
- `lib/services/operator/operatorService.ts` — `getClientsWithHealthScores()`

---

### Add Client (`/operator/clients/new`)

**Location:** `app/(operator)/operator/clients/new/`

**Purpose:** Operator provisions a new client business and sends them a magic-link invite.

**Flow:**
1. Operator fills in: business name, contact email, optional billing template
2. Server action creates the `businesses` row
3. `auth.admin.inviteUserByEmail()` sends a Supabase invite email (redirect → `/answering-service/setup`)
4. `users_businesses` row created with `role: 'owner'`
5. Billing template applied (if selected)
6. Redirect to the new client detail page

**Key Files:**
- `page.tsx` — Server component, fetches templates
- `actions.ts` — `createClientAction` server action
- `components/operator/NewClientForm.tsx` — Client component with `useActionState`

**Requirement:** `SUPABASE_SERVICE_ROLE_KEY` must be set — the invite uses the Supabase Admin API.

---

### Client Detail (`/operator/clients/[id]`)

**Location:** `app/(operator)/operator/clients/[id]/`

**Tabs:**
- **Overview** — Health score breakdown, last login, call stats, Who to Call (current on-call)
- **Billing** — Billing rules for this client
- **Calls** — 10 most recent calls
- **Settings** — Active API keys, health score override, portal access (owner email + Resend invite button)

**Key Files:**
- `page.tsx` — Server component, fetches `ClientDetail` and passes `resendInviteAction`
- `actions.ts` — `resendInviteAction` server action
- `components/operator/ClientDetailTabs.tsx` — Client component with tabs + resend UI

---

### Integrations (`/operator/integrations`)

**Location:** `app/(operator)/operator/integrations/page.tsx`

**Purpose:** Step-by-step guide for connecting a telephony platform to the portal via `POST /api/v1/calls`.

**Sections:**
1. How it works
2. Step 1 — Create an API key
3. Step 2 — Configure your platform's outbound webhook (URL, headers, JSON body template, callType note)
4. Step 3 — Find your business ID
5. CSV fallback

---

### Usage (`/operator/usage`)

**Location:** `app/(operator)/operator/usage/`

**Features:** CSV drag-and-drop dropzone, call-log upload, upload history table.

---

### Billing Templates (`/operator/billing-templates`)

**Location:** `app/(operator)/operator/billing-templates/`

**Features:** Create, list, and delete billing rule templates. Apply a template to a client during provisioning (Add Client flow) or manually.

**Key File:** `lib/services/operator/billingTemplateService.ts` — `listTemplates`, `createTemplate`, `deleteTemplate`, `applyTemplateToClient`

---

### API & Webhooks (`/operator/api-webhooks`)

**Location:** `app/(operator)/operator/api-webhooks/`

**Features:** Operator-scoped API key management (scopes: `calls:write`, `on_call:read`), webhook subscription builder (URL, events, active toggle).

---

### Settings (`/operator/settings`)

**Location:** `app/(operator)/operator/settings/`

**Purpose:** Editable portal branding for white-label deployments.

**Editable fields:**
| Field | DB column | Notes |
|-------|-----------|-------|
| Portal name | `operator_orgs.name` | Shown in client sidebar |
| Brand color | `operator_orgs.branding.primary_color` | CSS `--color-primary` override |
| Logo URL | `operator_orgs.branding.logo_url` | Replaces initials badge in client sidebar |
| Support email | `operator_orgs.settings.support_email` | Stored for future use |

**Key Files:**
- `page.tsx` — Server component, fetches org data
- `actions.ts` — `saveBrandingAction` (merge-patches JSONB, uses service role)
- `components/operator/SettingsBrandingForm.tsx` — Client component with color picker + `useActionState`

---

## API Routes

### Session-authenticated (Supabase session cookie)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/answering-service/coach` | POST | Onboarding wizard AI coach (rate limited) |
| `/api/answering-service/dashboard-coach` | POST | Dashboard AI helper (rate limited) |
| `/api/answering-service/billing/estimate` | GET | Running billing estimate |
| `/api/answering-service/billing/invoices` | GET | Invoice list |
| `/api/answering-service/billing/invoices/[id]` | GET | Invoice detail |
| `/api/answering-service/messages` | GET | Call log list |
| `/api/answering-service/messages/[id]` | GET/PATCH | Message detail + status update |
| `/api/answering-service/messages/[id]/flag-qa` | POST | QA flag a message |
| `/api/answering-service/dashboard` | GET | Dashboard summary |
| `/api/v1/internal/on-call/contacts` | GET/POST | On-call contact CRUD |
| `/api/v1/internal/on-call/contacts/[id]` | PUT/DELETE | Contact update/delete |
| `/api/v1/internal/on-call/shifts` | GET/POST | Shift CRUD |
| `/api/v1/internal/on-call/shifts/[id]` | PUT/DELETE | Shift update/delete |
| `/api/v1/internal/on-call/timezone` | PUT | Business timezone update |

### Bearer-token authenticated (API key with scope)

| Route | Method | Scope | Purpose |
|-------|--------|-------|---------|
| `/api/v1/calls` | POST | `calls:write` | Ingest call log(s) |
| `/api/v1/calls/[id]` | GET | `calls:read` | Get call by ID |
| `/api/v1/calls/[id]/recording` | GET | `calls:read` | Get call recording |
| `/api/v1/on-call/current` | GET | `on_call:read` | Current on-call contact |
| `/api/v1/billing/estimate` | GET | `billing:read` | Running billing estimate |
| `/api/v1/billing/invoices` | GET | `billing:read` | Invoice list |
| `/api/v1/usage` | POST | `usage:write` | CSV usage ingest |
| `/api/v1/openapi.json` | GET | — | OpenAPI spec |
| `/api/v1/webhooks` | GET/POST | — | Webhook subscription management |
| `/api/v1/webhooks/[id]` | PUT/DELETE | — | Webhook update/delete |

---

## Database Schema

### Key tables

| Table | Purpose | Migration |
|-------|---------|-----------|
| `businesses` | Tenant root — every row scoped to a business | bootstrap |
| `users_businesses` | User ↔ business membership (role, last_login_at) | bootstrap |
| `answering_service_wizard_sessions` | Wizard session state | 20260108125310 |
| `call_logs` | Inbound/outbound call records | 20260310100100 |
| `message_actions` | Read/resolve/flag actions on call logs | 20260310100200 |
| `billing_rules` | Per-business billing rules (flat, bucket, per-call) | 20260310100300 |
| `billing_periods` | Monthly usage/billing periods | 20260310100400 |
| `operator_orgs` | Operator organization (name, branding JSONB, settings JSONB) | 20260311100000 |
| `operator_users` | Operator user ↔ org membership | 20260311100000 |
| `usage_periods` | CSV-ingested usage data | 20260311100100 |
| `api_keys` | Scoped API keys (business or operator) | 20260311100200 |
| `webhook_subscriptions` | Webhook endpoint registrations | 20260311100300 |
| `billing_rule_templates` | Reusable billing rule templates | 20260311100400 |
| `on_call_contacts` | On-call contact book | 20260312100000 |
| `on_call_shifts` | Weekly recurring on-call shifts | 20260312100000 |

---

## Service Layer

### Client portal — `lib/services/answering-service/`

| File | Exports |
|------|---------|
| `wizardService.ts` | `getOrCreateSession`, `updateSession`, `completeSession`, `abandonSession` |
| `onCallService.ts` | `getContacts`, `createContact`, `updateContact`, `deleteContact`, `getShifts`, `createShift`, `updateShift`, `deleteShift`, `getBusinessTimezone`, `updateBusinessTimezone` |
| `onCallScheduler.ts` | `resolveActiveShift` (pure — no I/O) |
| `billingService.ts` | `getBillingEstimate`, `getInvoices`, `getInvoiceById` |
| `messageService.ts` | `getMessages`, `getMessage`, `updateMessageStatus`, `flagMessageQA` |
| `dashboardService.ts` | `getDashboardSummary`, `getUnreadMessageCount` |
| `billingEngine.ts` | Pure billing calculation logic (no I/O) |

### Operator platform — `lib/services/operator/`

| File | Exports |
|------|---------|
| `operatorService.ts` | `getClientsWithHealthScores`, `getClientDetail`, `getClientOnCallStatus`, `computeHealthScore` |
| `billingTemplateService.ts` | `listTemplates`, `createTemplate`, `deleteTemplate`, `applyTemplateToClient` |
| `apiKeyService.ts` | `listApiKeys`, `createApiKey`, `revokeApiKey` |
| `webhookService.ts` | `listWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook` |
| `callIngestService.ts` | `ingestCalls` (from bearer-token API) |
| `usageIngestService.ts` | `ingestUsageCsv` |
| `priorityEngine.ts` | `computeCallPriority` (pure) |

---

## Demo Accounts (from `npm run seed`)

| Portal | Email | Password |
|--------|-------|----------|
| Client (Riverside Law Group) | `demo@example.com` | `demo-password-2026` |
| Operator (Answer First) | `operator@example.com` | `operator-password-2026` |

The seed also creates 5 additional client businesses under the operator org and seeds late-March call data with story calls for demo purposes.

---

## Features Summary

### Implemented ✅

- 6-step onboarding wizard with auto-save and AI coach
- Session persistence and resume from any step
- Industry-specific pre-population
- Dashboard with live Supabase data
- Billing invoice viewing (live Supabase)
- Message/call log viewing with search and priority filter (live Supabase)
- On-call scheduling (contacts, shifts, escalation chains, overnight support)
- Public on-call API for telephony integration
- Call rating system
- Cal.com integration for concierge booking
- Operator platform: client provisioning (Add Client + magic-link invite)
- Operator platform: client detail with health scores, calls, billing, resend invite
- Operator platform: billing templates CRUD + apply to client
- Operator platform: operator-scoped API key management
- Operator platform: webhook subscription management
- Operator platform: CSV call-log and usage ingest
- Operator platform: telephony integration guide (webhook / REST API)
- Operator platform: editable portal branding (name, color, logo, support email)
- Runtime branding injection — client portal inherits operator branding from database

### Future Enhancements ⏳

- Production HIPAA compliance (PHI masking, audit log persistence)
- Multi-user access per business
- Real-time webhook delivery
- Redis/Upstash rate limiting (replace in-memory Map)
- Supabase package type alignment (unblock typed DB clients)

---

**Last Updated:** 2026-03-26
