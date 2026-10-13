---
title: Challenges
description: Author CTF challenges with static, regex, or multiple-choice flags; dynamic decay scoring; hidden and scheduled hints, attachments, prerequisites, scheduled release and tags.
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

### Wrong-guess penalty

Since **v1.4.0**, a second anti-brute-force lever beside the cap: an
optional **wrong-guess penalty (%)** (next to the guess limit in
Competition Settings → Challenges; blank = off, the default). Each
incorrect multiple-choice guess lowers that challenge's value **for the
guessing subject only** (the team in team mode) by that percentage of the
base value, linearly, floored at zero — a later correct answer awards the
reduced value. It composes with dynamic scoring (the percentage applies
to the current dynamic worth, and each solver's own deduction survives
later re-valuing), and competitors always see it happening: the detail
dialog says "each wrong guess lowers this question's value by N%", the
reduced value shows with the base struck through, and the value drops
live the instant a wrong guess lands. Guess resets restore the value
along with the attempts. Competition-wide, multiple-choice only, and an
explicit opt-in — enabling it never silently changes existing scoring.

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
cost). A hint can also be **granted free to a single competitor or
team** by the `release_hint`
[automation action](/guides/automations/) — it targets the triggering
event's subject, emitting `hint.released` (there is deliberately no
staff-facing "grant to person X" button; rules are the mechanism).

Since **v1.4.0**, a hint can be authored **hidden**: a *Hidden until
released* checkbox in the editor's hints panel, with an optional *Release
at* time. Competitors never see a hidden hint — it isn't listed, and a
direct reveal 404s so its existence can't leak — while staff see a
**Hidden** or **Releases &lt;time&gt;** badge and a **Publish** button. A
hidden hint becomes visible to everyone (**published** — the normal
cost/reveal rules then apply) three ways: the Publish button, its
`release_at` schedule, or the `publish_hint` automation action — each
emitting `hint.published` exactly once on the hidden→visible transition,
so follow-up automations can chain off it. That's the tool for **timed
hint waves**. A still-hidden hint can't be `release_hint`-ed to a subject
— publish first, then grant — and cloning a competition preserves
hidden/schedule state, so a clone never publishes early.

## Attachments

Files attach per challenge and are stored in object storage (RustFS/S3). Downloads go through
**short-lived signed URLs** issued only after the same permission check as
viewing the challenge, so a pasted link stops working once the challenge is
unpublished or the event ends.

## Connection info

A challenge that runs a **live service** carries an optional
`connection_info` field — a URL, a `host:port`, or a short instruction
("`nc chal.example.org 1337`"). It's free-form (up to 500 characters, no
format validation), it's a real field now rather than something smuggled
into the description, and it mirrors the ctfcli/CTFd spec exactly, so a
`challenge.yml` from a real ctfcli repository
[round-trips](/reference/ctfcli/) — previously an imported challenge's
connection info was silently dropped.

Competitors see it as a **copyable chip**, only once the challenge is
unlocked for them; `http(s)` addresses become links (through a stricter URL
check than CTFd's, so `javascript:`/`data:` values stay inert text).
[Cloning](/guides/competitions/#lifecycle-operations) a competition copies
connection info (unlike a scheduled release time, which is cleared).

## Live instances

Since **v1.6.0**, instead of pointing every team at one shared endpoint a
challenge can hand each competitor/team its **own isolated running
container** — spun up on demand, torn down on a TTL. You author this as a
per-challenge **deployment spec** (at most one per challenge) in the
editor's **Deployment** section (`challenge_edit`): the container backend
(Docker or Kubernetes), the image, how it's exposed (`tcp`, `http`, or
`none`), which ports, environment, resource limits, lifetime, and a
per-subject cap on concurrent instances. A challenge with a spec shows
competitors a **Launch instance** panel; the `instances` module (optional,
off by default per competition) and a site-level provisioner must both be
configured first.

The spec also carries a **flag mode**: `static` keeps the challenge's
ordinary flag, while `unique_per_instance` renders a distinct flag into each
container from a template and grades a submission against the submitter's
own live instance — so a leaked flag is provably not the submitter's.

See [Challenge instances](/deploy/challenge-instances/) for the full setup.

## Authoring on the manage route

Challenge authoring lives on a dedicated **/challenges/manage** surface
(the *Manage challenges* action on the challenges page): a persistent,
searchable list on the left, the editor for the selected challenge on the
right, and Save / Publish / Delete in a top action bar. Secondary fields —
connection info, scheduled release, prerequisites, difficulty, tags — fold
into a **More options** section. Your selection persists across a save, and
creating a challenge selects it for editing straight away.

## Gating what competitors see

- **Competition status** — the outermost gate. While a competition is
  [Not started](/guides/competitions/#controls--status-and-schedule), the
  challenge list is empty and challenge detail is closed to competitors;
  play opens when it starts. Staff holding `challenge_edit` bypass it.
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
  [paused](/guides/competitions/#controls--status-and-schedule) or the challenge is locked.

## Bulk import and export

Challenges move in and out as **ctfcli-format YAML** (the format CTFd
tooling uses), zipped with their attachments — see
[Import & export](/guides/import-export/) and the
[format reference](/reference/ctfcli/).
