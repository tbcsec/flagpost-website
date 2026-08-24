---
title: Single sign-on & external identity
description: Bring your own identity — OIDC/OAuth2, SAML 2.0, or an LDAP/Active Directory bind — on one provider framework, with local login surviving as break-glass.
---

Flagpost supports four kinds of external identity provider, all managed on
one framework:

| Kind | How users sign in | Typical IdPs |
| --- | --- | --- |
| **OIDC** | A button on the login page redirects to the IdP | Google, Okta, Keycloak, Microsoft Entra — anything with an OIDC discovery document |
| **OAuth2** | A button on the login page redirects to the IdP | GitHub, Discord — OAuth 2.0 servers that aren't OpenID Connect |
| **SAML 2.0** | A button on the login page redirects to the IdP | Shibboleth, ADFS, Entra, Okta — campus and enterprise IdPs |
| **LDAP / Active Directory** | No button — directory credentials go straight into the ordinary login form | Active Directory, OpenLDAP, FreeIPA |

OIDC, OAuth2 and SAML are *redirect* kinds; LDAP is a directory *bind*
inside the normal login request, so it never grows a dead button. Any mix
of providers can be enabled at once. The design is recorded in
[ADR-0021](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0021-oidc-identity-provider-framework.md)
(the OIDC framework),
[ADR-0022](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0022-saml-ldap-identity-providers.md)
(SAML and LDAP) and
[ADR-0033](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0033-generic-oauth2-provider-kind.md)
(the generic OAuth2 kind).

This page covers what's common to every kind, and OIDC specifics. The three
config-heavier kinds have their own walkthroughs:
**[SAML 2.0 setup](/admin/saml/)**,
**[LDAP / Active Directory setup](/admin/ldap/)** and
**[OAuth2 sign-in](/admin/oauth2/)**.

## Adding a provider

Providers are managed under **Admin → Settings → Auth**, gated on the
dedicated global permission `manage_auth_providers` — deliberately separate
from `manage_site_settings`, because this surface decides who can log in at
all. Every provider, whatever its kind, has:

- **A kind**, fixed at creation — OIDC, OAuth2, SAML 2.0, or LDAP.
- **A name and a URL-safe slug** — the name labels the login button (for
  redirect kinds); the slug is part of the provider's URLs.
- **One write-only secret**, stored **encrypted, not hashed**
  ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md)):
  the OIDC or OAuth2 client secret, the SAML SP private key, or the LDAP
  bind password. Reads only reveal *that* a secret is set, never the value.
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
  providers are always closed (the API enforces it); OIDC and OAuth2
  providers choose, defaulting to open.

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

### Built-in presets

The Auth tab carries **Quick set up** cards that prefill the ordinary
provider form — issuer/endpoints, scopes, name, slug, posture — leaving
only the per-install pieces
([ADR-0024](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0024-builtin-sso-provider-presets.md):
presets ship **configuration, never credentials**). You still register
your own app at the IdP (the cards link to the right console), paste the
client ID and secret, and register the redirect URI — nothing about the
callback changes, and everything prefilled is editable before saving.

- **Google** (OIDC) — one click: issuer `https://accounts.google.com`,
  open posture.
- **Microsoft** (OIDC, single-tenant) — enter your Directory (tenant) ID
  first, as the **GUID**, not a domain name (it's lowercased automatically
  so an uppercase portal paste can't save fine and fail at first sign-in).
  Defaults to a **closed** posture — tenant membership is the admission
  decision — which you can flip.
- **Microsoft (multi-tenant)** (OIDC) — "sign in with any Microsoft
  account", for the `common`/`organizations` Entra authorities
  ([ADR-0032](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0032-multi-tenant-entra-issuer-validation.md)).
  No tenant to enter; the issuer is validated per-login against the token's
  own tenant. Defaults to **open** posture — see the caution below.
- **GitHub** and **Discord** (OAuth2) — one-click presets covered on the
  [OAuth2 page](/admin/oauth2/#presets).

:::caution[Multi-tenant Microsoft admits every Entra tenant]
The multi-tenant preset trusts every Microsoft Entra tenant on Earth for
*authentication* — that's what `common` means. It is correctly **open**
posture, so **admission is controlled by the [registration toggle and
email-domain allowlist](/admin/site-settings/#registration)**, never by the
tenant claim. Relying on the tenant id to gate access would admit the
entire Microsoft consumer population.
:::

Login buttons for Google, Microsoft, GitHub and Discord providers carry the
official brand mark, recognised from the configured issuer or authorize
endpoint — including providers you configured by hand.

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

However the identity arrives — OIDC callback, OAuth2 userinfo, SAML
assertion, or LDAP bind — it resolves in the same order:

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
redirect-kind providers as `{slug, name, kind, brand}` — `kind` is now one
of `oidc`, `oauth2` or `saml`, and `brand` is `google` / `microsoft` /
`github` / `discord` / `null` for the login button's mark. This
**replaced `GET /api/auth/oidc/providers` in v1.3.0**, and admin provider
CRUD lives at `/api/admin/auth-providers`. See the
[API reference](/reference/api/).
