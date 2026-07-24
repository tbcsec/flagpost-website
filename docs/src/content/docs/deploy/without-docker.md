---
title: Running without Docker
description: Run the backend and frontend directly on a host — process model, environment, reverse-proxy requirements, and the same-origin contract.
---

Docker Compose is the supported happy path, but nothing in Flagpost requires
it. You need: **Python 3.12+**, **Node 20+**, and reachable **PostgreSQL**,
**Redis**, and an **S3-compatible object store** (MinIO works well).

## Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Environment (see the configuration reference):
export DATABASE_URL="postgresql+asyncpg://user:pass@dbhost:5432/flagpost"
export REDIS_URL="redis://redishost:6379/0"
export MINIO_ENDPOINT="miniohost:9000"
export MINIO_PUBLIC_ENDPOINT="files.example.com:9000"
export MINIO_ACCESS_KEY="…" MINIO_SECRET_KEY="…"
export CORS_ORIGINS="https://ctf.example.com"
export JWT_SECRET="a-long-random-value"

.venv/bin/alembic upgrade head     # migrate + seed built-in roles
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

Run **exactly one process** — no `--reload`, no multi-worker `uvicorn`, no
horizontal replicas. The WebSocket layer and event bus are in-process by
design; a second worker would split the real-time state.

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
