---
title: Backup & restore
description: The full-fidelity platform export/import — sections, additive import semantics, what's excluded, and how to handle the file safely.
---

Admin → Site settings carries a **platform export / import** panel: a
full-fidelity backup of your install as one versioned JSON document, with
sections you pick per operation.

## Exporting

Choose any combination of the six sections:

`site_settings` · `users` · `roles` · `competitions` · `automations` ·
`audit_log`

[Custom pages](/admin/pages/) travel with `site_settings` (since v1.5.0),
matched by `slug` on an additive restore — for holders of `manage_pages`;
otherwise the export leaves them out and the import skips them.

Since v1.6.0, [custom brand themes](/admin/site-settings/#custom-brand-themes)
ride inside the `site_settings` section (there is no separate themes
checkbox), so moving or restoring an install keeps its themes; imported
themes are re-validated and their local authorship is dropped.
Per-competition
[custom registration fields](/guides/teams/#custom-registration-fields)
carry their **definitions** with the `competitions` section — but the
collected **answers** do not (they are personal data, available only
through the organiser's per-competition CSV export, never a backup).
[Programming problems](/guides/programming/) and their test data also ride
the `competitions` section (v1.8.0); restored test data is checked and rebuilt
rather than stored as sent.

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
secrets. Store it encrypted and restrict who can read it.
:::

### Who can move which section

`manage_site_settings` opens the panel, and an Administrator can move every
section. Since v1.8.0 each other section also needs the permission that
governs its content, so a delegate is **offered only the sections they may
move**:

| Section | Export needs | Import needs |
| --- | --- | --- |
| `site_settings` | nothing more | nothing more — but a file that would change the mail server or From address imports only for a full Administrator |
| `users` | the full Administrator permission set (it carries every password hash and email) | `manage_users` |
| `roles` | `manage_roles` | `manage_roles`, and you can't import grants beyond your own |
| `competitions` | every competition-scope permission site-wide, plus `create_competition` | the same |
| `automations` | `automation_view` + `automation_create` | the same — and each rule's trigger must be one you could automate on yourself |
| `audit_log` | `view_audit_log` | the full Administrator permission set |

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
The [challenge-instance](/deploy/challenge-instances/) provisioner
settings and the [code judge](/deploy/code-judge/)'s endpoint and languages
(v1.8.0) are excluded on the same footing — infrastructure-specific operator
config that also decides what code runs, so re-run their setups on a new
install. Code submissions and judgings are runtime state and aren't exported
either; the points they earned ride along as ordinary solves.

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
ordinary PostgreSQL backups (`pg_dump`) and RustFS volume snapshots — the
platform export is an application-level tool, not a substitute for
infrastructure backups.
