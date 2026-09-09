---
name: canton-validator-operations
description: >-
  Day-2 operations for an already-deployed Canton validator. Use when sizing JVM
  and memory limits, keeping a stable egress IP, configuring OIDC auth, setting
  up metrics and traffic gauges, upgrading Splice, backing up or restoring a
  node, or moving one to a new machine.
---

# Canton validator operations

Use this skill once a validator exists and has to keep working. For deciding
whether to operate a node, applying, and the initial deployment, use
`canton-validator-infrastructure` instead.

## Approach

1. **Establish the invariants first.** Three of them govern almost every
   incident: the egress IP is what Super Validators allowlisted, `PARTY_HINT`
   and `MIGRATION_ID` are immutable after onboarding, and the node's identity
   lives in the `validator` and `participant-<MIGRATION_ID>` Postgres databases.
   Any change that threatens one of those is a planned maintenance, not a tweak.
2. **Read the authoritative value before deriving one.** Splice version and
   migration id come from the network's `/info` endpoint. Traffic pricing comes
   from Scan. Per-submission traffic cost comes from `paidTrafficCost` on the
   Ledger API response. Guessing any of these produces drift that surfaces later
   as an outage.
3. **Size for the container, not the host.** Align
   `ActiveProcessorCount == scala numThreads == *_CPUS` for each service, and
   remember `-Xmx` derives from the container memory limit, so host swap never
   raises the heap ceiling. Verify with `docker inspect`, because a container
   keeps the environment it was created with.
4. **Keep the admin plane private.** Validator APIs, wallet UI, metrics,
   dashboards, and the identity provider bind to the admin network only, never
   to the allowlisted egress address. Reach loopback-bound UIs over an SSH
   tunnel, one high local port per virtual host.
5. **Upgrade in the guarded order.** Breaking-change review across every skipped
   release, then backup, quiesce dependent workloads, stop, swap the full
   bundle, start, readiness gates, resume, smoke test. Never reorder, never edit
   the bundle in place, never `docker compose down -v`.
6. **Restore rather than re-onboard.** Moving a node by restoring its databases
   preserves the participant identity, needs no new onboarding secret, and skips
   the first-sync catch-up. Reuse the same egress address and move it only after
   the old node stops and before the new one starts.

## Guardrails

- Do not change `MIGRATION_ID` during a version upgrade. A live `/info`
  `migration_id` that differs from the configured one, or a non-null
  `"successor"`, means a protocol migration and a different procedure.
- Do not auto-downgrade once a new version has started; a schema migration may
  already have run.
- Do not resume dependent workloads after a failed upgrade. Leave them paused.
- Do not treat a backup as valid until its checksums verify at an off-server
  destination, and do not rely on one older than the sequencer pruning window.
- Do not run allowlist checks from a workstation; run them from the node, whose
  egress address is the one being tested.
- Do not read a combined traffic total. Base-rate and purchased traffic are
  separate pools, and buying does not refill the base-rate gauge.
- Do not create the first container before Docker log rotation is configured.

## Read for depth

- [Validator networking and access](../../../context/infrastructure/validator-networking-and-access.md)
- [Validator resource sizing](../../../context/infrastructure/validator-resource-sizing.md)
- [Validator authentication and identity](../../../context/infrastructure/validator-auth-and-identity.md)
- [Validator monitoring and traffic](../../../context/infrastructure/validator-monitoring-and-traffic.md)
- [Validator upgrades and recovery](../../../context/infrastructure/validator-upgrades-and-recovery.md)
- [Validator node setup reference](../../../context/infrastructure/validator-node-setup.md)
- [Traffic operations](../../../context/infrastructure/traffic-operations.md)

## Official sources

- [Validator upgrades](https://docs.canton.network/global-synchronizer/production-operations/validator-upgrades)
- [Splice release notes](https://docs.canton.network/global-synchronizer/release-notes/splice)
- [Backups](https://docs.sync.global/validator_operator/validator_backups.html)
- [Disaster recovery](https://docs.sync.global/validator_operator/validator_disaster_recovery.html)
- [Security hardening](https://docs.sync.global/validator_operator/validator_security.html)
- [Metrics reference](https://docs.sync.global/deployment/observability/metrics_reference.html)
