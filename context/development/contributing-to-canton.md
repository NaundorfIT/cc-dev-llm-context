# Contributing to Canton

Two practical ways to contribute ecosystem value beyond building your own app:
apply for **funded work** through the Canton Development Fund, or contribute
**open source** to Splice (often by tackling a related set of GitHub issues).

## Canton Development Fund

Funded ecosystem work goes through
[canton-foundation/canton-dev-fund](https://github.com/canton-foundation/canton-dev-fund),
governed by **[CIP-0082](https://github.com/canton-foundation/cips/blob/main/cip-0082/cip-0082.md)**
(5% of future CC emissions — no premine/treasury) and
**[CIP-0100](https://github.com/canton-foundation/cips/blob/main/cip-0100/cip-0100.md)**
(review process, Tech & Ops Committee, Voting Group approval, milestone CC
payments).

Full detail: [canton-development-fund.md](../business/canton-development-fund.md).

## Contributing to Splice (open source)

Splice is the reference implementation behind much of Canton Network operations.
Working from its issue backlog is a direct way to contribute, especially when you
group related issues into one coherent effort.

### Where to look

- Issue tracker (primary collaboration surface):
  [canton-network/splice/issues](https://github.com/canton-network/splice/issues)
- Upstream / mirror:
  [hyperledger-labs/splice](https://github.com/hyperledger-labs/splice)
- Operator context: [splice-validator-ops.md](../infrastructure/splice-validator-ops.md)

The contributor community is growing. Maintainer engagement today is centered
on a small set of organizations (including Digital Asset, Obsidian, IEU, and
Avro Digital), but external contributors are welcome when they coordinate early.

### Example project idea: RFC 7523 in the Splice Validator

[JWT Bearer Token Profiles for OAuth 2.0 (RFC 7523)](https://datatracker.ietf.org/doc/html/rfc7523)
defines how a JWT can act as an OAuth 2.0 bearer token. Adding support in the
Splice Validator (for example for API or operator authentication flows) would be
a well-scoped, standards-based improvement. Whether it belongs in a Development
Fund proposal or as a pure open-source contribution depends on scope and
milestones; either path below can fit.

### Recommended process (Splice-focused work)

Use this sequence whether you target RFC 7523 or a **basket of related Splice
issues**:

1. **Prepare a proposal** that describes either a single initiative (such as RFC
   7523 support) or a coherent group of issues you will address together,
   including scope, approach, and deliverables.
2. **Bring it to maintainers** in the Splice collaboration channel
   `#splice-contributions-external` (Slack). Share the draft publicly and ask
   for alignment before you invest heavily in implementation.
3. **Gather feedback** in that channel, iterate on scope and design based on
   maintainer and community input.
4. **Update and submit**: land the work via the normal GitHub flow (issues, PRs)
   on Splice, and—if the work needs funding, milestones, or formal ecosystem
   sponsorship—submit or adapt a Development Fund proposal in parallel.

Picking unrelated one-off issues is possible, but maintainers are more likely to
engage when you present a **themed batch** with a clear outcome.

### When to use the Development Fund vs Splice-only

| Situation | Splice OSS path | Development Fund |
|-----------|-----------------|------------------|
| Bug fixes, small features, protocol-adjacent hardening | Issues + PRs after channel buy-in | Usually not needed |
| Multi-month work, audits, shared tooling, milestones needing CC | Can still start in Splice channel | Proposal PR to canton-dev-fund |
| RFC 7523 or similar cross-cutting validator feature | Prototype in Splice; fund if scope needs sustained effort | Proposal if milestones and CC budget are required |

## Related

- [Getting started](getting-started.md)
- [DAML and API index](daml-and-api-index.md)
- [Ecosystem and roles](../business/ecosystem-and-roles.md)
- [Canton Development Fund](../business/canton-development-fund.md)
- [CIP index](../reference/cip-index.md)
- [Substantive CIPs for builders](../reference/substantive-cips.md)
- [Canton CIPs](https://github.com/canton-foundation/cips)
