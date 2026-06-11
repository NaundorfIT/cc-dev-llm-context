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

- **Docker Desktop** running with **>= 8 GB** memory allocated (disable
  nodes/observability to use less). Start Docker Desktop before `make up`; verify
  with `docker info | grep -i memory`.
- `curl`, `tar`, and GNU `make` (preinstalled on macOS/Linux).
- Only needed to *build* a DAR (not to run LocalNet): the Daml toolchain (`dpm`, JDK 17+).

## Quickstart

```bash
cd localnet
cp .env.example .env     # optional: pin SPLICE_VERSION, toggle nodes
make up                  # downloads the bundle on first run, then starts the stack
make ports               # show the endpoints
```

Bring it down or reset:

```bash
make down                # stop, keep data
make clean               # stop, remove volumes, delete the downloaded bundle
```

> First boot pulls images and initializes the network; it can take several
> minutes. Use `make status` and `make logs` to watch progress (both require a
> fetched bundle — run `make up` or `make fetch` first).

## JSON API auth (default)

The upstream LocalNet bundle enables **unsafe JWT auth by default**
(`unsafe-jwt-hmac-256`, secret `unsafe`, audience `https://canton.network.global`,
ledger user `ledger-api-user`). Only `GET /v2/version` works without a token;
all other JSON Ledger API calls (ledger end, packages, DAR upload, ACS queries)
return HTTP 401 unless you pass a bearer token.

Mint a token and export it for the session:

```bash
export AUTH_TOKEN=$(python3 -c "
import base64, hashlib, hmac, json
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
h = b64(json.dumps({'alg':'HS256','typ':'JWT'}).encode())
p = b64(json.dumps({'sub':'ledger-api-user','aud':'https://canton.network.global'}).encode())
s = b64(hmac.new(b'unsafe', f'{h}.{p}'.encode(), hashlib.sha256).digest())
print(f'{h}.{p}.{s}')
")
```

Verify:

```bash
curl -s -H "Authorization: Bearer $AUTH_TOKEN" http://localhost:3975/v2/state/ledger-end
```

If you enable the optional Keycloak/OAuth2 compose profile instead, use tokens
from that IAM provider. See
[../context/development/local-dev-stack.md](../context/development/local-dev-stack.md).

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

Web UIs (NGINX on 127.0.0.1):

| UI | URL |
|----|-----|
| app-user wallet | `http://wallet.localhost:2000` |
| app-provider wallet | `http://wallet.localhost:3000` |
| Scan | `http://scan.localhost:4000` |
| Super Validator | `http://sv.localhost:4000` |

Postgres on `localhost:5432`. If `*.localhost` does not resolve on your OS, add
`127.0.0.1 wallet.localhost scan.localhost sv.localhost` to `/etc/hosts`.

## Deploy your DAR

Build your DAR with `dpm`, then upload it to a participant (defaults to the
app-provider JSON API on `:3975`). **Set `AUTH_TOKEN` first** (see JSON API auth
above):

```bash
AUTH_TOKEN="$AUTH_TOKEN" make deploy-dar DAR=/path/to/your-model.dar
```

This calls `POST /v2/packages?vetAllPackages=true` so the package is vetted on
upload.

### Smoke test without `dpm`

The downloaded bundle ships sample DARs under `.localnet/splice-node/dars/`.
After `make up` and exporting `AUTH_TOKEN`:

```bash
AUTH_TOKEN="$AUTH_TOKEN" make deploy-dar DAR=.localnet/splice-node/dars/splice-token-test-trading-app-1.0.0.dar
curl -s -H "Authorization: Bearer $AUTH_TOKEN" http://localhost:3975/v2/packages
```

## Point an app at LocalNet

A JSON-API app (for example a non-custodial wallet) typically needs:

- `PARTICIPANT_JSON_RPC` -> `http://localhost:2975` (app-user) or `http://localhost:3975` (app-provider)
- `VALIDATOR_API` -> the validator API on `:2903` / `:3903`
- `REGISTRY_API` -> the token-standard registry served by the validator/scan
- Bearer token for JSON API calls (unsafe JWT above, or Keycloak when that profile is on)

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

- **Docker daemon not running:** start Docker Desktop, then `docker info` before `make up`.
- **Containers unhealthy / OOM:** raise Docker memory, or set `APP_USER_PROFILE=off`
  (and/or `SV_PROFILE=off`) in `.env` to run fewer nodes.
- **Download fails:** set `SPLICE_BUNDLE_URL` in `.env` to a release asset from
  https://github.com/digital-asset/decentralized-canton-sync/releases (archive
  name `${SPLICE_VERSION}_splice-node.tar.gz`). Pin `SPLICE_VERSION` to a published tag.
- **401 / "security-sensitive error" on JSON API:** mint and pass `AUTH_TOKEN` (see above).
- **`make status` / `make logs` before fetch:** run `make fetch` or `make up` first.
- **Layout changed upstream:** if a new Splice release relocates the compose
  files, adjust `LOCALNET_DIR` in the [Makefile](Makefile).

## Sources

- LocalNet (Canton Network Docs): https://docs.canton.network/sdks-tools/development-tools/localnet
- Splice release bundles: https://github.com/digital-asset/decentralized-canton-sync/releases
- cn-quickstart (richer full-stack reference): https://github.com/digital-asset/cn-quickstart
