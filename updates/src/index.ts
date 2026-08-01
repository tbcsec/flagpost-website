/**
 * updates.flagpost.io — update check + anonymous adoption count (flagpost#111).
 *
 * A Flagpost deployment asks, once a day:
 *
 *     GET /v1/check?version=1.2.0  ->  {"latest": "1.3.0"}
 *
 * The response tells an administrator they're behind. The *request*, counted
 * here, is the only signal the project has for how many deployments are live —
 * GitHub stars and clone counts measure interest, not use.
 *
 * ## What this endpoint does not know
 *
 * There is no install identifier, and no attempt to build one. Counting
 * *unique* installs would require distinguishing them, which is attributable to
 * a deployment; counting *daily check-ins* requires nothing of the sort.
 * Because each deployment checks in at most once per 24h (enforced client-side
 * by a timestamp in its own database), `requests per day ≈ deployments per day`
 * without storing anything identifying.
 *
 * The IP address is *received*, because that is how HTTP works — and it is
 * never read by this code, never written anywhere, and has no column to go in
 * (see schema.sql). The honest limit of that promise is Cloudflare's own
 * platform logging, which is why the README tells you to keep Logpush off for
 * this Worker.
 *
 * ## The cost of true anonymity
 *
 * With no identifier there is nothing to rate-limit or de-duplicate against, so
 * the count is inflatable by anyone with `curl`. That is the direct price of
 * not tracking installs, and it makes this a directional signal rather than an
 * auditable figure. The README suggests an edge rate-limit rule to blunt casual
 * abuse without storing anything.
 */

export interface Env {
  DB: D1Database;
  GITHUB_REPO: string;
}

/** How long a cached "latest version" may go unrefreshed before we stop
 *  trusting it. Comfortably longer than the 15-minute cron, so a couple of
 *  failed refreshes don't blank the answer. */
const LATEST_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * Same shape the client accepts, and bounded for the same reason: unbounded
 * digits would let a caller push absurd values downstream. Here it does a second
 * job — it caps the *cardinality* of the `version` column. Without it, a caller
 * sending a million distinct version strings would create a million rows a day.
 */
const VERSION_RE = /^v?\d{1,9}\.\d{1,9}\.\d{1,9}(?:[-+][0-9A-Za-z.\-+]{0,32})?$/;

/**
 * Reduce an arbitrary query parameter to one of: a real version, `dev` (a build
 * from source — a real deployment, worth counting separately), or `invalid`.
 * Everything unrecognised collapses into that single bucket, so junk input
 * costs one row rather than unbounded rows.
 */
export function normaliseVersion(raw: string | null): string {
  if (!raw) return "invalid";
  const value = raw.trim();
  // Length-checked before the regex so a megabyte of input isn't matched at all.
  if (value.length > 64) return "invalid";
  if (value === "dev") return "dev";
  if (!VERSION_RE.test(value)) return "invalid";
  // Normalise the optional leading "v" so v1.2.3 and 1.2.3 aren't two rows.
  return value.startsWith("v") ? value.slice(1) : value;
}

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

async function recordCheckin(env: Env, version: string, now: Date): Promise<void> {
  // One row per (day, version), incremented — never a row per request. Keeps
  // the table small and leaves nothing that could distinguish one check-in from
  // another even in principle.
  await env.DB.prepare(
    `INSERT INTO checkins (day, version, count) VALUES (?1, ?2, 1)
     ON CONFLICT(day, version) DO UPDATE SET count = count + 1`,
  )
    .bind(utcDay(now), version)
    .run();
}

async function readLatest(env: Env, now: Date): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT value, updated_at FROM meta WHERE key = 'latest_version'`,
  ).first<{ value: string; updated_at: string }>();
  if (!row) return null;
  // A stale value is worse than none: it would tell every deployment they're
  // current long after they aren't.
  const age = now.getTime() - Date.parse(row.updated_at);
  if (!Number.isFinite(age) || age > LATEST_MAX_AGE_MS) return null;
  return row.value;
}

/**
 * Refresh the cached latest version from GitHub. Runs on the cron trigger, not
 * on the request path — so a GitHub outage or rate limit can never affect a
 * deployment's check, and GitHub sees one request per interval globally instead
 * of one per Cloudflare colo.
 */
export async function refreshLatest(env: Env, now: Date): Promise<string | null> {
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/releases/latest`,
    {
      headers: {
        // GitHub rejects unidentified API clients.
        "User-Agent": "flagpost-updates-worker",
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!response.ok) {
    console.log(`github: releases/latest returned ${response.status}`);
    return null;
  }
  const payload = (await response.json()) as { tag_name?: unknown };
  const tag = typeof payload.tag_name === "string" ? payload.tag_name : null;
  const version = normaliseVersion(tag);
  // Refuse to cache something we couldn't parse — better to answer "unknown"
  // than to hand every deployment a version string it can't compare.
  if (version === "invalid" || version === "dev") {
    console.log(`github: unusable tag_name ${JSON.stringify(tag)}`);
    return null;
  }

  await env.DB.prepare(
    `INSERT INTO meta (key, value, updated_at) VALUES ('latest_version', ?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  )
    .bind(version, now.toISOString())
    .run();
  return version;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Never cached anywhere. A cached response would be served without
      // reaching this Worker, so the check-in would go uncounted.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // No CORS headers: this is a server-to-server endpoint, and there's no
      // reason for a browser page to be able to read it.
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/v1/check") return json({ error: "not_found" }, 404);
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);

    const version = normaliseVersion(url.searchParams.get("version"));
    const now = new Date();

    // Deliberately *not* awaited. If the write and the response were coupled, a
    // D1 hiccup would fail the response, the client would record an error and
    // retry within the hour — and if the write had actually succeeded, that
    // retry would double-count. Decoupling them means the worst case is one
    // lost count rather than a phantom deployment.
    ctx.waitUntil(
      recordCheckin(env, version, now).catch((error) => {
        console.log(`checkin write failed: ${error}`);
      }),
    );

    const latest = await readLatest(env, now).catch(() => null);
    // Omitting `latest` is a valid answer — the client treats an absent or
    // unparseable version as "couldn't check" and simply tries again tomorrow.
    return json(latest ? { latest } : {});
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      refreshLatest(env, new Date()).catch((error) => {
        console.log(`latest-version refresh failed: ${error}`);
      }),
    );
  },
};
