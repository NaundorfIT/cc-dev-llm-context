# Validator resource sizing

Two settings decide whether a validator runs well on a small host: how many CPUs
the JVMs think they have, and what the container memory limit is. Both have
defaults that are wrong for a 4 vCPU box, and both fail in ways that do not point
at the cause. This page explains the two rules and how to verify them.

Official hardware guidance:
https://docs.sync.global/validator_operator/validator_hardware_requirements.html

## Where the defaults come from

The Splice Docker Compose bundle composes `JAVA_TOOL_OPTIONS` for the participant
and validator services. When you leave `PARTICIPANT_JVM_OPTS` and
`VALIDATOR_JVM_OPTS` unset, it substitutes built-in defaults sized for a
comfortably large host:

| Service | Default `ActiveProcessorCount` | Default Scala `numThreads` |
|---------|-------------------------------|----------------------------|
| Participant | 12 | 12 |
| Validator | 8 | 8 |

On a 4 vCPU host that is 20 threads' worth of declared parallelism on 4 real
cores. The JVM sizes its GC thread pools, ForkJoinPool, and Scala execution
contexts from `ActiveProcessorCount`, so the result is GC thread contention and
scheduler thrash rather than an honest slowdown. The characteristic symptom is a
synchronizer handshake that stalls: the node looks alive, memory looks fine, and
nothing progresses.

This is a configuration problem, not an image problem. Do not rebuild images. The
bundle already substitutes `*_JVM_OPTS` when they are provided; you just have to
provide them, or use a start wrapper that derives them.

## Rule 1: declared parallelism must match the CPU limit

```text
ActiveProcessorCount                == that service's *_CPUS
scala.concurrent.context.numThreads == that service's *_CPUS
PARTICIPANT_CPUS + VALIDATOR_CPUS   <= host nproc
```

`*_CPUS` is the Compose CPU limit for the service, and the two JVM values must be
the integer part of it. A fractional CPU limit still needs an integer
`ActiveProcessorCount`, so round down and never to zero.

```bash
PARTICIPANT_CPUS=3
VALIDATOR_CPUS=1
PARTICIPANT_JVM_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75 -XX:ActiveProcessorCount=3 -Dscala.concurrent.context.numThreads=3"
VALIDATOR_JVM_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75 -XX:ActiveProcessorCount=1 -Dscala.concurrent.context.numThreads=1"
```

Writing these by hand means two places can drift apart. A start wrapper that
derives `*_JVM_OPTS` from `*_CPUS` whenever they are unset removes that class of
mistake entirely, and it also guarantees you never silently fall back to 12 and 8.
If you take that approach, leaving the opts blank is fine, but you still have to
confirm what the running container actually received (see below).

## Rule 2: heap comes from the container limit, not the host

`-Xmx` is derived from `MaxRAMPercentage` applied to the **container** memory
limit, which is `PARTICIPANT_MEMORY` or `VALIDATOR_MEMORY`. It has nothing to do
with how much RAM or swap the host has.

The consequence catches people out during a first MainNet sync: the participant
throws `OutOfMemoryError: Java heap space` while the host still shows gigabytes of
free swap. Adding more swap does not help, because the JVM never asks for memory
beyond `-Xmx`. The only fix is to raise the container limit, and then make sure
the host can back it.

At `MaxRAMPercentage=75`, a `16G` container limit gives roughly a 12G heap.

## Two profiles: first sync versus steady state

A first MainNet onboarding is by far the heaviest thing the node will ever do. It
downloads a large topology transaction set into Postgres, connects to the
synchronizer, then replays a large active-contract-set and topology event stream
through the JVM heap. Steady-state operation afterwards is much cheaper.

That gap is worth exploiting, because you only pay for the peak once.

**First MainNet sync on a 4 vCPU / 8 GB host, without resizing:**

| Setting | Value | Why |
|---------|-------|-----|
| `PARTICIPANT_MEMORY` | `16G` | Deliberately above host RAM, giving a ~12G heap |
| `VALIDATOR_MEMORY` | `1.5G` | Keep it small; the participant needs the headroom |
| `PARTICIPANT_CPUS` | `3` | With `ActiveProcessorCount=3` |
| `VALIDATOR_CPUS` | `1` | With `ActiveProcessorCount=1` |
| Host swap | 12 GB or more | Backs the oversized container through the peak |
| `vm.swappiness` | `10` | Prefer RAM; expect heavy paging once, during sync |

Expect heavy disk activity and a slow wall-clock time. That is the trade: paging
through one catch-up instead of paying for a larger instance. Both are valid.

**Steady state on an 8 vCPU / 16 GB host** keeps the limits inside physical RAM,
because the node is caught up and never replays that stream again:

| Setting | Value |
|---------|-------|
| `PARTICIPANT_MEMORY` | `8G` |
| `VALIDATOR_MEMORY` | `3G` |
| `PARTICIPANT_CPUS` | `4` |
| `VALIDATOR_CPUS` | `2` |

A DevNet node is undemanding by comparison; roughly `4G` participant and `2G`
validator on 2 and 1 CPUs is enough.

Note the interaction with host migration: moving a node by restoring its
databases does **not** repeat the first-sync catch-up, because the restored
participant is already current as of the backup. A replacement host can therefore
be sized for steady state rather than for the peak. See
[validator-upgrades-and-recovery.md](validator-upgrades-and-recovery.md).

## Verify what the container actually got

Environment set in a `.env` file is not evidence. Compose substitution, wrapper
scripts, and stale containers all sit between the file and the process. Check the
container:

```bash
docker inspect <participant-container> \
  --format '{{range .Config.Env}}{{println .}}{{end}}' | grep JAVA_TOOL_OPTIONS
```

This fails if `ActiveProcessorCount=12` still appears on a 4 vCPU host, or `=8`
for the validator. Note that a container keeps the environment it was created
with, so a config change requires recreating the container, not restarting it.

Confirm the memory limit landed too:

```bash
docker inspect <participant-container> --format '{{.HostConfig.Memory}}'
# bytes; 16G is 17179869184
```

And confirm the host matches your assumptions:

```bash
nproc
free -h
swapon --show
```

## Reading the failure modes

| Observation | Likely cause | Fix |
|-------------|--------------|-----|
| Handshake or sync stalls, high load average, heap not full | `ActiveProcessorCount` left at 12 or 8 | Align it to `*_CPUS`, recreate containers |
| Repeated `OutOfMemoryError: Java heap space`, free swap available | Heap ceiling from the container limit | Raise `*_MEMORY`, back it with swap |
| Host thrashing, swap full, no JVM OOM | Swap too small, or something else competing | Grow swap or reduce other load |
| Containers OOM-killed by the kernel | Container limits exceed what the host can back | Lower limits or add swap |
| Healthy once caught up | Working as intended | Optionally downsize later, with monitoring |

## Related

- [Validator node setup reference](validator-node-setup.md)
- [Validator networking and access](validator-networking-and-access.md)
- [Validator upgrades and recovery](validator-upgrades-and-recovery.md)
- [Validator monitoring and traffic](validator-monitoring-and-traffic.md)
- [Splice validator ops](splice-validator-ops.md)
