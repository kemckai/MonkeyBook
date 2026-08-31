#!/usr/bin/env bash
# Set R2 env vars on both Railway services. Usage:
#   R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... ./scripts/set-r2-railway.sh
set -euo pipefail

: "${R2_ACCESS_KEY_ID:?Set R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?Set R2_SECRET_ACCESS_KEY}"

R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-26306fac58c3b28d0159261db3cea104}"
R2_BUCKET="${R2_BUCKET:-monkeybook-uploads}"
R2_PUBLIC_URL="${R2_PUBLIC_URL:-https://pub-f04212b0eb764b82807842faab8a82de.r2.dev}"

for svc in monkeybook monkeybook-worker; do
  echo "Setting R2 vars on $svc..."
  railway variable set --service "$svc" \
    "R2_ACCOUNT_ID=$R2_ACCOUNT_ID" \
    "R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID" \
    "R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY" \
    "R2_BUCKET=$R2_BUCKET" \
    "R2_PUBLIC_URL=$R2_PUBLIC_URL"
done

echo "Done. Redeploy both services for uploads to use R2."
