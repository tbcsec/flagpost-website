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
    image: ghcr.io/tbcsec/flagpost-backend:v1.4.0
    build: !reset null
  frontend:
    image: ghcr.io/tbcsec/flagpost-frontend:v1.4.0
    build: !reset null
```

**Which version am I running?** A release image reports its exact tag; a
source build reports the release it's based on with an `-src` suffix
(e.g. `1.4.0-src`), since `main` accumulates the next version as soon as a
tag is cut.

## Upgrading

Database migrations run automatically when the backend starts, so the
procedure is short:

1. Read the release notes for the versions you're crossing — they call out
   anything upgrade-relevant (v1.2.0, for example, notes that scores
   inflated by the fixed submission race are corrected by a dedupe
   migration, and that reachable deployments must set real object-storage
   credentials or the backend refuses to boot; v1.3.0's migration
   transparently encrypts any stored SMTP password — no action under
   compose, but [running without Docker](/deploy/without-docker/) make
   sure the `SECRET_ENCRYPTION_KEY` or its key file is in place before
   migrations run — and [platform exports](/admin/backup/) taken on
   v1.3.0+ no longer contain the SMTP password, so re-enter it after
   restoring one. v1.4.0's callouts: custom roles that toggled
   per-competition modules through `edit_competition` must now be granted
   the new `manage_modules` permission — built-in roles pick it up
   automatically at startup; the compose now binds the object store's S3 API
   to loopback, so multi-host deployments relying on the previously
   published `:9000` must [publish it deliberately](/deploy/production/#attachments-and-s3_public_endpoint);
   and the new [AI assistants module](/admin/ai/) is off by default —
   enabling it sends chat content to the operator-configured provider
   endpoint. And **v1.7.0** retires MinIO for RustFS and renames every
   `MINIO_*` variable to `S3_*` as a hard break — the backend refuses to
   start while any `MINIO_*` remains set; see [the object-store
   migration](#swapping-minio-for-rustfs-v170) below. **v1.7.1** is a security
   patch that multi-worker deployments in particular should take, and
   **v1.8.0** has a short list of [operator notes](#upgrading-to-v180)).
2. Take a [platform export](/admin/backup/) and a `pg_dump`.
3. Bump the image tag (or `git pull` + `docker compose build` for source
   builds), then `docker compose up -d`.
4. Confirm the version in the admin footer/settings and watch
   `/api/health`.

Skipping versions is fine — migrations apply in sequence.

### Upgrading to v1.8.0

v1.8.0 adds [programming challenges and the code judge](/deploy/code-judge/) —
an optional module that does nothing until you set it up — and includes
security fixes; see the
[security advisories](https://github.com/tbcsec/Flagpost/security/advisories).
For most installs it's the usual procedure above: the database migrations
(the judge's new tables, and the emailed-link change below) run automatically
when the backend starts. Check whether any of these apply to you:

- **Kubernetes challenge instances** — re-apply the RBAC manifest so the
  namespace picks up the updated baseline network policy:
  `kubectl apply -f k8s/instances-rbac.yaml`. Test connection's new *baseline
  policy* check stays red until you do. If your cluster's DNS isn't the
  standard kube-dns pods in `kube-system`, see the note under
  [Bootstrap](/deploy/challenge-instances/#bootstrap).
- **Emailed links** — email-verification and password-reset links sent before
  the upgrade stop working. Users simply request a new one.
- **SAML** — with an identity provider on a different site, Flagpost must now
  be served over **HTTPS**; over plain HTTP, SAML works only with an IdP on the
  same site. See [SAML 2.0 setup](/admin/saml/).
- **Launching uvicorn yourself** — if you start the backend with your own
  command (a custom [Fargate](/deploy/fargate/) task, a
  [non-Docker](/deploy/without-docker/) install) rather than the shipped
  images or compose, add `--ws-max-size 2097152`.
- **Marketplace registry mirrors** — a mirror must serve responses
  uncompressed or with a single gzip or zlib-wrapped deflate encoding; raw
  deflate, Brotli, zstd and stacked encodings are refused. Each artifact must
  also arrive within 200 MiB and five minutes.
- **Delegated administration** — if you hand out custom roles rather than the
  built-in Administrator: changing the mail server settings and exporting user
  accounts now need the full Administrator permission set; each
  [backup](/admin/backup/) section is offered only to holders of the
  permissions its content needs; a delegate can't manage accounts holding
  permissions they lack; and a site-wide role with only global permissions no
  longer lists private competitions it isn't part of. Built-in roles see no
  change. Details in [Users & roles](/admin/users-roles/#delegating-administration).

### Swapping MinIO for RustFS (v1.7.0)

v1.7.0 retires MinIO for **RustFS** as the default object store
([ADR-0041](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0041-object-storage-rustfs-replaces-minio.md)),
with vendor-neutral `S3_*` configuration. It's a **hard break**: the
`MINIO_*` variables were renamed — `MINIO_ROOT_USER`→`S3_ACCESS_KEY`,
`MINIO_ROOT_PASSWORD`→`S3_SECRET_KEY`,
`MINIO_PUBLIC_ENDPOINT`→`S3_PUBLIC_ENDPOINT`, `MINIO_ENDPOINT`→`S3_ENDPOINT`,
`MINIO_REGION`→`S3_REGION`, `MINIO_IAM_AUTH`→`S3_IAM_AUTH` — and the backend
**refuses to start while any `MINIO_*` variable is still set**, printing the
mapping, so a stale `.env` fails safe instead of silently falling back to
default credentials.

Objects are **not** migrated automatically. Do the upgrade in this order:

1. With the old stack still running, copy the objects out — `rclone sync`
   from the old `minio-data` server to a scratch location (or straight to the
   new server once it's up).
2. `docker compose down --remove-orphans`. The old `minio` container is gone
   from the compose file, so a plain `up -d` would leave it running and
   holding port 9000, and `rustfs` would fail to bind.
3. Rename the variables in `.env`, then `docker compose up -d`.
4. Sync the objects into the new `rustfs-data` server, then drop the old
   volume: `docker volume rm <project>_minio-data`.

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
