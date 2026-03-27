---
title: Webhook Event Catalog
version: 1.0
date: 2026-03-26
audience: Operators building integrations
---

# Webhook Event Catalog

The portal delivers real-time webhook events to operator-configured endpoints when key platform events occur.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Security — Signature Verification](#2-security--signature-verification)
3. [Retry Behavior](#3-retry-behavior)
4. [Event Reference](#4-event-reference)
   - [call.created](#callcreated)
   - [usage.upload\_processed](#usageupload_processed)
   - [usage.upload\_failed](#usageupload_failed)
   - [billing.threshold\_75](#billingthreshold_75)
   - [billing.threshold\_90](#billingthreshold_90)
   - [billing.threshold\_100](#billingthreshold_100)
5. [Managing Subscriptions](#5-managing-subscriptions)

---

## 1. Overview

### What triggers a delivery

| Event topic | When it fires |
|-------------|--------------|
| `call.created` | A call record is successfully ingested (via API or native adapter) |
| `usage.upload_processed` | A usage CSV row is accepted and written to `usage_periods` |
| `usage.upload_failed` | A usage CSV row fails validation |
| `billing.threshold_75` | A client crosses 75% of their included minutes in the current period |
| `billing.threshold_90` | A client crosses 90% of their included minutes |
| `billing.threshold_100` | A client reaches or exceeds 100% of their included minutes |

### HTTP delivery

Every webhook delivery is an HTTP POST to the configured endpoint URL with:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Webhook-Signature` | `sha256=<hex-signature>` |
| `X-Webhook-Topic` | The event topic (e.g. `call.created`) |
| `X-Webhook-Attempt` | Attempt number (`1` for first delivery, `2` for first retry, etc.) |

Your endpoint must return a **2xx status** within **10 seconds** to be counted as successful.

---

## 2. Security — Signature Verification

Every delivery is signed with HMAC-SHA256 using the subscription's secret. Always verify the signature before processing a delivery.

### Algorithm

```
signature = HMAC-SHA256(secret, raw_request_body)
expected = "sha256=" + hex(signature)
received = X-Webhook-Signature header value
```

Use a **constant-time comparison** to prevent timing attacks.

### Verification examples

**Node.js / TypeScript:**

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  signatureHeader: string
): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  } catch {
    return false
  }
}
```

**Python:**

```python
import hmac
import hashlib

def verify_webhook_signature(raw_body: bytes, secret: str, signature_header: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

**Express.js middleware example:**

```typescript
app.post('/webhooks/answering-service', express.raw({ type: 'application/json' }), (req, res) => {
  const valid = verifyWebhookSignature(
    req.body.toString(),
    process.env.WEBHOOK_SECRET!,
    req.headers['x-webhook-signature'] as string
  )
  if (!valid) {
    return res.status(401).send('Invalid signature')
  }
  const event = JSON.parse(req.body.toString())
  // handle event...
  res.status(200).send('ok')
})
```

---

## 3. Retry Behavior

Failed deliveries are retried automatically with exponential backoff.

| Attempt | Delay before retry |
|---------|-------------------|
| 1 (initial) | — |
| 2 | 1 minute |
| 3 | 2 minutes |
| 4 | 4 minutes |
| 5 | 8 minutes |
| 6 | 16 minutes |
| 7–10 | 32–60 minutes (capped at 60) |

A subscription that has accumulated **5 consecutive dead-letter deliveries** (all 10 attempts exhausted) transitions to `failing` status. Failing subscriptions are paused from receiving new events until reviewed.

**Manual retry:** Delivery history is visible in the Operator Admin under **Settings → Webhooks → [subscription] → Delivery Log**. Any failed delivery can be manually retried from that view.

---

## 4. Event Reference

### call.created

Fires when a call record is successfully written to the database.

**When:** Immediately after ingestion (via `POST /api/v1/calls`, native adapter, or CSV batch).

**Payload:**

```json
{
  "callId": "4a3b2c1d-...",
  "businessId": "b1a2c3d4-...",
  "callType": "urgent",
  "priority": "high",
  "timestamp": "2026-03-26T14:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `callId` | `string` (UUID) | The created call log ID |
| `businessId` | `string` (UUID) | The client business the call belongs to |
| `callType` | `string` | The call type slug (e.g. `urgent`, `new-client`, `appointment`) |
| `priority` | `"high"` \| `"medium"` \| `"low"` | Computed priority level |
| `timestamp` | `string` (ISO 8601) | The call's reported timestamp |

**Use cases:** Trigger downstream workflows when a high-priority call arrives; push notifications to an on-call team; log to a CRM.

---

### usage.upload_processed

Fires when a usage row is successfully ingested.

**When:** During `POST /api/v1/usage` processing, once per successfully written row.

**Payload:**

```json
{
  "businessId": "b1a2c3d4-...",
  "date": "2026-03-25",
  "totalCalls": 47,
  "totalMinutes": 312
}
```

| Field | Type | Description |
|-------|------|-------------|
| `businessId` | `string` (UUID) | The client the usage row belongs to |
| `date` | `string` (YYYY-MM-DD) | The usage period date |
| `totalCalls` | `number` | Total calls ingested for this date |
| `totalMinutes` | `number` | Total minutes ingested for this date |

**Use cases:** Sync usage summaries to an external billing or analytics system.

---

### usage.upload_failed

Fires when a usage row fails validation during ingest.

**When:** During `POST /api/v1/usage` processing, for each row that fails.

**Payload:**

```json
{
  "businessId": "b1a2c3d4-...",
  "date": "2026-03-25",
  "issue": "business_id \"b1a2c3d4\" does not belong to this operator org."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `businessId` | `string` | The business ID from the failing row (may not be a valid UUID) |
| `date` | `string` | The date from the failing row |
| `issue` | `string` | A human-readable description of the validation failure |

**Use cases:** Alert on bad rows in automated usage uploads; track upload quality.

---

### billing.threshold_75

Fires when a client's total minutes in the current period first crosses 75% of their bucket's included minutes.

**When:** After each usage ingest that moves a client from below 75% to 75% or above.

**Payload:**

```json
{
  "businessId": "b1a2c3d4-...",
  "thresholdPercent": 75,
  "totalMinutes": 375,
  "includedMinutes": 500
}
```

| Field | Type | Description |
|-------|------|-------------|
| `businessId` | `string` (UUID) | The client approaching their limit |
| `thresholdPercent` | `75` | Always `75` for this event |
| `totalMinutes` | `number` | Current total minutes for the period |
| `includedMinutes` | `number` | The bucket limit |

**Note:** Threshold events also trigger an email alert to the operator. Billing alerts require an active `bucket` billing rule on the client.

---

### billing.threshold_90

Same shape as `billing.threshold_75`. `thresholdPercent` is `90`.

**Payload:**

```json
{
  "businessId": "b1a2c3d4-...",
  "thresholdPercent": 90,
  "totalMinutes": 450,
  "includedMinutes": 500
}
```

---

### billing.threshold_100

Fires when a client reaches or exceeds 100% of their included minutes. Overage billing begins at this point for bucket-plan clients.

**Payload:**

```json
{
  "businessId": "b1a2c3d4-...",
  "thresholdPercent": 100,
  "totalMinutes": 503,
  "includedMinutes": 500
}
```

---

## 5. Managing Subscriptions

Webhook subscriptions are scoped to an operator org. An operator can have multiple subscriptions (e.g. one for a CRM, one for Slack alerts).

### Via Operator Admin UI

Go to **Settings → Webhooks**:
- Add a new endpoint and select topics
- View delivery history and retry failed deliveries
- Pause or delete a subscription

### Via API

Requires an operator-scoped API key with `webhooks:read` or `webhooks:write` scope.

**List subscriptions:**
```
GET /api/v1/webhooks
Authorization: Bearer <operator-key>
```

**Create subscription:**
```
POST /api/v1/webhooks
Authorization: Bearer <operator-key>
Content-Type: application/json

{
  "url": "https://your-server.com/webhooks/answering-service",
  "topics": ["call.created", "billing.threshold_75", "billing.threshold_100"]
}
```

Response includes the `secret` — save it, it won't be returned again.

**Delete subscription:**
```
DELETE /api/v1/webhooks/:id
Authorization: Bearer <operator-key>
```

---

*For the full API reference, see [API Reference](reference.md).*
