---
title: Scoreboard
description: The live scoreboard — first blood, dynamic values, divisions, freezing for the final stretch, the public spectator board, and the CTFtime feed.
---

The scoreboard streams over WebSockets: solves, score adjustments, and awards
move the board the moment they land, for everyone watching.

## What the board shows

- **Standings** per team (team mode) or competitor (individual mode) —
  total points are the sum of solve awards, judge/automation score
  adjustments, hint costs, and award points. Ties follow the standard CTF
  convention: equal points rank by the earliest time the subject reached
  its current score.
- **First blood** — the first solve of each challenge is marked (a
  lightning-bolt icon next to the solver).
- **Dynamic values** — decay-scored challenges re-value all their solvers on
  each new solve, so the board always reflects current worth.
- **Divisions** — when the competition defines brackets, a division filter
  ranks within the selected division; staff assign divisions inline from the
  board.

## Freezing the board

A freeze stops the **public** board from moving — competitors keep solving
and their points still count; the standings just stop updating publicly
until the unfreeze. This is the classic end-game tension mechanic.

- Freezing requires the `scoreboard_freeze` permission and shows a
  confirmation explaining exactly these semantics; the frozen board carries a
  persistent note.
- The board everyone sees is computed **as of the freeze instant** — dynamic
  values by solve count at that moment; later solves, adjustments, awards,
  and hint costs excluded.
- Staff can still read the live board (`?live=true` — the UI does this for
  staff automatically).
- Freeze and unfreeze emit `scoreboard.frozen` / `scoreboard.unfrozen`, and
  both exist as [automation actions](/guides/automations/) — a common rule is
  *on `competition.ended` → freeze the board*.

Freezing is different from [pausing](/guides/competitions/#schedule): a pause
stops competitors submitting; a freeze only stops the public board moving.

## Public spectator board

An explicit per-competition opt-in (Settings → General) exposes a read-only,
**unauthenticated** scoreboard for projectors and spectators:

- `/public` lists every competition that opted in;
  `/public/<competition-id>` is the standalone board (no login, branded with
  your site settings).
- Only public, non-archived, opted-in competitions are served — anything
  else 404s, so private events are never disclosed.
- Beyond the table, the page shows **competition insight cards** (most
  solved, most attempted, first-blood leader, fastest solve) and a live
  **cumulative points timeline** of the top ten, so spectators can watch
  overtakes as they happen.
- The spectator board respects the freeze like any competitor view — and so
  does every score-derived insight and the timeline, so the page never
  leaks what the frozen board hides.

## CTFtime feed

A second per-competition opt-in exposes
`GET /api/public/competitions/<id>/ctftime` in the
[CTFtime scoreboard-feed format](https://ctftime.org/json-scoreboard-feed)
(`{"standings":[{"pos","team","score"}]}`), so rated events can plug straight
into CTFtime. The feed URL is shown on Settings → General once enabled.

## Adjustments and awards

Judges with `score_override` can adjust scores (bonus or penalty, with a
reason — emits `score.adjusted`) and grant point-carrying
[awards](/guides/teams/#manual-awards). Both fold into the board live and
appear in the [audit log](/admin/audit-log/).
