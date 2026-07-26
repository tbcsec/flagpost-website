---
title: Feedback & analytics
description: Post-event surveys with CSV export, post-solve challenge ratings, and per-challenge and per-team analytics.
---

Two optional modules close the loop after (and during) an event: **Feedback**
(surveys and challenge ratings) and **Analytics** (challenge and team
insight). Both are per-competition toggleable and on by default.

## Surveys

Staff with `feedback_manage` build surveys from five question types —
1–10 rating, 1–5 rating, short text, long text, and multiple choice — and
reorder them freely.

- **Opening** a survey (manually, or via the `open_survey`
  [automation action](/guides/automations/)) makes it answerable and emits
  `survey.opened`. The classic pattern: open it automatically an hour before
  the end.
- **Competitors** answer an open survey once (`feedback_submit` — the
  Participant role has it), emitting `survey.submitted`.
- **Results** are readable with `feedback_view_responses`, with one-click
  **CSV export** for your retro tooling.

## Challenge ratings

A per-competition toggle (Settings → Challenges) prompts competitors for a
**1–5 star rating right after they solve** a challenge — the moment their
opinion is sharpest. One rating per user per challenge; re-rating updates it.
Averages and counts surface on the Feedback page and in the analytics
challenge table, and each rating emits `challenge.rated`.

## Challenge & team analytics

The Analytics module (`view_competition_analytics`, staff) reads everything
the platform already recorded — no extra instrumentation:

A row of **insight cards** answers the judge questions directly — least
solved, most attempted, most tickets, most first bloods — kept live as the
event runs, with unanswerable cards omitted rather than zero-filled.

**Challenges table** — per challenge: solves, attempts and fails, completion
rate, average solve time, hint usage, linked support tickets, and rating
average. This is where an over-hard or broken challenge shows up fast: high
fails, low completion, rising tickets.

**Teams table** — per team/competitor: rank, points, solves, first bloods,
tickets opened, and last solve time.

## Platform overview

Administrators get a cross-competition **Admin → Dashboard** overview
(`view_global_analytics`): platform totals and per-competition health —
derived status, participants, challenges, solves, and open tickets at a
glance.
