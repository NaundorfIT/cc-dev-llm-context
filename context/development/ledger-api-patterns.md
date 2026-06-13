# Ledger API v2 client patterns

Practical patterns for talking to a Canton participant over the Ledger API v2
(JSON or gRPC). This page distills implementation-level lessons that are easy to
get wrong; the linked official documentation is the source of truth, and API
shapes change across the 3.x line, so confirm against the version you target.

> Version drift: Canton 3.x renamed terms versus Daml 2.x (`domain` became
> `synchronizer`, `application_id` became `user_id`) and removed JSON Ledger API
> v1. Target v2 and do not mix 2.x and 3.x names.

## Connection bootstrap sequence

Before any feature is usable, establish a known-good baseline against the
participant. A robust client runs an ordered handshake on connect:

1. **Get the Ledger API version** to confirm compatibility and to branch on
   version-specific behaviour.
2. **Read the latest pruned offsets** so you never query below them.
3. **Read the ledger end** (the current absolute offset) as your reference point
   for snapshots and pagination.
4. **List packages** so you can resolve template/package references.
5. **Read the user and its rights** (`CanActAs` / `CanReadAs`) to know which
   parties you may act or read as. In a local sandbox where user rights are
   empty, fall back to listing known parties.

Treat these as preconditions: cache the results and re-validate on reconnect.

- gRPC services overview: https://docs.canton.network/sdks-tools/api-reference/ledger-api-services
- JSON API overview: https://docs.canton.network/sdks-tools/api-reference/json-api

## Active contract set (ACS): read ledger end first

In Canton 3.4+, the ACS query (`/v2/state/active-contracts`, gRPC
`StateService.GetActiveContracts`) takes an **`eventFormat`** (the older
`filter`/`verbose` shape is superseded) and requires an **`activeAtOffset`** —
the absolute offset at which the snapshot is computed.

The reliable pattern is:

1. Call **`GET /v2/state/ledger-end`** to get the current absolute offset.
2. Pass that as **`activeAtOffset`** in the ACS request (or pass an older,
   non-pruned offset to read historical state — "time travel").
3. Supply an `eventFormat` with the party filters you need; set
   `includeCreatedEventBlob` when you will later need to disclose those
   contracts.

`activeAtOffset` must be no greater than the ledger end and no less than the
last pruning offset; offset `0` returns the empty set.

### Interface-filtered ACS (token standard)

For CIP-56 assets, query by **interface id** (for example
`#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding`) with
`includeInterfaceView: true`, then read `interfaceViews[0].viewValue` for
`amount`, `instrumentId`, and `lock`. Concrete template ids (such as
`Splice.Amulet:Amulet`) change across package versions; interface filters stay
stable. See [allocation lock learnings](cip-56-allocation-lock-learnings.md).

### Stale contract ids after UTXO-consuming commands

Holdings behave like UTXOs: allocate, transfer, and withdraw steps **archive**
input contracts and create new ones. Clients that cache contract ids from an
earlier ACS snapshot often see:

```text
HTTP 404: Contract could not be found with id ...
```

Refresh `ledger-end` + `active-contracts` **immediately before** building
`inputHoldingCids` or exercising a choice on a holding. Do not reuse ids across
UI sessions without re-querying.

- ACS query and ledger end: https://docs.canton.network/sdks-tools/api-reference/json-api
- v1 → v2 migration (ACS, query-by-attribute → PQS): https://docs.digitalasset.com/build/3.4/explanations/json-api/migration_v2.html
- `GetActiveContractsRequest` (Java): https://docs.digitalasset.com/javadocs/3.4/com/daml/ledger/api/v2/StateServiceOuterClass.GetActiveContractsRequest.html

## Reading transactions and visibility

Updates from the participant are a stream of **transactions**, **reassignments**,
and **topology transactions**. A transaction is a tree of create/exercise/archive
events; the Update Service can return the full tree or a flattened list.

- For **privacy/visibility analysis**, request transactions in the
  ledger-effects shape and read across **all parties you are entitled to see**,
  not just the admin user's rights, so you observe the full per-party
  projection. Different parties see different subsets of the same transaction by
  design (signatories/observers determine who sees what).
- For **history**, page using the ledger end as the upper bound and walk
  offsets; persist your last processed offset to resume.

Update Service and transaction trees: https://docs.canton.network/sdks-tools/api-reference/ledger-api-services

## Package name vs package id

Commands and prepared transactions can reference templates by **package name**
(`#package-name:Module:Template`) or by a concrete **package id** (a hex hash).
Resolve names to ids before submitting where the API requires it, and prefer the
preferred-packages discovery flow (see
[external signing and interactive submission](external-signing-and-interactive-submission.md))
to avoid `UNRESOLVED_PACKAGE_NAME`/`PACKAGE_NOT_FOUND`. Uploaded DARs must be
vetted before the packages they contain are usable; confirm a package appears in
the package list before relying on it.

Common Ledger API errors (`PACKAGE_NOT_FOUND`, etc.): https://docs.canton.network/appdev/troubleshooting-guide/ledger-api-errors

Two endpoints make name/disclosure resolution concrete for interactive
submission, and are easy to miss:

- **Preferred packages** — `POST /v2/interactive-submission/preferred-packages`
  takes `packageVettingRequirements` (each a `packageName` plus the `parties`
  that must have it vetted) and returns the participant's preferred hex
  `packageId` per name. Use it to build a `packageIdSelectionPreference`.
- **Disclosure blobs** — `POST /v2/events/events-by-contract-id` with an
  `eventFormat` that sets `includeCreatedEventBlob: true` returns the
  participant-native `templateId` + `createdEventBlob` for a contract id, which is
  the reliable way to (re)hydrate a disclosed contract. A hex `templateId` from a
  registry HTTP response is **not** proof the blob is participant-native — the
  blob can still encode a package *name*, so rehydrate from the participant
  before prepare. See
  [external signing and interactive submission](external-signing-and-interactive-submission.md).

## Party id form: full namespace, not bare hash

Across the SDK and Ledger API, pass the **full party id** (`namespace::hash`),
not just the hash. Submitting a bare hash as sender/receiver/informee surfaces as
`UNKNOWN_INFORMEES` at prepare time. Normalize ids you accept from users or other
systems to the full form before building commands.

## Newly allocated parties: bypass topology lookup

After allocating an external party, its topology transactions take time to
propagate. Helpers that resolve the synchronizer by listing synchronizers (for
example an SDK `setPartyId` that calls `listSynchronizers`) can fail for a
freshly allocated party with "Could not find any synchronizer id". The robust
pattern:

1. Determine the `synchronizerId` once — from configuration, or **discover it
   dynamically** from the topology connection when it is not configured.
2. Set the `synchronizerId` and `partyId` **directly on the ledger/token
   controllers** so subsequent calls skip the topology lookup entirely.
3. Treat the party as usable immediately after `allocateExternalParty`; defer any
   topology *verification* to a later background check rather than blocking the
   first submission on it.

## Cross-synchronizer reassignments

A contract can move between synchronizers. The Update stream surfaces this as an
**`UnassignedEvent`** (left a synchronizer) and a matching **`AssignedEvent`**
(arrived at another); pair them by their reassignment id to reconstruct the move.
Write paths that target a specific synchronizer pass a `synchronizerId`.

## Workflow correlation

To group related submissions into one logical flow, use the **`workflowId`** on
commands and propagate **W3C trace context** (`traceparent`) end to end. Reading
these back lets you reconstruct multi-step business workflows and contract chains
across transactions without inventing your own correlation scheme.

## Version resilience: avoid hard-coded protobufs

Canton renames and reshapes Ledger API messages across releases (the 3.4 ACS
`eventFormat` change is one example). Clients that ship static `.proto` copies
tend to break on upgrade. Two mitigations:

- Use the **official version-pinned bindings/SDK** for the participant version
  you target, and pin that version explicitly.
- Where you load service definitions dynamically (for example via gRPC server
  reflection), you bind to the descriptors the running participant actually
  serves, which survives field renames better than a checked-in copy.

Either way, branch on the reported Ledger API version from the bootstrap step.

## Submit with disclosed contracts (registry-driven exercises)

Token-standard factory and allocation choices often need **disclosed contracts**
returned by the registry HTTP API (`choiceContext.disclosedContracts`). On the
JSON Ledger API, pass them on the **command submission envelope**, not only inside
choice arguments:

```json
{
  "commands": [ { "ExerciseCommand": { ... } } ],
  "disclosedContracts": [ { "templateId": "...", "contractId": "...", "createdEventBlob": "...", "synchronizerId": "..." } ]
}
```

The registry's `choiceContextData` goes in `extraArgs.context` on the choice
argument. This pattern is exercised end to end in
[allocation lock learnings](cip-56-allocation-lock-learnings.md).

## Package upload vs application commands (LocalNet)

`POST /v2/packages` (DAR upload) requires **participant-admin** rights on
LocalNet — mint the unsafe JWT with `sub: ledger-api-user`. Application commands
and ACS reads for the wallet user use `sub: app-user` (or the relevant ledger
user). Mixing these up surfaces as permission errors on upload, not on ordinary
reads.

## Related

- [DAML and API index](daml-and-api-index.md)
- [External signing and interactive submission](external-signing-and-interactive-submission.md)
- [Canton error handling](canton-error-handling.md)
- [CIP-56 integration](cip-56-integration.md)
- [CIP-56 allocation lock learnings](cip-56-allocation-lock-learnings.md)
- [Traffic-cost planning](traffic-cost-planning.md)
