# DevNet validator kickstart

A thin wrapper that drives the **official Splice validator Docker
Compose** to bring up a **DevNet** validator node. Nothing third-party is
vendored into this repo — the wrapper downloads the official Splice release bundle
and runs its `start.sh`.

DevNet is the no-approval-form path to a real network-connected validator: the
network is open to any node and the onboarding secret is self-serviceable. You
still need a few prerequisites (below). For purely local DAML/app testing you do
**not** need a validator — use the [LocalNet stack](../localnet/README.md).

Full reference (Helm/production, TestNet, KMS, upgrades, monitoring):
[../context/infrastructure/validator-node-setup.md](../context/infrastructure/validator-node-setup.md).

## Prerequisites

- **Docker Desktop** (Compose path; see the hardware reference in the doc above).
- **Static egress IP** allowlisted by a **Super Validator sponsor**. Allowlist
  propagation usually takes a few days; deploy from that same IP.
- **Network parameters** from your sponsor and the public SV network page:
  - `SPONSOR_SV_URL` — the SV **app** URL (starts with `sv.`, not Scan).
  - `SCAN_URL` — a trusted Scan URL (starts with `scan.`).
  - `MIGRATION_ID` — frozen per network (https://sync.global/sv-network/).
- A **party hint** (`<org>-<function>-<n>`, e.g. `acme-wallet-1`) — immutable, it
  becomes part of your validator operator party ID.

This repo never names specific Super Validators or hardcodes their hostnames;
obtain `SPONSOR_SV_URL`/`SCAN_URL` from your sponsor and the Foundation's public
SV list. Apply to self-operate via the
[Canton Foundation validator application](https://canton.foundation/apply-to-set-up-a-validator-node/).

## Quickstart (DevNet)

```bash
cd validator
cp .env.example .env          # fill in SPONSOR_SV_URL, SCAN_URL, MIGRATION_ID, PARTY_HINT
make prepare-secret           # self-generate a DevNet onboarding secret (~1h validity)
#   -> copy the secret into .env as ONBOARDING_SECRET=...
make up                       # downloads the bundle on first run, then starts the node
make status                   # watch containers come up
make ports                    # show local UIs
```

Stop and reset:

```bash
make down                     # stop, keep data
make clean                    # stop + delete the downloaded bundle (named volumes retained)
```

> On a later restart of an already-onboarded node, leave `ONBOARDING_SECRET`
> blank — the wrapper passes `-o ""` (the upstream flag is still required).

## Make targets

| Target | Description |
|--------|-------------|
| `make prepare-secret` | Self-generate a DevNet onboarding secret via the SV API. |
| `make up` | Start the validator (fetches the bundle first if missing). |
| `make down` | Stop the validator (data retained). |
| `make status` | Show validator containers. |
| `make logs` | Tail validator logs. |
| `make ports` | Print the local endpoints. |
| `make fetch` | Download/extract the Splice bundle only. |
| `make clean` | Stop and delete the downloaded bundle. |

## Endpoints

The Compose deployment uses `.localhost` subdomains: Wallet `http://wallet.localhost`,
Validator `http://validator.localhost`, Participant `http://participant.localhost`,
metrics at `http://validator.localhost/metrics` and `http://participant.localhost/metrics`.
Use Firefox/Chrome if `.localhost` resolution fails.

## Important notes

- **Back up your node identities** (private keys) immediately after onboarding —
  if you lose your keys, you lose access to your coins.
- DevNet **auto-taps coin** to fund traffic top-ups, so no manual coin grant is
  needed (unlike TestNet).
- DevNet **resets** roughly every 3 months; expect to re-onboard.
- The Docker Compose path has documented limitations (no KMS, no custom
  scanClient/synchronizer fault-tolerance). For anything persistent, rebuild on
  Kubernetes/Helm — see
  [../context/infrastructure/validator-node-setup.md](../context/infrastructure/validator-node-setup.md).

## Sources

- Validator index: https://docs.sync.global/validator_operator/index.html
- Onboarding: https://docs.sync.global/validator_operator/validator_onboarding.html
- Docker Compose: https://docs.sync.global/validator_operator/validator_compose.html
- Release bundles: https://github.com/digital-asset/decentralized-canton-sync/releases
