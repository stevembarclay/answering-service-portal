# End-to-End Flow Verification

_Verified by code trace on 2026-03-26 against the current working tree (all Sprints 1–4 included)._

---

## Flow 1 — Operator provisions a client

**Path:** `/operator/clients/new` → `createClientAction` → business created → invite sent → template applied → redirect to client detail.

**Confirmed working:**
- `NewClientForm` submits via `useActionState` to `createClientAction` (`app/(operator)/operator/clients/new/actions.ts`).
- Action calls `supabase.from('businesses').insert(...)` with `operator_org_id` from session context.
- Uses `serviceRole.auth.admin.inviteUserByEmail(email, { redirectTo: .../answering-service/setup })` — requires `SUPABASE_SERVICE_ROLE_KEY`.
- `serviceRole.from('users_businesses').insert(...)` links the invited user to the business with `role: 'owner'`.
- If `templateId` is provided, `applyTemplateToClient(operatorOrgId, templateId, businessId)` is called (non-fatal if it fails).
- Redirects to `/operator/clients/${businessId}`.

**Gap:** If `SUPABASE_SERVICE_ROLE_KEY` is unset in the deployment environment, the invite step will fail with an Unauthorized error. The business record will have been created, but the invited user will not exist and no invite email will be sent. The action returns a descriptive error message in this case.

---

## Flow 2 — Client activates invite

**Path:** Supabase magic link → `/auth/callback` → `/answering-service/setup` → wizard session → dashboard.

**Confirmed working:**
- Supabase invite email sends a magic link with `redirectTo: .../answering-service/setup`.
- Next.js auth callback (`app/auth/callback/route.ts` — standard Supabase SSR pattern) exchanges the code for a session.
- `middleware.ts` allows the `/auth/callback` path (it's excluded from the matcher).
- `setup/page.tsx` calls `getBusinessContext()` and `getUser()`. If no session, redirects to `/login`.
- `WizardService.getOrCreateSession()` creates or resumes a wizard session in `wizard_sessions`.
- The `SetupWizardClient` renders the 7-step wizard.

**Gap:** The `redirectTo` in `createClientAction` uses `NEXT_PUBLIC_APP_URL`. If this env var is unset or set to the wrong URL in production, the invite link will go to the wrong host. No fallback validation at invite time. The action defaults to `http://localhost:3000` if unset, which will break production invites.

---

## Flow 3 — API call ingest

**Path:** `POST /api/v1/calls` → bearer auth → `ingestCalls` → `call_logs` INSERT with `operator_org_id` → Realtime fires → client dashboard shows toast.

**Confirmed working:**
- `POST /api/v1/calls` validates `Authorization: Bearer <key>` via `validateBearerToken(..., 'calls:write', ...)`.
- Bearer auth requires an operator-scoped key (`auth.operatorOrgId` must be set). Business-scoped keys are rejected with 403.
- Validates each row: `businessId` must belong to the operator's org, `message` must be non-empty, `timestamp` must be valid ISO 8601.
- `ingestCalls()` calls `assignPriority(row.callType)` then inserts into `call_logs` with `operator_org_id` set (Sprint 3).
- `fireWebhookEvent(operatorOrgId, 'call.created', ...)` is called after each successful insert (non-fatal).
- `AnsweringServiceDashboardClient` and `MessagesClient` both subscribe to Supabase Realtime on `call_logs` filtered by `business_id`. New rows trigger toast notifications for high-priority calls and increment unread counts.

**Gap:** Migration `20260313100000_add_operator_org_id_to_call_logs.sql` must be applied. Adds `operator_org_id` to `call_logs`, enabling cross-client operator queries and Realtime filtering.

The `recording_url` field in `RawCallInput` is accepted by the API but `callIngestService.ts` sets `has_recording: !!recordingUrl` without storing the URL. The actual recording URL must be stored in Supabase Storage separately, and the current implementation notes this as a TODO. Signed URL generation in `getMessage()` uses a convention of `{businessId}/{callId}.mp3` — callers must ensure the file is uploaded to that path.

---

## Flow 4 — Operator views activity

**Path:** `/operator/activity` → initial server fetch → `OperatorActivityFeed` subscribes Realtime on `call_logs` by `operator_org_id` → new call prepends to feed.

**Confirmed working:**
- `activity/page.tsx` fetches last 30 events via `supabase.from('call_logs').select(...).eq('operator_org_id', context.operatorOrgId).order('timestamp', { ascending: false }).limit(30)`.
- Supabase join `businesses(name)` is normalized for both array and object shapes.
- `OperatorActivityFeed` subscribes to `postgres_changes INSERT` on `call_logs` with `filter: operator_org_id=eq.{operatorOrgId}`.
- New calls prepend to the feed list (capped at 50 entries client-side).
- High-priority calls fire a Sonner toast with the client name.
- Live indicator shows a pulsing dot when `SUBSCRIBED`.

**Gap:** The Realtime filter `operator_org_id=eq.{operatorOrgId}` requires Supabase Realtime to be enabled on the `call_logs` table with the `operator_org_id` column present. This requires:
1. The Sprint 3 migration applied (column exists).
2. Supabase Realtime enabled for `call_logs` in the Supabase dashboard (Realtime → Tables → call_logs). This is a manual step not captured in migrations.

---

## Flow 5 — Custom domain routing

**Path:** Request on `portal.answerfirst.com` → middleware reads Host header → looks up `operator_orgs` by `custom_domain` → attaches `x-operator-org-id` → layout injects branding CSS variable.

**Confirmed working:**
- `middleware.ts` reads the `host` header and compares to `primaryHost` (derived from `NEXT_PUBLIC_APP_URL`).
- If host differs and isn't localhost, queries `operator_orgs` where `branding->>custom_domain = host`.
- If match found, sets `customDomainOrgId`.
- Root path (`/`) on a custom domain rewrites to `/answering-service` and sets `x-operator-org-id` header on the rewrite response.
- All other paths on a custom domain have `x-operator-org-id` set on the `supabaseResponse` headers.
- `app/(platform)/answering-service/layout.tsx` reads `headers().get('x-operator-org-id')` as a fallback when `business.operator_org_id` is absent.
- The resolved branding (primary color, logo URL, portal name) is injected as a CSS variable (`--color-primary`) and passed as props to `SideNav`.

**RESOLVED (Sprint 3):** Middleware now uses `request.headers.set()` before constructing the final response, making `x-operator-org-id` accessible to Server Components via `headers()`.
