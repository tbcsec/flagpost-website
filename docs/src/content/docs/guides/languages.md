---
title: Interface languages
description: Flagpost's UI ships in four languages, chosen per device with a cookie. What's translated, what deliberately isn't, and how to contribute a locale.
---

Flagpost's web interface is translatable, and ships live in four languages:

- **English**
- **Français**
- **Español**
- **Polski**

Each carries over two thousand translated UI strings. It's a procurement
answer for the audience Flagpost is built for — universities and national
organisers running events in their own language.

## Choosing a language

Inside the app, the **globe menu** in the top bar (between the help and
theme menus) switches language. On the pages you reach before signing in —
login, registration, the public spectator boards — an inline language
dropdown does the same.

The choice is a **per-device cookie**, not an account setting, so it
follows the browser rather than the login. A first-time visitor gets their
browser's preferred language if it's one Flagpost ships, and English
otherwise.

## What's translated — and what isn't

The boundary is deliberate and worth stating plainly:

- **The UI chrome is translated** — buttons, labels, navigation, settings,
  the whole operator and competitor surface.
- **Operator content is never translated.** Challenge text, announcements,
  rules, [custom pages](/admin/pages/) and
  [certificate templates](/guides/certificates/) are *your* words, in the
  language you wrote them — the platform leaves them exactly as authored.
- **Backend messages are still English.** A handful of server-generated
  strings — some API error messages and outbound emails — remain English
  for now; translating them is a known follow-up.

Right-to-left layouts and full backend translation are future work.

## Contributing a translation

Translations flow through **[Crowdin](https://crowdin.com/)**. The English
source of truth is `frontend/messages/en.json`; Crowdin machine
pre-translates, human reviewers refine, and the results land back in the
repository as `messages/<locale>.json`. A continuous-integration check
holds every catalogue to the English source's keys and its ICU
placeholders and tags, so a translation can't ship with a missing variable
or a broken plural. Any string a locale hasn't translated yet falls back to
English, per string, until review fills it in.

Adding a new language is a small configuration change plus a Crowdin
catalogue — the machinery to hold the rest is already in place
([ADR-0029](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0029-frontend-i18n-next-intl-crowdin.md)).
If you'd like to help translate or correct a locale, open an issue or a
discussion on [GitHub](https://github.com/tbcsec/flagpost).
