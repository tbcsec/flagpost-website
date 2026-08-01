import { describe, expect, it, vi } from "vitest";

import worker, { normaliseVersion, refreshLatest, type Env } from "../src/index";

/**
 * A stand-in for D1 that records what it was asked to do. The point is to assert
 * on *behaviour* — which day and version get counted, whether a stale cache is
 * refused — rather than on SQL text, which would break on any harmless rewrite.
 */
function fakeDB(rows: Record<string, unknown> = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const stmt = {
        _params: [] as unknown[],
        bind(...params: unknown[]) {
          stmt._params = params;
          return stmt;
        },
        async run() {
          calls.push({ sql, params: stmt._params });
          return { success: true };
        },
        async first<T>() {
          calls.push({ sql, params: stmt._params });
          if (sql.includes("latest_version")) return (rows.latest ?? null) as T;
          return null as T;
        },
      };
      return stmt;
    },
  };
  return { db: db as unknown as D1Database, calls };
}

function env(dbOverride?: ReturnType<typeof fakeDB>): {
  env: Env;
  calls: { sql: string; params: unknown[] }[];
} {
  const { db, calls } = dbOverride ?? fakeDB();
  return { env: { DB: db, GITHUB_REPO: "tbcsec/Flagpost" }, calls };
}

const ctx = {
  waitUntil: (p: Promise<unknown>) => p,
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

// --- version normalisation --------------------------------------------------

describe("normaliseVersion", () => {
  it("accepts real versions and strips the optional leading v", () => {
    expect(normaliseVersion("1.2.3")).toBe("1.2.3");
    // v1.2.3 and 1.2.3 must not become two rows for the same release.
    expect(normaliseVersion("v1.2.3")).toBe("1.2.3");
    expect(normaliseVersion(" 1.2.3 ")).toBe("1.2.3");
    expect(normaliseVersion("1.2.3-rc1")).toBe("1.2.3-rc1");
  });

  it("keeps source builds as their own bucket", () => {
    // Someone running from source is a real deployment, worth seeing separately.
    expect(normaliseVersion("dev")).toBe("dev");
  });

  it("collapses anything unrecognised into one bucket", () => {
    // This is a cardinality guard, not just tidiness: without it a caller
    // sending a million distinct strings creates a million rows a day.
    for (const junk of [
      null,
      "",
      "not-a-version",
      "1.2",
      "<script>alert(1)</script>",
      "https://evil.example.com",
      "1.2." + "9".repeat(50_000),
      "x".repeat(10_000),
    ]) {
      expect(normaliseVersion(junk)).toBe("invalid");
    }
  });

  it("bounds the digits so absurd values can't get through", () => {
    expect(normaliseVersion("1.2.999999999")).toBe("1.2.999999999");
    expect(normaliseVersion("1.2.9999999999")).toBe("invalid");
  });
});

// --- the check endpoint -----------------------------------------------------

describe("GET /v1/check", () => {
  it("counts the check-in under today's date and the reported version", async () => {
    const { env: e, calls } = env();
    const res = await worker.fetch(
      new Request("https://updates.flagpost.io/v1/check?version=1.2.0"),
      e,
      ctx,
    );

    expect(res.status).toBe(200);
    const write = calls.find((c) => c.sql.includes("INSERT INTO checkins"));
    expect(write).toBeTruthy();
    const [day, version] = write!.params as [string, string];
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(version).toBe("1.2.0");
  });

  it("records nothing that identifies the caller", async () => {
    const { env: e, calls } = env();
    await worker.fetch(
      new Request("https://updates.flagpost.io/v1/check?version=1.2.0", {
        headers: {
          "CF-Connecting-IP": "203.0.113.42",
          "User-Agent": "Flagpost/1.2.0",
          Cookie: "session=secret",
        },
      }),
      e,
      ctx,
    );

    // The whole request is reduced to (day, version). Nothing else reaches the
    // database — there's nowhere for it to go.
    const written = JSON.stringify(calls);
    expect(written).not.toContain("203.0.113.42");
    expect(written).not.toContain("secret");
    expect(written).not.toContain("Flagpost/1.2.0");
  });

  it("still counts a junk version, bucketed", async () => {
    const { env: e, calls } = env();
    await worker.fetch(
      new Request("https://updates.flagpost.io/v1/check?version=" + "x".repeat(5000)),
      e,
      ctx,
    );
    const write = calls.find((c) => c.sql.includes("INSERT INTO checkins"));
    expect((write!.params as string[])[1]).toBe("invalid");
  });

  it("returns the cached latest version", async () => {
    const { env: e } = env(
      fakeDB({ latest: { value: "1.3.0", updated_at: new Date().toISOString() } }),
    );
    const res = await worker.fetch(
      new Request("https://updates.flagpost.io/v1/check?version=1.2.0"),
      e,
      ctx,
    );
    expect(await res.json()).toEqual({ latest: "1.3.0" });
  });

  it("omits latest rather than serving a stale one", async () => {
    // A stale value is worse than none: it would tell every deployment they're
    // current long after they stopped being current.
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { env: e } = env(fakeDB({ latest: { value: "1.3.0", updated_at: old } }));
    const res = await worker.fetch(
      new Request("https://updates.flagpost.io/v1/check?version=1.2.0"),
      e,
      ctx,
    );
    expect(await res.json()).toEqual({});
  });

  it("answers even when the counter write fails", async () => {
    // The response and the write are deliberately decoupled: a coupled failure
    // would make the client retry within the hour and risk double-counting a
    // write that had actually succeeded.
    const broken = {
      prepare() {
        return {
          bind() {
            return this;
          },
          async run() {
            throw new Error("d1 down");
          },
          async first() {
            return null;
          },
        };
      },
    } as unknown as D1Database;

    const res = await worker.fetch(
      new Request("https://updates.flagpost.io/v1/check?version=1.2.0"),
      { DB: broken, GITHUB_REPO: "tbcsec/Flagpost" },
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("is not cacheable — a cached response would go uncounted", async () => {
    const { env: e } = env();
    const res = await worker.fetch(
      new Request("https://updates.flagpost.io/v1/check?version=1.2.0"),
      e,
      ctx,
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("serves nothing else", async () => {
    const { env: e } = env();
    expect((await worker.fetch(new Request("https://updates.flagpost.io/"), e, ctx)).status).toBe(404);
    expect(
      (
        await worker.fetch(
          new Request("https://updates.flagpost.io/v1/check", { method: "POST" }),
          e,
          ctx,
        )
      ).status,
    ).toBe(405);
  });
});

// --- the cron refresh -------------------------------------------------------

describe("refreshLatest", () => {
  it("caches a valid release tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ tag_name: "v1.4.0" }),
      }),
    );
    const { env: e, calls } = env();
    const result = await refreshLatest(e, new Date());

    expect(result).toBe("1.4.0");
    const write = calls.find((c) => c.sql.includes("INSERT INTO meta"));
    expect((write!.params as string[])[0]).toBe("1.4.0");
    vi.unstubAllGlobals();
  });

  it("refuses to cache a tag it can't parse", async () => {
    // Better to answer "unknown" than hand every deployment a version string it
    // can't compare against.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ tag_name: "nightly-2026-08-01" }),
      }),
    );
    const { env: e, calls } = env();
    expect(await refreshLatest(e, new Date())).toBeNull();
    expect(calls.find((c) => c.sql.includes("INSERT INTO meta"))).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("survives a GitHub outage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const { env: e } = env();
    expect(await refreshLatest(e, new Date())).toBeNull();
    vi.unstubAllGlobals();
  });
});
