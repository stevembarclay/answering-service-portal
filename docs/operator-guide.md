# Operator Guide

A training manual for answering service operators deploying and managing the portal.

---

## Welcome

This portal is your control center for managing your answering service clients. You deploy it once, brand it with your own logo and colors, and then provision client accounts — one per law firm, medical practice, or small business you serve. Each client logs in to their own portal to check their messages, manage who's on call, and view their billing.

You control everything:
- What the portal looks like (your branding)
- Which clients have access
- What billing rules apply to each client
- How call data flows in (via your telephony platform's webhook or the REST API)

Your clients see only their own data. You see all of it.

---

## Getting started (5 steps)

### Step 1 — Configure your branding

Go to **Settings** in the sidebar.

Fill in:
- **Portal name** — shown in the client sidebar (e.g. "MedAnswering" or "AnswerFirst Portal")
- **Brand color** — click the color picker or type a hex code. This becomes the primary color throughout the client portal.
- **Logo URL** — a publicly accessible URL to your logo image (PNG or SVG). Shown instead of the initials badge in the client sidebar. Use a CDN or any public hosting.
- **Support email** — your support address. Stored for future use in transactional emails.
- **Client portal domain** — if you want clients to access the portal at your own domain (e.g. `portal.answerfirst.com`) rather than the default URL. See the **Custom domain setup** section below.

Click **Save branding**. Changes take effect immediately — no redeploy needed.

### Step 2 — Add your first client

Go to **Clients** → **Add Client**.

You'll need:
- **Business name** — the client's company name (e.g. "Riverside Law Group")
- **Contact email** — the email address of the person who will manage the portal. They'll receive a magic link to activate their account.
- **Billing template** (optional) — if you've set up billing templates, choose one now. You can change it later.

Click **Add Client**. The portal:
1. Creates the business record
2. Sends a magic-link invite email to the contact address
3. Applies the billing template (if selected)
4. Redirects you to the client detail page

The client has 24 hours to click their invite link. If they miss it, you can resend it from the client detail page.

### Step 3 — Connect your telephony system

Go to **Integrations** in the sidebar for a step-by-step guide. The short version:

1. Create an API key in **API & Webhooks** with the `calls:write` scope.
2. Find the `businessId` for the client you're testing: open their detail page — the UUID is in the URL (`/operator/clients/{businessId}`).
3. Configure your telephony platform to POST call events to `https://[your-domain]/api/v1/calls` with `Authorization: Bearer [key]` and `Content-Type: application/json`.
4. Map your platform's call fields to the portal JSON format (see the field mapping section below). Set `businessId` to the UUID from step 2.
5. Send a test call and check your Activity feed — it should appear within seconds.

### Step 4 — Set up your client's billing rules

Go to **Billing Templates**.

A template defines a pricing plan — for example, "$1.50 per call" or "$150/month flat fee". Once created, you can apply it to clients when adding them or by editing the client later.

Template rule types:
- **Per call** — a fixed charge per call logged
- **Per minute** — billed on `duration_seconds`
- **Flat monthly** — a fixed monthly fee regardless of volume
- **Bucket** — an included block of calls/minutes, then an overage rate

You can have multiple rules in one template (e.g. a flat monthly fee plus a per-minute overage).

### Step 5 — Watch your first call arrive

Go to **Activity** in the sidebar (top item). This is your live feed of calls across all clients.

As calls come in from your telephony system, you'll see each one appear in the feed in real time, with the client name, call type, and timestamp. High-priority calls (urgent, new-client) show a red dot and fire a toast notification in your browser.

---

## Managing clients

### Adding a client

**Clients → Add Client**

| Field | Description |
|---|---|
| Business name | The company's display name. Shown in the operator clients table and in the client's portal sidebar. |
| Contact email | The email address for the portal owner. They'll receive a branded invite email with a one-click login link. |
| Billing template | Optional. Applies pricing rules immediately. Can be changed later. |

After adding, the client appears in your Clients table with a health score. Until they log in and complete setup, their score will be low — that's expected.

### What the invite email looks like

The client receives a branded invite email from your configured sender address with a subject like "You've been invited to [Your Portal Name]". Clicking the link:
1. Activates their account
2. Logs them in
3. Lands them at the Setup Wizard (`/answering-service/setup`)

The link expires after 24 hours. If the client doesn't click it in time, resend from the client detail page.

### Client health scores

The health score (0–100) is a quick indicator of client engagement and account status. It's shown as a colored badge on the Clients table.

| Component | Points | Meaning |
|---|---|---|
| Login recency | 0–40 | Full 40 points if logged in within 7 days. Decays over time. 0 if never logged in. |
| Open high-priority calls | 0–30 | Full 30 if zero unread urgent calls. Decreases as unread urgent calls accumulate. |
| Reviewed within 7 days | 0–20 | Points for how many calls the client has reviewed recently. |
| Onboarding complete | 0 or 10 | 10 if the setup wizard is complete, 0 otherwise. |

**At risk:** score < 50. The client is not engaging with the portal. Consider reaching out.
**Inactive:** last login more than 30 days ago. May have stopped using the portal.

You can override the health score manually (client detail → Settings tab → Health Score Override) if you have context the formula doesn't capture (e.g. the client logs in via API, not the browser).

### Resending an invite

If a client says they didn't get their invite, or the link expired:

1. Go to **Clients** → click the client name
2. Open the **Settings** tab
3. Click **Resend invite email**

A new magic link is generated and sent to the owner's email on file.

### Viewing a client's recent calls and billing

Click any client from the Clients table to open their detail page. Four tabs:

- **Overview** — health score breakdown, login recency, open high-priority count, calls this month vs last month, current on-call contact
- **Billing** — active billing rules for this client
- **Calls** — last 20 call records with type, priority, and status
- **Settings** — API keys, health score override, resend invite

---

## Connecting your telephony system

The portal receives call data via `POST /api/v1/calls`. Any system that can send an HTTP POST request can push calls into the portal.

### Step-by-step

1. **Create an API key** — go to **API & Webhooks** → create a key with the `calls:write` scope. Label it something descriptive like "StarTel Integration — Riverside Law".

2. **Configure your telephony platform's outbound webhook:**

   | Setting | Value |
   |---|---|
   | URL | `https://[your-domain]/api/v1/calls` |
   | Method | POST |
   | Headers | `Authorization: Bearer [your-api-key]` and `Content-Type: application/json` |

3. **Map the call fields** to the portal JSON format:

   | Your platform field | Portal JSON field | Notes |
   |---|---|---|
   | Call start time | `timestamp` | ISO 8601 format, e.g. `2026-03-26T14:30:00Z` |
   | Caller number | `callerNumber` | |
   | Callback number | `callbackNumber` | |
   | Caller name | `callerName` | Optional |
   | Call type | `callType` | See valid values below |
   | Duration | `durationSeconds` | In seconds |
   | Agent note | `message` | Required. Cannot be empty. |
   | Recording URL | `recordingUrl` | Optional |
   | Direction | `direction` | `inbound` or `outbound` |
   | Status | `telephonyStatus` | `completed`, `missed`, or `voicemail` |
   | **Your client's ID** | `businessId` | UUID from the client detail page URL |

   **Valid `callType` values:** `urgent`, `new-client`, `appointment`, `general-info`, `after-hours`

   Wrap the body in a JSON array: `[{ ... }]`

4. **Find the `businessId`:** open the client's detail page. The URL looks like `/operator/clients/abc123-...`. Copy the UUID.

5. **Send a test call.** Check your Activity feed — it should appear within seconds.

### No native webhook support?

If your telephony platform can't send outbound HTTP requests directly, use an automation bridge (Zapier, Make, n8n) as the middleman:
- **Trigger:** your platform's new-call event
- **Action:** HTTP POST to `https://[your-domain]/api/v1/calls`
- Add the `Authorization: Bearer [key]` header and map fields to the JSON format above

### Troubleshooting

- **Call isn't showing up:** check your platform's webhook delivery logs. Most common causes: incorrect `businessId` (verify it matches the UUID in the client detail URL), or empty `message` field.
- **401 Unauthorized:** the API key has been revoked or is incorrect. Create a new key in API & Webhooks.
- **callType validation error:** map your platform's call type to one of the five valid values, or default to `general-info`.

---

## Billing templates

> **Note:** The billing templates UI (**Billing → Templates**) is available in the managed/enterprise deployment. In the community edition, billing rules are configured per-client directly.

### What a template is

A billing template is a reusable pricing plan. Instead of setting up billing rules from scratch for each client, you create a template once and apply it to any number of clients. When you apply a template, the rules are copied into the client's account — changes to the template afterwards do not automatically propagate to existing clients.

### Creating a template

Go to **Billing Templates** → click **New Template** (admin role required).

1. Give the template a name (e.g. "Medical Standard" or "Legal Premium").
2. Add one or more rules:
   - Choose the rule type (per call / per minute / flat monthly / bucket)
   - Enter a name for the rule (for your own reference)
   - Enter the amount in **dollars** (e.g. `1.50` for $1.50 per call)
3. Save the template.

### Applying a template

**When adding a client:** select the template from the dropdown on the Add Client form.

**After the fact:** go to the client detail page, open the **Billing** tab, and use the **Apply Template** dropdown to apply any saved template to the client.

---

## Custom domain setup

If you want your clients to access the portal at `portal.yourcompany.com` instead of the default Vercel URL:

1. Go to **Settings** → enter your domain in the **Client portal domain** field (e.g. `portal.answerfirst.com`). Click **Save branding**.

2. Log in to your domain registrar or DNS provider. Add a CNAME record:
   - **Host:** `portal` (or whatever subdomain you chose)
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** 3600 (or your provider's default)

3. Wait for DNS to propagate. This takes 30 minutes to 24 hours depending on your provider.

4. Verify: visit `https://portal.yourcompany.com`. You should see the login page with your branding applied. If you see a certificate error, wait a few more hours — Vercel provisions SSL automatically once DNS resolves.

**Not working?** Double-check:
- The CNAME value is exactly `cname.vercel-dns.com` (no trailing dot)
- You saved the domain in the portal settings before adding the CNAME
- `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` are set in your Vercel deployment's environment variables (needed for the domain to be registered programmatically)

---

## API & Webhooks

### Creating an API key

Go to **API & Webhooks** → enter a label → choose scopes → click **Create key**.

**Available scopes:**
- `calls:read` — read call logs
- `calls:write` — ingest call records (required for telephony integration)
- `billing:read` — read invoices and estimates
- `usage:write` — upload CSV usage files
- `on_call:read` — read the current on-call contact for a business

Save the raw key immediately — it's shown only once and never stored. If you lose it, revoke and create a new one.

### Setting up a webhook subscription

Go to **API & Webhooks** → scroll to **Webhooks** → enter your endpoint URL → check the topics you want → click **Create subscription**.

Every delivery is signed with HMAC-SHA256 using the signing secret shown at creation. Verify the `X-Webhook-Signature` header on your server.

**Topics:**
- `call.created` — fires on every new call ingested
- `call.priority_changed` — fires when an agent changes a call's priority
- `call.status_changed` — fires when a call moves from new → read → resolved
- `billing.threshold_75/90/100` — fires when a client hits billing thresholds

### Webhook showing "failing" status

If `consecutive_failure_count` is climbing, your endpoint is returning non-2xx responses. Check:
1. Your endpoint is reachable from the internet (not behind a firewall).
2. Your endpoint is returning 200 OK (not 500 or redirecting).
3. Supabase hasn't paused the subscription — check the Webhooks table.

To re-activate: fix the endpoint, then delete the failing subscription and recreate it.

---

## FAQ

**"A client says they didn't get their invite"**
→ Go to the client's detail page → Settings tab → click **Resend invite email**. The new link is valid for 24 hours. Ask them to check spam/junk folders.

**"Calls aren't showing up in the portal"**
→ Check your telephony platform's webhook delivery logs for errors. Most common causes: wrong `businessId`, empty `message` field, revoked API key. If using an automation bridge (Zapier, Make), check its task history.

**"Client can't log in"**
→ The invite link expires after 24 hours. Resend the invite (see above). If they clicked the link but get an error, check that `NEXT_PUBLIC_APP_URL` in your Vercel environment variables matches your actual domain.

**"Wrong brand color is showing"**
→ Save branding again in Settings → have the client clear their browser cache (Ctrl+Shift+R or Cmd+Shift+R). CSS variables are injected at runtime — no redeploy needed, but the browser may have cached the old value.

**"How do I find a client's businessId for the integration?"**
→ Open the client's detail page. The ID is the UUID in the URL: `/operator/clients/{businessId}`.

**"Can the same email be used for multiple clients?"**
→ No. Supabase Auth has one account per email address. If the contact email is already in use, the Add Client flow will report an error and you'll need to use a different email.
