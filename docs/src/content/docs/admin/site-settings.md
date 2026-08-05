---
title: Site settings & branding
description: Platform name, palettes and accent colour, custom logos with mandatory attribution, registration policy, and SMTP.
---

Site settings are global — one configuration for the whole install, set by
an Administrator (`manage_site_settings`). Theming is deliberately
**site-wide only** for now; per-competition theming is a possible future
(recorded in ADR-0011).

**Admin → Settings** is tabbed — **General · Email · Auth · Rules · Backup ·
Appearance** (plus an AI placeholder for a future release) — with the active
tab in the URL, so a settings link lands where you meant it to. The Auth
tab requires the separate `manage_auth_providers` permission and is covered
on its own page: [Single sign-on](/admin/sso/).

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
  (PNG/JPEG/WebP/GIF/SVG, up to 1 MB). Since v1.3.0 the type is verified
  from the file's **contents**, not its name or declared content type — a
  renamed non-image is rejected, and PNG/JPEG/WebP rasters with excessive
  pixel dimensions are refused. It's stored in the database, so branding renders before login
  and needs no object storage. A **show wordmark** toggle hides the
  platform-name text for logos that bake in their own name.

**Attribution is mandatory and not configurable**: a subtle "Powered by
Flagpost" footer (the built-in mark, linking to the source repository)
renders on every page. An organisation may fully rebrand the platform;
Flagpost stays visibly the underlying software — this is also how the AGPL's
source-offer surfaces to your users.

## Registration

- **Registration policy** — leave public self-registration open, or close
  it. Closed installs mint accounts from
  [Admin → Users](/admin/users-roles/); the register page shows a notice and
  the login page hides its register link automatically.
- **Email-domain allowlist** — restrict public self-registration to listed
  domains (e.g. your university's). Since v1.3.0 it also gates **new
  accounts arriving through open-posture [SSO providers](/admin/sso/)**
  (just-in-time provisioning), alongside the registration toggle. It never
  applies to admin-minted accounts, users already linked, or closed
  providers (SAML/LDAP directories) — enabling a directory *is* the
  admission decision.
- **Email verification** — when enabled (requires SMTP), a self-registered
  account must verify its address; verifying emits `user.email_verified`.
  Users manage their own address from `/profile` — add, change, or clear.

## Rules & code of conduct

Author site-wide **rules** as rich text on the Rules tab. By default they
gate joining: a competitor must record acceptance before entering a
competition (emitting `competition.rules_accepted`, so organisers can audit
who agreed and when). A **display-only** toggle shows the rules at join
without gating. A competition can carry its own
[rules override](/guides/competitions/#general) that supersedes the site
text; with no rules configured anywhere, there's no gate at all.

## Operational settings

- **SMTP** — host, port, credentials, and sender. Powers the
  [`send_email` automation action](/guides/automations/),
  [password resets](/admin/users-roles/), and email verification; all no-op
  quietly while SMTP is unset. The password is write-only — reads only
  reveal *that* one is set — and since v1.3.0 it's stored encrypted at
  rest and [excluded from platform exports](/admin/backup/).
- **Update checks** — the once-daily, version-only check that drives the
  "update available" notice. Toggle it here, or disable it outright via the
  environment for air-gapped installs; what it sends (and doesn't) is
  documented in [Releases & upgrades](/deploy/upgrades/#the-update-check).

## Backup

The platform [export / import panel](/admin/backup/) lives on the Backup
tab.
