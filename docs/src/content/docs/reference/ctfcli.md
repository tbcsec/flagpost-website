---
title: ctfcli YAML format
description: The challenge import/export format — zip layout, the field map, and what round-trips versus what is deliberately omitted.
---

Flagpost bulk-moves challenges in the
[ctfcli](https://github.com/CTFd/ctfcli) `challenge.yml` format used across
the CTFd ecosystem, so existing challenge repositories import directly and
Flagpost exports drop into ctfcli-based workflows.

## Zip layout

```
export.zip
├── web-heap-of-trouble/
│   ├── challenge.yml
│   └── files/
│       └── handout.tar.gz
├── crypto-rsamble/
│   └── challenge.yml
└── …
```

One directory per challenge (slugged from the title), a `challenge.yml`
inside, attachment files alongside it.

## Field map

| YAML field | Flagpost meaning |
| --- | --- |
| `name` | Title (import skips titles that already exist) |
| `category` | Category — created in the competition if missing |
| `description` | Challenge body (converted between rich text and plain text) |
| `value` | Points (initial value for dynamic scoring) |
| `type: dynamic` + `extra` | Dynamic decay scoring — `extra` carries the minimum value and decay parameters |
| `flags` | Static flags (plaintext in YAML, **hashed on import**) and regex flags |
| `tags` | Challenge tags — unioned into the competition's managed vocabulary |
| `extra.difficulty` | Difficulty tier |
| `hints` | Hints (with costs) |
| `files` | Attachment file references within the zip |
| `state` | Visible/hidden state |
| `requirements` | Prerequisites, referenced **by challenge title** and resolved in a second pass after all challenges import |

## Semantics worth knowing

- **Import is additive** (`challenge_create`, 50 MB zip cap): existing
  titles are skipped, never overwritten. There's no per-row event spam — a
  bulk import is one authoring operation.
- **Static flag plaintexts don't export.** Flagpost stores only salted
  hashes, so it cannot write your plaintext back out — keep the authoring
  repository as the source of truth. Regex flags round-trip fully. Importing
  YAML that contains plaintext static flags hashes them on the way in, so
  **authoring → import is lossless**.
- Prerequisites that name a title not present in the zip (or the
  competition) simply don't attach — check the challenge editor after
  importing chained content.

## Migrating from CTFd

If your challenges already live in a ctfcli-format repository, zip the
challenge directories and import. If they live only inside a CTFd instance,
pull them with `ctf challenge pull` / your existing ctfcli workflow first,
then zip and import the result.
