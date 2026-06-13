---
name: canton-cip56-integrations
description: >-
  Guidance for integrating CIP-56 token-standard assets on Canton. Use when
  building wallet features or asset integrations involving token balances,
  holdings/UTXOs, direct transfers, offer/accept flows, pre-approvals, or
  DvP/allocation workflows, and when reasoning about their traffic cost.
---

# Canton CIP-56 integrations

Use this skill when working with the Canton token standard (CIP-56) for wallets
or asset integrations.

## Approach

1. Resolve the asset identity: **issuer** (institution), **instrument admin**
   (registry party in `InstrumentId`), and instrument **`id`** string. Assets are
   registered in a CIP-56 registry (commonly Digital Asset Utilities); fetch
   metadata and factories from the registry Token Standard API before enabling
   the instrument in the wallet.
2. Map the capability you need: balances and history, direct transfers,
   offer/accept flows, DvP/allocation, or pre-approvals.
3. Prefer pre-approval for repeat inbound transfers. It removes an extra
   offer/accept step, which reduces traffic cost and supports app-reward
   attribution.
4. Mind holdings/UTXO hygiene. More input holdings raise transfer cost; merging
   holdings also costs traffic, so merge intentionally rather than reflexively.
5. Account for topology. Intra-validator transfers are cheaper than
   inter-validator transfers for the same logical action.
6. For issuers that want reward eligibility, plan for CIP-56 compliance
   expectations (holdable in multiple wallets, swappable via on-chain DvP) and
   role separation for the issuer party.

## Guardrails

- Treat any specific byte/cost figure as illustrative; recalibrate against your
  own measurements and the current package/DAR version.
- Verify the live API surface against the official documentation.

## Read for depth

- [CIP-56 integration](../../../context/development/cip-56-integration.md)
- [CIP-56 allocation lock learnings](../../../context/development/cip-56-allocation-lock-learnings.md)
- [Amulet lock example](../../../examples/amulet-lock/)
- [Substantive CIPs — 0112 v2, 0107, 0103](../../../context/reference/substantive-cips.md)
- [Traffic-cost planning](../../../context/development/traffic-cost-planning.md)
- [App rewards and markers](../../../context/development/app-rewards-and-markers.md)

## Official sources

- [docs.canton.network](https://docs.canton.network)
- [Token Standard APIs (CIP-0056)](https://docs.sync.global/app_dev/token_standard/index.html)
- [DA Registry / Token Standard guide](https://docs.digitalasset.com/utilities/mainnet/overview/registry-user-guide/token-standard.html)
- [docs.digitalasset.com](https://docs.digitalasset.com)
- [digital-asset/decentralized-canton-sync](https://github.com/digital-asset/decentralized-canton-sync) (release bundles)
- [canton-network/splice](https://github.com/canton-network/splice) (OSS source)
