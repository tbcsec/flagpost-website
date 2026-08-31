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
- **Retrievable secrets are encrypted at rest** — SSO provider secrets,
  (since v1.3.0) the SMTP password, and (since v1.4.0) the AI provider
  API key, under a per-install Fernet key
  ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md))
  — and are **excluded from platform exports**, while everything only ever
  *verified* — passwords, flags, API tokens, reset tokens — is stored
  hashed.
- **The [AI assistants](/admin/ai/)** (v1.4.0) are off by default and
  **read-only by construction**: every assistant tool call executes as the
  requesting user under their own permissions, competitor tools
  structurally cannot reach flags, hidden hints, or correct
  multiple-choice options, and competitor replies are additionally scanned
  to redact flag-shaped strings (ADR-0023). One deliberate asymmetry with
  webhook egress: the admin-set AI base URL is exempt from the ADR-0013
  SSRF blocklist so a local inference server works — it is
  operator-configured, never competitor-controlled.
- **Backup export/import contains grants** (v1.4.0): the users and roles
  sections require the dedicated `manage_users` / `manage_roles` global
  permissions on top of `manage_site_settings`, and an import that would
  create a role or role assignment exceeding the importer's own
  permissions is refused — mirroring the role editor's
  can't-grant-what-you-don't-hold bound.
- **Targeted announcements are scoped to competition members** (v1.4.0):
  the recipient list is intersected with the competition's membership
  server-side, so competition staff can't message arbitrary platform
  users.
- **Uploads are bounded end to end** (v1.4.0): files are read in bounded
  chunks and aborted at the size cap (attachments 50 MB) instead of
  buffering into RAM first, and an outermost request-body middleware
  rejects over-cap bodies with 413 before any route code runs (100 MB
  default, configurable) — closing a pre-auth memory-amplification
  vector.
- **Personal API tokens** are hash-stored, shown once at mint, self-mint
  only by route construction, and revocable by oversight
  (`manage_api_tokens`).
- **The stack refuses dangerous defaults**: no shipped JWT secret
  ([ADR-0019](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0019-jwt-secret-hardening.md)),
  the backend won't boot on MinIO's default credentials when the
  deployment looks reachable — and since v1.4.0 the compose doesn't
  expose MinIO's S3 API beyond loopback in the first place.
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
  same permission check as viewing the challenge — and since v1.4.0 the
  URL signs in a forced `application/octet-stream` type and attachment
  disposition, so an uploaded HTML or SVG file can never render as active
  content in a viewer's browser.
- **Uploaded logos** are verified from their **bytes** at upload (v1.3.0):
  magic-byte checks for rasters, a structural check for SVG — the client's
  declared content type is discarded, so a renamed non-image is rejected —
  and they stream with `nosniff` and a sandboxing CSP, so a
  direct-navigation SVG can't execute script.
- **Avatar uploads** (v1.5.0) are magic-byte sniffed and accept only
  **PNG, JPEG, or WebP** — never SVG or GIF — bounded by a byte cap and a
  ~40 MP pixel budget computed from header arithmetic (nothing is decoded
  server-side to measure it), then **re-encoded server-side** to a 256px
  square WebP with EXIF/GPS metadata stripped. The stored blob is never
  the uploaded bytes, so an image polyglot is dead on arrival. Public read
  is under an unguessable id with defensive headers (CSP `default-src
  'none'`, `sandbox`, `nosniff`).
- **WebSocket auth** sends the token as the first frame after connect —
  never in the URL, where it would leak into proxy logs and history. Since
  v1.4.0, revocation applies to sockets already open: a ban or account
  deletion closes all of the user's live WebSockets immediately, and
  removal from a team closes that user's sockets to the team's
  collaborative-note documents. Since v1.6.0 the same eviction fires on
  **role revocation**: unassigning a staff member's role, or editing a
  role so its permission set shrinks, force-closes the affected users'
  open sockets so they re-handshake and re-authorize — no staff-only room
  (ticket internal notes most sensitively) keeps streaming to a demoted
  session.
- **Challenge instancing runs adversary-controlled code under
  least-privilege** (v1.6.0, optional module). The platform never mounts
  the raw Docker socket: it talks to an operator-run least-privilege
  socket proxy (only container/image/network verbs; no `exec`, no volume
  mount, no build) or a namespace-scoped Kubernetes ServiceAccount (no
  `secrets`, no `pods/exec`, nothing cluster-scoped). Every instance runs
  under a hardened spec **Flagpost composes itself** — capabilities
  dropped, no-new-privileges, read-only root FS, default seccomp,
  non-privileged, resource-capped — from nothing but the author's image
  ref, ports, and non-secret env. Egress is isolated (a host firewall on
  Docker; an enforced per-instance NetworkPolicy on Kubernetes). See
  [Deploying challenge instances](/deploy/challenge-instances/#security-posture--threat-model)
  for the full trust boundary and the operator-owned gaps.
- **The [`/metrics` endpoint](/deploy/observability/) is off by default**
  (v1.6.0). When enabled it is token- and/or IP-allowlisted (the app
  refuses to boot if enabled with neither) and exposes only
  bounded-cardinality operational numbers — request counts and latencies,
  WebSocket and instance counts, DB-pool depth — never competitor content
  or personal data. It is an **inbound pull**, not telemetry: nothing
  leaves unless a scraper you control reads it.
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
3. Don't expose internals: only 80/443 need to be reachable — since
   v1.4.0 the compose binds MinIO's S3 API to loopback (`127.0.0.1:9000`),
   so signed attachment URLs work on a single-host deploy with nothing
   else exposed. Publish the port deliberately (real credentials,
   `MINIO_PUBLIC_ENDPOINT` set — a non-loopback value trips the
   default-credential boot guard) only when browsers must reach MinIO on
   a separate host. The MinIO **console** (`:9001`) should never be
   public.
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

Separately, v1.6.0 landed an **internal hardening pass** — four findings
from our own review, not externally-reported CVEs: registry-credential
scoping on image pulls (a private-registry credential is now forwarded
only to its own registry, never to an author-named one), first-run
setup re-arm hardening (the one-way setup flag can't be cleared by a
crafted backup import, plus a zero-admin guard), SSO login-CSRF /
session-fixation binding (a browser-bound state cookie now backs the
callback), and the WebSocket eviction on role revocation noted above.

## Reporting vulnerabilities

**Don't open a public issue.** Follow the private disclosure process in
[SECURITY.md](https://github.com/tbcsec/flagpost/blob/main/SECURITY.md).
