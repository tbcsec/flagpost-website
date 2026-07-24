---
title: Working with events
description: Emitting and subscribing to events as a developer — the catalogue contract, dispatch lanes, wildcards, and the checklist for adding a new event type.
---

The event bus is the platform's connective tissue: mutations announce
themselves, and the audit log, automation engine, notifications, and
WebSocket broadcasts all react independently. This page is the developer's
contract; the full vocabulary is in the
[event catalogue](/reference/events/).

## Emitting

```python
await event_bus.emit("challenge.solved", {
    "competition_id": competition_id,
    "challenge_id": challenge.id,
    "user_id": user.id,
    "team_id": team_id,
    "points": awarded,
    "is_first_blood": first_blood,
})
```

Rules:

- The name **must** exist in `backend/utils/event_catalog.py`
  (`EVENT_TYPES`) — emitting an uncatalogued event is a bug, and the
  automation engine validates trigger names against the same list.
- Names are `<entity>.<verb>`, past tense: the event records something that
  *happened*, not a command.
- Include `competition_id` on competition-scoped payloads (the audit log and
  per-competition module gating rely on it), plus the IDs a consumer would
  need to act — think of the payload as the automation engine's input.

## Subscribing

```python
@event_bus.on("challenge.solved", owner="my_module")
async def on_solve(event_name: str, payload: dict) -> None: ...

@event_bus.on("challenge.*", owner="my_module")            # prefix wildcard
@event_bus.on("*", owner="my_module", background=True)     # everything
```

- **`owner`** ties handlers to a module so a disabled module's handlers stop
  firing cleanly.
- **Lanes** (ADR-0012): default (foreground) handlers are awaited before the
  emitting request completes — right for the audit log and WS broadcasts,
  where losing an event would be a correctness bug. `background=True`
  handlers are scheduled fire-and-forget — required for anything slow or
  external. A failing handler is logged and isolated either way; it never
  breaks the emitting request or its sibling handlers.
- There is deliberately **no durable outbox**: background delivery is
  at-most-once across a crash. If you're building something that needs
  at-least-once semantics, raise it in an issue first — it's an additive
  layer the architecture left room for.

## Adding a new event type — the checklist

1. Add the name to `EVENT_TYPES` in `backend/utils/event_catalog.py`.
2. Map its **trigger permission** in `TRIGGER_PERMISSIONS`
   (`backend/utils/automation_catalog.py`) — which permission lets a rule
   author observe this event? A drift test fails if you skip this.
3. Optionally list its payload fields in `TRIGGER_FIELDS` — that's what the
   rule builder suggests for conditions and `{placeholders}`. Omitting it
   costs suggestions, never capability.
4. Emit it at the mutation site.
5. Update `ARCHITECTURE.md` §3.2 — the doc and the code are kept in
   lockstep, deliberately.

That's the whole cost — and in exchange the event is instantly a first-class
automation trigger, audit-log entry, and notification source with zero
per-feature wiring.

## Consuming events as an integrator

If you're integrating from *outside* the process, you don't subscribe to the
bus — you point a [webhook automation rule](/guides/automations/) at your
endpoint. The rule's trigger/condition machinery gives you filtered,
structured event delivery without touching platform code.
