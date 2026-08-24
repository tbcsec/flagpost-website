---
title: Certificates
description: Design a certificate template, release it after your event, and let every participant download a shareable, server-rendered certificate — no per-recipient files stored.
---

The **Certificates** module turns one designed template into a shareable
certificate for every participant — name, placement and stats filled in
from the final standings, rendered server-side as a PNG. It's built to
leave the platform: a certificate on a competitor's LinkedIn is an
impression for your event.

Certificates are an **optional module**, enabled per competition (on by
default) under **Settings → Modules**. Authoring needs the
`manage_certificates` permission — held by Judge and Administrator. The
module builds on competitions, scoring and notifications (all core), and
**uploaded backgrounds, image elements, custom fonts and the bulk export
all need [object storage](/deploy/production/#attachments-and-minio_public_endpoint)**;
a solid-colour or preset background needs none.

## Design the template

The **Certificates** settings tab is a WYSIWYG designer over a fixed
**landscape-A4 canvas**. Every element is positioned as a **percentage** of
the canvas, so a template scales cleanly to the final render.

**Background** is one of three kinds:

- **Solid colour** — the default; pick any hex.
- **Preset** — a code-drawn style (Signal, Aurora, Mesh, Circuit, Terminal,
  Classic, Elegant, Modern, Dark), each with two adjustable colours (an
  accent for the trim and a base for the ground).
- **Uploaded image** — your own artwork, scaled to cover the canvas
  (landscape ≈ A4, up to a few MB). Needs object storage.

**Elements** you drag onto the canvas:

- **Token** — a live value from the standings (see below).
- **Text** — fixed wording ("Certificate of Achievement").
- **Image** — a logo or seal (needs object storage).

Each text and token element carries its own **font, size, colour,
alignment** (left / center / right) and **bold / italic**.

### Tokens

Tokens are filled in per recipient at render time:

| Token | Renders |
| --- | --- |
| `recipient_name` | The participant (or team) name |
| `competition_name` | The competition's name |
| `placement` | `3rd place` for a scorer; **`Participant`** for anyone who didn't score |
| `points` | Final points, comma-grouped |
| `solve_count` | Challenges solved |
| `bracket` | The recipient's division, if any |
| `participant_count` | Total entrants on the board |
| `competition_end_date` | The competition's end date |
| `issue_date` | The date the certificate was rendered |

A participant counts as a **scorer** if they have any points or any solve —
everyone else renders as *Participant*, so a whole-field participation
certificate reads correctly.

### Fonts

The designer ships a set of bundled, open-licensed fonts (a serif is the
default). You can also **upload your own brand font** (TTF/OTF, a few MB
each, up to twenty per competition) — you're responsible for holding the
redistribution rights to any font you upload.

### Portable templates

A template exports to a single self-contained **JSON file** (with any
uploaded background, images and fonts embedded), and imports the same way —
so you can carry a house style between competitions or installs.

## Choose who gets one

The **recipient rule** decides the audience:

- **Everyone** — every participant (the default).
- **Scorers only** — just those who put points on the board.

## Release

Nothing is downloadable until you **release**. Three modes:

- **Manual** — you click *Release* when standings are final.
- **On competition end** — released automatically when the competition ends.
- **End + delay** — a set number of minutes after the end (up to a week),
  handy for a final review window.

On release, every recipient gets a **bell notification** ("Your certificate
is ready" — it ignores an automations mute, since it's personal) and a
one-time celebratory prompt. Release is idempotent: a competition releases
once, and re-running the action changes nothing.

## Distribution

- **Self-serve** — participants download their PNG from **Profile →
  Certificates** and from a card on the results / scoreboard page.
- **Bulk export** — organisers kick off an async **ZIP of every recipient's
  certificate**, delivered as a short-lived download link when it's ready.

Nothing per-recipient is ever stored: every certificate is a pure function
of *(template × that recipient's standing)* and renders **on demand**, so
there are no stale files to clean up and a correction to the template is
instantly reflected in every download.

## The footer mark

Every certificate carries an understated **`flagpost.io` footer mark**,
composited into the bottom margin by the server. Because the client only
ever receives the finished PNG, the mark can't be moved, hidden or styled
away — the certificate is designed to be shared, and it carries its origin
with it.

## Automation & audit

Releasing emits `certificate.released`, and saving the template emits
`certificate.template_updated` — both usable as
[automation triggers](/guides/automations/) and recorded in the
[audit log](/admin/audit-log/). See the
[event catalogue](/reference/events/#certificates--reports).
