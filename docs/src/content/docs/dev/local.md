---
title: Local development
description: The dev stack with hot reload, running each side directly, the checks CI runs, and the conventions the codebase enforces.
---

## The dev stack

```bash
docker compose -f docker-compose.dev.yml up --build
# frontend → http://localhost:3000
# backend  → http://localhost:8000  (interactive API docs at /docs)
```

Source is mounted and both sides hot-reload. The default
`docker compose up` (no `-f`) is the **production** stack — use the dev file
for iteration.

## Running each side directly

```bash
# Backend — host Python is often externally-managed, so use a venv
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/alembic upgrade head        # against a reachable Postgres
.venv/bin/uvicorn main:app --reload

# Frontend — requires Node 20+
cd frontend
npm install
npm run dev
```

The test suite (and the repo's own tooling) can run the backend against
SQLite with no infrastructure at all; point `DATABASE_URL` at Postgres when
you want parity with production.

## Before you open a PR

Run what CI runs — all four must pass:

```bash
cd backend  && .venv/bin/pytest        # backend tests (SQLite, no infra)
cd frontend && npm run test            # vitest
cd frontend && npx tsc --noEmit        # type-check
cd frontend && npx eslint .            # lint
```

If the change is user-visible, run it in a browser too — tests alone don't
prove UI behaviour.

## The rules the codebase enforces

These are architectural rules, not preferences — some are enforced by
ESLint:

1. **Every mutation emits an event** using the
   [catalogued vocabulary](/reference/events/) — add the event type to the
   catalogue before emitting it.
2. **Every tenant-scoped query is scoped by `competition_id`** at the
   data-access layer.
3. **Permission checks go through `require_permission`** — never an inline
   role check. Missing permission? Add it to the catalogue first.
4. **One hook module per frontend domain** — components never import the
   API client directly (ESLint-enforced).
5. **Colours and spacing come from design tokens** — no raw hex in
   components (ESLint-enforced, brand mark excepted).
6. **New backend features register through the module loader** — see
   [Developing modules](/dev/modules/).

## Bugs, features, and questions

- **Bug?** Open a [bug report](https://github.com/tbcsec/flagpost/issues/new?template=bug_report.yml)
  (search [existing issues](https://github.com/tbcsec/flagpost/issues) first).
- **Small, well-defined feature idea?** A
  [feature request](https://github.com/tbcsec/flagpost/issues/new?template=feature_request.yml).
- **Big or open-ended idea, or a question?** Start a
  [Discussion](https://github.com/tbcsec/flagpost/discussions) so scope gets
  shaped before it becomes a tracked issue.
- **Security vulnerability?** Never a public issue —
  [private disclosure](https://github.com/tbcsec/flagpost/blob/main/SECURITY.md).

New issues start as `needs-triage`; a maintainer confirms, labels, and — if
it's slated for a release — milestones it onto the public roadmap.

## Reading list

- [`docs/ARCHITECTURE.md`](https://github.com/tbcsec/flagpost/blob/main/docs/ARCHITECTURE.md)
  — the binding technical design. If code and this document disagree, one of
  them is wrong, and that's a bug.
- [`docs/adr/`](https://github.com/tbcsec/flagpost/tree/main/docs/adr) — why
  decisions went the way they did ([index here](/dev/adrs/)).
- [`CONTRIBUTING.md`](https://github.com/tbcsec/flagpost/blob/main/CONTRIBUTING.md)
  — the PR flow. Security issues go through
  [private disclosure](https://github.com/tbcsec/flagpost/blob/main/SECURITY.md),
  never a public issue.
