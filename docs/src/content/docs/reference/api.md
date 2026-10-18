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
  providers as `{slug, name, kind, brand}` (v1.3.0 — this **replaced**
  `GET /api/auth/oidc/providers`, a breaking change for integrations on
  the old path). The provider `kind` set is now
  `oidc | oauth2 | saml | ldap` — `oauth2` is new in v1.5.0. `brand`,
  added in v1.4.0 and extended in v1.5.0, is `"google"` /
  `"microsoft"` / `"github"` / `"discord"` / `null`, derived
  server-side so the login page can draw the official button mark.
  `GET /api/auth/{kind}/{slug}/login` starts the redirect
  flow for OIDC, OAuth2 and SAML; OIDC completes at
  `GET /api/auth/oidc/{slug}/callback`, OAuth2 at
  `GET /api/auth/oauth2/{slug}/callback`, SAML at
  `POST /api/auth/saml/{slug}/acs`, with public SP metadata at
  `GET /api/auth/saml/{slug}/metadata`. LDAP has no endpoints of its own —
  `POST /api/auth/login` falls through to a directory bind after local
  password verification fails, behind the same rate limit. All paths issue
  the same session local login does; admin provider CRUD lives at
  `/api/admin/auth-providers` (`manage_auth_providers`), with the built-in
  [preset catalogue](/admin/sso/#built-in-presets) read-only at
  `GET /api/admin/auth-providers/presets` (v1.4.0). See
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

The v1.4.0 [AI assistants](/admin/ai/) follow the same shape: assistant
conversations, availability, usage, per-competition settings, and
transcript review live under `/api/competitions/{id}/ai/…`, and site
provider config at `GET/PUT /api/admin/ai/settings` +
`POST /api/admin/ai/test-connection` (gated `manage_ai`). Assistant
messages are rate-limited per user (60/hour organiser, 20/hour
competitor, one answer in flight) — back off on 429s. The OpenAPI console
remains the endpoint-level source of truth.

v1.5.0 adds a few more domains. `GET /api/modules` returns the site-level
optional-module catalogue (requires `create_competition`). Post-event
[reports](/guides/reports/) live under `/api/competitions/{id}/reports`
(all require `generate_report` and are module-gated), including
`GET /{report_id}/download/{pdf|html}`, which **streams the file through
the API** rather than handing back a presigned URL. Custom-page
administration is CRUD under `/api/admin/pages` (requires `manage_pages`).
Avatars have self-service `POST`/`DELETE /api/profile/avatar` for your own
account, plus `DELETE /api/users/{id}/avatar` for moderators
(`manage_users`); and competitors pull their own [certificates](/guides/certificates/)
from `GET /api/me/certificates`.

v1.6.0 adds several more domains.

[Challenge instances](/deploy/challenge-instances/) are competition-scoped.
A competitor launches, polls, extends and destroys **their own** instance of
a challenge (all `instance_launch`):

- `POST /api/competitions/{cid}/challenges/{chid}/instance` launches one
  (`201`, returns the instance with connection details hidden until it is
  running). It answers `429` when the site spawn rate-limit refuses the
  launch, `409` when a concurrency cap is reached (per-subject, per-competition
  or the global ceiling), and `403` on the demo (instancing is force-disabled
  there) or before the competition is running (staff holding `instance_manage`
  bypass the running gate to test-launch pre-publish).
- `GET /api/competitions/{cid}/challenges/{chid}/instance` polls your active
  instance (`404` if none).
- `POST /api/competitions/{cid}/challenges/{chid}/instance/extend` renews its
  lifetime by one session length, up to five times.
- `DELETE /api/competitions/{cid}/challenges/{chid}/instance` tears it down
  (`202 {status: "destroying"}`).

Staff manage instances competition-wide: `GET /api/competitions/{cid}/instances`
lists every active instance with its resolved challenge title, subject label
and backend handle (`instance_view`), and
`DELETE /api/competitions/{cid}/instances/{id}` force-kills any one of them
(`202`, `instance_manage`). An author defines the per-challenge deployment
spec with `GET`/`PUT`/`DELETE /api/competitions/{cid}/challenges/{chid}/deployment`
(`challenge_edit`).

Site instancing infrastructure is admin-only:
`GET`/`PUT /api/admin/instances/settings` reads and updates the provisioner
backend, endpoint URL, public host, credentials and limits, and
`POST /api/admin/instances/test-connection` runs the saved provisioner's
staged connection probe leg-by-leg — all gated `manage_instance_infra`, its
own grant (Administrator-only) because it holds infrastructure credentials.

[Custom brand themes](/admin/site-settings/#custom-brand-themes) are site-wide CRUD
under `/api/admin/themes` (`GET`/`POST`, and `PUT`/`DELETE /api/admin/themes/{id}`),
all gated `manage_site_settings` — no per-competition scope. The endpoints
only curate the theme library; a theme becomes the active site theme by
pointing `default_palette` at its id through the site-settings update.

The authenticated scoreboard gains a cumulative points-over-time series:
`GET /api/competitions/{cid}/scoreboard/timeline` (`challenge_view`, same as
the board read) plots the top entrants as running-total lines. Query params
`live`, `bracket` and `top` mirror the board — `?live=true` only bypasses a
freeze for a `scoreboard_freeze` holder, `bracket` scopes to one division,
and `top` is clamped server-side (default 10, hard cap 25).

[Scheduled announcements](/guides/support/#scheduled-announcements) add three staff routes on
`/api/competitions/{cid}/announcements` (all `announcement_create`):
`GET /scheduled` lists pending drafts, `PATCH /{id}` edits a still-scheduled
draft's content or timing, and `DELETE /{id}` cancels one. `PATCH`/`DELETE`
return `409` on a row that has already published — only a still-scheduled
draft can be edited or cancelled.

[Custom registration fields](/guides/teams/#custom-registration-fields) are
competition-scoped under `/api/competitions/{cid}/registration-fields`:
`GET`/`PUT` on the collection reads the visible field definitions / replaces
the set as an organiser (`edit_competition`); `GET`/`PUT /me` reads and edits an
individual's own answers (`challenge_view`, individual-mode competitions only
— `400` in team mode, where answers are edited through the team); and
`GET /export` streams the organiser's CSV of every subject's answers
(`edit_competition`).

v1.8.0 adds the [code judge](/deploy/code-judge/), competition-scoped under
`/api/competitions/{cid}`:

- **Competitors** (`challenge_view`, plus ownership) read a problem with
  `GET /challenges/{chid}/problem` — effective limits, accepted languages and
  the example cases, never a hidden test — and submit with
  `POST /challenges/{chid}/submit-code` (`202`, body `{language, source,
  kind}`, where `kind` is `submit` (the default) or `run`). It applies the
  flag route's gates and rate limit, answers `413` for source over 128 KB,
  `429` with three submissions already waiting, and `503` while the judge is
  off. Poll
  `GET /judgings/{id}` or list `GET /challenges/{chid}/judgings` — verdicts
  also arrive live on your per-user WebSocket room.
- **Authors** (`challenge_edit`) manage a problem under
  `/challenges/{chid}/judge` (settings, `…/testcases`, `…/reference` for the
  reference check, `…/package` to export one problem);
  `POST /judge/packages/import` (`challenge_create`) and
  `GET /judge/packages/export` handle ICPC problem packages.
- **Staff** list judgings with `GET /judgings` and `GET /judging-queue`
  (`judging_view`), and `POST /judgings/{id}/rejudge`,
  `POST /challenges/{chid}/rejudge` and `POST /judgings/{id}/override`
  (`judging_rejudge`).
- **Clarifications** (core): `POST /tickets/{id}/clarify`,
  `GET`/`POST /challenges/{chid}/clarifications` and
  `POST /announcements/{id}/withdraw`.

Site judge configuration lives under `/api/admin/judge` (`settings`, `check`,
`setup`, `presets`, `languages`), all gated `manage_judge_infra`.

Flag submission is rate-limited per user/team with escalating backoff —
build clients accordingly.

## Public endpoints (no authentication)

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness — 200 once migrated and serving |
| `GET /api/site-settings` | Public branding (name, palette, background style, sign-in notice, logo URL, registration state) so login screens brand themselves — the [background style and notice](/admin/site-settings/#appearance) are v1.4.0 |
| `GET /api/site-settings/logo` | The uploaded logo (served sandboxed) |
| `GET /api/public/competitions` | Directory of competitions that opted into the public scoreboard |
| `GET /api/public/competitions/{id}/scoreboard` | Spectator scoreboard (respects freezes; 404 for private/non-opted-in) |
| `GET /api/public/competitions/{id}/insights` | Spectator stats, highlights and the top-10 points timeline (freeze-parity with the board) |
| `GET /api/public/competitions/{id}/activity` | Recent awarded solves, newest first (capped at 25), each tagged `is_first_blood` — drives the [venue-mode](/guides/scoreboard/#venue--projector-mode) first-blood splash. Freeze-aware, same opt-in/404 gating as the scoreboard (v1.3.0) |
| `GET /api/public/competitions/{id}/ctftime` | [CTFtime scoreboard feed](https://ctftime.org/json-scoreboard-feed) |
| `GET /api/pages` | Custom-page nav entries (v1.5.0) — anonymous callers see public pages only; signed-in callers also see members-only pages |
| `GET /api/pages/{slug}` | A single [custom page](/admin/pages/) (v1.5.0); hidden or draft pages fail closed to 404 |
| `GET /api/users/{id}/avatar` | A user's avatar image (v1.5.0), immutable-cached with a `?v=<epoch>` cache-buster |

## Metrics scrape endpoint

`GET /metrics` (v1.6.0) is a Prometheus exposition target for operators. It
is a kernel route, **not** under `/api`, and it is **off by default** — it
returns `404` until you set `METRICS_ENABLED=true`. It does **not** use the
RBAC permission system: a scraper has no interactive session, so access is
gated by a static bearer token and/or an IP allowlist instead. An enabled but
unauthorised scrape gets `401` with `WWW-Authenticate: Bearer`; an authorised
one gets `200 text/plain`. Enabling it without a token or an allowlist is a
hard startup refusal, so the endpoint can never be public. It exposes bounded
operational numbers only (request timing, event-bus lanes, WebSocket and
challenge-instance counts, scheduler liveness, DB-pool depth) — never
competitor content or personal data. See
[observability](/deploy/observability/) for the metric families and a sample
scrape config.

## WebSocket rooms

`wss://<host>/ws/<resource_type>/<resource_id>` — scoped rooms for shared
resources (scoreboard, challenge presence, ticket threads), plus
`/ws/user/<user_id>` for the personal notification stream, `note/<doc_key>`
rooms relaying collaborative-note updates, and (v1.4.0)
`ai/<conversation_id>` rooms streaming [assistant](/admin/ai/) answers —
joinable by the conversation's owner or the matching oversight grant. A
per-competition `activity/<competition_id>` room fans out tiny event
frames that clients use to refresh their own permission-filtered REST
views — it's what keeps the whole UI live. Most are id-only pings, but
since v1.4.0 the solve ping carries a compact public delta
(`{challenge_id, solve_count, value, team_id}` — all already-public
fields) that clients patch in place instead of refetching; the delta
falls back to a plain ping when the challenge isn't competitor-visible or
the board is frozen, and same-event bursts are server-side coalesced.
After the first-frame auth handshake, rooms stream JSON updates;
reconnect with exponential backoff and jitter, as the built-in client
does — the handshake itself is rate-limited per user since v1.4.0
(default 60 per 30 s across all rooms), so a hammering reconnect loop is
actively refused.
