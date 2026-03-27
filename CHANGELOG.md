# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.0] — 2026-03-26

### Added — AI prompt customisation for self-hosted operators

- `prompts/wizard-coach.md` and `prompts/dashboard-coach.md` — editable system prompt files; operators change tone, industries, terminology, and CTAs without touching source code
- `lib/utils/promptLoader.ts` — shared `loadPrompt` / `interpolatePrompt` utility; `{{variable}}` syntax for runtime injection
- Both coach routes fall back to inline defaults if prompt files are missing (no breakage on existing deployments)
- `OPENAI_BASE_URL` env var: both coach routes now support any OpenAI-compatible provider — Ollama, Groq, Together AI, Azure OpenAI
- Fixed: `NEXT_PUBLIC_SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_PHONE` were documented in `.env.example` but never wired into the dashboard-coach prompt; now correctly injected as `{{supportEmail}}` / `{{supportPhone}}`
- Removed hardcoded `$39/month` pricing and `bilingual (English/Spanish)` from dashboard-coach default — these belong in the operator's version of the file
- `next.config.ts`: `outputFileTracingIncludes` added so `prompts/` files are bundled into Vercel serverless functions
- `docs/ai-customization.md`: full operator guide — variable reference, section-by-section walkthrough of both prompts, worked examples (medical-only, minimal, enterprise tone, narrow-scope dashboard), model swap instructions, testing guidance

### Changed
- `docs/`: stale POC module doc archived; `superpowers/` planning files removed; FLOW-VERIFICATION updated for Sprint 3/4; module-overview audience callout added; Mermaid diagram added to ARCHITECTURE.md
- OpenAPI spec: added `POST /calls`, `GET /on-call/current`, `GET /calls/{id}/recording`
- README: AI Features section; live OpenAPI spec link
- CONTRIBUTING: Option C rewritten (no mock service references); migration list updated; docs/ description fixed

---

## [1.5.0] — 2026-03-26

### Changed — Sprint 4: Responsive polish, docs refresh

- Responsive sidebar collapse on mobile, hamburger menu, bottom nav visible on small screens
- Responsive padding and consistent card gutters at all breakpoints
- Docs refresh: ARCHITECTURE.md updated, stale planning docs archived

---

## [1.4.0] — 2026-03-25

### Added — Sprint 3: Charts, custom domains, activity feed

- Dashboard charts: busiest-hours bar chart (Recharts, 24-bucket histogram) and call-type breakdown pie chart
- Operator activity feed (`/operator/activity`): live real-time feed across all clients filtered by `operator_org_id`
- Custom domains: operators can save a domain in Settings; `VERCEL_API_TOKEN` programmatically registers it with Vercel; middleware routes custom-domain requests with `x-operator-org-id` request header
- `operator_org_id` added to `call_logs` (migration `20260313100000`) enabling cross-client operator queries and Realtime filtering

---

## [1.3.0] — 2026-03-24

### Added — Sprint 2: Daily use — Realtime, voicemail, PWA

- Supabase Realtime push on `call_logs`: live unread badge increments and toast notifications on new calls
- `UnreadMessagesContext` shared across client portal for cross-component unread state
- Voicemail playback: `<audio>` element in message detail for calls with `has_recording: true`
- PWA install banner ("Add to Home Screen" prompt for mobile users)

---

## [1.2.0] — 2026-03-23

### Added — Sprint 1: Operator provisioning, integrations, and branding

**Add Client flow**
- New page `/operator/clients/new` — operator can provision a new client by entering business name, contact email, and optional billing template
- Server action creates the business, sends a magic-link invite via Supabase Auth Admin, and creates the `users_businesses` ownership row in a single flow
- Redirects to the new client detail page on success; shows inline error with the business ID if the invite step fails (business is preserved)

**Resend Invite**
- "Resend invite email" button added to the Settings tab of the client detail page
- Server action looks up the owner's email via service role and calls `auth.admin.inviteUserByEmail`
- Owner email is now fetched and stored in `ClientDetail` (via `auth.admin.getUserById`) and displayed in the Settings tab

**Zapier / StarTel Integration Guide**
- New page `/operator/integrations` — static step-by-step guide for connecting StarTel → this portal via Zapier webhooks
- Covers: creating a scoped API key, Zap trigger/action configuration, webhook URL, JSON body template, `callType` mapping note, finding the business ID, and CSV fallback
- "Integrations" nav item added to operator sidebar (Plug icon, between API & Webhooks and Settings)

**Branding UI**
- Operator Settings page converted from read-only display to editable form (`SettingsBrandingForm` client component)
- Editable fields: portal name, brand color (colour picker + hex text input, synced), logo URL, support email
- Server action (`saveBrandingAction`) merge-patches `operator_orgs.branding` and `operator_orgs.settings` JSONB columns, preserving fields not in the form
- Fixes `brandColor` → `primary_color` field-name inconsistency that caused brand colour to display as `undefined`

**Runtime branding injection**
- Client portal layout (`app/(platform)/answering-service/layout.tsx`) now fetches the operator org's `name` and `branding` for the authenticated business
- Injects `--color-primary` as a CSS variable on the layout wrapper, overriding Tailwind's primary colour token for the entire client portal
- Passes `logoUrl` to `SideNav`; shows `<img>` instead of the initials badge when a logo URL is set
- `OperatorNav` updated to accept `orgName` and `logoUrl` props; operator layout fetches and passes them
- Falls back to `PORTAL_NAME` / `PORTAL_BRAND_COLOR` env vars when no database branding is set

### Changed
- `OperatorNav`: hardcoded "OP" badge and "Operator Admin" label replaced by dynamic org initials and org name
- Operator layout: now fetches `operator_orgs.name` and `operator_orgs.branding` on every request to hydrate the nav

---

## [1.1.1] — 2026-03-23

### Added — Demo seed extensions

- `insertLateMarchCalls`: random calls Mar 11–25 plus 3 story calls with `portal_status='new'` (Victoria Nash urgent, Rachel Nguyen new-client, Tom Archer appointment) — all landing on Mar 25–26 for demo freshness
- `insertAdditionalClients`: 5 new operator client businesses (Summit Dental Group, Apex Property Management, Westlake Insurance Agency, Harbor HVAC Services, Brightside Pediatrics) with wizard sessions and call logs for a subset
- Operator clients search: removed duplicate/decorative search span from the top bar (ClientTable already has a functional search input)

---

## [1.1.0] — 2026-03-22

### Changed — UI redesign across all 18 screens

Complete visual overhaul of the client portal and operator admin. No API or data-layer changes.

**Design system**
- Dark sidebar (`#0f172a`) replaces the previous light navigation across both portals
- Manrope font adopted throughout (headings and body)
- Lucide icons replace Phosphor Icons in the desktop sidebar navigation
- Semantic Tailwind tokens (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary`) used consistently
- Unified card pattern: `rounded-xl border border-border bg-card overflow-hidden` with 52 px header rows

**Client portal**
- Login: two-panel split layout with dark marketing panel on the left, sign-in card on the right
- Forgot password / Reset password / Magic-link-sent: centred single-column card flows
- Dashboard: priority message strip + billing estimate and call volume stat cards
- Messages: search in the top bar, All / Unread / Priority tab filter, colour-coded priority badges
- On-Call: weekly grid schedule with Current Coverage status card, Shifts and Contacts list tabs
- Billing: estimated total card with days-remaining sub-text, invoice history rows
- Settings: API key manager with label input, key listing, and per-key Revoke action
- Setup wizard: 6-step progress indicator with inline Setup Assistant chat panel

**Operator admin**
- Sidebar: purple `OP` logo badge replacing the previous plain nav
- Clients: table with health-score indicator, All / At risk / Inactive filter tabs, search
- Usage: CSV drag-and-drop dropzone, call log upload, upload history table
- Billing Templates: empty-state with inline create prompt and top-bar "+ New Template" button
- API & Webhooks: operator API key manager (scopes, create, list) + webhook subscription builder
- Settings: Portal Configuration table (portal name, slug, default brand colour)

### Added

- `tests/e2e/visual-qa.e2e.ts` — Playwright screenshot suite covering all 15 routes (auth, client, operator) with console-error collection

---

## [0.1.0] — 2026-03-11

### Added

- Initial open-source release
- Client portal: 6-step onboarding wizard with AI Setup Assistant (GPT-4o-mini)
- Client portal: Dashboard, Messages, On-Call scheduling, Billing, Settings, Account Setup
- Operator admin: Clients table, Usage CSV upload, Billing Templates, API keys & Webhooks, Settings
- Public API: `GET /api/v1/on-call/current` with bearer-token auth and `on_call:read` scope
- Supabase Auth — email/password, magic link, password reset; no public sign-up
- Multi-tenant RLS: all data scoped to `business_id` at both application and database layers
- `STANDALONE_MODE=true` env var to bypass per-module DB check for self-hosted deployments
- Seed script creating demo business (Riverside Law Group) with 3 months of call and billing history
- E2E test suite: 28 Playwright tests covering auth flows, client portal, and operator admin

[1.6.0]: https://github.com/stevembarclay/answering-service-portal/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/stevembarclay/answering-service-portal/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/stevembarclay/answering-service-portal/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/stevembarclay/answering-service-portal/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/stevembarclay/answering-service-portal/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/stevembarclay/answering-service-portal/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/stevembarclay/answering-service-portal/compare/v0.1.0...v1.1.0
[0.1.0]: https://github.com/stevembarclay/answering-service-portal/releases/tag/v0.1.0
