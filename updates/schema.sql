-- updates.flagpost.io — the entire data model.
--
-- This schema *is* the privacy guarantee. There is nowhere to put an IP
-- address, a hostname, an install identifier or anything else about a
-- deployment, because no such column exists. It is not a policy that could be
-- quietly relaxed; it's a shape.
--
-- One row per (day, version). Never a row per request — a check-in increments
-- a counter, so the table stays tiny however many deployments there are, and
-- nothing distinguishes one check-in from another.

CREATE TABLE IF NOT EXISTS checkins (
  -- UTC calendar day, "YYYY-MM-DD".
  day     TEXT NOT NULL,
  -- A validated version string, or the literal "dev" (source build) or
  -- "invalid" (anything unrecognised, bucketed so a junk value can't create
  -- unbounded rows). See normaliseVersion() in src/index.ts.
  version TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, version)
);

-- Single-row key/value for worker state — currently just the latest released
-- version, refreshed from the GitHub Releases API by the cron trigger.
CREATE TABLE IF NOT EXISTS meta (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
