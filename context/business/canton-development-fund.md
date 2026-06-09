# Canton Development Fund

The [Canton Development Fund](https://github.com/canton-foundation/canton-dev-fund)
funds open work that strengthens the Canton ecosystem: protocol R&D, developer
tools and SDKs, security reviews and hardening, reference implementations,
critical shared infrastructure, and early DeFi liquidity seeding where it unlocks
utility. It does **not** fund purely private or proprietary products.

Governance is defined in public CIPs, not in this repo:

- **[CIP-0082](https://github.com/canton-foundation/cips/blob/main/cip-0082/cip-0082.md)**
  — allocates **5% of future Canton Coin emissions** to the Development Fund.
  Unlike many networks, Canton has **no premine or treasury**; funding comes from
  future network rewards for a durable, predictable source.
- **[CIP-0100](https://github.com/canton-foundation/cips/blob/main/cip-0100/cip-0100.md)**
  — defines how the fund is governed and reviewed.

The Canton Foundation acts as a **neutral facilitator**. Funding decisions are
made by the **Tech & Ops Committee**, with final approval by the **Voting Group**.

## Program structure

- **Quarterly** funding allocation.
- **Milestone-based** payments in **CC**, released after acceptance.
- Transparent, community-visible proposals via GitHub pull requests.
- Projects longer than six months may be re-evaluated for price volatility.
- Funding can be **paused or stopped** if milestones are not met.

## Governance bodies (CIP-0100)

| Body | Role |
|------|------|
| Voting Group | 5 voting members + 2 alternates; final approval |
| Security Subcommittee | Reviews security-sensitive proposals |
| Core Contributors Group | Technical input and prioritization |
| Operations Subcommittee | Reporting, communications, coordination |

## Who can submit

- Canton Foundation members, contributor organizations, or external teams and
  individuals.
- **External contributors need a Champion** to support the proposal.
- Evaluated on **impact, quality, feasibility, and alignment** — not on who
  submits.
- The committee reviews **at most three proposals per week** from one organization
  or champion.

## How to submit

All proposals go through a pull request on
[canton-foundation/canton-dev-fund](https://github.com/canton-foundation/canton-dev-fund).

1. Read the
   [Proposal Review Process](https://github.com/canton-foundation/canton-dev-fund/blob/main/Development%20Fund%20Proposal%20Review%20Process.md),
   the [sig directory](https://github.com/canton-foundation/canton-dev-fund/blob/main/sig-directory.md),
   and the PR template at `.github/pull_request_template.md`.
2. Fork the repo, create a branch, add `proposals/<project-name>.md` using the
   template structure.
3. Open a PR titled `Proposal: <Project Name>`.

The template expects:

- Objective and scope
- Technical approach and architectural alignment
- Milestones and deliverables
- Acceptance criteria
- Funding request and milestone breakdown

Proposal documents in the repo are **CC0-1.0** (public domain). Software or
artifacts delivered under a proposal should specify their own license (commonly
Apache-2.0) in the proposal or delivery repo.

## What makes a strong proposal

- A clear problem and **ecosystem-wide** value (common good, not one operator only).
- Deliverables that can be **objectively verified**.
- Realistic timelines and scope.
- **Open-source or reusable** outputs where appropriate.
- Evidence of technical capability.
- An adoption or distribution plan.

The Tech & Ops Committee may publish **Requests for Proposals (RFPs)** for
strategic needs; watch the dev-fund repo and announcements.

## Relationship to Splice contributions

Many fundable items also touch
[canton-network/splice](https://github.com/canton-network/splice/issues). A typical
path: align with maintainers in `#splice-contributions-external`, then submit a
Development Fund proposal if the work needs milestone funding in CC. See
[contributing-to-canton.md](../development/contributing-to-canton.md).

## Contacts

- **Private / submission questions:** dev-fund@canton.foundation
- **Community discussion:** grants-discuss@lists.sync.global

## Related

- [Contributing to Canton](../development/contributing-to-canton.md)
- [CIP index — governance section](../reference/cip-index.md)
- [Substantive CIPs for builders](../reference/substantive-cips.md)
