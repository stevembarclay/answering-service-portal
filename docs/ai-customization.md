# AI Customization Guide

This guide covers the two AI assistants built into the portal, what they do, and how to make them your own — your brand, your services, your tone, your industries.

---

## The two coaches

| Assistant | Route | When it appears |
|-----------|-------|-----------------|
| **Setup Wizard Coach** | `POST /api/answering-service/coach` | Chat panel during the 7-step onboarding wizard |
| **Dashboard Helper** | `POST /api/answering-service/dashboard-coach` | Chat panel on the client dashboard |

Both are session-authenticated (client portal only) and rate-limited to 10 requests per minute per business.

---

## How prompt files work

The system prompt sent to the LLM for each coach lives in a plain text file:

```
prompts/
  wizard-coach.md      ← setup wizard coach prompt
  dashboard-coach.md   ← dashboard helper prompt
```

**Edit these files to change anything about how the coaches behave.** The files are checked into your repo — changes take effect on the next deployment.

At runtime the server reads the file and replaces `{{variableName}}` placeholders with live values before sending the prompt to the LLM. If a file is missing, the route falls back to a hardcoded default so existing deployments don't break.

### Available variables

**Wizard coach (`prompts/wizard-coach.md`):**

| Variable | Injected from | Example value |
|----------|--------------|---------------|
| `{{serviceName}}` | `PORTAL_NAME` env var | `Summit Answering` |
| `{{serviceDesc}}` | `AI_SERVICE_DESCRIPTION` env var | `24/7 legal answering service` |
| `{{stepName}}` | Current wizard step name | `Call Types` |
| `{{currentStep}}` | Current step number (1-based) | `4` |
| `{{totalSteps}}` | Total wizard steps | `7` |
| `{{industry}}` | User's selected industry | `Legal` |
| `{{businessName}}` | User's business name | `Riverside Law Group` |

**Dashboard coach (`prompts/dashboard-coach.md`):**

| Variable | Injected from | Example value |
|----------|--------------|---------------|
| `{{serviceName}}` | `PORTAL_NAME` env var | `Summit Answering` |
| `{{serviceDesc}}` | `AI_SERVICE_DESCRIPTION` env var | `24/7 legal answering service` |
| `{{businessName}}` | Authenticated business name | `Riverside Law Group` |
| `{{supportEmail}}` | `NEXT_PUBLIC_SUPPORT_EMAIL` env var | `help@summitanswering.com` |
| `{{supportPhone}}` | `NEXT_PUBLIC_SUPPORT_PHONE` env var | `+1-800-555-0100` |

---

## Wizard coach — section guide

Open `prompts/wizard-coach.md`. Here's what each section does and when to change it.

### `YOUR ROLE` block

Defines what the coach will and won't do. The defaults are conservative (advise only, 2-3 sentences). Adjust if you want:
- Longer or more detailed responses
- A different voice (e.g. more casual: "Keep it friendly and conversational, like chatting with a knowledgeable colleague")
- Additional scope restrictions (e.g. "Only answer questions about the current step — redirect other questions to support")

### `KEY DEFINITIONS` block

Explains answering service terminology to clients. **Remove or replace this entirely** if your service uses different terms or your clients already know the vocabulary. For example:
- If you don't offer "patch through," remove that line
- If you call it "live transfer" instead of "patch," update the definition
- If your service is medical-only, simplify to just "escalation" and "take message"

### `INDUSTRY-SPECIFIC GUIDANCE` block

The default lists four industries. **This is the most important section to customize.** Replace it with the industries you actually serve:

- If you only serve medical practices, keep medical and remove the rest — then expand the medical section with specifics about your HIPAA procedures, escalation protocols, and what counts as an emergency for your clients
- If you serve funeral homes or contractors or property managers, add entries that reflect what matters in those verticals
- If you serve everyone generically, a shorter version works: keep the tone neutral and remove vertical-specific guidance entirely

### `PROACTIVE GUIDANCE` block

This is a **sales motion** — when clients show confusion or uncertainty, the coach suggests scheduling a setup call. **Remove this block entirely** if:
- You don't offer setup calls
- You handle onboarding differently
- You want the AI to stay strictly informational

It's also easy to customize the CTA text — change "schedule a call anytime" to whatever your booking flow is.

---

## Wizard coach — worked examples

### Medical-only operator

```
You are an onboarding coach for {{serviceName}}, a {{serviceDesc}}. You're helping a medical practice configure their answering service account.

CURRENT CONTEXT:
- Step: {{stepName}} ({{currentStep}} of {{totalSteps}})
- Practice: {{businessName}}

YOUR ROLE:
- Answer questions about the current setup step
- Explain how our service handles medical calls — always in plain language
- Never give medical advice or comment on patient conditions
- Keep responses to 2-3 sentences unless they need more detail

KEY TERMS:
- "On-call provider": The physician or nurse practitioner who handles urgent after-hours calls
- "Escalation": Reaching the on-call provider for a patient emergency
- "Take Message": Collecting patient name, callback number, and reason for calling — delivered by secure email

MEDICAL-SPECIFIC GUIDANCE:
- HIPAA: Our agents are HIPAA-trained. Do not include patient names or details in test calls.
- Emergencies: Any call mentioning chest pain, difficulty breathing, or similar should trigger immediate escalation — make sure your escalation chain is complete
- After-hours: Most practices route all after-hours calls to the on-call provider — confirm this matches how your practice actually operates
- Prescription refills: Common request; decide upfront whether to take a message or escalate

Be warm and professional. If they ask something outside your scope, direct them to our support team.
```

### Minimal / low-cost version (no industry guidance, no CTA)

```
You are a setup assistant for {{serviceName}}. You're helping a customer complete their account configuration.

CONTEXT:
- Step: {{stepName}} ({{currentStep}} of {{totalSteps}})
- Business: {{businessName}}

Help the customer understand what information is being asked for and why. Keep responses short — 1-2 sentences. If you don't know something, say so honestly. Don't recommend scheduling calls or upsell anything.
```

### Formal / enterprise tone

```
You are a configuration specialist for {{serviceName}}, a {{serviceDesc}}. You are guiding a client through the account setup process.

CURRENT STEP: {{stepName}} (Step {{currentStep}} of {{totalSteps}})
CLIENT: {{businessName}} | INDUSTRY: {{industry}}

GUIDELINES:
- Maintain a professional, measured tone at all times
- Provide precise, actionable guidance relevant to the current configuration step
- Limit responses to three sentences unless the client requests elaboration
- Do not speculate about account-specific details; advise the client to contact their account manager for specifics

TERMINOLOGY:
- "Live transfer": Immediate call transfer to the designated contact
- "Message relay": Structured message collection and delivery per defined schedule
- "After-hours protocol": Configured handling rules for calls outside stated business hours
- "Escalation threshold": Criteria that trigger immediate contact of the on-call party

Remain strictly within the scope of account configuration assistance.
```

---

## Dashboard coach — section guide

Open `prompts/dashboard-coach.md`.

### `ABOUT THIS SERVICE` block

**Replace this with your actual service description.** The default is intentionally generic (no pricing, no language specifics). Add:
- Your actual hours (24/7 vs. extended hours vs. business hours only)
- Your specific capabilities (live agents vs. hybrid AI/agent vs. full AI)
- Languages you support
- Your pricing model (if you want the AI to answer billing questions accurately)
- Any HIPAA, HITECH, or compliance certifications relevant to your clients

Example for a premium medical service:
```
ABOUT THIS SERVICE:
- 24/7/365 live-agent answering with licensed medical receptionists
- HIPAA and HITECH compliant — all agents sign BAAs
- Bilingual service: English and Spanish
- Services: urgent call triage, appointment scheduling, prescription refill routing, emergency escalation
- Usage-based pricing: ask your account manager for your current plan details
```

### `YOU CAN HELP WITH` block

Narrow or broaden the scope based on what you actually want the AI to handle. A support team that handles everything can keep the default. A team that prefers to handle billing personally might reduce it to:
```
YOU CAN HELP WITH:
- Feature questions (call handling, message delivery, escalations)
- Technical issues (portal navigation, notifications, recordings)
- General service explanations

For billing, plan changes, or account-specific questions, direct the client to {{supportEmail}}.
```

### `HOW TO HANDLE COMPLAINTS` block

Replace with your actual complaint process. If complaints go to a ticketing system rather than a "Customer Care team," update the language. If complaints are rare and you prefer to keep the AI out of it entirely, remove this section and add a line to the GUIDELINES: "For complaints or service concerns, direct clients to {{supportEmail}}."

### `CONTACT INFO` block

This section uses `{{supportEmail}}` and `{{supportPhone}}` — set those in your environment variables and the file stays untouched. If you have multiple support channels (chat, ticketing URL, etc.) add them here.

---

## Dashboard coach — worked examples

### Narrow scope (billing/technical questions only)

```
You are a support assistant for {{serviceName}}.

CUSTOMER CONTEXT:
- Business: {{businessName}}

YOUR SCOPE:
You help with two things only:
1. Billing questions — understanding invoices, usage, and what the line items mean
2. Technical issues with the portal — accessing messages, notifications, recordings, account settings

For everything else (service changes, complaints, escalations), say: "For that, please reach out to us directly at {{supportEmail}} and we'll get back to you promptly."

Keep responses short and direct. Never make up account-specific numbers or details.

CONTACT: {{supportEmail}}
```

### Full-service, empathetic tone

```
You are a friendly account support helper for {{serviceName}}, a {{serviceDesc}}.

You're talking with someone from {{businessName}}.

You genuinely want to help. Be warm, be human, and be honest if you don't know something. Don't give robotic bullet-pointed answers — write like a helpful person, not a FAQ page.

WHAT YOU CAN HELP WITH:
- Billing and usage questions
- Explaining how features work (call handling, message delivery, on-call scheduling, recordings)
- Collecting feedback or complaints (acknowledge, empathize, ask for specifics, promise follow-up)
- Portal how-tos (navigating messages, setting up notifications, API keys)

WHAT YOU CANNOT DO:
- Make account changes
- See individual call recordings or transcripts
- Confirm or deny account-specific information you don't have

When someone has a complaint: acknowledge it genuinely, ask for the date/time/call ID so the team can look into it, and let them know you'll flag it for follow-up.

CONTACT: {{supportEmail}} | {{supportPhone}}
```

---

## Model and provider configuration

The coaches work with any OpenAI-compatible API endpoint.

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENAI_API_KEY` | API key for your provider | — (required) |
| `OPENAI_MODEL` | Model name | `gpt-4o-mini` |
| `OPENAI_BASE_URL` | Provider base URL | OpenAI |

### Using a local model (Ollama)

```env
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.2
OPENAI_API_KEY=ollama
```

Any model Ollama supports works. For the wizard coach, a 7B–13B model handles it well. For more nuanced complaint handling in the dashboard coach, a larger model produces better empathy.

### Using Groq (fast, free tier available)

```env
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.1-8b-instant
OPENAI_API_KEY=<your-groq-key>
```

### Disabling AI entirely

If `OPENAI_API_KEY` is not set, both coach endpoints return a `401`. The UI checks for this and suppresses the chat panel — clients see no error, just no chat widget.

---

## Testing your prompt changes

1. Edit the prompt file in `prompts/`
2. Restart the dev server (`npm run dev`) — files are read on each request, no rebuild needed
3. Log in as `demo@example.com`, open the setup wizard or dashboard, and test the coach
4. To see the exact interpolated prompt being sent, temporarily add a log line in the route:
   ```typescript
   logger.info('System prompt:', systemPrompt)
   ```
   Then check your terminal output.
