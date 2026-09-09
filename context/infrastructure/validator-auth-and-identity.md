# Validator authentication and identity

Two things on a validator are easy to treat as configuration and then discover are
not: how callers authenticate, and which fields define the node's on-ledger
identity. The first has a DevNet shortcut that does not exist on MainNet, and the
second is immutable after onboarding.

## Two authentication modes

The validator's `ENABLE_AUTH` toggle selects between an unsafe development mode
and real OIDC.

| | `ENABLE_AUTH=off` | `ENABLE_AUTH=on` |
|---|---|---|
| Token source | Self-minted HS256 JWT with a shared secret | An OIDC provider you operate |
| Networks | DevNet and local development only | Required on MainNet |
| Setup cost | None | Provider, realm, and clients, before first start |

With auth off, any process that knows the shared secret can mint a token for any
subject. That is fine for a throwaway DevNet node and unacceptable anywhere else.

The important scheduling constraint: **a MainNet validator will not start without
its OIDC provider already configured.** This is not something to retrofit after
the node is running, because the validator resolves discovery and JWKS URLs at
startup and binds hosted users to provider identities. Stand up the provider,
create the clients, then start the validator.

A typical realm has one client per access pattern rather than one shared client:
a public client for browser access to the Ledger API, a client-credentials client
for backend service accounts, a password-grant client for scripted operations,
and an authorization-code client for the wallet UI.

## Two audiences, never mixed

Tokens are audience-scoped, and the validator exposes two API families with
different audiences.

| API | Audience |
|-----|----------|
| Ledger JSON API | `https://canton.network.global` |
| Wallet and validator API | Your validator's own API URL |

Presenting a Ledger API token to a wallet endpoint, or the reverse, produces
authorization failures that read like permission problems rather than audience
problems. If a caller has what looks like the right role and is still rejected,
check the `aud` claim before checking anything else.

## `userId` must equal the token subject

On `submit-and-wait` and related Ledger API calls, the `userId` in the request has
to match the JWT `sub` claim. It is not the OAuth `client_id`.

This bites specifically with client-credentials service accounts, where the
provider issues a UUID as the subject while the client is known by a
human-readable name. Passing the readable name fails. Read the subject out of the
token rather than assuming it matches anything in your configuration.

The same principle applies to the admin identities in the validator's own
configuration: settings such as the ledger and wallet admin users take the
provider's internal user identifier, which is generally a UUID, not the username.

## The identity provider is stateful

An OIDC provider deployed alongside a validator is not a stateless sidecar. Its
database holds the user records whose identifiers are referenced from the
validator database, so the two are bound together by opaque identifiers.

The practical consequence shows up during a host migration. Reinstalling the
provider onto a fresh database recreates users with the same names but new
identifiers, and every binding on the validator side breaks at once. The provider
database has to be dumped and restored alongside the validator databases. See
[validator-upgrades-and-recovery.md](validator-upgrades-and-recovery.md).

Two smaller points from the same territory:

- Bind the provider to the admin network only, never to the public egress
  address. See
  [validator-networking-and-access.md](validator-networking-and-access.md).
- Browser-facing and container-facing URLs may need to differ. Containers do not
  necessarily resolve the same names a browser does, so the discovery URL a user
  agent follows and the JWKS URL the validator fetches internally are separate
  settings for a reason.

## Identity fields fixed at onboarding

Three values define who the node is on the network, and two of them cannot be
changed afterwards.

| Field | Mutable | Notes |
|-------|---------|-------|
| `PARTY_HINT` | No | Becomes part of the validator operator party id |
| `MIGRATION_ID` | No, except during a coordinated protocol migration | Also names the participant database, `participant-<id>` |
| `ONBOARDING_SECRET` | One-time | Cleared after successful onboarding |

Choose `PARTY_HINT` deliberately. A structured convention such as
`<organization>-<function>-<number>` keeps party ids readable when a single
operator runs several. It is visible on-ledger and permanent.

The onboarding secret is single-use and time-limited: roughly an hour when
self-generated on DevNet, longer when issued by a sponsor for TestNet or MainNet.
Clear it from the environment once onboarding succeeds. Restarts of an
already-onboarded node run with it empty, and so does a restore from backup,
because the identity lives in the databases rather than in the secret.

## Party allocation

Parties are allocated through the Ledger API with a `partyIdHint`, which the
participant expands into a full party id by appending a fingerprint suffix. The
hint is your choice; the suffix is not.

One operational caution: do not enumerate the global party list to find a party.
That endpoint returns every party the participant knows about, which on MainNet is
a very large number. Keep a local record of the parties you allocated, or look up
the full party id directly.

## Related

- [Validator node setup reference](validator-node-setup.md)
- [Validator onboarding](validator-onboarding.md)
- [Validator networking and access](validator-networking-and-access.md)
- [Validator upgrades and recovery](validator-upgrades-and-recovery.md)
- [Ledger API v2 client patterns](../development/ledger-api-patterns.md)
- [External signing and interactive submission](../development/external-signing-and-interactive-submission.md)
