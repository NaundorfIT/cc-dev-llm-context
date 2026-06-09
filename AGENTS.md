# Contributing to this Canton developer guide

Guidance for humans and AI agents working in this repository — a curated guide
for building applications on the Canton Network. Use it when writing or reviewing
DAML and Canton/Splice integration code, and keep the guide accurate and
self-contained.

## How to use this repo

- **Skills** (`.cursor/skills/`; Claude Code loads the same bodies from
  `.claude/skills/`):
  - `canton-daml-development` — DAML templates, choices, and parties; Ledger/JSON
    API; Splice app-provider wiring (`WalletUserProxy`, preapprovals,
    `FeaturedAppRight`).
  - `canton-cip56-integrations` — token standard: holdings, transfers,
    pre-approval, DvP, traffic cost.
  - `canton-featured-app-compliance` — featured-app rewards and activity markers.
  - `canton-validator-infrastructure` — validator apply/onboard, Splice deploy,
    traffic metering.
  - `canton-ecosystem-contribution` — Development Fund proposals and Splice OSS.
- **Deep-dive docs** live under `context/` — see [README.md](README.md) for the
  full index.
- **Local iteration:** use `localnet/` (Splice LocalNet) before deploying to a
  network.

## Sourcing

Anchor technical claims in the public documentation and source repositories:

- [docs.canton.network](https://docs.canton.network) (consolidating unified hub)
- [docs.sync.global](https://docs.sync.global/index.html)
- [docs.digitalasset.com](https://docs.digitalasset.com)
- [docs.daml.com](https://docs.daml.com)
- [github.com/digital-asset](https://github.com/digital-asset)
- [github.com/DACH-NY](https://github.com/DACH-NY)
- [github.com/hyperledger-labs/splice](https://github.com/hyperledger-labs/splice)
- [github.com/canton-foundation/cips](https://github.com/canton-foundation/cips)
  (full categorized index in `context/reference/cip-index.md`)
- [github.com/canton-foundation/canton-dev-fund](https://github.com/canton-foundation/canton-dev-fund)
- [github.com/canton-network/splice](https://github.com/canton-network/splice) (issues for OSS contribution)

Prefer version-pinned doc URLs (Canton 3.x changed API names versus Daml 2.x;
for example `domain` became `synchronizer` and `application_id` became
`user_id`). Treat token-price, supply, and traffic-fee numbers as time-sensitive
and governance-set; read live values from Scan rather than asserting fixed
figures.

## Editorial standards

This is a public guide, so keep every page self-contained and verifiable:

- Ground each claim in a public doc or source repo. If a figure cannot be backed
  by a public URL, leave it out.
- Prefer generic role names ("a wallet integrator", "an asset issuer") over
  specific product, operator, or party names, so guidance stays broadly useful.
- Treat traffic and tokenomics figures as measurements, not constants — verify on
  Scan before relying on them.
