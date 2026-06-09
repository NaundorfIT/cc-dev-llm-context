# Canton error handling

Canton returns **structured** errors over gRPC: every error carries a
machine-readable code, a **category** that maps to exactly one gRPC status code,
and a human-readable description. Building your retry/escalation logic on the
category (not on string matching) is the supported approach. The official
inventory is the source of truth and evolves across releases.

- Error codes and categories (reference): https://docs.canton.network/appdev/reference/error-codes
- Error handling guide: https://docs.canton.network/appdev/modules/m7-error-handling
- Operate reference (3.4): https://docs.digitalasset.com/operate/3.4/reference/error_codes.html
- Common Ledger API errors: https://docs.canton.network/appdev/troubleshooting-guide/ledger-api-errors

## Anatomy of an error

A failed request carries gRPC `Status` details you should parse:

- **`ErrorInfo`** — the error-id in `reason` and the category id in
  `metadata["category"]`.
- **`RequestInfo`** — the full correlation id (use it in logs and support).
- **`RetryInfo`** (optional) — a recommended retry interval when retryable.
- **`ResourceInfo`** (optional) — the resource the failure is about (contract,
  contract key, package, party, synchronizer, template).

Recommended handling: read the error-id and category from `ErrorInfo`, use the
gRPC code plus category to decide retry behaviour, honour `RetryInfo` when
present, and surface the correlation id.

## Categories drive retry strategy

Errors group into numbered categories; each maps to one gRPC status code and a
recommended strategy. The practical buckets:

| Bucket | Categories | gRPC (examples) | What to do |
|--------|------------|-----------------|------------|
| **Transient — retry automatically** | 1, 2, 3 | `UNAVAILABLE`, `ABORTED`, `DEADLINE_EXCEEDED` | Cat 1: retry quickly (load balancer ok). Cat 2 (contention): exponential backoff, do **not** retry in the load balancer. Cat 3: limited retries **with command deduplication**. |
| **Fix the request, then retry** | 6, 7, 8 | `UNAUTHENTICATED`, `PERMISSION_DENIED`, `INVALID_ARGUMENT` | Token missing/invalid, missing rights, or malformed request. Fix config/payload; retrying unchanged will fail identically. |
| **State-dependent** | 9–12 | varies | Depends on ledger/contract state; apply application-specific logic (re-read state, rebuild the command). |
| **Do not retry** | 4, 5, 14 | varies | Internal assumption violated / security alerts; escalate to the operator. |

Exact category numbering and names can shift; always confirm against the
version-pinned inventory above.

## Common errors and what they mean

- **`DEADLINE_EXCEEDED` (timeout)** — a timeout does **not** mean the command
  failed. It may have committed but the response was late. Before retrying,
  check the **completion stream** or query **PQS** for the outcome, and rely on
  command deduplication so you do not double-submit.
- **Contention** — when commands compete for the same contract, one wins and the
  others fail (the contract was already archived/consumed). Re-read the current
  state, rebuild the command against a live contract, and resubmit with a new
  command id; back off to reduce repeat collisions.
- **`PACKAGE_NOT_FOUND` / `UNRESOLVED_PACKAGE_NAME`** — the participant lacks the
  DAR or the package is not vetted, or a package *name* could not be resolved to
  an id. Upload/vet the DAR and confirm it appears in the package list; use
  preferred-packages discovery and disclosed contracts (see
  [external signing and interactive submission](external-signing-and-interactive-submission.md)).
- **`PARTY_NOT_KNOWN` / authorization** — the party is not hosted/known where you
  submitted, or the user lacks `actAs`/`readAs`. Authorization will not change on
  retry; fix the rights or the target node.
- **Insufficient traffic** — the submission exceeded the available traffic
  budget. This is not a command bug; top up / plan traffic (see
  [traffic operations](../infrastructure/traffic-operations.md) and
  [traffic-cost planning](traffic-cost-planning.md)). Retrying without budget
  fails again.

## Related

- [Ledger API v2 client patterns](ledger-api-patterns.md)
- [External signing and interactive submission](external-signing-and-interactive-submission.md)
- [DAML and API index](daml-and-api-index.md)
- [Traffic-cost planning](traffic-cost-planning.md)
