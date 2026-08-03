---
title: Releases & upgrades
description: How Flagpost versions and ships — tagged releases, pinned GHCR images, the daily update check, security advisories, and the upgrade procedure.
---

Flagpost ships as **tagged releases** with generated notes and, since
v1.1.1, **pinned container images** (v1.0.0, the initial public release,
shipped in July 2026). Follow
[Releases](https://github.com/tbcsec/flagpost/releases) for what changed;
security fixes are additionally published as
[GitHub Security Advisories](https://github.com/tbcsec/flagpost/security/advisories).

## Versioned images (pull instead of build)

Every release publishes reproducible images to GHCR:

```
ghcr.io/tbcsec/flagpost-backend:vX.Y.Z    (also :latest)
ghcr.io/tbcsec/flagpost-frontend:vX.Y.Z   (also :latest)
```

The release frontend is built in **same-origin mode** — API and WebSocket
calls resolve against whatever origin serves the page — so one image works
behind any single-origin proxy with **no baked-in domain and no
`PUBLIC_ORIGIN` rebuild**. Point the compose `backend`/`frontend` services
at the images (a two-line override) and upgrading becomes changing a tag:

```yaml
# docker-compose.override.yml
services:
  backend:
    image: ghcr.io/tbcsec/flagpost-backend:v1.2.0
    build: !reset null
  frontend:
    image: ghcr.io/tbcsec/flagpost-frontend:v1.2.0
    build: !reset null
```

**Which version am I running?** A release image reports its exact tag; a
source build reports the release it's based on with an `-src` suffix
(e.g. `1.2.0-src`), since `main` accumulates the next version as soon as a
tag is cut.

## Upgrading

Database migrations run automatically when the backend starts, so the
procedure is short:

1. Read the release notes for the versions you're crossing — they call out
   anything upgrade-relevant (v1.2.0, for example, notes that scores
   inflated by the fixed submission race are corrected by a dedupe
   migration, and that reachable deployments must set real MinIO
   credentials or the backend refuses to boot).
2. Take a [platform export](/admin/backup/) and a `pg_dump`.
3. Bump the image tag (or `git pull` + `docker compose build` for source
   builds), then `docker compose up -d`.
4. Confirm the version in the admin footer/settings and watch
   `/api/health`.

Skipping versions is fine — migrations apply in sequence.

## The update check

Once every 24 hours the backend makes exactly one outbound request:

```
GET https://updates.flagpost.io/v1/check?version=<your-version>
 →  {"latest": "x.y.z"}
```

**The version number is the entire payload** — no install identifier, no
hostname, no counts, no personal data; there is no field for any of it. The
response drives the admin "update available" notice, and counting the
requests is the project's only measure of how many deployments exist
(deliberately without unique-install tracking, which would require an
identifier). The full design is in
[PRIVACY.md](https://github.com/tbcsec/flagpost/blob/main/PRIVACY.md).

It never renders remote content (only a version string is compared), never
fails loudly (air-gapped is a normal condition, not an error), and never
runs in demo mode.

**Turning it off** is a supported configuration, not a grudging one:

- **Admin → Settings** — toggle *update checks* off, or
- set `UPDATE_CHECK_URL=` (empty) in the environment, and an air-gapped
  install never attempts the call at all.

## Staying informed without the check

If you disable it, watch the GitHub
[Releases feed](https://github.com/tbcsec/flagpost/releases.atom) and
[security advisories](https://github.com/tbcsec/flagpost/security/advisories)
— security releases (like v1.2.0) are the ones not to sit on.
