# Getting started: build path

A practical, end-to-end path from zero to a deployed Canton app. Each step links
to the authoritative docs; pin to the version line you are targeting (3.4 vs
3.5), since API names changed across versions.

## 0. Prerequisites

- JDK 17+ and VS Code (with the Daml Studio extension).
- Decide your target version line (3.4 is the current production line; 3.5 is in
  development snapshots and removes the legacy Daml Assistant in favor of dpm).

## 1. Install the toolchain

Use dpm (Digital Asset Package Manager), the preferred CLI from Canton 3.4
onward. It manages SDK install, scaffolding, compilation, codegen, the sandbox,
PQS, and Daml Shell.

- dpm reference: https://docs.digitalasset.com/build/3.4/dpm/dpm.html

## 2. Scaffold a project

Clone the quickstart and bring it up, or start from a basic template.

- [digital-asset/cn-quickstart](https://github.com/digital-asset/cn-quickstart)
- CN Quickstart installation: https://docs.digitalasset.com/build/3.5/quickstart/download/cnqs-installation.html

A typical quickstart flow is `make setup && make build && make start`.

## 3. Write DAML

Define templates with their signatories and observers, then add choices to
transform state. Test with Daml Script (runs in-language against the IDE ledger,
with code coverage). Master the propose-accept and locking patterns before
wiring infrastructure.

- Tutorial: https://docs.digitalasset.com/build/3.4/tutorials/smart-contracts/intro.html
- Patterns: https://docs.digitalasset.com/build/3.4/sdlc-howtos/smart-contracts/develop/patterns.html

## 4. Build the DAR

Produce the deployable package (`.dar`) with dpm build.

## 5. Run locally

Use LocalNet (Docker Compose) for a realistic, self-contained local network (three
validators + synchronizer + wallet/scan UIs), then deploy your DAR and point your
app at it. This repo ships a one-command wrapper:

```bash
cd localnet && cp .env.example .env && make up
# Mint AUTH_TOKEN (required — see local-dev-stack.md#json-api-auth), then:
AUTH_TOKEN="$AUTH_TOKEN" make deploy-dar DAR=path/to/your.dar
```

Without `dpm`, smoke-test deploy with a bundle-shipped DAR after `make up`:
`DAR=.localnet/splice-node/dars/splice-token-test-trading-app-1.0.0.dar`.

### 5b. Try the Amulet lock sample app (recommended)

After LocalNet is up, run the bundled CIP-56 example — lock and unlock Canton
Coin via allocations, with DAML + web UI:

```bash
cd examples/amulet-lock
make build && make deploy && make serve
# http://localhost:8800 — Tap 100 CC, then Lock / Unlock
```

- Example README: [../../examples/amulet-lock/README.md](../../examples/amulet-lock/README.md)
- Builder learnings: [allocation lock learnings](cip-56-allocation-lock-learnings.md)
- Examples index: [../../examples/README.md](../../examples/README.md)

- LocalNet wrapper and endpoints: [../../localnet/README.md](../../localnet/README.md)
- Full guide (topology, ports, auth, app wiring): [local-dev-stack.md](local-dev-stack.md)
- Inspect/debug a local ledger: [debugging-and-inspection.md](debugging-and-inspection.md)
- LocalNet docs: https://docs.canton.network/sdks-tools/development-tools/localnet

## 6. Connect a UI

Run codegen (Java or TypeScript) from the DAR and build a frontend, or use the
browser dApp SDK / Wallet SDK.

- JSON Ledger API with TypeScript: https://docs.digitalasset.com/build/3.4/tutorials/json-api/canton_and_the_json_ledger_api_ts.html
- NPM: `@canton-network/dapp-sdk` (CIP-0103), `@canton-network/wallet-sdk`

## 7. Deploy to a network

Stand up a validator node and onboard, moving up the network tiers:

- DevNet: self-service onboarding (and self-featuring for testing reward flows).
- TestNet and MainNet: sponsored onboarding plus Tokenomics Committee approval.

See [../infrastructure/validator-onboarding.md](../infrastructure/validator-onboarding.md)
for the onboarding mechanics, and target the JSON Ledger API v2 for new
application work.

## Where to query live network state

Read live parameters (traffic pricing, CC state) from the Scan APIs rather than
hardcoding values:

- Scan APIs: https://docs.sync.global/app_dev/scan_api/index.html
- Current state of CC and traffic: https://docs.sync.global/app_dev/scan_api/scan_current_state_api.html

## Contributing to the ecosystem

If you want to fund or deliver shared infrastructure (not only your own app),
see [contributing-to-canton.md](contributing-to-canton.md) for the Development
Fund and Splice contribution paths.

## Related

- [Local dev stack (LocalNet)](local-dev-stack.md)
- [Debugging and inspection](debugging-and-inspection.md)
- [Contributing to Canton](contributing-to-canton.md)
- [DAML and API index](daml-and-api-index.md)
- [CIP-56 integration](cip-56-integration.md)
- [Examples index](../../examples/README.md)
- [Amulet lock sample app](../../examples/amulet-lock/)
- [CIP-56 allocation lock learnings](cip-56-allocation-lock-learnings.md)
- [Traffic-cost planning](traffic-cost-planning.md)
- [Validator onboarding](../infrastructure/validator-onboarding.md)
