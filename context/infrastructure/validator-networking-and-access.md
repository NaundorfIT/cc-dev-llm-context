# Validator networking and access

A validator has one network property the rest of the network cares about: the
IPv4 address its outbound connections come from. Super Validators allowlist that
address, and onboarding, Scan discovery, and sequencer connections all fail if it
changes. Everything else about the node's networking exists to keep that egress
stable and to keep the admin surface off the public internet.

This page covers the parts that are easy to get wrong on a single-VM Docker
Compose deployment. For the overall setup, see
[validator-node-setup.md](validator-node-setup.md); for the application and
approval process, see [validator-onboarding.md](validator-onboarding.md).

## Three IP roles, kept separate

A production node ends up with three distinct addresses. Conflating them is the
most common source of "it worked yesterday" incidents.

| Role | Used for | Public exposure |
|------|----------|-----------------|
| Primary / bootstrap | Initial SSH before the admin path exists | Closed once admin access works |
| Egress | Outbound Canton traffic; this is the address SVs allowlist | Outbound only, never a listener |
| Admin | Inbound SSH, metrics, dashboards, identity provider | Private network only |

The egress address should be a *dedicated* address you control independently of
the instance, so it can be reassigned to a replacement host. Cloud providers call
this a floating, elastic, reserved, or secondary IP.

The admin path is typically a WireGuard mesh (Tailscale, Netbird, or similar), a
VPN, or a bastion host. Whatever you choose, the rule is the same: no validator
API, wallet UI, metrics endpoint, dashboard, or identity provider is ever bound
to the egress address.

## A dedicated egress IP must be declared, not scripted

On Debian and Ubuntu cloud images the primary interface is managed by
`systemd-networkd` via DHCP. `systemd-networkd` owns that link and **removes any
address, route, or routing rule it did not render itself** on every
reconfiguration: DHCP lease renewal, link flap, reboot, or an explicit
`networkctl reconfigure`.

That makes the obvious approach wrong. If you add the egress address with
`ip addr add` and force the default route with `ip route replace`, whether from a
shell or from a boot-time oneshot unit, the configuration survives until the
first lease renewal and then silently reverts. Egress falls back to the primary
address, and because the node keeps running, the first symptom is usually Scan
requests returning HTTP 403 hours or days later.

Declare it instead. With netplan, add a drop-in that renders three things:

- The egress address as a `/32` on the primary interface.
- A default route with `from: <egress-ip>` and a metric that beats the
  DHCP-installed default (DHCP typically installs metric 100, so use something
  lower such as 50).
- A separate routing table plus a routing policy rule, so replies to traffic that
  arrived on the egress address leave from the same address.

The third item is what people usually forget. Without the policy rule, inbound
connections to the egress address get answered from the primary address and are
dropped by the peer as martians.

### Verify the way it actually breaks

Checking egress once after install proves nothing, because the failure mode is
triggered by reconfiguration. Force one:

```bash
curl -4 https://checkip.amazonaws.com   # expect the egress address
sudo networkctl reconfigure eth0        # simulate a DHCP renewal
curl -4 https://checkip.amazonaws.com   # must still be the egress address
```

Re-run this after any change to networking, after kernel or netplan package
updates, and after a reboot.

## Hardening order

The ordering matters because each step removes a way back in. Do not skip ahead.

1. Egress address declared and surviving `networkctl reconfigure`.
2. Admin network installed, and an SSH session over it confirmed in a *second*
   terminal while the first stays open.
3. Public inbound SSH closed (firewall allows SSH only on the admin interface).
4. Monitoring, dashboards, and the identity provider bound to the admin address.

Know your provider's out-of-band console (serial or VNC) before step 3. It is the
only recovery path if the firewall rule is wrong.

The firewall policy itself is unremarkable: deny inbound by default, allow
outbound, allow SSH on the admin interface only. The validator does not need any
public inbound ports.

## Reaching localhost-bound UIs from a workstation

The Compose bundle puts an nginx in front of the validator and binds it to
`127.0.0.1:80`, routing to the wallet UI, validator API, JSON Ledger API, and
name-service UI by `Host` header on `*.localhost` virtual hosts. None of it is
reachable from outside the box, which is correct and should stay that way.

To use it from a workstation, forward each virtual host over SSH. Two constraints
shape the command:

- Every `*.localhost` name resolves to `127.0.0.1`, so the virtual hosts cannot
  be distinguished by address. Each one needs its own local port.
- macOS does not allow non-root processes to bind ports below 1024, so
  `ssh -L 80:127.0.0.1:80` fails with a permission error. Use high local ports.

```bash
ssh -N \
  -L wallet.localhost:18080:wallet.localhost:80 \
  -L validator.localhost:18081:validator.localhost:80 \
  -L participant.localhost:18082:participant.localhost:80 \
  <user>@<admin-host>
```

Then open `http://wallet.localhost:18080`. The forward preserves the `Host`
header, which is what lets the remote nginx pick the right virtual host. Check
the bundle's nginx configuration for the exact virtual host names your Splice
version ships.

## Moving the egress IP to a replacement host

Because the allowlist is tied to the address and not to the machine, reusing the
same egress address on a new host means no new allowlist vote and no new
onboarding secret. The timing is narrow:

> Move the address **after** the old validator has stopped and **before** the new
> one starts.

Move it too early and the still-running old node loses its allowlisted egress.
Move it too late and the new node dials sequencers from an address nobody has
approved, which produces 403s that look like an allowlist regression.

Only one host can hold the address at a time, which conveniently doubles as an
interlock against running two nodes on the same identity. After the cutover,
disable the egress configuration on the old host so a reboot cannot reclaim the
address.

If the admin network assigns addresses per machine, the replacement host gets a
new one. Reuse the *hostname* rather than the address: rename the old node, then
claim the canonical name on the new one, so SSH aliases and any hostname-based
URLs keep working. Anything that embeds the admin address in configuration
(identity provider bind address, metrics gateway, the validator's OIDC discovery
and JWKS URLs) has to be rebound. Resolve those from environment variables rather
than hardcoding them, so a move is a config change and not a code change.

Full procedure: [validator-upgrades-and-recovery.md](validator-upgrades-and-recovery.md).

## Allowlist propagation is slow and partial

Getting an address allowlisted is a governance action, not a support ticket. It
propagates as individual Super Validators adopt it, so the state you observe is a
fraction, not a boolean. Expect days rather than minutes.

Practical consequences:

- Run allowlist checks **from the node itself**, not from a workstation. You are
  testing the egress address, and a laptop has a different one.
- HTTP 403 on Scan discovery means your address is not allowlisted at that
  operator yet. A timeout means that operator is unreachable or still pending.
- A 403 from the *first* Scan you contact can abort discovery before it
  enumerates the rest, which makes partial propagation look like total failure.
  Probe each Super Validator's Scan URL individually and count successes rather
  than trusting a single aggregate call.
- Onboarding needs a supermajority, so you can be well past halfway and still be
  blocked. Conversely, the onboarding secret endpoint can start working before
  every Scan responds.

## Related

- [Validator node setup reference](validator-node-setup.md)
- [Validator onboarding](validator-onboarding.md)
- [Validator resource sizing](validator-resource-sizing.md)
- [Validator upgrades and recovery](validator-upgrades-and-recovery.md)
- [Validator monitoring and traffic](validator-monitoring-and-traffic.md)
- [Splice validator ops](splice-validator-ops.md)
