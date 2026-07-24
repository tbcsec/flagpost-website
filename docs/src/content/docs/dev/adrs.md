---
title: Decision records (ADRs)
description: The index of Flagpost's Architecture Decision Records — what was decided, what superseded what, and where to read the reasoning.
---

Every significant architectural call is recorded as an ADR in
[`docs/adr/`](https://github.com/tbcsec/flagpost/tree/main/docs/adr) in the
platform repository — the *why* behind the design, kept honest by marking
superseded decisions instead of rewriting history. Check the relevant ADR
before proposing an alternative to something already settled; if a decision
looks wrong for what you're building, propose a **new** ADR rather than
quietly working around it.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0001-app-level-multi-tenancy.md) | App-level multi-competition tenancy (a `competition_id` on every scoped table), not schema-per-competition | Accepted |
| [0002](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0002-kernel-required-core-module-split.md) | Kernel / required-core / optional-module split — nearly everything is a module | Accepted |
| [0003](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0003-jwt-access-refresh-auth.md) | JWT access + refresh tokens, one scheme shared by REST and WebSockets | Accepted |
| [0004](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0004-roles-permissions-as-data.md) | Roles and permissions as data, not a hardcoded enum | Accepted |
| [0005](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0005-async-event-bus.md) | An async in-process pub/sub event bus as the mutation-notification core | Accepted |
| [0006](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0006-testing-stack.md) | pytest (SQLite-backed, infra-free) + Vitest | Accepted |
| [0007](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0007-first-user-admin-bootstrap.md) | First registered user becomes Administrator | Superseded by 0010 |
| [0008](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0008-stateful-refresh-sessions.md) | Refresh tokens are stateful, hashed, rotating DB sessions | Accepted |
| [0009](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0009-synchronous-event-dispatch-tier0.md) | Synchronous event dispatch in Tier 0 | Superseded by 0012 |
| [0010](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0010-seeded-admin-default-credentials.md) | Seeded default administrator credentials | Superseded by 0017 |
| [0011](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0011-site-wide-theming-only.md) | Theming is site-wide only; per-competition theming deferred | Accepted |
| [0012](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0012-event-dispatch-sync-critical-vs-background.md) | Event dispatch splits into sync-critical and background lanes | Accepted |
| [0013](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0013-webhook-egress-hardening.md) | Webhook egress policy — SSRF blocklist, header stripping, value hardening | Accepted |
| [0014](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0014-crdt-transport-and-persistence.md) | CRDT transport as a dumb relay with client-snapshot persistence | Accepted |
| [0015](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0015-username-primary-optional-email.md) | Username is the primary identifier; email is optional | Accepted |
| [0016](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0016-platform-export-import.md) | Platform export/import — registry-driven, additive backup | Accepted |
| [0017](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0017-first-run-setup-wizard.md) | First-run setup wizard; no seeded default admin | Accepted |
| [0018](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0018-regex-flag-redos-containment.md) | Regex flag evaluation contained against ReDoS | Accepted |

Two threads are worth reading in sequence to see the project's decision
style: the **bootstrap story** (0007 → 0010 → 0017 — from "first user wins"
to seeded credentials to a proper setup wizard) and the **event-dispatch
story** (0005 → 0009 → 0012 — from a simple bus to explicitly split
delivery lanes once automations needed slow external calls).
