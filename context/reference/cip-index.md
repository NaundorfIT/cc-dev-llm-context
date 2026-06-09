# Canton CIP index

Complete map of published Canton Improvement Proposals (CIPs) at
[github.com/canton-foundation/cips](https://github.com/canton-foundation/cips)
(current home; an older mirror exists at `global-synchronizer-foundation/cips`).

For **builder-focused summaries** of recent substantive CIPs (0116, 0112, 0107,
0104, 0103, …), see [substantive-cips.md](substantive-cips.md).
Each CIP is at `https://github.com/canton-foundation/cips/blob/main/cip-00NN/cip-00NN.md`
(zero-padded to four digits, for example
[cip-0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md)).

- **Process:** [CIP-0000](https://github.com/canton-foundation/cips/blob/main/cip-0000/cip-0000.md)
  defines how CIPs are proposed and accepted.
- **Discussion:** [cip-discuss on lists.sync.global](https://lists.sync.global/g/cip-discuss)

Statuses below reflect the repo index as of the knowledge-base update; always
read the CIP file for the current status before depending on it.

Numbering gaps (for example 0004, 0005, 0022, 0026–0031, 0088, 0101) are
unassigned or never published.

---

## Protocol and standards (building apps)

Most relevant when you build wallets, dApps, assets, or automation on Canton.

| CIP | Title | Status |
|-----|-------|--------|
| [0056](https://github.com/canton-foundation/cips/blob/main/cip-0056/cip-0056.md) | Canton Network Token Standard | Final |
| [0112](https://github.com/canton-foundation/cips/blob/main/cip-0112/cip-0112.md) | Token Standard V2 (accounts, batch settlement, TradFi accounting; v1-compatible) | Draft |
| [0103](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md) | dApp Standard (browser dApp-to-wallet connectivity) | Approved |
| [0107](https://github.com/canton-foundation/cips/blob/main/cip-0107/cip-0107.md) | 24h submission delay for end-user CC transactions (`ExternalPartyConfigState`) | Approved |
| [0064](https://github.com/canton-foundation/cips/blob/main/cip-0064/cip-0064.md) | Delegateless automation | Final |
| [0068](https://github.com/canton-foundation/cips/blob/main/cip-0068/cip-0068.md) | Bootstrap network from non-zero round | Final |
| [0012](https://github.com/canton-foundation/cips/blob/main/cip-0012/cip-0012.md) | Minor CC processing and operational config adjustments | Final |
| [0013](https://github.com/canton-foundation/cips/blob/main/cip-0013/cip-0013.md) | Fix Daml models for SV re-onboarding | Final |
| [0062](https://github.com/canton-foundation/cips/blob/main/cip-0062/cip-0062.md) | Synchronizer migration to Splice 0.4.0 / Canton 3.3 | Final |
| [0089](https://github.com/canton-foundation/cips/blob/main/cip-0089/cip-0089.md) | Synchronizer migration to Splice 0.5.0 / Canton 3.4 | Approved |

**Repo context:** [CIP-56 integration](../development/cip-56-integration.md),
[dApp / wallet SDKs](../development/daml-and-api-index.md).

---

## Tokenomics (rewards, fees, issuance)

| CIP | Title | Status |
|-----|-------|--------|
| [0116](https://github.com/canton-foundation/cips/blob/main/cip-0116/cip-0116.md) | Featured App staking (per-`PartyId` CC locking for FA status) | Proposed |
| [0104](https://github.com/canton-foundation/cips/blob/main/cip-0104/cip-0104.md) | Traffic-based app rewards (removes activity markers; rewards by actual burn) | Approved |
| [0098](https://github.com/canton-foundation/cips/blob/main/cip-0098/cip-0098.md) | Cap per-transaction app rewards at 1.50 USD | Approved |
| [0096](https://github.com/canton-foundation/cips/blob/main/cip-0096/cip-0096.md) | Removing liveness rewards from validator rewards pool | Approved |
| [0078](https://github.com/canton-foundation/cips/blob/main/cip-0078/cip-0078.md) | Canton Coin fee removal (CC usage fees set to zero) | Final |
| [0084](https://github.com/canton-foundation/cips/blob/main/cip-0084/cip-0084.md) | Tokenomics Committee to recommend $/MB price tuning | Approved |
| [0042](https://github.com/canton-foundation/cips/blob/main/cip-0042/cip-0042.md) | Stable price per CC transfer via synchronizer fees | Active |
| [0048](https://github.com/canton-foundation/cips/blob/main/cip-0048/cip-0048.md) | Raising the rewards cap for validators and app providers | Final |
| [0047](https://github.com/canton-foundation/cips/blob/main/cip-0047/cip-0047.md) | Featured App Activity Markers (superseded by 0104) | Final |
| [0066](https://github.com/canton-foundation/cips/blob/main/cip-0066/cip-0066.md) | Mint CC from unminted/unclaimed pool | Final |
| [0067](https://github.com/canton-foundation/cips/blob/main/cip-0067/cip-0067.md) | One-time allocation of historical unclaimed rewards to GSF | Final |
| [0073](https://github.com/canton-foundation/cips/blob/main/cip-0073/cip-0073.md) | Weighted validator liveness rewards for SV-determined parties | Approved |
| [0001](https://github.com/canton-foundation/cips/blob/main/cip-0001/cip-0001.md) | Replace SV tranche time delays with a weighted reward | Final |
| [0002](https://github.com/canton-foundation/cips/blob/main/cip-0002/cip-0002.md) | BME tokenomics variable fine-tuning | Replaced |
| [0008](https://github.com/canton-foundation/cips/blob/main/cip-0008/cip-0008.md) | BME tokenomics variable fine-tuning | Replaced |
| [0020](https://github.com/canton-foundation/cips/blob/main/cip-0020/cip-0020.md) | BME tokenomics variable fine-tuning | Final |
| [0003](https://github.com/canton-foundation/cips/blob/main/cip-0003/cip-0003.md) | Distribute CC rewards to any live validator quickly | Final |
| [0007](https://github.com/canton-foundation/cips/blob/main/cip-0007/cip-0007.md) | SVs/validators earn extra weight for bringing validators or apps | Replaced |
| [0024](https://github.com/canton-foundation/cips/blob/main/cip-0024/cip-0024.md) | SVs/validators earn extra weight for bringing validators or apps | Final |
| [0086](https://github.com/canton-foundation/cips/blob/main/cip-0086/cip-0086.md) | ERC-20 middleware and distributed indexer | Approved |
| [0105](https://github.com/canton-foundation/cips/blob/main/cip-0105/cip-0105.md) | SV locking and long-term commitment framework | Approved |
| [0114](https://github.com/canton-foundation/cips/blob/main/cip-0114/cip-0114.md) | Digital Asset Treasury SV Program | Approved |

**Repo context:** [Tokenomics overview](../business/tokenomics-overview.md),
[App rewards and markers](../development/app-rewards-and-markers.md) (current
markers vs upcoming CIP-0104 traffic-based rewards).

---

## Process, governance, and Foundation

| CIP | Title | Status |
|-----|-------|--------|
| [0000](https://github.com/canton-foundation/cips/blob/main/cip-0000/cip-0000.md) | CIP process | Active |
| [0006](https://github.com/canton-foundation/cips/blob/main/cip-0006/cip-0006.md) | Distributing and approving process | Active |
| [0021](https://github.com/canton-foundation/cips/blob/main/cip-0021/cip-0021.md) | Featured Application and Validator Committee (FAV-C) | Active |
| [0045](https://github.com/canton-foundation/cips/blob/main/cip-0045/cip-0045.md) | SV operating requirements | Active |
| [0051](https://github.com/canton-foundation/cips/blob/main/cip-0051/cip-0051.md) | Streamline on-chain governance votes | Final |
| [0082](https://github.com/canton-foundation/cips/blob/main/cip-0082/cip-0082.md) | Establish 5% Development Fund (Foundation-governed) | Approved |
| [0100](https://github.com/canton-foundation/cips/blob/main/cip-0100/cip-0100.md) | Governance of the CIP-0082 Development Fund | Approved |
| [0111](https://github.com/canton-foundation/cips/blob/main/cip-0111/cip-0111.md) | Process for reducing Super Validator weight | Approved |
| [0014](https://github.com/canton-foundation/cips/blob/main/cip-0014/cip-0014.md) | Scan API enhancements for tax accounting | Final |
| [0079](https://github.com/canton-foundation/cips/blob/main/cip-0079/cip-0079.md) | SV readiness; third-party price feed for CC listing | Approved |
| [0092](https://github.com/canton-foundation/cips/blob/main/cip-0092/cip-0092.md) | Controlled transition to dynamic market feeds post-listing | Approved |
| [0049](https://github.com/canton-foundation/cips/blob/main/cip-0049/cip-0049.md) | Incentivizing cold backups for SVs | Proposed |
| [0023](https://github.com/canton-foundation/cips/blob/main/cip-0023/cip-0023.md) | SV Operations committee | Withdrawn |
| [0025](https://github.com/canton-foundation/cips/blob/main/cip-0025/cip-0025.md) | Committees | Obsolete |
| [0050](https://github.com/canton-foundation/cips/blob/main/cip-0050/cip-0050.md) | Controlled validator growth | Withdrawn |

**Repo context:** [Contributing to Canton](../development/contributing-to-canton.md)
(Development Fund uses CIP-0082 and CIP-0100).

---

## SV onboarding and weight grants

These CIPs are primarily **governance entries** for Super Validator weight and
onboarding. Titles and outcomes are public record in the CIPs repo; read each CIP
for the authoritative text rather than relying on shorthand here.

| CIP | Summary (shorthand) | Status |
|-----|---------------------|--------|
| 0009 | Broadridge w10 | — |
| 0010 | LCV T1 | — |
| 0011 | IEU forgo minting | — |
| 0015 | Copper w1 | — |
| 0016 | Dfns w1 | — |
| 0017 | MPCH w1 | — |
| 0018 | Tradeweb w10 | — |
| 0019 | 7RIDGE w10 | — |
| 0032 | Lukka w1 | — |
| 0033 | Strange Pixels w0.5 | Rejected |
| 0034 | Proof Group w1 | — |
| 0035 | Five North w3 | — |
| 0036 | Kiln w1 | — |
| 0037 | Obsidian w1 | — |
| 0038 | Hexagate w1 | — |
| 0039 | Copper Clearloop w1 | — |
| 0040 | Deribit w1 | — |
| 0041 | Circle w10 | — |
| 0043 | TRM | — |
| 0044 | Elliptic w0.5 | — |
| 0046 | Coin Metrics w1 | — |
| 0052 | Monstera w5 | Withdrawn |
| 0053 | AngelHack w2.5 | — |
| 0054 | Figment w1 | — |
| 0055 | Bitwave w1 | — |
| 0057 | Quantstamp w1 | — |
| 0058 | IntellectEU w1 | — |
| 0059 | Woodside AI w10 | Withdrawn |
| 0060 | Zero Hash w7.5 | — |
| 0061 | Chainlink w7.5 | — |
| 0063 | Kaiko w6.5 | — |
| 0065 | LayerZero / Wormhole / Chainlink w3 each | — |
| 0069 | Ledger w5 | — |
| 0071 | Ubyx w5 | — |
| 0072 | Fireblocks w5 | — |
| 0074 | BitGo w5 | — |
| 0075 | Zodia w5 | — |
| 0076 | Hypernative w1 | — |
| 0077 | Taurus w5 | — |
| 0080 | Republic w6 | — |
| 0081 | YZi Labs w10 | — |
| 0083 | DTCC | — |
| 0085 | Talos w6.5 | — |
| 0087 | Hex Trust w3 | — |
| 0090 | USDT0 outcome-linked max 10 | — |
| 0091 | Zenith w10 | — |
| 0093 | Bosphorus max 6 | — |
| 0094 | Blockdaemon w5 | — |
| 0095 | Mesh outcome-linked max 10 | — |
| 0097 | Nasdaq | — |
| 0099 | Zero Hash adoption mod | — |
| 0102 | Tharimmune w4 | — |
| 0106 | QCP Group w5 | — |
| 0108 | Merkle Science w1 | Proposed |
| 0109 | Visa | — |
| 0110 | Apollo max 7 | — |
| 0113 | Further Asset Management w8 | — |
| 0115 | Societe Generale max 8 | — |

Links: `https://github.com/canton-foundation/cips/blob/main/cip-00NN/cip-00NN.md`
for each number above.

**Operator context:** when you need a sponsor for validator onboarding, use the
Foundation's current public Super Validator list, not this table alone. See
[validator onboarding](../infrastructure/validator-onboarding.md).

---

## Quick picks by task

| You are… | Start with |
|----------|------------|
| Building a wallet or asset | CIP-0056, CIP-0103, CIP-0112 (draft) |
| Planning featured-app economics | CIP-0104, CIP-0116, CIP-0047 (historical) |
| Estimating traffic cost | CIP-0042, CIP-0084 |
| Applying for ecosystem funding | CIP-0082, CIP-0100 |
| Running a validator | CIP-0089, CIP-0062, CIP-0045 |
| Understanding governance | CIP-0000, CIP-0021, CIP-0051 |
