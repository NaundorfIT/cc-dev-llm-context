# Validator monitoring and traffic

What you need from a validator's observability stack is narrow: is the node
healthy, is the JVM within its limits, is it connected to the synchronizer, and
does it have traffic left to spend. This page covers how to get those signals and
the disk-space problem that will otherwise find you first.

For the economics of traffic, see [traffic-operations.md](traffic-operations.md).
For the builder's per-operation cost view, see
[traffic-cost-planning.md](../development/traffic-cost-planning.md).

## What to scrape

The validator and participant each expose Prometheus metrics on port `10013`.
Point Prometheus at both, plus a node exporter for host-level CPU, memory, swap,
disk, and load.

The Splice release bundle ships official Grafana dashboards. Provision them from
the bundle rather than building your own from scratch, and remember that they are
part of the bundle, so an upgrade replaces them. Keep any dashboards you author
outside the bundle directory.

Metrics reference:
https://docs.sync.global/deployment/observability/metrics_reference.html

## Where to bind

Metrics endpoints and dashboards belong on the admin network only. Neither
Prometheus, Grafana, nor a metrics gateway should ever listen on the egress
address that Super Validators allowlisted. Make the bind address a configuration
value rather than a literal in code, because it changes when the node moves to a
new host. See
[validator-networking-and-access.md](validator-networking-and-access.md).

## Traffic gauges

Current traffic state is exposed on the **participant** metrics endpoint, not the
validator's:

| Metric | Meaning |
|--------|---------|
| `daml_sequencer_client_traffic_control_base_traffic_remainder` | Base-rate traffic left, in bytes |
| `daml_sequencer_client_traffic_control_extra_traffic_consumed` | Purchased traffic consumed, in bytes |
| `daml_sequencer_client_traffic_control_last_traffic_update` | Unix timestamp of the last sequencer traffic update |

```bash
curl -sS http://<participant-metrics-host>:<port>/metrics \
  | grep -E 'traffic_control_(base_traffic_remainder|extra_traffic_consumed|last_traffic_update)'
```

## The two pools are separate

Base-rate traffic and purchased traffic are distinct balances, and this is the
single most misread part of the traffic model.

Purchasing traffic does **not** refill the base-rate gauge. It adds to the extra
pool. If you have automation that waits for available traffic before submitting
work, gate it on `base_traffic_remainder` specifically, not on a combined total.
Gating on a total means a healthy purchased balance masks an exhausted free
allowance, and the automation runs when you intended it to wait.

Two related points:

- Purchases have a governance-set minimum (`minTopupAmount`), so a non-zero
  purchase below that minimum is rejected. Read the live value from Scan.
- Buying traffic authenticates as the validator **operator's wallet user**, not
  as the backend administrator identity the node uses for its own ledger
  commands.

## Leave auto top-up off during first setup

`TARGET_TRAFFIC_THROUGHPUT` drives the built-in top-up automation. Set it to `0`
for a first deployment.

The reasoning is ordering. Base-rate traffic regenerates on its own and is enough
to finish onboarding and open the wallet, whereas auto top-up wants to burn CC the
wallet does not have yet. Turn it on later, once the wallet is funded and you
actually want purchased traffic backing sustained activity.

The same preference applies during maintenance. A post-upgrade smoke test should
run on base-rate traffic; if the remainder is too low, wait for the next refill
rather than making an unplanned purchase.

## Configure log rotation before the first container

Docker's default `json-file` log driver has no size limit. Nothing rotates,
nothing truncates, and the participant is verbose. A single participant log
growing past 8 GB is an ordinary outcome on a node left alone for a few months,
and long before the disk fills, `docker logs --since` starts taking minutes, which
is exactly when you need it to be fast.

Set host-wide defaults in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "100m", "max-file": "5" }
}
```

That caps each container at 500 MB. Cap the journal too, with `SystemMaxUse` in a
`journald.conf.d` drop-in.

Two caveats:

- **Do this before creating the first container.** A container keeps the log
  configuration it was created with, so existing containers stay unbounded until
  they are recreated.
- **Do not edit the Splice Compose file to add per-service log options.** The
  bundle is replaced wholesale on every version upgrade, so the change would be
  lost. Host-level daemon configuration survives.

## What to alert on

A minimal set that covers the failures that actually occur:

- Container health and restart loops.
- JVM heap approaching its ceiling, which on a small host is the leading
  indicator described in
  [validator-resource-sizing.md](validator-resource-sizing.md).
- Sequencer connections dropping to zero.
- `base_traffic_remainder` trending toward exhaustion.
- Host disk usage, particularly the Docker data root.
- Egress address changing, which is worth an explicit check rather than an
  inference, because it is silent until requests start returning 403.

## Related

- [Traffic operations](traffic-operations.md)
- [Traffic-cost planning (builder view)](../development/traffic-cost-planning.md)
- [Validator resource sizing](validator-resource-sizing.md)
- [Validator networking and access](validator-networking-and-access.md)
- [Validator upgrades and recovery](validator-upgrades-and-recovery.md)
- [Splice validator ops](splice-validator-ops.md)
