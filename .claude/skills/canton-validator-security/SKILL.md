---
name: canton-validator-security
description: >-
  Secure a running Splice validator. Use when a Canton security notice, an
  eMudhra or Node.js advisory, key custody, Wallet Gateway, KMS, or a
  suspected balance discrepancy comes up. Covers the /info version gate,
  which process the gateway patch applies to, where keys live, and the
  incident stop.
---

# Canton validator security

Procedure and the 2026-10-27 version snapshot:
[validator-security.md](../../../context/infrastructure/validator-security.md).
An image bump still follows `canton-validator-upgrade`. A copy of the keys
follows `canton-validator-backup`.

## Rules

1. Run the Splice version `/info` advertises for that network. Re-read it the
   same day you execute. `"successor"` must be `null` for a version-only bump.
   A newer GitHub tag is not permission to upgrade.
2. Wallet Gateway fixes apply only when that container is running. On Compose,
   `start.sh -g` starts it, and from Splice 0.10.0 the gateway is on by
   default. Check `docker compose ps`. The Node.js fix is image `1.13.0` and
   can be recreated on its own, without upgrading the rest of the bundle.
   Enabling the gateway requires `LEDGER_API_AUTH_AUDIENCE` and
   `VALIDATOR_AUTH_AUDIENCE` to be equal.
3. The namespace root key and hosted-wallet keys are in the Postgres volume.
   Off-server dumps are a second copy. The path that reaches them is the
   operator machine, its SSH key, and the admin network. Closing another
   public port does not move those keys.
4. Do not commit backups, `.env`, or wallet credential files. Do not paste
   dumps into chat.
5. If balances look wrong: stop submitters, stop the validator, keep the
   volumes, and email `security@canton.foundation`. Use `#validator-operators`
   when you need other operators. Compare the latest balance snapshot with the
   previous one and with the transfer log.
6. Do not unhost or move parties unless a second validator is already
   onboarded and is not the machine you suspect. A fresh onboarding is a new
   identity and cannot take the existing parties.
7. Offline root keys, an external KMS or HSM, sweeping balances to externally
   signed parties, covalidation, and just-in-time production access are
   separate projects. None of them is an environment variable on the Compose
   bundle. Leave `MIGRATION_ID` and `PARTY_HINT` unchanged while they are in
   progress.

## Checks

```bash
curl -fsSL https://docs.global.canton.network.sync.global/info | jq '{sv,synchronizer}'
curl -fsSL https://docs.dev.global.canton.network.sync.global/info | jq '{sv,synchronizer}'
docker compose ps
```

In `docker compose ps`, look for a wallet-gateway service before you treat
`1.13.0` as something this node must install.

Confirm the admin plane matches
[validator-networking-and-access.md](../../../context/infrastructure/validator-networking-and-access.md):
SSH, metrics, dashboards, and the identity provider on the admin network;
wallet and ledger HTTP on loopback; Canton egress on the allowlisted address.

## Incident stop

```
Incident progress:
- [ ] Submitters stopped, and the list of units written down
- [ ] Validator stopped, volumes kept (no docker compose down -v)
- [ ] security@canton.foundation mailed
- [ ] Balance snapshot compared with the previous snapshot and the transfer log
- [ ] Logs checked for sends the operator did not make
```

## Read for depth

- [Validator security](../../../context/infrastructure/validator-security.md)
- [Validator networking and access](../../../context/infrastructure/validator-networking-and-access.md)
- [Validator authentication and identity](../../../context/infrastructure/validator-auth-and-identity.md)

## Official sources

- [Security advisory, 2026-10-26](https://forum.canton.network/t/security-advisory-for-validator-and-super-validator-operators/9421)
- [Wallet Gateway 1.13.0](https://forum.canton.network/t/critical-security-notice-upgrade-wallet-gateway-to-v1-13-0/9409)
- [Key management](https://docs.canton.network/global-synchronizer/production-operations/key-management)
- [Validator security](https://docs.canton.network/global-synchronizer/production-operations/validator-security)
