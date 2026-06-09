# Traffic operations

Canton meters the data that participants send through a synchronizer as
"traffic". Operators and app builders both need a working model of how traffic
is metered, enforced, and replenished. This page covers the operator view; for
the builder's cost view, see
[traffic-cost-planning.md](../development/traffic-cost-planning.md).

Always confirm specifics against the official documentation at
[docs.sync.global](https://docs.sync.global/index.html) and
[docs.digitalasset.com](https://docs.digitalasset.com), since parameters are set
by governance and change over time.

## What traffic measures

Traffic is broadly a function of the bytes a submission puts on the wire, the
number of recipients and views involved, and the validator topology. As a
result:

- Larger transactions cost more.
- Transactions touching more parties or producing more views cost more.
- Transfers that stay within a single validator are cheaper than transfers that
  cross validators.

## Base traffic and purchased traffic

The traffic model combines two sources:

- A passive refill bucket that replenishes over time, giving each participant a
  baseline of "free" traffic.
- Additional traffic that can be purchased when the baseline is not enough.

On Canton, traffic is ultimately paid for in Canton Coin (CC): CC is burned to
create a traffic balance. Operators should plan for purchased traffic during
periods of sustained activity rather than relying solely on the passive refill.

## The AmuletRules parameters

Traffic pricing is governed by parameters on the global `AmuletRules` contract,
set by Super Validator governance and readable from Scan. Treat the example
values below as illustrative; read live values from Scan rather than hardcoding.

| Parameter | What it controls | Illustrative example |
|-----------|------------------|----------------------|
| `extraTrafficPrice` | Price of extra traffic, USD per MB, charged in CC at the SV-voted rate | ~60 USD/MB |
| `readVsWriteScalingFactor` | Per-recipient delivery weight, in basis points | 4 (0.0004 per recipient byte) |
| `minTopupAmount` | Minimum traffic purchase | ~200,000 bytes |
| `burstAmount` | Free base-rate burst allowance | ~400,000 bytes |
| `burstWindow` | Window over which the burst replenishes | ~20 minutes |

Worked recipient example: a 1 MB message to 10 recipients draws roughly
`1,000,000 * (1 + 10 * 0.0004) = 1,040,000` bytes. CIP-0042 targets a standard CC
transfer costing about 1 USD, and SV governance calibrates `extraTrafficPrice`
toward that target; published worked examples vary, so do not treat any single
per-transfer byte figure as fixed.

Synchronizer traffic fees reference:
https://docs.sync.global/deployment/traffic.html

## MemberTraffic and top-up automation

Purchased traffic is tracked by on-ledger `MemberTraffic` contracts and
reconciled into the in-sequencer traffic state by Super Validators. The validator
app includes built-in top-up automation (a target throughput in bytes/sec times a
minimum top-up interval). SV participants and mediators have unlimited traffic.

## How traffic is enforced

Traffic is checked at two points:

1. When the sequencer first receives a submission.
2. Again, deterministically, at sequencing time.

If the sender lacks sufficient traffic, the request can be rejected immediately
or sequenced and later dropped, depending on the stage and validity.

## Grace window

Because traffic parameters can change between when a submission is made and when
it is sequenced, Canton allows a grace window so that submissions are not
penalized for a parameter change that happened in flight. The exact timeouts and
window length are governance parameters; consult the current documentation for
values.

## Operational implications

- Monitor your traffic balance and refill rate, and provision purchased traffic
  ahead of demand spikes.
- Favor topologies and flows that keep frequent transfers intra-validator where
  it makes sense.
- Track protocol releases: traffic-related behavior and pricing assumptions
  shift across versions (for example, package/DAR version updates), so revisit
  your model after upgrades.

## Related

- [Validator onboarding](validator-onboarding.md)
- [Traffic-cost planning (builder view)](../development/traffic-cost-planning.md)
- [Tokenomics overview](../business/tokenomics-overview.md)
