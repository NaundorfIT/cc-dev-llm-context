# Featured app program

Featured status is what makes an application's on-chain activity eligible for app
rewards. This page covers what featured status means, how it is obtained, and how
**[CIP-0116](https://github.com/canton-foundation/cips/blob/main/cip-0116/cip-0116.md)**
changes capital requirements. Deep CIP context:
[substantive-cips.md](../reference/substantive-cips.md).

## What featured status does

By default an application is unfeatured and its activity does not earn featured
app rewards. You need both:

- Reward-eligible **activity attribution** (today: markers or preapprovals; after
  [CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md):
  traffic-based attribution — see
  [app-rewards-and-markers.md](../development/app-rewards-and-markers.md)).
- An active **featured** provider party with the required **CC lock** (CIP-0116).

## Traffic-based rewards (~end of July 2026)

[CIP-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)
(approved) removes activity markers and bases rewards on actual synchronizer
traffic. Featured status remains required; confirm MainNet rollout in the CIP
and release notes.

## CIP-0116 — Featured App staking (proposed)

[CIP-0116](https://github.com/canton-foundation/cips/blob/main/cip-0116/cip-0116.md)
(proposed 2026-05-06) makes **per-`PartyId` CC locking** the requirement for FA
status instead of discretionary approval alone.

**On passing (immediate):** **25,000,000 CC** locked per `PartyId` (transitional,
aligned with pre–CIP-0104 mechanics).

**After CIP-0104 is live — choose a tier:**

| Tier | Lock | Hold period | Reward cap (per weight unit) |
|------|------|-------------|------------------------------|
| 1 | 1,000,000 CC | 30 days | ~$0.80 |
| 2 | 5,000,000 CC | 365 days | ~$1.50 |

**SV-locked CC reuse:** Super Validators may initially reuse SV-locked CC to back
apps; that reuse **sunsets 90 days after CIP-0104 go-live**, then apps need
**unencumbered** CC.

**Enforcement:** continuous. Below threshold → **FA status removed immediately**.
SV operators must run an **unfeature vote within 30 minutes**.

Per-transaction caps also interact with
[CIP-0098](https://github.com/canton-foundation/cips/blob/main/cip-0098/cip-0098.md)
($1.50). Read the CIP for authoritative numbers and dates.

## The public request process

1. Have an application provider party.
2. Submit the featured-app request through the Canton Foundation channel.
3. Committee review (FAV-C per [CIP-0021](https://github.com/canton-foundation/cips/blob/main/cip-0021/cip-0021.md)).

On DevNet you can self-feature for testing. On MainNet, plan for CIP-0116 lock
capital and CIP-0104 traffic-based reward design together.

## Responsibilities

Until CIP-0104 rollout, marker **fair-use** rules apply; see
[app-rewards-and-markers.md](../development/app-rewards-and-markers.md). Misuse
can pause FA status pending review.

## Useful links

- [Canton Foundation](https://canton.foundation/)
- [Apply to set up a validator node](https://canton.foundation/apply-to-set-up-a-validator-node/)
- [Validator request (TestNet/MainNet)](https://sync.global/validator-request/)
- [docs.sync.global](https://docs.sync.global/index.html) tokenomics background

## Related

- [App rewards and markers](../development/app-rewards-and-markers.md)
- [Tokenomics overview](tokenomics-overview.md)
- [Substantive CIPs](../reference/substantive-cips.md)
- [Ecosystem and roles](ecosystem-and-roles.md)
