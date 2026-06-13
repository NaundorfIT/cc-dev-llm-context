# CIP-56 allocation lock — builder learnings

Practical lessons from standing up LocalNet, building the
[`examples/amulet-lock/`](../../examples/amulet-lock/) example (lock and unlock
Amulet via token-standard allocations), and running it end to end. Grounded in
the public token-standard specs and the Splice reference trading app; verify
against the Splice release you target.

Runnable code: [`examples/amulet-lock/`](../../examples/amulet-lock/) —
see [README](../../examples/amulet-lock/README.md) for cold-start (`make build &&
make deploy && make serve` on a running LocalNet).

## The self-lock pattern (no custody)

To **lock** CIP-56 holdings without sending them to another party or a custodian:

1. Implement the **`AllocationRequest`** interface in app DAML with a single
   transfer leg where **sender = receiver = executor = owner**.
2. The owner funds the request via the registry's **`AllocationFactory_Allocate`**
   choice, passing unlocked holding contract ids as inputs.
3. The registry replaces those holdings with an **`Allocation`** contract backed
   by **locked** holdings (`HoldingView.lock` is set).
4. **Unlock** early with **`Allocation_Withdraw`** (plus
   **`AllocationRequest_Withdraw`** to archive the app request). The settlement
   is never executed — there is no `Allocation_ExecuteTransfer`.

This is the same DvP allocation machinery wallets use; the app only coordinates
a self-transfer leg that stays open until withdrawn or until `settleBefore`
expires (registry automation then releases the lock).

Reference implementation: [`AmuletLock.daml`](../../examples/amulet-lock/daml/src/AmuletLock.daml).
Upstream pattern: Splice `OTCTrade` in
[digital-asset/decentralized-canton-sync `token-standard/examples/`](https://github.com/digital-asset/decentralized-canton-sync/tree/main/token-standard/examples).

## DAML project setup

### Interface DARs from the LocalNet bundle

Token-standard **interface** packages ship inside the Splice release bundle, not
as separate downloads. After `make -C localnet fetch`, reference them as
**data-dependencies** in `daml.yaml`:

```yaml
data-dependencies:
  - ../../../localnet/.localnet/splice-node/dars/splice-api-token-metadata-v1-1.0.0.dar
  - ../../../localnet/.localnet/splice-node/dars/splice-api-token-holding-v1-1.0.0.dar
  - ../../../localnet/.localnet/splice-node/dars/splice-api-token-allocation-v1-1.0.0.dar
  - ../../../localnet/.localnet/splice-node/dars/splice-api-token-allocation-request-v1-1.0.0.dar
build-options:
  - --target=2.1
```

Build with [dpm](https://docs.digitalasset.com/build/3.5/dpm/dpm.html)
(`curl https://get.digitalasset.com/install/install.sh | sh`). A current dpm
(3.5.x) can compile against these interface DARs (built with an older SDK) when
`--target=2.1` matches the bundle's LF version.

### Implementing `AllocationRequest`

Minimum surface on the app template:

- **`view`** — `AllocationRequestView` with `settlement`, `transferLegs`
  (`TextMap TransferLeg`), and `meta`.
- **`allocationRequest_RejectImpl`** — allow the sender (here, the owner) to
  reject; archive the request.
- **`allocationRequest_WithdrawImpl`** — allow the executor (here, also the
  owner) to withdraw the request; archive it.

Set **`allocateBefore`** far enough ahead that the wallet/UI has time to fund
the request (the example uses 10 minutes). Set **`settleBefore`** (`lockedUntil`
in the example) to when the lock should expire.

## Registry HTTP API (Amulet on LocalNet)

On LocalNet the **scan** service hosts the Amulet registry API (same origin as
Scan UI, `http://scan.localhost:4000`). Fetch the DSO party id first:

```http
GET /api/scan/v0/dso-party-id
```

### Lock (allocate)

```http
POST /registry/allocation-instruction/v1/allocation-factory
```

Body includes `choiceArguments` for `AllocationFactory_Allocate`: `expectedAdmin`
(DSO party), `allocation` (`AllocationSpecification`), `requestedAt`,
`inputHoldingCids` (unlocked holdings only), `extraArgs`.

Response: `factoryId`, `choiceContext` (`choiceContextData` +
`disclosedContracts`). Pass disclosed contracts on the JSON Ledger API
`submit-and-wait` call together with the exercise command.

OpenAPI (allocation instruction v1):
[digital-asset/decentralized-canton-sync `allocation-instruction-v1.yaml`](https://github.com/digital-asset/decentralized-canton-sync/blob/main/token-standard/splice-api-token-allocation-instruction-v1/openapi/allocation-instruction-v1.yaml)

### Unlock (withdraw allocation)

```http
POST /registry/allocations/v1/{allocationContractId}/choice-contexts/withdraw
```

Response: choice context + disclosed contracts for `Allocation_Withdraw`.

OpenAPI (allocation v1):
[digital-asset/decentralized-canton-sync `allocation-v1.yaml`](https://github.com/digital-asset/decentralized-canton-sync/blob/main/token-standard/splice-api-token-allocation-v1/openapi/allocation-v1.yaml)

## JSON Ledger API v2 write path

Typical lock transaction (two submissions or one batched submission):

1. **Create** the `AmuletLock` template (implements `AllocationRequest`).
2. **Exercise** `AllocationFactory_Allocate` on the factory returned by the
   registry, with `extraArgs.context` set from the registry's `choiceContextData`
   and **`disclosedContracts`** from the registry on the command envelope.

Unlock: exercise `Allocation_Withdraw` on the allocation interface contract id,
again with registry-provided context and disclosures; optionally exercise
`AllocationRequest_Withdraw` on the app request in the same submission.

Command shape (JSON API v2):

```json
{
  "commands": [ ... ],
  "commandId": "<uuid>",
  "actAs": ["<owner party id>"],
  "userId": "app-user",
  "disclosedContracts": [ ... ]
}
```

See [ledger-api-patterns.md](ledger-api-patterns.md) for ACS reads and
[local-dev-stack.md](local-dev-stack.md#json-api-auth) for LocalNet bearer tokens.

### Interface-filtered ACS queries

Query holdings and allocations by **interface id**, not concrete Amulet
template id (implementations vary by package version):

```json
{
  "identifierFilter": {
    "InterfaceFilter": {
      "value": {
        "interfaceId": "#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding",
        "includeInterfaceView": true,
        "includeCreatedEventBlob": false
      }
    }
  }
}
```

Read `interfaceViews[0].viewValue` for `amount`, `instrumentId`, and **`lock`**
(null = spendable, non-null = locked). Filter `instrumentId.id == "Amulet"` and
`owner == your party`.

### Stale holding contract ids (common 404)

Holdings are **UTXOs**: every allocate/withdraw **archives** input holdings and
creates new contract ids. A UI or client that caches holding ids from an earlier
ACS snapshot will get:

```text
HTTP 404: Contract could not be found with id ...
```

**Fix:** call `ledger-end` + `active-contracts` again **immediately before**
building `inputHoldingCids` or exercising a choice. Never reuse holding ids across
user sessions without refreshing.

## LocalNet-specific wiring

| Concern | LocalNet default |
|---------|------------------|
| Lock owner party | **app-user** (`http://localhost:2975` JSON API) |
| Amulet registry + scan | **scan** (`http://scan.localhost:4000` or `:4000` via proxy) |
| Wallet UI (app-user) | `http://wallet.localhost:2000` |
| Wallet UI (app-provider) | `http://wallet.localhost:3000` |
| Test CC faucet | `POST /api/validator/v0/wallet/tap` on **app-user validator** `:2903` |
| JSON API auth | **Unsafe JWT on by default** — see [local-dev-stack.md](local-dev-stack.md#json-api-auth) |
| DAR upload user | **`ledger-api-user`** (participant admin) for `POST /v2/packages`; app commands use **`app-user`** |

Onboard and tap before first lock:

```http
GET  /api/validator/v0/wallet/user-status
POST /api/validator/v0/register          # if not onboarded
POST /api/validator/v0/wallet/tap        # body: {"amount":"100.0000000000"}
```

Bundle download URL for LocalNet: release assets at
[github.com/digital-asset/decentralized-canton-sync/releases](https://github.com/digital-asset/decentralized-canton-sync/releases)
(not `hyperledger-labs/splice`, which no longer hosts bundles).

## Web client patterns (example UI)

- **Same-origin proxy** — browser apps cannot call `localhost:2975` / scan
  directly without CORS setup. The example [`serve.py`](../../examples/amulet-lock/web/serve.py)
  proxies `/proxy/json/`, `/proxy/validator/`, `/proxy/scan/` and mints the
  unsafe JWT at `/token`.
- **Two ledger users** — mint JWT with `sub: app-user` for commands and ACS
  reads; mint `sub: ledger-api-user` only for package upload.
- **Numeric scale** — Amulet amounts use `Numeric 10`; clamp user input with
  `.toFixed(10)` before API calls.
- **Refresh before write** — the example reloads the ACS at the start of every
  lock/unlock to avoid stale UTXO ids.

## Error cheat sheet

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| `Contract could not be found` on submit | Stale `inputHoldingCids` or stale button `data-cid` | Refresh ACS; retry |
| `HTTP 401` / "security-sensitive error" on JSON API | Missing bearer token | Mint unsafe JWT (LocalNet) or OAuth2 token |
| `make deploy-dar` permission error with `app-user` token | Package upload needs admin user | Use `ledger-api-user` JWT for upload only |
| `Insufficient unlocked balance` | All holdings locked or fragmented | Unlock first, or tap more CC |
| `input holding lock must match` (factory) | Passed a locked holding as input | Filter `lock == null` in ACS |
| Bundle download 404 on `make up` | Wrong GitHub release URL | Set `SPLICE_BUNDLE_URL` to `decentralized-canton-sync` asset |

## What to read next

- [CIP-56 integration](cip-56-integration.md) — holdings, transfers, pre-approval
- [Ledger API v2 client patterns](ledger-api-patterns.md) — bootstrap, ACS, disclosures
- [Local dev stack](local-dev-stack.md) — LocalNet topology and auth
- [Debugging and inspection](debugging-and-inspection.md) — ACS curl examples
- [Token Standard APIs](https://docs.sync.global/app_dev/token_standard/index.html)
- [CIP-0056](https://github.com/canton-foundation/cips/blob/main/cip-0056/cip-0056.md)
