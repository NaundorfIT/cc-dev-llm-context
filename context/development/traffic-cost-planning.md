# Traffic-cost planning (builder view)

How to reason about per-transaction cost when building a Canton app. For the
operator's view of metering and enforcement, see
[../infrastructure/traffic-operations.md](../infrastructure/traffic-operations.md).

> **Important:** Figures below are **working assumptions from MainNet-style
> measurements**, not protocol constants. Traffic bytes depend on DAR/package
> version, view structure, validator topology, and live `AmuletRules` parameters.
> Read current pricing from Scan and re-measure after upgrades. Dollar columns use
> a **planning conversion** of **$60 per MB** ($0.06 per kB, $0.00006 per byte)
> aligned with observed network economics at the time of measurement — verify
> against live `extraTrafficPrice` on
> [traffic operations](../infrastructure/traffic-operations.md).

## How to measure traffic for a transaction

Two practical methods:

1. **`/v2/interactive-submission/prepare`** — read `costEstimation` on the
   prepared transaction.
2. **Participant logs** — find the matching `trace-id` and sum the relevant
   `EventCostDetails` lines (often **two** lines together represent total traffic
   for the lifecycle).

## What drives cost

- Transaction size in bytes and number of **views** / confirmations.
- **Intra-validator** vs **inter-validator** topology (inter is materially higher).
- CIP-56 **pre-approval** (removes an offer/accept step on repeat inbound).
- Input **holding / UTXO** count (merging also costs traffic).
- Fixed per-event overhead and request-size limits (see example operator parameters
  in public docs).

---

## Pricing assumption (for $ columns)

| Unit | Planning value |
|------|----------------|
| 1 MB | $60.00 |
| 1 kB | $0.06 |
| 1 byte | $0.00006 |

---

## CC transfers (Canton Coin)

Measured CC flows; **automatic app reward coupons** apply on these paths (not
manual activity markers — see [app-rewards-and-markers.md](app-rewards-and-markers.md)).

| Flow | Intra-validator | Inter-validator | Traffic | Cost ($) |
|------|-----------------|-----------------|---------|----------|
| Normal CC transfer (no memo) | Yes | | 9.400 kB | 0.56400 |
| Normal CC transfer (with memo) | Yes | | 9.650 kB | 0.57900 |
| Normal CC transfer with automatic app reward coupon | Yes | | 9.000 kB | 0.54000 |
| Normal CC transfer with automatic app reward coupon | | Yes | 18.000 kB | 1.08000 |

## Batching

Batching amortizes fixed per-transaction overhead. The tables below are observed
MainNet-style measurements.

### CC wallet batch transfer (atomic two-leg flow)

A **batch transfer** runs two transfers in one atomic batch (user leg + traffic-cost
leg on the provider side). Both succeed or fail together. Use **batch transfer**
(not “bulk transfer”) in runbooks.

| Flow | Intra-validator | Inter-validator | Traffic | Cost ($) |
|------|-----------------|-----------------|---------|----------|
| Batch transfer (two parties on same validator) | Yes | | 20.000 kB | 1.20000 |
| Batch transfer (recipient on a different validator) | | Yes | 31.300 kB | 1.87800 |

Compared to a single intra-validator CC transfer (~9 kB), the batch path costs
roughly **2.2×** traffic because it includes the provider traffic-cost leg in the
same atomic submission.

### Token-standard batch transfer (`WalletUserProxy_BatchTransfer`)

Splice documents **bulk / batch token-standard transfers** via
`WalletUserProxy_BatchTransfer` (multiple recipient legs in one submission). We do
not have a separate measured row in the table above for token-standard batch size;
**re-measure** with `prepare` / logs for your DAR and recipient count. Expect cost
to scale with the number of legs and views, similar to other multi-leg CIP-56 flows.

### App reward marker batch costs (current model; sunset with CIP-0104)

Until [CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)
rollout (~end of July 2026), manual `FeaturedAppActivityMarker` batches have this
observed shape:

| Transaction type | Traffic used | Cost ($) |
| ---------------- | -----------: | -------: |
| App reward marker batch base cost | 6.868 kB | $0.41208 |
| Per additional app reward marker | 0.1115 kB | $0.00669 |
| 1 app reward marker batch | 6.9795 kB | $0.41877 |
| 50 app reward marker batch | 12.443 kB | $0.74658 |
| 60 app reward marker batch | 13.558 kB | $0.81348 |

The batch cost behaves like a fixed overhead of **6.868 kB** plus **0.1115 kB**
per additional marker. Batching is highly efficient: most of the cost sits in the
first marker, and each additional marker adds only about **$0.00669** in traffic
cost.

**Batch Markers v2** (network milestone around DAR/package updates in early 2026)
is intended to make batched marker submission cheap enough that marker-submission
traffic should not be double-counted as “activity” when following fair-use guidance.
After CIP-0104, explicit marker batches are replaced by traffic-based attribution.

**Weighted markers** (when supported): one marker with weight `N` instead of `N`
markers of weight `1` saves submission traffic while preserving the same reward
weight — same batch economics, fewer on-ledger marker contracts.

---

## Locking and recurring on-ledger maintenance

Locking covers (a) **locking holdings** for CIP-56 allocations / DvP, (b) **CC
lock** flows (for example locked amulets on offers), and (c) **long-lived locked
state** that emits periodic heartbeats. Re-measure allocation-specific lock
exercises on your package line; the lifecycle table below is from an observed
per-item lock pattern on MainNet.

### Observed per-lock lifecycle traffic

Example pattern for an app that creates an on-ledger **lock** and maintains it
with periodic heartbeats (intervals are app-specific; traffic per event is measured):

| Event | Typical interval (example) | Traffic | Cost ($) |
|-------|---------------------------|---------|----------|
| Initial lock creation (includes app-coupon + locking setup) | once per lock | 8.000 kB | 0.48000 |
| Soft heartbeat (maintenance) | every 6 hours | 10.000 kB | 0.60000 |
| Normal heartbeat (maintenance) | every 2 days | 24.555 kB | 1.47330 |

**Planning formulas (generic):**

```text
traffic_per_lock =
  initial_lock_traffic
  + soft_heartbeat_count × soft_heartbeat_traffic
  + normal_heartbeat_count × normal_heartbeat_traffic

total_traffic = traffic_per_lock × active_lock_count
```

Where `soft_heartbeat_count = (24 / soft_interval_hours) × period_days` and
`normal_heartbeat_count = (24 / normal_interval_hours) × period_days`.

At scale, **recurring heartbeat traffic often dominates** one-time lock creation.
Model monthly cost per active lock before relying on passive free-traffic refill.

### CIP-56 allocation / holding lock

For DvP-style flows, holdings are often **locked** under an `Allocation` before
settlement. Traffic depends on views, parties, and whether the lock is created in
the same transaction as the allocation request. Treat allocation lock + unlock +
settle as separate measurements; post–DAR 0.12.0 transfers are cheaper but
multi-step allocation trees can still be view-heavy — see
[CIP-0112](https://github.com/canton-foundation/cips/blob/main/cip-0112/cip-0112.md)
batch-settlement optimisation (fewer transactions/views).

### CC lock / offer flows

Two-step CC transfer offers that **lock** amulets on creation incur extra steps
versus a direct transfer; [CIP-0107](https://github.com/canton-foundation/cips/blob/main/cip-0107/cip-0107.md)
changes long-lived external-party configuration but not the general rule that
multi-step flows cost more traffic than pre-approved direct paths. Measure lock +
accept + complete separately if you still use offer-based CC UX.

---

## CIP-56 token-standard transfers

### After DAR 0.12.0 (April 2026 baseline)

From **DAR 0.12.0** onward, bare CIP-56 transfers dropped sharply; **inter-validator
CIP-56 aligns with the CC inter-validator path** (~18 kB). Use this as the default
baseline on current package lines — confirm against
[supported DAR versions](https://docs.digitalasset.com/utilities/mainnet/reference/dar-versions/dar-versions.html).

| Flow | Intra-validator | Inter-validator | Traffic | Cost ($) |
|------|-----------------|-----------------|---------|----------|
| CIP-56 transfer (post–DAR 0.12.0) | Yes | | 9.009 kB | 0.54054 |
| CIP-56 transfer (post–DAR 0.12.0) | | Yes | 18.000 kB | 1.08000 |

Treat **pre–DAR 0.12.0** CIP-56 numbers as stale unless you are still on an older
package line.

### Full flows with pre-approval vs offer/accept (pre–DAR 0.12.0 era measurements)

These reflect **wallet-style** CIP-56 paths with pre-approval or the extra
offer/accept step. Still useful for budgeting until you re-measure on your DAR.

| Flow | Intra-validator | Inter-validator | Traffic | Cost ($) |
|------|-----------------|-----------------|---------|----------|
| CIP-56 with pre-approval | Yes | | 22.907 kB | 1.37442 |
| CIP-56 with pre-approval | | Yes | 28.875 kB | 1.73250 |
| CIP-56 without pre-approval | Yes | | 39.759 kB | 2.38554 |
| CIP-56 without pre-approval | | Yes (estimated) | 50.117 kB | 3.00705 |

**Pre-approval savings (intra-validator, same measurement set):**

| | Traffic | Cost ($) |
|---|---------|----------|
| With pre-approval | 22.907 kB | 1.37442 |
| Without pre-approval | 39.759 kB | 2.38554 |
| **Delta** | **16.852 kB** | **~1.01112** |

Log decomposition (intra-validator):

- Pre-approved: `paidTrafficCost = 22907` (22.907 kB).
- Non-pre-approved: `paidTrafficCost = 16852 + 22907 = 39759` (39.759 kB) — extra
  component is the offer/accept step before the transfer completes.

Log decomposition (inter-validator, pre-approved):

- `paidTrafficCost = 26250 + 2625 = 28875` (28.875 kB).

Inter-validator **without** pre-approval (50.117 kB / $3.00705) was **estimated** by
scaling the intra non-pre-approved case with the same intra→inter ratio as the
pre-approved pair; treat as a planning estimate, not a single logged total.

---

## Wallet setup traffic costs (one-time)

Typical **wallet integrator** party setup on a validator (observed breakdown):

| Transaction type | Traffic used | Cost ($) |
| ---------------- | -----------: | -------: |
| `PartyToParticipant` topology mapping per mapping | 1.562 kB | $0.09372 |
| Party onboarding topology mappings total (3 mappings) | 4.686 kB | $0.28116 |
| UTXO contract creation | 3.323 kB | $0.19938 |
| UTXO merging (every 10 holdings) | 12.300 kB | $0.73800 |
| Auto acceptance contract creation | 7.627 kB | $0.45762 |
| Wallet setup total best case | 15.636 kB | $0.93816 |
| Wallet setup total worst case rough estimate | 16.000 kB | $0.96000 |

The best-case wallet setup total is based on:

- **3 × topology mappings = 4,686 bytes** (4.686 kB / $0.28116)
- **UTXO contract creation = 3,323 bytes** (3.323 kB / $0.19938)
- **Auto acceptance contract creation = 7,627 bytes** (7.627 kB / $0.45762)

That gives **15,636 bytes / 15.636 kB / $0.93816** as the best-case setup
estimate. The rough worst-case estimate remains **~16,000 bytes / ~$0.96000**,
mainly because one observed UTXO-creation measurement was roughly **500 bytes**
higher than the preferred estimate.

---

## Example traffic bucket parameters (operator docs)

Illustrative participant traffic limits from documentation context (not fixed forever):

| Parameter | Example value |
|-----------|----------------|
| Base bucket max | 20,000 bytes |
| Refill rate | 2,000 bytes/sec |
| Example extra top-up | 1,000,000 bytes |
| Per-event fixed overhead | 500 bytes |
| Hard request size limit | 10,485,760 bytes |

Grace window example: confirmation response 30s, mediator 30s, combined grace **120s**.

---

## Recurring versus one-off activity

Model **recurring** traffic (heartbeats, per-item maintenance) separately from
one-time onboarding. After CIP-0104, featured-app rewards follow **traffic burned**
on confirmer envelopes, so efficient view design directly affects both cost and
rewards — see [substantive-cips.md](../reference/substantive-cips.md) (CIP-0104,
CIP-0112 view optimisation).

---

## Related

- [Traffic operations (operator view)](../infrastructure/traffic-operations.md)
- [CIP-56 integration](cip-56-integration.md)
- [App rewards and markers](app-rewards-and-markers.md)
- [Substantive CIPs](../reference/substantive-cips.md)
