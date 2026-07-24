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
  The per-install JWT secret is derived and persisted if you don't set one.
- **Flags never leave the server.** Static and multiple-choice answers are
  stored as salted hashes and compared server-side; admin APIs show *that* a
  flag is set, never the flag.
- **Submission abuse**: per-subject rate limiting with escalating backoff,
  idempotent repeat-correct handling, full attempt logging, and
  competition-wide multiple-choice guess caps refused *before* grading.
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
- **Uploaded logos** stream with `nosniff` and a sandboxing CSP, so a
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

1. Real secrets in `.env` (`JWT_SECRET`, Postgres, MinIO) — the defaults are
   for local runs only.
2. TLS on (set `SITE_ADDRESS`; Caddy does the rest).
3. Don't expose internals: only 80/443 (and MinIO's public endpoint for
   attachment downloads) need to be reachable; the MinIO **console** (`:9001`)
   should not be public.
4. [Back up](/admin/backup/) before upgrades; guard export files like
   database dumps.
5. Watch the [audit log](/admin/audit-log/) during events — every mutation
   is in there.

## Reporting vulnerabilities

**Don't open a public issue.** Follow the private disclosure process in
[SECURITY.md](https://github.com/tbcsec/flagpost/blob/main/SECURITY.md).
