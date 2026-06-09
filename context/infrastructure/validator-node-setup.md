# Validator node setup reference (DevNet and TestNet)

A practical reference for standing up a Canton Network / Splice **validator node**
on DevNet or TestNet (Canton 3.4.x / Splice 0.6.x). This complements
[validator-onboarding.md](validator-onboarding.md) (who can apply and how) and
[splice-validator-ops.md](splice-validator-ops.md) (link index). Treat the linked
official docs as authoritative: versions, ports, and Helm keys change across
releases, and the doc sites are consolidating into
[docs.canton.network](https://docs.canton.network).

> This is for a real network-connected validator. For purely local DAML/app
> testing you do not need this — use the self-contained
> [local dev stack (LocalNet)](../development/local-dev-stack.md) instead.

## Choosing a deployment model

Splice supports two deployment methods:

- **Kubernetes / Helm — recommended for production.** The only path that supports
  external KMS and the newer fault-tolerant scan/sequencer options. Use this for
  any node meant to persist beyond local experimentation.
- **Docker Compose — easier to start (e.g. a single VM/laptop), with documented
  security and reliability limitations.** Good for learning DevNet. KMS and the
  custom `scanClient`/`synchronizer` fault-tolerance options are not supported
  here.

A sensible progression: learn on DevNet with Docker Compose, then rebuild on
Kubernetes/Helm for anything persistent.

- Validator index: https://docs.sync.global/validator_operator/index.html
- Docker Compose: https://docs.sync.global/validator_operator/validator_compose.html
- Helm: https://docs.sync.global/validator_operator/validator_helm.html

## Hardware (reference values)

From the official validator hardware page. CPU/Memory cover the combined
validator-app + Canton participant containers; PostgreSQL is separate. These are
starting points — monitor CPU/memory/disk and adjust.

| Usage | CPUs | Memory | DB CPUs | DB Memory | DB size |
|-------|------|--------|---------|-----------|---------|
| Experiments (laptop / minimal VM) | 1 | 6 GB | 1 | 1 GB | 1 GB |
| Production, little activity | 2 | 8 GB | 2 | 4 GB | 10 GB |
| Production (app provider, moderate activity) | 2 | 16 GB | 2 | 4 GB | 100 GB |

Components are sensitive to database latency; co-locate a managed DB (CloudSQL/RDS)
in the same region/zone as the cluster. No specific latency SLA or mandated
PostgreSQL version is published.

- Hardware: https://docs.sync.global/validator_operator/validator_hardware_requirements.html

## Software dependencies

- For Helm: `kubectl` >= v1.26.1, `helm` >= v3.11.1, and a Kubernetes cluster with
  admin (namespace) access.
- PostgreSQL: in-cluster via the `splice-postgres` chart, or cloud-hosted.
- An OIDC provider supporting OAuth 2.0 Authorization Code flow (user UIs) and
  Client Credentials flow (backend → participant M2M auth) — e.g. Auth0, Keycloak,
  Okta, Azure AD.
- For the reference ingress: cert-manager and Istio in the cluster.
- The release bundle `0.6.x_splice-node.tar.gz` (sample Helm values, Grafana
  dashboards, and the Docker Compose definitions) from
  [decentralized-canton-sync releases](https://github.com/digital-asset/decentralized-canton-sync/releases).

## Prerequisites and onboarding

The hard prerequisites are nearly identical across DevNet and TestNet:

- **Static egress IP (mandatory).** One distinct IP per network; it must differ
  from the IP used for any other network. Dynamic/NAT'd IPs do not work unless
  tunneled through an SV-operated VPN (DevNet/laptop only).
- **SV sponsor** adds your egress IP to the SV allowlist. Propagation typically
  takes a few days ("usually 2-7 days").
- **One-time onboarding secret** (see DevNet vs TestNet below).
- **OIDC provider** and **PostgreSQL** as above.
- **Network parameters:** `MIGRATION_ID` (frozen per network; published on the
  public SV network page), `SPONSOR_SV_URL` (the SV **app** URL, which starts with
  `sv.` — not the Scan URL), and a trusted **Scan URL** (starts with `scan.`).

Validate allowlisting by querying the SV Scan version endpoints **from the same
egress IP** you will deploy from.

- Onboarding: https://docs.sync.global/validator_operator/validator_onboarding.html
- Networking (ingress/egress): https://docs.sync.global/validator_operator/validator_networking.html

> Identifying a sponsor and SV URLs: use the Foundation's current public Super
> Validator list. This repo never names specific Super Validators or hardcodes
> their hostnames; treat `SPONSOR_SV_URL`/`SCAN_URL` as values you obtain from
> your sponsor.

## DevNet vs TestNet

| | DevNet | TestNet |
|---|--------|---------|
| Who can join | Any node (still needs egress IP allowlisting) | Requires MainNet approval by the GSF Tokenomics Committee first |
| Onboarding secret | **Self-service** via SV API; self-generated secrets valid ~1 hour | Issued manually by the sponsor; valid 48 hours; one-time use |
| Funding traffic | Validator auto-taps coin; no manual grant | Needs an initial coin grant to the validator party before auto top-up works |
| Resets | ~every 3 months | ~every 3-6 months, offset so it never resets at the same time as DevNet |
| Upgrade order | Upgraded first | After DevNet, before MainNet |

DevNet is the no-approval-form path for getting hands-on: it is open to any node
and the onboarding secret is self-serviceable. You still need the egress IP on the
allowlist (via a sponsor) and the network parameters above.

Self-generate a DevNet onboarding secret from the SV app URL (not Scan):

```bash
curl -X POST "${SPONSOR_SV_URL}/api/sv/v0/devnet/onboard/validator/prepare"
```

- Networks and use cases: https://docs.sync.global/app_dev/testing/networks_and_usecases.html
- Network resets: https://docs.sync.global/validator_operator/validator_network_resets.html
- TestNet/MainNet request: https://sync.global/validator-request/

## Docker Compose setup (DevNet starting path)

From the release bundle, `cd splice-node/docker-compose/validator`, set
`export IMAGE_TAG=0.6.x`, then:

```bash
./start.sh -s "<SPONSOR_SV_URL>" -c "<SCAN_URL>" -o "<ONBOARDING_SECRET>" \
           -p "<party_hint>" -m "<MIGRATION_ID>" -w [-a]
```

- `-w` enables the wallet UI; `-a` enables authentication.
- **Party hint** format `<organization>-<function>-<enumerator>` (e.g.
  `myCompany-myWallet-1`). It is immutable and becomes part of the validator
  operator party ID — choose carefully.
- `./stop.sh` to stop; data is retained. On subsequent starts pass `-o ""` (the
  `-o` flag is still required).
- Uses `.localhost` subdomains (e.g. `wallet.localhost`); use Firefox/Chrome if
  `.localhost` resolution fails. Metrics are on by default at
  `http://validator.localhost/metrics` and `http://participant.localhost/metrics`.
- HTTP proxy via `JAVA_TOOL_OPTIONS` on the `validator` and `participant` services.

This repo ships a thin wrapper that drives this flow (self-generate the secret,
start/stop): see [`validator/`](../../validator/README.md).

## Kubernetes / Helm setup (production)

Charts are published as OCI artifacts at
`oci://ghcr.io/digital-asset/decentralized-canton-sync/helm/` (`splice-postgres`,
`splice-participant`, `splice-validator`, `splice-cluster-ingress-runbook`).
Deploy **one validator per namespace**.

```bash
helm install postgres oci://ghcr.io/digital-asset/decentralized-canton-sync/helm/splice-postgres \
  -n validator --version ${CHART_VERSION} -f postgres-values-validator-participant.yaml --wait

helm install participant oci://ghcr.io/digital-asset/decentralized-canton-sync/helm/splice-participant \
  -n validator --version ${CHART_VERSION} -f participant-values.yaml -f standalone-participant-values.yaml --wait

helm install validator oci://ghcr.io/digital-asset/decentralized-canton-sync/helm/splice-validator \
  -n validator --version ${CHART_VERSION} -f validator-values.yaml -f standalone-validator-values.yaml --wait
```

- `CHART_VERSION` matches the Splice release (e.g. `0.6.3`).
- **Secrets:** Postgres password — `kubectl create secret generic postgres-secrets
  --from-literal=postgresPassword=... -n validator` (apps use Postgres user
  `cnadmin`). Onboarding secret — `kubectl create secret generic
  splice-app-validator-onboarding-validator --from-literal=secret=... -n validator`.
- **Config:** set `MIGRATION_ID` in `standalone-participant-values.yaml`; set
  `MIGRATION_ID`, `SPONSOR_SV_URL`, `spliceInstanceNames`, and a `scanClient` block
  (recommended `scanType: "bft"` with `seedUrls`) in
  `standalone-validator-values.yaml`. The `scanClient` + `synchronizer` keys are
  the recommended replacements for legacy `scanAddress`,
  `decentralizedSynchronizerUrl`, `useSequencerConnectionsFromScan`. Auth:
  `auth.targetAudience` (default `https://canton.network.global`) and
  `auth.jwksUrl`.
- **Runtime/RBAC:** containers run as 1001:1001; volume ownership via `fsGroup`
  (chown init containers were removed — use `extraInitContainers` if your
  environment ignores `fsGroup`). Set `enableHealthProbes: false` on Kubernetes
  < 1.24.
- **Storage:** `splice-postgres` defaults to 20 GiB, storage class `standard-rwo`
  (`db.volumeSize` / `db.volumeStorageClass`). A PVC on the validator-app pod is
  the target for migration dumps; mount `/participant-bootstrapping-dump` when
  recovering from an identities backup.
- **Ingress:** the reference `splice-cluster-ingress-runbook` chart uses Istio +
  cert-manager (the old `splice-istio-gateway` chart is deprecated). Validators
  have **no external ingress requirement** for network participation — ingress is
  only for the wallet/CNS UIs (wallet reachable at
  `https://wallet.validator.YOUR_HOSTNAME`).
- **HTTP proxy:** `-Dhttps.proxyHost`/`-Dhttps.proxyPort` (and `http.nonProxyHosts`)
  in `additionalJvmOptions` on both charts; proxy authentication is not supported.

## Networking and ports

- **Ingress:** validators have no external ingress requirement for participation
  and need not whitelist other SVs/validators. UIs sit behind 80/443.
- **Egress:** the validator must reach all SVs — whitelist egress on port 443 for
  the SV IPs, and ensure all SV-bound traffic originates from your registered
  egress IP.

## Identity and key management

- Node identities contain the participant's private keys. **If you lose your keys,
  you lose access to your coins.** Back them up to a secret manager immediately
  after onboarding.
- SVs can help recover Canton Coin and CNS entries from an identities backup, but
  do **not** retain your apps' transaction details — keep your own backups.
- **External KMS** (Google Cloud KMS, AWS KMS) is supported on the participant via
  the splice-participant `kms` section (External Key Storage mode). You cannot
  migrate an existing non-KMS participant to KMS; the KMS drivers require licensed
  Canton Enterprise and are not supported on Docker Compose.

- Backups: https://docs.sync.global/validator_operator/validator_backups.html
- Disaster recovery: https://docs.sync.global/validator_operator/validator_disaster_recovery.html
- Security / KMS: https://docs.sync.global/validator_operator/validator_security.html

## Traffic top-up (automatic CC purchase)

Configured in the validator `topup` block:

- `enabled` (default true), `targetThroughput` (bytes/sec; `0` disables),
  `minTopupInterval` (minimum interval between top-ups).
- Each top-up buys roughly `targetThroughput * minTopupInterval` bytes (rounded up,
  stretched if below the synchronizer-wide `minTopupAmount`).
- Triggers when available extra traffic drops below the top-up amount **and**
  `minTopupInterval` has elapsed **and** the wallet has enough CC (DevNet auto-taps
  coin). Free traffic from SVs accumulates and maxes out after ~20 minutes idle.
- A documented starting point (exchange-integration guidance): `targetThroughput`
  ~2 kB/s, `minTopupInterval` ~1 minute.

See [traffic-operations.md](traffic-operations.md) and
https://docs.sync.global/deployment/traffic.html. Read live `AmuletRules`
parameters from Scan rather than hardcoding them.

## Upgrades

- **Regular upgrades:** `helm upgrade` the participant and validator charts in
  place; ensure `migration.migrating` is `false`.
- **Synchronizer migration with downtime:** moving to Canton 3.4 (and other major
  synchronizer upgrades) is **not** a rolling upgrade. SVs vote a date and pause
  traffic; the validator exports a migration dump to its PVC/volume. Set
  `migration.migrating: true` so the validator consumes the dump and initializes a
  **fresh** participant (new participant DB; the validator-app DB is reused,
  preserving app state), then `helm upgrade`. **Traffic balances reset to zero** on
  the new synchronizer instance. Practice on DevNet/TestNet first.

- Upgrades: https://docs.sync.global/validator_operator/validator_upgrades.html
- Major upgrades: https://docs.sync.global/validator_operator/validator_major_upgrades.html

## Monitoring

- Apps expose Prometheus metrics on **port 10013** at `/metrics`.
- Helm: enable via `metrics.enable: true` (default false) or scrape annotations.
  Docker Compose: metrics on by default.
- Native histograms need Prometheus `--enable-feature=native-histograms`.
- **Grafana dashboards** ship in the release bundle under `grafana-dashboards`
  (built for k8s; adapt for Compose).

- Observability: https://docs.sync.global/deployment/observability/index.html
- Metrics reference: https://docs.sync.global/deployment/observability/metrics_reference.html

## Canton 3.4 / Splice 0.6.x breaking changes for new deployments

- Moving to Canton 3.4 **requires a synchronizer migration with downtime** (not a
  rolling upgrade).
- The **package-id Ledger API reference format is dropped** in Splice 0.6.0 /
  Canton 3.5 — use the package-name format `#<package-name>:<module>:<entity>`.
- The **`splice-istio-gateway` Helm chart is deprecated** — follow the explicit
  Istio ingress instructions.
- **chown init containers replaced by `fsGroup`** in the charts.
- **Scan Helm values `publicUrl` and `internalUrl` are now mandatory.**
- **`MIGRATION_ID` is frozen** per network (`migration.id`); a separate serial ID
  increments per logical synchronizer upgrade and appears in synchronizer
  DNS/DB/port naming.
- Canton 3.4 relaxes DAR-history upload (only the latest package version needed)
  and makes **package unvetting** production-supported (`additionalPackagesToUnvet`).

- Release notes (0.6.x): https://docs.sync.global/release_notes.html
- Canton 3.4 notes: https://blog.digitalasset.com/developers/release-notes/canton-3.4-release-notes-for-splice-0.5.0

## How to proceed (applying)

1. Decide whether to self-operate (vs using an existing operator) and read
   [validator-onboarding.md](validator-onboarding.md).
2. Apply via the public
   [Canton Foundation validator application](https://canton.foundation/apply-to-set-up-a-validator-node/)
   (business email on your company domain; name a Super Validator sponsor from the
   public list, or "N/A").
3. Get your egress IP allowlisted by the sponsor and confirm propagation.
4. **DevNet (no approval form needed to onboard):** self-generate the onboarding
   secret via the SV API and bring up a node with Docker Compose (see
   [`validator/`](../../validator/README.md)).
5. **TestNet/MainNet:** obtain Tokenomics-Committee approval at
   [sync.global/validator-request](https://sync.global/validator-request/), use a
   sponsor-issued secret and a distinct egress IP, and arrange the initial coin
   grant.

## Caveats

- A validator app supports up to ~200 parties (the participant supports far more);
  high-party use cases need external-signing workarounds (no reward minting for
  those parties).
- `MIGRATION_ID` is frozen per network; reusing DBs/volumes across networks or
  migration IDs causes initialization failures. Confirm the current value for your
  target network before deploying.
- Community-contributed OIDC/Helm guides exist but are not formally tested by
  Splice maintainers — treat as starting points.

## Related

- [Validator onboarding (apply process)](validator-onboarding.md)
- [Validator DevNet wrapper](../../validator/README.md)
- [Splice validator ops (link index)](splice-validator-ops.md)
- [Traffic operations](traffic-operations.md)
- [Local dev stack (LocalNet)](../development/local-dev-stack.md)
