# CIP-56 integration

CIP-56 is the Canton token standard used to represent and transfer non-CC assets
in a reusable, interoperable way. It is the right starting point if you are
building a wallet or integrating an asset. This page describes the patterns
wallet and asset integrators care about; verify the current API surface against
the official documentation.

**On the horizon:** [CIP-0112](https://github.com/canton-foundation/cips/blob/main/cip-0112/cip-0112.md)
(Token Standard V2, draft) evolves v1 with `Account` records, batch settlement,
explicit `actors`, and view optimisation — see
[substantive-cips.md](../reference/substantive-cips.md). Canton Coin will
implement both; follow the v1/v2 compatibility matrix in the CIP.

## Identity: issuer, instrument, and admin party

Every CIP-56 asset is identified on ledger and in APIs by three concepts wallets
and apps must keep straight:

| Concept | Role |
|---------|------|
| **Issuer** | The institution or program that defines the economic asset (rights, supply policy, compliance). Often a dedicated on-ledger party, separate from the wallet operator. |
| **Instrument admin** | The **registry party** that operates the asset registry: maintains ownership records, mint/burn rules, factories, and off-ledger Token Standard HTTP APIs. This party is the `admin` in every `InstrumentId`. |
| **Instrument ID** | A **globally unique** identifier: the instrument admin party plus a registry-local `id` string (for example `adminPartyId + "USDCx"`). All holdings, factories, and transfer instructions reference this pair. |

On ledger, a **holding** ties an **owner** party to an `instrumentId`, an **amount**,
and optional lock/metadata. The instrument’s terms live with the registry; holdings
state how much an owner holds at that registrar.

Wallets do not invent instrument IDs — they **discover** assets that are already
**registered** with a CIP-56-compliant registry and then enable them in the app.

## Digital Asset registry (Utilities)

On MainNet and DevNet, many tokenized instruments are registered through Digital
Asset’s **Registry** / **Utilities** stack, which implements CIP-56. The registry:

- Publishes **instrument metadata** (name, symbol, decimals, registry UI links) via
  the **Token Standard** HTTP API.
- Exposes per–instrument-admin URLs under a path such as  
  `.../api/token-standard/v0/registrars/<admin-party-id>/...`
- Requires instrument admins to deploy standard factory contracts (for example
  `AllocationFactory`, `TransferRule`) before transfers are allowed.

Authoritative guides:

- [Registry introduction](https://docs.digitalasset.com/utilities/devnet/overview/registry-user-guide/introduction.html)
- [Token Standard integration](https://docs.digitalasset.com/utilities/mainnet/overview/registry-user-guide/token-standard.html)
- [CIP-0056](https://github.com/canton-foundation/cips/blob/main/cip-0056/cip-0056.md) and
  [docs.canton.network CIP-56 reference](https://docs.canton.network/overview/reference/cip-0056)

Other registries can implement the same interfaces; any compliant registry can be
served by any compliant wallet.

## Adding an instrument to a wallet app

Typical integration steps:

1. **Obtain `InstrumentId`** — from the issuer or registry operator: the
   **admin party** (registry) and the instrument **`id`** string.
2. **Resolve the registry base URL** — today often configured in the wallet for
   known admins; CIP-56 also describes discovering registry URL prefixes via
   **Canton Name Service (CNS)** / Scan metadata on the admin party (see the CIP’s
   registry URL discovery section).
3. **Fetch metadata** — call the registry Token Standard metadata endpoints (for
   example list instruments for an admin) to get display fields and confirm the
   instrument is live.
4. **Register in the wallet** — add the instrument to the wallet’s supported-asset
   list (and cache factory IDs / disclosed-contract hints the registry API returns).
5. **Onboard the user** — create or select holdings, set up **pre-approval** if you
   expect repeat inbound transfers, and use registry-provided `factoryId`,
   `disclosedContracts`, and `choiceContextData` when exercising transfer/allocation
   choices.

Use `@canton-network/wallet-sdk` or the token-standard client patterns from the
Utilities docs; see [daml-and-api-index.md](daml-and-api-index.md).

## What CIP-56 gives you

At a high level, CIP-56 provides token usability comparable to an ERC-20 style
experience, implemented with Canton/DAML patterns. Typical capabilities:

- Hold token balances and show transaction history.
- Transfer tokens directly between parties.
- Offer/accept style transfer flows.
- DvP and allocation-based workflows.
- Pre-approvals for cheaper, smoother repeat transfers.

## Canton-specific characteristics

CIP-56 is not just "a token"; its UX and economics depend on Canton mechanics:

- Traffic is paid in Canton Coin, and cost depends on bytes, recipients, views,
  and validator topology.
- Intra-validator transfers are cheaper than inter-validator transfers.
- More holdings/UTXOs generally mean more traffic.
- Pre-approval can significantly reduce repeat-transfer cost.
- Marker and confirmation-handling behavior can change across releases, so track
  versions.

For traffic numbers (transfers, **batching**, **locking**, marker batches), see
[traffic-cost-planning.md](traffic-cost-planning.md).

## Transfer flows and pre-approval

The token-standard transfer flow can run with or without a pre-approval on the
receiving side:

- With pre-approval, a repeat inbound transfer skips an extra offer/accept
  component, which materially reduces traffic and cost.
- Without pre-approval, the flow includes that additional step before the
  transfer completes.

For wallets that expect repeat inbound transfers (for example, receiving CC or a
stablecoin), maintaining pre-approvals is usually worth it both for cost and for
app-reward attribution. See
[app-rewards-and-markers.md](app-rewards-and-markers.md).

On ledger, a pre-approval is a registry contract (a `TransferPreapproval` in the
utility-registry model) that the receiving side creates and can later withdraw
(a `TransferPreapproval_Withdraw`-style choice). A pre-approved inbound transfer
can complete without the extra offer/accept step. Discover the concrete template
and registry routing from the registry/SDK rather than hard-coding ids, since
they are per-registry and version-specific.

### Building and submitting transfers

Let the SDK/registry build the command rather than hand-rolling it: a token
standard controller (for example `@canton-network/wallet-sdk`'s transfer
factory) returns the command plus the **disclosed contracts** and choice context
the registry requires. Then run the standard write path. For external/non-custodial
parties this is the interactive **prepare → sign → execute** flow, and you should
use **preferred-packages discovery** and **disclosure rehydration** to avoid
`UNRESOLVED_PACKAGE_NAME` — see
[external-signing-and-interactive-submission.md](external-signing-and-interactive-submission.md).

For app providers attributing activity, prefer `WalletUserProxy` (a
`WalletUserProxy_BatchTransfer`-style choice can atomically batch several legs);
see [daml-and-api-index.md](daml-and-api-index.md) and
[app-rewards-and-markers.md](app-rewards-and-markers.md).

### Instrument admin must match the holdings you spend

The transfer factory checks an `expectedAdmin` against the registrar of the
holdings being spent. Resolving the wrong admin is a frequent rejection. A
reliable resolution order, derived from a reference wallet:

1. **From the on-ledger holdings (UTXOs) you intend to spend** — read
   `instrumentId.admin` off those holdings. This is authoritative: the registrar
   that issued your holding is the one the factory expects, regardless of what the
   UI or config says.
2. Explicit admin passed in the request (when known and trusted).
3. Wallet configuration for that instrument.
4. The registry/SDK metadata endpoint as a last resort.

If the SDK-built command still carries a different `expectedAdmin` (or a nested
`transfer.instrumentId.admin`), **patch the command** to the resolved admin
before prepare so the on-ledger factory match succeeds.

### Registrar-scoped registry URL, set per instrument

Utilities-hosted registries expect a **registrar-scoped** base URL of the form
`.../api/token-standard/v0/registrars/<admin-party-id>` (the SDK appends the rest
of the path); the plain Canton Coin flow uses the bare registry URL. Set the
transfer-factory registry URL to the **specific instrument's** registrar **before
building a transfer** and again **before accept / reject / withdraw**, since the
choice-context HTTP calls reuse that URL. A mismatched registrar URL yields
empty/incorrect choice context and a failed exercise.

### Single vs batch disclosures

A pure single Canton Coin transfer carries no utility-registry disclosures and
uses the plain prepare path. A single CIP-56 send to an external receiver, and
any provider batch transfer, receive **utility-registry disclosures** and must
use the hardened prepare path (preferred-packages + disclosure rehydration +
package preference). See
[external signing and interactive submission](external-signing-and-interactive-submission.md).

### Numeric scale

Clamp transfer amounts to the instrument's scale before prepare (Canton Coin uses
`Numeric 10`). Sending more precision than the type allows is a common rejection;
normalize the amount string rather than passing through raw user input.

## Holdings and UTXO hygiene

CIP-56 holdings can fragment into multiple input holdings (UTXOs). More inputs
typically mean more traffic per transfer, and merging holdings itself costs
traffic. A practical approach is to merge holdings intentionally and
periodically rather than reflexively, balancing the one-time merge cost against
cheaper future transfers.

**Filter out locked holdings before selecting inputs.** A holding can be
time-locked (for example by a pending operation or an unexpired lock). Spending a
locked UTXO triggers a transfer-factory rejection (an "input holding lock must
match"-style error), so select only unlocked holdings as inputs — and when a
caller hands you specific input UTXOs, reject the request up front if any of them
are locked, with a clear "all holdings locked" message when nothing is
spendable.

## Reward-eligibility expectations for issuers

If you issue an asset and want it to be reward-eligible as a featured app, expect
CIP-56 compliance requirements such as being holdable in multiple ecosystem
wallets and swappable via an on-chain DvP facility, plus role separation for the
issuer party. See [app-rewards-and-markers.md](app-rewards-and-markers.md).

## Related

- [Token Standard APIs (docs.sync.global)](https://docs.sync.global/app_dev/token_standard/index.html)
- [DAML and API index](daml-and-api-index.md)
- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [External signing and interactive submission](external-signing-and-interactive-submission.md)
- [Traffic-cost planning](traffic-cost-planning.md)
- [App rewards and markers](app-rewards-and-markers.md)
