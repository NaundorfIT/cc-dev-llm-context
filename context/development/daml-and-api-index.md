# DAML and API index

Entry points for building Canton applications. Use this as a map; the linked
official documentation is the source of truth.

## Documentation homes (consolidating in 2026)

Canton developer docs are consolidating into a single hub. Know all four:

- [docs.canton.network](https://docs.canton.network) - the new unified hub with
  role-based learning paths and LLM-friendly query workflows (preferred entry
  point going forward).
- [docs.digitalasset.com](https://docs.digitalasset.com) - Digital Asset product
  docs, versioned (currently 3.4, with 3.5 emerging). Split into Overview,
  Build, Operate, Subnet, Integrate, and Utilities sub-sites.
- [docs.sync.global](https://docs.sync.global/index.html) - Global Synchronizer /
  Splice operations (synchronizer, validator, SV, token standard, Scan). Being
  retired into the consolidated hub but still authoritative for operations.
- [docs.daml.com](https://docs.daml.com) - the legacy Daml 2.x reference; still
  the most complete language reference.

> Version drift: Canton 3.x renamed terminology and APIs versus Daml 2.x
> (`domain` became `synchronizer`, `application_id` became `user_id`). Always
> confirm the version in the URL and do not mix 2.x and 3.x API names.

## DAML language and SDK

- DAML is a functional smart contract language. The core building blocks are
  templates (contract schemas with parameters, signatories, observers, an
  optional `ensure` clause and optional key/maintainer), choices (permissioned
  functions returning `Update`s; consuming by default, also nonconsuming,
  preconsuming, postconsuming), and parties (identities for the keys governing
  on-ledger access).
- Contracts are immutable; an update archives and recreates. The four ledger
  actions are create, exercise, fetch, and key assertion.
- Authorization (who can act) and privacy (who can see) are designed up front via
  signatories and observers.

Key language and tutorial links:

- Smart-contract tutorial: https://docs.digitalasset.com/build/3.4/tutorials/smart-contracts/intro.html
- Parties and authority: https://docs.digitalasset.com/build/3.4/tutorials/smart-contracts/parties.html
- Design patterns (propose-accept, delegation, locking): https://docs.digitalasset.com/build/3.4/sdlc-howtos/smart-contracts/develop/patterns.html
- Legacy language reference: https://docs.daml.com/daml/reference/templates.html

## Parties: local versus external

How a party is hosted determines how it transacts and how its rewards are
claimed:

- Local (internal) parties: the validator has submission rights and built-in
  automation can act for them directly.
- External parties: the signing key lives outside the validator, so the user
  signs their own transactions (interactive submission on the gRPC Ledger API).
  Reward claiming for external parties needs either a minting delegation or
  custom claiming automation.

External signing tutorial: https://docs.digitalasset.com/build/3.4/tutorials/app-dev/external_signing_onboarding.html

For the full onboarding-and-submission flow (generate topology → sign → allocate,
then prepare → sign → execute), see
[external-signing-and-interactive-submission.md](external-signing-and-interactive-submission.md).

## Ledger and integration APIs

- JSON Ledger API v2: HTTP/REST + WebSocket; v1 is removed as of 3.4. Target this
  for new work. OpenAPI: https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html
- gRPC Ledger API: full services (command submission, update/state services,
  party/user/package management, pruning, interactive submission for external
  signing). Use for high throughput or non-JVM/non-JS languages.
- PQS (Participant Query Store): SQL querying over Postgres, the replacement for
  the removed JSON API v1 query-by-attribute.

For client-side conventions that are easy to get wrong — the connection
bootstrap sequence, reading the ACS with `eventFormat` + `activeAtOffset` (a 3.4+
change), transaction visibility, package name vs id resolution, cross-synchronizer
reassignments, and version-resilient bindings — see
[ledger-api-patterns.md](ledger-api-patterns.md). For the non-custodial write
path (external parties, prepare → sign → execute), see
[external-signing-and-interactive-submission.md](external-signing-and-interactive-submission.md).
For structured error categories and retry strategy, see
[canton-error-handling.md](canton-error-handling.md).

## Splice app-provider building blocks

Splice ([hyperledger-labs/splice](https://github.com/hyperledger-labs/splice))
provides the on-ledger models and apps behind Canton Coin, the wallet, and
scan. The pieces app builders reach for most often:

- `WalletUserProxy` - recommended for token-standard interactions when
  attributing activity to a provider party.
- CC transfer preapprovals - enable cheaper, smoother repeat inbound transfers
  and can generate app reward attribution; see
  [app-rewards-and-markers.md](app-rewards-and-markers.md).
- `FeaturedAppRight` and `FeaturedAppActivityMarker` - the rights and activity
  records that let a featured provider attribute value-generating activity to
  itself; covered in [app-rewards-and-markers.md](app-rewards-and-markers.md).
- Scan APIs - the public read API/store exposing network activity, useful for
  monitoring, reconciliation, and reading live network parameters.

Splice Daml APIs and models: https://docs.sync.global/app_dev/daml_api/index.html
and https://docs.sync.global/app_dev/daml_models/index.html

## Token standard (CIP-56)

For building wallets or integrating assets, start with
[cip-56-integration.md](cip-56-integration.md), which covers holdings,
transfers, preapprovals, and DvP-style flows. For a runnable allocation lock
example and registry write-path details, see
[cip-56-allocation-lock-learnings.md](cip-56-allocation-lock-learnings.md).
Token Standard APIs:
https://docs.sync.global/app_dev/token_standard/index.html

## Tooling

- dpm (Digital Asset Package Manager): the preferred CLI from Canton 3.4 onward
  and a drop-in replacement for the Daml Assistant (removed at 3.5). Manages SDK
  install, scaffolding, compilation, codegen (Java/TypeScript), sandbox, PQS, and
  Daml Shell. Requires JDK 17+.
- Daml Studio (VS Code extension) is the supported IDE; Daml Script provides
  in-language testing; Daml Triggers provide off-ledger automation.
- Canton Console is the embedded admin interface for participant/sequencer/
  mediator nodes.
- Language bindings: Java, TypeScript/JavaScript, Python (`dazl-client`), plus
  community Go and Rust.
- NPM SDKs: `@canton-network/wallet-sdk`, `@canton-network/dapp-sdk` (CIP-0103
  browser dApp SDK), `@canton-network/core-ledger-client`.

See [getting-started.md](getting-started.md) for the end-to-end build path.

## Source repositories

- [digital-asset/daml](https://github.com/digital-asset/daml) - SDK and language.
- [digital-asset/canton](https://github.com/digital-asset/canton) - the Canton
  protocol.
- [hyperledger-labs/splice](https://github.com/hyperledger-labs/splice) - Splice
  reference apps and Canton Coin / Amulet models.
- [digital-asset/cn-quickstart](https://github.com/digital-asset/cn-quickstart) -
  app quickstart.
- [digital-asset/daml-finance](https://github.com/digital-asset/daml-finance) -
  tokenization library.
- [canton-foundation/cips](https://github.com/canton-foundation/cips) - Canton
  Improvement Proposals and governance.
- [CIP index](../reference/cip-index.md) - categorized map (protocol, tokenomics,
  governance, SV grants).
- [github.com/digital-asset](https://github.com/digital-asset) and
  [github.com/DACH-NY](https://github.com/DACH-NY) - broader orgs.

## Related

- [Getting started build path](getting-started.md)
- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [External signing and interactive submission](external-signing-and-interactive-submission.md)
- [Canton error handling](canton-error-handling.md)
- [App rewards and markers](app-rewards-and-markers.md)
- [CIP-56 integration](cip-56-integration.md)
- [CIP-56 allocation lock learnings](cip-56-allocation-lock-learnings.md)
- [Amulet lock sample app](../../examples/amulet-lock/)
- [Examples index](../../examples/README.md)
- [Traffic-cost planning](traffic-cost-planning.md)
- [Tokenomics overview](../business/tokenomics-overview.md)
