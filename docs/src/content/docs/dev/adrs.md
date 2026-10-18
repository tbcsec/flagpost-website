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
| [0019](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0019-jwt-secret-hardening.md) | Per-install derived JWT secret — never a repo-public default | Accepted |
| [0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md) | Hash what is only verified; encrypt what must be retrieved | Accepted |
| [0021](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0021-oidc-identity-provider-framework.md) | External identity via OIDC, with local login as break-glass | Accepted |
| [0022](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0022-saml-ldap-identity-providers.md) | SAML and LDAP identity providers — generalizing the provider model | Accepted |
| [0023](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0023-ai-assistant-provider-and-execution-model.md) | AI assistant provider integration and execution model | Accepted |
| [0024](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0024-builtin-sso-provider-presets.md) | Built-in SSO provider presets — configuration, never credentials | Accepted |
| [0025](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0025-multi-worker-broadcast-relay.md) | Multi-worker via a Redis broadcast relay behind the connection manager | Accepted |
| [0026](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0026-cross-worker-presence.md) | Cross-worker presence via heartbeat-TTL liveness in Redis | Accepted |
| [0027](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0027-certificate-rendering-server-side.md) | Certificate rendering — server-side Pillow → PNG, not a headless browser | Accepted |
| [0028](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0028-competition-status-gate.md) | Competition status is an explicit gameplay gate; the schedule drives it | Accepted |
| [0029](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0029-frontend-i18n-next-intl-crowdin.md) | Frontend i18n — next-intl with a cookie locale, translations in Crowdin | Accepted |
| [0030](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0030-post-event-report-rendering-weasyprint.md) | Post-event report rendering — HTML + WeasyPrint, not Pillow or a headless browser | Accepted |
| [0031](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0031-multi-instance-deployment.md) | Multi-instance deployment behind a load balancer (Fargate/ALB) | Accepted |
| [0032](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0032-multi-tenant-entra-issuer-validation.md) | Multi-tenant Entra issuer validation via a tenant-substituted issuer template | Accepted |
| [0033](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0033-generic-oauth2-provider-kind.md) | A generic `oauth2` provider kind, with userinfo as the identity source | Accepted |
| [0034](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0034-custom-pages-render-as-a-react-tree.md) | Custom pages store rich text and render as a React tree, never as HTML | Accepted |
| [0035](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0035-relicense-apache-2.0.md) | Relicense from AGPL-3.0 to Apache 2.0; module exception retired | Accepted |
| [0036](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0036-challenge-instancing-provisioners.md) | Challenge instancing — provisioner kinds, background-lane lifecycle, hashed unique flags | Accepted |
| [0037](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0037-metrics-endpoint-gating.md) | Prometheus `/metrics` — kernel middleware, off by default, gated by token/allowlist | Accepted |
| [0038](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0038-boot-time-baseline-import.md) | Boot-time baseline import — provision an unconfigured instance from a mounted platform export | Accepted |
| [0039](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0039-cross-competition-skills-web.md) | Cross-competition skills web — the first participant-facing consolidation view | Accepted |
| [0040](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0040-module-sdk-and-marketplace.md) | Module SDK, import & marketplace — tiered trust over an open registry protocol | Accepted |
| [0041](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0041-object-storage-rustfs-replaces-minio.md) | Object storage — RustFS replaces the retired MinIO; vendor-neutral `S3_*` configuration (hard break) | Accepted |
| [0042](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0042-programming-challenges-code-judge.md) | Programming challenges — judge execution model, DB-as-queue, and grading integration | Proposed |

Two threads are worth reading in sequence to see the project's decision
style: the **bootstrap story** (0007 → 0010 → 0017 — from "first user wins"
to seeded credentials to a proper setup wizard) and the **event-dispatch
story** (0005 → 0009 → 0012 — from a simple bus to explicitly split
delivery lanes once automations needed slow external calls).
