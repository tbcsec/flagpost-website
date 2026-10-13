---
title: Flagpost vs CTFd — an open-source CTFd alternative
description: An honest comparison of Flagpost and CTFd for self-hosted CTFs — real-time operations, automation, RBAC and multi-tenancy versus CTFd's maturity and ecosystem.
---

If you're choosing a platform for a capture-the-flag event, the incumbent
comparison is **CTFd** — the most widely used open-source CTF platform, and
a genuinely good one. This page lays out where the two differ so you can
decide on facts. It's written by the Flagpost project, so read it with that
in mind — and if we've misrepresented CTFd,
[tell us](https://github.com/tbcsec/flagpost/issues) and we'll fix it.

**The short version:** both platforms score flags well. CTFd brings a
decade of production events, a large plugin/theme ecosystem, and a hosted
offering. Flagpost's case is the **event-operations layer being built in**
— a live board with presence and notifications, an automation engine,
support tickets, granular RBAC, and many competitions per install — with
every feature free and self-hosted under Apache-2.0.

## Side by side

Built-in capabilities, as we understand CTFd core (v3.x) in mid-2026 —
without plugins or paid tiers.

| Capability | Flagpost | CTFd |
| --- | --- | --- |
| Licence & model | Apache-2.0 — every feature, self-hosted, free | Apache-2.0 core, free self-hosted; some features on hosted/paid tiers |
| Scoring essentials — dynamic decay, freeze, hints | Built in | Built in |
| First-blood recognition | Marker on the board + automation trigger, built in | Webhook events on Hosted/Enterprise tiers |
| Challenge import/export | ctfcli-format YAML (CTFd-compatible) | ctfcli (native) |
| Real-time scoreboard & presence | WebSockets throughout — board, presence, tickets, notifications | Live notifications; scoreboard updates on refresh |
| Competitions per install | Many — multi-tenant from the ground up | One event per instance |
| Roles & permissions | Granular catalogue, custom roles, per-competition scope | Admin / user |
| Automation engine | Visual When → If → Then rules on any platform event | — |
| Support tickets | Built in — live queue, assignment, internal notes, attachments | External (Discord, forms) |
| Collaborative team notes | Built in — CRDT co-editing per challenge | — |
| Multiple-choice flags, guess caps & wrong-guess penalties | Built in | Via plugins |
| On-demand challenge instances | Built-in optional module — Docker or Kubernetes, per-team isolated containers, unique per-instance flags, TTL reaping | Via third-party add-ons such as CTFd-Whale |
| Single sign-on | OIDC, OAuth2 (incl. GitHub/Discord), SAML 2.0, and LDAP/Active Directory built in, free | MajorLeagueCyber OAuth in core; broader SSO via plugins or hosted tiers |
| Custom registration fields | Built in — per-competition, four field types, required enforcement, CSV export | Global account fields in core; not per-competition |
| Surveys & post-solve ratings | Built in | — |
| AI assistants | Optional module (v1.4.0) — organiser Q&A and a guard-railed competitor assistant, bring your own model | — |
| Analytics | Challenge/team analytics, insight cards, submissions browser | Score graphs and submission listings |
| Public spectator board | Opt-in board with insight cards, a points timeline, and a full-screen venue/projector mode with first-blood splashes | Public scoreboard on public instances |
| Custom pages | Built in — structured rich text, with a delegable editor grant that can't inject script | Built in — raw HTML/CSS/JS |
| Interface languages | Four maintained UI locales (English, Français, Español, Polski) on a Crowdin workflow | Community translations, coverage varies |

## Where CTFd is the better fit

Honesty cuts both ways:

- **Maturity and track record.** CTFd has run thousands of events over many
  years; Flagpost went public in July 2026. If "battle-tested above all"
  is your requirement, CTFd earned that.
- **Ecosystem.** CTFd's plugin and theme ecosystem is large and
  community-maintained. Flagpost has a signed, trust-tiered content-pack
  marketplace and an authoring SDK as of v1.7.0, but third-party **code**
  modules (and a module sandbox) are still to come, and its catalogue is
  young next to CTFd's.
- **Hosted service.** If you want someone else to run the infrastructure,
  ctfd.io exists; Flagpost is self-hosted only.
- **Free-form HTML pages.** Both platforms have custom pages, but CTFd
  lets you author raw HTML/CSS/JS; Flagpost's pages are structured rich
  text by design, so if you need arbitrary markup or embedded scripts on a
  page, CTFd allows it and Flagpost deliberately doesn't.

## Where Flagpost pulls ahead

Everything your staff does *during* an event: watching a live board rather
than refreshing one; automation rules doing announcements, hint waves and
the end-of-event freeze instead of a human with a checklist; competitor
questions arriving as tickets in a live queue instead of a Discord channel;
judges holding exactly the permissions you gave them; and the next event
being a clone or a second tenant instead of a second server. For the people
running the box, there's an opt-in, token- or allowlist-gated Prometheus
`/metrics` endpoint (off by default) exposing operational metrics only. The
[apex comparison](https://flagpost.io/#compare) is the one-page version of
this list.

## Trying it and switching

Because both platforms speak **ctfcli**, evaluation is cheap: export your
existing challenge repo, [import the zip](/guides/import-export/), and run
a rehearsal competition against the [demo](https://demo.flagpost.io) or a
local `docker compose up`. If it sticks, the
[migration guide](/start/switching/) covers moving the whole event —
challenges automatically, people via [SSO](/admin/sso/) or fresh accounts,
and an honest list of what doesn't port.
