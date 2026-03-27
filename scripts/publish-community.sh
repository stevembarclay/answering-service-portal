#!/bin/bash
set -e

PUBLIC_REMOTE="${PUBLIC_REMOTE:-$1}"
if [ -z "$PUBLIC_REMOTE" ]; then
  echo "Usage: PUBLIC_REMOTE=git@github.com:org/repo.git ./scripts/publish-community.sh"
  echo "   or: ./scripts/publish-community.sh git@github.com:org/repo.git"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORK_DIR=$(mktemp -d)
echo "Working in $WORK_DIR"

# ── 1. Copy repo (exclude secrets, build artifacts, git history) ────────────
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*.local' \
  --exclude='.env.production' \
  "$REPO_ROOT/" "$WORK_DIR/"

echo "Repo copied."

# ── 2. Strip proprietary services ───────────────────────────────────────────

# HIPAA service layer
rm -rf "$WORK_DIR/lib/services/hipaa"

# Analytics
rm -f "$WORK_DIR/lib/services/operator/analyticsService.ts"

# Operator billing / export
rm -f "$WORK_DIR/lib/services/operator/operatorBillingService.ts"
rm -f "$WORK_DIR/lib/services/operator/billingExportService.ts"
rm -f "$WORK_DIR/lib/services/operator/invoiceService.ts"
rm -f "$WORK_DIR/lib/services/operator/exportService.ts"

# Billing rule templates (managed-platform feature)
rm -f "$WORK_DIR/lib/services/operator/billingTemplateService.ts"

# Integration health monitoring
rm -f "$WORK_DIR/lib/services/operator/integrationHealthService.ts"

# Bulk client import
rm -f "$WORK_DIR/lib/services/operator/clientImportService.ts"

# Native adapters (StarTel and Amtelco are managed-platform features)
rm -f "$WORK_DIR/lib/integrations/startelAdapter.ts"
rm -f "$WORK_DIR/lib/integrations/amtelcoAdapter.ts"

echo "Proprietary services stripped."

# ── 3. Strip proprietary UI components ──────────────────────────────────────

rm -f "$WORK_DIR/components/operator/AuditLogViewer.tsx"
rm -f "$WORK_DIR/components/operator/IntegrationHealthDashboard.tsx"
rm -f "$WORK_DIR/components/operator/OperatorBillingDashboard.tsx"
rm -f "$WORK_DIR/components/operator/BulkImportWizard.tsx"

# Operator AI coach (managed-platform feature)
rm -f "$WORK_DIR/components/operator/OperatorCoachChat.tsx"

# Billing template manager (only used by stripped billing-templates page)
rm -f "$WORK_DIR/components/operator/BillingTemplateManager.tsx"

echo "Proprietary components stripped."

# ── 4. Strip proprietary API routes ─────────────────────────────────────────

# Bulk import pages
rm -rf "$WORK_DIR/app/(operator)/operator/clients/import"

# Billing templates page
rm -rf "$WORK_DIR/app/(operator)/operator/billing-templates"

# Billing templates E2E tests (billing-templates UI is stripped above — tests would fail out of the box)
rm -f "$WORK_DIR/tests/e2e/operator/billing-templates.e2e.ts"

# Billing template unit tests (service is stripped above)
rm -f "$WORK_DIR/lib/services/operator/__tests__/billingTemplateService.test.ts"

# Billing export / PDF invoice routes
rm -f "$WORK_DIR/app/api/operator/billing/export/route.ts"
rm -f "$WORK_DIR/app/api/operator/billing/[id]/generate-pdf/route.ts"

# Call log export route (uses exportService)
rm -f "$WORK_DIR/app/api/operator/clients/[id]/export/calls/route.ts"

# Operator AI coach route
rm -rf "$WORK_DIR/app/api/operator/coach"

# Alert and digest cron routes (managed-platform features)
rm -f "$WORK_DIR/app/api/cron/data-freshness/route.ts"
rm -rf "$WORK_DIR/app/api/cron/data-freshness"
rm -f "$WORK_DIR/app/api/cron/weekly-digest/route.ts"
rm -rf "$WORK_DIR/app/api/cron/weekly-digest"
rm -f "$WORK_DIR/app/api/cron/demo-reset/route.ts"
rm -rf "$WORK_DIR/app/api/cron/demo-reset"

echo "Proprietary API routes stripped."

# ── 5. Strip private internal docs and Stintwell-specific content ─────────────

# AI agent instruction file — internal development tooling
rm -f "$WORK_DIR/CLAUDE.md"

# Agent guardrails (CLAUDE.md system — internal only)
rm -rf "$WORK_DIR/docs/agents"

# Design system docs (internal)
rm -rf "$WORK_DIR/docs/design"

# Strategy docs (business-sensitive — positioning, roadmap, open-core decision)
rm -rf "$WORK_DIR/docs/strategy"

# Handoff documents (internal session context)
rm -rf "$WORK_DIR/docs/handoffs"

# Archive (superseded PRDs and vision docs)
rm -rf "$WORK_DIR/docs/archive"

# Demo infrastructure — Stintwell-specific, not useful for self-hosters
rm -f "$WORK_DIR/docs/deployment/demo-setup.md"

# HIPAA compliance doc — references BAA with Stintwell; HIPAA service layer is
# stripped in step 2 above, so this document would only mislead community users
rm -f "$WORK_DIR/docs/hipaa-compliance.md"
rm -f "$WORK_DIR/docs/hipaa-whitepaper.md"

# Operator migration guide — references Bulk Import (managed-platform feature, stripped above)
rm -f "$WORK_DIR/docs/operator-migration-guide.md"

# Duplicate setup guide — docs/operator/setup-guide.md is canonical
rm -f "$WORK_DIR/docs/operator-setup.md"

# Design file — binary asset, not useful in the public repo
rm -f "$WORK_DIR/answering-service.pen"

echo "Private internal docs stripped."

# ── 6. Replace files with community versions ─────────────────────────────────

# dashboardService and messageService have fire-and-forget HIPAA audit hooks.
# Community versions are identical except those blocks are removed.
cp "$REPO_ROOT/lib/services/answering-service/dashboardService.community.ts" \
   "$WORK_DIR/lib/services/answering-service/dashboardService.ts"
cp "$REPO_ROOT/lib/services/answering-service/messageService.community.ts" \
   "$WORK_DIR/lib/services/answering-service/messageService.ts"

# Adapter factory — ApiPushAdapter only
cp "$REPO_ROOT/lib/integrations/adapterFactory.community.ts" \
   "$WORK_DIR/lib/integrations/adapterFactory.ts"

# Email service — no-op stub for threshold alerts; no digest/freshness functions
cp "$REPO_ROOT/lib/services/operator/emailService.community.ts" \
   "$WORK_DIR/lib/services/operator/emailService.ts"

# Analytics page — upgrade CTA
cp "$REPO_ROOT/app/(operator)/operator/analytics/page.community.tsx" \
   "$WORK_DIR/app/(operator)/operator/analytics/page.tsx"

# Billing page — upgrade CTA
cp "$REPO_ROOT/app/(operator)/operator/billing/page.community.tsx" \
   "$WORK_DIR/app/(operator)/operator/billing/page.tsx"

# Integrations page — no health tab
cp "$REPO_ROOT/app/(operator)/operator/integrations/page.community.tsx" \
   "$WORK_DIR/app/(operator)/operator/integrations/page.tsx"

# Clients list page — no OperatorCoachChat
cp "$REPO_ROOT/app/(operator)/operator/clients/page.community.tsx" \
   "$WORK_DIR/app/(operator)/operator/clients/page.tsx"

# New client page + actions — no billing template selection
cp "$REPO_ROOT/app/(operator)/operator/clients/new/page.community.tsx" \
   "$WORK_DIR/app/(operator)/operator/clients/new/page.tsx"
cp "$REPO_ROOT/app/(operator)/operator/clients/new/actions.community.ts" \
   "$WORK_DIR/app/(operator)/operator/clients/new/actions.ts"

# NewClientForm — no billing template dropdown
cp "$REPO_ROOT/components/operator/NewClientForm.community.tsx" \
   "$WORK_DIR/components/operator/NewClientForm.tsx"

# Client detail page — no analytics, no HIPAA audit
cp "$REPO_ROOT/app/(operator)/operator/clients/[id]/page.community.tsx" \
   "$WORK_DIR/app/(operator)/operator/clients/[id]/page.tsx"

# Client actions — no toggleHipaaModeAction
cp "$REPO_ROOT/app/(operator)/operator/clients/[id]/actions.community.ts" \
   "$WORK_DIR/app/(operator)/operator/clients/[id]/actions.ts"

# ClientDetailTabs — no analytics tab, no HIPAA section
cp "$REPO_ROOT/components/operator/ClientDetailTabs.community.tsx" \
   "$WORK_DIR/components/operator/ClientDetailTabs.tsx"

# Prompt files — generic placeholders (no TAS domain knowledge, no signal patterns)
cp "$REPO_ROOT/prompts/wizard-coach.community.md" \
   "$WORK_DIR/prompts/wizard-coach.md"
cp "$REPO_ROOT/prompts/dashboard-coach.community.md" \
   "$WORK_DIR/prompts/dashboard-coach.md"

# Operator coach prompt — strip entirely (route is also stripped)
rm -f "$WORK_DIR/prompts/operator-coach.md"

# vercel.json — ingest cron only
cp "$REPO_ROOT/vercel.community.json" \
   "$WORK_DIR/vercel.json"

echo "Community versions in place."

# ── 7. Replace env example and README ────────────────────────────────────────

cp "$REPO_ROOT/.env.community.example" "$WORK_DIR/.env.example"
cp "$REPO_ROOT/README.community.md"    "$WORK_DIR/README.md"

# Remove private-repo-only files that don't belong in the public repo
rm -f "$WORK_DIR/README.community.md"
rm -f "$WORK_DIR/.env.community.example"
rm -f "$WORK_DIR/vercel.community.json"
rm -f "$WORK_DIR/lib/integrations/adapterFactory.community.ts"
rm -f "$WORK_DIR/lib/services/operator/emailService.community.ts"
rm -f "$WORK_DIR/app/(operator)/operator/analytics/page.community.tsx"
rm -f "$WORK_DIR/app/(operator)/operator/billing/page.community.tsx"
rm -f "$WORK_DIR/app/(operator)/operator/integrations/page.community.tsx"
rm -f "$WORK_DIR/app/(operator)/operator/clients/page.community.tsx"
rm -f "$WORK_DIR/app/(operator)/operator/clients/[id]/page.community.tsx"
rm -f "$WORK_DIR/app/(operator)/operator/clients/[id]/actions.community.ts"
rm -f "$WORK_DIR/components/operator/ClientDetailTabs.community.tsx"
rm -f "$WORK_DIR/components/operator/NewClientForm.community.tsx"
rm -f "$WORK_DIR/app/(operator)/operator/clients/new/page.community.tsx"
rm -f "$WORK_DIR/app/(operator)/operator/clients/new/actions.community.ts"
rm -f "$WORK_DIR/lib/services/answering-service/dashboardService.community.ts"
rm -f "$WORK_DIR/lib/services/answering-service/messageService.community.ts"
rm -f "$WORK_DIR/prompts/wizard-coach.community.md"
rm -f "$WORK_DIR/prompts/dashboard-coach.community.md"

echo "README and env example replaced."

# ── 8. Init git and push ──────────────────────────────────────────────────────

cd "$WORK_DIR"
git init -b main
git add .
git commit -m "Community edition sync $(date +%Y-%m-%d)"
git remote add origin "$PUBLIC_REMOTE"
git push --force origin main

echo ""
echo "Done. Community edition pushed to $PUBLIC_REMOTE"

# Cleanup
rm -rf "$WORK_DIR"
