---
title: Custom pages
description: Author site-level pages — About, Sponsors, Contact — that appear in the sidebar and render at /p/{slug}, as structured rich text rather than raw HTML.
---

Custom pages let an administrator add site-level content — an **About**, a
**Sponsors** wall, a **Contact** page — that gets its own sidebar entry and
renders at `/p/{slug}`. Public pages are readable while signed out.

Authoring lives at **Admin → Pages**, gated on the `manage_pages`
permission — a delegable content-editor grant, separate from
`manage_site_settings`. The **pages** module is required-core with no
on/off toggle: content *is* the switch, since an install with no pages
renders no pages section in the sidebar.

## Authoring a page

Each page has:

- **Title** — the sidebar label and page heading.
- **URL slug** — the page lives at `/p/<slug>`. Slugs are 2–60 characters,
  lowercase letters, digits and hyphens (no leading or trailing hyphen); a
  handful of reserved words are refused, and a duplicate slug is rejected.
  Changing a slug breaks existing links.
- **Sidebar icon** — chosen from a fixed set of icons.
- **Content** — rich text (see below), up to 200 KB.
- **Who can see it** — *Anyone, including signed-out visitors* (public) or
  *Signed-in users only* (authenticated).
- **Status** — **Draft** or **Published**. New pages start as a draft, so a
  page is never live until you publish it.

Reorder the sidebar with **Move up / Move down**.

## Rich text, not raw HTML

This is the deliberate difference from CTFd-style custom pages. **Page
content is structured rich text, rendered as a React tree — never as an
HTML string.** There is no raw HTML, CSS, `<script>`, `<iframe>` or
arbitrary embed.

That's a security stance, not a limitation for its own sake. Flagpost's
content-security policy allows inline script, so any injected markup *would*
execute; and because `manage_pages` is a **delegable** grant, letting a
page editor write raw HTML would be a path from "can edit the About page"
to running script in an administrator's session. Storing content as a
validated node tree and rendering it structurally closes that path
([ADR-0034](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0034-custom-pages-render-as-a-react-tree.md)).

## Visibility

Visibility combines the **status** (draft/published) with the **audience**
(public/authenticated). A page that shouldn't be visible returns **404, not
403** — and the filter is applied *in the database query*, so a hidden
page's very existence never leaks, not even by response timing on the
public route:

| State | Signed out | Signed in | Holder of `manage_pages` |
| --- | --- | --- | --- |
| Draft (any audience) | 404 | 404 | Visible (preview) |
| Published · authenticated | 404 | Visible | Visible |
| Published · public | Visible | Visible | Visible |

## Language and SEO

Page titles and bodies are **your** content, so they stay in the language
you write them in — Flagpost never [translates](/guides/languages/) them.
And because a page body is rendered client-side as a React tree, it isn't
present in the server-rendered HTML; if search-engine indexing of a page's
prose matters to you, factor that in.

## Backup and audit

Custom pages travel in a [platform backup](/admin/backup/), keyed by
`slug` — an additive restore won't duplicate an existing `/p/about`.
Authoring emits `page.created` / `page.updated` / `page.deleted` into the
[audit log](/admin/audit-log/) and the
[event catalogue](/reference/events/#platform--modules), governed by
`manage_pages`.
