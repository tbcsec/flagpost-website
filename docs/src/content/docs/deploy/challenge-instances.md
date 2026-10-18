---
title: Challenge instances
description: Set up on-demand, per-team containerised challenge instances on Docker or Kubernetes — the socket-proxy and ingress bootstrap, wildcard TLS, the hardened runtime spec, authoring a deployment, unique per-instance flags, and Test connection.
---

Challenge instancing gives each team (or each player, in individual mode) their
**own isolated, running copy** of a challenge, spun up on demand, reaped on a
TTL, and torn down when the competition ends. It is what makes pwn, web, cloud
and OT challenges viable on Flagpost alone — no more one shared `nc` host that
every team can knock over.

It ships as the optional **Challenge Instances** module (`instances`), off by
default and toggled per competition. The whole design — the provisioner
contract, the lifecycle, the flag semantics, the egress model and the
Kubernetes threat model — is recorded in
[ADR-0036](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0036-challenge-instancing-provisioners.md).

:::caution[This page is the one-time infrastructure setup]
Instances run **deliberately vulnerable** containers. Standing up the runtime
backend is the one out-of-band step, and it has real security weight — read the
[egress control](#egress-control-do-this-for-a-real-event) and
[security posture](#security-posture--threat-model) sections before you run a
public event. Everything *after* the bootstrap is done in the admin UI, and the
**Test connection** button is the source of truth that your topology actually
works.
:::

## How it fits together

A **provisioner** turns a challenge's deployment spec into a running instance
for a subject, and back. Backends register by **kind** — the same pattern as
[external identity providers](/admin/sso/): a new backend is a new *kind*, not a
fork. Three kinds ship:

- **`docker`** — talks the
  [Docker Engine API](https://docs.docker.com/reference/api/engine/) to a
  configured endpoint. The single-host option.
- **`kubernetes`** — the same contract over a cluster, with enforced
  NetworkPolicy isolation and in-cluster health checks. The scale option.
- **`shared-static`** — no lifecycle; returns fixed endpoints. Covers the
  classic "one always-on `nc` host" challenge and needs no infrastructure at
  all.

A few properties are worth internalising before you configure anything:

- **The instance row *is* the job.** Provisioning runs on the background lane
  (never on the request that launched it) and the database row walks a small
  state machine — `requested → provisioning → running → expiring → destroyed`
  (with a terminal `failed`). There is no separate queue to keep consistent.
- **No new daemon.** TTL reaping, stuck-provision cleanup and orphan collection
  ride the scheduler Flagpost already runs.
- **Same-host and remote-host are the same code path.** The only difference is
  the endpoint URL — a sidecar on the box running Flagpost, or a sacrificial
  challenge host reached over a private path. For a large or high-risk event,
  run instances on a **separate host** so an exploited container never shares a
  kernel with your control plane.
- **Authors never supply raw runtime options.** Flagpost composes every
  container-create / pod payload itself — dropped capabilities, no privilege
  escalation, read-only rootfs, CPU/memory/PID limits, an isolated network, no
  volume mounts. A challenge author supplies an image reference and ports,
  nothing that reaches a privileged field.

### Permissions

Two grants govern instancing, kept separate because they carry very different
weight:

| Permission | Scope | Governs |
| --- | --- | --- |
| `manage_instance_infra` | global | The site infrastructure surface — pointing Flagpost at a runtime endpoint, the registry credential, the port range, egress policy. Its own grant (not `manage_site_settings`), because it is a higher-stakes control. |
| `instance_view` | competition | Seeing the staff running-instances ops view. |
| `instance_manage` | competition | Force-killing any instance, and staff **test-launch** before a competition opens. |
| `instance_launch` | competition | A competitor launching / extending / stopping **their own** instance. |

Administrator holds all four; Judge holds the three competition-scoped ones;
Participant holds `instance_launch`. See the
[permissions reference](/reference/permissions/).

## Docker backend

The Docker kind talks the Docker Engine API over HTTP — but **never** to a raw
`/var/run/docker.sock`. It talks to a least-privilege
[**socket proxy**](https://github.com/Tecnativa/docker-socket-proxy) that only
forwards the verbs the provisioner needs and returns `403` for the dangerous
ones. Holding the raw socket is equivalent to host root; the proxy is what keeps
that off the application.

### Same-host bootstrap

The one out-of-band step is bringing up the socket-proxy sidecar and the
isolated instance network. The repo ships both as a
[Compose overlay](https://docs.docker.com/compose/how-tos/multiple-compose-files/):

```bash
docker compose -f docker-compose.yml -f docker-compose.instances.yml up -d
```

This adds two things:

- **`socket-proxy`** ([tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy))
  in front of the host daemon, reachable only by the backend over an internal
  `flagpost-control` network and **published to no host interface**. It allows
  `CONTAINERS`, `IMAGES`, `NETWORKS`, `POST`, `PING`, `VERSION`; it denies
  `EXEC`, `VOLUMES`, `BUILD`, `SWARM` and everything else — so even with the
  proxy address, nobody can `docker exec` into a live instance, mount a volume,
  or build an image.
- **`flagpost-instances`**, a normal
  [bridge network](https://docs.docker.com/engine/network/drivers/bridge/) the
  challenge containers attach to.

:::note[Why the instance network is *not* `internal: true`]
An [internal network](https://docs.docker.com/engine/network/drivers/bridge/)
denies egress at the Docker layer — which sounds ideal — but Docker then **cannot
publish a TCP port** from a container attached only to it (there is no gateway
to NAT through), so an internal network silently breaks every TCP challenge.
Flagpost therefore uses a normal bridge and treats egress-deny as a
**host-firewall** job (below). An internal network is only valid for
`exposure: none` challenges. This was verified against a live daemon and is
recorded as an [amendment to ADR-0036](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0036-challenge-instancing-provisioners.md).
:::

#### Egress control (do this for a real event)

A normal bridge lets instances reach the internet, your control plane, and each
other by default. Close that down with host firewall rules — this is not
optional for a public event:

- **Drop forwarded traffic** out of the `flagpost-instances` subnet except the
  competitor-facing ports, using
  [iptables/nftables the way Docker documents](https://docs.docker.com/engine/network/packet-filtering-firewalls/)
  (add rules to the `DOCKER-USER` chain so Docker doesn't overwrite them).
- **Always block the cloud metadata IP** `169.254.169.254` (and the IPv6
  `fd00:ec2::254`). An exploited instance that can reach
  [the instance metadata service](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
  can often steal cloud credentials — this is the single most important rule.
- **Keep the control plane unreachable** from the instance subnet — Postgres,
  Redis, RustFS and the API must not sit on any address an instance can dial.

Test connection's `network_isolation` leg *reminds* you of this, but it cannot
verify your firewall — that responsibility is yours.

#### Configure it in the admin UI

In **Admin → Site settings → Instances** (needs `manage_instance_infra`):

1. **Backend**: Docker.
2. **Endpoint URL**: `http://socket-proxy:2375`.
3. **Public host**: the hostname or IP competitors connect to, e.g.
   `chal.example.org`.
4. **TCP port range**: the host ports you opened for instances (default
   `30000–32767`). Only this range needs to be reachable from the internet; the
   socket proxy must **not** be.
5. **Registry credential** (optional): leave blank for public images. For a
   private registry, supply a base64
   [`X-Registry-Auth`](https://docs.docker.com/reference/api/engine/) blob —
   base64 of `{"username","password","serveraddress"}`. It is write-only and
   encrypted at rest, and is only ever forwarded to the registry its
   `serveraddress` names.
6. Click **Test connection** and fix any red leg before enabling. Then flip the
   site **master switch** on, and toggle the module on for each competition that
   needs it.

### Remote (sacrificial) challenge host

For a large or high-risk event, run instances on a separate box so exploited
containers never share a kernel with the control plane. On that host, run the
**same** socket proxy beside its daemon, exposed **only** on a private path to
Flagpost (VPC, WireGuard, or a TLS-fronted address — never the public internet),
and create the network there:

```bash
docker network create flagpost-instances   # a normal bridge; then apply the egress firewall rules
```

Then set the endpoint URL to that private address (e.g. `http://10.0.0.5:2375`).
Everything else — the admin fields, Test connection, authoring — is identical.
One code path; the topology is just a URL.

### What Flagpost pins on every container

You don't configure this, but it's what makes running hostile images defensible.
Every instance is created with a hardened
[HostConfig](https://docs.docker.com/reference/api/engine/) that an author cannot
override:

- `CapDrop: ["ALL"]` and `no-new-privileges` — no
  [Linux capabilities](https://docs.docker.com/engine/containers/run/#runtime-privilege-and-linux-capabilities),
  no privilege escalation.
- `ReadonlyRootfs` with a single `noexec,nosuid,nodev` tmpfs at `/tmp` — nothing
  writes outside a scratch dir.
- [Resource limits](https://docs.docker.com/engine/containers/resource_constraints/):
  CPU (`NanoCpus`), memory, a `PidsLimit` (fork-bomb containment) and a `nofile`
  ulimit (fd-exhaustion backstop).
- `AutoRemove`, `RestartPolicy: no`, and **no** bind mounts or volumes.

## HTTP subdomain routing

Web challenges are exposed over **HTTPS at a per-instance subdomain** rather than
a raw port: an instance is reached at `https://<token>.<base-domain>`, where
`<token>` is a short, unguessable id minted per instance (so a competitor can't
reach another team's instance by guessing). A **label-driven ingress** on the
instance host does the routing — the provisioner stamps
[caddy-docker-proxy](https://github.com/lucaslorentz/caddy-docker-proxy) labels
on each container at create time, and the ingress reconfigures itself from them.
There is no per-request round-trip to the control plane, and your platform's own
Caddy is untouched.

Bring the ingress up alongside the socket proxy:

```bash
docker compose -f docker-compose.yml -f docker-compose.instances.yml \
  -f docker-compose.instances-http.yml up -d
```

This adds a `caddy-docker-proxy` ingress (publishing `:80`/`:443`, attached to
`flagpost-instances`) plus a **second, read-only** socket proxy that only lets
the ingress *watch* containers and read their routing labels — it holds no
create/start rights of its own.

Then set **HTTP base domain** to your `chal.<domain>` in the admin panel. Test
connection gains an **HTTP** leg that checks the wildcard resolves and the
ingress answers on `:443`; an `exposure: http` challenge can't launch until the
base domain is set.

**Two prerequisites — you provide these once, per host:**

1. **Wildcard DNS** — `*.<base-domain>` must resolve to the instance host.
2. **Wildcard TLS** — a certificate for `*.<base-domain>` on the ingress.

:::tip[Local dev / CI — no domain or real cert]
Use [sslip.io](https://sslip.io) for DNS (set the base domain to
`chal.127.0.0.1.sslip.io` and `<anything>.chal.127.0.0.1.sslip.io` resolves to
`127.0.0.1` with no DNS server to run), and Caddy's
[internal CA](https://caddyserver.com/docs/automatic-https#local-https)
(`local_certs` in `caddy/instances-ingress.Caddyfile`) for TLS. The bundled
`scripts/e2e-instances-http.sh` proves the whole path end to end.
:::

**Production.** Delete `local_certs` from `caddy/instances-ingress.Caddyfile` and
issue real certificates with
[ACME DNS-01](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge) —
the global option
[`acme_dns <provider> …`](https://caddyserver.com/docs/caddyfile/options#acme-dns),
e.g. `acme_dns cloudflare {env.CF_API_TOKEN}`. DNS-01 issues a cert per
subdomain with no inbound ACME HTTP challenge exposed. (Note: a `tls { dns … }`
block is *site-level* and is invalid in the global-options block that the base
Caddyfile is — use `acme_dns`.)

## Kubernetes backend

The `kubernetes` backend is the same `Provisioner` contract over a cluster
instead of a single daemon — a new *kind*, not a fork. It's the scale option:
per-instance workloads with **enforced**
[NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
isolation and in-cluster health checks with auto-restart. Exposure maps the same
shape as Docker — TCP onto a
[NodePort](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport)
Service (from the same host-port range), HTTP onto an
[Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) at
`<token>.<base-domain>` — so switching a site from Docker to Kubernetes is a
settings change, not a re-authoring pass.

### Posture — namespaced, least privilege

Everything runs in **one operator-configured namespace** (default
`flagpost-instances`), and Flagpost authenticates as a
[ServiceAccount](https://kubernetes.io/docs/concepts/security/service-accounts/)
with a **namespace-scoped
[Role](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)** — *not*
namespace-per-instance, which would need cluster-wide rights. The token is denied
`secrets`, `pods/exec`, and everything cluster-scoped (namespace creation, node
listing). Per-instance isolation comes from NetworkPolicy, not namespaces. This
is the socket-proxy least-privilege posture in Kubernetes terms — and a
cluster-admin token deliberately **fails** the privilege-posture leg of Test
connection.

### Bootstrap

On the **challenge cluster** (a sacrificial cluster, not the one running the
control plane), apply the shipped RBAC and mint a token:

```bash
kubectl apply -f k8s/instances-rbac.yaml

# A long-lived token for the admin UI (Kubernetes 1.24+ — no auto Secret):
kubectl -n flagpost-instances create token flagpost-provisioner --duration=8760h

# The API server CA to paste into the "CA certificate" field:
kubectl config view --raw --minify \
  -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d
```

`k8s/instances-rbac.yaml` creates the namespace, a `flagpost-provisioner`
ServiceAccount with a namespace-scoped Role (create/delete on Deployments,
Services, NetworkPolicies, Ingresses and pods — pods are created directly
only by the Test-connection probes — plus get/list for status; and nothing
on `secrets` or `pods/exec`), a zero-rights `flagpost-instance` account
that the challenge pods themselves run as, and a **namespace default-deny-egress
baseline** NetworkPolicy that isolates a freshly-created pod during the brief
window before its own per-instance policy is programmed by the CNI. Its one
allowance is DNS to the cluster DNS pods (`k8s-app=kube-dns` in
`kube-system`), the same scope as each instance's own policy.

:::caution[Upgrading to v1.8.0? Re-apply the manifest]
Run `kubectl apply -f k8s/instances-rbac.yaml` again so an existing namespace
picks up the scoped DNS rule. Test connection's `baseline_policy` leg stays red
until you do.
:::

If your cluster's DNS **isn't** kube-dns pods in `kube-system` — NodeLocal
DNSCache, GKE Cloud DNS or OpenShift, for example — DNS fails inside instances.
Leave the built-in rule alone and add a **supplementary** NetworkPolicy in the
instance namespace that allows DNS to your resolver only (policies add up, so it
extends the baseline and every instance's policy). Keep it scoped with a `to`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: flagpost-dns-extra
  namespace: flagpost-instances
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    - to:
        - ipBlock: { cidr: 169.254.20.10/32 }   # your resolver's address
      ports:
        - { protocol: UDP, port: 53 }
        - { protocol: TCP, port: 53 }
```

On OpenShift, replace the `ipBlock` with a `namespaceSelector` for
`openshift-dns` plus a `podSelector` for its DNS pods, and use port `5353`.

Then configure **Admin → Site settings → Instances**:

1. **Backend**: Kubernetes.
2. **Endpoint URL**: the API server, e.g. `https://10.0.0.5:6443`.
3. **Public host**: the node/LB address competitors dial for NodePort challenges.
4. **Namespace**, the **service-account token** (write-only, encrypted at rest),
   and the **API server CA** from the bootstrap.
5. For HTTP challenges: the **HTTP base domain**, an **ingress class** if not the
   cluster default, and — recommended — the **cluster CIDRs** (pod/service
   ranges) so peers and the control plane stay unreachable even for
   internet-enabled challenges. An **image pull secret** name covers private
   registries (the
   [Kubernetes way](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/);
   the Secret stays in the cluster and Flagpost holds no rights on it).
6. **Test connection**, then enable.

### What Flagpost pins on every pod

Each instance is a
[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
(replicas=1, so a
[liveness probe](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
restarts a hung container and the ReplicaSet replaces a crashed one) whose pod is
hardened per the
[Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
Restricted profile and cannot be overridden by an author `manifest`:

- [`securityContext`](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/):
  drop `ALL` capabilities, `allowPrivilegeEscalation: false`, read-only root
  filesystem, and a
  [`RuntimeDefault` seccomp profile](https://kubernetes.io/docs/tutorials/security/seccomp/).
- `automountServiceAccountToken: false` and `enableServiceLinks: false` — the
  pod holds no API credential and gets no cluster service host/port leaked into
  its environment.
- `requests == limits` for CPU and memory — a hard ceiling, predictable
  scheduling.

:::caution[Two operator responsibilities Kubernetes can't express in a pod spec]
**PID and file-descriptor caps** (Docker's `PidsLimit`/`nofile`) have no pod-spec
field — set them on the challenge nodes via the kubelet
[`--pod-max-pids`](https://kubernetes.io/docs/concepts/policy/pid-limiting/).
And **NetworkPolicy is only enforced by a policy-enforcing
[CNI](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)** —
[Calico](https://docs.tigera.io/calico/latest/network-policy/), [Cilium](https://cilium.io/use-cases/network-policy/),
or k3s's embedded kube-router. **Flannel alone accepts NetworkPolicy objects but
does not enforce them**, so instances would not be isolated. The
`egress_enforcement` Test-connection leg exists precisely to catch this
accept-but-don't-enforce trap.
:::

### Egress isolation

Per-instance NetworkPolicy is the enforced upgrade over Docker's host-firewall
documentation:

- **Deny mode** (the default) — DNS only. That one rule blocks the internet, the
  control plane, peer instances and the metadata IP in a single stroke.
- **Allow mode** (per-competition opt-in, for challenges that legitimately need
  the internet) — everything *except* the cloud metadata IPs and, when you've set
  the cluster CIDRs, the pod/service ranges, so peers and the control plane stay
  unreachable. Rules are written per address family, so dual-stack clusters are
  covered.

### Wildcard TLS

Same prerequisite as the Docker HTTP path: `*.<base-domain>` DNS pointing at the
ingress, and a wildcard certificate. Provide it to your ingress controller the
usual way — a [cert-manager](https://cert-manager.io/docs/)
[`Certificate` + `ClusterIssuer`](https://cert-manager.io/docs/configuration/acme/dns01/),
or a wildcard TLS Secret set as the controller's default. Flagpost's per-instance
Ingress relies on the controller's wildcard/default cert; it sets no per-Ingress
TLS.

:::tip[Prove the whole path locally]
`scripts/e2e-instances-k8s.sh` boots a single-node
[k3s](https://docs.k3s.io/) in Docker, applies the RBAC, mints a token, and runs
the provisioner against it — RBAC posture, NetworkPolicy **enforcement**,
NodePort reachability, and a real instance reached at its subdomain through k3s's
Traefik (wildcard DNS via sslip.io). No real cluster, domain or cert needed.
:::

## Test connection — the staged validator

`validate()` is a first-class part of the provisioner contract, not a ping. It
runs an **ordered list of named legs**, each pass/fail with an actionable
message, and the admin UI renders them individually — so a field misconfiguration
surfaces as a labelled error *before* event day, not as a dead connection string
during it.

| Docker legs | Kubernetes legs |
| --- | --- |
| `endpoint_reachable` — proxy answers, API version | `endpoint_reachable` — API server answers, token accepted |
| `privilege_posture` — dangerous verbs return `403` | `privilege_posture` — the SelfSubjectAccessReview allow/deny matrix (a cluster-admin token fails) |
| `network_isolation` — the instance network exists; egress reminder | `namespace_ready` — the namespace is operable |
| `image_pull` — a probe image pulls | `network_policy_support` — NetworkPolicy objects are accepted |
| | `baseline_policy` — the namespace default-deny-egress baseline is present and every egress rule in it is scoped (v1.8.0) |
| `probe_run` — a hardened probe container runs | `egress_enforcement` — a deny-all pod is actually blocked (with a positive control) |
| `public_reachable` — the public host is dialled end-to-end on a real port | `probe_run` + `public_reachable` — a hardened pod behind a NodePort, dialled |
| `http_ingress` (HTTP only) — wildcard DNS + `:443` | `http_ingress` (HTTP only) — wildcard DNS + `:443` |

Switching the site backend (Docker ⇄ Kubernetes) is a settings change with no
re-authoring — a container deployment (image/ports/env) is portable across both.
Flagpost refuses the switch while instances are still live, so their teardown
re-homes with it rather than stranding them.

## Authoring an instanced challenge

On a challenge, staff with `challenge_edit` open its **deployment spec** (the
Deployment section of the [challenge editor](/guides/challenges/#authoring-on-the-manage-route)):

- **Backend** — `docker`/`kubernetes` (whichever the site runs), or
  `shared-static` for an always-on shared endpoint with no lifecycle.
- **Image reference** — e.g. `ghcr.io/you/chal-web:latest`.
- **Exposure / ports**:
  - `tcp` with the container port(s) the image listens on — connection details
    render as `nc <host> <port>`;
  - `http` for a web challenge reached over a per-instance subdomain (the first
    port is the ingress upstream, default 80);
  - `none` for a self-contained challenge with no published endpoint (e.g. one
    that only holds a unique flag, or is visited by a bot).
- **Env** — non-secret environment for the container.
- **Resource limits / lifetime / per-subject cap** — override the site defaults
  as needed.
- **Flag mode** — `static` (the challenge's own flag applies; everyone submits
  the same flag) or `unique_per_instance` (below).

Staff can **test-launch** before publishing and while the competition is *Not
started*; competitors launch, extend and stop from the challenge modal once the
competition is *Running*. Launching is force-disabled in
[demo mode](/deploy/configuration/).

### Unique per-instance flags

Set **flag mode** to `unique_per_instance` and give a **flag template** — a flag
string containing the placeholder `<random>`, e.g. `flag{pwned-<random>}`. At
provision time Flagpost substitutes a fresh random token, injects the rendered
flag into the container **once** (as the `FLAG` environment variable), and stores
only its salted hash on the instance row — the same never-plaintext posture as a
static flag. Staff can't read a live instance's flag; the fix for a lost one is
re-provisioning.

- The challenge needs **no static flag** — grading compares a submission against
  the submitting subject's own live instance flag. (A challenge can't carry both;
  clear the static flag first, or the editor refuses the combination.)
- **Flag sharing is provable and detected.** A wrong submission that matches
  *another* subject's live instance flag emits `challenge.flag_shared_detected`
  for staff and automations (gated on `view_submissions`). There is **no
  automatic penalty** — it's a signal for humans, not an enforcement action.
- **First blood and dynamic decay are unchanged** — they key on which subject
  solved and how many solves exist, not on flag identity.

## The competitor and staff experience

**Competitors** launch, poll, extend and stop *their own* instance from the
challenge modal, and see their running instances with live expiry countdowns.
Connection details are revealed only once the instance is `running`. Launching
requires the competition to be *Running* and the subject to have joined a team
(in team mode).

**Staff** get a running-instances **ops view** (`instance_view`) listing every
live instance with server-resolved challenge and subject labels, expiry, and a
**kill** control (`instance_manage`).

## Guardrails and reaping

Instancing is bounded on several axes so a launch storm or a leaked container
can't exhaust the host:

- **Caps** — per-subject (on the deployment), per-competition
  (`instance_max_alive`), and a **global concurrency ceiling** across all
  competitions (default 100). Hitting a cap is a clean `409`; port-range
  exhaustion is a clean, evented refusal.
- **Spawn rate-limiting** — an optional per-subject/per-competition launch
  throttle (`N` launches per window; `0` disables it). A throttled launch returns
  `429` and emits `challenge.instance_launch_throttled` — again, a signal, not a
  penalty.
- **Reaping** rides the existing scheduler tick — no new process: TTL expiry,
  stuck-provision cleanup, and orphan GC (a container or pod with no live row,
  reaped under a two-tick safety rule; the reaper only ever sees objects Flagpost
  itself labelled, so it can never touch anything else on the host).
- **Lifecycle ties** — launches require the competition `running`; `ended` and
  archival reap and purge instances; a pause blocks new launches but keeps
  existing instances alive.

Per-competition policy (max alive, default session length) lives in Competition
Settings; site defaults and the global ceiling live in the Instances admin panel.

## Portability

A challenge's **deployment spec is authoring content** — it rides the
[platform backup](/admin/backup/) and the
[ctfcli mapping](/reference/ctfcli/), so an instanced challenge moves between
installs intact. **Instances themselves are runtime state and are never
exported.**

## Security posture & threat model

Instancing adds a new class of operator-configured outbound dependency (the
container-runtime endpoint), and it runs hostile code by design. The mitigations
are layered:

- **Least-privilege backend access** — a socket proxy (Docker) or a
  namespace-scoped ServiceAccount (Kubernetes), never host root or cluster admin.
- **App-composed hardened specs** — dropped capabilities, no privilege
  escalation, read-only rootfs, resource caps; authors touch only image + ports.
- **Isolation** — host-firewall egress rules (Docker) or enforced NetworkPolicy
  (Kubernetes), always blocking the cloud metadata IP and the control plane.
- **Hash-at-rest flags** — staff can't read a live flag; the answer to "I lost my
  flag" is "re-provision".

The full trust-boundary analysis is in the platform's
[`THREAT_MODEL.md`](https://github.com/tbcsec/flagpost/blob/main/docs/THREAT_MODEL.md),
and the container-runtime endpoint is documented among Flagpost's outbound
dependencies in
[`PRIVACY.md`](https://github.com/tbcsec/flagpost/blob/main/PRIVACY.md). For a
public or high-value event, run instances on a **separate, sacrificial host** and
prefer Kubernetes with a policy-enforcing CNI for enforced isolation.

## Troubleshooting

- **`privilege_posture` fails** — the endpoint isn't a restricted proxy (a
  dangerous verb returned something other than `403`, or the k8s token is
  over-privileged). Never point Flagpost at a raw `/var/run/docker.sock` or hand
  it a cluster-admin token.
- **`network_isolation` fails (Docker)** — the `flagpost-instances` network
  doesn't exist. Create it (`docker network create flagpost-instances`). Under
  `egress_policy: deny` the leg also *advises* firewall rules — that's a note, not
  a failure.
- **`egress_enforcement` fails (Kubernetes)** — a deny-all pod reached the
  internet, so your CNI isn't enforcing NetworkPolicy. Install Calico or Cilium on
  the challenge nodes.
- **`public_reachable` fails** — the firewall is closed on the port range, or the
  public host is wrong. This is the leg that catches the dead-connection-string
  failure competitors would otherwise hit on event day.
- **`http_ingress` fails** — wildcard DNS doesn't resolve, or the ingress isn't
  answering on `:443`. Check the `*.<base-domain>` record points at the instance
  host and the ingress is up.

## Related

- [Challenges](/guides/challenges/) — authoring, flags and the manage surface.
- [Scaling for large events](/deploy/scaling/) — multi-worker and the scheduler
  the reaper rides.
- [Security notes](/deploy/security/) — the platform's overall hardening posture.
- [ADR-0036](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0036-challenge-instancing-provisioners.md)
  — the full design rationale.
