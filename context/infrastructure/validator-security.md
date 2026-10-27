# Validator security

A validator's namespace root key and hosted wallet keys live in the participant
database on the node. The path that matters is the operator's own admin access:
the laptop, the SSH key, and the admin VPN. An attacker who has that access can
sign as the node. Closing more ports on the public address does not move keys
that are already reachable over that path.

Official references:

- [Security advisory for validator operators (2026-10-26)](https://forum.canton.network/t/security-advisory-for-validator-and-super-validator-operators/9421)
- [Wallet Gateway 1.13.0 notice](https://forum.canton.network/t/critical-security-notice-upgrade-wallet-gateway-to-v1-13-0/9409)
- [Key management](https://docs.canton.network/global-synchronizer/production-operations/key-management)
- [Validator security](https://docs.canton.network/global-synchronizer/production-operations/validator-security)
- [Backups](https://docs.sync.global/validator_operator/validator_backups.html)
- [Disaster recovery](https://docs.sync.global/validator_operator/validator_disaster_recovery.html)

Report a suspected compromise to `security@canton.foundation`. The
`#validator-operators` channel is the operator discussion, not the incident
mailbox.

## Run the version the network advertises

Read `/info` on the day of the upgrade and install that `sv` version. A tag in
the bundle repository can exist before Super Validators adopt it.

Checked on 2026-10-27:

| Source | What it said |
|--------|----------------|
| MainNet `https://docs.global.canton.network.sync.global/info` | `sv` `0.9.3`, `migration_id` `4`, synchronizer serial `6` on `0.9.3`, `"successor": null` |
| DevNet `https://docs.dev.global.canton.network.sync.global/info` | `sv` `0.9.4`, `migration_id` `1`, and a successor serial also on `0.9.4` |
| Bundle tag `v0.9.4` on [decentralized-canton-sync](https://github.com/digital-asset/decentralized-canton-sync), published 2026-10-23 | Present while MainNet `/info` still advertised `0.9.3` |

That `0.9.4` bundle is the image rebuild for the eMudhra root-CA issue and the
Canton dependency bump. It is the right target once `/info` names it. Passing
it to an upgrade script before then installs a version the network has not
adopted. A script that prints `/info` and still accepts a newer `--to-version`
will do exactly that. Re-read the endpoint before a later bump.

A non-null `"successor"` is a protocol migration, not an image bump. Leave
`MIGRATION_ID` unchanged on a version upgrade. The procedure is in
[validator-upgrades-and-recovery.md](validator-upgrades-and-recovery.md).

## Wallet Gateway is a separate process

The Node.js advisory is fixed in Wallet Gateway `1.13.0`. The flaw is in the
Node.js runtime bundled in that image, not in the participant or the validator
app. The [notice](https://forum.canton.network/t/critical-security-notice-upgrade-wallet-gateway-to-v1-13-0/9409)
says the gateway image can be bumped on its own: set that service's image tag
to `1.13.0` and recreate it. You do not have to upgrade the rest of the Splice
bundle to patch the gateway.

On Docker Compose the flag is `start.sh -g`. `docker compose ps` is the check.
A stack that never passes `-g` has no gateway container. After every bundle
swap, look at the process list again. The
[Splice 0.9.0 release notes](https://docs.canton.network/global-synchronizer/release-notes/splice)
say the gateway is deployed by default from `0.10.0`, so a later `start.sh`
can start it without a flag you used to pass. Enabling `-g` requires
`LEDGER_API_AUTH_AUDIENCE` and `VALIDATOR_AUTH_AUDIENCE` to be equal, and with
`-a` a `WALLET_GATEWAY_UI_CLIENT_ID`. An `.env` whose audiences differ will not
start once the gateway is on by default.

## Where the keys actually are

| Copy | What holds it |
|------|----------------|
| Live node | The Postgres volume for `validator` and `participant-<MIGRATION_ID>` |
| Off the server | Ordered dumps under the operator's backup directory |

Both copies sign or can be restored into something that signs. Keep the
operator machine, the SSH key, the admin VPN account, and the backup directory
in the same trust boundary. Do not commit dumps, paste them into chat, or sync
them to a shared drive. A backup that has not been checksummed off the server
is not a backup; the rules are in
[validator-upgrades-and-recovery.md](validator-upgrades-and-recovery.md).

## If balances look wrong

Stop signing, then write to the foundation.

1. Stop every process that submits ledger commands: scheduled jobs, timers, and
   long-lived streams. Write down which units were running.
2. Stop the validator and keep the volumes. Never `docker compose down -v`.
3. Email `security@canton.foundation`. The foundation can coordinate with
   exchanges. Use `#validator-operators` when you need other operators, not as
   the incident report.
4. Compare the latest balance snapshot with the one before it, and with your
   own transfer log, for sends you did not make. Validator logs are the other
   half.

Unhosting parties and moving them to another validator requires a second node
that is already onboarded and that you do not believe is compromised. A fresh
onboarding is a new participant identity. It cannot take the existing parties.
Do not start that procedure until that second node exists.

## Baseline that belongs in the first deploy

The networking and monitoring pages are the practical baseline:

- Admin SSH, metrics, dashboards, and the identity provider bind to the admin
  network only.
- Wallet and ledger HTTP stay on loopback. Reach them through an SSH tunnel.
- Canton egress uses the allowlisted address, outbound.
- Docker log rotation is in place before the first container starts, so a full
  disk is not the outage.

See [validator-networking-and-access.md](validator-networking-and-access.md)
and [validator-monitoring-and-traffic.md](validator-monitoring-and-traffic.md).

## These are separate projects

The rest of the public hardening list is real, and none of it is an environment
variable on the Compose bundle. When the October 2026 note went out, the
foundation had not published a Compose runbook for moving an already-onboarded
node onto an external KMS. Treat each row as its own maintenance, after you
have read the current official page.

| Item | What it changes |
|------|-----------------|
| [Offline root namespace key](https://docs.canton.network/global-synchronizer/production-operations/key-management#offline-root-namespace-key) | The key that can authorize party hosting no longer sits on the node |
| [External KMS or HSM](https://docs.canton.network/global-synchronizer/production-operations/validator-security#migrating-an-existing-validator-to-use-an-external-kms) | Participant keys leave the Postgres volume |
| Balances on externally signed parties, plus a sweep | The key that holds funds is not the participant's hosted key |
| Covalidation | More than one organization has to agree |
| Just-in-time production access | Standing admin VPN accounts go away |

Leave `MIGRATION_ID` and `PARTY_HINT` alone while any of those is in progress.

## Related

- [Validator upgrades and recovery](validator-upgrades-and-recovery.md)
- [Validator networking and access](validator-networking-and-access.md)
- [Validator authentication and identity](validator-auth-and-identity.md)
- [Validator API calls](../development/validator-api-calls.md)
