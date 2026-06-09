# Local dev stack (LocalNet)

How to stand up a full Canton Network on your machine so you can deploy your own
DAML and test apps (wallets, integrations) end to end, without a Super Validator
sponsor or VPN. This page is the conceptual guide; the runnable wrapper lives in
[`localnet/`](../../localnet/README.md). The linked official docs are the source
of truth, and ports/layout can change across Splice releases.

## LocalNet vs DevNet

- **LocalNet** — a self-contained local network (Docker Compose) that mirrors the
  Canton topology. No sponsor, no VPN, no real Canton Coin. This is the right
  target for local DAML and app testing.
- **DevNet** — the live development-staging network connected to the
  decentralized Global Synchronizer. It is **not** local: it requires a
  whitelisted Super Validator sponsor and VPN access. See
  [validator-onboarding.md](../infrastructure/validator-onboarding.md) for that
  path.

LocalNet docs: https://docs.canton.network/sdks-tools/development-tools/localnet
and https://docs.sync.global/app_dev/testing/localnet.html

## Topology

LocalNet runs three validators, each playing a Splice role, plus shared
infrastructure:

- **sv** — Super Validator: provides the local Global Synchronizer.
- **app-provider** — the validator operating an application.
- **app-user** — a validator for an end user of that application.
- A local **synchronizer** (sequencer + mediator), **PostgreSQL**, Canton Coin
  **wallet** services, and **wallet / scan / sv** web UIs behind NGINX.
- Optional modules: **PQS**, **Keycloak** (OAuth2), and observability
  (Grafana/Prometheus/Loki).

You can disable nodes/modules (profiles) to reduce memory; Docker Desktop should
have at least 8 GB.

## Port map

LocalNet uses a prefix-suffix port pattern.

- Prefix (validator): `2xxx` app-user, `3xxx` app-provider, `4xxx` sv.
- Suffix (service): `901` Ledger API (gRPC), `902` Admin API, `903` Validator
  API, `975` JSON Ledger API, `900` HTTP healthcheck.

| Endpoint | app-user | app-provider |
|----------|----------|--------------|
| Ledger API (gRPC) | `localhost:2901` | `localhost:3901` |
| JSON Ledger API | `localhost:2975` | `localhost:3975` |
| Admin API | `localhost:2902` | `localhost:3902` |
| Validator API | `localhost:2903` | `localhost:3903` |

Web UIs: Wallet `http://wallet.localhost:3000`, Scan `http://scan.localhost:4000`,
SV `http://sv.localhost:4000`. PostgreSQL on `localhost:5432`.

## Workflow

From [`localnet/`](../../localnet/README.md):

1. `cp .env.example .env` and optionally pin `SPLICE_VERSION` / toggle nodes.
2. `make up` — downloads the official Splice LocalNet bundle on first run, then
   starts the stack (`make status` / `make logs` to watch first boot).
3. Build your package with `dpm`, then `make deploy-dar DAR=path/to/your.dar`.
4. Point your app and tools at the endpoints above.
5. `make down` to stop, `make clean` to reset.

## Deploying a DAR

Upload a built `.dar` to a participant via the JSON Ledger API v2:

```bash
curl -X POST "http://localhost:3975/v2/packages?vetAllPackages=true" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @path/to/your.dar
```

`vetAllPackages=true` vets the package on upload so it is immediately usable. If
the OAuth2 profile is enabled, add `-H "Authorization: Bearer <token>"`. Verify
with `GET /v2/packages`.

Package management how-to: https://docs.canton.network/appdev/modules/m5-manage-daml-packages

## Wiring an app (wallet-style example)

A JSON-API application typically needs to know:

- **Participant JSON API** — `http://localhost:2975` (app-user) or
  `http://localhost:3975` (app-provider).
- **Validator API** — `:2903` / `:3903`, for validator-scoped operations.
- **Token-standard registry** — served by the validator/scan for CIP-56 assets;
  see [cip-56-integration.md](cip-56-integration.md).
- **OAuth2 / Keycloak issuer** — the LocalNet IAM when the auth profile is on;
  the submitting `user_id` must match the token subject (see
  [external-signing-and-interactive-submission.md](external-signing-and-interactive-submission.md)).

For client conventions (bootstrap, ACS, errors) see
[ledger-api-patterns.md](ledger-api-patterns.md) and
[canton-error-handling.md](canton-error-handling.md).

## Richer alternative: cn-quickstart

If you want a full-stack reference app (Daml + Java backend + React frontend)
bundled with LocalNet and an interactive setup, use
[cn-quickstart](https://github.com/digital-asset/cn-quickstart)
(`make setup && make build && make start`). The [`localnet/`](../../localnet/README.md)
wrapper here is intentionally leaner: it brings up the network so you can test
*your own* DAML and apps.

## Related

- [LocalNet wrapper](../../localnet/README.md)
- [Getting started build path](getting-started.md)
- [Debugging and inspection](debugging-and-inspection.md)
- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [Validator onboarding (DevNet and up)](../infrastructure/validator-onboarding.md)
