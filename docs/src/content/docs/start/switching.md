---
title: Switching from another platform
description: Move your whole event to Flagpost — challenges, competition setup, people, and go-live — with an honest account of what ports automatically and what gets recreated.
---

Moving to Flagpost is an afternoon's work, not a rewrite — but different
parts of an event move differently. This guide walks the whole thing:
what imports automatically, what you recreate (and how fast), what
deliberately doesn't move, and the cutover itself.

One rule up front: **migrate between events, never mid-event.** Finish (or
archive) the running competition where it is; launch the next one on
Flagpost.

## 1. Challenges — automatic

Challenges are the bulk of the value, and they port in one step: Flagpost
bulk-imports **ctfcli-format YAML zips** — the format the CTFd ecosystem
already uses.

- Your challenge repo is already ctfcli-format? Zip the challenge
  directories and import (Manage challenges → Import). Titles, categories,
  descriptions, point values, dynamic-decay settings, static and regex
  flags, hints, attachment files, tags, difficulty, visibility state, and
  title-referenced prerequisites all come across; categories are created
  and tags join the competition vocabulary automatically.
- Challenges only live inside a CTFd instance? Pull them out with
  [ctfcli](https://github.com/CTFd/ctfcli) first (`ctf challenge pull`),
  then zip and import.

Details and the field map: [Import & export](/guides/import-export/) and
the [ctfcli format reference](/reference/ctfcli/).

:::tip[Rehearse the flags]
Import into a scratch competition first and submit a few flags yourself —
regex flags especially, since engines differ subtly between platforms. A
ten-minute rehearsal beats a mid-event surprise.
:::

## 2. Competition setup — recreated, fast

There's no importer for another platform's configuration — settings models
differ too much for that to be honest — but a Flagpost competition is a
few minutes of Settings tabs:

- **General** — visibility, join mode (self-serve or invite code),
  participation mode (team or individual), max team size, divisions
  (brackets), public spectator board and CTFtime feed opt-ins.
- **Schedule** — start/end (the scheduler emits the lifecycle events your
  automations can hang off).
- **Challenges** — categories arrive with the import; add tag/difficulty
  vocab, the multiple-choice guess cap, and challenge ratings if you want
  them.
- **Automations** — the things you previously scripted or did by hand
  (first-blood announcements, hint waves, end-of-event freeze + survey)
  become [When → If → Then rules](/guides/automations/).

Once configured, **you never rebuild this again**: [clone](/guides/competitions/#lifecycle-operations)
the competition for your next event, or use the
[platform backup](/admin/backup/) to move whole installs — both are
full-fidelity within Flagpost.

## 3. People — fresh accounts, by design

Accounts are the one thing that genuinely can't port: no platform can (or
should) export usable password hashes into another. Flagpost keeps
re-registration as close to zero-friction as it gets:

- **Username-first identity** — email is optional, so sign-up is one field
  and a password.
- **Self-serve joining** — public competitions are one click to enter;
  private ones take an invite code you share once.
- **Teams re-form themselves** — captains create the team and share its
  invite code; optional approval and size caps enforce your rules without
  staff involvement.
- **Closed registration?** Mint accounts from Admin → Users and hand out
  credentials; self-service password reset takes over from there (with
  SMTP configured).

For recurring events this is a one-time cost: from then on your users live
in your install, and [platform backups](/admin/backup/) carry them between
Flagpost installs with full fidelity.

## 4. What deliberately doesn't move

Historical state belongs to the old platform: past scores, solve logs,
submission history, old support threads, and write-ups won't import —
there's no honest way to translate another platform's scoring history into
Flagpost's event-sourced records. Keep the old instance around read-only
(or export its data to cold storage) if you need the archive; start the
new era clean.

## 5. Cutover checklist

1. **Stand up Flagpost** — [production deployment](/deploy/production/) on
   your domain; run the [setup wizard](/admin/setup/).
2. **Import challenges** into a rehearsal competition; test flags,
   attachments, and unlock chains.
3. **Configure the real competition** (§2) and
   [clone](/guides/competitions/#lifecycle-operations) from the rehearsal
   if you like what you have.
4. **Wire the event ops** — automations, announcement templates, a
   feedback survey scheduled for the final hour.
5. **Open registration** ahead of the event so teams form early.
6. **Repoint the world** — DNS, event page links, and the
   [CTFtime feed URL](/guides/scoreboard/#ctftime-feed) if your event is
   rated.
7. **Retire the old instance** to read-only once the archive question is
   settled.

Stuck on something this guide doesn't cover? Ask in
[GitHub Discussions](https://github.com/tbcsec/flagpost/discussions) —
migration friction is exactly the feedback that shapes the roadmap.
