---
title: Post-event reports
description: Generate a branded PDF or HTML wrap-up of a finished competition — participation, results, challenge analysis, support and feedback — from the data you already have.
---

The **Post-event reports** module renders a branded end-of-event report —
the document you email a sponsor on Monday morning. It's assembled from the
analytics Flagpost already holds, so there's nothing to instrument: run the
event, end it, generate the report.

Reports are an **optional module**, enabled per competition (on by default)
under **Settings → Modules**. Generating one needs the `generate_report`
permission — held by Judge and Administrator.

## Generate a report

:::note[Reports need a finished competition]
A report is a snapshot of a **completed** event, so it can only be generated
once the competition's [status](/guides/competitions/#controls--status-and-schedule)
is **Ended**. The **Reports** settings tab appears once the competition has
ended; generating before then is refused.
:::

On the Reports tab you:

1. **Pick the sections** — choose an audience **preset** or toggle
   individual sections:
   - **Executive summary** — the headline numbers.
   - **Participation & engagement** — sign-ups, active players, activity
     over time.
   - **Results & scoreboard** — final standings (the "Standings shown" count
     defaults to the top 10, adjustable 3–100).
   - **Challenge analysis** — solves, attempts and difficulty per challenge.
   - **Support & operations** — ticket volume and handling.
   - **Feedback & sentiment** — survey results and ratings.

   The **Executive** preset is the first three; **Technical** and **Full**
   cover everything.
2. **Choose formats** — **PDF**, **HTML**, or both.
3. **Generate.**

Rendering runs **off the request path**: a new versioned report is queued,
the scheduler renders it, and the history list self-polls from *Pending* to
*Running* to *Ready* (or *Failed*). Each generation is a fresh, numbered
version — regenerate as often as you like; the newest is at the top, and you
can delete an old version.

## Downloads

Finished reports **stream through the API**, not through presigned
object-storage URLs:

```
GET /api/competitions/{id}/reports/{report_id}/download/{pdf|html}
```

That's a deliberate choice — it means downloads work on single-origin
deployments, behind a Cloudflare Tunnel, or anywhere the object store isn't
browser-reachable, and `generate_report` is re-checked on **every** fetch
rather than baked into a shareable link. Files are served as an attachment
with `nosniff` and a sandboxing CSP.

## How it renders

A report is HTML composed from your data (Jinja2), turned into PDF by
**WeasyPrint** — the same HTML is also a downloadable format, so the two
can never drift. Charts are drawn as pure inline SVG (no browser, no image
service). Branding is inherited from your [site settings](/admin/site-settings/):
the platform name, the accent colour, and a raster logo inlined into the
document (SVG logos are skipped). A subtle **"Powered by Flagpost"** footer
renders on every page. The renderer's asset loader is locked down — it
resolves only inline `data:` URIs and the bundled fonts, and refuses every
network or filesystem fetch, so a report can't be turned into an SSRF probe.

The data layer is a **read-only aggregation** over the existing analytics.
Standings are read live, so a lingering scoreboard freeze never hides the
final numbers from the report.

Two follow-ups aren't built yet, worth stating so nobody waits on them:
**report anonymisation** (rank-only, no names) and a **size guard** for very
large events.

## Object storage and source installs

Generated reports live in [object storage](/deploy/production/#attachments-and-s3_public_endpoint)
until downloaded or purged. If you run **[without Docker](/deploy/without-docker/)**,
the backend needs WeasyPrint's system libraries installed before you can
generate reports — the official image already bundles them.

Generated report files are **not** included in a
[platform backup](/admin/backup/); they're transient artefacts of a
finished event, cleaned up by retention or when you delete a version.

## Automation

A completed render emits `report.generated`
(`competition_id`, `report_id`, `version`, `user_id`), usable as an
[automation trigger](/guides/automations/) under `generate_report` — for
example, *on `report.generated` → post a webhook to your staff channel*.
