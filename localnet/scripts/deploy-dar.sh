#!/usr/bin/env bash
# Upload a DAR to a LocalNet participant via the JSON Ledger API v2.
# Endpoint: POST /v2/packages (application/octet-stream, raw DAR bytes),
# with ?vetAllPackages=true so the package is vetted on upload.
#
# Inputs (env):
#   DAR        path to the .dar file (required)
#   JSON_API   participant JSON API base URL (default app-provider 3975)
#   AUTH_TOKEN optional bearer token (LocalNet profiles with OAuth2 require one)
#   VET        vet on upload (default true)
set -euo pipefail

DAR="${DAR:?set DAR=path/to/your.dar}"
JSON_API="${JSON_API:-http://localhost:3975}"
VET="${VET:-true}"

if [[ ! -f "${DAR}" ]]; then
  echo "ERROR: DAR file not found: ${DAR}" >&2
  exit 1
fi

AUTH_ARGS=()
if [[ -n "${AUTH_TOKEN:-}" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${AUTH_TOKEN}")
fi

URL="${JSON_API}/v2/packages?vetAllPackages=${VET}"
echo "Uploading ${DAR} -> ${URL}"

http_code="$(curl -sS -o /tmp/deploy-dar-resp.json -w '%{http_code}' \
  -X POST "${URL}" \
  -H "Content-Type: application/octet-stream" \
  "${AUTH_ARGS[@]}" \
  --data-binary "@${DAR}")"

if [[ "${http_code}" == "200" ]]; then
  echo "Upload OK (HTTP 200). The package is vetted and ready to use."
else
  echo "ERROR: upload returned HTTP ${http_code}." >&2
  echo "Response:" >&2
  cat /tmp/deploy-dar-resp.json >&2 || true
  echo >&2
  echo "If this is an auth error, the LocalNet profile requires OAuth2; set AUTH_TOKEN." >&2
  exit 1
fi
