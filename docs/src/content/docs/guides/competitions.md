---
title: Competitions
description: Create, configure, schedule, pause, clone, archive, and delete competitions on a multi-tenant Flagpost install.
---

A Flagpost install can run many competitions at once — public CTFs, private
training events, and parallel site-scoped instances of one global event —
each fully isolated from the others.

## Creating a competition

Creating a competition requires the global `create_competition` permission
(Administrator by default). The create dialog is a short onboarding flow
rather than a bare name field — it captures enough to make the event usable
without a detour into settings:

- **Name and participation mode** — **Team** (competitors form teams;
  scoring, ranks and collab notes are per-team) or **Individual** (every
  account competes alone; the roster lives on the Participants page). The
  mode is not switchable mid-event, so decide before opening registration.
- **Visibility** — public (appears in the lobby) or private (invite code
  only).
- **Public scoreboard** — the spectator-board opt-in, up front.
- **Schedule** — optional start and end times (UTC).
- **Modules** — which [optional modules](#modules) to run. All optional
  modules are **on by default**; you tick the ones to *disable*. The picker
  is fed by the site-level module catalogue (`GET /api/modules`), so it
  works before the competition exists.

Everything here is editable afterwards from Settings — the dialog is a head
start, not a lock-in.

## Settings

Competition Settings is tabbed: **General**, **Controls**, **Challenges**,
**Rules**, **Modules**, **Sharing**, and — when their optional modules are
enabled — **Assistant** and **Certificates**.

### General

- **Visibility** — public competitions appear in the lobby; private ones are
  reachable only by invite code.
- **Joining** — self-serve join for public events, or an invite code (the
  only way into a private one). The code can be regenerated. For a direct,
  managed alternative to the bare code, see [Sharing links](#sharing-links).
- **Public spectator scoreboard** — an explicit opt-in (`off` by default)
  that exposes an unauthenticated, read-only scoreboard — and, since
  v1.3.0, the full-screen
  [venue / projector mode](/guides/scoreboard/#venue--projector-mode) on
  the same page (no separate setting). See
  [Scoreboard](/guides/scoreboard/#public-spectator-board).
- **CTFtime feed** — a separate opt-in exposing a CTFtime-format JSON feed
  for rated events.
- **Brackets / divisions** — a managed vocabulary of division names
  (e.g. *Open*, *Student*). Staff assign subjects to divisions from the
  scoreboard; rankings can be filtered per division.
- **Max team size** (team mode) — enforced at join and when a captain
  approves a join request; blank means unlimited.
- **Rules override** — a per-competition rules / code-of-conduct document
  that supersedes the [site-wide rules](/admin/site-settings/#rules--code-of-conduct)
  for this event. Unless marked display-only, competitors must record
  acceptance before joining (`competition.rules_accepted` gives you the
  audit trail).

### Sharing links

Since v1.7.0 you can share a competition with a **direct link**, not just a
code. Links are managed on the **Sharing** tab under the
`manage_invite_links` permission (a Judge holds it), and come in two kinds:

- **Join links** — for public *and* private competitions. The recipient lands
  on a public page at `/invite/{token}`, signs in or registers, and is walked
  through to joined — the token survives the whole auth round-trip, **including
  SSO**, and still honours the competition's rules, email-verification,
  registration-field and registration-window gates.
- **View links** — public competitions only; a read-only pass to spectate
  without joining.

Every link is **revocable, expiring, and use-capped**, so a leaked link is a
contained, reversible mistake rather than an open door.

### Controls — status and schedule

Every competition carries an explicit **status** — **Not started → Running
→ Ended** — and that status is **the gameplay gate**. New competitions
start **Not started**.

- **Play** (viewing and opening challenges, submitting flags) is open only
  while **Running**. Before it starts, competitors see an empty challenge
  page; after it ends, play closes but results stay readable.
- **Results** (the scoreboard and the dashboard solve ticker) open at start
  and **stay readable after the end** as a final, read-only board.
- Staff holding `challenge_edit` **bypass** the gate in both directions — so
  you can build challenges before the doors open and review them after they
  close (the same bypass **pause**, below, uses).

Joining and registration are **not** gated by status — competitors can
register while the competition is still Not started, ready for the off.

**Run-day controls.** The **Controls** tab has **Start competition** and
**Stop competition** buttons, gated on `manage_schedule`. A manual action
is **authoritative**: once you Start or Stop by hand, the scheduler won't
overturn it (a still-scheduled `end_at`, for instance, won't auto-close a
competition you manually re-started).

**The schedule drives status.** Set start and end times (UTC) on the same
tab and the scheduler transitions the competition automatically — to
Running at `start_at` (if still Not started) and to Ended at `end_at`. This
is a change from earlier releases, where the schedule was purely
informational: a scheduled competition now genuinely opens and closes play
on the clock. `competition.started` and `competition.ended` fire once each
over the competition's lifetime — the first time it starts or ends, manual
or scheduled — so [automations](/guides/automations/) hung off them
(*on end → freeze the scoreboard and open the feedback survey*) never
double-run when you flip status back and forth.

**Pause** is a separate, orthogonal axis — not part of status. While
paused, flag submission returns 403 for competitors (staff with
`challenge_edit` bypass it, so you can test during the pause) and a banner
says so. Pausing is *not* a scoreboard freeze — see
[Scoreboard](/guides/scoreboard/#freezing-the-board) for the difference.

### Challenges

Per-competition challenge vocabulary and rules: managed **categories**,
**tags**, ordered **difficulty tiers**, the **multiple-choice guess cap**
(defaults to 2 guesses per competitor/team per challenge; clear it for
unlimited), and the **challenge ratings** toggle. Details in
[Challenges](/guides/challenges/).

### Modules

Six optional modules can be switched off for this competition:
**Automations**, **Feedback**, **Analytics**, **[AI Assistants](/admin/ai/)**
(which additionally sits behind a site-wide master switch),
**[Certificates](/guides/certificates/)**, and
**[Post-event reports](/guides/reports/)**. Certificates and reports both
need [object storage](/deploy/production/#attachments-and-s3_public_endpoint).
The Modules tab and toggles require the competition-scoped `manage_modules`
permission (previously part of `edit_competition`); built-in Judge and
Administrator hold it. Required-core modules are listed but locked on.
Disabling a module removes its navigation entries and 404s its API for
this competition; disabling Automations also stops *global* rules firing
for this competition's events.

## Lifecycle operations

- **Clone** — deep-copies configuration into a fresh competition: settings,
  categories, challenges (including stored flags), hints, attachments,
  surveys (created closed), and module on/off state. It deliberately starts
  with a clean slate: no participants, scores, tickets, automation rules, or
  audit history; the schedule is cleared and a new invite code minted.
- **Archive / unarchive** — a reversible soft-close. Archived competitions
  disappear from the lobby and switcher and are badged in the admin list.
  If the site's **data-retention policy** is enabled (Admin → Site
  settings → Data retention; on by default at 30 days, configurable
  1–3650), archiving also stamps a purge date: once it passes, the platform
  automatically deletes the competition — attachments out of storage, the
  data tree out of the database — emitting `competition.deleted` with
  `auto: true`. The archive confirmation states the exact deletion date and
  suggests an export first; unarchiving cancels the clock, re-archiving
  restarts it. Competitions archived before the policy existed are never
  touched.
- **Delete** — permanently removes the competition and its entire data tree
  (database and stored attachments), behind a confirmation. There is no
  undo; consider an [export](/admin/backup/) first.

Every one of these emits its event (`competition.created`, `.archived`,
`.deleted`, …) into the [audit log](/admin/audit-log/).
