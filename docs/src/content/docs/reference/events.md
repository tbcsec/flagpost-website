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
  need it too, even though they only fire for events their owner caused —
  and the engine re-checks the owner every time a personal rule would run, so
  a rule whose owner has since lost the permission stays silent.

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
| `registration_field.updated` | `competition_id`, `count` | `edit_competition` |
| `registration_field.value_set` | `competition_id`, `subject_id` | `challenge_view` |
| `competition.archived` | `competition_id` | `edit_competition` |
| `competition.unarchived` | `competition_id` | `edit_competition` |
| `competition.deleted` | `competition_id`, `user_id`, `auto` | `delete_competition` |
| `invite_link.created` | `competition_id`, `invite_link_id`, `capability` | `manage_invite_links` |
| `invite_link.revoked` | `competition_id`, `invite_link_id`, `capability` | `manage_invite_links` |
| `invite_link.used` | `competition_id`, `invite_link_id`, `user_id` | `manage_invite_links` |

`competition.started` / `.ended` are emitted by the scheduler as the clock
crosses the schedule (once each); `competition.time_remaining` ticks from
the same scheduler and is the platform's one
[time-based trigger](/guides/automations/#time-based-triggers).
On `competition.deleted`, `auto: true` marks a
[retention purge](/guides/competitions/#lifecycle-operations) rather than a
manual delete. `registration_field.updated` (v1.6.0) fires when an organiser
edits the [custom registration fields](/guides/teams/#custom-registration-fields)
set (`count` is the new field count); `registration_field.value_set` fires
when a subject saves their answers, at entry or later (`subject_id` is the
user in individual mode, the team in team mode). `invite_link.*` (v1.7.0)
covers the [sharing links](/guides/competitions/#sharing-links): `capability`
is `join` or `view`, and `invite_link.used` fires when a
join link admits someone new.

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
| `challenge.solved` | `competition_id`, `challenge_id`, `user_id`, `team_id`, `points`, `is_first_blood`, `regrade`, `solved_at` | `challenge_view` |
| `challenge.solve_revoked` | `competition_id`, `challenge_id`, `user_id`, `team_id`, `solved_at` | `challenge_view` |
| `challenge.attempted` | `competition_id`, `challenge_id`, `user_id`, `team_id`, `correct` | `view_competition_analytics` |
| `challenge.guesses_reset` | `competition_id`, `challenge_id`, `user_id`, `team_id` | `challenge_edit` |
| `challenge.rated` | `competition_id`, `challenge_id`, `user_id`, `rating` | `feedback_view_responses` |
| `challenge.hint_requested` | `competition_id`, `challenge_id`, `hint_id`, `user_id`, `team_id`, `cost` | `challenge_view` |
| `hint.released` | `competition_id`, `challenge_id`, `hint_id`, `user_id`, `team_id` | `challenge_view` |
| `hint.published` | `competition_id`, `challenge_id`, `hint_id` | `challenge_view` |
| `category.created` | common | `challenge_edit` |
| `category.deleted` | common | `challenge_edit` |

`challenge.solved` is the workhorse: `is_first_blood` makes first-blood
automation a one-condition rule, and repeat-correct submissions never
re-emit it. `solved_at` is the solve's time — for a
[programming problem](/guides/programming/), when the code was submitted, not
when it was judged. `regrade: true` (v1.8.0) marks a solve granted by a
rejudge or a judge's override, so a rule can tell it from a live solve.
`challenge.solve_revoked` (v1.8.0) is the reverse — a judged solve rejudged
or overridden away from Accepted — and moves the scoreboard, activity feed and
skills web the same way. It doesn't undo what a rule already did on the
original solve; a rule that must react subscribes to it.

`hint.released` and `hint.published` (v1.4.0) are different moments: a
*release* grants an existing hint to one event subject, a *publish* makes
a [hidden hint](/guides/challenges/) visible to **everyone** — manually,
on its `release_at` schedule, or via the `publish_hint` automation action.

`challenge.attempted` fires on every **graded** flag submission, right or
wrong — refusals *before* grading (the rate limit, an exhausted
multiple-choice guess cap, a locked prerequisite) emit nothing. It's what
keeps attempt-counting surfaces (dashboard stats, challenge health,
analytics) live, and its trigger is gated `view_competition_analytics`
because others' attempts — including failures — are staff analytics data,
not member-visible play state. Volume is bounded by the submission rate
limit.

## Challenge instances

Added in v1.6.0 with the optional
[challenge instances](/deploy/challenge-instances/) module. Payloads carry
**ids only** — never the flag or the connection detail.

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `challenge.instance_requested` | `competition_id`, `challenge_id`, `instance_id`, `user_id`, `team_id` | `instance_view` |
| `challenge.instance_started` | `competition_id`, `challenge_id`, `instance_id`, `user_id`, `team_id` | `instance_view` |
| `challenge.instance_extended` | `competition_id`, `challenge_id`, `instance_id`, `user_id`, `team_id` | `instance_view` |
| `challenge.instance_expired` | `competition_id`, `challenge_id`, `instance_id`, `user_id`, `team_id` | `instance_view` |
| `challenge.instance_destroyed` | `competition_id`, `challenge_id`, `instance_id`, `user_id`, `team_id` | `instance_view` |
| `challenge.instance_provision_failed` | `competition_id`, `challenge_id`, `instance_id`, `user_id`, `team_id` | `instance_view` |
| `challenge.instance_launch_throttled` | `competition_id`, `challenge_id`, `user_id`, `team_id` | `instance_view` |
| `challenge.flag_shared_detected` | `competition_id`, `challenge_id`, `user_id`, `team_id`, `matched_user_id`, `matched_team_id`, `instance_id` | `view_submissions` |

The lifecycle runs on the background lane: `instance_requested` on launch,
`instance_started` when it goes live, `instance_extended` on a TTL renewal,
then `instance_expired` (TTL reached), `instance_destroyed` (manual teardown),
or `instance_provision_failed`. `instance_launch_throttled` fires when the
per-subject [spawn rate-limit](/deploy/challenge-instances/#guardrails-and-reaping)
refuses a launch — no instance was created, so there's no `instance_id`.
`flag_shared_detected` fires when a wrong submission carried *another*
subject's live
[unique per-instance flag](/deploy/challenge-instances/#unique-per-instance-flags)
(`matched_*` names the leak source) — provable flag sharing, surfaced as a
signal with no automatic penalty.

## Code judge

Added in v1.8.0 with the optional [code judge](/deploy/code-judge/) module.
Payloads carry ids and the verdict — never source code.

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `judging.queued` | `competition_id`, `challenge_id`, `judging_id`, `user_id`, `team_id`, `kind` | `judging_view` |
| `judging.completed` | `competition_id`, `challenge_id`, `judging_id`, `user_id`, `team_id`, `kind`, `verdict` | `judging_view` |
| `judging.rejudge_requested` | `competition_id`, `challenge_id`, `judging_id`, `user_id`, `count` | `judging_view` |
| `judging.overridden` | `competition_id`, `challenge_id`, `judging_id`, `user_id`, `submitter_user_id`, `team_id`, `verdict`, `reason` | `judging_view` |
| `judge.settings_updated` | `actor_user_id`, `enabled` *(site-wide)* | `manage_judge_infra` |
| `judge.language_created` | `actor_user_id`, `language_id`, `key` *(site-wide)* | `manage_judge_infra` |
| `judge.language_updated` | `actor_user_id`, `language_id`, `key` *(site-wide)* | `manage_judge_infra` |
| `judge.language_deleted` | `actor_user_id`, `language_id`, `key` *(site-wide)* | `manage_judge_infra` |

`kind` is `submit` (judged on every test and scored), `run` (examples
only, never scored) or `reference` (an author's reference check, never
scored). On the two staff actions, `user_id` is the staff member —
so the audit log attributes them — and `submitter_user_id` names whose code it
was. Judgings are others' attempts and verdicts, so their triggers are gated on
the staff `judging_view` grant, as `challenge.attempted` is on staff
analytics. `judge.*` records site configuration, like
`instance.settings_updated`; a language's payload carries its key and id,
never its commands.

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
| `ticket.created` | `competition_id`, `ticket_id`, `opener_user_id`, `subject`, `kind` | `ticket_view` |
| `ticket.assigned` | `competition_id`, `ticket_id`, `assignee_user_id` | `ticket_view` |
| `ticket.resolved` | `competition_id`, `ticket_id` | `ticket_view` |
| `ticket.message_posted` | `competition_id`, `ticket_id`, `author_user_id`, `is_internal` | `ticket_view` |
| `ticket.attachment_added` | `competition_id`, `ticket_id`, `message_id`, `attachment_id`, `actor_user_id`, `is_internal` | `ticket_view` |
| `ticket.attachment_deleted` | `competition_id`, `ticket_id`, `message_id`, `attachment_id`, `actor_user_id` | `ticket_view` |
| `announcement.published` | `competition_id`, `announcement_id`, `title`, `body`, `severity`, `audience_type`, `kind`, `challenge_id`, `question` | `challenge_view` |
| `announcement.updated` | `competition_id`, `announcement_id` | `announcement_create` |
| `announcement.deleted` | `competition_id`, `announcement_id` | `announcement_create` |
| `announcement.withdrawn` | `competition_id`, `announcement_id`, `challenge_id`, `kind`, `user_id` | `announcement_create` |

`announcement.published` also fires when a
[scheduled announcement](/guides/support/#announcements) reaches its publish
time — identically to an immediate post. `announcement.updated` /
`announcement.deleted` (v1.6.0) fire only when a still-**scheduled** draft is
edited or cancelled; they're staff-domain (the draft was never
competitor-visible), so they gate on `announcement_create`, not
`challenge_view`.

Since v1.8.0 a ticket's `kind` is `support` or `question` — a competitor's
private question about a challenge, asked from its page — and an
announcement's `kind` can be `clarification`, carrying the `challenge_id` and
the `question` as the judge worded it (never who asked). See
[clarifications](/guides/programming/#clarifications).
`announcement.withdrawn` fires when staff withdraw a clarification; it names
the staff member as `user_id`, so it's staff-only too.

## Feedback

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `survey.opened` | `competition_id`, `survey_id`, `title` | `challenge_view` |
| `survey.submitted` | `competition_id`, `user_id`, `survey_id`, `response_id` | `feedback_view_responses` |

## Certificates & reports

From the optional [certificates](/guides/certificates/) and
[reports](/guides/reports/) modules.

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `certificate.template_updated` | `competition_id`, `certificate_template_id` | `manage_certificates` |
| `certificate.released` | `competition_id`, `certificate_template_id` | `challenge_view` |
| `report.generated` | `competition_id`, `report_id`, `version`, `user_id` | `generate_report` |

`certificate.released` is gated at `challenge_view` — the member-visible
baseline — because every participant receives a certificate; a common rule
is *on `certificate.released` → notify*. `report.generated` fires once the
async render of a [post-event report](/guides/reports/) completes.

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
| `user.renamed` | `user_id`, `old_name`, `new_name`, `actor_user_id` | `manage_users` |
| `user.avatar_updated` | `user_id`, `actor_user_id` | `manage_users` |
| `user.avatar_removed` | `user_id`, `actor_user_id` | `manage_users` |
| `identity.linked` / `identity.unlinked` | `user_id`, `provider_id`, `provider_slug` | `manage_users` |
| `api_token.created` | `api_token_id`, `user_id`, `created_by_user_id` | `manage_api_tokens` |
| `api_token.revoked` | `api_token_id`, `user_id` | `manage_api_tokens` |
| `auth_provider.created` / `auth_provider.deleted` | `provider_id`, `slug`, `kind`, `actor_user_id` | `manage_auth_providers` |
| `auth_provider.updated` | `provider_id`, `slug`, `kind`, `changed_fields`, `actor_user_id` | `manage_auth_providers` |
| `role.created` / `role.updated` / `role.deleted` | common | `manage_roles` |
| `role.assigned` / `role.unassigned` | common | `manage_roles` |
| `users.imported` | `user_id`, `created`, `skipped`, `roles_assigned` | `manage_users` |

These are governed by **global** admin permissions — a competition-scoped
role can never automate on them. `identity.*` records an external
[identity](/admin/sso/) — OIDC, SAML, or LDAP — being attached to or
detached from a local account; `auth_provider.*` records provider
configuration changes (`kind` is the provider protocol: `oidc`, `oauth2`,
`saml`, or `ldap`). `users.imported` is the [mass CSV
import](/admin/users-roles/)'s single summary event — bulk creation
deliberately doesn't flood `user.created` per row, though each role grant
in the file still emits its own `role.assigned`; `user_id` is the
importing admin. `user.renamed` carries both `old_name` and `new_name` —
it is the **only** record of a prior username, since every other surface
renames retroactively; `actor_user_id` distinguishes a self-service change
from an admin rename.

## AI assistants

Added in v1.4.0 with the optional [AI assistants module](/admin/ai/).
Usage metadata only — message content never rides an event.

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `ai.settings_updated` | `user_id`, `enabled` *(site-wide — no `competition_id`)* | `manage_ai` |
| `ai.query` | `competition_id`, `conversation_id`, `user_id`, `assistant_type`, `input_tokens`, `output_tokens`, `tool_calls` | `view_competition_analytics` |
| `ai.error` | `competition_id`, `conversation_id`, `user_id`, `assistant_type` | `view_competition_analytics` |
| `ai.disclosure_accepted` | `competition_id`, `user_id` | `ai_view_transcripts` |

## Platform & modules

| Event | Payload fields | Trigger permission |
| --- | --- | --- |
| `site.settings_updated` | *(site-wide — no `competition_id`)* | `manage_site_settings` |
| `module.enabled` / `module.disabled` | common | `edit_competition` |
| `page.created` / `page.deleted` | `page_id`, `slug`, `actor_user_id` | `manage_pages` |
| `page.updated` | `page_id`, `slug`, `fields`, `actor_user_id` | `manage_pages` |
| `theme.created` / `theme.updated` | `theme_id`, `name`, `actor_user_id` *(site-wide)* | `manage_site_settings` |
| `theme.deleted` | `theme_id`, `actor_user_id` *(site-wide)* | `manage_site_settings` |
| `instance.settings_updated` | `actor_user_id`, `enabled` *(site-wide)* | `manage_instance_infra` |

`page.*` records [custom-page](/admin/pages/) authoring — site-level, so
no `competition_id`; `fields` on an update is the list of changed field
names, and no payload ever carries the page body. Governed by
`manage_pages` so a Judge can't automate on — and thereby observe —
unpublished page changes. `theme.*` (v1.6.0) records
[custom brand theme](/admin/site-settings/#custom-brand-themes) CRUD, and
`instance.settings_updated` records a
[challenge-instance](/deploy/challenge-instances/) provisioner-config change —
both site-level, and the latter carries only *who* and the new `enabled` flag,
never the endpoint or credential.

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
| `platform.content_pack_installed` | A [content-pack](/admin/site-settings/#marketplace--content-packs) install (v1.7.0) — one bulk event, not a per-row flood. |
| `platform.marketplace_settings_updated` | Marketplace registry and trust configuration (v1.7.0) — platform administration. |
