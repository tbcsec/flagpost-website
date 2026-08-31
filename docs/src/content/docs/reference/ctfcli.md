---
title: ctfcli YAML format
description: The challenge import/export format — zip layout, the field map, and what round-trips versus what is deliberately omitted.
---

Flagpost bulk-moves challenges in the
[ctfcli](https://github.com/CTFd/ctfcli) `challenge.yml` format used across
the CTFd ecosystem, so existing challenge repositories import directly and
Flagpost exports drop into ctfcli-based workflows.

## Zip layout

```
export.zip
├── web-heap-of-trouble/
│   ├── challenge.yml
│   └── files/
│       └── handout.tar.gz
├── crypto-rsamble/
│   └── challenge.yml
└── …
```

One directory per challenge (slugged from the title), a `challenge.yml`
inside, attachment files alongside it.

## Field map

| YAML field | Flagpost meaning |
| --- | --- |
| `name` | Title (import skips titles that already exist) |
| `category` | Category — created in the competition if missing |
| `description` | Challenge body (converted between rich text and plain text) |
| `value` | Points (initial value for dynamic scoring) |
| `type: dynamic` + `extra` | Dynamic decay scoring — `extra` carries the minimum value and decay parameters |
| `flags` | Static flags (plaintext in YAML, **hashed on import**) and regex flags |
| `tags` | Challenge tags — unioned into the competition's managed vocabulary |
| `extra.difficulty` | Difficulty tier |
| `hints` | Hints (with costs) |
| `files` | Attachment file references within the zip |
| `state` | Visible/hidden state |
| `connection_info` | Where the live service lives — a URL, `host:port`, or short instructions. A **top-level** key (not under `extra`), mirroring the ctfcli/CTFd spec verbatim, so a real `challenge.yml` round-trips. Optional, free-form; import coerces it to a string and clamps to 500 characters |
| `prerequisites` | Prerequisites, referenced **by challenge title** and resolved in a second pass after all challenges import |
| `extra.deployment` | Instancing spec for [on-demand challenge instances](/deploy/challenge-instances/) — see below. Optional; only present on instanced challenges |

## Deployment block (instanced challenges)

Challenges wired for [on-demand instances](/deploy/challenge-instances/) carry
their deployment spec as an **`extra.deployment`** mapping — a Flagpost
extension under `extra`, alongside `extra.difficulty`. It's optional: a real
ctfcli/CTFd bundle without it round-trips untouched, and a challenge with no
instancing simply omits it.

Export writes only the authoring fields — never a rendered flag or a
credential, neither of which lives on the deployment. Import validates the
block the same way the challenge editor does; a malformed spec is reported
per-challenge (`<title>: deployment: <error>`) and skips **that** deployment
without failing the wider import.

```yaml
extra:
  difficulty: hard
  deployment:
    backend: docker          # docker | kubernetes | shared-static
    exposure: tcp            # tcp | http | none
    flag_mode: static        # static | unique_per_instance
    image: registry.example/pwn/heap:latest
    ports: [1337]
    env:
      DIFFICULTY: hard
    resource_limits: { cpu: 1.0, memory_mb: 512, pids: 256 }
    lifetime_s: 3600
    per_subject_cap: 1
    flag_template: "flag{prefix-<random>}"
```

| Deployment field | Meaning |
| --- | --- |
| `backend` | Provisioner kind: `docker`, `kubernetes`, or `shared-static`. Defaults to `docker` on import |
| `exposure` | How competitors reach the instance: `tcp`, `http`, or `none`. Defaults to `tcp` on import |
| `flag_mode` | `static` (the challenge's ordinary flag config applies) or `unique_per_instance` (a fresh flag rendered per instance). Defaults to `static` on import |
| `image` | Container image reference for the `docker`/`kubernetes` backends. Maps to the deployment's image reference (written as `image`, not `image_ref`) |
| `ports` | Container ports to expose, e.g. `[1337]` |
| `env` | Non-secret environment for the instance (a string→string mapping). The unique flag is injected by the provisioner at create time and is never written here |
| `manifest` | Kind-specific extra config — a Kubernetes manifest fragment, or the fixed endpoints of a `shared-static` deployment. Opaque mapping |
| `resource_limits` | Per-challenge overrides of the site-level `cpu`/`memory_mb`/`pids` defaults. Omitted when the defaults apply |
| `lifetime_s` | Instance lifetime override in seconds. Omitted when the competition's session length applies |
| `per_subject_cap` | Concurrent instances allowed per subject. Omitted from export when it's the default of `1` |
| `flag_template` | In `unique_per_instance` mode, the template rendered at provision time — it must contain the `<random>` placeholder, e.g. `flag{prefix-<random>}`. Absent in `static` mode |

The container-runtime backend is otherwise configured **site-wide**, not per
challenge — see [challenge instances](/deploy/challenge-instances/).

## Semantics worth knowing

- **Import is additive** (`challenge_create`, 50 MB zip cap): existing
  titles are skipped, never overwritten. There's no per-row event spam — a
  bulk import is one authoring operation.
- **Static flag plaintexts don't export.** Flagpost stores only salted
  hashes, so it cannot write your plaintext back out — keep the authoring
  repository as the source of truth. Regex flags round-trip fully. Importing
  YAML that contains plaintext static flags hashes them on the way in, so
  **authoring → import is lossless**.
- Prerequisites that name a title not present in the zip (or the
  competition) simply don't attach — check the challenge editor after
  importing chained content.

## Migrating from CTFd

If your challenges already live in a ctfcli-format repository, zip the
challenge directories and import. If they live only inside a CTFd instance,
pull them with `ctf challenge pull` / your existing ctfcli workflow first,
then zip and import the result.
