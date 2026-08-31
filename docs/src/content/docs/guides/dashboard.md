---
title: Staff dashboard
description: The per-competition dashboard of live widgets — and the drag-and-resize grid layout staff can rearrange, persisted per user.
---

Each competition opens onto a dashboard of **live widgets**. What you see
depends on who you are: staff get the manager view — competition stats,
recent activity, announcements, challenge health, and the support queue —
while participants get their own standing and solves. Everything updates
live over the same [WebSocket layer](/dev/architecture/#the-real-time-layer)
as the rest of the app.

Those five are the manager view's defaults. Since **v1.6.0** it also carries
a set of optional **add-from-catalogue** sections — extra operational panels
you add when you want them and leave off when you don't. See
[Manager sections](#manager-sections) below.

## Rearranging it

Staff holding `customize_dashboard` (Judge and Administrator by default)
get an **edit mode**. Since **v1.4.0** it's a fluid **12-column grid**:

- **Drag to move, grab a corner to resize** — snapped to whole cells,
  with each widget keeping a sensible minimum size.
- **Keyboard controls** per section (move / resize) as an accessible
  fallback.
- **Save / Cancel / Reset to default** for your changes.

A section is on your dashboard when — and only when — it's on the grid.
In edit mode an **Add section** button opens a modal listing every section
you don't yet have as a card (name plus a short description); pick one and
it drops in at the bottom, ready to drag and resize. **Remove** a section
(the control on the section itself) and it goes back to the catalogue, where
you can add it again later. The catalogue is scoped to your view, so the
manager catalogue only offers manager sections.

Layouts persist **per user** — your arrangement is yours, not the
competition's. On mobile the grid stacks to a single column.

:::note[Upgrading from before v1.4.0]
Layouts saved before v1.4.0 can't be mapped onto the new 2D grid — they
reset to the default arrangement once, and your next save sticks.
:::

## Manager sections

Beyond the five defaults, the manager view carries seven **opt-in**
sections. None ship on the default layout — they surface only through the
**Add section** catalogue above, so upgrading changes nothing until you add
one. A section whose backing permission you lack just renders as an empty
card.

- **Unsolved challenges** — published challenges nobody has solved yet,
  ranked by attempts, so the too-hard or broken ones stand out. Gated by
  `view_competition_analytics`.
- **Difficulty progress** — how many challenges in each difficulty tier
  have been solved, as a solved-of-total bar per tier. Gated by
  `view_competition_analytics`.
- **Team activity** — who's most active right now and which teams have
  gone quiet, with an idle flag for anyone silent for an hour. (In solo
  competitions the subject is the individual, not a team.) Gated by
  `view_competition_analytics`.
- **Brute-force watch** — the teams submitting the most wrong flags, a
  flag-guessing signal. Gated by `view_competition_analytics`.
- **Moderation feed** — recent significant actions in this competition
  (deletions, score changes, freezes) — high-level summaries, not raw
  payloads. It draws a curated allowlist of
  [audit-log events](/reference/events/), not the full log; see the
  [audit log](/admin/audit-log/). Gated by `view_competition_analytics`.
- **Schedule & status** — current status, the countdown to start or end,
  and whether the scoreboard is frozen. No extra permission — it's derived
  from the competition itself.
- **Instance health** — live [challenge instances](/deploy/challenge-instances/)
  by status, plus recent provisioning failures. Gated by `instance_view`
  (not analytics).

Adding sections needs `customize_dashboard` (Judge and Administrator by
default) — the same grant that unlocks edit mode. The related
`manage_dashboard_widgets` grant remains defined but enforced nowhere; the
catalogue doesn't use it. See the
[permissions reference](/reference/permissions/).
