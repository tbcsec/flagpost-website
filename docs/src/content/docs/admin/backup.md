---
title: Backup & restore
description: The full-fidelity platform export/import — sections, additive import semantics, what's excluded, and how to handle the file safely.
---

Admin → Site settings carries a **platform export / import** panel: a
full-fidelity backup of your install as one versioned JSON document, with
sections you pick per operation.

## Exporting

Choose any combination of sections:

`site_settings` · `users` · `roles` · `competitions` · `automations` ·
`audit_log` · `pages`

[Custom pages](/admin/pages/) travel in the backup too (the `pages`
section, v1.5.0), matched by `slug` on an additive restore.

The export is **complete for what it covers** — including password hashes
and flag hashes — because a backup that can't actually restore your
install isn't one. The exception is **install-specific credentials
encrypted at rest** ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md)):
SSO identity providers and their secrets have never been part of the
export; since v1.3.0 the SMTP password stays out too (the rest of the
SMTP config — host, port, username, sender — still travels), and since
v1.4.0 so does the [AI provider configuration](/admin/ai/) with its API
key. Re-enter those on the new install after a restore.

:::caution[The file is sensitive]
Treat an export like a database dump: it contains credential hashes and
secrets. Store it encrypted, restrict who can read it, and both endpoints
are gated on `manage_site_settings` for the same reason — and since
v1.4.0 the `users` and `roles` sections additionally require the global
`manage_users` / `manage_roles` permissions, on export and import alike,
so a site-settings delegate can't read or write the account and RBAC
graph.
:::

Deliberately excluded: active login sessions, in-app notifications,
collaborative-note snapshots, personal dashboard layouts, division
memberships, AI assistant conversations and transcripts (v1.4.0),
generated [post-event report](/guides/reports/) files (v1.5.0) —
transient or per-subject state that doesn't belong in a portable backup;
the report files in particular are transient artefacts cleaned up by
retention or deletion, so they're never bundled — and the
encrypted-at-rest credentials above (SSO providers with their secrets;
since v1.3.0 also the SMTP password, and since v1.4.0 the AI provider
key), which are install-specific and re-entered on new infrastructure.

## Importing

Import is **additive — it creates, never modifies or deletes**:

- Top-level entities are skipped if they already exist, matched by natural
  key: users by username/email, roles and competitions by name, custom
  pages by `slug`.
- A **competition is atomic** — if its name exists, its whole subtree is
  skipped; otherwise everything under it imports together.
- Fresh IDs are minted and every reference is rewritten through ID maps;
  invite codes are regenerated.

The result screen reports created/skipped counts per table, so you can see
exactly what happened.

## What to use it for

- **Moving installs** — export on the old box, import on the new.
- **Pre-upgrade snapshots** — cheap insurance before a version bump.
- **Seeding a staging copy** — import competitions without live user data
  by selecting sections.

For challenge-only portability use the
[ctfcli zip flow](/guides/import-export/); for disaster recovery, also keep
ordinary PostgreSQL backups (`pg_dump`) and MinIO volume snapshots — the
platform export is an application-level tool, not a substitute for
infrastructure backups.
