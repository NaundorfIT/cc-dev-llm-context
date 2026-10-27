---
name: canton-validator-backup
description: >-
  Back up and restore a Splice validator without losing its identity. Use when
  taking a scheduled backup, backing up before an upgrade or host move,
  checking that a dump is actually restorable, or restoring Postgres onto the
  same Splice version.
---

# Canton validator backup

The participant identity, hosted parties, and wallet keys live in Postgres.
A Compose metadata export or a volume-name list is not a backup of those keys.
Use this skill for a scheduled copy, for the backup step inside
`canton-validator-upgrade`, and for a restore onto a new host. The full
cutover order is in
[validator-upgrades-and-recovery.md](../../../context/infrastructure/validator-upgrades-and-recovery.md).

## Rules

1. Take the backup while the node is healthy, before you stop it.
2. Dump `validator` first, then `participant-<MIGRATION_ID>`. When
   `ENABLE_AUTH=on`, dump the identity-provider database in the same set.
   Its user ids are UUIDs stored in the validator database. A fresh provider
   database mints new UUIDs and breaks every hosted user.
3. A backup counts only after the checksums verify on a machine that is not
   the validator host: `shasum -a 256 -c sha256sum.txt`.
4. Do not commit dumps, `.env`, or credential files. Do not paste them into
   chat or copy them to a shared drive.
5. Do not restore a dump older than the sequencer pruning window, about 30
   days. Past that, the participant can return `MemberDisabled` and fail to
   catch up.
6. Restore onto the Splice version the backup was taken on. Prove that node
   healthy, then upgrade as a separate step with `canton-validator-upgrade`.
7. An already-onboarded restore leaves `ONBOARDING_SECRET` empty. Restoring
   does not need a new secret.
8. Never run two hosts with the same identity. Never `docker compose down -v`
   on the only copy of the volume.

## Take a backup

```
Backup progress:
- [ ] 1. Identities exported while the node is up
- [ ] 2. validator database dumped
- [ ] 3. participant-<MIGRATION_ID> dumped
- [ ] 4. Identity-provider database dumped, if auth is on
- [ ] 5. Secrets copied: validator env, provider env, monitoring env
- [ ] 6. sha256 manifest written
- [ ] 7. Tree copied off the server
- [ ] 8. Checksums verified at the destination
```

Record the Splice version, `MIGRATION_ID`, and whether `/info` `"successor"`
was `null`. A later restore is valid only while that successor is still null
and the dump is inside the pruning window.

Official dump and identity-export commands:
[Backups](https://docs.sync.global/validator_operator/validator_backups.html).

## Restore

Preconditions: dump inside the pruning window, `"successor"` still `null`,
target host already has Docker log rotation configured before the first
container, and the same allowlisted egress address is ready to move.

1. Quiesce submitters on the old host. Take a fresh backup if the one you
   hold is not from this window.
2. Stop the old validator and keep its volumes.
3. Copy the verified dump to the new host.
4. Move the egress address only after the old node is stopped and before the
   new one starts. Disable egress on the old host so it cannot reclaim the
   address.
5. Confirm the allowlist from the new host. The address under test is that
   host's egress, so the check runs there, not from a workstation.
6. Restore the databases into a clean volume, identity provider included when
   auth is on. Start on the backup's Splice version with `ONBOARDING_SECRET`
   empty.
7. Pass the readiness gates in `canton-validator-upgrade` before resuming
   workloads. Rebind OIDC discovery and JWKS URLs if they embed the old admin
   address. Bring monitoring up before the workloads that depend on it.

Keep the old host stopped, workloads disabled, until the new node is healthy.
To roll back, move the egress address back and start the old validator. Do
not power both on.

Also move systemd units, scripts (keep the executable bit), and any local
SQLite or JSON state, and only after the writers have stopped.

## Read for depth

- [Validator upgrades and recovery](../../../context/infrastructure/validator-upgrades-and-recovery.md)
- [Validator security](../../../context/infrastructure/validator-security.md)
- [Validator authentication and identity](../../../context/infrastructure/validator-auth-and-identity.md)
- [Validator networking and access](../../../context/infrastructure/validator-networking-and-access.md)

## Official sources

- [Backups](https://docs.sync.global/validator_operator/validator_backups.html)
- [Disaster recovery](https://docs.sync.global/validator_operator/validator_disaster_recovery.html)
