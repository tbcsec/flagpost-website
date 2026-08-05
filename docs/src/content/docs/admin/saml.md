---
title: SAML 2.0 setup
description: Connect a campus or enterprise IdP — Shibboleth, ADFS, Entra, Okta — over SP-initiated SAML 2.0, registering Flagpost from its generated SP metadata.
---

Since **v1.3.0**, a [provider](/admin/sso/) can be **SAML 2.0**: a second
redirect kind beside OIDC, aimed at the campus and enterprise IdPs — 
Shibboleth, ADFS, Microsoft Entra, Okta — where SAML is the native
protocol. SAML providers are always
[closed-posture](/admin/sso/#open-vs-closed-providers): enabling one is the
admission decision.

Flagpost is the **Service Provider (SP)** and only supports
**SP-initiated** login — the flow always starts at the Flagpost login
button. IdP-initiated (unsolicited) assertions are refused by design; see
[what's enforced](#whats-enforced-for-you) below.

## Register the SP at your IdP

Create the provider (Admin → Settings → Auth → SAML 2.0) with a slug, and
Flagpost immediately serves generated **SP metadata** — even while the
provider is still disabled, so your IdP admin can register it before
anything goes live:

```
https://<your-domain>/api/auth/saml/<slug>/metadata
```

Most IdPs accept that URL (or the XML it returns) directly. If yours wants
the values by hand, the assertion consumer service (ACS) URL is:

```
https://<your-domain>/api/auth/saml/<slug>/acs
```

Both URLs are built from `PUBLIC_ORIGIN` — it must match your real origin
exactly, same as [OIDC redirect URIs](/admin/sso/#oidc-specifics).

## Provider fields

| Field | Meaning |
| --- | --- |
| **IdP entity ID** | Your IdP's identifier, from its metadata |
| **IdP SSO URL** | The IdP's single-sign-on endpoint (HTTP-Redirect binding) |
| **IdP signing certificate** | The IdP's X.509 cert — **required**; every assertion's signature is validated against it before any content is trusted |
| **SP entity ID** | How Flagpost identifies itself to the IdP |
| **SP certificate + private key** | *Optional* — set both to sign outgoing AuthnRequests, for IdPs that demand it. The private key is the provider's write-only encrypted secret; the load-bearing signature is the IdP's on the assertion, not this one |
| **Email / name attributes** | Which assertion attributes carry them — defaults `email` and `displayName`. Email falls back to the NameID when it's email-format |

The email from an assertion is **never treated as verified** — it links to
an existing local account only if you set
[*email is authoritative*](/admin/sso/#open-vs-closed-providers) on the
provider.

## What's enforced for you

These aren't configuration — they're fixed in code, so a permissive IdP
can't talk Flagpost into a weaker posture:

- **Signature before trust.** Assertions must be signed, and the signature
  is validated against the configured IdP certificate before any content
  is read (via [python3-saml](https://github.com/SAML-Toolkits/python3-saml)).
- **No unsolicited assertions.** The ACS requires `InResponseTo` to match
  an AuthnRequest Flagpost actually issued — replayed and IdP-initiated
  responses are rejected.
- **Transient NameIDs refused.** The NameID is the stable subject the
  [identity link](/admin/sso/#how-a-login-resolves) is keyed on, so a
  transient format — a subject that changes per login, minting a new
  account every time — is rejected. Configure your IdP to release a
  persistent (or stable email-format) NameID.

## Dependencies

SAML support ships in the standard image (`python3-saml`, loaded lazily —
installs with no SAML provider never import it). No extra system packages
are needed.
