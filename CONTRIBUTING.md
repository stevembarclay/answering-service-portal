# Contributing

## Prerequisites

- **Node.js 20+**
- A **Supabase** account and project (free tier works fine)
- An **OpenAI API key** (GPT-4o-mini is used — costs are minimal for development)

## Quickstart

1. **Fork and clone**

   ```bash
   git clone https://github.com/<your-username>/answering-service-portal.git
   cd answering-service-portal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `.env.local` with your Supabase project URL, anon key, service role key, and OpenAI API key. See `.env.example` for descriptions of each variable. Key vars:

   | Variable | Required | Notes |
   |----------|----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes | Required for invite flow + seed script |
   | `OPENAI_API_KEY` | Yes | API key for your LLM provider (wizard coach + dashboard helper) |
   | `OPENAI_MODEL` | No | Model to use (defaults to `gpt-4o-mini`) |
   | `OPENAI_BASE_URL` | No | Base URL for OpenAI-compatible providers (Ollama, Groq, Azure, etc.) |
   | `AI_SERVICE_DESCRIPTION` | No | One-phrase service description in AI prompts (defaults to `answering service`) |
   | `NEXT_PUBLIC_APP_URL` | Prod only | Invite email redirect URL (defaults to `http://localhost:3000`) |

4. **Run database migrations**

   Apply all SQL files in `migrations/` to your Supabase project **in filename order**:

   ```
   migrations/
     00000000000000_bootstrap.sql                              ← START HERE
     20260108125310_create_wizard_sessions.sql
     20260108125400_create_sms_rate_limits.sql
     20260310100000_add_last_login_at_to_users_businesses.sql
     20260310100100_create_call_logs.sql
     20260310100200_create_message_actions.sql
     20260310100300_create_billing_rules.sql
     20260310100400_create_billing_periods.sql
     20260310100500_fix_update_updated_at_search_path.sql
     20260311100000_create_operator_platform.sql
     20260311100100_create_usage_periods.sql
     20260311100200_create_api_keys.sql
     20260311100300_create_webhook_tables.sql
     20260311100400_create_billing_rule_templates.sql
     20260312100000_add_on_call_scheduling.sql
     20260313100000_add_operator_org_id_to_call_logs.sql
     20260326100000_add_message_status_and_notes.sql
     20260327100000_add_billing_time_columns.sql
     20260327100001_add_pdf_url_to_billing_periods.sql
     20260327100002_add_business_notes.sql
     20260327100003_add_call_ingest_errors.sql
     20260327100004_add_hipaa_support.sql
   ```

   You can paste each file into the Supabase SQL editor or use the CLI:

   ```bash
   npx supabase db push
   ```

5. **Seed demo data (recommended)**

   ```bash
   npm run seed
   ```

   Creates two demo accounts:

   | Account | Email | Password |
   |---------|-------|----------|
   | Client portal (Riverside Law Group) | `demo@example.com` | `demo-password-2026` |
   | Operator admin (Answer First) | `operator@example.com` | `operator-password-2026` |

6. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Log in as `demo@example.com` for the client portal or `operator@example.com` for the operator admin.

---

## Project Structure

```
app/
  (auth)/                              # Login, forgot password, magic link, reset password
  (platform)/answering-service/        # Client portal pages (setup, dashboard, billing, messages, on-call, settings)
  (operator)/operator/                 # Operator admin pages
    clients/                           # Client list
    clients/new/                       # Add Client form + server action
    clients/[id]/                      # Client detail + resend invite action
    integrations/                      # Zapier/StarTel integration guide (static)
    usage/                             # CSV upload
    billing-templates/                 # Billing template CRUD
    api-webhooks/                      # API keys + webhook subscriptions
    settings/                          # Editable branding form + server action
  api/answering-service/               # Session-authenticated API routes (coach, billing, messages)
  api/v1/                              # Bearer-token public API (calls ingest, on-call, billing, usage)
  api/v1/internal/on-call/             # Session-authenticated on-call mutation routes

components/answering-service/          # Client portal React components
components/operator/                   # Operator admin React components
lib/
  services/answering-service/          # Client portal service layer (wizard, on-call, billing, messages)
  services/operator/                   # Operator service layer (clients, billing templates, API keys, webhooks)
  supabase/                            # Supabase client helpers (server.ts, service.ts)
  auth/                                # Auth helpers (getUser, getBusinessContext, checkOperatorAccessOrThrow)
  api/                                 # Bearer token validation
  middleware/                          # Rate limiting, module access guard
  config/                              # portal.ts — white-label env-var branding fallbacks

schemas/                               # Zod validation schemas
types/                                 # Shared TypeScript types (adapter contract)
migrations/                            # Supabase SQL migrations (run in order)
scripts/                               # seed-demo.ts
docs/                                  # developer reference, design system, operator and end-user guides
```

---

## Integrating Real APIs

The portal reads call logs, billing, and dashboard data from Supabase tables. To connect a live telephony provider:

**Option A — Zapier (easiest):** Use the integration guide at `/operator/integrations`. Creates a Zap that POSTs call data to `POST /api/v1/calls` on every new StarTel call. No code changes needed.

**Option B — Ingest adapter (recommended for code):** Write a background job that polls your provider's API and inserts rows into `call_logs`. Map your data to the `CallLog` type in `types/answeringService.ts`.

**Option C — CSV upload:** For backfill or providers without a webhook API, upload call data via the `/operator/usage` page. The CSV is mapped to `call_logs` rows by the ingest adapter. See the Usage page for the expected column format.

---

## Pull Request Process

1. Fork the repo and create a branch from `main` (e.g. `feature/amtelco-adapter`).
2. Make your changes. Run `npm run typecheck` before pushing.
3. Open a pull request with a clear description of what you changed and why.
4. Keep PRs focused — one feature or fix per PR.

## Code Style

- TypeScript strict mode — avoid `any`, use `unknown` with type narrowing
- Service layer pattern — no Supabase calls in components or pages (use server actions + service functions)
- All data scoped by `business_id` or `operator_org_id`
- Server actions use `'use server'` directive and validate auth with `checkOperatorAccessOrThrow()` / `getBusinessContext()`
- Zod validation at API boundaries
- Use `createServiceRoleClient()` (from `lib/supabase/service.ts`) only when you need to bypass RLS — always verify authorization first
