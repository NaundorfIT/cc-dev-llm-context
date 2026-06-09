# Tokenomics overview

A working mental model of how Canton Coin (CC) rewards and traffic fit together.
This is a conceptual summary grounded in public documentation; it intentionally
avoids specific allocation amounts and per-app figures. Verify details against
the Splice tokenomics documentation.

## The Global Synchronizer and CC

Canton Coin (CC) is the native utility token of the Canton Network. Its
decentralized backbone is the Global Synchronizer, governed by the Global
Synchronizer Foundation (managed by the Linux Foundation) through Super
Validators and Canton Improvement Proposals (CIPs). The MainNet went live in mid
2024 with no pre-mine.

## Burn and mint

Canton Coin tokenomics are built around a burn-and-mint equilibrium. Network
usage burns value through traffic fees, and participants receive the right to
mint CC based on the utility they provide. Rewards are split among the main
roles: application providers, validators, and super validators. The public
documentation is the source of truth for the current split and any caps.

Public descriptions note an issuance schedule with a declining maximum annual
mintable amount toward a steady state, and circulating-supply and price figures
come from third-party aggregators that fluctuate. Treat any specific supply,
price, or issuance number as time-sensitive and verify against the official
tokenomics documentation: https://docs.sync.global/background/tokenomics/index.html

## Three related, distinct mechanisms

It helps to keep these separate in your head:

- Traffic is the operational cost side (paid by burning CC).
- Activity records and markers are the attribution side (turning useful activity
  into reward weight).
- Minting is the redemption side (claiming CC for accumulated weight).

## Mining rounds

Rewards are processed in repeating mining rounds (publicly described as roughly
ten minutes). Conceptually a round:

1. Writes fee values to the ledger.
2. Records activity (the reward-relevant records are created here).
3. Calculates issuance per unit of activity weight.
4. Lets owners of activity records mint CC proportional to weight.

Key consequence: earning a reward does not mint CC immediately. A transaction
creates the basis for minting in the round system, and the actual claim happens
in a following round. Unredeemed rewards can be lost.

## App rewards: current model and upcoming change

**Today (marker-based).** Featured apps earn rewards via activity markers and
coupons. A `FeaturedAppActivityMarker` (CIP-47) is created in the business
transaction and converted by network automation into an `AppRewardCoupon`. CC
transfer preapprovals are a separate attribution path. Fair-use rules govern how
markers may be submitted; see
[app-rewards-and-markers.md](../development/app-rewards-and-markers.md).

**From end of July 2026 (traffic-based).** Governance has approved
[CIP-0104: Traffic-Based App Rewards](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md).
App rewards will be based on actual synchronizer traffic attributed to featured
app provider parties (as confirmers on envelopes), measured from sequencer and
mediator data, instead of explicit `FeaturedAppActivityMarker` creation. The
on-ledger model stops creating markers and per-transaction `AppRewardCoupon`s;
the DSO creates at most one app reward coupon per party per round above a
threshold. App builders should plan to remove marker-creation logic, optimize
Daml views and traffic cost, and rely on an active `FeaturedAppRight` for the
provider party. Confirm the exact MainNet rollout date in CIP-0104 and release
notes rather than assuming a calendar day.

## Other reward-relevant records

- Infrastructure related: `ValidatorRewardCoupon`,
  `ValidatorLivenessActivityRecord`, and `SvRewardCoupon`.

## Featured status gates app rewards

Application rewards flow to featured applications. Featured status is what makes
an application's activity reward-eligible, and per-marker reward weight is set by
governance and may be adjusted over time. Note that governance has introduced a
CC-locking requirement for featured-app status (with a higher threshold for
asset issuers); see [featured-app-program.md](featured-app-program.md) and
[../development/app-rewards-and-markers.md](../development/app-rewards-and-markers.md).

## Relevant CIPs

Canton Improvement Proposals define much of this behavior. The full categorized
index (CIP-0000 through CIP-0116) is in
[cip-index.md](../reference/cip-index.md). For tokenomics specifically, see the
**Tokenomics** section there. Highlights for app economics:

- **CIP-0104** — traffic-based app rewards (approved; rollout ~end of July 2026).
- **CIP-0047** — activity markers (final; superseded by 0104).
- **CIP-0116** — featured-app CC locking (proposed).
- **CIP-0042** — stable per-transfer fee target.
- **CIP-0078** — CC usage fee removal.
- **CIP-0098** — per-transaction app reward cap.

Discussion: [lists.sync.global/g/cip-discuss](https://lists.sync.global/g/cip-discuss).
Repo: [github.com/canton-foundation/cips](https://github.com/canton-foundation/cips).
Builder deep dives: [substantive-cips.md](../reference/substantive-cips.md).
Ecosystem funding: [canton-development-fund.md](canton-development-fund.md).

## Traffic as a reward signal too

Traffic is the cost side, but it also matters for rewards: when CC is burned to
buy traffic, that burn is itself a utility signal that contributes to
validator-side reward weight. This is one reason traffic, topology, and activity
design all feed into the economics of operating on Canton. See
[../infrastructure/traffic-operations.md](../infrastructure/traffic-operations.md)
and [../development/traffic-cost-planning.md](../development/traffic-cost-planning.md).

## Related

- [Ecosystem and roles](ecosystem-and-roles.md)
- [Featured app program](featured-app-program.md)
- [App rewards and markers](../development/app-rewards-and-markers.md)
