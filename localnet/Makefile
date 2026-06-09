# Canton LocalNet kickstart - thin wrapper around the official Splice LocalNet
# bundle. Run `make help` for the available targets.

SHELL := /bin/bash
ROOT_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BUNDLE_DIR := $(ROOT_DIR)/.localnet
LOCALNET_DIR := $(BUNDLE_DIR)/splice-node/docker-compose/localnet

# Load .env (if present) so SPLICE_VERSION, profiles, etc. are picked up.
ifneq (,$(wildcard $(ROOT_DIR)/.env))
include $(ROOT_DIR)/.env
export
endif

SPLICE_VERSION ?= 0.6.3
export IMAGE_TAG := $(SPLICE_VERSION)
export LOCALNET_DIR

SV_PROFILE ?= on
APP_PROVIDER_PROFILE ?= on
APP_USER_PROFILE ?= on

PROFILE_ARGS :=
ifeq ($(SV_PROFILE),on)
PROFILE_ARGS += --profile sv
endif
ifeq ($(APP_PROVIDER_PROFILE),on)
PROFILE_ARGS += --profile app-provider
endif
ifeq ($(APP_USER_PROFILE),on)
PROFILE_ARGS += --profile app-user
endif

COMPOSE = docker compose \
	--env-file $(LOCALNET_DIR)/compose.env \
	--env-file $(LOCALNET_DIR)/env/common.env \
	-f $(LOCALNET_DIR)/compose.yaml \
	-f $(LOCALNET_DIR)/resource-constraints.yaml \
	$(PROFILE_ARGS)

.DEFAULT_GOAL := help
.PHONY: help fetch up down restart status logs ports deploy-dar clean

help: ## Show this help
	@echo "Canton LocalNet kickstart (Splice $(SPLICE_VERSION))"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

$(LOCALNET_DIR)/compose.yaml:
	@$(MAKE) fetch

fetch: ## Download and extract the pinned Splice LocalNet bundle into .localnet/
	@SPLICE_VERSION="$(SPLICE_VERSION)" SPLICE_BUNDLE_URL="$(SPLICE_BUNDLE_URL)" \
		BUNDLE_DIR="$(BUNDLE_DIR)" "$(ROOT_DIR)/scripts/fetch-localnet.sh"

up: $(LOCALNET_DIR)/compose.yaml ## Start LocalNet (downloads the bundle first if needed)
	@echo "Starting LocalNet (profiles:$(PROFILE_ARGS)) ..."
	@$(COMPOSE) up -d
	@"$(ROOT_DIR)/scripts/wait-healthy.sh" || true
	@echo "LocalNet is up. See 'make ports' for endpoints."

down: ## Stop LocalNet (keeps volumes)
	@test -f "$(LOCALNET_DIR)/compose.yaml" && $(COMPOSE) down || echo "Nothing to stop."

restart: down up ## Restart LocalNet

status: ## Show running LocalNet containers
	@$(COMPOSE) ps

logs: ## Tail LocalNet logs (Ctrl-C to stop)
	@$(COMPOSE) logs -f --tail=200

ports: ## Print the common LocalNet endpoints
	@echo "LocalNet endpoints (prefix: 2xxx app-user, 3xxx app-provider, 4xxx sv):"
	@echo "  app-user   Ledger API (gRPC): localhost:2901   JSON API: localhost:2975"
	@echo "  app-user   Admin API        : localhost:2902   Validator API: localhost:2903"
	@echo "  app-provider Ledger API (gRPC): localhost:3901 JSON API: localhost:3975"
	@echo "  app-provider Admin API      : localhost:3902   Validator API: localhost:3903"
	@echo "  Wallet UI  : http://wallet.localhost:3000"
	@echo "  Scan UI    : http://scan.localhost:4000"
	@echo "  SV UI      : http://sv.localhost:4000"
	@echo "  Postgres   : localhost:$${DB_PORT:-5432}"

deploy-dar: ## Upload a DAR to the app-provider participant: make deploy-dar DAR=path/to.dar
	@test -n "$(DAR)" || { echo "Usage: make deploy-dar DAR=path/to/your.dar"; exit 1; }
	@DAR="$(DAR)" "$(ROOT_DIR)/scripts/deploy-dar.sh"

clean: ## Stop LocalNet, remove volumes, and delete the downloaded bundle
	@test -f "$(LOCALNET_DIR)/compose.yaml" && $(COMPOSE) down -v || true
	@rm -rf "$(BUNDLE_DIR)"
	@echo "Removed .localnet/ and LocalNet volumes."
