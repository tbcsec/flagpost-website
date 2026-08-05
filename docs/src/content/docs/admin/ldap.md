---
title: LDAP / Active Directory setup
description: Bind sign-ins directly against Active Directory, OpenLDAP, or FreeIPA — no redirect, TLS mandatory, and local login untouched as break-glass.
---

Since **v1.3.0**, a [provider](/admin/sso/) can be an **LDAP directory** —
Active Directory, OpenLDAP, FreeIPA. Unlike OIDC and SAML there is **no
login button and no redirect**: users type their directory username and
password into the ordinary login form, and Flagpost proves them against
the directory. LDAP providers are always
[closed-posture](/admin/sso/#open-vs-closed-providers): enabling the
directory is the admission decision.

## How a directory login works

On `POST /api/auth/login` (behind the same rate limit as any login):

1. **Local password first.** If the identifier matches a local account and
   the password verifies, that wins — the directory is never consulted.
   This is what keeps the break-glass owner working during an outage.
2. **Then each enabled LDAP provider**, in turn: Flagpost binds with the
   provider's **service account**, searches for exactly one entry whose
   login attribute matches the submitted identifier (escaped per RFC 4515 —
   filter injection isn't possible), then **binds again as the found
   entry's DN with the submitted password** to prove it.
3. A successful bind resolves like any [external identity](/admin/sso/#how-a-login-resolves):
   existing link → sign in; otherwise a just-in-time account with no role.

A directory outage or misconfiguration is a logged skip surfaced to the
user as an ordinary failed login — directory users can't sign in until it
returns, while every local-password account (notably the owner) is
untouched.

## Provider fields

| Field | Meaning |
| --- | --- |
| **Server URL** | `ldaps://…`, or `ldap://…` with StartTLS — **plaintext is not accepted**, and certificates are always verified |
| **Bind DN + bind password** | The service account used to search; the password is the provider's write-only encrypted secret. Anonymous binds are refused |
| **Base DN** | Where the user search is rooted |
| **Login attribute** | What users type — default `uid`; on AD typically `sAMAccountName` or `userPrincipalName` |
| **Stable-ID attribute** | The immutable subject the account link is keyed on — default `entryUUID` (OpenLDAP/FreeIPA); use `objectGUID` on AD. **Never the DN**, which changes when an account moves OU |
| **Email / name attributes** | Directory attributes for display — e.g. `mail`, `displayName` |

The directory's email attribute is display-only unless you set
[*email is authoritative*](/admin/sso/#open-vs-closed-providers) — without
it, a directory `mail` value can never link into (or take over) an
existing local account.

## What's enforced for you

Fixed in code, not configurable:

- **TLS is mandatory** — `ldaps://` or StartTLS, with certificate
  validation forced; a plaintext bind is unexpressible in the config.
- **Empty and whitespace-only passwords are refused before any network
  I/O** — RFC 4513 treats an empty-password bind as *anonymous success*,
  which would otherwise be a login bypass.
- **Ambiguous matches are refused** — if the search returns more than one
  entry, the login fails rather than guessing.
- **Short timeouts, off the event loop** — directory calls run in a worker
  under a 5-second timeout, so a hung directory can't stall the app.

## Active Directory quick reference

| Setting | Typical AD value |
| --- | --- |
| Server URL | `ldaps://dc01.corp.example.com` |
| Login attribute | `sAMAccountName` (or `userPrincipalName`) |
| Stable-ID attribute | `objectGUID` |
| Email attribute | `mail` |

## Dependencies

LDAP support ships in the standard image (`ldap3`, pure Python, loaded
lazily — installs with no LDAP provider never import it).
