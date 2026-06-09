# Debugging and inspection

Ways to see what is happening on a Canton ledger while you develop — locally on
the [LocalNet stack](local-dev-stack.md) or against any participant you can
reach. Start with the built-in tooling; reach for a web debugger when you want a
visual ACS/transaction explorer. The linked docs are authoritative.

## Built-in tooling

- **Canton Console** — the embedded admin REPL for participant/sequencer/mediator
  nodes: inspect parties, packages, connections, and run administrative commands.
  Good for topology and node-level questions.
- **Daml Shell** — an interactive shell over PQS data; useful for exploring
  contracts and history without writing SQL. LocalNet/cn-quickstart ships a
  `daml-shell` module that connects to a participant's PQS Postgres by default.
- **PQS (Participant Query Store)** — SQL over Postgres for read-heavy querying,
  reporting, and reconciliation; the replacement for the removed JSON API v1
  query-by-attribute. See [daml-and-api-index.md](daml-and-api-index.md).

Daml Shell / packages how-to: https://docs.canton.network/appdev/modules/m5-manage-daml-packages

## Inspecting state over the JSON Ledger API

For quick, scriptable inspection you do not need extra tooling — query the
participant directly. Read the ledger end, then snapshot the ACS at that offset:

```bash
# Current offset
curl -s http://localhost:3975/v2/state/ledger-end

# Active contracts at that offset (set activeAtOffset from the call above)
curl -s http://localhost:3975/v2/state/active-contracts \
  -H "Content-Type: application/json" \
  -d '{
    "activeAtOffset": <offset>,
    "eventFormat": { "filtersForAnyParty": { "cumulative": [] }, "verbose": false }
  }'

# Known packages
curl -s http://localhost:3975/v2/packages
```

These ACS/offset conventions (the 3.4+ `eventFormat` + `activeAtOffset` change,
reading ledger end first, visibility per party) are covered in
[ledger-api-patterns.md](ledger-api-patterns.md). For decoding rejections and
deciding what to retry, see [canton-error-handling.md](canton-error-handling.md).

## Web debuggers (CantonTrace-style)

Open-source web debuggers exist for Canton/DAML that give you a visual
**ACS inspector** (filter by template/party, time-travel by offset), a
**transaction explorer** (tree view, per-party privacy projection), a
**real-time event stream**, a **package/template explorer**, and a **command
debugger** (build a command, dry-run/simulate, trace through the Daml engine, or
execute). **CantonTrace** is one such Apache-2.0 platform.

These tools connect to a participant's **gRPC Ledger API**, so against LocalNet
point them at the participant gRPC endpoint:

- app-user: `localhost:2901`
- app-provider: `localhost:3901`

A robust client of this kind binds to the participant's protobuf descriptors via
**gRPC server reflection** rather than shipping static `.proto` files, which
survives the field renames Canton makes across releases (see the version
resilience note in [ledger-api-patterns.md](ledger-api-patterns.md)). For
authenticated participants, supply the IAM/OAuth2 details.

> Run such tools as separate, external services pointed at your participant. This
> repo does not bundle a debugger; the [LocalNet wrapper](../../localnet/README.md)
> exposes the gRPC endpoints they need.

## Tracing a transaction's effects

When you need to understand *why* a submission did what it did:

- Use the **interactive submission** prepare step to obtain and inspect the
  transaction before executing it (the Wallet SDK can visualize a prepared
  transaction). See [external-signing-and-interactive-submission.md](external-signing-and-interactive-submission.md).
- Correlate related submissions with `workflowId` and W3C trace context, and read
  transactions in the ledger-effects shape to see the full per-party projection
  ([ledger-api-patterns.md](ledger-api-patterns.md)).

## Related

- [Local dev stack (LocalNet)](local-dev-stack.md)
- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [Canton error handling](canton-error-handling.md)
- [External signing and interactive submission](external-signing-and-interactive-submission.md)
- [DAML and API index](daml-and-api-index.md)
