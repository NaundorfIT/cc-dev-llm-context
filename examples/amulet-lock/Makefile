# Amulet Lock example - build, deploy to LocalNet, and serve the web UI.
# Run `make help` for the available targets.

SHELL := /bin/bash
ROOT_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
REPO_ROOT := $(abspath $(ROOT_DIR)/../..)
LOCALNET_DIR := $(REPO_ROOT)/localnet

DAR := $(ROOT_DIR)/daml/.daml/dist/amulet-lock-1.0.0.dar
DPM := $(shell command -v dpm 2>/dev/null || echo "$$HOME/.dpm/bin/dpm")

# The app-user participant hosts the lock owner party.
JSON_API ?= http://localhost:2975
LEDGER_USER ?= app-user
# Package upload needs participant-admin rights (the LocalNet admin user).
ADMIN_USER ?= ledger-api-user
PORT ?= 8800

.DEFAULT_GOAL := help
.PHONY: help build deploy serve clean

help: ## Show this help
	@echo "Amulet Lock example (LocalNet)"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

$(LOCALNET_DIR)/.localnet/splice-node/dars:
	@$(MAKE) -C $(LOCALNET_DIR) fetch

build: $(LOCALNET_DIR)/.localnet/splice-node/dars ## Build the DAR (fetches the LocalNet bundle for interface DARs if needed)
	@test -x "$(DPM)" || { echo "dpm not found; install it: curl https://get.digitalasset.com/install/install.sh | sh"; exit 1; }
	@cd "$(ROOT_DIR)/daml" && "$(DPM)" build

deploy: ## Upload the DAR to the app-user participant (mints the LocalNet unsafe JWT)
	@test -f "$(DAR)" || { echo "DAR not built; run 'make build' first."; exit 1; }
	@AUTH_TOKEN=$$(SUBJECT="$(ADMIN_USER)" python3 -c "$$MINT_JWT") \
		DAR="$(DAR)" JSON_API="$(JSON_API)" "$(LOCALNET_DIR)/scripts/deploy-dar.sh"

serve: ## Start the web UI on http://localhost:$(PORT)
	@PORT=$(PORT) LEDGER_USER=$(LEDGER_USER) python3 "$(ROOT_DIR)/web/serve.py"

clean: ## Remove build artifacts
	@rm -rf "$(ROOT_DIR)/daml/.daml"

# Mints the LocalNet default unsafe JWT (HS256, secret "unsafe") for $SUBJECT.
define MINT_JWT
import base64, hashlib, hmac, json, os
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
h = b64(json.dumps({'alg':'HS256','typ':'JWT'}).encode())
p = b64(json.dumps({'sub':os.environ['SUBJECT'],'aud':'https://canton.network.global'}).encode())
s = b64(hmac.new(b'unsafe', f'{h}.{p}'.encode(), hashlib.sha256).digest())
print(f'{h}.{p}.{s}')
endef
export MINT_JWT
