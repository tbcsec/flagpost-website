---
title: Teams & participants
description: Team-mode and individual-mode competitions — invite codes, captain approval, size caps, team profiles, rosters, divisions, and manual awards.
---

Each competition is either **team-based** or **individual** — a per-competition
setting, not a platform mode.

## Team mode

Competitors create or join a team inside the competition.

- **Invite codes** — every team has one; joining is by code.
- **Captain approval** — a team can require the captain to approve join
  requests. Joining then files a pending request the captain approves or
  rejects; approval re-checks the size cap and emits `team.member_joined`.
- **Size caps** — the competition's *max team size* is enforced at join and
  at approval time.
- **Team profile** — captains can set an affiliation, country, and website
  via the team panel.
- **Shared notes** — every challenge gives the team a real-time
  collaborative scratchpad, visible only to that team. See
  [Support & communication](/guides/support/#collaborative-notes).

Scoring, ranks, and guess caps all apply to the team as one subject.

## Individual mode

Everyone competes solo. Joining is self-serve (public competitions) or by
competition invite code. The **Participants** page lists the roster with join
time, distinct solves, and current standing.

## Divisions (brackets)

If the competition defines division names (Settings → General), **staff**
assign each team or competitor to a division directly from the scoreboard
(an inline selector per row, gated on `edit_competition`). Everyone can
filter the scoreboard by division; ranks are computed within the filtered
division. Divisions are staff-assigned — competitors don't self-select.

## Manual awards

Judges holding `score_override` can grant **awards** — a title, description,
and point value (zero points makes it a pure badge) — to one or more
participants from the roster. Awards fold into the scoreboard immediately and
emit `achievement.awarded`, exactly like awards granted by an
[automation rule](/guides/automations/), so audit and automations treat both
the same.

## Staff controls

Staff with the team permissions (`team_view_all`, `team_edit_any`,
`team_disqualify`) can inspect and manage any team in their competition.
User-account concerns — bans, password resets, role assignment — live at the
site level; see [Users & roles](/admin/users-roles/).
