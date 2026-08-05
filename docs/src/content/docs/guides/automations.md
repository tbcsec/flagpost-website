---
title: Automations
description: Build When → If → Then rules visually — triggers from the event catalogue, AND-ed conditions, and twelve actions from announcements to hardened webhooks.
---

The automation engine turns any platform event into a rule you build
visually: **When** an event fires, **If** conditions hold, **Then** run
actions. It is an optional module, enabled by default and toggleable per
competition.

## The rule model

- **When (trigger)** — any event from the
  [event catalogue](/reference/events/), verbatim: `challenge.solved`,
  `ticket.created`, `competition.ended`, … Anything that emits an event is
  automatable; new platform events become triggers automatically.
- **If (conditions)** — zero or more `field · operator · value` checks
  against the event's payload, **AND-ed** together. Operators: equals, does
  not equal, contains, greater than, at least, less than, at most, is
  present, is absent.
- **Then (actions)** — one or more of the twelve
  [action types](/reference/automations/#actions), executed in order.

Rules live on the **Automations** page of a competition; the visual builder
is generated from a server catalogue, so it always matches what the backend
actually supports.

## Rule scopes and who can create what

| Rule type | Fires for | Requires |
| --- | --- | --- |
| **Competition rule** | One competition's events | `automation_create` / `automation_edit` in that competition (Judge has these) |
| **Global rule** | Every competition's events | The same permissions held **globally** (Administrator); managed under Admin → Automations |
| **Personal rule** | Only events **you caused** | No permissions — but restricted to the *notify me* action |

Personal rules are a saved search that pings you ("notify me when I solve
something"), never a way to run privileged actions.

**Trigger authorization:** each event is governed by the permission that
lets you observe it — a Judge can build rules on solves and tickets, but
can't automate on `role.assigned` or other admin-only events. The builder
only offers triggers you're allowed to use.

## Time-based triggers

`competition.time_remaining` fires from a per-minute scheduler rather than a
mutation: a rule with a condition like `minutes_remaining · is at most · 60`
fires **once**, when the threshold is first crossed. This is the natural
partner of the `open_survey` action:

> An hour before the end → open the feedback survey → notify participants.

The scheduler also emits `competition.started` / `competition.ended` as the
clock crosses the schedule, so lifecycle rules need no manual step.

## Actions worth knowing about

The full field-by-field list is in the
[automation reference](/reference/automations/); highlights:

- **notify** — in-app notification to the event's user/team, a role, or
  yourself (personal rules).
- **send_email** — templated email; silently does nothing until
  [SMTP is configured](/admin/site-settings/#operational-settings).
- **webhook** — outbound HTTP with serious hardening: SSRF blocklisting on
  every call, credential-header stripping, content-type-aware escaping, and
  chat-token defanging, because team names are adversarial input. See
  [Security notes](/deploy/security/).
- **release_hint / unlock_challenge** — timed hint waves and bonus
  challenges.
- **update_score / create_award** — point adjustments and titled,
  point-carrying awards.
- **freeze_scoreboard / unfreeze_scoreboard / create_announcement /
  open_survey / create_ticket** — event operations without a human in the
  loop.

Values marked *templateable* interpolate event payload fields with
`{placeholders}` — e.g. a webhook body of `{"text": "First blood on
{challenge_id}!"}`.

## Guard rails

- `automation.*` events are never triggerable (no trivial self-loops), and a
  cascade-depth cap stops chains of rules triggering each other indefinitely.
- Rules run on a background lane — a slow webhook never delays the request
  that caused the event.
- Disabling the Automations module for a competition stops **all** rules —
  including global ones — firing for that competition's events.
- Every fire updates the rule's trigger count and timestamp and emits
  `automation.rule_triggered` into the [audit log](/admin/audit-log/).

## Recipes

| Goal | When | If | Then |
| --- | --- | --- | --- |
| Celebrate first blood | `challenge.solved` | `is_first_blood equals true` | `create_announcement` + `create_award` |
| End-of-event survey | `competition.time_remaining` | `minutes_remaining is at most 60` | `open_survey` + `notify` (role: Participant) |
| Lock the final hour | `competition.ended` | — | `freeze_scoreboard` |
| Ops visibility | `ticket.created` | — | `webhook` to your team chat |
| Reward early registration | `team.created` | — | `notify` (event team) |
