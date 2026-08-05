---
title: Event catalogue
description: Every event Flagpost emits — names, payload fields, automation-trigger permissions, and the rules the vocabulary follows.
---

Every meaningful mutation emits a named event through the platform's event
bus. This page mirrors the canonical in-code vocabulary
(`backend/utils/event_catalog.py`) — the single source of truth consumed by
the audit log, the automation engine, and the rule-builder UI.

**Conventions**

- Names are `<entity>.<verb>`, past tense.
- New event types are additive; existing ones don't change shape without a
  migration note.
- Subscribers may use wildcards (`challenge.*`, or `*` for everything).
- **Payload fields** below are the fields catalogued for the rule builder's
  condition/template suggestions. Events without a specific entry carry at
  least the common fields that apply to them: `competition_id`, `user_id`,
  `team_id`.
- **Trigger permission** is what an org-rule creator must hold *in the
  rule's scope* to automate on the event — the permission that governs
  observing it, so a rule can't be used to exfiltrate events its author
  couldn't see. [Personal rules](/guides/automations/#rule-scopes-and-who-can-create-what)
  skip this check because they only fire for events their owner caused.

## Competition

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `competition.created` | common | `edit_competition` |
| `competition.updated` | common | `edit_competition` |
| `competition.started` | `competition_id`, `name` | `edit_competition` |
| `competition.ended` | `competition_id`, `name` | `edit_competition` |
| `competition.time_remaining` | `competition_id`, `minutes_remaining` | `edit_competition` |
| `competition.member_joined` | `competition_id`, `user_id` | `challenge_view` |
| `competition.rules_accepted` | `competition_id`, `user_id` | `challenge_view` |
| `competition.archived` | `competition_id` | `edit_competition` |
| `competition.unarchived` | `competition_id` | `edit_competition` |
| `competition.deleted` | `competition_id`, `user_id`, `auto` | `delete_competition` |

`competition.started` / `.ended` are emitted by the scheduler as the clock
crosses the schedule (once each); `competition.time_remaining` ticks from
the same scheduler and is the platform's one
[time-based trigger](/guides/automations/#time-based-triggers).
On `competition.deleted`, `auto: true` marks a
[retention purge](/guides/competitions/#lifecycle-operations) rather than a
manual delete.

## Teams

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `team.created` | `competition_id`, `team_id` | `challenge_view` |
| `team.member_joined` | `competition_id`, `team_id`, `user_id` | `challenge_view` |
| `team.member_left` | common | `challenge_view` |
| `team.deleted` | common | `challenge_view` |

## Challenges, hints, categories

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `challenge.created` | `competition_id`, `challenge_id`, `user_id`, `title` | `challenge_edit` |
| `challenge.updated` | `competition_id`, `challenge_id` | `challenge_edit` |
| `challenge.published` | `competition_id`, `challenge_id`, `user_id`, `title` | `challenge_view` |
| `challenge.deleted` | common | `challenge_edit` |
| `challenge.solved` | `competition_id`, `challenge_id`, `user_id`, `team_id`, `points`, `is_first_blood` | `challenge_view` |
| `challenge.attempted` | `competition_id`, `challenge_id`, `user_id`, `team_id`, `correct` | `view_competition_analytics` |
| `challenge.guesses_reset` | `competition_id`, `challenge_id`, `user_id`, `team_id` | `challenge_edit` |
| `challenge.rated` | `competition_id`, `challenge_id`, `user_id`, `rating` | `feedback_view_responses` |
| `challenge.hint_requested` | `competition_id`, `challenge_id`, `hint_id`, `user_id`, `team_id`, `cost` | `challenge_view` |
| `hint.released` | `competition_id`, `challenge_id`, `hint_id`, `user_id`, `team_id` | `challenge_view` |
| `category.created` | common | `challenge_edit` |
| `category.deleted` | common | `challenge_edit` |

`challenge.solved` is the workhorse: `is_first_blood` makes first-blood
automation a one-condition rule, and repeat-correct submissions never
re-emit it.

`challenge.attempted` fires on every **graded** flag submission, right or
wrong — refusals *before* grading (the rate limit, an exhausted
multiple-choice guess cap, a locked prerequisite) emit nothing. It's what
keeps attempt-counting surfaces (dashboard stats, challenge health,
analytics) live, and its trigger is gated `view_competition_analytics`
because others' attempts — including failures — are staff analytics data,
not member-visible play state. Volume is bounded by the submission rate
limit.

## Scoring & scoreboard

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `score.adjusted` | `competition_id`, `user_id`, `team_id`, `points`, `reason` | `challenge_view` |
| `achievement.awarded` | `competition_id`, `user_id`, `team_id`, `title`, `points` | `challenge_view` |
| `scoreboard.frozen` | `competition_id`, `frozen_at` | `scoreboard_freeze` |
| `scoreboard.unfrozen` | `competition_id` | `scoreboard_freeze` |

`score.adjusted` and `achievement.awarded` are emitted whether the mutation
came from a judge or from an automation action — an automation's side
effects are events like any other mutation's.

## Support & communication

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `ticket.created` | `competition_id`, `ticket_id`, `opener_user_id`, `subject` | `ticket_view` |
| `ticket.assigned` | `competition_id`, `ticket_id`, `assignee_user_id` | `ticket_view` |
| `ticket.resolved` | `competition_id`, `ticket_id` | `ticket_view` |
| `ticket.message_posted` | `competition_id`, `ticket_id`, `author_user_id`, `is_internal` | `ticket_view` |
| `ticket.attachment_added` | `competition_id`, `ticket_id`, `message_id`, `attachment_id`, `actor_user_id`, `is_internal` | `ticket_view` |
| `ticket.attachment_deleted` | `competition_id`, `ticket_id`, `message_id`, `attachment_id`, `actor_user_id` | `ticket_view` |
| `announcement.published` | `competition_id`, `announcement_id`, `title`, `body`, `severity`, `audience_type` | `challenge_view` |

## Feedback

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `survey.opened` | `competition_id`, `survey_id`, `title` | `challenge_view` |
| `survey.submitted` | `competition_id`, `user_id`, `survey_id`, `response_id` | `feedback_view_responses` |

## Users & roles (site-wide)

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `user.registered` | `user_id` | `manage_users` |
| `user.created` | `user_id`, `email`, `actor_user_id` | `manage_users` |
| `user.updated` | `user_id`, `actor_user_id` | `manage_users` |
| `user.banned` | `user_id`, `actor_user_id` | `manage_users` |
| `user.unbanned` | `user_id`, `actor_user_id` | `manage_users` |
| `user.deleted` | `user_id`, `actor_user_id` | `manage_users` |
| `user.password_changed` | common | `manage_users` |
| `user.email_verified` | `user_id` | `manage_users` |
| `identity.linked` / `identity.unlinked` | `user_id`, `provider_id`, `provider_slug` | `manage_users` |
| `api_token.created` | `api_token_id`, `user_id`, `created_by_user_id` | `manage_api_tokens` |
| `api_token.revoked` | `api_token_id`, `user_id` | `manage_api_tokens` |
| `auth_provider.created` / `auth_provider.deleted` | `provider_id`, `slug`, `kind`, `actor_user_id` | `manage_auth_providers` |
| `auth_provider.updated` | `provider_id`, `slug`, `kind`, `changed_fields`, `actor_user_id` | `manage_auth_providers` |
| `role.created` / `role.updated` / `role.deleted` | common | `manage_roles` |
| `role.assigned` / `role.unassigned` | common | `manage_roles` |

These are governed by **global** admin permissions — a competition-scoped
role can never automate on them. `identity.*` records an external
[identity](/admin/sso/) — OIDC, SAML, or LDAP — being attached to or
detached from a local account; `auth_provider.*` records provider
configuration changes (`kind` is the provider protocol: `oidc`, `saml`,
or `ldap`).

## Platform & modules

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `site.settings_updated` | *(site-wide — no `competition_id`)* | `manage_site_settings` |
| `module.enabled` / `module.disabled` | common | `edit_competition` |

## Friendly companion fields

When an automation rule runs, the engine enriches the payload with a
human-readable companion for every ID field it carries, so templates can say
`{challenge_title}` instead of `{challenge_id}`. The rule builder suggests
both. If an entity was deleted between the event and the rule firing, the
placeholder falls back to the raw ID rather than rendering literally.

| ID field | Companion |
| --- | --- |
| `user_id` | `user_name` |
| `opener_user_id` | `opener_user_name` |
| `assignee_user_id` | `assignee_user_name` |
| `author_user_id` | `author_user_name` |
| `actor_user_id` | `actor_user_name` |
| `team_id` | `team_name` |
| `challenge_id` | `challenge_title` |
| `survey_id` | `survey_title` |
| `ticket_id` | `ticket_subject` |
| `competition_id` | `competition_name` |

## Not triggerable

Emitted and audited, but **never** offered as automation triggers:

| Event | Why |
| --- | --- |
| `automation.rule_triggered` / `.rule_created` / `.rule_updated` / `.rule_deleted` | The engine never evaluates its own events — the trivial self-loop guard. |
| `platform.imported` | Platform administration, not a competition event. |
