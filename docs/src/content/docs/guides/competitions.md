---
title: Competitions
description: Create, configure, schedule, pause, clone, archive, and delete competitions on a multi-tenant Flagpost install.
---

A Flagpost install can run many competitions at once — public CTFs, private
training events, and parallel site-scoped instances of one global event —
each fully isolated from the others.

## Creating a competition

Creating a competition requires the global `create_competition` permission
(Administrator by default). Pick a name and a **participation mode**:

- **Team** — competitors form teams; scoring, ranks, and collab notes are
  per-team.
- **Individual** — every account competes alone; the roster lives on the
  Participants page.

The mode is a per-competition choice — one install can run both kinds at the
same time. It is not switchable mid-event, so decide before opening
registration.

## Settings

Competition Settings is tabbed: **General**, **Schedule**, **Challenges**,
and **Modules**.

### General

- **Visibility** — public competitions appear in the lobby; private ones are
  reachable only by invite code.
- **Joining** — self-serve join for public events, or an invite code (the
  only way into a private one). The code can be regenerated.
- **Public spectator scoreboard** — an explicit opt-in (`off` by default)
  that exposes an unauthenticated, read-only scoreboard. See
  [Scoreboard](/guides/scoreboard/#public-spectator-board).
- **CTFtime feed** — a separate opt-in exposing a CTFtime-format JSON feed
  for rated events.
- **Brackets / divisions** — a managed vocabulary of division names
  (e.g. *Open*, *Student*). Staff assign subjects to divisions from the
  scoreboard; rankings can be filtered per division.
- **Max team size** (team mode) — enforced at join and when a captain
  approves a join request; blank means unlimited.

### Schedule

Start and end times. The scheduler emits `competition.started` and
`competition.ended` events when the clock crosses them — both usable as
[automation triggers](/guides/automations/) (for example, *on end → freeze
the scoreboard and open the feedback survey*).

**Pause** is separate from scheduling: while paused, flag submission returns
403 for competitors (staff with `challenge_edit` bypass it, so you can test
during the pause). A banner tells competitors the competition is paused.
Pausing is *not* a scoreboard freeze — see
[Scoreboard](/guides/scoreboard/#freezing-the-board) for the difference.

### Challenges

Per-competition challenge vocabulary and rules: managed **categories**,
**tags**, ordered **difficulty tiers**, the **multiple-choice guess cap**
(defaults to 2 guesses per competitor/team per challenge; clear it for
unlimited), and the **challenge ratings** toggle. Details in
[Challenges](/guides/challenges/).

### Modules

Optional modules — **Automations**, **Feedback**, **Analytics** — can be
switched off for this competition. Required-core modules are listed but
locked on. Disabling a module removes its navigation entries and 404s its
API for this competition; disabling Automations also stops *global* rules
firing for this competition's events.

## Lifecycle operations

- **Clone** — deep-copies configuration into a fresh competition: settings,
  categories, challenges (including stored flags), hints, attachments,
  surveys (created closed), and module on/off state. It deliberately starts
  with a clean slate: no participants, scores, tickets, automation rules, or
  audit history; the schedule is cleared and a new invite code minted.
- **Archive / unarchive** — a reversible soft-close. Archived competitions
  disappear from the lobby and switcher and are badged in the admin list.
- **Delete** — permanently removes the competition and its entire data tree,
  behind a confirmation. There is no undo; consider an
  [export](/admin/backup/) first.

Every one of these emits its event (`competition.created`, `.archived`,
`.deleted`, …) into the [audit log](/admin/audit-log/).
