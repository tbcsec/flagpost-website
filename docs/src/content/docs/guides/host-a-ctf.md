---
title: How to host a CTF competition
description: Plan, build, and run a capture-the-flag event end to end — format, infrastructure, challenge authoring, staffing, automations, game-day operations, and the retro.
---

This is the end-to-end playbook for hosting a CTF competition on Flagpost —
from the first format decision to the post-event retro. Each step links to
the deep-dive page for that area; read this once to see the whole shape,
then work through the pieces.

## 1. Decide the format

The choices that shape everything downstream:

- **Team or individual?** A per-competition setting — decide before
  registration opens, it isn't switchable mid-event. Teams need a size cap
  policy; see [Teams & participants](/guides/teams/).
- **Open or invite-only?** Public with self-serve join, public with an
  invite code, or fully private. An
  [email-domain allowlist](/admin/site-settings/#registration) suits
  university events.
- **Divisions?** Parallel rankings (Open / Student / …) come free via
  [brackets](/guides/teams/#divisions-brackets) — decide the names up
  front.
- **Scoring model.** Static points are predictable; **dynamic decay**
  self-balances difficulty at scale. Mixable per challenge —
  [Challenges](/guides/challenges/#scoring).
- **Rules.** Author your [rules / code of conduct](/admin/site-settings/#rules--code-of-conduct)
  early; the join gate records who accepted, when.

## 2. Stand up the platform

`docker compose up` gives you the full stack locally
([Quick start](/start/quick-start/)); a real event wants a domain, TLS and
real credentials ([Production deployment](/deploy/production/)) — pin a
[release image](/deploy/upgrades/) rather than building from source. Run
the [setup wizard](/admin/setup/), set
[branding](/admin/site-settings/#appearance), configure SMTP, and connect
[SSO](/admin/sso/) if your org has an IdP.

Size the box for your head count and **rehearse with load in mind** — the
platform is a single backend process by design, so scale up, not out.

## 3. Author and test the challenges

- Bulk-import an existing **ctfcli** repo
  ([Import & export](/guides/import-export/)) or author in the UI.
- Use the model: categories, tags and difficulty tiers for navigation;
  [prerequisite chains and scheduled release](/guides/challenges/#gating-what-competitors-see)
  for pacing; multiple-choice guess caps where brute force is trivial.
- **Rehearse every flag** in a scratch competition — regex flags
  especially. Attach files and download them the way a competitor would.
- Set hint costs deliberately: free hints released on a timer beat
  expensive hints nobody buys.

## 4. Staff it

Assign [Judges](/admin/users-roles/) per competition; craft custom roles if
the built-ins don't fit (a *Challenge Author* who can't touch scoring, a
read-only observer). Judges get the
[operational dashboard](/guides/feedback/#challenge--team-analytics),
the live [ticket queue](/guides/support/), and the
[submissions browser](/guides/feedback/#challenge--team-analytics) for
disputes.

## 5. Automate the event

Write the [When → If → Then rules](/guides/automations/) before the event,
not during: first-blood announcements, timed hint waves, a T-60
"open the survey" trigger, freeze-on-end, and a webhook into your staff
chat for new tickets. Every rule you write is a checklist item your staff
doesn't carry on game day.

## 6. Open registration early

Open sign-ups days ahead so teams form, divisions get assigned, and SSO or
[email verification](/admin/site-settings/#registration) quirks surface
before the clock starts. Publish the
[public scoreboard and CTFtime feed](/guides/scoreboard/) opt-ins if the
event is spectated or rated.

## 7. Game day

- The schedule runs itself: `competition.started` fires, challenges release
  in their waves, automations do the announcing.
- Staff live in the dashboard and ticket queue; presence shows who's
  looking at what.
- **Pause** halts submissions if something breaks;
  **[freeze](/guides/scoreboard/#freezing-the-board)** hides the endgame
  drama while competitors keep scoring — know the difference before you
  need either.
- Watch [analytics](/guides/feedback/#challenge--team-analytics) for a
  challenge with high fails and rising tickets — that's your broken
  challenge alarm.

## 8. Afterwards

The [survey](/guides/feedback/) you scheduled at T-60 is already
collecting; post-solve ratings tell you which challenges landed. Export
results and analytics for the retro, [archive](/guides/competitions/#lifecycle-operations)
the competition (retention policy permitting), and
[clone](/guides/competitions/#lifecycle-operations) it as the starting
point for next year — the second run is always easier.

---

Running your first event and unsure about scale, format, or anything else?
Ask in [GitHub Discussions](https://github.com/tbcsec/flagpost/discussions)
— organiser experience reports directly shape the roadmap.
