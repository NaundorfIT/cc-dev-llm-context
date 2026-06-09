#!/usr/bin/env bash
# Start the DevNet validator via the official Splice start.sh, assembling flags
# from .env. Re-starting an already-onboarded node uses an empty -o "".
#
# Inputs (env): VALIDATOR_DIR, IMAGE_TAG, SPONSOR_SV_URL, SCAN_URL, MIGRATION_ID,
#               PARTY_HINT, ONBOARDING_SECRET, ENABLE_WALLET, ENABLE_AUTH
set -euo pipefail

VALIDATOR_DIR="${VALIDATOR_DIR:?VALIDATOR_DIR not set}"
: "${SPONSOR_SV_URL:?set SPONSOR_SV_URL in .env}"
: "${SCAN_URL:?set SCAN_URL in .env}"
: "${MIGRATION_ID:?set MIGRATION_ID in .env}"
: "${PARTY_HINT:?set PARTY_HINT in .env}"

export IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG not set}"

args=(-s "${SPONSOR_SV_URL}" -c "${SCAN_URL}" -o "${ONBOARDING_SECRET:-}" \
      -p "${PARTY_HINT}" -m "${MIGRATION_ID}")
[[ "${ENABLE_WALLET:-on}" == "on" ]] && args+=(-w)
[[ "${ENABLE_AUTH:-off}" == "on" ]] && args+=(-a)

if [[ -z "${ONBOARDING_SECRET:-}" ]]; then
  echo "Note: ONBOARDING_SECRET is empty. This is correct only when re-starting an"
  echo "already-onboarded node. For first onboarding, run 'make prepare-secret' and"
  echo "set ONBOARDING_SECRET in .env."
fi

echo "Starting validator (IMAGE_TAG=${IMAGE_TAG}) ..."
cd "${VALIDATOR_DIR}"
./start.sh "${args[@]}"
echo "Started. See 'make status', 'make logs', and 'make ports'."
