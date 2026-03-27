---
title: Operator Setup Guide
version: 1.0
date: 2026-03-26
audience: Answering service operators deploying this portal
---

# Operator Setup Guide

Deploy the portal for your answering service and onboard your first clients.

**Estimated time:** 45–90 minutes for a fresh deployment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Deploy to Vercel](#2-deploy-to-vercel)
3. [Configure Supabase](#3-configure-supabase)
4. [Set Environment Variables](#4-set-environment-variables)
5. [Provision Your Operator Account](#5-provision-your-operator-account)
6. [Configure Branding](#6-configure-branding)
7. [Add Your First Clients](#7-add-your-first-clients)
8. [Connect Your Call Center](#8-connect-your-call-center)
9. [Configure Billing Rules](#9-configure-billing-rules)
10. [Set Up Webhooks (Optional)](#10-set-up-webhooks-optional)
11. [Custom Domain (Optional)](#11-custom-domain-optional)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

- A [Supabase](https://supabase.com) account — free tier for evaluation, **Pro plan** for production
- A [Vercel](https://vercel.com) account
- A [Resend](https://resend.com) account for transactional email (invite emails)
- Node.js 18+ installed locally (for provisioning and seeding scripts)

---

## 2. Deploy to Vercel

Click the **Deploy to Vercel** button in the project README. This forks the repository to your GitHub account and creates a Vercel project.

1. Click the deploy button and connect to your GitHub account.
2. Enter a project name (e.g. `answering-portal`).
3. Skip environment variables for now — you'll configure them in step 4.
4. Click **Deploy**.

Vercel will show a failed initial deployment. That's expected — the environment variables aren't set yet.

---

## 3. Configure Supabase

### 3a. Create a new Supabase project

1. Log in to [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to your users.
3. Save the database password securely — you won't need it directly, but it's good practice.

### 3b. Apply migrations

All tables, indexes, and RLS policies are defined in numbered SQL migration files in the `migrations/` directory.

**Option A — Supabase CLI (recommended):**

```bash
npm install
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — Manual via SQL editor:**

Paste each file from `migrations/` into the Supabase SQL Editor in filename order, starting with `00000000000000_bootstrap.sql`.

### 3c. Configure custom SMTP in Supabase (required for production)

By default, Supabase sends auth emails (magic link sign-ins, password resets) from its own infrastructure using Supabase's domain. For production, you must configure custom SMTP so those emails come from your verified Resend domain instead.

1. Go to **Supabase dashboard → Settings → Authentication → Email**.
2. Toggle **Enable Custom SMTP** on.
3. Enter your SMTP settings:

   | Field | Value |
   |-------|-------|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | Your Resend API key |
   | Sender name | Your company name |
   | Sender email | Your verified Resend sender address (must match `RESEND_FROM_EMAIL`) |

4. Click **Save**.

After saving, all Supabase auth emails will go through your Resend account.

> **Note:** Invite emails (when you add a new client) already bypass Supabase's email system — the platform generates the invite link via the Supabase Admin API and then sends a branded email through Resend directly. Custom SMTP is needed only for magic link sign-ins and password reset emails triggered by users on the login page.

> **Resend free tier limit:** 3,000 emails/month. For most operators this is plenty. If you expect higher volume, upgrade your Resend plan.

---

### 3d. Enable Realtime on `call_logs`

1. Go to **Database → Replication** in the Supabase dashboard.
2. Find the `call_logs` table and toggle it on.

Without this, new call notifications won't appear live in client portals.

### 3e. Create the `call-recordings` storage bucket (optional)

Required only if your call center sends voicemail recordings.

1. Go to **Storage** in the Supabase dashboard.
2. Create a new bucket named `call-recordings`.
3. Set it to **private** (no public access).

---

## 4. Set Environment Variables

In your Vercel project, go to **Settings → Environment Variables** and add:

| Variable | Where to find it | Required |
|----------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL, e.g. `https://portal.yourco.com` | ✅ |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys | ✅ |
| `RESEND_FROM_EMAIL` | A verified sender address in Resend | ✅ |
| `CRON_SECRET` | Any random secret — `openssl rand -hex 32` | ✅ |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys — enables AI chat assistant in client portal | Optional |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` — model used for the AI chat assistant | Optional |
| `VERCEL_API_TOKEN` | Vercel → Account Settings → Tokens | Optional (custom domains) |
| `VERCEL_PROJECT_ID` | Vercel project settings | Optional (custom domains) |
| `PORTAL_NAME` | Your portal display name | Optional |
| `PORTAL_BRAND_COLOR` | Hex color, e.g. `#2563eb` | Optional |

> **Important:** `NEXT_PUBLIC_APP_URL` must be the exact production URL with no trailing slash. It is embedded in invite email links. A mismatch causes magic links to redirect to the wrong host.

After saving, go to **Deployments → Redeploy** to trigger a new deployment with the variables applied.

---

## 5. Provision Your Operator Account

Clone the repository locally and create a `.env.local` file with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://portal.yourco.com
```

Then run the provisioning script:

```bash
npm install
npm run provision
```

The script prompts you for:
- Operator org name (e.g. "AnswerFirst")
- Slug (e.g. `answerfirst`) — used in internal URLs
- Admin user email and password

It creates the `operator_orgs` row, the Supabase Auth user, and the `operator_users` link. No SQL required.

Log in at your deployment URL with the credentials you provided. You'll land on the **Clients** page.

**Optional — load starter demo data:**

```bash
npm run seed:starter
```

Creates a demo operator org with 3 sample clients and 30 days of call history. Useful for testing and demos. The script is idempotent — safe to run again if it partially succeeded.

---

## 6. Configure Branding

Go to **Settings** in the Operator Admin portal.

| Setting | Notes |
|---------|-------|
| **Portal Name** | Shown in the client portal sidebar and invite emails |
| **Brand Color** | Applied as the primary accent color across the client portal |
| **Logo** | Upload a PNG or SVG (max 2 MB). Shown in the client portal sidebar instead of initials |
| **Support Email** | Shown to clients who need help |

Changes take effect immediately for all clients in your org.

---

## 7. Add Your First Clients

### Adding one client

Go to **Clients → Add Client**:

1. Enter the client's business name.
2. Enter the owner's email address.
3. Optionally select a billing template.
4. Click **Create & Send Invite**.

The client receives a branded magic-link email. On first click they're guided through a setup wizard:
- Business hours and call types
- Greeting script
- On-call contacts and escalation steps
- Message delivery preferences

The wizard can be resumed at any time — progress is saved automatically.

### Bulk import

> **Note:** Bulk CSV import is available in the managed/enterprise deployment. In the community edition, clients are added one at a time via the **Add Client** form above.

To add many clients at once, go to **Clients → Import** and upload a CSV:

```
name,email,billing_template,notes
City Law LLP,owner@citylaw.com,standard_law,
Metro Medical,admin@metromedical.com,medical_monthly,after-hours only
```

- `billing_template` must match an existing template name (leave blank if not applying one now).
- The portal previews the import and shows any validation errors before creating accounts.
- Invite emails are sent automatically for each successfully imported row.

---

## 8. Connect Your Call Center

Choose the integration method that fits your setup:

### Option A — Telephony platform webhook (recommended)

1. In **Settings → API Keys**, create a new operator-scoped key with the `calls:write` scope.
2. Configure your telephony platform to POST call events to `https://your-portal.com/api/v1/calls`.
3. Set headers: `Authorization: Bearer <your-api-key>` and `Content-Type: application/json`.
4. Map your platform's call fields to the [POST /api/v1/calls payload](../api/reference.md#post-apiv1calls).
5. Test with a real call and confirm it appears in the portal.

Most modern telephony platforms support outbound webhooks natively. If yours doesn't, use an automation bridge (Zapier, Make, n8n) to forward events to the endpoint.

### Option B — Direct API (custom integration)

For custom adapters or developer-built integrations, POST directly to the REST API. See the [API Reference](../api/reference.md) and [Adapter Guide](../integrations/adapter-guide.md).

### Cron Jobs

Vercel automatically schedules the following background job (defined in `vercel.json`). All cron requests are authenticated with the `CRON_SECRET` environment variable.

| Path | Schedule | What it does |
|------|----------|-------------|
| `/api/cron/ingest` | Every 5 minutes | Polls configured call source adapters for new calls |

---

## 9. Configure Billing Rules

### Billing templates

Templates let you define a set of billing rules once and apply them to multiple clients.

Go to **Billing → Templates → New Template**:
- Give it a name (e.g. "Standard Medical — Bucket 500 minutes").
- Add rules. See [Billing Engine Reference](billing-reference.md) for all rule types.

Apply a template to a client from the client's detail page (**Clients → [client name] → Billing → Apply Template**). Applying a template copies the rules into the client's account — changes to the template after application do not affect existing clients.

### Per-client rules

You can also add or override rules directly on a client's billing page. Per-client rules are independent of templates.

### Usage data

Some billing models (flat monthly, per-call or per-minute from telephony data) compute from the `call_logs` table automatically. If your operator charges based on **usage aggregates** from a billing file (common with StarTel/Amtelco), upload usage CSVs via:
- **Clients → [client name] → Usage → Upload CSV**, or
- The `POST /api/v1/usage` API endpoint with a CSV file.

---

## 10. Set Up Webhooks (Optional)

Webhooks let you receive real-time notifications when calls arrive, usage is processed, or billing thresholds are crossed.

1. Go to **Settings → Webhooks → Add Endpoint**.
2. Enter a publicly accessible HTTPS URL.
3. Select the event topics to subscribe to.
4. Click **Save**.

The portal returns a **signing secret** — save it immediately; it is shown only once.

Use the secret to verify the `X-Webhook-Signature` header on every delivery. Deliveries are retried automatically with exponential backoff (up to 10 attempts). You can view delivery history and manually retry failed deliveries from the Webhooks page.

For payload schemas and signature verification code, see the [Webhook Event Catalog](../api/webhooks.md).

---

## 11. Custom Domain (Optional)

To serve the client portal at your own domain (e.g. `portal.answerfirst.com`):

1. Ensure `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` are set in Vercel.
2. In **Settings → Branding**, enter your custom domain and save.
3. In your DNS provider, add a CNAME record:

   | Name | Type | Value |
   |------|------|-------|
   | `portal` | CNAME | `cname.vercel-dns.com` |

4. Wait up to 24 hours for DNS propagation. Vercel will auto-provision an SSL certificate.

Once live, clients who visit the custom domain will see the portal with your branding automatically applied.

---

## 12. Troubleshooting

| Symptom | Likely cause | Resolution |
|---------|-------------|------------|
| Invite emails not delivered | `RESEND_API_KEY` missing or sender domain not verified | Check env vars; verify domain in Resend dashboard |
| Magic link / password reset emails come from Supabase domain | Custom SMTP not configured | See step 3c — configure Resend SMTP in Supabase → Settings → Authentication → Email |
| API key creation fails | `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel | Add the variable in Vercel → Environment Variables → redeploy |
| New calls don't appear in real time | Realtime not enabled on `call_logs` | Enable in Supabase → Database → Replication → `call_logs` |
| `npm run provision` fails | Supabase credentials not in `.env.local` | Copy `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase Settings → API |
| Magic links redirect to wrong URL | `NEXT_PUBLIC_APP_URL` set incorrectly | Must match exact production URL (no trailing slash, https) |
| Custom domain not working after DNS set | CNAME not propagated yet, or `VERCEL_API_TOKEN` missing | Wait 24h; check env vars; re-save the domain in Settings |
| Calls POST returns 403 "calls:write requires operator-scoped key" | Using a business-scoped API key | Create an operator-scoped key in Settings → API Keys |

---

*For deployment questions, open an issue on the [GitHub repository](https://github.com/stevembarclay/answering-service-portal/issues).*
