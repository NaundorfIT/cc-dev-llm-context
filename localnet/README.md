# LocalNet kickstart

A one-command local Canton Network for development and integration testing. This
directory is a thin wrapper: it downloads and runs the **official
Splice LocalNet bundle** (Apache-2.0) and helps you deploy your own DAR and point
apps and tools at it. No third-party source is vendored into this repo.

LocalNet is fully self-contained — no Super Validator sponsor and no VPN. That is
what you want for local DAML and app testing. Connecting to the real **DevNet**
is a separate, sponsored path; see
[../context/infrastructure/validator-onboarding.md](../context/infrastructure/validator-onboarding.md).

## What you get

A local network that mirrors the Canton topology:

- Three validators: **Super Validator (sv)**, **app-provider**, **app-user**
- A local synchronizer (sequencer + mediator)
- Canton Coin wallet services and **wallet / scan / sv web UIs** behind NGINX
- PostgreSQL, and optionally PQS, Keycloak (OAuth2), and observability

## Prerequisites

- **Docker Desktop** with **>= 8 GB** memory allocated (disable nodes/observability to use less).
- `curl`, `tar`, and GNU `make` (preinstalled on macOS/Linux).
- Only needed to *build* a DAR (not to run LocalNet): the Daml toolchain (`dpm`, JDK 17+).

## Quickstart

```bash
cd localnet
cp .env.example .env     # optional: pin SPLICE_VERSION, toggle nodes, set bundle URL
make up                  # downloads the bundle on first run, then starts the stack
make ports               # show the endpoints
```

Bring it down or reset:

```bash
make down                # stop, keep data
make clean               # stop, remove volumes, delete the downloaded bundle
```

> First boot pulls images and initializes the network; it can take several
> minutes. Use `make status` and `make logs` to watch progress.

## Make targets

| Target | Description |
|--------|-------------|
| `make up` | Start LocalNet (fetches the bundle first if missing). |
| `make down` | Stop LocalNet, keep volumes. |
| `make restart` | `down` then `up`. |
| `make status` | Show running containers. |
| `make logs` | Tail logs. |
| `make ports` | Print the common endpoints. |
| `make deploy-dar DAR=path/to.dar` | Upload a DAR to a participant. |
| `make fetch` | Download/extract the Splice bundle only. |
| `make clean` | Stop, remove volumes, delete `.localnet/`. |

Configuration lives in `.env` (see [.env.example](.env.example)): `SPLICE_VERSION`
(the image tag), `SPLICE_BUNDLE_URL` (override the download), and the
`SV_PROFILE` / `APP_PROVIDER_PROFILE` / `APP_USER_PROFILE` toggles.

## Endpoints

LocalNet uses a prefix-suffix port pattern. The **prefix** identifies the
validator and the **suffix** identifies the service:

- Prefix: `2xxx` app-user, `3xxx` app-provider, `4xxx` sv
- Suffix: `901` Ledger API (gRPC), `902` Admin API, `903` Validator API, `975` JSON Ledger API, `900` HTTP healthcheck

| Service | app-user | app-provider |
|---------|----------|--------------|
| Ledger API (gRPC) | `localhost:2901` | `localhost:3901` |
| JSON Ledger API | `localhost:2975` | `localhost:3975` |
| Admin API | `localhost:2902` | `localhost:3902` |
| Validator API | `localhost:2903` | `localhost:3903` |

Web UIs: Wallet `http://wallet.localhost:3000`, Scan `http://scan.localhost:4000`,
SV `http://sv.localhost:4000`. Postgres on `localhost:5432`.

## Deploy your DAR

Build your DAR with `dpm`, then upload it to a participant (defaults to the
app-provider JSON API on `:3975`):

```bash
make deploy-dar DAR=/path/to/your-model.dar
```

This calls `POST /v2/packages?vetAllPackages=true` so the package is vetted on
upload. If your LocalNet profile enables OAuth2, pass a token:

```bash
AUTH_TOKEN=... make deploy-dar DAR=/path/to/your-model.dar
```

## Point an app at LocalNet

A JSON-API app (for example a non-custodial wallet) typically needs:

- `PARTICIPANT_JSON_RPC` -> `http://localhost:2975` (app-user) or `http://localhost:3975` (app-provider)
- `VALIDATOR_API` -> the validator API on `:2903` / `:3903`
- `REGISTRY_API` -> the token-standard registry served by the validator/scan
- Keycloak / OAuth2 issuer -> the LocalNet IAM when the auth profile is enabled

See [../context/development/local-dev-stack.md](../context/development/local-dev-stack.md)
for the full wiring and [../context/development/external-signing-and-interactive-submission.md](../context/development/external-signing-and-interactive-submission.md)
for the non-custodial write path.

## Attach a debugger

For ledger inspection, see
[../context/development/debugging-and-inspection.md](../context/development/debugging-and-inspection.md):
the Canton Console, Daml Shell + PQS, JSON API ACS queries, and external web
debuggers (CantonTrace-style) that connect to the LocalNet **gRPC** participant
endpoint (e.g. `localhost:2901`).

## Troubleshooting

- **Containers unhealthy / OOM:** raise Docker memory, or set `APP_USER_PROFILE=off`
  (and/or `SV_PROFILE=off`) in `.env` to run fewer nodes.
- **Download fails:** set `SPLICE_BUNDLE_URL` in `.env` to the official bundle
  link from https://docs.sync.global/app_dev/testing/localnet.html.
- **Layout changed upstream:** if a new Splice release relocates the compose
  files, adjust `LOCALNET_DIR` in the [Makefile](Makefile).

## Sources

- LocalNet (Canton Network Docs): https://docs.canton.network/sdks-tools/development-tools/localnet
- LocalNet (Splice): https://docs.sync.global/app_dev/testing/localnet.html
- cn-quickstart (richer full-stack reference): https://github.com/digital-asset/cn-quickstart
