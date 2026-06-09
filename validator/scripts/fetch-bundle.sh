#!/usr/bin/env bash
# Download and extract the official Splice release bundle (Apache-2.0), which
# contains splice-node/docker-compose/validator. Nothing is vendored.
#
# Inputs (env): SPLICE_VERSION, SPLICE_BUNDLE_URL (optional), BUNDLE_DIR
set -euo pipefail

SPLICE_VERSION="${SPLICE_VERSION:?set SPLICE_VERSION (see .env.example)}"
BUNDLE_DIR="${BUNDLE_DIR:?set BUNDLE_DIR}"
ARCHIVE_NAME="${SPLICE_VERSION}_splice-node.tar.gz"
VALIDATOR_PATH="${BUNDLE_DIR}/splice-node/docker-compose/validator"

if [[ -f "${VALIDATOR_PATH}/start.sh" ]]; then
  echo "Bundle already present at ${VALIDATOR_PATH}; skipping download."
  echo "Run 'make clean' first to force a fresh download."
  exit 0
fi

URL="${SPLICE_BUNDLE_URL:-}"
if [[ -z "${URL}" ]]; then
  URL="https://github.com/digital-asset/decentralized-canton-sync/releases/download/v${SPLICE_VERSION}/${ARCHIVE_NAME}"
  echo "SPLICE_BUNDLE_URL not set; trying best-effort URL:"
  echo "  ${URL}"
  echo "If this fails, set SPLICE_BUNDLE_URL in .env to the official bundle link"
  echo "  (https://github.com/digital-asset/decentralized-canton-sync/releases)."
fi

mkdir -p "${BUNDLE_DIR}"
TMP_ARCHIVE="$(mktemp -t splice-node.XXXXXX.tar.gz)"
trap 'rm -f "${TMP_ARCHIVE}"' EXIT

echo "Downloading ${ARCHIVE_NAME} ..."
if ! curl -fSL "${URL}" -o "${TMP_ARCHIVE}"; then
  echo "ERROR: download failed from ${URL}" >&2
  echo "Set SPLICE_BUNDLE_URL in .env to the official bundle URL and retry." >&2
  exit 1
fi

if ! gzip -t "${TMP_ARCHIVE}" 2>/dev/null; then
  echo "ERROR: downloaded file is not a valid gzip archive (got an error/HTML page?)." >&2
  exit 1
fi

echo "Extracting into ${BUNDLE_DIR} ..."
tar xzf "${TMP_ARCHIVE}" -C "${BUNDLE_DIR}"

if [[ ! -f "${VALIDATOR_PATH}/start.sh" ]]; then
  echo "ERROR: expected ${VALIDATOR_PATH}/start.sh after extraction; bundle layout differs." >&2
  exit 1
fi

echo "Validator compose ready at ${VALIDATOR_PATH}"
