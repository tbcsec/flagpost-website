# flagpost.io — apex

The marketing landing page for [Flagpost](https://github.com/tbcsec/flagpost),
the modern, open-source CTF platform. A fully static [Astro](https://astro.build)
site styled with the Flagpost design system (Harbor palette, Space Grotesk,
the LOGO-SPEC mark and its sanctioned "Plant" hero animation), deployed to
Cloudflare Pages.

The docs site (`docs.flagpost.io`, Starlight) lives separately in `../docs`.

## Develop

Requires **Node ≥ 22.12** (pinned in `.node-version`; Astro 7 requirement).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview    # serve dist/ locally
```

## Regenerate brand rasters

`public/og.png`, the manifest icons and `favicon.ico` are generated — and
committed — from the brand SVGs so CI stays dependency-light:

```bash
npm run assets
```

Re-run only when the brand changes (satori renders the wordmark from the
vendored Space Grotesk, so output is deterministic).

## Deploy (Cloudflare Pages)

**Git integration (recommended):** connect the repository in the Cloudflare
dashboard with

| Setting          | Value           |
| ---------------- | --------------- |
| Root directory   | `apex`          |
| Build command    | `npm run build` |
| Build output     | `dist`          |

Node version is picked up from `.node-version`. Attach the `flagpost.io`
custom domain to the production environment.

**Direct upload:** `npm run build && npx wrangler pages deploy`
(project settings come from `wrangler.toml`).

Security headers, CSP and cache policy ship in `public/_headers`. If you add
an inline `<script>` (don't), the CSP will block it — every script must be an
external same-origin file, which `assetsInlineLimit: 0` in
`astro.config.mjs` guarantees for bundled ones.

## Where things live

```
src/
  styles/global.css   Design tokens (ported from the app's globals.css) +
                      the Plant animation (LOGO-SPEC §11) + landing motion
  layouts/Base.astro  Document head: SEO meta, OG/Twitter, JSON-LD, favicons
  components/         Nav, Hero, ScoreboardMock, Features, Automation,
                      Operations, QuickStart, OpenSource, Faq, Footer,
                      FlagpostMark, Lockup, Icon
  data/               links.ts (every external URL), faq.ts (accordion +
                      FAQPage JSON-LD single source)
  pages/index.astro   The one page; assembles sections + structured data
public/
  _headers            Cloudflare security + caching headers
  js/boot.js          Pre-paint boot: reveal gating + once-per-session Plant
scripts/
  generate-assets.mjs `npm run assets` (og.png, icons, favicon.ico)
```

Design-system fidelity notes: colours are HSL channel tokens consumed via
Tailwind `@theme` exactly as the app does; the wordmark split ("Flag" sheet /
"post" green) follows LOGO-SPEC §3; the hero is one of the four sanctioned
Plant surfaces (§11.4) and honours once-per-session + reduced-motion rules.
