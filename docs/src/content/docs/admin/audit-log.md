---
title: Audit log
description: The cross-competition event log — every mutation, recorded synchronously and filterable by actor, competition, and event type.
---

Because [every mutation emits an event](/start/concepts/#everything-emits-an-event),
the audit log is simply the event stream, persisted. It's not a bolted-on
logger — the audit consumer subscribes to the bus on the **synchronous
lane**, so a mutation isn't acknowledged until its audit record exists.
Nothing is sampled, buffered, or lost.

## Reading it

Admin → Events (the audit viewer) requires the global `view_audit_log`
permission — site oversight, Administrator-only among the built-ins. Entries
carry the event name, its payload, the actor, the competition, and the
timestamp, with filtering by actor, team, event type, and competition.

Site-wide events (`site.settings_updated`, global automation rule changes,
`platform.imported`) record with no competition — that's correct, not
missing data.

## What you'll see

The [event catalogue](/reference/events/) is the complete list; highlights:

- Every solve (`challenge.solved`), score adjustment, and award.
- Every admin action: role changes, user bans, competition lifecycle.
- Every automation fire (`automation.rule_triggered`) — including what the
  rule did, so rule debugging starts here.
- Module toggles, backup imports, settings changes.

## Retention

The log lives in PostgreSQL with the rest of your data and is covered by the
`audit_log` section of the [platform backup](/admin/backup/). There is no
automatic pruning — size it into your database maintenance plans for large,
long-running installs.
