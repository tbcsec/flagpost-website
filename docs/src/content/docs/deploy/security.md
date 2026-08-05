---
title: Security notes
description: What Flagpost hardens by default, the residual gaps it documents honestly, and the operator checklist for a safe deployment.
---

A CTF platform's users are adversarial by definition — team names, ticket
text, and flag submissions are attacker-controlled input **by design**.
Flagpost's defaults reflect that.

## Hardened by default

- **No shipped credentials.** A fresh install has no admin account until the
  [setup wizard](/admin/setup/) creates one. Public registration never
  grants above Participant.
- **Passwords** hash with **argon2**; authentication comparisons are
  timing-safe.
- **Sessions**: short-lived JWT access tokens plus **rotating, hashed,
  server-side refresh sessions** in an httpOnly cookie — bans and password
  resets revoke them immediately
  ([ADR-0008](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0008-stateful-refresh-sessions.md)).
  There is **no repo-public default JWT secret**: left unset, a strong
  per-install secret is derived and persisted
  ([ADR-0019](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0019-jwt-secret-hardening.md)) —
  a forgotten env var can never mean tokens signed with a value printed in
  the source tree.
- **Flags never leave the server.** Static and multiple-choice answers are
  stored as salted hashes and compared server-side; admin APIs show *that* a
  flag is set, never the flag.
- **Submission abuse**: per-subject rate limiting with escalating backoff,
  idempotent repeat-correct handling (race-safe as of v1.2.0 —
  concurrent duplicate submissions can no longer bank points twice), full
  attempt logging, and competition-wide multiple-choice guess caps refused
  *before* grading.
- **Credential endpoints are rate-limited** (v1.2.0): login, registration,
  password reset, and email verification all throttle.
- **External identity** ([OIDC, SAML, LDAP](/admin/sso/)) hardened by
  construction. OIDC: mandatory PKCE, `state` and `nonce`, ID-token
  signature and claim validation, and `email_verified` parsed strictly
  (since v1.3.0 a string `"false"` can no longer read as verified). SAML:
  assertion signatures validated **before** any content is trusted,
  unsolicited/IdP-initiated responses refused (`InResponseTo` bound to our
  own AuthnRequest), transient NameIDs refused. LDAP: TLS with certificate
  verification is mandatory (plaintext binds are unexpressible),
  identifiers are escaped per RFC 4515, empty-password anonymous binds are
  refused before network I/O, and the subject is a stable directory id —
  never the DN. Directory/enterprise providers are **closed-posture**:
  their email claims never link accounts unless the admin opts in, and
  public providers' new-account provisioning honours the registration
  toggle and email-domain allowlist (v1.3.0,
  [#118](https://github.com/tbcsec/flagpost/issues/118)). JIT-provisioned
  users hold **no role at all**; IdP group/role claims are ignored so
  permission changes never bypass the audit log.
- **Retrievable secrets are encrypted at rest** — SSO provider secrets and
  (since v1.3.0) the SMTP password, under a per-install Fernet key
  ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md))
  — and are **excluded from platform exports**, while everything only ever
  *verified* — passwords, flags, API tokens, reset tokens — is stored
  hashed.
- **Personal API tokens** are hash-stored, shown once at mint, self-mint
  only by route construction, and revocable by oversight
  (`manage_api_tokens`).
- **The stack refuses dangerous defaults**: no shipped JWT secret
  ([ADR-0019](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0019-jwt-secret-hardening.md)),
  and the backend won't boot on MinIO's default credentials when the
  deployment looks reachable.
- **Regex flags** are contained against catastrophic backtracking (ReDoS)
  ([ADR-0018](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0018-regex-flag-redos-containment.md)).
- **Webhook egress** ([ADR-0013](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0013-webhook-egress-hardening.md)):
  outbound URLs are resolved and rejected if **any** resolved IP is
  non-routable (loopback, private, link-local — including the cloud metadata
  endpoint — with IPv4-mapped IPv6 unwrapped); redirects are off;
  credential-bearing headers are stripped; substituted values are escaped
  for the declared content type and chat-platform broadcast tokens are
  defanged, so a team named `@everyone` can't mass-ping your Discord.
- **Attachments** serve via short-lived signed URLs issued only after the
  same permission check as viewing the challenge.
- **Uploaded logos** are verified from their **bytes** at upload (v1.3.0):
  magic-byte checks for rasters, a structural check for SVG — the client's
  declared content type is discarded, so a renamed non-image is rejected —
  and they stream with `nosniff` and a sandboxing CSP, so a
  direct-navigation SVG can't execute script.
- **WebSocket auth** sends the token as the first frame after connect —
  never in the URL, where it would leak into proxy logs and history.
- **Security headers** ship from Caddy: HSTS, `nosniff`, frame options,
  referrer policy, a baseline CSP.

## Documented residual gaps

The project records what it *hasn't* closed yet rather than implying
completeness (see ADR-0013 and `ARCHITECTURE.md` §15): the webhook
resolve-then-connect TOCTOU window (no connection pinning yet) and
destination-level webhook rate limiting. Factor these into rules you create
with the `webhook` action.

## Operator checklist

1. Real secrets in `.env` (`JWT_SECRET`, `SECRET_ENCRYPTION_KEY`, Postgres,
   MinIO) — the defaults are for local runs only. If you leave the
   encryption key derived, it lives on the backend data volume
   (`/data/.secret_key`) — back it up; losing it means re-entering every
   SSO secret and the SMTP password.
2. TLS on (set `SITE_ADDRESS`; Caddy does the rest).
3. Don't expose internals: only 80/443 (and MinIO's public endpoint for
   attachment downloads) need to be reachable; the MinIO **console** (`:9001`)
   should not be public.
4. [Back up](/admin/backup/) before upgrades; guard export files like
   database dumps.
5. Watch the [audit log](/admin/audit-log/) during events — every mutation
   is in there.

## Security releases and advisories

Fixed vulnerabilities are published as
[GitHub Security Advisories](https://github.com/tbcsec/flagpost/security/advisories)
with affected-version ranges (v1.2.0 shipped four). The
[update check](/deploy/upgrades/#the-update-check) tells administrators
when they're behind; if you've disabled it, watch the advisories feed —
security releases are the ones not to sit on.

## Reporting vulnerabilities

**Don't open a public issue.** Follow the private disclosure process in
[SECURITY.md](https://github.com/tbcsec/flagpost/blob/main/SECURITY.md).
