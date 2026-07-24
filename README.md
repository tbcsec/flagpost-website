# Flagpost web presence

The public websites for [Flagpost](https://github.com/tbcsec/flagpost), the
modern, open-source CTF platform. Monorepo, one directory per site — each is
its own Cloudflare Pages project with its "Root directory" pointed at the
matching folder.

| Directory | Site | Stack | Status |
| --------- | ---- | ----- | ------ |
| [`apex/`](apex/) | https://flagpost.io | Astro 7 (static) | live |
| [`docs/`](docs/) | https://docs.flagpost.io | Starlight | planned |

Each directory's README covers its own development and deploy details. Both
sites build with Node ≥ 22 (pinned per-directory in `.node-version`).
