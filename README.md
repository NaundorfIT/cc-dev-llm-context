# cc-dev-llm-context

The ultimate starting point for getting productive on the **Canton Network** —
whether you want to **build an app**, **run a validator**, or **understand the
business and tokenomics**. It bundles curated knowledge, hands-on tooling (an MCP
server, a local network, and a DevNet validator wrapper), and on-demand skills
for AI agents.

See [AGENTS.md](AGENTS.md) for contributor guidance, sourcing, and editorial
standards.

> Canton, Splice, and the token standard evolve quickly. Treat the numbers and
> API names here as planning pointers and always confirm against the
> [official docs](#official-documentation-and-source) and live on-ledger values
> (Scan, `AmuletRules`) before depending on them.

---

## What is Canton?

Canton is a privacy-enabled, public permissioned blockchain network. A few terms
you will meet immediately:

- **Synchronizer** — orders and synchronizes transactions (called a *domain* in
  Canton 2.x).
- **Validator** — a node that hosts parties and submits/validates transactions;
  app providers and users run validators.
- **Super Validator (SV)** — operates the Global Synchronizer and sponsors new
  validators onto the network.
- **DAML** — the smart-contract language; apps are DAML packages (DARs) deployed
  to a participant and driven through the Ledger API.
- **Canton Coin (CC)** — the network's utility token; sequencing transactions
  costs *traffic*, which is purchased with CC.
- **CIP** — Canton Improvement Proposal, the governance mechanism.

New to all of it? Start with
[ecosystem-and-roles.md](context/business/ecosystem-and-roles.md).

---

## Choose your path

Three goal-based tracks. Each step links to a file under [`context/`](context/).

### Build an app

1. [Getting started](context/development/getting-started.md) — toolchain (`dpm`),
   `cn-quickstart`, and how the pieces fit.
2. [Local dev stack](context/development/local-dev-stack.md) — spin up a full
   local network with [`localnet/`](localnet/) and deploy your DAR.
3. [DAML & API entry points](context/development/daml-and-api-index.md) →
   [Ledger API v2 patterns](context/development/ledger-api-patterns.md) — connect,
   query the ACS, submit.
4. [CIP-56 token integration](context/development/cip-56-integration.md) and
   [external signing](context/development/external-signing-and-interactive-submission.md)
   for wallets and asset flows.
5. [App rewards & markers](context/development/app-rewards-and-markers.md) and
   [traffic-cost planning](context/development/traffic-cost-planning.md) before
   you go live; [debugging & inspection](context/development/debugging-and-inspection.md)
   when things misbehave.

### Run a validator

1. [Ecosystem & roles](context/business/ecosystem-and-roles.md) — decide whether
   to self-operate or use an existing operator.
2. [Validator onboarding](context/infrastructure/validator-onboarding.md) — the
   application process and onboarding mechanics.
3. [Validator node setup reference](context/infrastructure/validator-node-setup.md)
   — prerequisites, Helm vs Docker Compose, KMS, upgrades, monitoring. Stand up a
   real DevNet node with the [`validator/`](validator/) wrapper.
4. [Traffic operations](context/infrastructure/traffic-operations.md) — metering,
   purchase, and automatic top-up.
5. [Splice validator ops](context/infrastructure/splice-validator-ops.md) — the
   operator documentation index for ongoing operations.

### Understand the business

1. [Ecosystem & roles](context/business/ecosystem-and-roles.md) — who does what.
2. [Tokenomics overview](context/business/tokenomics-overview.md) — burn/mint,
   rounds, and rewards.
3. [Featured app program](context/business/featured-app-program.md) — how apps
   earn featured status and rewards.
4. [Canton Development Fund](context/business/canton-development-fund.md) —
   funding for ecosystem contributions (CIP-0082 / CIP-0100).
5. [CIP index](context/reference/cip-index.md) and
   [substantive CIPs](context/reference/substantive-cips.md) — governance and the
   proposals that matter most to builders.

---

## Tooling in this repo

### MCP server — serve this knowledge to AI clients

[`mcp/`](mcp/) is an [MCP](https://modelcontextprotocol.io) server (TypeScript,
stdio) that indexes the markdown under `context/` and the skills at startup — the
docs stay the single source of truth. Tools: search (`canton_search`), read a doc
(`canton_doc`), list topics, return a skill, an API quick reference
(`canton_api_ref`), and deprecation/rename checks (`canton_check_deprecation`).

```bash
cd mcp && npm install && npm run build && npm start
```

See [mcp/README.md](mcp/README.md) for Cursor / Claude Desktop configuration.

### LocalNet — a full local Canton, no sponsor needed

[`localnet/`](localnet/) is a one-command wrapper around the official Splice
LocalNet (three validators + synchronizer + wallet/scan UIs) so you can deploy a
DAR and test apps end to end — no Super Validator sponsor or VPN. It wraps
official upstream images; nothing third-party is vendored.

```bash
cd localnet && cp .env.example .env && make up
# LocalNet JSON API auth is on by default — see localnet/README.md
AUTH_TOKEN=... make deploy-dar DAR=path/to/your.dar
```

See [localnet/README.md](localnet/README.md) and
[local-dev-stack.md](context/development/local-dev-stack.md).

### DevNet validator — a real network-connected node

[`validator/`](validator/) wraps the official Splice validator Docker Compose to
stand up a **DevNet** validator. DevNet needs no approval form to onboard, but
does need a static egress IP allowlisted by a Super Validator sponsor.

```bash
cd validator && cp .env.example .env   # set SPONSOR_SV_URL, SCAN_URL, MIGRATION_ID, PARTY_HINT
make prepare-secret && make up
```

See [validator/README.md](validator/README.md) and the
[setup reference](context/infrastructure/validator-node-setup.md).

### Skills for AI agents

- **Cursor:** skills load from [.cursor/skills/](.cursor/skills/).
- **Claude Code:** [CLAUDE.md](CLAUDE.md) plus slash skills in
  [.claude/skills/](.claude/skills/) (e.g. `/canton-daml-development`).

---

## Knowledge base (full index)

### Business — understand the ecosystem

| Topic | File |
|-------|------|
| Ecosystem roles (validators, SVs, app providers, Foundation) | [context/business/ecosystem-and-roles.md](context/business/ecosystem-and-roles.md) |
| Tokenomics (burn/mint, rounds, rewards) | [context/business/tokenomics-overview.md](context/business/tokenomics-overview.md) |
| Featured app program (public process) | [context/business/featured-app-program.md](context/business/featured-app-program.md) |
| Canton Development Fund (CIP-0082 / CIP-0100) | [context/business/canton-development-fund.md](context/business/canton-development-fund.md) |

### Development — build an app

| Topic | File |
|-------|------|
| Getting started (dpm, cn-quickstart, LocalNet) | [context/development/getting-started.md](context/development/getting-started.md) |
| Local dev stack (LocalNet topology, ports, app wiring) | [context/development/local-dev-stack.md](context/development/local-dev-stack.md) |
| Debugging and inspection (Console, Daml Shell, PQS, web debuggers) | [context/development/debugging-and-inspection.md](context/development/debugging-and-inspection.md) |
| DAML and Canton/Splice API entry points | [context/development/daml-and-api-index.md](context/development/daml-and-api-index.md) |
| Ledger API v2 client patterns (bootstrap, ACS, reassignments) | [context/development/ledger-api-patterns.md](context/development/ledger-api-patterns.md) |
| External signing and interactive submission (non-custodial) | [context/development/external-signing-and-interactive-submission.md](context/development/external-signing-and-interactive-submission.md) |
| Canton error handling (categories, retry strategy) | [context/development/canton-error-handling.md](context/development/canton-error-handling.md) |
| CIP-56 token integration | [context/development/cip-56-integration.md](context/development/cip-56-integration.md) |
| App rewards, featured status, marker fair-use | [context/development/app-rewards-and-markers.md](context/development/app-rewards-and-markers.md) |
| Traffic-cost planning (batching, locking, markers) | [context/development/traffic-cost-planning.md](context/development/traffic-cost-planning.md) |
| Development Fund and Splice OSS contribution | [context/development/contributing-to-canton.md](context/development/contributing-to-canton.md) |

### Infrastructure — run a validator

| Topic | File |
|-------|------|
| Validator onboarding and application process | [context/infrastructure/validator-onboarding.md](context/infrastructure/validator-onboarding.md) |
| Validator node setup reference (DevNet/TestNet, Helm + Compose) | [context/infrastructure/validator-node-setup.md](context/infrastructure/validator-node-setup.md) |
| Traffic metering, purchase, and top-up | [context/infrastructure/traffic-operations.md](context/infrastructure/traffic-operations.md) |
| Splice deployment and operator doc index | [context/infrastructure/splice-validator-ops.md](context/infrastructure/splice-validator-ops.md) |

### Reference — look it up

| Topic | File |
|-------|------|
| CIP index (0000–0116 by category) | [context/reference/cip-index.md](context/reference/cip-index.md) |
| Substantive CIPs for builders (0116, 0112, 0107, 0104, …) | [context/reference/substantive-cips.md](context/reference/substantive-cips.md) |

---

## Accuracy and governance

Canton, Splice, and the token standard change frequently. Verify protocol details
and live economics (Scan, `AmuletRules`) against official sources before you
depend on them. Pin the versions you run and re-check after each upgrade.

Governance is tracked in the
[Canton CIPs repository](https://github.com/canton-foundation/cips) and summarized
in [cip-index.md](context/reference/cip-index.md). Notably,
[CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)
moves featured-app rewards from markers to traffic-based attribution around the
end of July 2026.

## Official documentation and source

- [docs.canton.network](https://docs.canton.network) (consolidating unified hub)
- [docs.sync.global](https://docs.sync.global/index.html)
- [docs.digitalasset.com](https://docs.digitalasset.com)
- [docs.daml.com](https://docs.daml.com)
- [github.com/digital-asset](https://github.com/digital-asset)
- [github.com/DACH-NY](https://github.com/DACH-NY)
- [digital-asset/decentralized-canton-sync](https://github.com/digital-asset/decentralized-canton-sync) (Splice release bundles)
- [canton-network/splice](https://github.com/canton-network/splice) (OSS source)
- [Canton CIPs](https://github.com/canton-foundation/cips)
- [Canton Development Fund](https://github.com/canton-foundation/canton-dev-fund)
- [canton-network/splice issues](https://github.com/canton-network/splice/issues)
- [Apply to set up a validator node](https://canton.foundation/apply-to-set-up-a-validator-node/)

## Contributing

Keep contributions grounded in public documentation and verify claims against the
[official sources](#official-documentation-and-source). See [AGENTS.md](AGENTS.md)
for contributor guidance and editorial standards.
