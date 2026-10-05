# Schema/information drift report — 2026-10-05

Scheduled drift check between **tbcsec/flagpost** (platform) and
**tbcsec/flagpost-website** (apex + docs).

## Verdict

**No commits landed on `flagpost` `main` in the scan window (2026-09-28 →
2026-10-05).** The last platform commit is `0500285`, dated **2026-09-06**;
the repo has been quiet for ~4 weeks. So there is no *new* drift from this
week.

Widening to the live milestone found a **large, already-accumulated gap**: the
8 commits between the `v1.6.0` tag (2026-08-31) and `main` are the v1.7.0
marketplace/SDK/skills flagship, and **none of it is reflected on either
site**. The website's own convention is to sync per release (`docs: sync to
v1.5.0`, `apex: reflect v1.6.0`), and `main` is still `1.6.0-src` with no
v1.7.0 release, so most of this is correctly *queued* rather than overdue.

Three items, however, are **due now** and are called out as P1 below: one is
pre-existing drift from an already-released version, one is a web-presence
infrastructure gap with lead time, and one is a security-relevant guidance
change that must not be missed at release.

### State established

| Fact | Value |
| --- | --- |
| Platform `main` HEAD | `0500285` (2026-09-06) |
| Commits in 7-day window | **0** |
| Latest release | **v1.6.0** (2026-08-31) |
| `SOURCE_BUILD_VERSION` | `1.6.0-src` (unreleased) |
| Website `main` HEAD | `6df09c2` — "apex: reflect v1.6.0" (2026-08-31) |
| Unreleased platform commits | 8 (2026-09-03 → 2026-09-06) |

### The unreleased commits

| Commit | Issue | Subject |
| --- | --- | --- |
| `0500285` | #390 | module SDK — build, sign, validate, scaffold |
| `1e44abd` | #389 | marketplace admin import + settings UI |
| `a0b2825` | #389 | code-based resolve + install pipeline |
| `f20ad43` | #389 | settings + artifact trust verification core |
| `a5bd4d0` | #387 | Tier 0 content-pack import |
| `679af81` | #386 | enforce manifest v2 at load |
| `b35d61a` | #386 | ADR-0040 + module/registry protocol spec |
| `41db7c4` | #364 | cross-competition skills web |
| `1d33620` | #377 | per-instance Docker networks (GHSA-vgrr) |
| `e754474` | #376 | net MC penalties in frozen board (GHSA-r7j2 F5) |

Milestone epic **#385** (Module SDK, importing & marketplace) is open with
#386 done, #387/#389/#390 shipped-but-open, and **#388 (Tier 1 declarative)
and #391 (Tier 2 signed code) not started** — so the marketplace story is
deliberately partial, which constrains how it should be documented (see P2.1).

---

## P1 — due now

### P1.1 `automation.rule_*` events missing from the event reference

**Pre-existing drift, not from this milestone.** `reference/events.md`
documents 95 of the 100 events in `backend/utils/event_catalog.py`. Three of
the five gaps are **not** marketplace work:

- `automation.rule_created`
- `automation.rule_updated`
- `automation.rule_deleted`

These were introduced by `4360730` (#266/#308, the instances site-infra
settings panel) and shipped in a **released** version. The last two docs
syncs (v1.5.0, v1.6.0) both missed them.

**Why it matters.** `reference/events.md` is the contract automation authors
build triggers against, and the page presents itself as the complete
catalogue. A missing trigger name is an author silently concluding the
platform can't react to a rule change. This is the only finding in this report
that is wrong about *shipped, downloadable software* today.

**Where:** `docs/src/content/docs/reference/events.md` — add the three rows to
the Automations group, matching their catalogue metadata (scope, triggerable
flag).

### P1.2 `marketplace.flagpost.io` has no site or Worker

`backend/models/marketplace.py` ships `DEFAULT_REGISTRY_URL =
"https://marketplace.flagpost.io"` as the **out-of-the-box registry URL** for
every install. That hostname appears **nowhere** in this repo — no directory,
no `wrangler.toml`, no entry in the README's site table.

**Why it matters.** At v1.7.0, every deployment's marketplace settings will
point by default at a domain that does not resolve. The first thing an
operator does on the new Admin → Marketplace page is paste a code and hit
resolve, which will fail against a dead host. This needs DNS, a Worker and at
minimum a catalogue-index endpoint conforming to
`flagpost/docs/spec/catalog-index.schema.json` and
`resolve-response.schema.json`. That is **lead-time work that must land
before the release**, not part of the release-day docs sync — which is why it
is flagged now while the platform is quiet.

**Where:** a new top-level directory in this monorepo (alongside `apex/`,
`docs/`, `updates/`) plus a row in the root `README.md` table. `updates/` is
the closest existing precedent for a script Worker with a data binding.

### P1.3 Instance egress guidance becomes actively wrong at v1.7.0

`1d33620` (#377, **GHSA-vgrr-2jpc-mmc5**) stopped putting every challenge
instance on one shared `flagpost-instances` bridge. Each published-port (TCP)
or `none` instance now gets its **own** throwaway bridge,
`flagpost-net-<instance_id>`, each with its own subnet from Docker's address
pool. `exposure=http` instances stay on the shared bridge.

`deploy/challenge-instances.md:128` currently tells operators:

> **Drop forwarded traffic** out of the `flagpost-instances` subnet except the
> competitor-facing ports […]

**Why it matters — this is the serious one.** Once v1.7.0 ships, an operator
who follows that instruction verbatim writes a firewall rule matching a subnet
that **no TCP instance is on any more**. Their egress controls silently stop
applying — including the rule the page itself calls "the single most important
one", blocking the cloud metadata IP `169.254.169.254`. The failure is silent:
nothing errors, the rule just matches nothing. A page that currently makes a
deployment safe would, unchanged, leave it exposed.

It is **correct for v1.6.0 today** (all instances share the bridge there), so
this is a release-gated change — but it is the single highest-consequence item
in the v1.7.0 sync and the easiest to overlook, because the fix is a security
*improvement* and reads like good news.

**Where:** `docs/src/content/docs/deploy/challenge-instances.md`, the "Egress
control" section. The platform's `docs/CHALLENGE_INSTANCES.md` already carries
the authoritative replacement wording: firewall **every** instance bridge, and
rather than chasing per-instance subnets, pin Docker's
`default-address-pools` in `/etc/docker/daemon.json` to a known range and drop
forwarded traffic from that whole range. The same page should gain the
peer-isolation note (automatic for TCP/`none`; HTTP peers are a documented
residual) and the two Kubernetes-parity mentions at lines ~311/358/361 should
be re-checked for consistency.

---

## P2 — v1.7.0 release sync

Queued behind the release, listed so the sync is a checklist rather than a
re-derivation.

### P2.1 `dev/modules.md` — manifest v2 and the end of "no marketplace"

The largest single piece of work. `679af81` (#386) made **manifest v2 an
enforced contract**: `plugins/manifest.py` validates every `plugin.yaml`
through a Pydantic model with `extra="forbid"`, so an unknown key now fails
the load closed. v2 adds `kind` (`pack`|`module`), `trust_tier`
(`declarative`|`code`; `sandboxed` is reserved and rejected), `capabilities`,
`publisher`, and compat bounds, with conditional rules (a module requires
`trust_tier`; a pack requires a pack body and declares no code; a declarative
module may not request code-only capabilities such as `network.egress`,
`migrations.run`, `permissions.define`).

`manifest_version: 1` — every in-box manifest — still validates leniently as
first-party code, **so the page's existing example is not broken**; it is
simply insufficient for anyone authoring something distributable.

The page also carries claims that are now false. `dev/modules.md:118`:

> there is **no marketplace or sandboxing** — modules are trusted code running
> in-process, reviewed like any other contribution. If you're building
> something you hope to distribute, open a discussion on the repo first.

Distribution is now a designed path. Three further pages repeat the stale
claim and need the same correction:

- `dev/architecture.md:33` — "Marketplace / third-party modules are a future
  concern with an explicit sandboxing question to answer first"
- `start/introduction.md:62` — "Third-party marketplace modules are not yet
  open"
- `start/flagpost-vs-ctfd.md:57` — "first-party modules only, with a
  marketplace on the roadmap"

**Accuracy constraint:** do not overcorrect. Tier 0 (content packs) and the
signed-artifact trust core shipped; **Tier 1 (#388) and Tier 2 (#391) have
not**, and Tier 3 sandboxing stays deferred by ADR-0040. The honest statement
at v1.7.0 is "content packs install today; declarative and signed-code modules
are in progress; untrusted-code sandboxing is explicitly out of scope." The
existing "What the manifest doesn't do yet" section is the right home for that
nuance — `settings`/`widgets`/`nav_items`/`extensions` remain declared-but-unused
until #388.

### P2.2 Two new permissions

`reference/permissions.md` is a 48-row table against **50** in
`backend/auth/permissions.py`. Diffed clean apart from two additions — no
stale rows, no category or scope mismatches:

| Permission | Category | Scope |
| --- | --- | --- |
| `install_content_pack` | Marketplace | global |
| `manage_marketplace` | Marketplace | global |

Worth preserving the rationale in the page's prose: these are deliberately
**two** grants, not one. `manage_marketplace` configures the trust policy —
i.e. decides what code is allowed to run — and is split from both
`install_content_pack` and `manage_site_settings` for that reason. Both are
Administrator-only and global. This also introduces a new **Marketplace**
category to the role editor grouping.

### P2.3 Two new events

The other half of the `reference/events.md` gap (see P1.1):

- `platform.content_pack_installed`
- `platform.marketplace_settings_updated`

Both are platform-admin scope and non-triggerable. Note for the page: a pack
install emits **one** event, not a `challenge.created` per imported challenge
— the same deliberate bulk-op choice already documented for YAML import and
backup import.

### P2.4 New page — Admin → Marketplace

`1e44abd` shipped a real operator surface with no documentation anywhere.
Needs a new `docs/src/content/docs/admin/marketplace.md` covering the
paste-code → resolve → review → install flow, the competition target for
challenge packs, and the settings card. The defaults matter and should be
stated exactly, because they are the security posture:

| Setting | Default |
| --- | --- |
| `enabled` | **`true`** |
| `registry_url` | `https://marketplace.flagpost.io` |
| `trust_policy` | `verified` |
| `max_trust_tier` | `declarative` |
| `trusted_keys` | empty |

Two points deserve prose rather than a table row. **On-by-default is
deliberate and safe**: the surface makes no outbound call until an operator
acts, so an idle marketplace leaks nothing — contrast the `ai` module, which
ships inert behind a master switch. And **`max_trust_tier: declarative` means
installing third-party *code* requires an explicit operator opt-in**, which is
the single most important sentence on the page.

Also document that `registry_url` is an **operator-trusted** setting and is
deliberately **not** SSRF-blocked, so a private mirror or air-gapped host is
first-class — the same treatment as the AI provider `base_url`. And that the
registry's own trust claims are display hints only: verification is always
re-done locally against the instance's policy.

### P2.5 New page — the module SDK

`0500285` (#390) shipped `backend/sdk/` and `flagpost/docs/MODULE_SDK.md`: an
ed25519 keygen/sign facility, deterministic `.fpmod` packaging with a sha256
digest, born-valid scaffolding, and a `python -m sdk` CLI
(`keygen`/`build`/`sign`/`validate`/`init`).

**Why it belongs on the docs site, not just in-repo:** it is the authoring
counterpart to the install pipeline, and its audience is third-party module
authors who will not have the platform repo checked out. Suggest
`docs/src/content/docs/dev/module-sdk.md` covering the build → sign → publish
loop and the operator trusted-key setup, cross-linked from
`dev/modules.md`. Flag clearly that module tiers are not installable yet
(#388/#391) — today the loop is real only for **content packs**.

### P2.6 Skills — entirely undocumented, participant-facing

`41db7c4` (#364, ADR-0039) shipped the cross-competition skills web. The word
"skills" appears **nowhere** in `docs/` or `apex/`. This is the only
*participant-visible* feature in the batch, so it has an apex claim as well as
a docs one.

- **New guide** (`guides/skills.md` or a section in an existing profile/guide
  page): Profile → Skills, third tab — a radar over ≥3 axes plus a ranked
  breakdown. A skill is a normalized challenge-category name; each distinct
  awarded solve weighs +1 (points and difficulty deliberately do not
  normalize across events).
- **`admin/site-settings.md`**: the new `skills_enabled` site-wide switch,
  **default on**, surfaced on the public site-settings read so the shell can
  gate the nav. Both endpoints 404 when it is off.
- **Privacy/scope note**: worth stating plainly on whichever page covers it —
  this is the one place user data is aggregated **across competitions**, it is
  **self-scoped only** (the admin matrix was dropped on review, per the
  ADR-0039 amendment), it is off-switchable, and nothing is sent anywhere.
  The platform's `PRIVACY.md` carries the canonical wording.

Note for the vs-CTFd and feature pages: this is a genuine differentiator and
also a sanctioned exception to Flagpost's own "no cross-competition rollups"
rule — describing it as a general analytics feature would misrepresent it.

### P2.7 `BOOTSTRAP_BACKUP_FILE` — new deployment knob

`2d8e4ee` (#357, **ADR-0038**) added `bootstrap_backup_file` (env
`BOOTSTRAP_BACKUP_FILE`): a path to a mounted platform export, imported at
boot after role/theme seeding and before the demo seed. On failure it raises
`BootstrapError` and **aborts startup** rather than booting half-provisioned.

**Why it's operator-facing and not internal-only:** ADR-0038 frames it as
infrastructure-as-code bootstrap — provision a brand-new deployment from a
known-good export with no manual wizard step. That is a deployment primitive,
and it currently appears in no configuration table on the site. Verified
absent from both `deploy/configuration.md` and `admin/setup.md`.

**Where:** a row in `deploy/configuration.md`, plus a short subsection in
`admin/setup.md` or `deploy/production.md` noting the fail-closed behaviour
and the "bootstrap onto a fresh volume" guidance from the ADR (it does not
merge into an instance that already has an owner). Also note it suppresses the
demo seed's stock-credentials card when both are set.

### P2.8 API reference — new endpoints

`reference/api.md` (226 lines) has no marketplace, content-pack or skills
entries:

| Endpoint | Gate |
| --- | --- |
| `GET`/`PUT /api/marketplace/settings` | `manage_marketplace` |
| `POST /api/marketplace/resolve` | `install_content_pack` |
| `POST /api/marketplace/install` | `install_content_pack` |
| `POST /api/content-packs/install` (multipart) | `install_content_pack` |
| `GET /api/me/skills` | auth-only (route shape is the authorization) |

The marketplace routes 404 when the marketplace is disabled; `/api/me/skills`
404s when `skills_enabled` is off. Both behaviours should be stated, since a
404 on a permitted route otherwise reads as a bug.

### P2.9 ADR index three records behind

`dev/adrs.md` stops at **0037**. Missing:

- **0038** — boot-time baseline import (see P2.7)
- **0039** — cross-competition skills web, *including its amendment* dropping
  the admin matrix (the amendment is the part that makes the shipped feature
  self-view-only, so indexing 0039 without it would mislead)
- **0040** — module SDK and marketplace; the keystone for everything in P2.1–P2.5,
  and it refines ADR-0002

### P2.10 Security page — one improvement, one new egress path

`deploy/security.md` needs two edits at v1.7.0, pulling in opposite
directions:

- **Add the hardening win**: Docker challenge instances now isolate TCP peers
  automatically (v1.7.0, GHSA-vgrr), with HTTP peer isolation an honest
  documented residual. The page's existing "since vX.Y.Z" idiom fits directly,
  and the "Documented residual gaps" section is where the HTTP caveat belongs.
- **Add the new outbound path**: the marketplace registry client is a **new
  category of egress** — operator-triggered, to an operator-configured host.
  The project's standing claim is that outbound calls are only SMTP/webhooks,
  identity providers, the AI provider when enabled, and one daily version
  check. That list is now incomplete. `deploy/upgrades.md:78` ("exactly one
  outbound request") stays accurate as written, since it scopes itself to the
  update check — but whichever page carries the global egress inventory needs
  the registry added. The platform deferred its own `PRIVACY.md` egress note
  to #389, which has now shipped, so the upstream wording should be checked
  for the same gap.

Also worth a line: the GHSA-r7j2 F5 fix (`e754474`) corrected frozen-scoreboard
totals to net out multiple-choice wrong-guess penalties. No documented
behaviour changes — the frozen board now matches what `guides/scoreboard.md`
already describes — so this needs no guide edit, only an advisory mention if
the page enumerates fixes per release.

### P2.11 apex — hold until the tag, then flip

`apex/src/components/Roadmap.astro` lists "Module SDK, importing &
marketplace" with no `variant: "done"` and no `shippedIn`. **This is currently
correct** and should not be touched before the tag — the component's
convention is that a card flips only when a release ships it.

At v1.7.0: set `variant: "done"`, `shippedIn: "v1.7.0"`, and rewrite the body,
which today promises "a marketplace with verified publishers". Verified
publishers and signing shipped; the open registry and the code tiers did not
all land, so the body needs to describe what actually ships rather than the
original pitch. A `Features.astro` entry and a `Comparison.astro` row are
likely warranted — the CTFd comparison currently concedes ecosystem outright
(`start/flagpost-vs-ctfd.md:57`), and that row is the one most changed by this
release.

---

## Suggested sequencing

1. **Now, while the platform is quiet:** P1.1 (events — fixes released-version
   drift), then P1.2 (stand up `marketplace.flagpost.io`, since it gates the
   release).
2. **Queued on a branch, merged at tag:** P1.3 first and reviewed hardest (the
   security-relevant one), then P2.1 → P2.11 as the release sync.
3. **At tag:** the two conventional commits this repo already uses — `docs:
   sync to v1.7.0 — …` and `apex: reflect v1.7.0 — …`.

## Scan notes

- Platform `main` verified against the GitHub API, not only the local clone,
  to rule out a stale or proxy-cached fetch. Both agree on `0500285`.
- The permission and event findings are programmatic diffs of
  `backend/auth/permissions.py` and `backend/utils/event_catalog.py` against
  the rendered docs tables, not eyeballed: 50 vs 48 permissions (2 missing, 0
  stale, 0 mismatched) and 100 vs 95 events (5 missing, 0 stale).
- `docs.flagpost.io` remains "built, awaiting Worker + domain" per the root
  README — pre-existing, unrelated to this scan, but it does mean none of the
  docs drift above is publicly visible yet.
- No code or documentation was changed by this run; this report is the only
  artifact.
