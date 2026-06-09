#!/usr/bin/env bash
# Self-generate a DevNet onboarding secret from the Super Validator app API.
# DevNet only: self-generated secrets are valid for ~1 hour and are one-time use.
#
# Inputs (env): SPONSOR_SV_URL (the SV APP url, starts with sv.)
set -euo pipefail

SPONSOR_SV_URL="${SPONSOR_SV_URL:?set SPONSOR_SV_URL in .env (the SV app url, starts with sv.)}"
ENDPOINT="${SPONSOR_SV_URL%/}/api/sv/v0/devnet/onboard/validator/prepare"

echo "Requesting a DevNet onboarding secret from:"
echo "  ${ENDPOINT}"
echo

RESP="$(curl -fsS -X POST "${ENDPOINT}")" || {
  echo "ERROR: request failed. Confirm SPONSOR_SV_URL is the SV *app* url (sv...)," >&2
  echo "that your egress IP is allowlisted, and that the network is DevNet." >&2
  exit 1
}

echo "Raw response: ${RESP}"

# Best-effort extraction of the secret value if jq is available.
if command -v jq >/dev/null 2>&1; then
  SECRET="$(printf '%s' "${RESP}" | jq -r 'if type=="string" then . elif has("secret") then .secret else empty end' 2>/dev/null || true)"
  if [[ -n "${SECRET}" && "${SECRET}" != "null" ]]; then
    echo
    echo "Onboarding secret: ${SECRET}"
    echo "Set it in .env as ONBOARDING_SECRET=... then run 'make up' within ~1 hour."
    exit 0
  fi
fi

echo
echo "Copy the secret from the response above into .env as ONBOARDING_SECRET=..."
echo "then run 'make up' within ~1 hour (the secret is one-time use)."
