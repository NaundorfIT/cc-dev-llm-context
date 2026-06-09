#!/usr/bin/env bash
# Download and extract the official Splice LocalNet bundle (Apache-2.0).
# Nothing is vendored into the repo; this fetches upstream release artifacts.
#
# Inputs (env): SPLICE_VERSION, SPLICE_BUNDLE_URL (optional), BUNDLE_DIR
set -euo pipefail

SPLICE_VERSION="${SPLICE_VERSION:?set SPLICE_VERSION (see .env.example)}"
BUNDLE_DIR="${BUNDLE_DIR:?set BUNDLE_DIR}"
ARCHIVE_NAME="${SPLICE_VERSION}_splice-node.tar.gz"
LOCALNET_PATH="${BUNDLE_DIR}/splice-node/docker-compose/localnet"

if [[ -f "${LOCALNET_PATH}/compose.yaml" ]]; then
  echo "LocalNet bundle already present at ${LOCALNET_PATH}; skipping download."
  echo "Run 'make clean' first to force a fresh download."
  exit 0
fi

# Resolve the download URL. Prefer an explicit URL; otherwise derive a
# best-effort candidate from the GitHub release. If the candidate 404s, set
# SPLICE_BUNDLE_URL to the 'Download Bundle' link from the Splice docs:
#   https://docs.sync.global/app_dev/testing/localnet.html
URL="${SPLICE_BUNDLE_URL:-}"
if [[ -z "${URL}" ]]; then
  URL="https://github.com/hyperledger-labs/splice/releases/download/v${SPLICE_VERSION}/${ARCHIVE_NAME}"
  echo "SPLICE_BUNDLE_URL not set; trying best-effort URL:"
  echo "  ${URL}"
  echo "If this fails, set SPLICE_BUNDLE_URL in .env to the official bundle link."
fi

mkdir -p "${BUNDLE_DIR}"
TMP_ARCHIVE="$(mktemp -t splice-localnet.XXXXXX.tar.gz)"
trap 'rm -f "${TMP_ARCHIVE}"' EXIT

echo "Downloading ${ARCHIVE_NAME} ..."
if ! curl -fSL "${URL}" -o "${TMP_ARCHIVE}"; then
  echo "ERROR: download failed from ${URL}" >&2
  echo "Set SPLICE_BUNDLE_URL in .env to the official Splice LocalNet bundle URL and retry." >&2
  exit 1
fi

# Sanity check: must be a gzip archive.
if ! gzip -t "${TMP_ARCHIVE}" 2>/dev/null; then
  echo "ERROR: downloaded file is not a valid gzip archive (got an error/HTML page?)." >&2
  exit 1
fi

echo "Extracting into ${BUNDLE_DIR} ..."
tar xzf "${TMP_ARCHIVE}" -C "${BUNDLE_DIR}"

if [[ ! -f "${LOCALNET_PATH}/compose.yaml" ]]; then
  echo "ERROR: expected ${LOCALNET_PATH}/compose.yaml after extraction; bundle layout differs." >&2
  echo "Inspect ${BUNDLE_DIR} and adjust LOCALNET_DIR if the upstream layout changed." >&2
  exit 1
fi

echo "LocalNet bundle ready at ${LOCALNET_PATH}"
