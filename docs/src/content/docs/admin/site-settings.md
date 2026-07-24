---
title: Site settings & branding
description: Platform name, palettes and accent colour, custom logos with mandatory attribution, registration policy, and SMTP.
---

Site settings are global — one configuration for the whole install, set by
an Administrator (`manage_site_settings`). Theming is deliberately
**site-wide only** for now; per-competition theming is a possible future
(recorded in ADR-0011).

## Appearance

- **Platform name** — the wordmark text shown across the app and on the
  public pages.
- **Palette** — five curated presets: **Harbor** (default), **Eclipse**, and
  **Umbra** (dark); **Daybreak** and **Sandstone** (light). Palettes are
  full token sets, hand-tuned for contrast — not a free-form background
  picker. Individual users can override the palette for themselves from the
  top bar; the accent and name stay site-wide.
- **Accent colour** — a preset or any custom hex. The accent recolours
  actions (buttons, focus rings) only; success-green and the logo never take
  the accent, so "solved" always reads as Flagpost green.
- **Custom logo** — replace the built-in mark with your organisation's logo
  (PNG/JPEG/WebP/GIF/SVG, up to 1 MB). It's stored in the database, so
  branding renders before login and needs no object storage. A
  **show wordmark** toggle hides the platform-name text for logos that bake
  in their own name.

**Attribution is mandatory and not configurable**: a subtle "Powered by
Flagpost" footer (the built-in mark, linking to the source repository)
renders on every page. An organisation may fully rebrand the platform;
Flagpost stays visibly the underlying software — this is also how the AGPL's
source-offer surfaces to your users.

## Operational settings

- **Registration policy** — leave public self-registration open, or close
  it. Closed installs mint accounts from
  [Admin → Users](/admin/users-roles/); the register page shows a notice and
  the login page hides its register link automatically.
- **SMTP** — host, port, credentials, and sender. Powers the
  [`send_email` automation action](/guides/automations/) and
  [self-service password resets](/admin/users-roles/); both no-op quietly
  while SMTP is unset. The password is write-only — reads only reveal *that*
  one is set.

## Backup

The platform [export / import panel](/admin/backup/) also lives on this
page.
