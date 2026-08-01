---
title: Single sign-on (OIDC)
description: Bring your own identity provider — Google, Okta, Keycloak, Entra, or any OIDC discovery-document IdP — with local login surviving as break-glass.
---

Since **v1.2.0**, Flagpost supports **OIDC / OAuth2 single sign-on**: connect
Google, Okta, Keycloak, Microsoft Entra, or anything else that publishes an
OIDC discovery document. Multiple providers can be enabled at once, each
appearing as a sign-in button on the login page. SAML and LDAP are not built
(they're tracked on the roadmap); the reasoning is recorded in
[ADR-0021](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0021-oidc-identity-provider-framework.md).

## Adding a provider

Providers are managed under **Admin → Settings → Auth**, gated on the
dedicated global permission `manage_auth_providers` — deliberately separate
from `manage_site_settings`, because this surface decides who can log in at
all.

Each provider takes:

| Field | Meaning |
| --- | --- |
| **Name** | The label on the login button ("Sign in with Okta") |
| **Slug** | URL-safe identifier; part of the callback URL below |
| **Issuer** | The IdP's issuer URL — Flagpost reads `.well-known/openid-configuration` from it |
| **Client ID / secret** | From the app registration at your IdP; the secret is stored **encrypted**, not hashed ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md)) |
| **Scopes** | Defaults suit most IdPs (`openid profile email`) |
| **Enabled** | Providers can be staged disabled and switched on when ready |

Register the redirect URI at your IdP as:

```
https://<your-domain>/api/auth/oidc/<slug>/callback
```

:::caution[PUBLIC_ORIGIN must be exact]
Redirect URIs are built from the deployment's public origin
(`PUBLIC_ORIGIN` in `.env`). If it doesn't match your real origin
character-for-character, the IdP will reject the callback — this is the
first thing to check when SSO "doesn't work". See the
[configuration reference](/deploy/configuration/).
:::

## How a login resolves

The flow is the standard authorization-code flow with **PKCE, `state`, and
`nonce` mandatory**; the callback validates the ID token's signature (via
cached JWKS) plus issuer, audience, and expiry. Identity then resolves in
order:

1. **Known identity** — the provider + subject pair matches an existing
   link → that user signs in.
2. **First contact with a verified email** — if the IdP asserts
   `email_verified: true` and a local account has that address, the external
   identity is **linked** to it (emits `identity.linked`).
3. **Otherwise** — a user is **created just-in-time**, holding the
   Participant role and **no competition membership** — mirroring the rule
   that public registration never grants above Participant. They join
   competitions like anyone else.

External identity answers *who you are*; [RBAC](/admin/users-roles/) alone
decides what you may do. **Group and role claims from the IdP are
deliberately ignored** — honouring them would move permission assignment
outside the platform's audit log.

## Local login stays as break-glass

A JIT-provisioned SSO user is stored with a random, never-disclosed password
hash — there is no password for them to know, so the local form simply can't
work for them. Accounts with a real password (notably the first-run owner)
keep working — exactly the account an operator needs when the IdP is down
or misconfigured. Don't delete your owner account's password access after
enabling SSO.

## Auditing

Provider changes emit `auth_provider.created` / `.updated` / `.deleted`, and
identity attachment emits `identity.linked` / `.unlinked` — all in the
[audit log](/admin/audit-log/) and the [event catalogue](/reference/events/).

## Restricting who may sign in

JIT provisioning means anyone with an account at an enabled IdP can create a
Flagpost account (as a bare Participant). If your event is invite-only, keep
competitions private (invite codes still gate joining), or use a
single-tenant IdP app registration. A hosted-domain/allowlist policy for SSO
sign-ins is on the roadmap
([#118](https://github.com/tbcsec/flagpost/issues/118)); the
[email-domain allowlist](/admin/site-settings/#registration) applies to
public self-registration, not SSO.
