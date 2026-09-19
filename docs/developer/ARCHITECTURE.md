# Architecture Reference

Technical reference for developers maintaining or extending the Answering Service Portal.

---

## 1. System Overview

The portal is a two-sided SaaS platform. **Operators** (answering service companies) deploy and configure it. **End users** (their clients — law firms, medical offices, etc.) log in to view their calls.

```
Telephony System (StarTel, Amtelco, etc.)
         │
         │  outbound webhook or HTTP POST
         ▼
     POST /api/v1/calls  ──►  call_logs (Postgres)
      Bearer token,                    │
      calls:write scope                │
                                       ▼
                           Supabase Realtime
                                  │
             ┌────────────────────┴──────────────────┐
             ▼                                        ▼
   Client portal                          Operator activity feed
   (unread toast,                         (OperatorActivityFeed)
    dashboard count)

Supabase Auth (magic link / password)
         │
         ▼
    middleware.ts
    ├── custom domain → x-operator-org-id header
    ├── unauthenticated → redirect /login
    └── operator user → /operator/*, client user → /answering-service/*

    app/(auth)/login → sign in / magic link / forgot / reset
    app/(platform)/answering-service/* → client portal
    app/(operator)/operator/*            → operator admin
```

```mermaid
flowchart TD
    Tel[Telephony System] -->|outbound webhook| API[POST /api/v1/calls]
    API -->|INSERT call_logs| DB[(Supabase Postgres)]
    DB -->|Realtime postgres_changes| RT[Supabase Realtime]
    RT --> CP[Client Portal Dashboard/Messages]
    RT --> OF[Operator Activity Feed]
    Op[Operator] -->|provisions client| Portal[/operator/clients/new]
    Portal -->|inviteUserByEmail| Email[Magic Link Email]
    Email -->|auth/callback| Wizard[Setup Wizard]
    Wizard --> CP
```

---

## 2. Database Schema

All tables live in the `public` schema. Run migrations in filename order.

### Core tables

| Table | Key columns | Notes |
|---|---|---|
| `businesses` | `id`, `name`, `operator_org_id`, `enabled_modules`, `on_call_timezone`, `health_score_override`, `churned_at` | One row per operator client. `operator_org_id` links to the deploying operator. |
| `users_businesses` | `user_id`, `business_id`, `role`, `last_login_at` | Junction: links Auth users to businesses. Roles: `owner`, `admin`, `member`. `last_login_at` drives "new" message detection. |
| `operator_orgs` | `id`, `name`, `slug`, `plan`, `status`, `branding` (JSONB), `settings` (JSONB) | One row per answering service company. `branding` holds `primary_color`, `logo_url`, `custom_domain`. |
| `operator_users` | `operator_org_id`, `user_id`, `role` | Junction: links Auth users to operator orgs. Roles: `admin`, `viewer`. |

### Call data

| Table | Key columns | Notes |
|---|---|---|
| `call_logs` | `id`, `business_id`, `operator_org_id`, `timestamp`, `call_type`, `direction`, `duration_seconds`, `telephony_status`, `message`, `has_recording`, `priority`, `portal_status` | Immutable. `operator_org_id` added in Sprint 3 for cross-client operator queries and Realtime filtering. `has_recording` is a boolean; signed URLs are generated on demand from Supabase Storage. |
| `message_actions` | `call_log_id`, `type`, `by_user_id`, `at`, `from_value`, `to_value` | Append-only audit log. Types: `priority_updated`, `status_changed`, `flagged_qa`. |

### Billing

| Table | Key columns | Notes |
|---|---|---|
| `billing_rules` | `business_id`, `type`, `name`, `amount`, `active` | Per-business billing rule. Types: `per_call`, `per_minute`, `flat_monthly`, `bucket`. |
| `billing_periods` | `business_id`, `period_start`, `period_end`, `total_calls`, `total_minutes`, `status` | Finalized invoice periods. |
| `billing_rule_templates` | `operator_org_id`, `name`, `rules` (JSONB) | Reusable templates. Applying a template clones its rules into `billing_rules` for a business. |
| `usage_periods` | `operator_org_id`, `business_id`, `period_date`, `total_calls`, `total_minutes`, `source`, `status`, `raw_file_url` | Upload history from CSV ingest. |

### On-call scheduling

| Table | Key columns | Notes |
|---|---|---|
| `on_call_contacts` | `business_id`, `name`, `phone`, `role`, `notes`, `display_order` | Contact book per business. |
| `on_call_shifts` | `business_id`, `name`, `days_of_week` (int[]), `start_time`, `end_time`, `escalation_steps` (JSONB), `active` | Weekly recurring shifts. `escalation_steps` is an ordered array of `{contactId, waitMinutes}`. |

### API & webhooks

| Table | Key columns | Notes |
|---|---|---|
| `api_keys` | `key_hash`, `label`, `scopes` (JSONB), `business_id` or `operator_org_id`, `revoked_at` | SHA-256 hash only — raw key never stored. Exactly one owner (business OR operator, not both). |
| `webhook_subscriptions` | `operator_org_id`, `url`, `secret`, `topics` (text[]), `status`, `consecutive_failure_count` | HMAC signing secret is write-only. |
| `webhook_deliveries` | `subscription_id`, `topic`, `payload`, `response_status`, `delivered_at` | Append-only delivery audit log. |

### Auth / onboarding

| Table | Key columns | Notes |
|---|---|---|
| `wizard_sessions` | `business_id`, `user_id`, `current_step`, `path_selected`, `wizard_data` (JSONB), `status` | Persists wizard progress. |
| `sms_rate_limits` | `business_id`, `window_start`, `count` | Rate limiting for SMS (in-memory map + DB fallback). |

### RLS summary

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `businesses` | Own business (via `users_businesses`) + own org (via `operator_users`) | Service role only |
| `call_logs` | Own business + own operator org (Sprint 3) | Service role only |
| `operator_orgs` | Own org (via `operator_users`) | Service role only |
| `operator_users` | Own row | Service role only |
| `api_keys` | Own business keys or own org keys | Service role only |
| `webhook_subscriptions` | Own org | Service role only |
| `on_call_contacts` / `on_call_shifts` | Own business + own org | Service role only |

---

## 3. Auth Flow

### Login (`middleware.ts`)

1. On every request (excluding static assets and API routes), middleware runs.
2. Creates a Supabase SSR client from request cookies.
3. **Custom domain check** (Sprint 3): if the `host` header differs from `NEXT_PUBLIC_APP_URL`'s host and isn't localhost, queries `operator_orgs` where `branding->>custom_domain = host`. Sets `x-operator-org-id` header for layout consumption.
4. Root path (`/`) on a custom domain is rewritten to `/answering-service` with the org ID header.
5. Calls `supabase.auth.getUser()`.
6. Authenticated user hitting `/login` → redirected to `/operator/clients` (if operator) or `/answering-service` (if client).
7. Unauthenticated user on a protected route → redirected to `/login?next=<path>`.

### Server-side context helpers (`lib/auth/server.ts`)

| Function | Returns | Purpose |
|---|---|---|
| `getUser()` | `{ id, email }` or null | Authenticated user identity |
| `getBusinessContext()` | `{ businessId, userId, role }` or null | Client portal: looks up `users_businesses` |
| `getOperatorContext()` | `{ operatorOrgId, userId, role }` or null | Operator portal: looks up `operator_users` |
| `checkOperatorAccessOrThrow()` | `OperatorContext` | Calls `redirect('/login')` if no operator context |

### Sign-in action (`app/(auth)/login/actions.ts`)

- `signInWithPassword`: signs in with email+password, checks `operator_users`, redirects to operator or client portal.
- `sendMagicLink`: fires Supabase OTP email, redirects to `/login/magic-link-sent`.
- `sendPasswordResetEmail` / `resetPassword`: standard Supabase reset flow.

---

## 4. API Reference

### Public API (`/api/v1/*`) — Bearer token auth

All public API endpoints validate `Authorization: Bearer <key>` via `lib/api/bearerAuth.ts`. The key is hashed (SHA-256) and looked up in `api_keys`. The `revoked_at` column must be null.

#### `POST /api/v1/calls`

Ingest one or more call records. Used by telephony system webhooks and custom adapters.

- **Auth:** Bearer token with `calls:write` scope. Must be an **operator-scoped** key.
- **Content-Type:** `application/json` (JSON array) or `multipart/form-data` (CSV file upload).
- **Request (JSON):**
  ```json
  [
    {
      "businessId": "uuid",
      "timestamp": "2026-03-26T14:30:00Z",
      "callerName": "John Smith",
      "callerNumber": "+15555550100",
      "callbackNumber": "+15555550100",
      "callType": "urgent",
      "direction": "inbound",
      "durationSeconds": 180,
      "telephonyStatus": "completed",
      "message": "Caller reports chest pain, requesting callback from Dr. Jones.",
      "recordingUrl": "https://storage.example.com/recordings/abc.mp3"
    }
  ]
  ```
- **Response (201 / 207):**
  ```json
  {
    "data": {
      "inserted": 1,
      "errors": 0,
      "results": [{ "businessId": "uuid", "status": "inserted", "callId": "uuid" }]
    }
  }
  ```
- **Notes:** `callType` must be one of: `urgent`, `new-client`, `appointment`, `general-info`, `after-hours`. `message` must be non-empty. Returns 207 if any rows failed.

#### `GET /api/v1/calls`

List call logs for a business.

- **Auth:** Bearer token with `calls:read` scope. Operator keys require `?business_id=<uuid>`.
- **Query params:** `page` (default 1), `limit` (default 25, max 100), `business_id` (required for operator keys).
- **Response (200):**
  ```json
  {
    "data": [...],
    "meta": { "page": 1, "limit": 25, "total": 143 }
  }
  ```

#### `GET /api/v1/calls/:id`

Get a single call log.

- **Auth:** Bearer token with `calls:read` scope.

#### `GET /api/v1/calls/:id/recording`

Get a signed URL for a call recording.

- **Auth:** Bearer token with `calls:read` scope.
- **Response:** `{ "data": { "signedUrl": "https://..." } }` or 404 if no recording.

#### `GET /api/v1/on-call/current`

Get the currently active on-call contact for a business.

- **Auth:** Bearer token with `on_call:read` scope.
- **Query params:** `business_id` (required for operator keys).
- **Response:**
  ```json
  {
    "data": {
      "businessId": "uuid",
      "asOf": "2026-03-26T14:30:00Z",
      "shiftId": "uuid",
      "shiftName": "Weeknight",
      "shiftEndsAt": "2026-03-26T09:00:00Z",
      "escalationSteps": [
        { "step": 1, "name": "Dr. Smith", "phone": "555-0100", "role": "Physician", "waitMinutes": 5 }
      ]
    }
  }
  ```
- Returns `{ "shiftId": null, "escalationSteps": [] }` when no shift is active.

#### `GET/POST /api/v1/billing/estimate` and `/api/v1/billing/invoices`

Billing data endpoints. Bearer token with `billing:read` scope.

#### `POST /api/v1/usage` (CSV upload)

Upload usage CSV for ingest. Bearer token with `usage:write` scope.

### Session-auth API (`/api/answering-service/*`)

These routes use the Supabase session cookie and are for the client portal only.

| Route | Method | Purpose |
|---|---|---|
| `/api/answering-service/dashboard` | GET | Dashboard summary (unread count, stats, chart data) |
| `/api/answering-service/messages` | GET | Call log list |
| `/api/answering-service/messages/:id` | GET | Single call with recording signed URL |
| `/api/answering-service/messages/:id/flag-qa` | POST | Flag a call for QA review |
| `/api/answering-service/billing/estimate` | GET | Running billing estimate |
| `/api/answering-service/billing/invoices` | GET | Invoice list |
| `/api/answering-service/billing/invoices/:id` | GET | Invoice detail with line items |
| `/api/answering-service/coach` | POST | Setup wizard AI coach |
| `/api/answering-service/dashboard-coach` | POST | Dashboard account support helper |

### AI Assistants

Both coach routes are session-authenticated, Node.js runtime, rate-limited to 10 req/min per business (in-memory Map — replace with Redis/Upstash for high-traffic production).

**Setup Wizard Coach** (`/api/answering-service/coach`)
Answers questions about the current wizard step. Injects step name, step number, industry, business name, a `{{formSnapshot}}` (human-readable summary of what the user has filled in so far), and `{{stepGuidance}}` (step-specific coaching instructions) into the system prompt loaded from `prompts/wizard-coach.md`.

**Dashboard Helper** (`/api/answering-service/dashboard-coach`)
Account support chat on the client dashboard. Fetches live account data before each response and injects business name, unread message count, calls this week, current month estimate, and priority message count into the system prompt loaded from `prompts/dashboard-coach.md`. Fails open if the data fetch throws — coach still works without live data.

**Prompt customisation:** Edit the files in `prompts/` to change tone, industries, terminology, or scope — no code changes needed. See [`docs/ai-customization.md`](../ai-customization.md) for full variable reference and worked examples.

**Environment variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | — | Required. API key for your LLM provider. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name. Any model your provider supports. |
| `OPENAI_BASE_URL` | _(OpenAI)_ | Base URL for any OpenAI-compatible endpoint (Ollama, Groq, Azure, etc.) |
| `PORTAL_NAME` | `Answering Service Portal` | Service name injected as `{{serviceName}}` in both prompts. |
| `AI_SERVICE_DESCRIPTION` | `answering service` | Short description injected as `{{serviceDesc}}` in both prompts. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@example.com` | Injected as `{{supportEmail}}` in dashboard-coach prompt. |
| `NEXT_PUBLIC_SUPPORT_PHONE` | _(none)_ | Injected as `{{supportPhone}}` in dashboard-coach prompt. |

If `OPENAI_API_KEY` is unset, both routes return `401` and the UI suppresses the chat panel.

### Internal on-call CRUD (`/api/v1/internal/on-call/*`)

Session-auth routes used by the wizard and on-call page.

- `GET/POST /api/v1/internal/on-call/contacts` — list / create contacts
- `PUT/DELETE /api/v1/internal/on-call/contacts/:id`
- `GET/POST /api/v1/internal/on-call/shifts`
- `PUT/DELETE /api/v1/internal/on-call/shifts/:id`
- `PUT /api/v1/internal/on-call/timezone`

---

## 5. Services Layer

### Client portal — `lib/services/answering-service/`

| Service | Purpose |
|---|---|
| `messageService.ts` | Fetches call logs with message_actions joined. Marks `last_login_at` on load. Generates signed recording URLs from Supabase Storage. Handles priority updates and QA flags with audit log inserts. |
| `dashboardService.ts` | Builds `DashboardSummary`: unread count, top unread messages, weekly call stats, 7-day call-by-day chart data. Sprint 3 adds `callsByHour` (24-bucket histogram, last 30 days) and `callTypeBreakdown` (ranked list, last 30 days). |
| `billingService.ts` | Loads `billing_periods` as invoices and computes a running estimate from `billing_rules` + current month's `call_logs`. |
| `wizardService.ts` | Creates or resumes `wizard_sessions`. Persists step progress as JSONB (`wizard_data`). |
| `onCallService.ts` | CRUD for `on_call_contacts` and `on_call_shifts`. Reads/writes business timezone. |
| `onCallScheduler.ts` | Pure function — no I/O. Resolves the active shift for a given `Date` and timezone using `date-fns-tz`. Handles overnight shifts (cross-midnight). |
| `billingEngine.ts` | Pure function — no I/O. Calculates billable amounts from rules and call counts/minutes. |
| `verticalPresets.ts` | Returns wizard template defaults for different business verticals (medical, legal, etc.). |

### Operator platform — `lib/services/operator/`

| Service | Purpose |
|---|---|
| `operatorService.ts` | `getClientsWithHealthScores()` — returns all businesses with computed health scores. `getClientDetail()` — deep detail including recent calls, billing rules, API keys, on-call status. Health score is a formula over login recency (40 pts), unresolved high-priority calls (30 pts), recent review activity (20 pts), and onboarding completion (10 pts). |
| `billingTemplateService.ts` | CRUD for `billing_rule_templates`. `applyTemplateToClient(operatorOrgId, templateId, businessId)` — copies template rules into `billing_rules` for the target business. |
| `apiKeyService.ts` | Creates API keys (generates random bytes, stores SHA-256 hash). Revokes by setting `revoked_at`. |
| `webhookService.ts` | CRUD for `webhook_subscriptions`. `fireWebhookEvent()` — delivers an event to all matching subscriptions for an operator org; signs the payload with HMAC-SHA256; updates `consecutive_failure_count` on failure. |
| `callIngestService.ts` | Validates and inserts call records from the public API. Assigns priority via `priorityEngine`. Fires `call.created` webhook events. Includes CSV parser. |
| `usageIngestService.ts` | Processes uploaded CSV usage periods into `usage_periods`. |
| `priorityEngine.ts` | Maps `callType` slugs to `high` / `medium` / `low` priority. Extensible with custom rules. |

---

## 6. White-label Model

Branding flows from `operator_orgs.branding` (a JSONB column) through the rendering pipeline:

1. **Storage:** `operator_orgs.branding` JSONB holds `primary_color`, `logo_url`, `custom_domain`, `secondary_color`.
2. **Operator settings page** (`/operator/settings`): `saveBrandingAction` does a `JSONB || new_values` merge-patch so unset fields are preserved.
3. **Client portal layout** (`app/(platform)/answering-service/layout.tsx`):
   - Loads the business's `operator_org_id` from `businesses`.
   - Falls back to the `x-operator-org-id` header (set by middleware for custom domain requests).
   - Fetches `operator_orgs.name` and `operator_orgs.branding`.
   - Sets `--color-primary` as an inline CSS variable on the root `<div>`.
   - Passes `brandName` and `logoUrl` props to `SideNav`.
4. **SideNav** (`components/answering-service/SideNav.tsx`): shows `logoUrl` as `<img>` if set, otherwise falls back to initials badge.
5. **Env var fallbacks** (`lib/config/portal.ts`): `PORTAL_NAME`, `PORTAL_BRAND_COLOR`, `PORTAL_LOGO_URL` — used when no database branding exists (fresh deployments).

---

## 7. Realtime Subscriptions

The app uses Supabase Realtime `postgres_changes` for live push. Realtime must be enabled on `call_logs` in the Supabase dashboard (Realtime → Tables → call_logs).

| Subscriber | Channel name | Filter | Effect |
|---|---|---|---|
| `AnsweringServiceDashboardClient` | `dashboard_calls_{businessId}` | `business_id=eq.{businessId}` | Increments unread count, fires toast on high-priority |
| `MessagesClient` | `messages_calls_{businessId}` | `business_id=eq.{businessId}` | Prepends new message to list, fires toast, calls `markUnread()` in context |
| `OperatorActivityFeed` | `operator_activity_{operatorOrgId}` | `operator_org_id=eq.{operatorOrgId}` | Prepends new event to feed (capped at 50), fires toast for high-priority |

**Cleanup pattern:** All subscriptions return a cleanup function that calls `supabase.removeChannel(channel)`. This is wrapped in a `useEffect` return.

**UnreadMessagesContext** (`lib/context/unread-messages-context.tsx`): provides `hasUnread` state and `markUnread()` action across the client portal. `SideNav` reads `hasUnread` to show the badge on the Messages nav item. Initialized in the layout with `initialHasUnread={unreadCount > 0}` from the server.

---

## 8. Deployment

### Required environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Project URL (Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Service role key (server-side only)

# App
NEXT_PUBLIC_APP_URL=                # Production URL, e.g. https://portal.answerfirst.com
                                    # Used for invite email redirect links and custom domain resolution

# OpenAI (AI coach)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini            # Optional override

# Custom domains (Sprint 3)
VERCEL_API_TOKEN=                   # Vercel API token for programmatic domain registration
VERCEL_PROJECT_ID=                  # Vercel project ID

# White-label fallbacks (used when operator org has no DB branding)
PORTAL_NAME=
PORTAL_BRAND_COLOR=
PORTAL_LOGO_URL=

# Module access (set to "true" for standalone deployments)
STANDALONE_MODE=true
```

### Supabase project setup

1. Create a new project at supabase.com.
2. Enable **Row Level Security** — it's on by default for new tables but verify.
3. Apply migrations in filename order via the SQL editor or `npx supabase db push`.
4. Enable **Realtime** on the `call_logs` table (Realtime → Tables → call_logs → Enable).
5. Set up a `call-recordings` private Storage bucket for voicemail recordings (optional).

### Vercel deployment

1. Connect the GitHub repo to a Vercel project.
2. Set all required environment variables in Vercel (Project Settings → Environment Variables).
3. `SUPABASE_SERVICE_ROLE_KEY` is especially important — invite emails and API key creation fail without it.
4. `NEXT_PUBLIC_APP_URL` must match the production URL — it appears in invite email links.

### Migration process

Migrations are plain SQL files. Run them in filename order. Each is idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). For production:

```bash
# Option A: Supabase CLI
npx supabase db push

# Option B: Manual (paste into Supabase SQL editor)
# Paste each file's content one at a time, starting from 00000000000000_bootstrap.sql
```

### Custom domain setup (VERCEL_API_TOKEN)

When an operator saves a custom domain in Settings, `saveBrandingAction` calls the Vercel API to add the domain to the project. The API call is skipped silently if `VERCEL_API_TOKEN` is unset (useful for local dev). A 409 response (domain already exists) is treated as success.

After the domain is registered in Vercel, the operator must add a CNAME record pointing their domain to `cname.vercel-dns.com`. DNS propagation takes up to 24 hours.
