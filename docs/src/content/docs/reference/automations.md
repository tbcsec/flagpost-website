---
title: Automation reference
description: The complete rule schema — condition operators, all eleven action types with their configuration fields, and payload templating.
---

Reference for the automation engine's data model. The
[automations guide](/guides/automations/) covers concepts and recipes; this
page is the field-by-field truth, mirroring the server catalogue that
generates the rule builder (`GET /api/automations/catalog`).

## Rule shape

```json
{
  "name": "First blood fanfare",
  "trigger_type": "challenge.solved",
  "conditions": [
    { "field": "is_first_blood", "operator": "equals", "value": true }
  ],
  "actions": [
    { "type": "create_announcement",
      "title": "First blood!",
      "body": "Someone drew first blood on {challenge_id} 🎉" }
  ],
  "is_enabled": true,
  "competition_id": "…",   // null = global rule
  "owner_user_id": null     // null = org rule; set = personal rule
}
```

- `trigger_type` is a verbatim name from the
  [event catalogue](/reference/events/) — validated server-side.
- Conditions are **AND-ed**; an empty list always matches.
- Actions execute in order.

## Condition operators

| Operator | Reads as | Takes a value |
| --- | --- | --- |
| `equals` | equals | yes |
| `not_equals` | does not equal | yes |
| `contains` | contains | yes |
| `gt` | is greater than | yes |
| `gte` | is at least | yes |
| `lt` | is less than | yes |
| `lte` | is at most | yes |
| `exists` | is present | no |
| `not_exists` | is absent | no |

## Templating

Fields marked **templateable** interpolate event payload fields with
`{placeholders}` — and the engine resolves
[friendly companion fields](/reference/events/#friendly-companion-fields) at
fire time, so `"First blood on {challenge_title} by {team_name}!"` renders
names, not IDs. The available fields per trigger are listed in the
[event catalogue](/reference/events/).

## Actions

Only **notify** is available to [personal rules](/guides/automations/#rule-scopes-and-who-can-create-what)
(targeting yourself); everything else requires org-rule permissions.

### `notify` — in-app notification

| Field | Kind | Required | Notes |
| --- | --- | --- | --- |
| `target` | select: `event_user` · `event_team` · `role` · `self` | yes | Who gets the bell notification |
| `role_name` | text | no | e.g. `Judge` — used with the `role` target |
| `title` | text · templateable | yes | |
| `body` | textarea · templateable | no | |

### `send_email` — templated email

| Field | Kind | Required |
| --- | --- | --- |
| `to` | list of addresses | yes |
| `subject` | text · templateable | yes |
| `body` | textarea · templateable | yes |

No-ops silently until [SMTP is configured](/admin/site-settings/#operational-settings).

### `webhook` — outbound HTTP (hardened)

| Field | Kind | Required | Notes |
| --- | --- | --- | --- |
| `url` | text | yes | SSRF-checked on **every** call, not just at save |
| `content_type` | select: `application/json` · `application/x-www-form-urlencoded` · `text/plain` | no | Substituted values are escaped for the declared type |
| `headers` | key/value | no | Credential-bearing headers are stripped |
| `body_template` | textarea · templateable | no | Without one, the structured event is sent as JSON |

See [Security notes](/deploy/security/) for the full hardening list.

### `release_hint` / `unlock_challenge` / `open_survey`

One required ID field each (`hint_id` / `challenge_id` / `survey_id`).
Releasing a hint makes it free for everyone and emits `hint.released`;
opening a survey emits `survey.opened`.

### `create_ticket`

| Field | Kind | Required |
| --- | --- | --- |
| `subject` | text · templateable | yes |
| `body` | textarea · templateable | yes |

Useful for self-flagging operational conditions (e.g. a challenge with a
high fail rate) into the staff queue.

### `update_score`

| Field | Kind | Required | Notes |
| --- | --- | --- | --- |
| `points` | number | yes | Positive bonus or negative penalty |
| `reason` | text · templateable | yes | Shows in the audit trail |

Emits `score.adjusted`.

### `create_award`

| Field | Kind | Required | Notes |
| --- | --- | --- | --- |
| `title` | text · templateable | yes | |
| `description` | textarea · templateable | no | |
| `points` | number | no | Folds into the scoreboard; 0/blank = pure badge |

Emits `achievement.awarded` — identically to a manual judge award.

### `freeze_scoreboard` / `unfreeze_scoreboard`

No configuration. Set/clear the competition's freeze and emit
`scoreboard.frozen` / `scoreboard.unfrozen`.

### `create_announcement`

| Field | Kind | Required | Notes |
| --- | --- | --- | --- |
| `title` | text · templateable | yes | |
| `body` | textarea · templateable | yes | |
| `severity` | select: `info` · `warning` · `critical` | no | Defaults to `info`; `critical` bypasses recipients' announcement mute |

Posts to the competition's live banner and emits `announcement.published`.
See [announcement severity & audiences](/guides/support/#announcements).

## Execution semantics

- Rules evaluate on the **background lane** — they never delay the request
  that emitted the event.
- `automation.*` events are not triggerable, and a cascade-depth cap stops
  rule chains from running away.
- Each fire increments the rule's `trigger_count`, stamps
  `last_triggered_at`, and emits `automation.rule_triggered`.
- The time trigger fires **once** per rule when its threshold first goes
  true (deduplicated via the trigger count), and only for
  competition-scoped rules.
- On a [demo-mode](/deploy/configuration/#demo-mode) instance, the outbound
  actions (`webhook`, `send_email`) are hidden from the builder and refused
  at execution time.
