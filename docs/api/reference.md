---
title: API Reference
version: 1.0
date: 2026-03-26
base_url: https://your-portal.com
---

# API Reference

The portal REST API (`/api/v1/`) allows operators and their integrators to ingest calls, retrieve call data, query on-call schedules, manage usage data, and configure webhooks programmatically.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Error Format](#2-error-format)
3. [API Scopes](#3-api-scopes)
4. [Endpoints](#4-endpoints)
   - [Calls](#calls)
   - [On-Call](#on-call)
   - [Usage](#usage)
   - [Billing](#billing) — estimate, invoices
   - [Webhooks](#webhooks)
5. [CSV Formats](#5-csv-formats)
6. [Rate Limits](#6-rate-limits)

---

## 1. Authentication

All `/api/v1/` endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer sk_live_...
```

API keys are created in the Operator Admin under **Settings → API Keys**. Each key is:
- Scoped to a set of permissions (see [API Scopes](#3-api-scopes))
- Either **operator-scoped** (access to all clients in your org) or **business-scoped** (access to one client)
- Stored as a SHA-256 hash — the raw token is shown only at creation

> **Keep your keys secure.** If a key is compromised, revoke it immediately in **Settings → API Keys**.

---

## 2. Error Format

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "message": "A human-readable description of what went wrong.",
    "code": "ERROR_CODE"
  }
}
```

**HTTP status codes:**

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `204` | No content (successful DELETE) |
| `207` | Multi-status (partial success — some rows succeeded, some failed) |
| `400` | Bad request — invalid parameters |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — token lacks required scope |
| `404` | Not found |
| `500` | Internal server error |

**Error codes:**

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing, invalid, or revoked token |
| `FORBIDDEN` | Token exists but lacks required scope or org access |
| `BAD_REQUEST` | Request body or parameters are invalid |
| `NOT_FOUND` | Requested resource does not exist or is not accessible to your key |
| `INTERNAL_ERROR` | Unexpected server error |

---

## 3. API Scopes

Each API key is granted one or more scopes. A request requiring a scope the key doesn't have returns `403 FORBIDDEN`.

| Scope | Grants access to |
|-------|-----------------|
| `calls:read` | Read call logs |
| `calls:write` | Ingest calls and upload recordings |
| `on_call:read` | Read on-call schedule |
| `billing:read` | Read billing estimates and usage data |
| `usage:write` | Upload usage data |
| `webhooks:read` | List webhook subscriptions |
| `webhooks:write` | Create and delete webhook subscriptions |

**Scope requirements per endpoint:**

| Endpoint | Required scope | Operator key | Business key |
|----------|---------------|:---:|:---:|
| `GET /api/v1/calls` | `calls:read` | ✅ | ✅ |
| `POST /api/v1/calls` | `calls:write` | ✅ only | ✗ |
| `GET /api/v1/calls/:id` | `calls:read` | ✅ | ✅ |
| `POST /api/v1/calls/:id/recording` | `calls:write` | ✅ only | ✗ |
| `GET /api/v1/on-call/current` | `on_call:read` | ✅ | ✅ |
| `GET /api/v1/billing/estimate` | `billing:read` | ✅ | ✅ |
| `GET /api/v1/billing/invoices` | `billing:read` | ✅ | ✅ |
| `GET /api/v1/usage` | `billing:read` | ✅ | ✅ |
| `POST /api/v1/usage` | `usage:write` | ✅ only | ✗ |
| `GET /api/v1/webhooks` | `webhooks:read` | ✅ only | ✗ |
| `POST /api/v1/webhooks` | `webhooks:write` | ✅ only | ✗ |
| `DELETE /api/v1/webhooks/:id` | `webhooks:write` | ✅ only | ✗ |

---

## 4. Endpoints

### Calls

---

#### `POST /api/v1/calls`

Ingest one or more call records.

**Auth:** `calls:write` — operator-scoped key required.

**Content-Type:** `application/json` (JSON array) or `multipart/form-data` (CSV file).

##### JSON request body

An array of call objects:

```json
[
  {
    "businessId": "4a3b2c1d-0000-0000-0000-000000000001",
    "timestamp": "2026-03-26T14:30:00Z",
    "callerName": "John Smith",
    "callerNumber": "+15555550100",
    "callbackNumber": "+15555550100",
    "callType": "urgent",
    "direction": "inbound",
    "durationSeconds": 180,
    "telephonyStatus": "completed",
    "message": "Caller reports chest pain. Requesting callback from Dr. Jones.",
    "recordingUrl": "https://storage.example.com/recordings/abc.mp3"
  }
]
```

##### Request fields

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `businessId` | `string` (UUID) | ✅ | The client business this call belongs to. Must be in your operator org. |
| `timestamp` | `string` (ISO 8601) | ✅ | When the call occurred |
| `callerName` | `string` | — | Caller's full name |
| `callerNumber` | `string` | — | Caller's phone number |
| `callbackNumber` | `string` | — | Callback number (may differ from callerNumber) |
| `callType` | `string` | ✅ | Call type slug. See valid values below. |
| `direction` | `"inbound"` \| `"outbound"` | ✅ | Call direction |
| `durationSeconds` | `number` | ✅ | Call duration in seconds. Use `0` for missed/voicemail. |
| `telephonyStatus` | `"completed"` \| `"missed"` \| `"voicemail"` | ✅ | Final call status |
| `message` | `string` | ✅ | Agent's written call note. Must not be empty. |
| `recordingUrl` | `string` | — | URL to a voicemail recording |

**Valid `callType` values:** `urgent`, `new-client`, `appointment`, `general-info`, `after-hours`

##### CSV file upload

For batch ingestion from CSV, send a `multipart/form-data` request with a `file` field containing the CSV file.

Required CSV headers (order matters):
```
timestamp,business_id,caller_name,caller_number,callback_number,call_type,direction,duration_seconds,telephony_status,message
```

See [CSV Formats](#5-csv-formats) for the full specification.

##### Response

**201 Created** — all rows inserted:
```json
{
  "data": {
    "inserted": 3,
    "errors": 0,
    "results": [
      { "businessId": "uuid-1", "status": "inserted", "callId": "uuid-a" },
      { "businessId": "uuid-1", "status": "inserted", "callId": "uuid-b" },
      { "businessId": "uuid-2", "status": "inserted", "callId": "uuid-c" }
    ]
  }
}
```

**207 Multi-Status** — some rows failed:
```json
{
  "data": {
    "inserted": 2,
    "errors": 1,
    "results": [
      { "businessId": "uuid-1", "status": "inserted", "callId": "uuid-a" },
      { "businessId": "uuid-1", "status": "inserted", "callId": "uuid-b" },
      { "businessId": "bad-id", "status": "error", "issue": "business_id \"bad-id\" does not belong to this operator org." }
    ]
  }
}
```

---

#### `GET /api/v1/calls`

List call logs for a business, paginated.

**Auth:** `calls:read` — operator or business-scoped key.

**Query parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | `1` | Page number (1-indexed) |
| `limit` | `25` | Results per page (max `100`) |
| `business_id` | — | Required for operator-scoped keys |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "timestamp": "2026-03-26T14:30:00Z",
      "call_type": "urgent",
      "direction": "inbound",
      "duration_seconds": 180,
      "telephony_status": "completed",
      "message": "Caller reports chest pain.",
      "priority": "high",
      "portal_status": "new"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 143
  }
}
```

---

#### `GET /api/v1/calls/:id`

Get a single call log with its action history.

**Auth:** `calls:read` — operator or business-scoped key.

**Path parameter:** `id` — UUID of the call log.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "business_id": "uuid",
    "timestamp": "2026-03-26T14:30:00Z",
    "caller_name": "John Smith",
    "caller_number": "+15555550100",
    "callback_number": "+15555550100",
    "call_type": "urgent",
    "direction": "inbound",
    "duration_seconds": 180,
    "telephony_status": "completed",
    "message": "Caller reports chest pain.",
    "priority": "high",
    "portal_status": "read",
    "has_recording": true,
    "message_actions": [
      {
        "type": "priority_updated",
        "by_user_id": "uuid",
        "at": "2026-03-26T14:35:00Z",
        "from_value": "medium",
        "to_value": "high"
      }
    ]
  }
}
```

Returns `404` if the call does not exist or does not belong to your key's scope.

---

#### `POST /api/v1/calls/:id/recording`

Upload a voicemail recording for an existing call.

**Auth:** `calls:write` — operator-scoped key required.

**Content-Type:** `multipart/form-data`

**Form fields:**

| Field | Description |
|-------|-------------|
| `file` | Audio file — MP3, WAV, or M4A. Max 50 MB. |

**Response 201:**
```json
{
  "data": {
    "callId": "uuid",
    "storagePath": "business-uuid/call-uuid.mp3"
  }
}
```

The recording is stored in the `call-recordings` private bucket. Access is via signed URL (generated by the portal on request, not exposed via this API).

---

### On-Call

---

#### `GET /api/v1/on-call/current`

Get the currently active on-call contact(s) for a business.

**Auth:** `on_call:read` — operator or business-scoped key.

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `business_id` | Required for operator-scoped keys |

**Response 200 — active shift:**
```json
{
  "data": {
    "businessId": "uuid",
    "asOf": "2026-03-26T14:30:00Z",
    "shiftId": "uuid",
    "shiftName": "Weeknight",
    "shiftEndsAt": "2026-03-27T09:00:00Z",
    "escalationSteps": [
      {
        "step": 1,
        "name": "Dr. Sarah Jones",
        "phone": "555-0101",
        "role": "Physician",
        "waitMinutes": 5
      },
      {
        "step": 2,
        "name": "Dr. Mark Chen",
        "phone": "555-0102",
        "role": "Physician",
        "waitMinutes": 10
      }
    ]
  }
}
```

**Response 200 — no active shift:**
```json
{
  "data": {
    "businessId": "uuid",
    "asOf": "2026-03-26T10:00:00Z",
    "shiftId": null,
    "shiftName": null,
    "shiftEndsAt": null,
    "escalationSteps": []
  }
}
```

Shifts are resolved against the business's configured timezone. Overnight shifts (starting one day, ending the next) are handled correctly.

---

### Usage

---

#### `POST /api/v1/usage`

Upload usage data (daily call/minute aggregates).

**Auth:** `usage:write` — operator-scoped key required.

**Content-Type:** `application/json` (array) or `multipart/form-data` (CSV).

##### JSON request body

```json
[
  {
    "businessId": "uuid",
    "date": "2026-03-25",
    "totalCalls": 47,
    "totalMinutes": 312
  }
]
```

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `businessId` | `string` (UUID) | ✅ | Must be in your operator org |
| `date` | `string` (YYYY-MM-DD) | ✅ | The usage period date |
| `totalCalls` | `number` | ✅ | Total calls for this date |
| `totalMinutes` | `number` | ✅ | Total minutes for this date |

**Response 200:**
```json
{
  "data": {
    "processed": 3,
    "errors": 0,
    "results": [
      { "businessId": "uuid", "date": "2026-03-25", "status": "processed" }
    ]
  }
}
```

**207** — partial success with same structure, some rows having `"status": "error"`.

---

#### `GET /api/v1/usage`

List usage periods for a business or operator org.

**Auth:** `billing:read` — operator or business-scoped key.

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `business_id` | Filter to a specific business |

Returns up to 100 records, ordered by `period_date` descending.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "period_date": "2026-03-25",
      "total_calls": 47,
      "total_minutes": 312,
      "source": "api",
      "status": "processed",
      "processed_at": "2026-03-25T23:00:00Z"
    }
  ]
}
```

---

### Billing

---

#### `GET /api/v1/billing/estimate`

Get the current billing estimate for a business (running total for the current month).

**Auth:** `billing:read` — operator or business-scoped key.

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `business_id` | Required for operator-scoped keys |

**Response 200:**
```json
{
  "data": {
    "businessId": "uuid",
    "periodStart": "2026-03-01T00:00:00.000Z",
    "periodEnd": "2026-03-26T23:59:59.999Z",
    "asOf": "2026-03-26T14:30:00.000Z",
    "totalCents": 21000,
    "callCount": 312,
    "lineItems": [
      {
        "ruleId": "uuid",
        "ruleName": "Base monthly fee",
        "unitDescription": "Monthly fee",
        "subtotalCents": 15000
      },
      {
        "ruleId": "uuid",
        "ruleName": "Urgent calls",
        "unitDescription": "24 calls × $2.50",
        "subtotalCents": 6000
      }
    ]
  }
}
```

All monetary amounts are in **integer cents** (`totalCents`, `subtotalCents`). Divide by 100 for dollar display. `periodStart` and `periodEnd` are ISO 8601 datetime strings.

---

#### `GET /api/v1/billing/invoices`

List past billing invoices for a business.

**Auth:** `billing:read` — operator or business-scoped key.

**Query parameters:**

| Parameter | Description |
|-----------|-------------|
| `business_id` | Required for operator-scoped keys |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "businessId": "uuid",
      "periodStart": "2026-02-01T00:00:00.000Z",
      "periodEnd": "2026-02-28T23:59:59.999Z",
      "status": "paid",
      "totalCents": 19500,
      "callCount": 278,
      "lineItems": [
        {
          "ruleId": "uuid",
          "ruleName": "Base monthly fee",
          "unitDescription": "Monthly fee",
          "subtotalCents": 15000
        }
      ],
      "paidAt": "2026-03-05T10:00:00.000Z",
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

**Invoice status values:** `open` (current period), `closed` (period ended, unpaid), `paid`.

---

### Webhooks

---

#### `GET /api/v1/webhooks`

List all webhook subscriptions for your operator org.

**Auth:** `webhooks:read` — operator-scoped key required.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "operator_org_id": "uuid",
      "url": "https://your-server.com/webhooks/answering-service",
      "topics": ["call.created", "billing.threshold_100"],
      "status": "active",
      "consecutive_failure_count": 0,
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

**Subscription status values:**

| Status | Meaning |
|--------|---------|
| `active` | Receiving events normally |
| `paused` | Manually paused; no deliveries |
| `failing` | 5+ consecutive dead-letter deliveries; paused automatically |

---

#### `POST /api/v1/webhooks`

Create a new webhook subscription.

**Auth:** `webhooks:write` — operator-scoped key required.

**Request body:**
```json
{
  "url": "https://your-server.com/webhooks/answering-service",
  "topics": ["call.created", "billing.threshold_75", "billing.threshold_100"]
}
```

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `url` | `string` (HTTPS URL) | ✅ | The endpoint to deliver events to |
| `topics` | `string[]` | ✅ | One or more event topics to subscribe to |

**Valid topics:** `call.created`, `usage.upload_processed`, `usage.upload_failed`, `billing.threshold_75`, `billing.threshold_90`, `billing.threshold_100`

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "url": "https://your-server.com/webhooks/answering-service",
    "topics": ["call.created"],
    "status": "active",
    "secret": "a1b2c3d4e5f6...",
    "created_at": "2026-03-26T14:00:00Z"
  }
}
```

> **Save the `secret` immediately.** It is returned only on creation and cannot be retrieved afterward. Use it to verify the `X-Webhook-Signature` header on incoming deliveries.

---

#### `DELETE /api/v1/webhooks/:id`

Delete a webhook subscription. No further events will be delivered.

**Auth:** `webhooks:write` — operator-scoped key required.

**Response:** `204 No Content`

---

## 5. CSV Formats

### Calls CSV

Used with `POST /api/v1/calls` (`multipart/form-data`).

**Required header row:**
```
timestamp,business_id,caller_name,caller_number,callback_number,call_type,direction,duration_seconds,telephony_status,message
```

- Header order matters
- `caller_name`, `caller_number`, `callback_number` may be empty strings
- `message` may contain commas if the field is quoted
- `duration_seconds` must be a non-negative integer

**Example:**
```csv
timestamp,business_id,caller_name,caller_number,callback_number,call_type,direction,duration_seconds,telephony_status,message
2026-03-26T14:30:00Z,4a3b2c1d-...,John Smith,5555550100,5555550100,urgent,inbound,180,completed,"Caller reports chest pain, requesting callback from Dr. Jones."
2026-03-26T14:45:00Z,4a3b2c1d-...,,,, general-info,inbound,0,missed,
```

### Usage CSV

Used with `POST /api/v1/usage` (`multipart/form-data`).

**Required header row:**
```
date,business_id,total_calls,total_minutes
```

**Example:**
```csv
date,business_id,total_calls,total_minutes
2026-03-25,4a3b2c1d-...,47,312
2026-03-25,5b4c3d2e-...,23,145
```

---

## 6. Rate Limits

The public API does not enforce rate limits at this time. Integrators are expected to batch calls appropriately — the `POST /api/v1/calls` endpoint accepts arrays of up to 1,000 records per request.

If you are polling `GET /api/v1/calls` for a real-time feed, consider using webhook subscriptions instead (`call.created`), which eliminates the need for polling.

---

*For webhook payload schemas and signature verification, see [Webhook Event Catalog](webhooks.md).*

*For the machine-readable OpenAPI specification, see [openapi.yaml](openapi.yaml).*
