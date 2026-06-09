# App rewards and markers

How applications earn rewards on Canton, what featured status does, and how reward
attribution is changing. This page summarizes publicly documented mechanics. It
deliberately contains no operator-specific monitoring queries, party identifiers,
or allocation figures. Verify details against the Splice tokenomics documentation
the [Canton CIPs](https://github.com/canton-foundation/cips), the
[categorized CIP index](../reference/cip-index.md), and
[substantive CIP deep dives](../reference/substantive-cips.md) (0116, 0104, 0107, …).

## Upcoming change: traffic-based app rewards (end of July 2026)

Governance has approved
[CIP-0104: Traffic-Based App Rewards](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md).
Around the **end of July 2026**, featured-app rewards on MainNet are expected to
move from **marker-based** attribution to **traffic-based** attribution:

| Today (until rollout) | After CIP-0104 rollout |
|----------------------|----------------------|
| Apps submit `FeaturedAppActivityMarker`s (and use CC preapprovals) | Rewards follow actual synchronizer traffic on envelopes where the app provider is a **confirmer** |
| Markers converted to `AppRewardCoupon`s by SV automation | Activity measured from sequencer/mediator data; at most **one** app reward coupon per party per round (above a threshold) |
| Fair-use rules govern marker volume vs fees | No marker creation; optimize transaction structure and traffic instead |

**What builders should do now:**

- Treat marker fair-use rules below as **current** obligations until rollout.
- Plan to **stop creating markers** and remove DSO-party sub-transactions used only
  for activity recording once CIP-0104 is live.
- Ensure the provider party holds an active `FeaturedAppRight` and appears as a
  confirmer on the views that should earn rewards.
- Design for **lower traffic per useful action** (fewer views, batching, free
  protocol-conformant confirmation responses per CIP-0104).
- Read CIP-0104 and Splice release notes for the confirmed MainNet date.

## The basic model (current, pre–CIP-0104)

Canton separates doing activity from minting the reward for that activity:

1. A transaction happens and may create reward-relevant records.
2. Rewards are processed in repeating mining rounds (publicly described as
   roughly ten minutes).
3. A later phase determines how much CC each unit of activity weight can mint.
4. Eligible parties (or delegated automation) mint CC from the resulting
   coupons.

So an action that earns rewards does not mint CC immediately; it creates the
basis for minting in a subsequent round, and unredeemed rewards can be lost.

See [tokenomics-overview.md](../business/tokenomics-overview.md) for the
round/record model in more detail.

## Featured status

By default an application is unfeatured. Public documentation describes featured
status as what makes an application's activity reward-eligible. Becoming featured
is a public process: have an application provider party, submit the featured-app
request, and have it reviewed. See
[featured-app-program.md](../business/featured-app-program.md).

There are two independent questions, and you need both to be true:

- Did the transaction create reward-eligible app attribution?
- Does the provider party hold featured status so that attribution actually
  earns featured rewards?

## How an app earns app rewards

Two complementary paths are documented for wallet-style providers:

- CC transfer preapprovals: when a provider maintains preapprovals for its users
  and those are used for direct incoming CC transfers, app reward attribution is
  created for the provider party.
- Explicit activity attribution: user actions create a
  `FeaturedAppActivityMarker` for the provider party. For token-standard
  interactions, the documentation recommends `WalletUserProxy`.

A serious app usually implements both.

## FeaturedAppActivityMarker

The `FeaturedAppActivityMarker` (defined by CIP-47) exists for transactions that
add value but do not involve a CC transfer, such as stablecoin transfers, trade
settlement, real-world-asset lock/unlock or transfer, and token mint/burn.

Documented properties:

- A marker should correspond to an asset transfer, or an equivalently
  economically meaningful transaction, enabled by the provider.
- Markers should not be created for intermediate or propose-only steps.
- The marker is converted into an `AppRewardCoupon` by network automation. The
  coupon uses the DSO as signatory, includes the provider as observer, lets the
  provider mint in the minting step, and is featured based on a
  `FeaturedAppRight`.
- Several markers can exist in one transaction tree only for genuinely composed
  transactions involving multiple real value-contributing apps or registries.
  This is a guardrail, not blanket permission to multiply reward events.

## FeaturedAppRight and reward splitting

`FeaturedAppRight` lets the provider exercise
`FeaturedAppRight_CreateActivityMarker`. Rewards can be split among beneficiaries
via `AppRewardBeneficiary`, where each beneficiary has a party and a `weight`
between 0.0 and 1.0; implementations should keep weights positive and summing to
1.0. This enables sharing rewards among the provider, the end user, and other
business parties.

## Marker fair-use principles (current until traffic-based rollout)

These principles apply while the marker-based model is in force. After CIP-0104
rollout, marker submission ends; economic alignment comes from traffic spent on
featured-app activity instead.

Markers exist to align reward weight with real economic contribution to the
network, not to amplify rewards beyond underlying on-chain activity. The
following principles capture the intent of the fair-use guidance. They are
stated at a principle level on purpose; treat the official guidance and the
Tokenomics Committee's current rules as authoritative until CIP-0104 replaces
that mechanism.

1. No markers on CC transactions. CC transactions already carry provider
   attribution, so marking them would double count.
2. Marker-to-fee alignment. As a default, do not submit more markers than the
   net qualifying on-chain fees you generate (one marker corresponds to one US
   dollar of reward weight). Modest variance is tolerated; persistent or large
   divergence invites review.
3. Do not count the cost of submitting markers toward the fees that justify
   markers. Markers cannot justify themselves.
4. Markers only for on-chain, fee-generating activity. Not for reads, off-chain
   API calls, UI interactions, or off-chain matching.
5. Timeliness. Submit markers promptly relative to the activity they reflect
   (the guidance uses a small, fixed number of reward rounds). Late markers are
   forfeited.
6. No net-paying users for activity, and no buying artificial volume. Offsetting
   legitimate user costs is fine; manufacturing activity to farm rewards is not.
7. No reward recycling. Do not earn new reward weight from transactions whose
   purpose is distributing previously earned rewards.

### Asset issuers

Asset issuers often do not directly submit the transactions that use their
asset, so a strict fee-based rule could exclude them despite real on-ledger
usage. The guidance therefore allows asset issuers to submit markers for
on-ledger activity involving their asset even without directly incurring the
fee, broadly one marker per qualifying third-party transaction that genuinely
uses the asset. All anti-farming, on-chain, and timeliness principles still
apply.

### Separation of roles

Where an application performs more than one major function (for example asset
issuance, wallet, exchange, custody, lending, or payments), those functions
should run under separate party identifiers so that fee generation and marker
submission are attributable to the correct economic role. Isolating an asset
issuer from other fee-generating roles is the strongest case for this.

### CIP-56 compliance for reward-eligible assets

Assets that earn featured-app rewards are expected to be CIP-56 compliant,
including being holdable in multiple ecosystem wallets and swappable via an
on-chain DvP facility. See [cip-56-integration.md](cip-56-integration.md).

## Enforcement

Failure to follow the guidance can result in featured-app status being paused,
potentially without warning, pending review. The objective throughout is to
preserve burn/mint equilibrium, fair attribution, and stable reward
distribution.

## Related

- [Tokenomics overview](../business/tokenomics-overview.md)
- [Featured app program](../business/featured-app-program.md)
- [CIP-56 integration](cip-56-integration.md)
- [DAML and API index](daml-and-api-index.md)
