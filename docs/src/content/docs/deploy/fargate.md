---
title: Deploying to AWS — ECS Fargate + ALB
description: Run Flagpost as N backend tasks on AWS ECS Fargate behind an Application Load Balancer, with RDS, ElastiCache, and S3 — the multi-instance topology from ADR-0031.
---

The [single-command Compose stack](/deploy/production/) runs Flagpost on one
box; [multi-worker](/deploy/scaling/) scales it across cores on that box.
This page goes one step further: **N backend tasks across many hosts** on
[AWS ECS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/userguide/what-is-fargate.html)
behind an [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html),
with the stateful pieces handed to managed services. The realtime layer
(Redis broadcast relay + heartbeat-TTL presence, [ADR-0025/0026](/dev/adrs/))
already works across processes; ADR-0031 makes N containers a **declared,
loudly-validated** topology rather than an inferred one.

## Architecture

Each Compose service maps to an AWS building block:

| Compose service | AWS |
| --- | --- |
| `caddy` | **Recommended:** keep Caddy as a small ECS service between the ALB and the app services — zero config drift, and it ships the repo's CSP/HSTS/security headers. **Or:** ALB path routing (below), and you replicate those headers yourself. |
| `frontend` | ECS Fargate service, N stateless tasks |
| `backend` | ECS Fargate service, N tasks (the **web** role, below) |
| *(new)* scheduler | ECS Fargate service, **exactly 1 task** — `python -m scheduler` |
| `postgres` | RDS for PostgreSQL |
| `redis` | ElastiCache for Redis — **required** here (cross-task broadcasts, presence, rate limits), not optional |
| `rustfs` | An S3 bucket (pre-created; S3 Block Public Access **on** — presigned URLs still work) — on AWS you point the S3 client at the bucket and run no RustFS container |

**The front door — two options.** Keeping **Caddy** as a tiny ECS service is
the low-drift choice: it already emits the security headers Flagpost expects
(HSTS, `nosniff`, frame options, CSP) straight from the repo
[`Caddyfile`](https://github.com/tbcsec/flagpost/blob/main/Caddyfile), and the
[same-origin contract](/deploy/without-docker/#the-reverse-proxy-contract) is
unchanged. Alternatively, let the **ALB** do the routing — `/api/*` and
`/ws/*` to the backend target group, everything else to the frontend target
group — but then those security headers become your responsibility to
reproduce.

## One image, three roles

The backend image serves three roles, selected by command and environment.

**Web tasks (N of them).** Override the image's entrypoint and run uvicorn
directly:

```
uvicorn main:app --host 0.0.0.0 --port 8000 --workers <vCPU>
```

with `SCHEDULER_ENABLED=false` and `MULTI_INSTANCE=1`. Bypassing the stock
[`docker-entrypoint.sh`](https://github.com/tbcsec/flagpost/blob/main/backend/docker-entrypoint.sh)
is deliberate: it runs `alembic upgrade head` on every start (N tasks booting
together would race the migration) and starts a scheduler sidecar (you run the
scheduler as its own service instead). Set `WEB_CONCURRENCY` to the same
worker count you pass `--workers` — the app reads the env var, not the flag,
to size its pools.

**Scheduler task (exactly one).** Command `python -m scheduler`, with
`MULTI_INSTANCE=1` so its broadcasts relay to the web tasks. It **ignores**
`SCHEDULER_ENABLED` — running it *is* the opt-in. This is the single process
that fires automation time-triggers, certificate exports, report renders,
retention, and the daily update check.

:::danger[Never run more than one scheduler]
Job pickup has no cross-process locking — the topology guarantees exactly one
scheduler instead. Two scheduler tasks **double-fire every automation and
webhook and render every job twice.** Pin its desired count to 1 and never
autoscale it.
:::

**Migration task (one-off per deploy).** Command `alembic upgrade head`, run
to completion — an `aws ecs run-task` standalone task or a pipeline step —
**before** rolling the web and scheduler services. Migrations move out of
instance startup precisely because N tasks starting at once would race them.

## Backend environment

| Variable | Value / note |
| --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://…` → your RDS endpoint |
| `REDIS_URL` | `redis://…` → ElastiCache. **Required** — startup fails loudly without it when `MULTI_INSTANCE=1`. |
| `MULTI_INSTANCE` | `1` on **every** web task *and* the scheduler task |
| `SCHEDULER_ENABLED` | `false` on web tasks |
| `WEB_CONCURRENCY` | ≈ task vCPU (match `--workers`) |
| `S3_ENDPOINT` | `s3.<region>.amazonaws.com` |
| `S3_SECURE` / `S3_REGION` | `true` / the bucket's region. Set the region so presigned URLs are signed **offline** — without it the client makes a location call at sign time. |
| `S3_BUCKET` | the bucket name |
| `S3_IAM_AUTH` | `true` to authenticate with the ECS **task role** (recommended — no static keys anywhere). If unset/false: `S3_ACCESS_KEY` / `S3_SECRET_KEY` from Secrets Manager. |
| `S3_PUBLIC_ENDPOINT` | leave **unset** — S3 is browser-reachable itself, so the internal and public endpoints are the same |
| `JWT_SECRET` | explicit, from Secrets Manager — Fargate storage is ephemeral, so all tasks must share one value rather than each deriving its own |
| `SECRET_ENCRYPTION_KEY` | same — and it must be a [Fernet key](/deploy/without-docker/), not an arbitrary string |
| `PUBLIC_BASE_URL` / `CORS_ORIGINS` | the public origin, e.g. `https://ctf.example.org` |
| `REFRESH_COOKIE_SECURE` | `true` |
| SMTP vars | if outbound email is wanted |

**Task-role IAM policy** (when `S3_IAM_AUTH=true`). On Fargate, EC2
instance profiles aren't available to containers — the
[ECS **task role**](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
is *"required when your application accesses other AWS services, such as
Amazon S3,"* and the AWS SDK inside the container fetches auto-refreshing
temporary credentials from it through the container credential provider. No
long-lived storage secret to distribute. Grant the task role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-flagpost-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-flagpost-bucket"
    }
  ]
}
```

`s3:ListBucket` covers the startup bucket check. This is the **task role**
(your application's AWS identity), distinct from the **task execution role**,
which only pulls the image and ships logs.

## Frontend

The frontend bakes `NEXT_PUBLIC_API_URL` at **build** time — it's compiled
into the client bundle, so it can't be set as a task environment variable.
Build the image per environment with the public origin (the same mechanism as
the repo's `demo-images.yml` workflow), and point it at your public origin,
not the backend's internal address.

## The load balancer

- **HTTPS listener** with an ACM certificate; **target type `ip`.** AWS
  requires this for Fargate: *"for tasks using the `awsvpc` network mode…
  you must choose `ip` as the target type, not `instance`"* — each task has
  its own elastic network interface, and ECS registers and deregisters those
  IPs with the target group as tasks start and stop. Use a
  [unique target group per service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html).
- **No sticky sessions.** ADR-0031 rejects them deliberately, and the ALB
  default is already off — sockets pin to a task naturally, and everything
  shared lives in Postgres and Redis, so there's nothing to pin a session to.
- **Idle timeout.** The ALB's
  [default is 60 seconds](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#load-balancer-attributes);
  an idle WebSocket carries no traffic and would be culled once a minute. The
  v1.5.0+ client sends an application-level keepalive **every 30 s**, so the
  60 s default already holds sockets open — bump it to **120 s+** for margin.
- **Deregistration delay.** AWS
  [defaults to 300 s](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html#target-group-attributes);
  a deregistering task enters `draining` until in-flight requests finish. Set
  it to **60–120 s** so deploys drain long-lived WebSockets promptly —
  clients reconnect automatically with jittered backoff.
- **Health checks.** Backend target group → `GET /api/health` (200 once
  migrated and serving); frontend → `/` (or `/login`). A task that fails the
  check is stopped and replaced.

## Networking

Run **all tasks in private subnets.** They need outbound (NAT) egress for the
operator-configured integrations that reach the public internet:
[SMTP](/admin/site-settings/#operational-settings),
[webhooks](/reference/automations/), your
[OIDC/SAML IdP](/admin/sso/), and the daily version-only
[update check](/deploy/upgrades/#the-update-check) — the full outbound
inventory is in
[PRIVACY.md](https://github.com/tbcsec/flagpost/blob/main/PRIVACY.md).

Add an **[S3 gateway VPC endpoint](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)**
so object-storage traffic stays in-VPC: it lets tasks *"access Amazon S3 from
your VPC, without requiring an internet gateway or NAT device… and with no
additional cost,"* via a route-table entry. Create it in the same Region as
the bucket.

## Scaling

- **Frontend** — stateless; scale freely on CPU or request count.
- **Backend** — scale on CPU or ALB active connection count. Mind the
  **database connections:** each task holds a Postgres pool (defaults
  `DB_POOL_SIZE` 30 + `DB_MAX_OVERFLOW` 30 = up to 60 per task; a task running
  multiple in-task workers splits `DB_CONNECTION_BUDGET` across them — see the
  [scaling tuning table](/deploy/scaling/#tuning-knobs)). **N tasks must fit
  within RDS `max_connections`** — tune the pool envs down per task, or front
  RDS with **RDS Proxy**.
- **Scheduler** — always exactly one task. Do not autoscale it (see the
  warning above).

**Bounded degradations at N tasks** (by design, none affect correctness):
per-process caches mean up to **~5 s** cross-task scoreboard-cache skew (TTL
backstop), the public spectator/insights endpoints are memoised per task
(recomputed N×), and activity-burst coalescing is per task (a mass solve can
produce up to N coalesced pings instead of one).

## Before a high-stakes event

:::note[Supported, but not yet load-proven]
ADR-0025/0026's load tests ran on a **single host**. The N-container topology
is supported and loudly validated, but its scale behaviour hasn't been
exercised end to end. Before you host a high-stakes competition on it, do a
dry run: **two tasks behind the ALB, kill one mid-event, and watch the
scoreboard relay, presence, keepalive, and client reconnect** all recover.
:::
