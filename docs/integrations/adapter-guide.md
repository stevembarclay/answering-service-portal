---
title: Integration Adapter Interface
version: 1.0
date: 2026-03-26
audience: Operators and developers building native call source integrations
---

# Integration Adapter Guide

How to connect a call center telephony platform to the portal using the native adapter interface.

---

## Table of Contents

1. [Overview](#1-overview)
2. [The ICallSourceAdapter Interface](#2-the-icallsourceadapter-interface)
3. [Push vs. Pull Adapters](#3-push-vs-pull-adapters)
4. [RawCallInput — the common call format](#4-rawcallinput--the-common-call-format)
5. [Built-in Adapters](#5-built-in-adapters)
6. [Configuration in Operator Settings](#6-configuration-in-operator-settings)
7. [Integration Health Monitoring](#7-integration-health-monitoring)
8. [Building a Custom Adapter](#8-building-a-custom-adapter)

---

## 1. Overview

The integration layer sits between your telephony platform (StarTel, Amtelco, or any other) and the portal database. Its job is to translate call events from whatever format your telephony system produces into the common `RawCallInput` format that the portal understands.

```
Telephony Platform
      │
      ▼
ICallSourceAdapter
  ├── fetchNewCalls(since) → RawCallInput[]   ← pull-based
  └── testConnection()     → AdapterTestResult
      │
      ▼
callIngestService.ingestCalls()
      │
      ▼
call_logs table → Realtime → Client Portal
```

All adapters implement the same TypeScript interface. The rest of the platform treats them identically.

---

## 2. The ICallSourceAdapter Interface

```typescript
/**
 * Contract for any call source adapter.
 *
 * Push-based adapters (Zapier, direct API): the source calls our /api/v1/calls endpoint.
 * Pull-based adapters (StarTel, Amtelco): we poll the source on a schedule.
 */
export interface ICallSourceAdapter {
  /** Short identifier for logging and UI display */
  readonly name: AdapterName

  /** The operator org this adapter is configured for */
  readonly operatorOrgId: string

  /**
   * Fetch calls created or updated since the given date.
   * Returns an empty array if no new calls are available.
   * Called by the cron ingest job on the configured schedule.
   */
  fetchNewCalls(since: Date): Promise<RawCallInput[]>

  /**
   * Verify the adapter can reach the remote system.
   * Returns { ok: true } on success, { ok: false, message: "..." } on failure.
   * Called from the Settings UI when the operator clicks "Test Connection".
   */
  testConnection(): Promise<AdapterTestResult>

  /**
   * Return a short human-readable summary of this adapter's configuration.
   * Shown in the operator's integration health dashboard.
   * Example: "StarTel at https://api.startel.com/cmc (poll every 5 min)"
   */
  configSummary(): string
}
```

**Supporting types:**

```typescript
export type AdapterName = 'startel' | 'amtelco' | 'api_push' | 'zapier'

export type IngestSource = 'api' | 'csv' | 'startel' | 'amtelco' | 'zapier'

export interface AdapterTestResult {
  ok: boolean
  message: string
  latencyMs?: number
}
```

---

## 3. Push vs. Pull Adapters

### Push-based (direct HTTP / automation bridge)

The telephony platform calls `POST /api/v1/calls` directly via its outbound webhook, or an automation bridge (Zapier, Make, n8n) forwards the event. No adapter polling is needed. The `ApiPushAdapter` wraps this path to implement the interface for uniformity — it returns an empty array from `fetchNewCalls()` since data arrives via the HTTP handler.

**When to use:** Your telephony platform supports outbound HTTP webhooks, or you're using an automation bridge to forward call events.

### Pull-based (StarTel native, Amtelco native)

The portal polls the telephony platform's API on a schedule (default: every 5 minutes, configurable). `fetchNewCalls(since)` queries the platform for records newer than the given timestamp.

**When to use:** Your telephony platform exposes a REST API but doesn't support outbound webhooks, or you want a zero-configuration native integration without building a Zap.

---

## 4. RawCallInput — the common call format

All adapters translate their platform's data into `RawCallInput`:

```typescript
export interface RawCallInput {
  /** ISO 8601 timestamp — when the call occurred */
  timestamp: string

  /** UUID of the client business in the portal */
  businessId: string

  /** Caller's name, if available */
  callerName?: string

  /** Caller's phone number */
  callerNumber?: string

  /** Callback number (may differ from caller number) */
  callbackNumber?: string

  /**
   * Call type slug. Must be one of:
   * 'urgent' | 'new-client' | 'appointment' | 'general-info' | 'after-hours'
   * or a custom slug configured by the operator.
   */
  callType: string

  /** Call direction */
  direction: 'inbound' | 'outbound'

  /** Duration in seconds. Use 0 for missed calls and voicemails. */
  durationSeconds: number

  /** Final telephony status */
  telephonyStatus: 'completed' | 'missed' | 'voicemail'

  /**
   * The agent's written message / call note.
   * Required — must not be empty.
   * This is the primary value delivered to the client.
   */
  message: string

  /** URL to a voicemail recording, if one exists */
  recordingUrl?: string
}
```

### Validation rules

The ingest service rejects rows that fail any of these checks:

| Field | Rule |
|-------|------|
| `businessId` | Must be a UUID belonging to the operator's org |
| `timestamp` | Must be a parseable ISO 8601 string |
| `message` | Must be non-empty |
| `direction` | Must be `inbound` or `outbound` |
| `telephonyStatus` | Must be `completed`, `missed`, or `voicemail` |
| `durationSeconds` | Must be `>= 0` |
| `callType` | Must be non-empty |

Failed rows are logged to `call_ingest_errors` and visible in the operator's integration health dashboard.

---

## 5. Built-in Adapters

### ApiPushAdapter

Wraps the existing JSON/CSV ingest path. Used when data arrives via the `/api/v1/calls` endpoint (Zapier, custom scripts, direct API calls). Always returns an empty array from `fetchNewCalls()` — ingestion happens inline via the HTTP handler.

### StarTelAdapter

Polls the StarTel CMC RestAPI for new call records.

> **Skeleton implementation:** The StarTel adapter is a skeleton — it does not yet make real API calls. The field mapping table below is illustrative; verify field names against your StarTel CMC API documentation before production use.

**Configuration fields:**

| Field | Description |
|-------|-------------|
| `base_url` | Your StarTel CMC base URL, e.g. `https://api.yourstartelinstance.com/cmc` |
| `api_key` | StarTel API key |
| `poll_interval_minutes` | How often to poll (default: 5 minutes) |

**Field mapping — StarTel → RawCallInput:**

| StarTel field | RawCallInput field | Notes |
|--------------|-------------------|-------|
| `CallDateTime` | `timestamp` | ISO 8601 |
| `AccountId` | `businessId` | Must be pre-mapped to the business UUID in the portal |
| `CallerName` | `callerName` | |
| `CallerPhoneNumber` | `callerNumber` | |
| `CallbackNumber` | `callbackNumber` | |
| `CallType` | `callType` | Normalized to slug |
| `MessageText` | `message` | |
| `CallDuration` | `durationSeconds` | Converted from HH:MM:SS if needed |

### AmtelcoAdapter

Polls the Amtelco Infinity REST API for new call records.

> **Skeleton implementation:** The Amtelco adapter is a skeleton — it does not yet make real API calls. Verify field names against your Amtelco Infinity API documentation before production use.

**Configuration fields:**

| Field | Description |
|-------|-------------|
| `base_url` | Your Amtelco Infinity API base URL |
| `username` | API username |
| `password` | API password |
| `poll_interval_minutes` | Default: 5 minutes |

---

## 6. Configuration in Operator Settings

Adapter configuration is stored in `operator_orgs.settings.integration_config` as JSONB.

The schema:

```json
{
  "integration_config": {
    "startel": {
      "base_url": "https://api.example.com/cmc",
      "api_key": "sk_...",
      "poll_interval_minutes": 5
    },
    "amtelco": {
      "base_url": "https://amtelco.example.com/api",
      "username": "svc_user",
      "password": "...",
      "poll_interval_minutes": 5
    },
    "data_freshness_alert_hours": 2
  }
}
```

Only one native adapter (StarTel or Amtelco) is active at a time. If both are configured, StarTel takes precedence. Operators without either config fall back to the `ApiPushAdapter`.

### In the operator UI

Go to **Settings → Integrations**:
- Select your platform (StarTel or Amtelco)
- Enter credentials
- Click **Test Connection** to validate before saving
- Set the data freshness alert threshold (how many hours without new data before an alert fires)

---

## 7. Integration Health Monitoring

The portal tracks integration health per operator org and displays it in the **Integrations** section of the Operator Admin.

**Metrics displayed:**
- Last successful ingest timestamp
- Total call ingest errors (last 7 days)
- Data freshness status (green / amber / red based on hours since last ingest)
- Webhook delivery success rate

**Data freshness alerts:**
When no call data has been received for longer than `data_freshness_alert_hours` (default: 2 hours), the operator's integration dashboard shows a warning. This fires during the data-freshness cron job that runs hourly.

**Call ingest errors:**
Failed rows are logged to `call_ingest_errors` with the raw payload, issue description, and source. You can view and dismiss these from the integration health dashboard.

---

## 8. Building a Custom Adapter

To build an adapter for a telephony platform not yet supported natively:

### Step 1 — Add adapter type

Add your adapter name to `AdapterName` in `lib/integrations/types.ts`:

```typescript
export type AdapterName = 'startel' | 'amtelco' | 'api_push' | 'zapier' | 'yourplatform'
```

### Step 2 — Implement the interface

Create `lib/integrations/yourPlatformAdapter.ts`:

```typescript
import type { ICallSourceAdapter, AdapterTestResult } from './types'
import type { RawCallInput } from '@/lib/services/operator/callIngestService'

interface YourPlatformConfig {
  base_url: string
  api_key: string
  poll_interval_minutes?: number
}

export class YourPlatformAdapter implements ICallSourceAdapter {
  readonly name = 'yourplatform' as const
  readonly operatorOrgId: string
  private config: YourPlatformConfig

  constructor(operatorOrgId: string, config: YourPlatformConfig) {
    this.operatorOrgId = operatorOrgId
    this.config = config
  }

  async fetchNewCalls(since: Date): Promise<RawCallInput[]> {
    // Call your platform's API to get calls since `since`
    // Map each result to RawCallInput
    // Return [] if nothing new
    return []
  }

  async testConnection(): Promise<AdapterTestResult> {
    const start = Date.now()
    try {
      // Make a lightweight API call to verify connectivity
      const res = await fetch(`${this.config.base_url}/ping`, {
        headers: { Authorization: `Bearer ${this.config.api_key}` },
      })
      return {
        ok: res.ok,
        message: res.ok ? 'Connection successful' : `HTTP ${res.status}`,
        latencyMs: Date.now() - start,
      }
    } catch (err) {
      return { ok: false, message: String(err) }
    }
  }

  configSummary(): string {
    const interval = this.config.poll_interval_minutes ?? 5
    return `YourPlatform at ${this.config.base_url} (poll every ${interval} min)`
  }
}
```

### Step 3 — Register in adapterFactory.ts

Add your config type to `IntegrationConfig` in `lib/integrations/types.ts`, then register the adapter in `lib/integrations/adapterFactory.ts`:

```typescript
if (config.yourplatform) {
  return new YourPlatformAdapter(operatorOrgId, config.yourplatform)
}
```

### Step 4 — Add config parsing

In `adapterFactory.ts`, parse your adapter's config from `operator_orgs.settings.integration_config`:

```typescript
const yourplatform = rawConfig.yourplatform
if (
  isRecord(yourplatform) &&
  typeof yourplatform.base_url === 'string' &&
  typeof yourplatform.api_key === 'string'
) {
  config.yourplatform = {
    base_url: yourplatform.base_url,
    api_key: yourplatform.api_key,
    poll_interval_minutes: typeof yourplatform.poll_interval_minutes === 'number'
      ? yourplatform.poll_interval_minutes
      : undefined,
  }
}
```

### Step 5 — Add configuration UI

Add a new section in the operator's Integrations settings page (`components/operator/IntegrationConfigForm.tsx`) to accept and validate your adapter's credentials.

### Cron job

The cron ingest job (`app/api/cron/ingest/route.ts`) calls `getAdapterForOperator()` and invokes `fetchNewCalls(since)` on the returned adapter. Your adapter will be called automatically once registered.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Adapter** | An implementation of `ICallSourceAdapter` that bridges a specific telephony platform to the portal |
| **Pull-based** | The portal fetches data from the telephony system on a schedule |
| **Push-based** | The telephony system (or Zapier) sends data to the portal via HTTP POST |
| **RawCallInput** | The normalized call format accepted by `callIngestService.ingestCalls()` |
| **Ingest error** | A call row that failed validation; logged to `call_ingest_errors` |
| **Data freshness** | Whether call data has been received recently enough to be considered live |
