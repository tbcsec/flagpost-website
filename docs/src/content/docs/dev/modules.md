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
required_core: false      # false ⇒ per-competition toggleable
provides:
  routes: true
  event_listeners: true
dependencies:
  - competitions          # loader refuses to start without these
  - scoring
```

Required fields: `id`, `name`, `version`. The loader validates the manifest,
**topologically orders modules by `dependencies`**, and fails fast on a
missing dependency, duplicate id, or dependency cycle — a competition never
ends up half-configured.

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
module needs them, the frontend extension-slot system is specified but not
wired, and there is **no marketplace or sandboxing** — modules are trusted
code running in-process, reviewed like any other contribution. If you're
building something you hope to distribute, open a discussion on the repo
first.

## Frontend counterpart

A module's UI follows the same domain discipline as core features: one
TanStack Query hook module under `src/lib/hooks/`, components under a domain
directory, design-system tokens only. Navigation entries for optional
modules carry a module tag so the shell can hide them when the module is
disabled for the active competition.
