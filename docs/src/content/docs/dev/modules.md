---
title: Developing modules
description: How Flagpost modules work — the manifest, the setup contract, dependencies, per-competition toggles, and a minimal working example.
---

Every backend feature above the kernel is a **module**: a directory under
`backend/plugins/<id>/` registered by a manifest-driven loader at startup.
Required-core features and optional ones go through the identical path — the
only difference is a flag.

## Anatomy

```
backend/plugins/scorefeed/
├── plugin.yaml     # the manifest
└── __init__.py     # exposes setup(app, event_bus, db_factory)
```

### The manifest

```yaml
id: scorefeed
name: Score Feed
version: 1.0.0
description: Streams solves to a live scores feed.   # optional, v1.5.0
required_core: false      # false ⇒ per-competition toggleable
provides:
  routes: true
  event_listeners: true
dependencies:
  - competitions          # loader refuses to start without these
  - scoring
```

Required fields: `id`, `name`, `version`. Optional since v1.5.0:
`description`, a one-line human-readable summary surfaced by
`GET /api/modules` and the at-creation module picker. The loader validates
the manifest, **topologically orders modules by `dependencies`**, and fails
fast on a missing dependency, duplicate id, or dependency cycle — a
competition never ends up half-configured.

### The setup entry point

```python
"""A minimal module: one route, one event listener."""

def setup(app, event_bus, db_factory) -> None:
    from routers.scorefeed import router
    app.include_router(router)

    @event_bus.on("challenge.solved", owner="scorefeed", background=True)
    async def on_solve(event_name: str, payload: dict) -> None:
        async with db_factory() as db:
            ...  # react to the solve
```

Three things to notice:

- **`owner="scorefeed"`** tags the handler with the module id. Handlers are
  tracked per module, and a disabled module's handlers stop firing without
  any re-subscription dance.
- **`background=True`** picks the dispatch lane. Use the background lane for
  anything slow or external (HTTP calls, email); leave it off only when the
  request must not complete without your handler (the audit log's lane).
- Wildcards work: `event_bus.on("challenge.*")` or `"*"` (the automation
  engine subscribes to everything with one handler).

## Required-core vs optional

`required_core: true` modules are always on — no admin toggle, no
per-request gate. Optional modules always **load and mount** site-wide, but
their *enabled state is per competition*: a `competition_modules` row exists
only to override the default-on. Check it per request:

```python
from plugins.loader import is_module_enabled

if not await is_module_enabled(db, "scorefeed", competition_id):
    raise HTTPException(status_code=404)
```

That per-request 404 (rather than a mount-time decision) is the pattern the
Automations and Feedback modules use — toggling a module never requires a
restart, and disabled modules disappear from the competition's navigation
automatically (the shell reads `GET /api/competitions/{id}/modules/enabled`).

The `ai` module (v1.4.0) layers a second gate on this pattern: besides the
per-competition toggle it checks a **site-wide master switch**
(`ai_settings.enabled`, default off) plus required provider config —
returning 409 when the site hasn't configured it and 404 when the
competition disabled it. Use that shape for any module that depends on
install-level operator configuration.

Toggles emit `module.enabled` / `module.disabled` events like every other
mutation.

## The rules your module must follow

1. **Emit events for every mutation**, named `<entity>.<verb>` past-tense —
   and add them to the catalogue first
   ([Working with events](/dev/events/)).
2. **Scope every query by `competition_id`** for tenant-scoped data.
3. **Gate every route with `require_permission`**; if the capability is new,
   add it to the [permission catalogue](/reference/permissions/) first —
   system roles pick catalogue additions up automatically at startup.
4. **Return Pydantic schemas, never SQLAlchemy models**, and keep routers
   one-per-domain.
5. Ship a **migration** for any new table
   (`YYYY-MM-DD_<revid>_<desc>.py`, one per PR) — and run it against real
   Postgres before shipping; the test suite builds schema from metadata and
   SQLite forgives things Postgres won't.

## What the manifest doesn't do yet

Be aware of the honest edges: manifest keys for `settings`, `widgets`,
`nav_items`, and frontend `extensions` are **declared but unused** until a
module needs them, and the frontend extension-slot system is specified but
not wired. Since v1.7.0 there **is** a marketplace, but only for **content
packs** (challenges and themes) through the validated importers (ADR-0040) —
**code** modules still have **no sandbox** and run trusted in-process,
reviewed like any other contribution, and there is no supported way to
distribute one yet (the declarative and signed-code tiers are designed in
ADR-0040 but not built). If you're building something you hope to distribute,
open a discussion on the repo first.

## Frontend counterpart

A module's UI follows the same domain discipline as core features: one
TanStack Query hook module under `src/lib/hooks/`, components under a domain
directory, design-system tokens only. Navigation entries for optional
modules carry a module tag so the shell can hide them when the module is
disabled for the active competition.

## Licensing your module

Flagpost is [Apache-2.0](https://github.com/tbcsec/flagpost/blob/main/LICENSE)
(since v1.5.1, [ADR-0035](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0035-relicense-apache-2.0.md)),
a permissive licence — so a third-party module can carry **any licence you
like, including a proprietary one**, with no copyleft obligation and no
special instrument. (The earlier AGPL-3.0 releases needed a "Module
Exception" to allow this; a permissive licence retires it.) The one thing
Apache-2.0 doesn't grant is the **Flagpost name and marks** (§6) — the code
is yours to build on, the trademark isn't.
