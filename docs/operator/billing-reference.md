---
title: Billing Engine Reference
version: 1.0
date: 2026-03-26
audience: Operators configuring billing rules for their clients
---

# Billing Engine Reference

The portal includes a built-in billing engine that computes call-based charges from your configured rules and your clients' actual usage. This reference documents every rule type, the estimate computation, the template system, and the export format.

---

## Table of Contents

1. [How Billing Works](#1-how-billing-works)
2. [Rule Types](#2-rule-types)
   - [per\_call](#per_call)
   - [per\_minute](#per_minute)
   - [flat\_monthly](#flat_monthly)
   - [setup\_fee](#setup_fee)
   - [bucket](#bucket)
3. [Call Type Filtering](#3-call-type-filtering)
4. [Priority Engine — how calls get prioritized](#4-priority-engine--how-calls-get-prioritized)
5. [Estimate Computation](#5-estimate-computation)
6. [Billing Templates](#6-billing-templates)
7. [Applying a Template to a Client](#7-applying-a-template-to-a-client)
8. [Usage Data vs. Call Log Data](#8-usage-data-vs-call-log-data)
9. [Billing Export](#9-billing-export)
10. [Threshold Alerts](#10-threshold-alerts)
11. [Advanced Billing Scenarios](#11-advanced-billing-scenarios)

---

## 1. How Billing Works

The billing engine is a **pure computation layer** — it reads call data and billing rules, runs the math, and produces an estimate. It does not send invoices automatically.

The flow for a typical client:

```
call_logs / usage_periods (data)
          +
billing_rules (your configuration)
          │
          ▼
billingEngine.computeEstimate()
          │
          ▼
Line items + total amount
          │
     ┌────┴──────┐
     ▼           ▼
  Portal UI   Billing API
  (estimate)  (export / PDF)
```

**Two data sources for billing computation:**

1. **`call_logs`** — individual call records ingested via API or native adapter. Used for per-call and per-minute rules that need individual records.
2. **`usage_periods`** — daily aggregates (total calls + total minutes) uploaded via CSV or the usage API. Used when the operator's telephony platform exports usage summaries rather than individual records.

The engine uses whichever data source is available and configured for the rule.

---

## 2. Rule Types

Every billing rule has a `type`, `name`, `amount`, and optional `call_type` filter. Multiple rules can be active simultaneously — the engine sums them all.

Rules are per-client. Templates let you define a reusable set of rules and apply them to multiple clients (see section 6).

> **Note on units:** Rule amounts are entered in **dollars** in the UI and displayed in dollar notation throughout this document (e.g. `"amount": 2.50`). The internal API representation uses **integer cents** — multiply by 100 to reconcile with API values. The billing estimate endpoint (`GET /api/v1/billing/estimate`) returns `subtotalCents` in integer cents.

---

### `per_call`

Charge a flat amount per call received.

| Field | Value |
|-------|-------|
| `type` | `per_call` |
| `amount` | Amount per call in dollars |
| `call_type` | Optional filter — applies only to calls of this type |

**Example:** $2.50 per urgent call
```json
{
  "type": "per_call",
  "name": "Urgent call charge",
  "amount": 2.50,
  "call_type": "urgent",
  "active": true
}
```

**Computation:** `call_count × amount`

The call count is drawn from `call_logs` for the current billing period, filtered by call type if specified.

---

### `per_minute`

Charge per minute of call time.

| Field | Value |
|-------|-------|
| `type` | `per_minute` |
| `amount` | Amount per minute in dollars |
| `call_type` | Optional filter |

**Example:** $0.85 per minute (all calls)
```json
{
  "type": "per_minute",
  "name": "Per-minute rate",
  "amount": 0.85,
  "active": true
}
```

**Computation:** `total_minutes × amount`

Minutes come from `call_logs.duration_seconds` (summed and converted to minutes) or from `usage_periods.total_minutes` if call-level data is not available.

---

### `flat_monthly`

A fixed charge per billing period, regardless of call volume.

| Field | Value |
|-------|-------|
| `type` | `flat_monthly` |
| `amount` | Fixed monthly charge in dollars |

**Example:** $150 per month base fee
```json
{
  "type": "flat_monthly",
  "name": "Monthly service fee",
  "amount": 150.00,
  "active": true
}
```

**Computation:** Always `amount` — no multiplier.

---

### `setup_fee`

A one-time charge applied in the first billing period. After the period closes, it does not recur.

| Field | Value |
|-------|-------|
| `type` | `setup_fee` |
| `amount` | One-time charge in dollars |

**Example:** $75 onboarding fee
```json
{
  "type": "setup_fee",
  "name": "Setup and onboarding fee",
  "amount": 75.00,
  "active": true
}
```

**Computation:** `amount` in the first period; $0.00 in subsequent periods.

---

### `bucket`

A bundle plan with included minutes and an overage rate. The most commonly used rule type for TAS billing.

| Field | Value |
|-------|-------|
| `type` | `bucket` |
| `amount` | Monthly plan price in dollars |
| `included_minutes` | Minutes included in the plan |
| `overage_rate` | Charge per minute over the included minutes |

**Example:** 500 minutes included at $200/month, $0.75/min overage
```json
{
  "type": "bucket",
  "name": "Standard 500-minute plan",
  "amount": 200.00,
  "included_minutes": 500,
  "overage_rate": 0.75,
  "active": true
}
```

**Computation:**
```
Base charge = amount = $200.00
Overage minutes = max(0, total_minutes - included_minutes)
Overage charge = overage_minutes × overage_rate
Total = base + overage
```

**Threshold alerts:** The engine fires webhook events and email alerts when a client's minutes cross 75%, 90%, and 100% of `included_minutes` during a period. See section 10.

---

## 3. Call Type Filtering

`per_call` and `per_minute` rules accept an optional `call_type` field to apply the rule only to calls of that type.

**Valid call types:**

| Slug | Label |
|------|-------|
| `urgent` | Urgent |
| `new-client` | New Client Inquiry |
| `appointment` | Appointment |
| `general-info` | General Information |
| `after-hours` | After Hours |

**No call type filter** (field absent or `null`) — the rule applies to all calls.

**Example billing setup with mixed rules:**
- Flat monthly base: $100
- Per-call for urgent: $3.00
- Per-call for new-client: $2.00
- Per-minute for all calls: $0.50

A client with 10 urgent calls, 5 new-client calls, and 200 total minutes would be billed:
```
Base:          $100.00
Urgent calls:  10 × $3.00 = $30.00
New clients:    5 × $2.00 = $10.00
Minutes:      200 × $0.50 = $100.00
Total:         $240.00
```

---

## 4. Priority Engine — how calls get prioritized

Call priority is assigned automatically at ingest time by the priority engine (`lib/services/operator/priorityEngine.ts`).

| Call type | Default priority |
|-----------|-----------------|
| `urgent` | High |
| `new-client` | Medium |
| `appointment` | Medium |
| `general-info` | Low |
| `after-hours` | Medium |
| Any unknown type | Low |

Priority affects:
- Where the call appears in the client portal (high-priority calls appear in the dashboard feed)
- Toast notification behavior (high-priority triggers an alert sound)
- Billing rules with `call_type` filters work independently of priority

Priority can be manually overridden by portal users on individual call records. Changes are logged as `priority_updated` entries in `message_actions`.

---

## 5. Estimate Computation

The billing estimate is a real-time running total for the current billing period.

**Period boundaries:** The current period starts on the 1st of the calendar month and ends today. The engine uses the period configured in `billing_periods` if a formal period has been opened, or defaults to the current calendar month.

**Computation flow:**
1. Load all active billing rules for the business.
2. For each rule, query the relevant data source:
   - Per-call / per-minute: `call_logs` for the current period (filtered by `call_type` if set)
   - Flat monthly / setup fee: no data query needed
   - Bucket: `usage_periods` total minutes for the current period, or fall back to `call_logs` sum
3. Compute each rule's line item amount.
4. Sum all line items.

The estimate is displayed in the client portal under **Billing → Current Estimate** and is available via `GET /api/v1/billing/estimate`.

---

## 6. Billing Templates

Templates let you define a reusable set of billing rules and apply them to new clients with one click. Templates are managed at the operator org level and shared across all clients.

### Creating a template

Go to **Billing → Templates → New Template**:

1. Give it a descriptive name (e.g. "Standard Medical — 500 min bucket," "Legal Flat Rate").
2. Add rules using the same rule types as described above.
3. Save.

Templates are shown in the client list and when adding a new client.

### Common template patterns

**Simple bucket plan:**
- 1× `flat_monthly` — base fee
- 1× `bucket` — included minutes + overage

**Tiered call-type billing:**
- 1× `flat_monthly` — base fee
- 1× `per_call` (urgent) — premium rate for urgent calls
- 1× `per_minute` (all calls) — per-minute rate

**New client onboarding:**
- 1× `setup_fee` — one-time fee
- 1× `flat_monthly` — ongoing base
- 1× `bucket` — minute bundle

---

## 7. Applying a Template to a Client

**From the client detail page:**
1. Go to **Clients → [client name] → Billing**.
2. Click **Apply Template**.
3. Select the template.
4. Click **Apply**.

This **copies** the template's rules into the client's billing rules. The client's rules are independent after this point — changing the template later does not affect clients it was already applied to.

**During client creation:**

When adding a new client via **Clients → Add Client** or bulk import, you can specify a template to apply at creation time.

**Overriding rules after template application:**

After applying a template, you can add, edit, or remove individual rules on the client's billing page without affecting other clients or the template itself.

---

## 8. Usage Data vs. Call Log Data

The billing engine can work with either data source.

### Call log data (`call_logs`)

Individual call records ingested via API or native adapter. Best for:
- Per-call billing (exact count of each call type)
- Per-minute billing (actual recorded duration per call)
- Real-time estimates (updates immediately as calls arrive)

### Usage aggregates (`usage_periods`)

Daily totals (calls + minutes) uploaded via CSV or the usage API. Used when:
- Your telephony platform provides end-of-day billing reports rather than real-time call events
- You want to bill from the telephony platform's official usage figures (which may differ from portal-ingested counts)
- You're migrating and need to backfill usage data

**Which takes precedence:**

When both data sources have data for a period, the billing engine uses `usage_periods` for `bucket` rules (since usage files are the official source for minute counts) and `call_logs` for `per_call` and `per_minute` rules that require call-level detail.

---

## 9. Billing Export

### Per-client estimate export

From **Clients → [client name] → Billing → Export**:
- Downloads a CSV of all line items for the current or any past period
- Columns: client name, period, rule name, rule type, units, rate, subtotal, total

### Bulk export (all clients)

From **Billing → Export All** (operator-level):
- Runs billing for all active clients for the selected period
- One row per billing rule per client
- Ready for import into QuickBooks or any billing platform

### Invoice PDF

From **Clients → [client name] → Billing → Invoices → [invoice] → Download PDF**:
- Formatted invoice with operator branding, client name, period, line items, and total
- Also accessible to the client from their portal under **Billing → Invoices**

---

## 10. Threshold Alerts

When a client uses a `bucket` billing rule, the platform monitors their cumulative minutes and alerts when they cross key thresholds.

| Threshold | When it fires |
|-----------|--------------|
| 75% | Client first crosses 75% of included minutes |
| 90% | Client first crosses 90% of included minutes |
| 100% | Client reaches or exceeds 100% of included minutes |

**Alert delivery:**
- **Email** to the operator's notification address
- **Webhook event** (`billing.threshold_75`, `billing.threshold_90`, `billing.threshold_100`) if a matching webhook subscription exists

Alerts fire at most once per threshold per period. If a client briefly dips below a threshold and then crosses it again (due to usage data corrections), the alert fires again.

---

## 11. Advanced Billing Scenarios

### Combining inbound and outbound call billing

Use call type filtering with `direction` awareness. If your telephony platform distinguishes inbound vs. outbound calls with different call types, you can create separate rules:

- `per_call` rule scoped to `urgent` (inbound urgent calls)
- `per_call` rule scoped to `outbound-dispatch` (your custom type for outbound dispatch calls)

Coordinate with your answering service to ensure outbound calls are ingested with a distinct `call_type` slug.

### Agent work time billing

The current billing engine supports `duration_seconds` (phone time). If you need to bill on **wrap-up time** (call time + post-call work), your telephony platform must include wrap-up time in the `duration_seconds` field, or you must upload adjusted usage aggregates via the usage API.

A future version of the billing engine will support multi-column time tracking (call time vs. work time as separate fields).

### Clients on different billing periods

By default, all clients use calendar-month billing periods. If a client has a custom billing cycle (e.g. 15th of month to 14th), custom period configuration requires direct database access or a custom migration.

### Retroactive billing adjustments

To apply a billing adjustment to a past period:
1. Open the closed billing period (Operator Admin → **Clients → [client] → Billing → Invoices**).
2. Add a one-time adjustment rule (e.g. a flat credit using a `flat_monthly` rule with a negative amount).
3. Regenerate the invoice.

The adjustment is logged as a separate line item.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Billing rule** | A single charge configuration (type + amount + optional call type filter) |
| **Template** | A reusable set of billing rules applied to new clients at creation |
| **Billing period** | The date range for a billing calculation (default: calendar month) |
| **Estimate** | A real-time running total for the current period |
| **Invoice** | A finalized record of charges for a completed period |
| **Bucket plan** | A plan with included minutes and an overage rate above the included amount |
| **Threshold alert** | Email + webhook notification when a client crosses 75%, 90%, or 100% of included minutes |
| **Usage period** | A daily aggregate row (calls + minutes) uploaded from the telephony platform |
