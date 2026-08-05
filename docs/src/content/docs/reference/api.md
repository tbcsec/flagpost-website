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
- **SSO** — `GET /api/auth/providers` lists the enabled redirect
  providers as `{slug, name, kind}` (v1.3.0 — this **replaced**
  `GET /api/auth/oidc/providers`, a breaking change for integrations on
  the old path). `GET /api/auth/{kind}/{slug}/login` starts the redirect
  flow for OIDC and SAML; OIDC completes at
  `GET /api/auth/oidc/{slug}/callback`, SAML at
  `POST /api/auth/saml/{slug}/acs`, with public SP metadata at
  `GET /api/auth/saml/{slug}/metadata`. LDAP has no endpoints of its own —
  `POST /api/auth/login` falls through to a directory bind after local
  password verification fails, behind the same rate limit. All paths issue
  the same session local login does; admin provider CRUD lives at
  `/api/admin/auth-providers` (`manage_auth_providers`). See
  [SSO & external identity](/admin/sso/).
- **REST calls** send `Authorization: Bearer <access-token>`.
- **WebSockets** connect to `wss://<host>/ws/…` and send the same access
  token as the **first frame** after connect — never in the URL.
- **Capabilities** — `GET /api/auth/me/permissions` returns the resolved
  permission set the UI uses for role-aware navigation; your integrations
  can use it the same way.
- Self-service account endpoints: `POST /api/auth/forgot-password` (always
  204 — it never discloses whether an account exists) and
  `POST /api/auth/reset-password`; `POST /api/auth/change-email`,
  `POST /api/auth/verify-email`, and `POST /api/auth/resend-verification`
  when [email verification](/admin/site-settings/#registration) is on.
- **Credential endpoints are rate-limited** (login, registration, password
  reset, email verification) — back off on 429s.

## Personal API tokens

For scripts and integrations, mint a **personal API token** from the
**API tokens** tab of `/profile` (`/profile?tab=tokens`) instead of
capturing a browser session:

- `POST /api/api-tokens` mints one for **your own account** (the route has
  no holder field — tokens for other users are structurally impossible).
  The raw `flp_…` value is returned **once, at mint time**; only its hash
  is stored.
- Use it exactly like an access token: `Authorization: Bearer flp_…` —
  it authenticates as you, with your full effective permissions. **REST
  only**; the WebSocket handshake does not accept API tokens.
- `GET /api/api-tokens/me` lists yours; `DELETE /api/api-tokens/me/{id}`
  revokes one. Administrators holding `manage_api_tokens` can list and
  revoke **any** token (`GET /api/api-tokens`, `DELETE /api/api-tokens/{id}`)
  — oversight for killing leaked credentials.

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
| `GET /api/public/competitions/{id}/insights` | Spectator stats, highlights and the top-10 points timeline (freeze-parity with the board) |
| `GET /api/public/competitions/{id}/activity` | Recent awarded solves, newest first (capped at 25), each tagged `is_first_blood` — drives the [venue-mode](/guides/scoreboard/#venue--projector-mode) first-blood splash. Freeze-aware, same opt-in/404 gating as the scoreboard (v1.3.0) |
| `GET /api/public/competitions/{id}/ctftime` | [CTFtime scoreboard feed](https://ctftime.org/json-scoreboard-feed) |

## WebSocket rooms

`wss://<host>/ws/<resource_type>/<resource_id>` — scoped rooms for shared
resources (scoreboard, challenge presence, ticket threads), plus
`/ws/user/<user_id>` for the personal notification stream and
`note/<doc_key>` rooms relaying collaborative-note updates. A
per-competition `activity/<competition_id>` room fans out tiny
id-only event frames (never payload bodies) that clients use to refresh
their own permission-filtered REST views — it's what keeps the whole UI
live. After the first-frame auth handshake, rooms stream JSON updates;
reconnect with exponential backoff and jitter, as the built-in client does.
