---
title: Running without Docker
description: Run the backend and frontend directly on a host — process model, environment, reverse-proxy requirements, and the same-origin contract.
---

Docker Compose is the supported happy path, but nothing in Flagpost requires
it. You need: **Python 3.12+** and **Node 20+** (the release images run
Python 3.14 and Node 26, which is what CI tests), plus reachable
**PostgreSQL**, **Redis**, and an **S3-compatible object store** (RustFS
is the stack's bundled default; any S3-compatible store works).

## Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Environment (see the configuration reference):
export DATABASE_URL="postgresql+asyncpg://user:pass@dbhost:5432/flagpost"
export REDIS_URL="redis://redishost:6379/0"
export S3_ENDPOINT="storagehost:9000"
export S3_PUBLIC_ENDPOINT="files.example.com:9000"
export S3_ACCESS_KEY="…" S3_SECRET_KEY="…"
export CORS_ORIGINS="https://ctf.example.com"
export PUBLIC_BASE_URL="https://ctf.example.com"   # OIDC redirect + SAML ACS URLs build from this
export JWT_SECRET="a-long-random-value"
# Encrypts stored SSO/SMTP secrets (ADR-0020) — must be a Fernet key, not an arbitrary string:
export SECRET_ENCRYPTION_KEY="$(python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"

.venv/bin/alembic upgrade head     # migrate + seed built-in roles
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

:::note[Reports need WeasyPrint's system libraries]
Generating [post-event reports](/guides/reports/) renders PDFs through
WeasyPrint, which relies on native libraries the pip install won't pull
in — install them at the OS level (Debian/Ubuntu package names shown):
`libpango-1.0-0`, `libpangoft2-1.0-0`, `libcairo2`,
`libgdk-pixbuf-2.0-0`, and `shared-mime-info`, plus a DejaVu font as a
fallback face. The official Docker image already bundles all of these; a
source or native install must add them before reports will render.
:::

A single process (the default) needs nothing extra — just no `--reload`.
Since **v1.4.0** [multi-worker uvicorn on one host](/deploy/scaling/) is
supported, with three things mandatory:

1. `export WEB_CONCURRENCY=N` **and** pass the same N to
   `uvicorn --workers N` — the **env var**, not the flag, is what the app
   reads. If they disagree (say `--workers 4` with `WEB_CONCURRENCY`
   unset), no cross-worker relay attaches: broadcasts reach only each
   socket's own worker, presence fragments, and the scheduler fires in
   every worker.
2. `REDIS_URL` must be set — the app refuses to boot multi-worker
   without it.
3. Run the singleton scheduler as its own process with the same
   environment: `.venv/bin/python -m scheduler` (from `backend/`) —
   under multi-worker the web workers deliberately skip the in-process
   scheduler, so without the sidecar timed automations, the daily update
   check, and retention never fire.

Size Postgres to match: each worker's pool is
`DB_CONNECTION_BUDGET // N` plus half that as overflow (budget default
100) — the Docker stack raises Postgres to `max_connections=200` for the
same reason. Multi-machine replicas remain unsupported either way.

## Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL="https://ctf.example.com" npm run build
npm run start        # serves on :3000
```

`NEXT_PUBLIC_API_URL` is compiled into the client bundle — rebuild to change
it. It should be your **public origin**, not the backend's internal address.

## The reverse proxy contract

Put both services behind one TLS-terminating proxy on a **single origin**,
mirroring the stock Caddyfile:

- `/api/*` → backend (`:8000`)
- `/ws/*` → backend, **with WebSocket upgrade support**
- everything else → frontend (`:3000`)

Same-origin is what keeps auth cookies and WebSocket calls simple — don't
split the API onto its own subdomain. Bring over the security headers from
the repo's [`Caddyfile`](https://github.com/tbcsec/flagpost/blob/main/Caddyfile)
(HSTS, `nosniff`, frame options, CSP) if your proxy doesn't add its own.

## Health

`GET /api/health` returns 200 once migrations have applied and the app is
serving — gate your process manager or load balancer on it.
