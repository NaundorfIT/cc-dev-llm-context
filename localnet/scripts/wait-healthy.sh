#!/usr/bin/env bash
# Poll a LocalNet participant JSON Ledger API until it answers, so callers can
# wait for readiness before deploying a DAR. Non-fatal: prints status and
# returns 0 even on timeout (LocalNet can take a while on first boot).
#
# Inputs (env): JSON_API (default app-provider 3975), TIMEOUT_SECS (default 240)
set -uo pipefail

JSON_API="${JSON_API:-http://localhost:3975}"
TIMEOUT_SECS="${TIMEOUT_SECS:-240}"
INTERVAL=5
elapsed=0

echo "Waiting for participant JSON API at ${JSON_API}/v2/version (up to ${TIMEOUT_SECS}s) ..."
while (( elapsed < TIMEOUT_SECS )); do
  if curl -fsS -o /dev/null "${JSON_API}/v2/version" 2>/dev/null; then
    echo "Participant JSON API is responding."
    exit 0
  fi
  sleep "${INTERVAL}"
  elapsed=$(( elapsed + INTERVAL ))
done

echo "Participant JSON API not confirmed within ${TIMEOUT_SECS}s."
echo "LocalNet may still be initializing; check 'make status' and 'make logs'."
exit 0
