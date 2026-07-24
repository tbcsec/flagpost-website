---
title: Import & export
description: Move challenges in ctfcli YAML zips, clone competitions, and take full-fidelity platform backups — no lock-in by design.
---

Everything you put into Flagpost comes back out. Three mechanisms cover the
range from "move my challenges" to "move my whole install".

## Bulk challenge import & export (ctfcli YAML)

Challenges travel as a **zip of ctfcli-format directories** — the same
format the CTFd ecosystem uses, so existing challenge repositories drop
straight in.

- **Export** (`challenge_edit`) — one `<slug>/challenge.yml` per challenge
  plus its attachment files. Regex flags round-trip; **static flag
  plaintexts are omitted** (the platform stores only hashes) — keep your
  authoring repo as the source of truth for those.
- **Import** (`challenge_create`, 50 MB cap) — **additive**: existing titles
  are skipped, never overwritten. Categories are created as needed, tags are
  unioned into the competition vocabulary, hints/files/state come along, and
  prerequisites are resolved by title in a second pass. Static flags supplied
  in the YAML are hashed on the way in, so authoring → import is lossless.

Field-by-field details: [ctfcli YAML format](/reference/ctfcli/).

**Migrating from CTFd?** Export your challenges with
[ctfcli](https://github.com/CTFd/ctfcli) (or use your existing ctfcli-format
challenge repo), zip the challenge directories, and import.

## Cloning a competition

Cloning deep-copies a competition's *configuration* — settings, categories,
challenges (including flags), hints, attachments, closed surveys, module
state — into a fresh competition with a clean slate (no participants,
scores, tickets, rules, or audit; schedule cleared, new invite code). It's
the fastest way to re-run last year's event. See
[Competitions](/guides/competitions/#lifecycle-operations).

## Platform backup (export / import)

Admin → Site settings offers a **full-fidelity, section-selectable backup**
of the whole install — site settings, users, roles, competitions,
automations, audit log — as one versioned JSON document.

Import is **additive**: it creates what's missing and never modifies or
deletes. Details, semantics, and the sensitive-data warning:
[Backup & restore](/admin/backup/).
