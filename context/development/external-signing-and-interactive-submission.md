# External signing and interactive submission

How non-custodial applications let a user authorize their own transactions on
Canton, where the signing key never leaves the user's control. This is the write
path for **external parties**. The patterns below are distilled at the principle
level from public documentation and reference integrations; verify the exact API
surface against the version-pinned docs, since field names and the hashing scheme
change across releases.

## Local versus external parties

How a party is hosted determines who holds the signing key and how it writes:

- **Local (internal) party** — the validator/participant controls the key and can
  submit in a single step; built-in automation can act for it.
- **External party** — the private key is controlled solely by the party. The
  party signs a **hash of the transaction tree** that captures all ledger
  effects, so a malicious participant cannot alter what was authorized.

Reference: https://docs.canton.network/overview/reference/external-party

## Why two participant roles

Preparing an external transaction needs participant-side context (Daml
interpretation, current topology, ACS), so it cannot be built fully offline:

- **Preparing Participant Node (PPN)** — turns Ledger API commands into a Daml
  transaction. Requires a Ledger API user with **`readAs`** scope for the party.
- **Executing Participant Node (EPN)** — forwards the signed transaction to the
  synchronizer. Requires a user with **`actAs`** scope for the party.

These can be the same node or different nodes.

## Interactive submission: prepare → sign → execute

The external write path is three steps (versus one step for local parties):

1. **Prepare** — call `InteractiveSubmissionService/PrepareSubmission` (gRPC) or
   `POST /v2/interactive-submission/prepare`. The PPN returns an unsigned,
   encoded transaction **and the hash to sign**.
2. **Sign** — off the participant, sign the returned transaction hash with the
   party's private key (Ed25519). If you do not control the preparing
   participant, **recompute the hash yourself** and confirm it matches before
   signing, and optionally **visualize** the transaction (the Wallet SDK can
   decode the prepared protobuf for inspection / a policy engine).
3. **Execute** — call `InteractiveSubmissionService/ExecuteSubmission` (or
   `POST /v2/interactive-submission/...`) with the prepared transaction, the
   `hashing_scheme_version`, the `user_id`, a fresh `submission_id`, and the
   party signature(s) (format, algorithm, and signing key fingerprint).

- Interactive Submission Service: https://docs.canton.network/sdks-tools/api-reference/ledger-api-services
- Onboard and submit as an external party: https://docs.canton.network/appdev/quickstart/external-parties
- Preparing and signing transactions: https://docs.digitalasset.com/integrate/devnet/preparing-and-signing-transactions/index.html
- External signing onboarding tutorial: https://docs.digitalasset.com/build/3.4/tutorials/app-dev/external_signing_onboarding.html

## Onboarding an external party (topology)

Before the party can transact, allocate it on ledger by signing topology
transactions:

1. **Generate** the required topology transactions for the party from its public
   key (via the validator/admin API). Each returned topology transaction carries
   a **hex-encoded `hash`** to sign. (SDKs may expose the set of hashes to sign
   as a single combined value — the Wallet SDK calls it `multiHash`.)
2. **Sign** each topology hash with the party's private key.
3. **Submit** the signed topology transactions to allocate the party and grant
   ledger rights.

The same signing primitive works for both a **party topology hash** and a
**transaction hash**.

Onboarding tutorial: https://docs.digitalasset.com/build/3.5/quickstart/operate/how-to-onboard-external-parties-in-quickstart.html

## Choosing the prepare path

Not every command needs the same prepare call. In a reference wallet integration,
two distinct paths emerged, and picking the wrong one is a common source of
failed submissions:

- **Plain SDK prepare** — a pure single Canton Coin transfer (no utility-registry
  disclosures) can call the SDK's `prepareSubmission` (or
  `POST /v2/interactive-submission/prepare` with an empty
  `packageIdSelectionPreference`) directly.
- **Custom prepare with package preference** — any command whose disclosed
  contracts include **utility-registry** contracts, or a provider
  **batch-transfer** choice (for example a `WalletUserProxy_BatchTransfer`),
  needs the hardened path below. Registry blobs encode LF package *names* rather
  than hex ids, so without a `packageIdSelectionPreference` the participant's Daml
  engine throws `UNRESOLVED_PACKAGE_NAME`.

A simple decision rule: if `disclosedContracts` contains a utility-registry
template, take the hardened path; otherwise plain prepare is enough.

## Package and disclosure hardening

Multi-package apps (token standard, utility registry) fail at prepare/execute
time if the participant cannot resolve a referenced package or lacks a disclosed
contract. The hardened prepare path combines three mitigations, in order:

- **Preferred packages discovery** — resolve LF package *names* to the package
  *ids* the target participant prefers before preparing, to avoid
  `UNRESOLVED_PACKAGE_NAME`. Query
  `POST /v2/interactive-submission/preferred-packages` with
  `packageVettingRequirements` (each a `packageName` + the `parties` that must
  vet it); cache the name→id map per `(synchronizerId, party)`.
- **Disclosure rehydration** — registry HTTP responses often return hex
  `templateId`s whose **`createdEventBlob` still encodes package names**, so a hex
  template id alone does not mean the disclosure is participant-native. Re-fetch
  each registry/utility disclosure from the participant with
  `POST /v2/events/events-by-contract-id` using an `eventFormat` that sets
  `includeCreatedEventBlob: true` (filter by your party, then retry for any
  party), and submit the participant's `templateId` + `createdEventBlob` instead.
  Registry APIs hand back `disclosedContracts`, `factoryId`, and choice context
  to reuse rather than hand-rolling.
- **Package-name skew preference** — Canton rejects **two hex ids for the same LF
  package name**. When an on-ledger disclosure uses an *older* app package id than
  preferred-packages returns, put only the **vetted (upgrade-successor)** id in
  `packageIdSelectionPreference` for that name, and keep the other on-ledger
  utility ids as-is. Do not pad the preference with unrelated package ids (for
  example the transfer-instruction or amulet packages) — that reintroduces the
  duplicate-name conflict.

See [Ledger API v2 client patterns](ledger-api-patterns.md) for package name vs
id and the disclosure-fetch endpoints, and
[CIP-56 integration](cip-56-integration.md) for registry-driven flows.

## Signing and encoding details

The same Ed25519 primitive signs both hashes, but the inputs differ and encoding
mistakes cause silent `BAD SIGNATURE` / signature-verification failures at
execute time:

- **Transaction hash** — sign **exactly the 32 bytes** of the prepared
  transaction hash. Validate the length before signing; a wrong-length input
  usually means a base64 vs base64url decode mismatch upstream.
- **Party topology `multiHash`** — sign the **full** value (typically 34 bytes:
  a 2-byte type/length prefix + the 32-byte hash). Do **not** strip the prefix.
- **base64url vs base64** — hashes are often passed as base64url, but the SDK's
  execute/verify path and party-allocation API expect standard base64. Convert
  deliberately at the boundary (`-`→`+`, `_`→`/`, re-pad with `=`) rather than
  assuming one encoding end to end.

## Submission ids, deadlines, and authority freshness

- **Submission id** — the `submission_id` (and command id) must be **identical**
  across prepare and execute. Generate a fresh one per attempt and treat it as
  single-use; a replay guard on the backend prevents resubmitting the same signed
  transaction.
- **Deadlines** — a prepared transaction carries an `executeBefore` deadline.
  Errors mentioning `deadline-exceeded`, `executeBefore`, or "Ledger time is at
  or past deadline" mean the prepared transaction (or the offer it accepts)
  **expired**; surface that to the user and re-prepare rather than blindly
  retrying the stale signature.
- **`actAs` token freshness** — set the party on the auth controller *before*
  connecting so the issued token carries the `actAs` claim, and refresh/clear the
  backend's party-scoped token cache immediately before prepare. A token without
  the right `actAs` claim fails prepare even when everything else is correct.

## Numeric and template-id hygiene

- **`Numeric` amounts** — respect the instrument's scale/decimals and clamp
  values before prepare; sending more precision than the type allows is a common
  rejection.
- **Template id forms** — accept and normalize both the hex `packageId:Module:Entity`
  and the `#package-name:Module:Entity` forms for the JSON API.

## Authentication and authority

- The submitting **`user_id` must match the JWT subject** for authenticated
  Ledger API access; do not use an OAuth client id where the subject is expected.
- Grant the user **`actAs`/`readAs`** rights for the relevant party
  (`/v2/users/{id}/rights`). When a backend acts for a user-scoped party, obtain
  a party-scoped token (for example via OAuth2 token exchange) rather than a
  generic service token.
- Keep the trust boundary explicit: signing keys live client-side; the backend
  sees commands, prepared transactions, and signatures, never the private key.

## dApp signing-provider pattern (CIP-0103)

A non-custodial wallet can act as a **signing provider** for third-party dApps
without handing over keys: the dApp sends a prepare/execute request over the
CIP-0103 wallet JSON-RPC, the wallet shows the user a review screen, and the same
prepare → sign → execute path runs with the user's key. Constrain the proxied
Ledger API surface and guard against replay (single-use submission ids).

CIP-0103 dApp SDK: `@canton-network/dapp-sdk`; see
[DAML and API index](daml-and-api-index.md).

## Related

- [DAML and API index](daml-and-api-index.md)
- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [CIP-56 integration](cip-56-integration.md)
- [Canton error handling](canton-error-handling.md)
- [App rewards and markers](app-rewards-and-markers.md)
