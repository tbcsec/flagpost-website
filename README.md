# Flagpost web presence

The public websites for [Flagpost](https://github.com/tbcsec/flagpost), the
modern, open-source CTF platform. Monorepo, one directory per site — each
deploys as its own Cloudflare **assets-only Worker** (Workers Builds with
"Root directory" pointed at the matching folder).

| Directory | Site | Stack | Worker | Status |
| --------- | ---- | ----- | ------ | ------ |
| [`apex/`](apex/) | https://flagpost.io | Astro 7 (static) | `flagpost-apex` | live |
| [`docs/`](docs/) | https://docs.flagpost.io | Astro Starlight | `flagpost-docs` | built, awaiting Worker + domain |

Each directory's README covers its own development and deploy details. Both
sites build with Node ≥ 22 (pinned per-directory in `.node-version`), and
each carries its own `wrangler.toml` whose `name` must match its Worker.
