# Splice validator ops: documentation index

A curated set of starting points for deploying and operating a Canton validator
with Splice. This is a link index, not a substitute for the official docs.

## Source repositories

- [hyperledger-labs/splice](https://github.com/hyperledger-labs/splice) - the
  Splice codebase: validator and super-validator apps, the wallet, scan, and the
  DAML models behind Canton Coin and reward mechanics.
- [digital-asset/canton](https://github.com/digital-asset/canton) - the Canton
  protocol.
- [digital-asset/decentralized-canton-sync](https://github.com/digital-asset/decentralized-canton-sync) -
  release tags and artifact downloads.
- [canton-foundation/cips](https://github.com/canton-foundation/cips) - Canton
  Improvement Proposals and governance.
- [github.com/digital-asset](https://github.com/digital-asset) - Digital Asset's
  open-source projects, including DAML tooling and SDK components.
- [github.com/DACH-NY](https://github.com/DACH-NY) - additional Canton and DAML
  related repositories.

## Documentation

- [docs.canton.network](https://docs.canton.network) - the consolidating unified
  hub (the doc sites below are being folded into it over 2026).
- [docs.sync.global](https://docs.sync.global/index.html) - the network and
  operator documentation, including validator setup and operations.
- [docs.digitalasset.com](https://docs.digitalasset.com) - Digital Asset product
  and utilities documentation, including reference material such as supported
  package/DAR versions.
- [docs.daml.com](https://docs.daml.com) - the DAML language and SDK
  documentation (relevant when you also build or upgrade on-ledger code).

### Key operator pages on docs.sync.global

- Validator index: https://docs.sync.global/validator_operator/index.html
- Docker Compose deployment: https://docs.sync.global/validator_operator/validator_compose.html
- Kubernetes/Helm deployment: https://docs.sync.global/validator_operator/validator_helm.html
- Upgrades: https://docs.sync.global/validator_operator/validator_upgrades.html
- Backups: https://docs.sync.global/validator_operator/validator_backups.html
- Disaster recovery: https://docs.sync.global/validator_operator/validator_disaster_recovery.html
- Security hardening: https://docs.sync.global/validator_operator/validator_security.html
- Minting delegations: https://docs.sync.global/validator_operator/validator_delegations.html
- Monitoring and observability: https://docs.sync.global/deployment/observability/index.html
- Metrics reference: https://docs.sync.global/deployment/observability/metrics_reference.html
- Troubleshooting: https://docs.sync.global/deployment/troubleshooting.html

## Explorers and network status (community/vendor-operated)

These are useful for monitoring but are not official Digital Asset properties;
verify authoritative figures against the Scan APIs.

- CC View: https://ccview.io/ (testnet: https://testnet.ccview.io/)
- Cantonscan: https://www.cantonscan.com/
- 5N Lighthouse: https://lighthouse.cantonloop.com/
- SV Network Status (Canton Foundation): https://canton.foundation/sv-network-status-2/
- SV network / migration IDs: https://sync.global/sv-network/

## Suggested reading order for a new operator

1. Confirm you should self-operate and complete the
   [validator onboarding](validator-onboarding.md) process.
2. Work through the [validator node setup reference](validator-node-setup.md)
   (hardware, prerequisites, Helm + Compose, onboarding, traffic, KMS, upgrades,
   3.4/0.6 changes). For a hands-on DevNet node, use the
   [DevNet validator wrapper](../../validator/README.md). Then review the
   corresponding components in
   [hyperledger-labs/splice](https://github.com/hyperledger-labs/splice).
3. Build a traffic model from [traffic-operations.md](traffic-operations.md) and
   the official traffic documentation.
4. Establish monitoring and runbooks before carrying production load.

## Contributing to Splice

Operators and integrators can contribute upstream, not only consume releases.
See [contributing-to-canton.md](../development/contributing-to-canton.md) for the
recommended flow: draft a proposal (for example RFC 7523 support or a related
issue batch), align in `#splice-contributions-external`, then open PRs on
[canton-network/splice](https://github.com/canton-network/splice/issues).

## Keeping current

Pin the protocol and package versions you run, and re-check the docs after each
upgrade. Reward and traffic behavior can change between releases, so an operator
runbook should be revisited rather than assumed stable.
