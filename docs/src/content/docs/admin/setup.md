---
title: First-run setup
description: The setup wizard — how a fresh Flagpost install creates its owner account, and what to configure right after.
---

A fresh Flagpost install ships with **no administrator account and no default
password**. Until the setup wizard runs, the instance is deliberately
unconfigured: the app redirects to `/setup`, and public registration is
blocked.

## The wizard

Opening the app on a fresh install lands on the **setup wizard**, which:

1. Creates the **owner account** — the first Administrator, with credentials
   you choose on the spot (nothing is seeded or hard-coded).
2. Sets initial **branding** — the platform name your users will see.

The wizard is only available while the instance has no active Administrator;
once the owner exists it's gone for good. Public registration then opens (if
enabled) and **never grants more than the Participant role** — additional
staff are promoted explicitly via [role assignment](/admin/users-roles/).

The reasoning is recorded in
[ADR-0017](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0017-first-run-setup-wizard.md):
an install left on shipped default credentials is trivially compromised, so
Flagpost refuses to have any.

## After setup — a checklist

1. **Appearance** — palette, accent, and (optionally) your organisation's
   logo: [Site settings & branding](/admin/site-settings/).
2. **Registration policy** — leave self-registration open, or close it and
   mint accounts from Admin → Users.
3. **SMTP** — needed for the `send_email` automation action and self-service
   password resets; both quietly no-op without it.
4. **Create your first competition** — [Competitions](/guides/competitions/).
5. Going public? Work through [Production deployment](/deploy/production/)
   and [Security notes](/deploy/security/).
