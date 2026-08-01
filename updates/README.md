# updates.flagpost.io

The update-check and adoption-count endpoint for Flagpost deployments
([flagpost#111](https://github.com/tbcsec/Flagpost/issues/111)).

Unlike [`../apex`](../apex) and [`../docs`](../docs), which are assets-only
Workers serving static sites, this is a **script Worker** with a D1 database —
so its `wrangler.toml` carries `main` and a `[[d1_databases]]` binding. The
deployment model is otherwise identical: Workers Builds with the root directory
pointed at this folder.

## What it does

```
GET /v1/check?version=1.2.0  ->  {"latest": "1.3.0"}
```

Two jobs in one request. The response is how a Flagpost administrator learns
there's a newer release. Counting the requests is the only signal the project
has for how many deployments are actually running — GitHub stars and clone
counts measure interest, not use.

A deployment checks in **at most once per 24 hours**, enforced on its side by a
timestamp in its own database (so a restart doesn't re-trigger it). That's what
makes `requests per day ≈ deployments per day` without needing to identify
anyone.

## The privacy design

**The schema is the guarantee, not a policy.** [`schema.sql`](schema.sql) is the
entire data model:

```sql
CREATE TABLE checkins (
  day     TEXT NOT NULL,   -- "YYYY-MM-DD"
  version TEXT NOT NULL,   -- validated version, or "dev" / "invalid"
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, version)
);
```

There is nowhere to put an IP address, a hostname, or an install identifier —
no such column exists. A check-in **increments a counter**; it never inserts a
row of its own, so nothing distinguishes one check-in from another even in
principle.

The IP address is *received*, because that's how HTTP works. It is never read by
the Worker and has nowhere to be written. The honest limit of that promise is
Cloudflare's own platform logging — see [Required configuration](#required-configuration).

### Why there's no unique count

Counting *unique* installs needs an identifier, which makes the data
pseudonymous — traceable to a deployment over time. We don't do that, so the
number is "check-ins today", not "distinct installs".

The cost is worth stating plainly: with no identifier there's nothing to
de-duplicate or rate-limit against, so **the count is inflatable by anyone with
`curl`**. Treat it as directional signal, not an auditable figure.

### Input is untrusted

`?version=` comes from anyone. It's length-capped, regex-validated, and anything
unrecognised collapses into a single `invalid` bucket. That's not tidiness — it
caps the *cardinality* of the `version` column. Without it, a caller sending a
million distinct strings would create a million rows a day. Verified: 20 distinct
junk values produce exactly one row.

### Where "latest" comes from

A cron trigger (every 15 minutes) fetches the latest release from the GitHub API
and caches it in D1. **The request path never talks to GitHub**, so:

- a GitHub outage or rate limit can't affect a deployment's check;
- GitHub sees one request per interval globally, rather than one per Cloudflare
  colo, which is what would otherwise blow the unauthenticated rate limit.

A cached value older than 6 hours is treated as unknown and the endpoint answers
`{}` — a stale version is worse than none, since it would tell every deployment
they're current long after they aren't. Clients handle an absent `latest`
gracefully and simply try again tomorrow.

## First-time setup

```bash
# 1. Create the database, then paste the returned database_id into wrangler.toml
npx wrangler d1 create flagpost-updates

# 2. Create the tables
npm run db:init

# 3. Deploy (or let Workers Builds do it from a push)
npm run deploy
```

Then in the dashboard: add the custom domain `updates.flagpost.io` to the
`flagpost-updates` Worker.

The cron populates `meta.latest_version` within 15 minutes of the first deploy.
Until then the endpoint answers `{}`, which clients handle. To seed it
immediately, hit the scheduled handler once.

## Required configuration

Two settings that the code cannot enforce for you, and which the promises in
Flagpost's [`PRIVACY.md`](https://github.com/tbcsec/Flagpost/blob/main/PRIVACY.md)
depend on:

1. **Keep Logpush off** for this Worker and its zone. Cloudflare's HTTP request
   logs include client IPs; enabling Logpush would create exactly the record
   this design avoids. (The Workers *dashboard analytics* are aggregate
   Cloudflare-side metrics and don't retain per-request IPs, but Logpush does.)
2. **Don't add fields to `checkins`.** The schema's narrowness is the point. If
   a future question needs more data, that's a decision to make openly and
   document in `PRIVACY.md` first — not a column to quietly add.

Optional but recommended: a Cloudflare **rate-limiting rule** on
`/v1/check` (say 10 requests per IP per hour). Cloudflare enforces it at the
edge without us storing anything, and it blunts casual inflation of the count.
It won't stop a determined distributed effort — nothing identifier-free could.

## Reading the numbers

```sql
-- Deployments checking in per day (the headline number)
SELECT day, SUM(count) AS deployments
FROM checkins WHERE version != 'invalid'
GROUP BY day ORDER BY day DESC LIMIT 30;

-- Version spread today — tells you when it's safe to drop support for a release
SELECT version, count FROM checkins
WHERE day = date('now') ORDER BY count DESC;

-- How many are running something from source
SELECT day, count FROM checkins WHERE version = 'dev' ORDER BY day DESC LIMIT 30;
```

```bash
npx wrangler d1 execute flagpost-updates --remote --command "<query>"
```

Interpretation caveats worth remembering: **inflated** by ephemeral test
instances and short evaluations; **deflated** by air-gapped installs and anyone
who opted out; replicas sharing one database count **once**, which is correct —
that's one deployment. Flagpost's demo instance is excluded at source (it resets
hourly and would otherwise report ~24 phantom deployments a day).

## Development

```bash
npm install
npm test          # unit tests — no Cloudflare account needed
npm run typecheck
npm run db:init:local
npm run dev
```

`npm run dev` may fail with *"This Worker requires compatibility date … but the
newest date supported by this server binary is …"* — the committed
`compatibility_date` matches its sibling projects and is valid on Cloudflare, but
can outrun the bundled local runtime. Override it for local runs only:

```bash
npx wrangler dev --local --compatibility-date=2026-05-03
```

Cron triggers don't fire in local dev; trigger one by hand:

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled"
```
