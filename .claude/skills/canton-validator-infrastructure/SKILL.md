---
name: canton-validator-infrastructure
description: >-
  Guidance for operating Canton validator infrastructure. Use when setting up or
  running a validator node, applying to operate a node, reasoning about traffic
  metering and purchase, or building operator runbooks with Splice.
---

# Canton validator infrastructure

Use this skill for tasks about running a Canton validator: applying to operate,
deploying with Splice, and managing traffic.

## Approach

0. For local development and testing, run a self-contained network first with
   LocalNet (no sponsor/VPN): three validators (sv/app-provider/app-user) +
   synchronizer + wallet/scan UIs. Use the one-command wrapper in
   [localnet/](../../../localnet/README.md) and deploy your DAR before reaching
   for a real validator. A real DevNet-connected node is a separate, sponsored
   path (below).
1. Decide whether to self-operate. The Foundation validator application is for
   teams that want to run the node themselves; otherwise use an existing
   operator.
2. Apply via the public process: a business email on your company domain (no
   shared aliases or personal providers), a sponsor contact at a Super Validator
   from the public list, and your ecosystem-contribution plan.
3. Onboard up the network tiers: DevNet (self-service), then TestNet and MainNet
   (sponsored plus Tokenomics Committee approval via sync.global/validator-request).
   Provide a static egress IP per network, use the one-time onboarding secret,
   and keep deployments fully isolated (own Postgres/storage per network). Plan
   for DevNet/TestNet resets; MainNet never resets.
4. Deploy with Splice: Docker Compose for simplicity (the DevNet path; a thin
   wrapper lives in [validator/](../../../validator/README.md)), Kubernetes/Helm
   for production (charts on `ghcr.io/digital-asset/decentralized-canton-sync`,
   one validator per namespace). Provide a static egress IP, the onboarding
   secret (self-service on DevNet via the SV API; sponsor-issued on TestNet),
   `MIGRATION_ID`, `SPONSOR_SV_URL`, and Scan URL. Establish monitoring (metrics
   on port 10013), backups, disaster recovery, and security hardening before
   carrying production load. See
   [validator-node-setup.md](../../../context/infrastructure/validator-node-setup.md).
5. Build a traffic model from the `AmuletRules` parameters (read live values from
   Scan): `extraTrafficPrice`, `readVsWriteScalingFactor`, `minTopupAmount`,
   `burstAmount`/`burstWindow`. Configure the validator app's automatic top-ups.
6. Favor topologies that keep frequent transfers intra-validator where it makes
   sense, since inter-validator transfers cost more.

## Guardrails

- Never enumerate specific Super Validators; rely on the Foundation's current
  public list to identify a sponsor.
- Pin protocol/package versions and revisit runbooks after upgrades, since
  traffic and reward behavior changes across releases.

## Read for depth

- [Local dev stack (LocalNet)](../../../context/development/local-dev-stack.md)
- [Validator onboarding](../../../context/infrastructure/validator-onboarding.md)
- [Validator node setup reference](../../../context/infrastructure/validator-node-setup.md)
- [Traffic operations](../../../context/infrastructure/traffic-operations.md)
- [Splice validator ops](../../../context/infrastructure/splice-validator-ops.md)

## Official sources

- [Apply to set up a validator node](https://canton.foundation/apply-to-set-up-a-validator-node/)
- [Validator request (TestNet/MainNet)](https://sync.global/validator-request/)
- [docs.canton.network](https://docs.canton.network)
- [docs.sync.global](https://docs.sync.global/index.html)
- [hyperledger-labs/splice](https://github.com/hyperledger-labs/splice)
