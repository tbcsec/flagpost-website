---
title: Permissions
description: The complete permission catalogue by category and scope, and exactly what the three built-in roles hold.
---

Permissions are granular, named capabilities checked by a single shared
dependency on every route. Each belongs to one **category** (purely for
grouping the role editor) and carries a **scope**:

- **global** — site-wide; never granted through a per-competition role.
- **competition** — evaluated against one specific competition.

This page mirrors `backend/auth/permissions.py`, the in-code source of
truth.

## Catalogue

| Permission | Category | Scope |
| --- | --- | --- |
| `create_competition` | Competition Management | global |
| `edit_competition` | Competition Management | competition |
| `delete_competition` | Competition Management | competition |
| `manage_schedule` | Competition Management | competition |
| `manage_modules` | Competition Management | competition |
| `generate_report` | Competition Management | competition |
| `challenge_view` | Challenges | competition |
| `challenge_create` | Challenges | competition |
| `challenge_edit` | Challenges | competition |
| `challenge_delete` | Challenges | competition |
| `challenge_publish` | Challenges | competition |
| `score_override` | Scoring | competition |
| `scoreboard_freeze` | Scoring | competition |
| `team_view_all` | Teams | competition |
| `team_edit_any` | Teams | competition |
| `team_disqualify` | Teams | competition |
| `ticket_view` | Support Tickets | competition |
| `ticket_respond` | Support Tickets | competition |
| `ticket_assign` | Support Tickets | competition |
| `ticket_view_internal_notes` | Support Tickets | competition |
| `announcement_create` | Announcements | competition |
| `announcement_delete` | Announcements | competition |
| `feedback_manage` | Feedback | competition |
| `feedback_view_responses` | Feedback | competition |
| `feedback_submit` | Feedback | competition |
| `manage_certificates` | Certificates | competition |
| `manage_users` | Users & Roles | global |
| `manage_roles` | Users & Roles | global |
| `view_all_users` | Users & Roles | global |
| `manage_api_tokens` | Users & Roles | global |
| `manage_site_settings` | Site Settings | global |
| `manage_auth_providers` | Site Settings | global |
| `manage_ai` | Site Settings | global |
| `manage_pages` | Site Settings | global |
| `ai_view_transcripts` | AI Assistants | competition |
| `view_competition_analytics` | Analytics | competition |
| `view_global_analytics` | Analytics | global |
| `view_submissions` | Analytics | competition |
| `customize_dashboard` | Dashboard | competition |
| `manage_dashboard_widgets` | Dashboard | competition |
| `automation_view` | Automations | competition |
| `automation_create` | Automations | competition |
| `automation_edit` | Automations | competition |
| `view_audit_log` | Audit | global |

## What the built-in roles hold

**Administrator** (global) — every permission in the catalogue.

**Judge** (competition) — full operational control inside an assigned
competition:

`edit_competition` · `manage_schedule` · `manage_modules` ·
`generate_report` · `challenge_view` · `challenge_create` ·
`challenge_edit` · `challenge_delete` · `challenge_publish` ·
`score_override` · `scoreboard_freeze` · `team_view_all` ·
`team_edit_any` · `team_disqualify` · `ticket_view` · `ticket_respond` ·
`ticket_assign` · `ticket_view_internal_notes` · `announcement_create` ·
`announcement_delete` · `feedback_manage` · `feedback_view_responses` ·
`feedback_submit` · `manage_certificates` ·
`view_competition_analytics` · `view_submissions` · `ai_view_transcripts` ·
`customize_dashboard` · `automation_view` · `automation_create` ·
`automation_edit`

**Participant** (competition) — competitor-facing only:

`challenge_view` · `ticket_view` · `ticket_respond` · `feedback_submit`

## Notes

- Some competitor abilities are enforced by **ownership**, not a catalogue
  permission: submitting flags, managing your own team, replying to your own
  tickets, and minting your own API tokens. That's why the Participant list
  looks short.
- Several grants are deliberately narrow: `manage_api_tokens` is
  oversight-only (list/revoke anyone's token — never mint, which is
  self-only by construction); `manage_auth_providers` and `manage_ai` are
  separate from `manage_site_settings` because deciding who can log in —
  or holding an API key that sends data to an external endpoint — is
  materially more sensitive than changing a palette; `manage_modules`
  (v1.4.0) splits per-competition module toggles out of
  `edit_competition` so they can be delegated or withheld independently;
  and `ai_view_transcripts` (v1.4.0) is its own grant because assistant
  transcripts are competitor content of a different sensitivity than
  analytics or tickets. `view_submissions` splits raw submission payloads
  from aggregate analytics.
- System roles **re-sync from this catalogue on every startup**, so
  permissions added by an upgrade reach existing installs' built-in roles
  automatically. Custom roles are never touched by the sync.
- A **global** rule scope matters for automations too: creating a global
  automation rule requires holding the automation permissions via a global
  assignment. See the
  [trigger-permission map](/reference/events/) for which permission governs
  automating on each event.
