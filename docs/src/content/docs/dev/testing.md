---
title: Testing
description: The pytest and Vitest stacks, the SQLite trade-off, drift tests, and the migration rules that keep Postgres happy.
---

The testing approach was settled early
([ADR-0006](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0006-testing-stack.md))
and optimises for a suite anyone can run with **zero infrastructure**.

## Backend — pytest

```bash
cd backend && .venv/bin/pytest
```

- **pytest + pytest-asyncio**, calling routes through httpx's ASGI
  transport — real request/response cycles, no server process.
- **SQLite (aiosqlite)** as the test database: the suite builds the schema
  from `Base.metadata` and seeds the same role specs the migrations use.
  No Postgres, Redis, or MinIO needed.
- Test fixtures seed an admin account (`admin@example.com` / `changeme`) —
  **fixtures only**: production installs have
  [no seeded credentials](/admin/setup/).
- The event bus's background tasks are drained between tests so
  fire-and-forget automation work can't leak across the per-test schema.

### The SQLite trade-off

Because tests build schema from metadata, **migrations are not exercised by
the suite** — and SQLite silently accepts SQL that Postgres rejects (e.g.
integer literals for booleans). Before shipping a migration, boot the real
stack at least once:

```bash
docker compose up --build   # alembic upgrade head runs against Postgres
```

Migration rules: `YYYY-MM-DD_<revid>_<desc>.py`, one migration per PR, never
hand-edit a migration that has been applied anywhere.

## Frontend — Vitest

```bash
cd frontend && npm run test
```

Vitest + Testing Library + jsdom for components and the pure logic modules
(the automation builder's serialization and the dashboard layout math are
fully unit-tested, deliberately kept as pure functions).

Type-checking and linting run separately and are part of CI's definition of
green:

```bash
npx tsc --noEmit && npx eslint .
```

## Drift tests

Where a UI is generated from a backend catalogue, a test pins the two
together — the automation action descriptors must match the executor
registry, and every triggerable event must carry a trigger-permission
mapping. If you extend a catalogue, the drift test tells you what else to
update. Copy this pattern for anything similar you build.
