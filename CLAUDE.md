# Canton Network knowledge base (Claude Code)

This repository is a curated guide for building and operating on the Canton
Network. See [AGENTS.md](AGENTS.md) for contributor guidance, sourcing, and
editorial standards.

## Where to start

1. **Doc index** — [README.md](README.md#knowledge-base) (canonical topic list).
2. **Skills** — invoke on demand with `/canton-<topic>` (see below).
3. **Official docs** — prefer live sources over summaries here; pin versions
   (Canton 3.x: `synchronizer`, `user_id`; dpm replaces Daml Assistant at 3.5).

## Project skills (`.claude/skills/`)

| Skill | When to use |
| ----- | ----------- |
| `/canton-daml-development` | DAML templates, Ledger/JSON API, Splice app-provider wiring |
| `/canton-cip56-integrations` | Token standard: holdings, transfers, pre-approval, DvP, traffic cost |
| `/canton-featured-app-compliance` | Featured-app rewards, markers until CIP-0104, beneficiary splits |
| `/canton-validator-infrastructure` | Validator apply/onboard, Splice deploy, traffic metering |
| `/canton-ecosystem-contribution` | Development Fund proposals, Splice OSS contribution |

Cursor users load the same skill bodies from [.cursor/skills/](.cursor/skills/).

## MCP server

[mcp/](mcp/) serves this knowledge base over MCP (TypeScript, stdio). It indexes
`context/**/*.md` and the skills at startup, so the markdown stays the single
source of truth. Tools: `canton_search`, `canton_doc`, `canton_list_topics`,
`canton_skill`, `canton_api_ref`, `canton_check_deprecation`. Build/run with
`cd mcp && npm install && npm run build && npm start`; see
[mcp/README.md](mcp/README.md) for client config.

## Local dev stack and validator

[localnet/](localnet/) is a one-command wrapper around the official Splice
LocalNet (three validators + synchronizer + wallet/scan UIs) for testing your own
DAML/apps locally — no sponsor/VPN. `cd localnet && cp .env.example .env && make up`,
then `make deploy-dar DAR=...`. It wraps upstream images; nothing third-party is
vendored.

[validator/](validator/) wraps the official Splice validator Docker Compose to
stand up a real **DevNet** validator (`make prepare-secret && make up`). DevNet
needs no approval form to onboard, but does need a static egress IP allowlisted by
a Super Validator sponsor. Full reference:
[context/infrastructure/validator-node-setup.md](context/infrastructure/validator-node-setup.md).

## High-signal context files

- Build path: [context/development/getting-started.md](context/development/getting-started.md)
- Local dev stack (LocalNet):
 [context/development/local-dev-stack.md](context/development/local-dev-stack.md)
- Debugging and inspection:
 [context/development/debugging-and-inspection.md](context/development/debugging-and-inspection.md)
- APIs: [context/development/daml-and-api-index.md](context/development/daml-and-api-index.md)
- Ledger API v2 client patterns:
 [context/development/ledger-api-patterns.md](context/development/ledger-api-patterns.md)
- External signing / interactive submission (non-custodial):
 [context/development/external-signing-and-interactive-submission.md](context/development/external-signing-and-interactive-submission.md)
- Error handling (categories, retry):
 [context/development/canton-error-handling.md](context/development/canton-error-handling.md)
- Traffic costs (batching, locking, markers, wallet setup):
 [context/development/traffic-cost-planning.md](context/development/traffic-cost-planning.md)
- CIP map: [context/reference/cip-index.md](context/reference/cip-index.md)
- Builder-impact CIPs: [context/reference/substantive-cips.md](context/reference/substantive-cips.md)

Governance note: [CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)
moves featured-app rewards from markers to traffic-based attribution (~end July 2026).
