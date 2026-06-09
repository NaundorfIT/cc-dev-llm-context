# Validator onboarding

This page explains how to become a validator operator on the Canton Network and
how to apply. It is built around the public
[Canton Foundation validator application](https://canton.foundation/apply-to-set-up-a-validator-node/).

## Do you need to operate your own node?

There are two paths to having a validator presence on Canton:

1. Operate your own validator. This is for institutions that want to run and
   control the node themselves.
2. Use an existing operator. Individuals who do not represent a corporate entity,
   or teams that do not want to run infrastructure, can ask an existing operator
   to run a node on their behalf.

The application form is explicitly for those who want to be their own validator
operator. If that is not you, reach out to an existing operator instead.

## Network tiers

There are three networks, and you onboard up the tiers:

- DevNet: self-service onboarding, and self-featuring is possible for testing
  reward flows.
- TestNet: sponsored onboarding plus approval by the Global Synchronizer
  Foundation's Tokenomics Committee.
- MainNet: sponsored onboarding plus Tokenomics Committee approval.

DevNet and TestNet reset on a rolling schedule (roughly every few months, offset
so they do not reset at the same time); MainNet never resets. Plan for
re-onboarding on the lower tiers. Per-network migration IDs are published on the
public SV network page.

## What the application asks for

The public form collects, among other things:

- The applying institution's name and website.
- A business email address. It must be an individual business email on the
  company domain. Shared aliases (for example `ops@`, `support@`, `info@`,
  `hello@`) and personal email providers (Gmail, Yahoo, and similar) are
  rejected automatically.
- A short description of the institution.
- Why you qualify to operate a validator and why you prefer to do it yourself
  rather than using an existing operator.
- A sponsor: the name and email of a contact at one of the Super Validators who
  will sponsor your onboarding. The form links to the public list of Super
  Validators. If you do not have a contact there, you may answer "N/A".
- How you plan to contribute to the ecosystem (for example, building
  applications or introducing developers and projects to the Foundation).
- Country of incorporation.

Submitting the form sends your responses to the Foundation's tokenomics mailing
list, and approval notifications go to the email you provide.

> Finding a sponsor: use the Foundation's public Super Validator list to identify
> a sponsor. This repo does not name specific Super Validators; rely on the
> current public list, which is authoritative and kept up to date.

## Onboarding mechanics

The documented operator flow involves:

- Providing your sponsoring Super Validator with a static egress IP (one distinct
  IP per network) and waiting for the IP allowlist to propagate.
- Obtaining a one-time onboarding secret: self-serve on DevNet (short validity);
  issued manually by your sponsor on TestNet/MainNet (longer one-time validity).
- For TestNet/MainNet, submitting a request to the Tokenomics Committee:
  [sync.global/validator-request](https://sync.global/validator-request/).

Each network needs a fully isolated deployment with its own Postgres and storage.
See the validator onboarding guide:
https://docs.sync.global/validator_operator/validator_onboarding.html

## Deployment options

- Docker Compose: simplest, good for getting started (the DevNet path).
- Kubernetes / Helm: recommended for production.

For a hands-on setup reference (hardware, prerequisites, Helm + Compose,
onboarding-secret mechanics, traffic top-up, KMS, upgrades, monitoring, and the
Canton 3.4 / Splice 0.6.x breaking changes), see
[validator-node-setup.md](validator-node-setup.md). This repo also ships a thin
[DevNet validator wrapper](../../validator/README.md) that drives the official
Splice validator Docker Compose.

Hardware requirements and deployment guides:
https://docs.sync.global/validator_operator/validator_hardware_requirements.html

## After approval

Once approved, move on to standing up and operating the node:

- Follow the operator documentation at [docs.sync.global](https://docs.sync.global/index.html).
- Use the Splice deployment material indexed in
  [splice-validator-ops.md](splice-validator-ops.md).
- Understand traffic before you go live; see
  [traffic-operations.md](traffic-operations.md).
- Configure automatic traffic top-ups and keep identity backups; review the
  backup, disaster-recovery, and security-hardening guides.

## Related

- [Validator node setup reference](validator-node-setup.md)
- [DevNet validator wrapper](../../validator/README.md)
- [Ecosystem and roles](../business/ecosystem-and-roles.md)
- [Traffic operations](traffic-operations.md)
- [Splice validator ops](splice-validator-ops.md)
