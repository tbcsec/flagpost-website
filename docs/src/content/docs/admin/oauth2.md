---
title: OAuth2 sign-in
description: Add GitHub, Discord, or any OAuth 2.0 provider that isn't OpenID Connect — identity comes from a userinfo call and a claim map, with a strict verified-email guarantee.
---

A [provider](/admin/sso/) can be **OAuth2**: a fourth kind beside OIDC,
SAML and LDAP, for servers that speak **OAuth 2.0 but not OpenID Connect**.
There's no discovery document and no ID token, so identity comes from a
**userinfo** call plus a **claim map** you configure. **GitHub** and
**Discord** ship as one-click presets; the next OAuth2 provider is
configuration, not an integration.

OAuth2 is a **redirect** kind (it gets a "Sign in with…" button). Posture
is your choice and defaults to **open**, since these are public IdPs — see
[open vs. closed](/admin/sso/#open-vs-closed-providers).

## Register the callback at your provider

Register this redirect URI with the app you create at the provider:

```
https://<your-domain>/api/auth/oauth2/<slug>/callback
```

It's built from `PUBLIC_ORIGIN` and must match exactly.

## Provider fields

Because there's no discovery document, you supply the three endpoints
directly:

| Field | Meaning |
| --- | --- |
| **Authorize / Token / Userinfo URL** | The provider's three OAuth 2.0 endpoints. Each is validated at save time and re-checked on every call against the same HTTPS-only egress rules the OIDC issuer uses |
| **Client ID / secret** | From the app you registered; the secret is the provider's write-only, encrypted secret |
| **Scopes** | Whatever the provider needs — there's no mandatory `openid` |
| **Claim map** | Which userinfo fields carry the **subject** (default `id`), **email** (default `email`) and **name** (default `name`) |
| **Verified-emails URL** | Optional — a provider's separate "list my emails" endpoint (GitHub's), used to establish a verified address |
| **PKCE** | Toggle on for providers that support it |

## The verified-email guarantee

An external email links to an existing local account only when the provider
**actually asserts it's verified** — never on an optimistic default:

- **Discord** supplies a `verified` boolean, and Flagpost honours it.
- **GitHub** doesn't put a verified flag on the profile, so Flagpost makes a
  second call to the emails endpoint and trusts **only** the address that is
  both **primary and verified**. If there isn't one, the profile email is
  display-only — it can't link to an existing account or satisfy the
  registration email-domain allowlist.

No evidence means *not verified*. That's the property that stops an
unverified address at one provider from hijacking an existing Flagpost
account.

## What's enforced for you

Fixed in code, not configuration:

- **Single-use `state`** is the CSRF control on the redirect round-trip.
- **The access token is used once** — for the userinfo call — and then
  discarded. Flagpost is doing authentication, not ongoing API access, so
  it never stores the token.
- **Every endpoint URL passes an SSRF egress check** — at write time *and*
  on every request — so a provider can't be pointed at an internal address.
- **The subject is the provider's own user id**, coerced to a string and
  never the email, so a changed email can't collide identities.

## Presets

Both presets ship **configuration, never credentials** — you still register
your own app and paste its client ID and secret.

**GitHub** — scopes `read:user user:email`, name taken from the `login`
handle (GitHub's display name is often empty), verified email via the
`/user/emails` list, PKCE off. Register an app at
[github.com/settings/developers](https://github.com/settings/developers).

**Discord** — scopes `identify email`, name taken from `username`, email
trusted via Discord's `verified` flag, PKCE on. Register an app at
[discord.com/developers/applications](https://discord.com/developers/applications).

Login buttons for GitHub and Discord providers carry the official brand
mark automatically. Configuring any other OAuth 2.0 provider is the same
form with its three endpoints and a claim map.
