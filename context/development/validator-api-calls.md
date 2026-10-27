# Validator API calls

Calls that fail on a running Splice validator for reasons that do not show up
in the happy-path examples: the wrong nginx host, the wrong token subject, a
receiver who has not accepted Canton Coin, and a DAR the proxy refuses because
of its size.

The Ledger API patterns page covers bootstrap, ACS, and `paidTrafficCost`. This
page is the validator-shaped layer around those calls.

- JSON API: https://docs.canton.network/reference/json-api-reference
- Validator API: https://docs.canton.network/sdks-tools/api-reference/splice-validator-api
- Wallet API: https://docs.sync.global/app_dev/validator_api/index.html

## Host header on Docker Compose

The bundled nginx routes by `Host`, not by a path prefix on one name.

| `Host` | API |
|--------|-----|
| `json-ledger-api.localhost` | Ledger JSON API v2 (`/v2/...`) |
| `wallet.localhost` | Wallet and validator REST (`/api/validator/v0/...`) |

`participant.localhost` and `validator.localhost` are not those two APIs. A 404
on either name is the wrong host.

From a workstation, an SSH tunnel maps each name to its own high local port.
macOS will not bind TCP port 80 without root, so the tunnel target is not
`:80`. See
[validator-networking-and-access.md](../infrastructure/validator-networking-and-access.md).

## Which token

Audiences are in
[validator-auth-and-identity.md](../infrastructure/validator-auth-and-identity.md).
The subject has to match the call as well.

| Call | Subject | Audience |
|------|---------|----------|
| Ledger submit, ACS, parties, `POST /v2/packages` | Ledger admin user. With auth off that is `ledger-api-user`. | `https://canton.network.global` |
| Wallet actions for a hosted user (tap, that user's preapproval, user status) | `administrator` with auth off, or the hosted username | The validator API audience. Stock Compose uses `https://validator.example.com`. |
| Validator admin (create users, external-party setup, scan proxy) | The ledger admin user, carrying the **wallet** audience | Same wallet audience. An `administrator` token here returns 403. |

On `submit-and-wait`, `userId` in the body is the JWT `sub`. With OIDC
client-credentials that is often a UUID, not the client id and not the
username.

`POST /api/validator/v0/wallet/buy-traffic-requests` is an operator-wallet
call. The participant-admin service account has no wallet and the response is
`No wallet found for user`. Use the operator wallet user configured for the
validator, not the ledger admin client.

## Parties and preapproval

Do not find a party by listing `GET /v2/parties`. That list is global and, on
MainNet, huge. Persist the full party id (`hint::fingerprint`) when you
allocate it, and look that id up directly. A truncated id fails later as
`UNKNOWN_INFORMEES`.

Canton Coin receivers agree to hold CC by creating a `TransferPreapproval`.
The transfer factory reports the consequence in `transferKind`:

| Scan can see a preapproval for the receiver | `transferKind` | What the sender does |
|---------------------------------------------|----------------|----------------------|
| Yes | `direct` | One submit |
| No | `offer` | The receiver accepts in a second step |

After you create a preapproval, Scan's index lags, on the order of half a
minute. Poll the scan preapproval-by-party endpoint before choosing
`transferKind`. The validator scan-proxy is the fallback while the global index
catches up. A 404 on the accept choice immediately after an offer is that lag,
not a missing contract on the participant.

An empty `instrumentAllowances` list on the create choice is a blanket
preapproval for that instrument admin. A non-empty list restricts which
instruments the receiver will accept.

## DAR upload

`POST /v2/packages?vetAllPackages=true` takes the raw DAR bytes with
`Content-Type: application/octet-stream` and the ledger admin token.

The stock nginx `client_max_body_size` is 1 MB. A utility-registry DAR is about
2 MB and the upload returns HTTP 413. Raise the limit on the
`json-ledger-api` server block (10 MB is enough for that family) and restart
the nginx container. A reload does not always pick up a bind-mounted config.
Confirm the package id appears in `GET /v2/packages` before you create a
preapproval or a transfer that needs it.

The DSO Scan registry serves Amulet. Other CIP-56 instruments resolve through
their own registrar, for example the Utilities registry. Sending a registry
contract id to the Amulet scan route returns that the amulet transfer
instruction was not found. The registrar URL shape is in
[CIP-56 integration](cip-56-integration.md).

## Traffic on the response

`paidTrafficCost` on
`POST /v2/commands/submit-and-wait-for-transaction` is the cost of that
submission. The participant traffic gauge is shared by every command on the
node, so a before/after diff attributes other traffic to your call. Read the
field. The two sequencer pools (base rate and purchased) are described in
[traffic operations](../infrastructure/traffic-operations.md).

## Related

- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [CIP-56 integration](cip-56-integration.md)
- [Canton error handling](canton-error-handling.md)
- [Validator authentication and identity](../infrastructure/validator-auth-and-identity.md)
- [Traffic-cost planning](traffic-cost-planning.md)
