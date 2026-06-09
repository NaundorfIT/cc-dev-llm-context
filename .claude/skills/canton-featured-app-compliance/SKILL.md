---
name: canton-featured-app-compliance
description: >-
  Principle-level guidance for featured-app rewards on Canton. Use when
  implementing or reviewing activity markers (until CIP-0104 rollout), planning
  for traffic-based app rewards, reward beneficiary splits, featured-app
  eligibility, or party/role separation.
---

# Canton featured-app compliance

Use this skill when an app earns or plans for featured-app rewards.

## Transition (CIP-0104, ~end of July 2026)

[CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)
replaces marker-based app rewards with traffic-based rewards measured from
sequencer/mediator data. After rollout: do not create
`FeaturedAppActivityMarker`s; optimize Daml views and traffic; keep
`FeaturedAppRight` active so the provider party is a confirmer on rewarded
envelopes. Confirm the MainNet date in the CIP and release notes.

## Marker fair-use principles (until CIP-0104 rollout)

1. Markers align reward weight with real economic contribution; they do not
   amplify rewards beyond underlying on-chain activity.
2. No markers on CC transactions (they already carry provider attribution).
3. Default marker-to-fee alignment: do not submit more markers than the net
   qualifying on-chain fees generated; small variance is tolerated, persistent
   divergence invites review.
4. Do not count marker-submission cost toward the fees that justify markers.
5. Markers only for on-chain, fee-generating activity, not reads, off-chain
   calls, UI interactions, or off-chain matching.
6. Submit markers promptly relative to the activity; late markers are forfeited.
7. No net-paying users for activity and no buying artificial volume; no reward
   recycling.
8. Asset issuers may mark qualifying third-party on-ledger activity involving
   their asset even without a direct fee, subject to all anti-farming rules.
9. Separate major functions into distinct party identifiers; isolate asset
   issuers from other fee-generating roles.
10. Create markers for real value-contributing transactions, not intermediate or
    propose-only steps; multiple markers per transaction are only for genuinely
    composed transactions.

## Implementation notes

- Markers convert into `AppRewardCoupon`s via network automation; featured status
  (a `FeaturedAppRight`) is what makes attribution earn featured rewards.
- Reward splits use `AppRewardBeneficiary` weights between 0.0 and 1.0 that should
  be positive and sum to 1.0.
- Use the [CIP index](../../../context/reference/cip-index.md) for the full map.
  Key tokenomics CIPs: 0047 (markers), 0104 (traffic-based rewards), 0116 (FA
  staking). Confirm amounts and rollout dates in each CIP file.

## Guardrails

- This is a principle-level summary. Treat the official guidance and the
  Tokenomics Committee's current rules as authoritative, and do not embed
  internal monitoring queries, party identifiers, or allocation figures.

## Read for depth

- [Substantive CIPs — 0116, 0104](../../../context/reference/substantive-cips.md)
- [App rewards and markers](../../../context/development/app-rewards-and-markers.md)
- [Featured app program](../../../context/business/featured-app-program.md)
- [Tokenomics overview](../../../context/business/tokenomics-overview.md)

## Official sources

- [CIP index](../../../context/reference/cip-index.md)
- [canton-foundation/cips](https://github.com/canton-foundation/cips)
- [CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)
- [docs.sync.global tokenomics](https://docs.sync.global/background/tokenomics/index.html)
