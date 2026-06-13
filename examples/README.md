# Examples

Runnable Canton Network examples that ship with this guide. Each lives under its
own directory with a `Makefile`, README, and links into the
[`context/`](../context/) knowledge base.

| Example | What it shows | Docs |
|---------|---------------|------|
| [**amulet-lock**](amulet-lock/) | Lock and unlock Amulet (CC) on LocalNet via CIP-56 **allocations** — one DAML template (`AllocationRequest`) + vanilla JS web UI | [README](amulet-lock/README.md), [builder learnings](../context/development/cip-56-allocation-lock-learnings.md) |

## Typical flow (amulet-lock on LocalNet)

Requires Docker Desktop (≥ 8 GB), [dpm](https://docs.digitalasset.com/build/3.5/dpm/dpm.html), and Python 3.

```bash
# 1. Start the local network
cd localnet && cp .env.example .env && make up

# 2. Build, deploy, and open the example UI
cd ../examples/amulet-lock
make build && make deploy && make serve
# -> http://localhost:8800 — Tap 100 CC, then Lock / Unlock

# 3. Tear down when done
# Ctrl-C the UI server, then:
cd ../../localnet && make down    # stop containers
make clean                        # optional: delete bundle + volumes
```

See [localnet/README.md](../localnet/README.md) for JSON API auth, ports, and
troubleshooting.
