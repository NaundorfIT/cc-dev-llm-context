---
name: canton-validator-upgrade
description: >-
  Guarded Splice validator version upgrades. Use when changing SPLICE_VERSION,
  reading release notes, swapping the Compose bundle, or deciding whether a
  GitHub tag is safe to install. Covers the /info gate, breaking-change review,
  backup, quiesce, full bundle swap, readiness, and smoke test.
---

# Canton validator upgrade

Use this skill to move an already-onboarded validator to a newer Splice
version. A protocol migration (`MIGRATION_ID` change, non-null `"successor"`)
and a move to a new machine are different procedures: read
[validator-upgrades-and-recovery.md](../../../context/infrastructure/validator-upgrades-and-recovery.md)
and use `canton-validator-backup` for the restore. Security checks that are
not an image bump belong to `canton-validator-security`.

## Rules

1. Follow the checklist in order. Do not start the node on the new bundle
   before the backup exists and has been copied off the server.
2. Install the `sv` version `/info` advertises for that network on the day you
   execute. A newer tag in the bundle repository is not the network version.
3. Leave `MIGRATION_ID` and `PARTY_HINT` unchanged. `"successor"` must be
   `null`. A mismatch is a synchronizer migration, so stop.
4. Replace the whole official bundle. Do not edit Compose or `start.sh` in
   place, and do not bump only `IMAGE_TAG`.
5. Never `docker compose down -v`. Never start a downgrade after the new
   version has booted; a schema migration may already have run.
6. On any failure after the validator was stopped, leave dependent workloads
   paused. Keep the previous bundle renamed beside the new one.

## Checklist

```
Upgrade progress:
- [ ] 1. Discover
- [ ] 2. Breaking-change review
- [ ] 3. Stage the bundle
- [ ] 4. Backup (canton-validator-backup)
- [ ] 5. Quiesce
- [ ] 6. Stop, swap, start
- [ ] 7. Readiness, then resume, then smoke
```

### 1. Discover

```bash
curl -fsSL https://docs.dev.global.canton.network.sync.global/info | jq .
curl -fsSL https://docs.global.canton.network.sync.global/info | jq .
docker compose ps
```

Record the running image tags, the configured `SPLICE_VERSION`, the target,
the configured `MIGRATION_ID` against live `migration_id`, and `"successor"`.
Also record whether a wallet-gateway container is running (`start.sh -g`).
See [validator-security.md](../../../context/infrastructure/validator-security.md).

### 2. Breaking-change review

Read the release notes for every version between current and target, not only
the target. One row per note that could touch this stack:

| Release | Note item | Local search | Impact | Action |
|---------|-----------|--------------|--------|--------|
| … | … | path or none | none / break | … |

Classes that have broken operators before:

| Class | What to check |
|-------|----------------|
| Removed APIs | Transfer and preapproval clients, especially `TransferCommand` removed in 0.7.0 |
| DAR vetting | Releases that auto-unvet package versions. Snapshot vetted package ids before the window if you depend on a registry |
| Compose / `start.sh` | Renamed env vars. From 0.9.0, `-g` starts Wallet Gateway and requires equal ledger and validator audiences. From 0.10.0 the gateway is on by default |
| Auth | JWT audiences, wallet paths |
| PostgreSQL | A Postgres major upgrade is its own maintenance |

Do not execute while any row says "break" and has no action.

### 3. Stage

Download and unpack the official bundle for the advertised version next to the
live directory. That is safe while the node is up. Confirm disk space and that
the current node is healthy before you stop it.

### 4. Backup

Run `canton-validator-backup` while the node is still healthy. If the backup
or the off-server checksum check fails, abort. The validator has not been
touched.

### 5. Quiesce

Stop every process that submits ledger commands: scheduled jobs, timers,
writers, and long-lived streams. Write down which units were running so you
re-enable those and nothing else. Leave monitoring and the identity provider
up.

### 6. Stop, swap, start

Stop the validator and keep the volumes. Move the old bundle aside, put the
new bundle in its place, set `SPLICE_VERSION` to the target, and start.
Customisation belongs in environment variables or a wrapper, because the
bundle directory is replaced again on the next upgrade.

### 7. Readiness, then resume, then smoke

Before resuming workloads, all of these hold:

- Expected containers are healthy. One-shot init containers exiting 0 is normal.
- Image tags equal the target. `participant-<MIGRATION_ID>` is unchanged.
- The Postgres volume still exists.
- Ledger API, wallet API, and metrics answer.
- The sequencer connection pool reports validated connections above zero.
- The egress address is unchanged.
- Logs have no `"level":"FATAL"` and no migration failure. Do not grep the
  bare string `OutOfMemoryError`; the JVM banner contains
  `-XX:+HeapDumpOnOutOfMemoryError` on a healthy start.

If you depend on a third-party token-standard registry, re-check that the
instrument still resolves. An instrument that no longer resolves is a hard
stop: leave workloads paused.

Then resume only the units you recorded, and run one small end-to-end
transfer. That smoke test is a single check, not a scheduled job. Confirm the
node has traffic available first. Take another off-server backup after the
node is healthy on the new version.

## Failure

| Point | Action |
|-------|--------|
| Backup fails | Abort. Node untouched. |
| Quiesce incomplete | Abort. Find the stuck unit. |
| Stop fails, before the swap | Resume workloads and exit. |
| Start or readiness fails, after the swap | Leave workloads paused. Keep the old bundle. Do not invent a downgrade. |
| Registry check fails | Leave workloads paused even if the validator looks healthy. |

## Read for depth

- [Validator upgrades and recovery](../../../context/infrastructure/validator-upgrades-and-recovery.md)
- [Validator security](../../../context/infrastructure/validator-security.md)
- [Validator resource sizing](../../../context/infrastructure/validator-resource-sizing.md)

## Official sources

- [Validator upgrades](https://docs.canton.network/global-synchronizer/production-operations/validator-upgrades)
- [Splice release notes](https://docs.canton.network/global-synchronizer/release-notes/splice)
