---
title: Site settings & branding
description: Platform name, palettes and accent colour, custom logos with mandatory attribution, animated sign-in backgrounds, the sign-in notice, registration policy, and SMTP.
---

Site settings are global — one configuration for the whole install, set by
an Administrator (`manage_site_settings`). Theming is deliberately
**site-wide only** for now; per-competition theming is a possible future
(recorded in ADR-0011).

**Admin → Settings** is tabbed — **General · Email · Auth · Rules · Backup ·
Appearance · AI** — with the active tab in the URL, so a settings link
lands where you meant it to. Two tabs require their own permission and are
covered on their own pages: Auth (`manage_auth_providers`,
[Single sign-on](/admin/sso/)) and, since v1.4.0, AI (`manage_ai`,
[AI assistants](/admin/ai/)).

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
- **Sign-in background** (v1.4.0) — an optional animated backdrop for the
  pages outside the app shell (sign-in, registration, first-run setup,
  password reset, and the public spectator pages): **Aurora** (soft
  drifting ribbons of light), **Gradient wash** (a slow colour field), or
  **Constellation** (a particle network that reacts to the cursor);
  **None**, a flat ground, is the default. It recolours itself from the
  palette and accent you already chose, shows on dark palettes only
  (falling back to the flat ground on light — the picker warns), never
  renders inside the authenticated app, honours the OS reduced-motion
  preference with a static frame, and pauses in hidden tabs.
- **Sign-in notice** (v1.4.0) — a rich-text notice (same editor as the
  rules) shown above the sign-in card: event instructions, "use your work
  account", a support contact. It is served **unauthenticated** to anyone
  who can reach the sign-in page, so it must contain only public
  information; clearing the text removes it.

**Attribution is mandatory and not configurable**: a subtle "Powered by
Flagpost" footer (the built-in mark, linking to the source repository)
renders on every page. An organisation may fully rebrand the platform;
Flagpost stays visibly the underlying software. The
[Apache-2.0 licence](https://github.com/tbcsec/flagpost/blob/main/LICENSE)
grants no rights to the Flagpost name or marks, so the credit stays even
though the code is free to modify and self-host.

### Custom brand themes

Since v1.6.0, a **custom brand theme** is a third theming axis alongside
the five built-in palettes and the accent picker — and, like both, it is
site-wide and admin-only, gated on the same `manage_site_settings`
permission. A theme is a **complete pack of the 24 UI colour tokens**
(surfaces, text, brand/action colour, status colours, borders) plus a
dark or light mode. It is deliberately **colours only** — never CSS,
JavaScript, fonts, or markup. That limit is the security boundary: a
theme recolours the existing components, it never restyles or moves them.

Custom themes are **additive** — they appear as cards in the same palette
picker as the built-ins, not a replacement. **Activate** a theme by
selecting its card; it becomes the site's default palette. Selecting a
custom theme replaces the accent picker with a note, because the theme
owns its own action colour. A live preview shows while you configure, and
changes don't persist until you save. You **cannot delete the active
theme** — switch the site to another palette or theme first.

Themes upload and download as a **portable JSON file** — an object of
exactly `{id, name, mode, tokens}`. The `id` is an immutable lowercase
slug (it is what the site default points at, so renaming would dangle it)
and cannot collide with a built-in palette id
(`harbor`/`eclipse`/`umbra`/`daybreak`/`sandstone`); `mode` is `dark` or
`light`; `tokens` must carry all 24 keys, each a `#RRGGBB` hex, with no
extras. Uploading loads the file into the editor for review before
saving; downloading exports `<id>.theme.json` in the same format. What
you rename is the display **name**, never the `id`.

Three example themes ship — **Corporate blue**, **Midnight**, and
**Neon** — as editable starting points to clone, edit, or delete. They
re-seed only if the theme library is completely empty.

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
text; with no rules configured anywhere, there's no gate at all. Since
v1.4.0 the rules a competitor sees at accept-time preserve the authored
formatting — headings, lists, code, and alignment — rendered from the
same schema the editor writes, never raw HTML.

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

## Marketplace & content packs

Since v1.7.0 an Administrator (`install_content_pack`) can install **content
packs** from the Flagpost **marketplace** — an open, mirrorable registry. Two
kinds ship: **challenge packs** install into a competition, and **theme
packs** install site-wide alongside your [brand themes](#custom-brand-themes).

**Safe by default.** Nothing installs from the hosted registry until an
operator opts in — the default trust policy is `verified` with no root key
configured, so installs stay blocked until you configure one. Every artifact
is **signed**, and its signature and content digest are **re-verified against
your own instance's policy** at install time; the registry's trust tier is a
display hint, never authority.

**Mirrorable and air-gappable.** `marketplace_url` (default
`marketplace.flagpost.io`) can point at your own mirror for curated or
offline use, and a single **`marketplace_enabled`** switch disables the whole
surface. Building, signing and validating your own packs is covered in
[Developing modules](/dev/modules/) and the module SDK.

> Only content packs ship today — declarative and signed-code **modules**,
> and a module sandbox, are designed (ADR-0040) but not yet built.
