---
title: Challenges
description: Author CTF challenges with static, regex, or multiple-choice flags; dynamic decay scoring; hints, attachments, prerequisites, scheduled release and tags.
---

Challenges are authored per competition by staff holding the
`challenge_create` / `challenge_edit` permissions (Judge and Administrator by
default), then **published** (`challenge_publish`) to become visible to
competitors.

## Flag types

| Type | How it grades | Notes |
| --- | --- | --- |
| **Static** | Exact match against a salted hash | The plaintext flag is never stored or returned by any API — the edit screen shows only *that* a flag is set. |
| **Regex** | The submission is matched against a stored pattern | Evaluation is hardened against catastrophic backtracking (ReDoS) — see [ADR-0018](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0018-regex-flag-redos-containment.md). |
| **Multiple choice** | The picked option is hashed and compared like a static flag | Options are public; the correct answer never leaves the server. |

### Multiple-choice guess caps

Because a finite option set is trivially brute-forced, multiple-choice
challenges respect a **competition-wide guess cap** (default **2** guesses
per competitor/team per challenge, configurable under Competition Settings →
Challenges; clear it for unlimited). Once the cap is hit, further guesses are
refused *before* grading, so the lockout can't be probed for correctness.

Staff can hand guesses back non-destructively with **guess resets** — for one
competitor/team or for everyone on a challenge. A reset records a cutoff
rather than deleting anything, so submission history stays intact for
analytics and audit. Resets emit `challenge.guesses_reset`.

## Scoring

- **Static** — a fixed point award.
- **Dynamic (decay)** — the CTFd-style quadratic model: worth `points`
  initially, decaying toward `min_points` over `decay` solves. Every
  solver **converges to the current value**: each new solve re-values all
  earlier solves, so the board always reflects what the challenge is worth
  right now. Cards display the live value alongside a "dynamic" marker.

## Hints

Challenges can carry hints, optionally with a point cost charged to the
competitor/team that reveals them (`challenge.hint_requested` records the
cost). Hints can also be **released** to everyone for free by staff or by the
`release_hint` [automation action](/guides/automations/) — for example, a
timed hint wave — emitting `hint.released`.

## Attachments

Files attach per challenge and are stored in MinIO/S3. Downloads go through
**short-lived signed URLs** issued only after the same permission check as
viewing the challenge, so a pasted link stops working once the challenge is
unpublished or the event ends.

## Gating what competitors see

- **Prerequisites** — a challenge can require other challenges to be solved
  first. Locked challenges are **shown locked** (visible, not openable), the
  lock is enforced server-side on submission, and the dialog names the
  unsolved prerequisites. Prerequisites must be same-competition challenges.
- **Scheduled release** — a published challenge with a future release time
  stays hidden from competitors until the clock passes it (staff always see
  it). Combine with prerequisites for waved releases.

## Tags and difficulty

Both come from **per-competition managed vocabularies** (Competition
Settings → Challenges). Challenge metadata is validated against the vocab, so
a typo can't invent a new tag. Competitors see difficulty badges and tag
chips on the challenge cards.

## Browsing: cards or list

Competitors choose how the challenge page reads (v1.3.0): a **Cards /
List** toggle sits at the right of the filter row. Cards — the default —
keep the paginated grid; **List** groups challenges by category into
collapsible sections of compact rows (name, difficulty, solve count,
points), with a padlock on locked challenges and a tint on solved ones.
The choice and per-category expand state persist per device (browser
storage, not the account), and the category and availability filters apply
identically in both views.

## Solves, first blood, and ratings

Every challenge shows its solver list (earliest first) with the first solve
tagged as **first blood**. If **challenge ratings** are enabled for the
competition, competitors are prompted for a 1–5 rating after solving;
averages surface on the Feedback page and in
[analytics](/guides/feedback/#challenge--team-analytics).

## Submission handling

Flag submission is the one endpoint competitors have an incentive to script,
and it is treated accordingly:

- Per-user/per-team **rate limiting** with escalating backoff, tighter than
  general API limits.
- **Idempotent on repeat-correct** — resubmitting a solved flag never
  re-awards points or re-emits `challenge.solved`.
- **Every attempt is logged**, not just successes — failed attempts feed
  challenge-health analytics.
- Submissions are refused while the competition is
  [paused](/guides/competitions/#schedule) or the challenge is locked.

## Bulk import and export

Challenges move in and out as **ctfcli-format YAML** (the format CTFd
tooling uses), zipped with their attachments — see
[Import & export](/guides/import-export/) and the
[format reference](/reference/ctfcli/).
