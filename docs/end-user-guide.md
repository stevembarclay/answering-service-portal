# Answering Service Portal — User Guide

A guide for your staff who will use the portal to manage messages and callbacks.

---

## Welcome to your answering service portal

Your answering service has set up this portal so you can stay on top of your calls without playing phone tag with your service provider.

Every call your answering service takes on your behalf appears here within seconds. You can see who called, what they needed, when they called, and whether anyone on your team has followed up yet.

This guide will walk you through everything: getting logged in, reading your messages, managing who's on call, and understanding your billing.

---

## Logging in

You'll receive an email from your answering service with a subject like **"You've been invited"** or **"Set up your portal."** It comes from your answering service's email address.

1. **Click the link in the email.** This sets up your account and logs you in automatically. The link expires after 24 hours — if it has expired, contact your answering service and ask them to resend the invite.

2. You'll land on the **Account Setup** page. Walk through the wizard to configure your business hours, who's on call, and your preferences. This takes about 5 minutes.

3. After setup, you'll land on your **Dashboard** every time you log in.

**Bookmark the portal URL** so you can come back directly without hunting for the email.

### Add to Home Screen (mobile)

If you check messages on your phone, you can install the portal as an app:
- **iPhone:** tap the Share button in Safari → "Add to Home Screen"
- **Android:** tap the three-dot menu in Chrome → "Add to Home screen"

You'll get a home screen icon and a full-screen app experience without the browser chrome.

---

## Your dashboard

The dashboard gives you a snapshot of what's happening.

### Priority Messages

A list of your most recent unread calls that need attention. Each row shows:
- The caller's phone number (and name, if your answering service captured it)
- A snippet of the agent's note
- When the call came in

Tap or click any row to read the full message. Use **View all unread messages →** at the bottom to jump to the Messages page.

A **Live** indicator in the header means the dashboard is connected to real-time updates. New calls will appear automatically without refreshing the page.

### Busiest Hours

A bar chart showing when your calls arrive, averaged over the last 30 days. Use this to anticipate your peak hours and make sure the right people are on call.

### Call Types

A ranked list of the types of calls you're receiving (urgent callbacks, new client inquiries, appointments, etc.), also from the last 30 days. Useful for identifying patterns — for example, if "urgent" calls are growing, your on-call coverage might need adjustment.

### This Month (est.)

Your running billing estimate for the current period. Updates as calls come in. The exact invoice is finalized by your answering service at the end of the billing period.

### Calls This Week

How many calls you've received this week compared to last week, with a small bar chart showing daily volume.

---

## Reading your messages

Go to **Messages** in the sidebar.

### Tabs

- **All** — every call, newest first
- **Unread** — calls you haven't opened yet (count shown in brackets)
- **Priority** — only high-priority calls (urgent, new-client)

### What the call types mean

| Type | What it means |
|---|---|
| **Urgent** | The caller needs an immediate callback. High priority. |
| **New Client** | A prospective new client called. High priority. |
| **Appointment** | A call about scheduling or an existing appointment. Medium priority. |
| **General Info** | A routine inquiry. Low priority. |
| **After Hours** | A call received outside your business hours. Priority depends on content. |

### Search

Use the search bar (top right of the Messages page) to find a message by caller name, phone number, or keywords in the agent's note.

### Opening a message

Click any row to open the full message. You'll see:
- The complete agent note
- Caller details (number, callback number, name)
- Call type, direction, duration
- When it arrived
- A flag icon to mark it for quality review
- A play button if your answering service provided a recording of the call

### Voicemail / recordings

If your answering service records calls and your plan includes recordings, a **Play** button appears in the message detail. Click it to listen. Recordings are stored securely and the link is only accessible to your account.

### Flagging a call for QA

If you notice a problem with how a call was handled (the agent gave incorrect information, missed a callback number, etc.), click the flag icon on the message. This marks it for quality review by your answering service. They'll follow up.

---

## Managing who's on call

Go to **On-Call Schedule** in the sidebar.

This is where you tell your answering service who to contact outside business hours, and in what order.

### Adding contacts

Go to the **Contacts** tab → **Add Contact**.

Each contact needs:
- **Name** — how they'll be identified in escalation notifications
- **Phone** — the number your answering service will call
- **Role** (optional) — e.g. "Senior Partner", "On-Call Physician"

Add everyone who might ever need to be called, even if they're not always on rotation.

### Setting up a weekly schedule

Go to the **Schedule** tab → **Add Shift**.

A shift defines:
- **Name** — e.g. "Weeknights", "Weekend Coverage"
- **Days of week** — which days this shift applies
- **Start time / End time** — when the shift is active. Overnight shifts (e.g. 10pm–8am) are supported.
- **Escalation chain** — who to call first, who to call if they don't answer, and how long to wait before escalating

**Example escalation chain:**
1. Dr. Smith — wait 5 minutes
2. Dr. Jones (no wait time — final step)

Your answering service will work through this chain when an urgent call comes in during this shift.

### The on-call API

If your practice management system or EHR can make API calls, you can query who's currently on call programmatically. Ask your answering service for an API key with the `on_call:read` scope and point your system to:

```
GET https://[your-portal-url]/api/v1/on-call/current
Authorization: Bearer [api-key]
?business_id=[your-business-id]
```

Response includes the shift name, current contact details, and the full escalation chain.

---

## Your billing

Go to **Billing** in the sidebar.

### The running estimate

At the top of the page you'll see your estimated total for the current billing period, how many calls it covers, and how many days are left. This is an estimate — the final amount is set by your answering service when they finalize the invoice.

### Invoice history

Below the estimate, past invoices appear in a list. Click any invoice to see the line items — calls billed, minutes billed, flat fees, etc. depending on your billing plan.

Invoices are finalized by your answering service (you'll be notified when one is ready). If you have questions about a charge, contact your answering service directly.

---

## Settings

Go to **Settings** in the sidebar.

### API keys

If you're a developer (or your practice management system needs to read your calls programmatically), you can create API keys here.

Click **Create key**, give it a label, and save the key somewhere secure — it's shown only once. You can revoke a key at any time if it's compromised.

Available read scopes: `calls:read`, `billing:read`, `on_call:read`.

### Your account

Your login email is managed through your answering service. To change it or reset your password:
- **Reset password:** go to the login page → "Forgot password" → enter your email → click the reset link.
- **Change email:** contact your answering service — they manage account provisioning.

---

## Getting help

**For billing questions or call handling issues:** contact your answering service directly. They're responsible for the content of your messages and your billing.

**For portal access problems** (can't log in, invite link expired, error messages): contact your answering service. They can resend your invite and troubleshoot access.

**To report a problem with a specific call:** use the flag icon in the message detail to mark it for QA review. Your answering service will see the flag.
