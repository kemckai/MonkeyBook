#!/usr/bin/env bash
# Set Google OAuth client ID on the Railway web service. Usage:
#   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com ./scripts/set-google-oauth-railway.sh
set -euo pipefail

: "${GOOGLE_CLIENT_ID:?Set GOOGLE_CLIENT_ID to your OAuth Web client ID}"

echo "Setting Google OAuth vars on monkeybook (web)..."
railway variable set --service monkeybook \
  "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  "VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"

echo "Done. Redeploy monkeybook for the Sign in with Google button to appear."
