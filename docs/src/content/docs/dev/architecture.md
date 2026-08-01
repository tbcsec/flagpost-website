---
title: Architecture overview
description: The kernel/module split, the event-driven core, tenancy, the real-time layer, and how the repository is organised.
---

This is the developer's orientation tour. The binding, exhaustive version is
[`docs/ARCHITECTURE.md`](https://github.com/tbcsec/flagpost/blob/main/docs/ARCHITECTURE.md)
in the platform repository — 15 sections, each pattern specified before it
was built.

## The three tiers

**Kernel** — never optional, no manifest, no toggle: auth & RBAC, the
competition entity and tenancy scoping, the event bus, and the module loader
itself. Everything else is built on these.

**Required core** — what makes the platform a CTF tool at all: challenges,
scoring/scoreboard, hints, tickets, announcements, notifications, dashboard,
collab notes, users, roles, SSO, setup, site settings, audit log, teams, and
the competitions module itself — sixteen modules. Organised as modules
(same registration path as everything else) but not user-toggleable.

**Optional modules** — currently **Automations**, **Feedback**, and
**Analytics**: enabled by default, toggleable per competition. Marketplace /
third-party modules are a future concern with an explicit sandboxing
question to answer first — today's module system runs trusted, in-repo code.

## The event-driven core

Every mutation emits a `<entity>.<verb>` event through an async in-process
bus. Consumers subscribe independently — core code never knows who's
listening:

```
core mutation ─▶ event bus ─┬─▶ audit log        (synchronous lane)
                            ├─▶ WS broadcasts    (synchronous lane)
                            ├─▶ automation engine (background lane)
                            └─▶ notifications
```

Dispatch has **two lanes** (ADR-0012): foreground handlers are awaited
before the request returns (the audit log is lossless by construction);
`background=True` handlers are fire-and-forget so a slow webhook can't block
a flag submission. Handlers are tagged with their owning module and fail in
isolation.

## Tenancy

Every tenant-scoped table carries `competition_id`, enforced at the
data-access layer rather than per-endpoint discipline. Cross-competition
reads exist only behind explicit global permissions (the admin overview).
One deployment, many isolated competitions.

## RBAC

Permissions are a
[catalogued list](/reference/permissions/) checked by one shared
`require_permission` dependency; roles are data; system roles re-sync from
the catalogue at startup. Identity is username-first with optional email —
arriving via local login, [OIDC SSO](/admin/sso/), or a personal API token,
all of which resolve to the same `current_user` and the same session
contract. Sessions are short-lived JWTs plus rotating hashed refresh
sessions; secrets follow ADR-0020 (hash what's only verified, encrypt what
must be retrieved).

## The real-time layer

- Scoped WS rooms per resource (`/ws/<type>/<id>`), a per-user notification
  room, and collab-note relay rooms. Two room idioms coexist: **snapshot
  rooms** (scoreboard, announcements) push full shared state, while **ping
  rooms** — tickets, and the per-competition `activity/<id>` room — push
  tiny id-only frames and let each client refetch its own
  permission-filtered REST slice. The activity room fans out a curated
  allowlist of events; on the frontend, making a surface live is one entry
  in an event-to-query-invalidation map, not a new socket.
- Auth is a **first-frame handshake** — tokens never appear in URLs.
- Presence is ephemeral WS state with debounced clearing.
- Collaborative prose uses **Y.js CRDTs with a dumb-relay transport**
  (ADR-0014): the server relays opaque update frames and persists one
  snapshot blob per document — it never decodes the CRDT.

## Repository layout

```
backend/
  models/     SQLAlchemy models        schemas/   Pydantic (never return a model)
  routers/    one FastAPI router per domain
  plugins/    the modules — one directory per module (see Developing modules)
  utils/      event bus, catalogs, automation engine, scoreboard, backup…
  auth/       permission catalogue, deps, identity, seeding
  alembic/    migrations (one per PR, YYYY-MM-DD_<revid>_<desc>.py)
frontend/
  src/app/         Next.js App Router pages
  src/components/  ui/ primitives + one directory per domain
  src/lib/hooks/   one TanStack Query hook module per domain
  src/stores/      Zustand (client state only)
```

## Design system

Colour and radius live in HSL channel tokens consumed through Tailwind v4's
`@theme`; components reference semantic tokens (`bg-primary`), never hex.
That token layer is what makes the five shipped palettes and the admin
accent override work at runtime with no rebuild — and it's the same system
this docs site and flagpost.io are skinned with.
