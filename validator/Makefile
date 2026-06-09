# DevNet validator kickstart - thin wrapper around the official Splice validator
# Docker Compose. Run `make help` for the available targets.
#
# A real DevNet validator also requires a static egress IP allowlisted by your
# Super Validator sponsor. See README.md.

SHELL := /bin/bash
ROOT_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BUNDLE_DIR := $(ROOT_DIR)/.splice-bundle
export VALIDATOR_DIR := $(BUNDLE_DIR)/splice-node/docker-compose/validator

ifneq (,$(wildcard $(ROOT_DIR)/.env))
include $(ROOT_DIR)/.env
export
endif

SPLICE_VERSION ?= 0.6.3
export SPLICE_VERSION
export IMAGE_TAG := $(SPLICE_VERSION)
export ROOT_DIR BUNDLE_DIR

.DEFAULT_GOAL := help
.PHONY: help fetch prepare-secret up down status logs ports clean

help: ## Show this help
	@echo "DevNet validator kickstart (Splice $(SPLICE_VERSION))"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

$(VALIDATOR_DIR)/start.sh:
	@$(MAKE) fetch

fetch: ## Download and extract the pinned Splice bundle into .splice-bundle/
	@SPLICE_VERSION="$(SPLICE_VERSION)" SPLICE_BUNDLE_URL="$(SPLICE_BUNDLE_URL)" \
		BUNDLE_DIR="$(BUNDLE_DIR)" "$(ROOT_DIR)/scripts/fetch-bundle.sh"

prepare-secret: ## Self-generate a DevNet onboarding secret via the SV API
	@"$(ROOT_DIR)/scripts/prepare-secret.sh"

up: $(VALIDATOR_DIR)/start.sh ## Start the DevNet validator (downloads bundle if needed)
	@"$(ROOT_DIR)/scripts/up.sh"

down: ## Stop the validator (data is retained)
	@"$(ROOT_DIR)/scripts/down.sh"

status: ## Show running validator containers
	@docker ps --filter "name=splice-validator" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

logs: ## Tail validator logs (Ctrl-C to stop)
	@docker logs -f --tail=200 splice-validator-validator-1 2>/dev/null \
		|| echo "Validator container not found; is it running? (make status)"

ports: ## Print the local validator endpoints
	@echo "DevNet validator (Docker Compose) local endpoints:"
	@echo "  Wallet UI    : http://wallet.localhost"
	@echo "  Validator    : http://validator.localhost"
	@echo "  Participant  : http://participant.localhost"
	@echo "  Metrics      : http://validator.localhost/metrics, http://participant.localhost/metrics"
	@echo "Use Firefox/Chrome if .localhost names do not resolve."

clean: ## Stop the validator and delete the downloaded bundle (keeps named volumes)
	@"$(ROOT_DIR)/scripts/down.sh" || true
	@rm -rf "$(BUNDLE_DIR)"
	@echo "Removed .splice-bundle/. Note: Docker named volumes are retained; remove them manually if you want a full reset."
