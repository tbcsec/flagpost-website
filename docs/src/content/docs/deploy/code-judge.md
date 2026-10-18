---
title: Code judge
description: Turn on the runtime behind programming challenges — one Compose overlay, a guided setup in the admin UI, the built-in languages, and how each judging is contained.
---

The **code judge** compiles and runs competitors' programs for
[programming challenges](/guides/programming/). It ships as the optional
**Code Judge** module (`judge`) and is **inert** until an administrator sets
it up: nothing runs, and no other feature depends on it. The design is
recorded in
[ADR-0042](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0042-programming-challenges-code-judge.md).

Each submission runs in a short-lived container with **no network at all**,
on your own Docker host, reached through a least-privilege socket proxy —
never the raw Docker socket. Submitted code and test data live in the object
store the stack already has.

## Turn it on

### 1. Add the overlay

The repository ships the judge's one infrastructure step as a
[Compose overlay](https://docs.docker.com/compose/how-tos/multiple-compose-files/):

```bash
docker compose -f docker-compose.yml -f docker-compose.judge.yml up -d
```

It adds two things:

- **`judge-proxy`** ([tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy))
  in front of the host daemon. It allows only what the judge needs —
  containers, images, `POST`, ping and version — and denies `exec`, volumes,
  build, networks and everything else. It's **published to no host
  interface**: only the backend reaches it, over a private
  `flagpost-judge-control` network.
- **`JUDGE_ENDPOINT_URL`** on the backend, so the admin UI shows the endpoint
  as *Detected from your deployment* and nothing needs typing.

Running [challenge instances](/deploy/challenge-instances/) too? Add both
overlays — each feature keeps its own proxy:

```bash
docker compose -f docker-compose.yml -f docker-compose.instances.yml \
  -f docker-compose.judge.yml up -d
```

### 2. Run the setup in the admin UI

Open **Admin → Site settings → Code judge** (it needs `manage_judge_infra`,
which only the Administrator role holds by default). Setup is three steps:

1. **Connect** — **Check connection** must pass all four checks: *Proxy
   reachable*, *Proxy locked down*, *Judge harness installed* and *Test
   judging ran*. A proxy that isn't locked down would hand submissions a path
   to your server's Docker, so setup won't continue until it is.
2. **Languages** — tick what competitors may submit in (see below). Each
   language's image is downloaded the first time it's used.
3. **Review and enable.**

Once on, the tab shows a summary with **Re-run setup** and **Turn off**.

### 3. Hand over to organisers

The **Code Judge** module is on by default in every competition, so
organisers can start [authoring problems](/guides/programming/) straight
away; they can switch it off per competition under **Settings → Modules**.

## Languages

Nine languages are built in, each on a pinned official image:

| Language | Image | Time multiplier |
| --- | --- | --- |
| C | `gcc:16` | 1.0 |
| C++ | `gcc:16` | 1.0 |
| Rust | `rust:1.98-slim` | 1.0 |
| Go | `golang:1.27` | 1.5 |
| Java | `eclipse-temurin:25-jdk` | 2.0 |
| C# | `mcr.microsoft.com/dotnet/sdk:10.0` | 2.0 |
| JavaScript (Node.js) | `node:24-slim` | 2.0 |
| PyPy 3 | `pypy:3.11-slim` | 2.0 |
| Python 3 | `python:3.14-slim` | 3.0 |

The **time multiplier** scales each problem's time limit for that language,
so a reasonable solution in a slower language isn't punished by a limit tuned
for C. For a strict ICPC-style event with one limit for everyone, set every
multiplier to 1.0. Changing a built-in preset in a later release never alters
a language you already run.

Images are pulled anonymously on first use. On an air-gapped host, or for a
private image, **pre-pull** it on the Docker host the judge uses.

## Advanced settings

Under **Advanced** on the Code judge tab:

- **Judgings at once** — default **1**, the lightest load and the fairest for
  time limits on shared hardware. Raise it only if the queue backs up and the
  host has cores to spare.
- **Default limits** every problem inherits: time 2 s, memory 256 MB, output
  8 MB.
- **Languages** — each language's image, multiplier and on/off state, plus
  **Add custom language** for anything not built in (Kotlin, for example,
  has no official image). A custom language is an image you choose or build,
  a source filename, an optional compile command and a run command. Commands
  are entered one argument per line, and the only
  placeholders are `{source}` (the submitted file) and `{work}` (the scratch
  directory). The judge brings its own harness into the container, so a stock
  image works as is.

:::tip[Timing is good, not finals-grade]
Limits are measured in CPU time, which removes most contention, but a
submission within a few percent of its limit can flip under heavy host load.
Keep **Judgings at once** low and leave headroom over your reference
solutions.
:::

## Where judging runs

- **Single host (the default).** The overlay above is the whole story. The
  Docker host must be **amd64 or arm64** — the backend image carries the
  harness for both and picks the host's.
- **A separate judge host.** For a high-stakes event, run judgings on a box
  apart from the control plane, so competitor code never shares a kernel with
  your database. On that host run the same socket proxy, configured like
  `judge-proxy` in `docker-compose.judge.yml`, reachable **only** on a private
  path from Flagpost (VPC, WireGuard — never the public internet). Leave
  `JUDGE_ENDPOINT_URL` unset and type that address into **Proxy address**.
- **Multi-worker or multi-instance.** Judgings run in the same process as
  the scheduler, so exactly one process judges. On a
  [multi-instance deployment](/deploy/fargate/), that's the scheduler service
  — and since **Check connection** runs in the web tasks, both must be able to
  reach the endpoint.
- **[Without Docker](/deploy/without-docker/#code-judge-harness).** A source
  checkout has to build the harness first.

## How a judging is contained

Every judging gets a fresh container, deleted afterwards:

- **No network** — so unlike instances, there's no challenge network or
  egress firewall to set up.
- **Two users inside the container.** The judge's harness holds the test data
  and the expected answers; the submission runs as a separate, unprivileged
  user with no capabilities, so it can't read the hidden tests, overwrite the
  harness or report its own verdict.
- **Hard limits** on CPU time, memory, output, file size and processes, so a
  runaway program gets a verdict instead of taking the host down.
- **Not in the backup.** The judge's configuration — the endpoint and the
  languages — is deliberately excluded from the
  [platform backup](/admin/backup/), because it names host infrastructure and
  decides what code runs. After restoring onto a new host, re-run the setup.

Residual risks are the operator's to weigh: a container-breakout 0-day defeats
any container posture (hence the separate host above), and the language
images you choose are trusted. The full trust boundary is in
[`docs/THREAT_MODEL.md`](https://github.com/tbcsec/flagpost/blob/main/docs/THREAT_MODEL.md).

## Turning it off

**Turn off** on the Code judge tab stops judging site-wide: new submissions are
refused, and nothing is judged until it's turned back on. Switching the
**module** off for one competition only stops new submissions there — anything
already queued is still judged and scored, the way a flag submitted in time
still counts.
