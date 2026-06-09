#!/usr/bin/env bash
# Stop the DevNet validator via the official Splice stop.sh. Data is retained.
#
# Inputs (env): VALIDATOR_DIR, IMAGE_TAG
set -euo pipefail

VALIDATOR_DIR="${VALIDATOR_DIR:?VALIDATOR_DIR not set}"
export IMAGE_TAG="${IMAGE_TAG:-0.6.3}"

if [[ ! -f "${VALIDATOR_DIR}/stop.sh" ]]; then
  echo "Nothing to stop (bundle not present at ${VALIDATOR_DIR})."
  exit 0
fi

cd "${VALIDATOR_DIR}"
./stop.sh
echo "Validator stopped. Data is retained; run 'make up' to resume."
