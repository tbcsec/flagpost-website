---
title: Single sign-on & external identity
description: Bring your own identity — OIDC/OAuth2, SAML 2.0, or an LDAP/Active Directory bind — on one provider framework, with local login surviving as break-glass.
---

Flagpost supports three kinds of external identity provider, all managed on
one framework:

| Kind | How users sign in | Typical IdPs |
| --- | --- | --- |
| **OIDC / OAuth2** (v1.2.0) | A button on the login page redirects to the IdP | Google, Okta, Keycloak, Microsoft Entra — anything with an OIDC discovery document |
| **SAML 2.0** (v1.3.0) | A button on the login page redirects to the IdP | Shibboleth, ADFS, Entra, Okta — campus and enterprise IdPs |
| **LDAP / Active Directory** (v1.3.0) | No button — directory credentials go straight into the ordinary login form | Active Directory, OpenLDAP, FreeIPA |

OIDC and SAML are *redirect* kinds; LDAP is a directory *bind* inside the
normal login request, so it never grows a dead button. Any mix of providers
can be enabled at once. The design is recorded in
[ADR-0021](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0021-oidc-identity-provider-framework.md)
(the OIDC framework) and
[ADR-0022](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0022-saml-ldap-identity-providers.md)
(its generalization to SAML and LDAP).

This page covers what's common to every kind, and OIDC specifics. The two
config-heavier kinds have their own walkthroughs:
**[SAML 2.0 setup](/admin/saml/)** and
**[LDAP / Active Directory setup](/admin/ldap/)**.

## Adding a provider

Providers are managed under **Admin → Settings → Auth**, gated on the
dedicated global permission `manage_auth_providers` — deliberately separate
from `manage_site_settings`, because this surface decides who can log in at
all. Every provider, whatever its kind, has:

- **A kind**, fixed at creation — OIDC, SAML 2.0, or LDAP.
- **A name and a URL-safe slug** — the name labels the login button (for
  redirect kinds); the slug is part of the provider's URLs.
- **One write-only secret**, stored **encrypted, not hashed**
  ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md)):
  the OIDC client secret, the SAML SP private key, or the LDAP bind
  password. Reads only reveal *that* a secret is set, never the value.
- **Kind-specific configuration, validated on write** — a provider can't be
  switched on half-configured (an LDAP provider, for example, refuses to
  enable without its bind password).
- **An enabled flag** — providers can be staged disabled and switched on
  when ready.

## Open vs. closed providers

Every provider carries a **posture** that answers one question: *is being
able to sign in at the IdP, by itself, permission to have an account here?*

- **Open** — a public IdP (sign-in-with-Google): anyone with an IdP account
  might turn up, so **new accounts still pass the public-signup gate** —
  the [registration toggle and email-domain allowlist](/admin/site-settings/#registration)
  apply to just-in-time provisioning (since v1.3.0,
  [#118](https://github.com/tbcsec/flagpost/issues/118)). Rejections land
  back on the login page as a generic error; users already linked, and
  email-matches to existing accounts, are never blocked.
- **Closed** — an admin-configured directory: **enabling the provider is
  the admission decision**, so the signup gate is skipped. SAML and LDAP
  providers are always closed (the API enforces it); OIDC providers choose,
  defaulting to open.

Closed providers have one extra switch, **email is authoritative** (off by
default): a directory's `mail` attribute or a SAML email attribute is
display-only unless you assert you trust it, because a spoofable email
claim that links to an existing account is an account takeover.

## OIDC specifics

Each OIDC provider takes:

| Field | Meaning |
| --- | --- |
| **Issuer** | The IdP's issuer URL — Flagpost reads `.well-known/openid-configuration` from it |
| **Client ID / secret** | From the app registration at your IdP |
| **Scopes** | Defaults suit most IdPs (`openid profile email`) |
| **Posture** | Open or closed — see above |

Register the redirect URI at your IdP as:

```
https://<your-domain>/api/auth/oidc/<slug>/callback
```

The flow is the standard authorization-code flow with **PKCE, `state`, and
`nonce` mandatory**; the callback validates the ID token's signature (via
cached JWKS) plus issuer, audience, and expiry. The IdP's `email_verified`
claim is parsed strictly (since v1.3.0, a string `"false"` can no longer
read as verified).

:::caution[PUBLIC_ORIGIN must be exact]
Redirect URIs — and SAML ACS/metadata URLs — are built from the
deployment's public origin (`PUBLIC_ORIGIN` in `.env`). If it doesn't match
your real origin character-for-character, the IdP will reject the callback —
this is the first thing to check when SSO "doesn't work". See the
[configuration reference](/deploy/configuration/).
:::

## How a login resolves

However the identity arrives — OIDC callback, SAML assertion, or LDAP
bind — it resolves in the same order:

1. **Known identity** — the provider + subject pair matches an existing
   link → that user signs in.
2. **First contact with a trusted email** — if the provider's email claim
   is trusted (an open provider asserting `email_verified: true`, or a
   closed provider with *email is authoritative* set) and a local account
   has that address, the external identity is **linked** to it (emits
   `identity.linked`).
3. **Otherwise** — a user is **created just-in-time**, holding **no role
   and no competition membership** — Participant, like every role, is
   earned per-competition on join, mirroring the rule that registration
   never grants standing platform access. (For open providers, this is the
   step the [signup gate](#open-vs-closed-providers) applies to.)

External identity answers *who you are*; [RBAC](/admin/users-roles/) alone
decides what you may do. **Group and role claims from the IdP are
deliberately ignored** — honouring them would move permission assignment
outside the platform's audit log.

## Local login stays as break-glass

A JIT-provisioned external user is stored with a random, never-disclosed
password hash — there is no password for them to know, so the local form
simply can't work for them. Accounts with a real password (notably the
first-run owner) keep working — exactly the account an operator needs when
the IdP or directory is down or misconfigured. Don't delete your owner
account's password access after enabling SSO.

## Auditing

Provider changes emit `auth_provider.created` / `.updated` / `.deleted`
(each carrying the provider's `kind` since v1.3.0), and identity attachment
emits `identity.linked` / `.unlinked` — all in the
[audit log](/admin/audit-log/) and the [event catalogue](/reference/events/).

## For API consumers

The login page reads `GET /api/auth/providers`, which lists enabled
redirect-kind providers as `{slug, name, kind}` — this **replaced
`GET /api/auth/oidc/providers` in v1.3.0**, and admin provider CRUD moved
to `/api/admin/auth-providers`. See the [API reference](/reference/api/).
