---
title: What is Flagpost?
description: An overview of Flagpost — a modern, open-source, self-hosted platform for running capture-the-flag competitions.
---

Flagpost is a complete competition platform for CTF organisers: publish
challenges, score solves the moment they land, support competitors, and
automate the whole event — all from one self-hostable app. It is licensed
under the [AGPL-3.0](https://github.com/tbcsec/flagpost/blob/main/LICENSE),
free to run, and designed to be operated on your own infrastructure.

## What sets it apart

- **Real-time everything.** The scoreboard, "who's viewing this challenge"
  presence, notifications, and support-ticket threads all update live over
  WebSockets. Nothing polls, nobody refreshes.
- **A visual automation engine.** No-code **When → If → Then** rules react to
  any platform event — announce first blood, release a hint wave, call a
  hardened webhook, open the feedback survey an hour before the end.
- **Live collaborative notes.** CRDT (Y.js) co-editing gives every team a
  shared scratchpad per challenge, and staff a private notes pad per ticket.
- **Permissions as data.** Roles live in the database. Clone the built-ins and
  craft custom roles with granular, per-competition or site-wide scope.
- **A deep challenge model.** Static, regex, and multiple-choice flags;
  dynamic (decay) scoring; prerequisite unlock chains; scheduled release;
  managed tags and difficulty; per-competition guess caps.
- **A scoreboard done right.** First blood, brackets/divisions, a freeze for
  the final stretch, a public spectator board, and a CTFtime feed.
- **CTFd-compatible and portable.** Bulk challenge import/export in the ctfcli
  YAML format, plus a full-fidelity platform backup.
- **Bring your own identity provider.** Full OIDC/OAuth2 single sign-on
  (Google, Okta, Keycloak, Entra, …) alongside local accounts, with local
  login surviving as break-glass.
- **Secure by default.** argon2 hashing, timing-safe auth, SSRF-hardened
  webhooks, ReDoS-contained regex flags — and no shipped credentials.

## What it deliberately is not (yet)

Flagpost manages competitions, not challenge infrastructure — container
hosting and remote service provisioning are out of scope. SAML and LDAP
authentication and the AI assistant are on the
[roadmap](https://github.com/tbcsec/flagpost/blob/main/docs/ROADMAP.md) but
intentionally not built yet (sign-in today is local accounts or
[OIDC/OAuth2 SSO](/admin/sso/)). Third-party marketplace modules are also not
yet open — the module system currently runs trusted, in-repo code only.

## The stack

| Layer | Technology |
| --- | --- |
| Backend | Python · FastAPI (async) · SQLAlchemy 2 · Alembic |
| Data | PostgreSQL · Redis · MinIO (S3-compatible) |
| Frontend | Next.js (App Router) · React · TypeScript · Tailwind v4 |
| Real-time | Native WebSockets · Y.js (CRDT) |
| Deployment | Docker Compose behind a Caddy reverse proxy |

## Where to go next

- [Try the hosted demo](https://demo.flagpost.io) — a public instance with
  sample data and demo logins, reset every hour.
- [Quick start](/start/quick-start/) — a running platform in three commands.
- [Core concepts](/start/concepts/) — competitions, roles, modules, events.
- [Production deployment](/deploy/production/) — go live on your domain.
