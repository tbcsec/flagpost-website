---
title: Core concepts
description: The five ideas everything in Flagpost builds on — competitions, roles, modules, events, and the real-time layer.
---

Five concepts explain how the whole platform fits together. Everything else
in these docs is detail on one of them.

## Competitions are tenants

A single Flagpost install hosts **many competitions at once**, fully
segregated from each other. Every challenge, team, ticket, and score belongs
to exactly one competition, and every query is scoped accordingly at the
data-access layer.

Each competition carries its own configuration:

- **Participation mode** — team-based or individual, chosen per competition.
- **Visibility and joining** — public or private; self-serve join or invite
  code.
- **Schedule** — start/end times, plus pause, archive, and clone operations.
- **Module toggles** — optional modules can be switched off per competition.

## Roles and permissions are data

Access control is a catalogue of named permissions (like `challenge_edit` or
`ticket_respond`) grouped into categories, each scoped either **global**
(site-wide) or **competition** (meaningful within one competition). Roles are
database rows holding a list of permission keys — not hard-coded checks.

Three system roles ship built in: **Administrator** (global, everything),
**Judge** (full operational control within an assigned competition), and
**Participant** (competitor-facing permissions). They can't be edited or
deleted — clone one into a custom role to make a variant. The same account
can be a Judge in one competition and a Participant in another.

See [Users & roles](/admin/users-roles/) and the
[permissions reference](/reference/permissions/).

## Almost everything is a module

A small **kernel** (auth and RBAC, competition tenancy, the event bus, and
the module loader itself) is never optional. On top of it, every feature
registers through the same manifest-driven loader:

- **Required-core modules** — challenges, scoring, hints, tickets,
  announcements, notifications, dashboard, collab notes, and friends. Always
  on; they are what makes the platform a CTF tool at all.
- **Optional modules** — currently **Automations**, **Feedback**, and
  **Analytics**. Enabled by default, and toggleable per competition under
  **Competition Settings → Modules**. Disabled modules drop out of the
  navigation and their APIs return 404 for that competition.

Developers: see [Developing modules](/dev/modules/).

## Everything emits an event

Every meaningful mutation emits a named event (`challenge.solved`,
`ticket.created`, `competition.started`, …) through an async in-process event
bus. The audit log, the automation engine, notifications, and WebSocket
broadcasts are all just subscribers — and anything that emits an event is
automatically available as an automation trigger.

The full vocabulary lives in the [event catalogue](/reference/events/).

## Real-time by default

Anywhere multiple people look at the same thing, the UI reflects it live over
WebSockets: the scoreboard, presence ("3 others viewing"), ticket threads,
announcements, and the notification bell. Collaborative prose fields (team
scratchpads, staff ticket notes) go further, using CRDTs so everyone can type
at once without conflicts.
