---
title: REST API
description: How the API is organised, how authentication works across REST and WebSockets, the public unauthenticated endpoints, and where the interactive OpenAPI docs live.
---

Everything the Flagpost UI does goes through the same API you can call
yourself: REST under `/api`, WebSockets under `/ws`, served same-origin
through the front proxy.

## Interactive OpenAPI docs

FastAPI generates a complete, always-current interactive reference. Run the
[dev stack](/dev/local/) and open **http://localhost:8000/docs** — every
endpoint, schema, and response model, with a try-it-out console. That
generated reference is the endpoint-level source of truth; this page covers
the contracts that don't change.

## Authentication

- **Register / login** — `POST /api/auth/register`, `POST /api/auth/login`.
  Login takes an `identifier` (username **or** email) plus password and
  returns a short-lived **JWT access token**; a rotating refresh session
  rides an httpOnly cookie. `POST /api/auth/refresh` rotates and re-issues.
- **REST calls** send `Authorization: Bearer <access-token>`.
- **WebSockets** connect to `wss://<host>/ws/…` and send the same access
  token as the **first frame** after connect — never in the URL.
- **Capabilities** — `GET /api/auth/me/permissions` returns the resolved
  permission set the UI uses for role-aware navigation; your integrations
  can use it the same way.
- Self-service reset: `POST /api/auth/forgot-password` (always 204 — it
  never discloses whether an account exists) and
  `POST /api/auth/reset-password`.

## Shape of the API

Endpoints are competition-scoped in the path
(`/api/competitions/{id}/challenges`, `…/scoreboard`, `…/tickets`, …), one
router per domain, mirroring the platform's
[tenancy model](/start/concepts/#competitions-are-tenants). Permission
enforcement happens server-side on every route — see the
[permissions reference](/reference/permissions/).

Flag submission is rate-limited per user/team with escalating backoff —
build clients accordingly.

## Public endpoints (no authentication)

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness — 200 once migrated and serving |
| `GET /api/site-settings` | Public branding (name, palette, logo URL, registration state) so login screens brand themselves |
| `GET /api/site-settings/logo` | The uploaded logo (served sandboxed) |
| `GET /api/public/competitions` | Directory of competitions that opted into the public scoreboard |
| `GET /api/public/competitions/{id}/scoreboard` | Spectator scoreboard (respects freezes; 404 for private/non-opted-in) |
| `GET /api/public/competitions/{id}/ctftime` | [CTFtime scoreboard feed](https://ctftime.org/json-scoreboard-feed) |

## WebSocket rooms

`wss://<host>/ws/<resource_type>/<resource_id>` — scoped rooms for shared
resources (scoreboard, challenge presence, ticket threads), plus
`/ws/user/<user_id>` for the personal notification stream and
`note/<doc_key>` rooms relaying collaborative-note updates. After the
first-frame auth handshake, rooms stream JSON state updates; reconnect with
exponential backoff and jitter, as the built-in client does.
