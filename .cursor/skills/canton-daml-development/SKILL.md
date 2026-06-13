---
name: canton-daml-development
description: >-
  Guidance for writing and reviewing DAML and Canton/Splice application code.
  Use when building or reviewing DAML templates, choices, parties, and tests, or
  wiring an app to the Canton Ledger/JSON API or Splice app-provider building
  blocks (WalletUserProxy, preapprovals, FeaturedAppRight).
---

# Canton DAML development

Use this skill when the task involves writing or reviewing DAML, or integrating
an application with Canton/Splice APIs.

## Approach

1. Use the current toolchain: dpm (the preferred CLI from Canton 3.4 onward;
   it replaces the Daml Assistant, which is removed at 3.5) with JDK 17+ and the
   Daml Studio VS Code extension. Scaffold from
   [cn-quickstart](https://github.com/digital-asset/cn-quickstart).
2. Model on-ledger logic with DAML templates and choices. Be deliberate about
   signatories and observers, because they define both authorization and who can
   see a contract. Test with Daml Script.
3. Decide how each party is hosted. Local parties can be driven by validator
   automation; external parties sign their own transactions (interactive
   submission on the gRPC Ledger API) and need a minting delegation or custom
   claiming automation for rewards.
4. Target the JSON Ledger API v2 (HTTP/WebSocket) for new application work; use
   the gRPC Ledger API for high throughput or non-JVM/non-JS languages. Use PQS
   for SQL querying (the removed JSON API v1 query-by-attribute is gone).
5. For token-standard interactions and provider attribution, prefer
   `WalletUserProxy`. For inbound CC transfers, consider maintaining transfer
   preapprovals. Plan for [CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)
   (~end of July 2026): traffic-based app rewards replace markers; optimize views
   and traffic, keep `FeaturedAppRight` active, and stop creating markers after
   rollout.
6. Iterate locally on LocalNet (Docker Compose) before deploying to a network.
7. Pin and verify the version line (3.4 vs 3.5); API names changed across
   versions (`domain` became `synchronizer`, `application_id` became `user_id`),
   and transaction behavior and sizes change across releases.
8. On the client side, follow the connection bootstrap sequence, read the ACS
   with `eventFormat` + `activeAtOffset` (3.4+), and resolve package names to
   ids. For external/non-custodial parties use the interactive submission flow
   (generate topology → sign → allocate, then prepare → sign → execute) with
   preferred-packages discovery and disclosed contracts. Handle errors by
   category (retry transient categories with backoff/deduplication; fix-and-retry
   request errors; do not retry auth/insufficient-traffic).

## Guardrails

- Anchor decisions in the official docs rather than assumptions: the protocol and
  APIs evolve. Prefer version-pinned URLs.
- Keep parties scoped to a single major role where an app spans multiple
  functions (issuer, wallet, exchange, and so on).

## Read for depth

- [Getting started build path](../../../context/development/getting-started.md)
- [Local dev stack (LocalNet)](../../../context/development/local-dev-stack.md)
- [Debugging and inspection](../../../context/development/debugging-and-inspection.md)
- [DAML and API index](../../../context/development/daml-and-api-index.md)
- [Ledger API v2 client patterns](../../../context/development/ledger-api-patterns.md)
- [External signing and interactive submission](../../../context/development/external-signing-and-interactive-submission.md)
- [Canton error handling](../../../context/development/canton-error-handling.md)
- [CIP-56 integration](../../../context/development/cip-56-integration.md)
- [CIP-56 allocation lock learnings](../../../context/development/cip-56-allocation-lock-learnings.md)
- [App rewards and markers](../../../context/development/app-rewards-and-markers.md)

## Official sources

- [docs.canton.network](https://docs.canton.network)
- [docs.daml.com](https://docs.daml.com)
- [docs.digitalasset.com](https://docs.digitalasset.com)
- [docs.sync.global](https://docs.sync.global/index.html)
- [hyperledger-labs/splice](https://github.com/hyperledger-labs/splice)
- [github.com/digital-asset](https://github.com/digital-asset)
- [github.com/DACH-NY](https://github.com/DACH-NY)
- [canton-foundation/cips](https://github.com/canton-foundation/cips)
