#!/usr/bin/env bash
# Refresh .auth/client.json and .auth/operator.json against the staging URL.
# Run this once before recording demo videos.
#
# Usage:
#   PLAYWRIGHT_BASE_URL=https://your-staging.vercel.app ./scripts/setup-demo-auth.sh

set -euo pipefail

: "${PLAYWRIGHT_BASE_URL:?Set PLAYWRIGHT_BASE_URL to your staging URL before running}"

echo "Refreshing auth files for: $PLAYWRIGHT_BASE_URL"
export PLAYWRIGHT_BASE_URL

node scripts/refresh-test-auth.mjs

echo ""
echo "Done. Run 'npm run test:demo' to start recording."
