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
(release bundles: https://github.com/digital-asset/decentralized-canton-sync/releases)

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
have at least 8 GB and be running before `make up`.

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

Web UIs:

| UI | URL |
|----|-----|
| app-user wallet | `http://wallet.localhost:2000` |
| app-provider wallet | `http://wallet.localhost:3000` |
| Scan | `http://scan.localhost:4000` |
| Super Validator | `http://sv.localhost:4000` |

PostgreSQL on `localhost:5432`.

## JSON API auth

The default LocalNet bundle ships with **unsafe JWT auth enabled** on participant
JSON APIs (`unsafe-jwt-hmac-256`, HMAC secret `unsafe`, audience
`https://canton.network.global`, ledger user `ledger-api-user`). Only
`GET /v2/version` is anonymous; ledger-end, packages, ACS, and DAR upload all
require `Authorization: Bearer <token>`.

Mint a token for local scripting (also used by `make deploy-dar`):

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

A bare `curl` without this header returns a generic 401 ("security-sensitive
error") — not a stack failure. Optional Keycloak/OAuth2 compose profiles replace
this with real IAM tokens.

## Workflow

From [`localnet/`](../../localnet/README.md):

1. Start Docker Desktop; `cp .env.example .env` and optionally pin
   `SPLICE_VERSION` / toggle nodes.
2. `make up` — downloads the official Splice LocalNet bundle on first run, then
   starts the stack (`make status` / `make logs` to watch first boot).
3. Export `AUTH_TOKEN` (see above).
4. Build your package with `dpm`, then
   `AUTH_TOKEN="$AUTH_TOKEN" make deploy-dar DAR=path/to/your.dar`.
   Without `dpm`, smoke-test with a bundle DAR:
   `DAR=.localnet/splice-node/dars/splice-token-test-trading-app-1.0.0.dar`.
5. Point your app and tools at the endpoints above (pass the bearer token on
   JSON API calls).
6. `make down` to stop, `make clean` to reset.

For a full CIP-56 write-path walkthrough (allocation lock, registry factory,
disclosed contracts, stale UTXOs), run the bundled sample app then read the
learnings doc:

```bash
cd examples/amulet-lock
make build && make deploy && make serve   # http://localhost:8800
```

- [examples/amulet-lock/README.md](../../examples/amulet-lock/README.md) — quickstart, layout, troubleshooting
- [allocation lock learnings](cip-56-allocation-lock-learnings.md) — registry APIs, DAML setup, error cheat sheet
- [examples/README.md](../../examples/README.md) — examples index

## Deploying a DAR

Upload a built `.dar` to a participant via the JSON Ledger API v2:

```bash
curl -X POST "http://localhost:3975/v2/packages?vetAllPackages=true" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  --data-binary @path/to/your.dar
```

`vetAllPackages=true` vets the package on upload so it is immediately usable.
Verify with `GET /v2/packages` (same bearer token).

On LocalNet, **package upload** typically needs a JWT for **`ledger-api-user`**
(participant admin), while application commands use the wallet ledger user (for
example `app-user`). The [amulet-lock example](../../examples/amulet-lock/Makefile)
`make deploy` target follows this split.

Package management how-to: https://docs.canton.network/appdev/modules/m5-manage-daml-packages

## Wiring an app (wallet-style example)

A JSON-API application typically needs to know:

- **Participant JSON API** — `http://localhost:2975` (app-user) or
  `http://localhost:3975` (app-provider).
- **Validator API** — `:2903` / `:3903`, for validator-scoped operations.
- **Token-standard registry** — served by the validator/scan for CIP-56 assets;
  see [cip-56-integration.md](cip-56-integration.md).
- **JSON API bearer token** — unsafe JWT above by default; or Keycloak issuer
  when the auth profile is on (submitting `user_id` must match the token
  subject; see
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

- [CIP-56 allocation lock learnings](cip-56-allocation-lock-learnings.md)
- [Amulet lock sample app](../../examples/amulet-lock/)
- [Examples index](../../examples/README.md)
- [LocalNet wrapper](../../localnet/README.md)
- [Getting started build path](getting-started.md)
- [Debugging and inspection](debugging-and-inspection.md)
- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [Validator onboarding (DevNet and up)](../infrastructure/validator-onboarding.md)
