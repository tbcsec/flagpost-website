---
title: Configuration reference
description: Every environment variable the Flagpost stack reads, what it does, and which ones you must set for production.
---

Configuration lives in `.env` (copied from `.env.example`), read by
`docker-compose.yml`. Defaults run a working local stack on
`http://localhost:8080` with no edits.

## Public origin & TLS

| Variable | Default | Meaning |
| --- | --- | --- |
| `HTTP_PORT` | `8080` | Host port the app is served on for local (non-domain) use. |
| `SITE_ADDRESS` | `:80` | Caddy's site address. Set to your **domain** (`ctf.example.com`) for automatic TLS issuance and renewal; the `:80` default means plain HTTP on the mapped port. |
| `PUBLIC_ORIGIN` | `http://localhost:8080` | The origin browsers use to reach the API. Baked into the frontend at **source-build** time (release images are same-origin and skip this); becomes the backend's allowed CORS origin **and its `PUBLIC_BASE_URL`**, which [OIDC redirect URIs](/admin/sso/) and [SAML ACS/metadata URLs](/admin/saml/) are built from — exactness matters with SSO, for both protocols. |

## Database, cache, storage

Credential variables ship **commented out**: compose falls back to
well-known development values so a local `docker compose up` needs no
config, but those fallbacks are published in the repo — set real values
(`openssl rand -hex 24`) for anything reachable from outside your machine.

| Variable | Fallback | Meaning |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `flagpost` / `flagpost` / `flagpost` | Postgres credentials; compose derives the backend's `DATABASE_URL` from them. |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `rustfsadmin` / `rustfsadmin` | Object-storage credentials — one pair, passed to both the RustFS service and the backend's S3 client. **The backend refuses to boot on these defaults when the deployment looks reachable** — see [Production deployment](/deploy/production/#1-configure-env). Renamed from `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` in v1.7.0 ([ADR-0041](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0041-object-storage-rustfs-replaces-minio.md)); any `MINIO_*` variable left set makes the backend refuse to start. |
| `S3_PUBLIC_ENDPOINT` | `localhost:9000` | The host **browsers** hit for signed attachment downloads — must be reachable by competitors. See [Production deployment](/deploy/production/#attachments-and-s3_public_endpoint). |
| `S3_REGION` | `us-east-1` | SigV4 region for the object-storage client. Set it to your bucket's region so signed URLs sign **offline**; unset, the client makes a `GetBucketLocation` call at sign time, which can't reach a browser-only endpoint. Relevant when the store is real S3. |
| `S3_IAM_AUTH` | `false` | Authenticate to object storage with an **AWS IAM role** (ECS task role / EC2 instance profile) resolved from the metadata endpoint, instead of static keys — no long-lived storage secret to distribute. Only meaningful against real S3; see [Deploying to AWS (Fargate + ALB)](/deploy/fargate/). |

## Update check

| Variable | Default | Meaning |
| --- | --- | --- |
| `UPDATE_CHECK_URL` | the project endpoint | Where the once-daily, version-only update check calls home ([PRIVACY.md](https://github.com/tbcsec/flagpost/blob/main/PRIVACY.md) documents exactly what's sent — the version number, nothing else). Set **empty** to disable outright for air-gapped installs; administrators can also toggle it off in Admin → Settings. See [Releases & upgrades](/deploy/upgrades/#the-update-check). |

## Metrics

Off by default (v1.6.0). The Prometheus `/metrics` endpoint **404s until
`METRICS_ENABLED=true`**, and enabling it demands a gate — see
[Observability](/deploy/observability/) for the scrape config and the
exposed metric families.

| Variable | Default | Meaning |
| --- | --- | --- |
| `METRICS_ENABLED` | `false` | Master switch for the `/metrics` endpoint. While `false` the route is fully inert (**404**, not merely unauthorized). |
| `METRICS_TOKEN` | *(empty)* | Static bearer secret a scraper presents in `Authorization: Bearer …`; compared **constant-time**. Empty means no token gate. |
| `METRICS_ALLOWED_IPS` | *(empty)* | Comma-separated IPs/CIDRs allowed to scrape without a token (bare IP → `/32` or `/128`; malformed entries are dropped). Empty means no IP gate. |

The gate is **OR** at scrape time: a request is authorized if it presents
the matching token **or** its client IP is allowlisted (so a
trusted-network scraper needs no token, and a token-holder works from any
IP).

:::caution[Enabling without a gate refuses startup]
`METRICS_ENABLED=true` with **both** `METRICS_TOKEN` and
`METRICS_ALLOWED_IPS` empty raises a config error and **the app will not
boot** — the endpoint must never be public. Set at least one.
:::

## Auth

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | *(unset)* | Signing secret for access tokens. Unset, the app **derives a strong per-install secret and persists it** to the backend data volume (survives restarts). Set it explicitly for production, and always when running multiple backend hosts. |
| `SECRET_ENCRYPTION_KEY` | *(unset)* | Encryption key for secrets stored **retrievably** in the database — SSO provider secrets and, since v1.3.0, the SMTP password ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md)). Unset, a per-install key is derived and persisted to the backend data volume, same pattern as `JWT_SECRET`. Set it explicitly for production and always with multiple backend hosts — it must be a **Fernet key** (32 url-safe base64 bytes: `python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'`), not an arbitrary string. **Losing the key is unrecoverable** — affected secrets must be cleared and re-entered. |

## Scaling & tuning

| Variable | Default | Meaning |
| --- | --- | --- |
| `WEB_CONCURRENCY` | `1` | Backend worker processes (v1.4.0). `1` = single process, no Redis needed for realtime. `>1` switches the real-time layer to the Redis cross-worker relay + presence (**requires** `REDIS_URL` — the backend refuses to boot multi-worker without it) and starts the singleton scheduler sidecar. The one scaling variable plumbed through `.env` by compose. See [Scaling for large events](/deploy/scaling/). |
| `MULTI_INSTANCE` | `false` | Declares that this backend runs as **more than one container/host behind a load balancer** ([ADR-0031](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0031-multi-instance-deployment.md)). Forces the cross-process realtime layer (Redis relay + shared presence) on regardless of local worker count — without it, N single-worker tasks each think they're the whole deployment and silently stop relaying. Requires `REDIS_URL`. See [Deploying to AWS (Fargate + ALB)](/deploy/fargate/). |
| `SCHEDULER_ENABLED` | `true` | Whether **this** process/container may run the singleton background scheduler (time-trigger automations, report and certificate-export jobs, retention purge, the update check). Set `false` on the web tasks of a multi-instance deployment, where one dedicated `python -m scheduler` service is the scheduler; `python -m scheduler` itself ignores the flag. |

The finer-grained knobs (DB pool sizes and the multi-worker connection
budget, the bounded Redis client pool, presence heartbeat/TTL, WebSocket
handshake rate limit, scoreboard cache TTL, argon2 parameters) are read
by the backend process directly — under compose, add them to the backend
service's environment. They're tabulated with their defaults on the
[scaling page](/deploy/scaling/#tuning-knobs). One more in that family:
`MAX_REQUEST_BODY_BYTES` (default 100 MiB, v1.4.0) — an outermost
middleware rejects larger request bodies with 413 before any route code
runs; raise it for very large
[platform-export restores](/admin/backup/).

## Demo mode

| Variable | Default | Meaning |
| --- | --- | --- |
| `DEMO_MODE` | *(unset)* | For **public demo instances only** (it's what runs demo.flagpost.io). Seeds well-known accounts (`admin` / `judge` / `participant`, password `password`) and a sample competition, shows a "resets hourly" banner and a credentials card on the login page, and disables the outbound automation actions (`webhook`, `send_email`). |

:::danger[Never enable on a real deployment]
Demo mode seeds publicly-known credentials. The hourly reset is external —
recreate the stack on a schedule (`docker compose down -v && docker compose up -d`).
:::

## Set inside the app, not the environment

- **SMTP** (host, port, credentials, sender) — configured at Admin → Site
  settings and stored in the database, with environment variables as a
  fallback. Powers automation emails and password resets.
- **Registration policy, branding, palettes** — all
  [site settings](/admin/site-settings/).

## Variables the compose file manages for you

You'll see these on the backend service; they're derived and rarely need
touching directly: `DATABASE_URL`, `REDIS_URL`, `S3_ENDPOINT`
(`rustfs:9000` under compose), `CORS_ORIGINS`, `JWT_SECRET_FILE`,
`SECRET_ENCRYPTION_KEY_FILE`.
Running [without Docker](/deploy/without-docker/), you set them yourself.
