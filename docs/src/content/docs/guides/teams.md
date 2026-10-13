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

## Custom registration fields

An organiser (`edit_competition`) can define extra questions collected at
entry — a waiver checkbox, dietary needs, a Discord handle, a division
preference. Fields come in four types:

- **text** — a single line.
- **textarea** — free-form multi-line.
- **select** — a fixed choice; needs **at least one option**.
- **checkbox** — a boolean opt-in (a submitted `false`/`0` stores *no*, so
  an unticked box is never misread as consent).

Each field has a subject-facing label and can be marked **required**. Who
answers depends on the competition's mode: in individual mode the competitor
answers at join; in team mode the **captain** answers once at team creation
(the team is the subject). Subjects — or the captain, in team mode — can edit
their answers later.

**When answers are collected** depends on how someone joins:

- **Public self-join** — required fields **block the join** until they're
  answered; the form renders before membership.
- **Private / invite-code join** — the fields can't be pre-rendered while the
  competition is undisclosed, so the competitor joins first and is prompted
  for the fields **immediately after**. Required-ness is enforced on that
  first save rather than at the door.

Organisers export every subject's answers as a **CSV** (one row per subject,
labelled columns; booleans render `yes`/`no`).

:::caution
Registration answers are **personal data**. They are never shown publicly —
the only way to read them is the organiser's authenticated CSV export. They
are **not** included in the platform backup either: a backup carries the
field *definitions* (so the questionnaire moves between installs), but **not**
the collected answers.
:::

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

## Cross-competition skills

Since v1.7.0 a **skills web** spans every competition on the install, not just
one event — a consolidation view gated site-wide by a `skills_enabled` switch.

- **For competitors** — a personal **skills radar** and an at-a-glance stats
  strip (most- and least-solved category, totals) on the profile, built from
  the categories they've solved across every event they've entered.
- **For organisers** — an Administrator **users × skills matrix** that answers
  who's proficient, who's struggling, and who's fresh: **difficulty-weighted**
  scores (decay rarity priced in at solve time), **coverage** against each
  player's genuine opportunity, a **percentile heat-map** as the
  cross-competition comparator, **efficiency** (attempts and hints per solve)
  and **first-blood** signals, activity-window filters, a per-user drill-down,
  and **CSV export**.

## Staff controls

Staff with the team permissions (`team_view_all`, `team_edit_any`,
`team_disqualify`) can inspect and manage any team in their competition.
User-account concerns — bans, password resets, role assignment — live at the
site level; see [Users & roles](/admin/users-roles/).
