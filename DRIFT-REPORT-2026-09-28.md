# Schema / information drift report — 2026-09-28

**Scope:** `tbcsec/flagpost` @ `0500285` (main) vs `tbcsec/flagpost-website` @ `6df09c2` (main)
**Run:** scheduled drift check, window 2026-09-21 → 2026-09-28

---

## Headline

**No drift against the released platform.** The website is an exact, complete
mirror of **v1.6.0**, the current release. I found no released feature that is
missing, mis-described, or version-mislabelled on either site.

**There is no commit activity in the 7-day window.** The newest commit on
`flagpost/main` is `0500285` (2026-09-06) — 22 days old. The literal
"commits from the last 7 days" set is empty.

What does exist is a **large body of unreleased work staged on `main`** that the
site correctly does *not* document yet, plus **two genuine findings** that are
worth acting on independently of any release.

---

## 1. Release / milestone state

| Fact | Value |
|---|---|
| Latest tag | **v1.6.0** (2026-08-31) |
| `main` version | `1.6.0-src` (`backend/config.py:117`) |
| Open milestone | **v1.7.0** (milestone #7), opened 2026-09-02 |
| Milestone progress | **15 closed / 18 open** |
| Commits on `main` since v1.6.0 | **14** (134 files, +9,350 / −325) |
| Website last synced | 2026-08-31, at v1.6.0 (`9a14144`, `6df09c2`) |

Note: the repo has **no local git tags** — `v1.6.0` is a GitHub release, and
`SOURCE_BUILD_VERSION` is the in-tree marker. The release commit is `17aa7fe`.

### Verified parity at v1.6.0

I checked the mirrored reference surfaces row-by-row rather than trusting the
sync commit message:

- `reference/permissions.md` — **48 table rows**; `backend/auth/permissions.py`
  at v1.6.0 has **48** `Permission(...)` entries. Exact match.
- `reference/events.md` — **all 98** event names in the v1.6.0
  `utils/event_catalog.py` are present. (A naive row count reads 97 and appears
  to be missing the three `automation.rule_*` lifecycle events; they are in fact
  documented, collapsed into a single grouped row at line 288 under "Emitted and
  audited, but never offered as automation triggers". No gap.)
- Every v1.6.0 feature carries a correct version marker on the site: score-over-time
  chart (`guides/scoreboard.md:31`, "v1.6.0"), custom brand themes
  (`admin/site-settings.md:61-72`, "Since v1.6.0"), scheduled announcements
  (`guides/support.md:54`), custom registration fields (`guides/teams.md`),
  gated Prometheus `/metrics` (`deploy/configuration.md:41`,
  `deploy/observability.md`), challenge instances (`deploy/challenge-instances.md`).

The v1.6.0 sync was meticulous. Nothing to fix there.

---

## 2. Findings worth acting on now

These are **not** version drift — they apply to v1.6.0, the version operators are
running today. I have not changed anything; both touch published security
guidance and are your call.

### 2.1 — Docker peer-isolation guidance is incomplete (security guidance gap)

**Where:** `docs/src/content/docs/deploy/challenge-instances.md:122-141`
("Egress control (do this for a real event)")

**What the page says.** It correctly warns that a normal bridge lets instances
reach "the internet, your control plane, **and each other** by default", then
tells the operator to "close that down with host firewall rules — this is not
optional for a public event", followed by three bullets:

1. Drop *forwarded* traffic out of the `flagpost-instances` subnet (DOCKER-USER chain)
2. Block the cloud metadata IP
3. Keep the control plane unreachable from the instance subnet

**The problem.** All three bullets are **egress/forwarding** rules. None of them
closes **container-to-container traffic on the same bridge**. Same-bridge peer
traffic is *bridged*, not forwarded through the `DOCKER-USER` `FORWARD` path the
page points at — closing it needs `--icc=false` on the daemon, or bridge-netfilter
/ ebtables rules, neither of which is mentioned.

So an operator who follows this page **exactly** still has full peer-to-peer
reachability between challenge instances, while the page's framing ("close that
down", "this is not optional") implies they have closed it. On a pwn-heavy event
that is precisely the lateral-movement path a competitor with code execution in
their own container would take.

**Why this matters now.** This is the exact exposure that upstream filed and
fixed as **GHSA-vgrr** — but the fix (`1d33620`, per-instance
`flagpost-net-<instance_id>` bridges) landed on `main` on 2026-09-04, i.e.
**after** v1.6.0. Every operator on v1.6.0 has the flat shared bridge and is
relying on this page for mitigation.

**Recommended fix (v1.6.0-accurate, ship independently of v1.7.0):** add a fourth
bullet, or a `:::caution`, stating plainly that the three egress rules do *not*
isolate instances from each other, and give the actual v1.6.0 mitigation —
`--icc=false` in `/etc/docker/daemon.json`, or a sacrificial challenge host.
Note that per-instance bridge isolation arrives in the next release.

### 2.2 — "Documented residual gaps" omits every challenge-instance residual

**Where:** `docs/src/content/docs/deploy/security.md:154-161`

The section lists exactly two residuals, both webhook-related (the
resolve-then-connect TOCTOU window, and destination-level rate limiting). It
frames the project as recording "what it *hasn't* closed yet rather than implying
completeness".

But `docs/THREAT_MODEL.md` **at the v1.6.0 tag** already carried five further
operator-owned residuals that the site never surfaces:

- a non-enforcing CNI ⇒ no Kubernetes isolation at all (detected, not prevented)
- `k8s_cluster_cidr` unset in allow mode ⇒ peers/control plane reachable by IP
- Kubernetes PID/fd exhaustion (fork bomb) ⇒ needs a kubelet `--pod-max-pids`
- the socket proxy cannot inspect payloads ⇒ rests on the sacrificial-host recommendation
- container breakout 0-day ⇒ mitigated, not eliminated

Given the section's own stated promise, listing only the webhook pair
under-represents the real residual surface — and the first three are things an
operator must *act* on, not just be aware of. Recommend importing the
THREAT_MODEL residual list (or linking it prominently) on that page.

### 2.3 — Advisories section doesn't name the two open GHSAs

**Where:** `docs/src/content/docs/deploy/security.md:183-199`

The section covers "v1.2.0 shipped four" advisories plus the v1.6.0 internal
hardening pass, but names neither **GHSA-vgrr** (Docker instance peer lateral
movement) nor **GHSA-r7j2** (frozen-scoreboard scoring). Both affect ≤ v1.6.0.

*Caveat — verify before acting:* I could not confirm from the repo whether these
two advisories are **published** on the GitHub advisories feed or still private.
If they are public, the page should name them with affected ranges. If they are
still embargoed pending the v1.7.0 release, leave as-is — and 2.1 above becomes
more important, since the page is then the operator's only warning.

*Secondary note:* commit bodies for `1d33620` / `e754474` reference sibling PRs
`#371` (k8s DNS-scope + resource/port validation) and `#372` (WS freeze/gate
leaks) as already shipped, but neither appears as a commit on `main` under those
numbers. Worth a sanity check that those fixes actually landed.

---

## 3. Pending drift — staged for the v1.7.0 release

None of this should ship to the site before v1.7.0 tags. It is inventoried here
so the release-day sync is a checklist, not an archaeology exercise.

### 3.1 Module marketplace + SDK (epic #385, ADR-0040) — the flagship

Seven commits (`b35d61a`, `679af81`, `a5bd4d0`, `f20ad43`, `a0b2825`, `1e44abd`,
`0500285`). This is the single largest documentation job in the milestone and it
**reverses a claim the site currently makes in three places**.

**What shipped on main:**

- **Manifest v2, enforced at load** (`679af81`) — `plugin.yaml` now validates
  through a Pydantic model mirroring `docs/spec/module-manifest.schema.json`.
  New required/conditional fields: `kind`, `trust_tier`, `capabilities`,
  compat bounds. Unknown keys **fail closed**. `trust_tier: sandboxed` (Tier 3)
  is reserved and rejected. `manifest_version: 1` still validates leniently.
- **Tier 0 content-pack import** (`a5bd4d0`) — `POST /api/content-packs/install`
  (multipart). Installs packaged challenges into a competition, or brand themes
  site-wide, through the *existing* importers and their existing validation.
  Emits one `platform.content_pack_installed` event, not a per-row flood.
- **Trust verification core** (`f20ad43`) — sha256 digest + detached ed25519
  signature, evaluated against a four-level trust policy:
  `official` < `verified` < `signed` < `any`. Fails closed.
  New `MarketplaceSettings` singleton + migration: `enabled`, `registry_url`
  (default `marketplace.flagpost.io`, overridable for a mirror/air-gap),
  `trust_policy`, `max_trust_tier` (defaults to `declarative` — third-party
  *code* needs an explicit operator opt-in), operator-added trusted keys.
- **Resolve + install pipeline** (`a0b2825`) — `POST /api/marketplace/resolve`
  and `/install`. Code → resolve → fetch → **local re-verification** → apply.
  The registry's own trust claims are display hints only.
- **Admin UI** (`1e44abd`) — Admin → Marketplace: paste code → resolve → review
  (identity/publisher/tier/signature/capabilities) → install, plus registry and
  trust-policy settings.
- **Module SDK** (`0500285`) — `python -m sdk` with `keygen`/`build`/`sign`/
  `validate`/`init`. Produces the signed `.fpmod` artifacts the pipeline verifies.

**Why it needs documenting:** it introduces a new **outbound network call** (the
registry fetch) to a platform whose docs currently promise a tightly enumerated
egress list; a new **trust model** operators must configure correctly or be
exposed by; and a new **publishing workflow** for third-party authors who have no
other entry point.

**Where it belongs:**

| Content | Destination | Action |
|---|---|---|
| Installing packs, registry + trust policy, the admin flow | **new** `docs/admin/marketplace.md` | create |
| Build → sign → publish loop, operator trusted-key setup | **new** `docs/dev/module-sdk.md` (from `docs/MODULE_SDK.md`) | create |
| Manifest v2 fields, `kind`, `trust_tier`, capabilities, fail-closed rules | `docs/dev/modules.md` | major rewrite of "The manifest" |
| **"there is no marketplace or sandboxing — modules are trusted"** | `docs/dev/modules.md:118` | **retract / rewrite** |
| **"Third-party marketplace modules are not yet open"** | `docs/start/introduction.md:62-65` | **retract / rewrite** |
| "modules only, with a marketplace on the roadmap" | `docs/start/flagpost-vs-ctfd.md:57` | update comparison row |
| `install_content_pack`, `manage_marketplace` (48 → 50 rows) | `docs/reference/permissions.md` | add 2 rows + Marketplace category |
| `platform.content_pack_installed`, `platform.marketplace_settings_updated` (98 → 100) | `docs/reference/events.md` | add 2 events |
| New `/api/content-packs/*` + `/api/marketplace/*` routes | `docs/reference/api.md` | add |
| Registry fetch as a new egress destination | `docs/deploy/security.md` (outbound-calls list) | **must not be missed** |
| Roadmap card → shipped | `apex/src/components/Roadmap.astro:58-61` | set `variant: "done"`, `shippedIn: "v1.7.0"` |
| Feature + comparison rows | `apex/src/components/Features.astro`, `Comparison.astro` | add |
| Roadmap list item | `docs/src/content/docs/index.mdx:121-122` | mark shipped |

> **Scope caution for the writer:** Tier 1 (declarative, #388) and Tier 2 (signed
> code, #391) are **still open**. Only **Tier 0 content packs** are installable.
> The SDK *builds and validates* higher-tier artifacts but they cannot be
> installed. Document the shipped subset precisely — this is the easiest place in
> the whole milestone to over-promise.

### 3.2 Cross-competition skills web (#364, ADR-0039)

`41db7c4`. A new required-core `skills` module, gated site-wide by
`site_settings.skills_enabled` (defaults **on**, surfaced on the public
site-settings read). `GET /api/me/skills`, auth-only. Profile → Skills tab
(3rd tab): an inline-SVG radar (≥3 axes) plus a ranked breakdown.

Scoring: +1 per **distinct awarded solve**, keyed by normalized category name
(Python-folded for SQLite/Postgres parity). Credits the **submitting** user_id —
in team mode that is a documented submitter-only tradeoff worth stating plainly.

**Notable:** the admin users×skills matrix was **built and then removed** before
merge (owner decision on review). Do not document an admin view — it does not
exist. This is a purely self-scoped read.

**Why it needs documenting:** it is the platform's **first participant-facing
cross-competition consolidation read** — a deliberate, narrowly-scoped exception
to the "no cross-site rollups" rule the site's architecture page describes. It
also has a privacy dimension and an instance-wide off switch operators should
know about.

**Where:**
- **new** `docs/guides/skills.md` (participant-facing: what it is, how scoring works, the team-mode caveat)
- `docs/admin/site-settings.md` — the `skills_enabled` toggle
- `docs/reference/api.md` — `GET /api/me/skills`
- `docs/dev/architecture.md` — the sanctioned carve-out to the no-rollup rule
- A privacy surface — see 3.5

### 3.3 Internal demo baselines (#356 `9a35b40`, #357 `2d8e4ee`, #360 `27e6a3f`)

Three commits, ~200 lines of new upstream docs (`docs/INTERNAL_DEMO.md`), and
**entirely absent** from the website — which today documents only the *public*
demo mode.

- **Snapshot/restore** — `deploy/internal-demo/{snapshot,restore}.sh` plus a
  systemd service+timer (hourly default). Byte-level restore of the three data
  volumes, so SSO/SMTP/attachments survive a reset, unlike the public demo's
  wipe-and-reseed.
- **Boot-time baseline import** — `BOOTSTRAP_BACKUP_FILE` makes an *unconfigured*
  instance import a mounted platform export on startup, provisioning owner,
  branding, competitions and users declaratively instead of the first-run wizard.
  Gated on `instance_needs_setup`; serialized across workers with a Postgres
  advisory lock; a failed import **aborts startup** rather than booting empty.
- **Data-driven demo credentials** — `site_settings.demo_credentials` (JSON list,
  max 12) replaces the hardcoded login card. Exposed publicly **only** in demo
  mode. Rides the backup file **in plaintext**.

**Why it needs documenting:** this is a genuinely new deployment topology (an
org-internal demo that resets to *their* baseline) with real footguns — a
baseline directory containing the full DB plus JWT/encryption keys, and demo
credentials travelling in plaintext inside export files.

**Where:**
- **new** `docs/deploy/internal-demo.md` (from `docs/INTERNAL_DEMO.md`)
- `docs/deploy/configuration.md` — `BOOTSTRAP_BACKUP_FILE`
- `docs/admin/site-settings.md` — the demo-credentials editor
- `docs/admin/backup.md` — **plaintext demo credentials ride the export**
- `docs/deploy/security.md` — baseline dir holds secrets; guard like a DB dump

### 3.4 Server-painted branding (#362, `660be2a`)

Branding now resolves **server-side** in the root layout and paints into the
initial HTML, eliminating the default-brand flash on cold load. Introduces:

- **`INTERNAL_API_URL`** — a **new required compose variable** for the Next
  server's cold-start fetch (`http://backend:8000`). Set in prod/dev/demo compose
  upstream, but anyone running a **custom or hand-rolled deployment** must add it
  or branded instances regress to the flash. This is the item most likely to
  generate support noise if undocumented.
- A strictly-validated `fp_brand` cookie (an unauthenticated input to the server
  render; hardened against style-injection during review).

**Where:** `docs/deploy/configuration.md` (new var, prominent),
`docs/deploy/without-docker.md` (**critical** — hand-rolled deploys),
`docs/deploy/fargate.md`, `docs/admin/site-settings.md` (no-flash behaviour).

### 3.5 Challenge-instance peer isolation + privacy

- **`deploy/challenge-instances.md`** — replace the egress section wholesale at
  v1.7.0: per-instance `flagpost-net-<id>` bridges for TCP/`none`, and firewall
  guidance that now means pinning Docker's `default-address-pools` and blocking
  that **whole range**, not one subnet. (Until then, see finding 2.1.)
- **`deploy/security.md`** — new residual: **`exposure=http` instances still
  share the `flagpost-instances` bridge**, because the caddy-docker-proxy ingress
  must share a network to reach them. HTTP peers are *not* isolated. Kubernetes
  has no such gap.
- **Privacy** — `PRIVACY.md` gained a skills-web paragraph (the one place user
  data is aggregated across competitions; on-demand, nothing sent anywhere,
  self-only, instance-wide off switch). The website has **no privacy page** at
  all (only incidental mentions in `observability.md` and `guides/support.md`).
  Worth deciding whether to add one, given this plus the AI module's chat content
  and the marketplace's new egress.

---

## 4. Secondary: upstream inconsistencies in `tbcsec/flagpost`

Not website drift, but they will mislead whoever writes the v1.7.0 sync, and
`CLAUDE.md` explicitly asks to be kept honest.

1. **`docs/ROADMAP.md:3-5` is stale.** It still reads "the latest tag is
   **v1.5.1** … `main` is now `1.5.1-src`, accumulating the **v1.6.0**
   milestone." v1.6.0 shipped 2026-08-31 and `config.py` says `1.6.0-src`. The
   release commit `17aa7fe` updated the body (line 448+ correctly shows v1.6.0
   as Shipped) but missed the header. The website links users to this file.
2. **`.claude/CLAUDE.md` counts are stale.** Claims "**44** permissions" (actual
   on `main`: **50**) and "**24** modules" (actual: **26** dirs — `marketplace`
   and `skills` both added). The module list omits `marketplace` entirely.

---

## 5. Recommended sequencing

1. **Now, independent of release** — finding **2.1** (Docker peer isolation).
   It is a live gap in published security guidance for the version operators are
   running, and the fix is a short, self-contained edit.
2. **Now** — findings **2.2** / **2.3**, and confirm the GHSA publication state.
3. **Upstream, cheap** — the two §4 corrections.
4. **On v1.7.0 tag** — work §3 in order: marketplace/SDK (largest, and the one
   with retractions), then skills, internal demo, branding config, instances.

---

*Generated by the scheduled drift check. No files in either repository were
modified other than the addition of this report.*
