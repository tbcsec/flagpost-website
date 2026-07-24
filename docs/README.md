# docs.flagpost.io

The documentation site for [Flagpost](https://github.com/tbcsec/flagpost) —
[Astro Starlight](https://starlight.astro.build/), themed with the Flagpost
design system (brand green accent, Harbor-leaning dark palette, Space
Grotesk headings), deployed to Cloudflare as an assets-only Worker like the
[apex site](../apex/).

Content lives in `src/content/docs/` as Markdown/MDX, organised to match the
sidebar in `astro.config.mjs`: `start/`, `guides/`, `admin/`, `deploy/`,
`reference/`, `dev/`. The reference pages (events, automations, permissions)
mirror the platform's in-code catalogues — when those change upstream
(`backend/utils/event_catalog.py`, `automation_catalog.py`,
`auth/permissions.py`), update the corresponding page here.

## Develop

Requires **Node ≥ 22.12** (pinned in `.node-version`).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/  (includes Pagefind search index)
npm run preview
```

## Deploy (Cloudflare Workers, static assets)

Same model as the apex: create a Worker via **Workers Builds → Import a
repository**, pointing at this repo with:

| Setting          | Value                 |
| ---------------- | --------------------- |
| Worker name      | `flagpost-docs` (must match `wrangler.toml`) |
| Root directory   | `docs`                |
| Build command    | `npm run build`       |
| Deploy command   | `npx wrangler deploy` |

Then attach the `docs.flagpost.io` custom domain to the Worker.

Search is [Pagefind](https://pagefind.app/), generated at build time — no
external service. Headers/CSP ship from `public/_headers`; the CSP allows
inline script and WebAssembly because Starlight's theme switcher and
Pagefind need them.
