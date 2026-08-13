---
title: AI assistants
description: An optional, off-by-default module adding an organiser assistant and a guard-railed competitor assistant — bring your own OpenAI-compatible endpoint, transcripts reviewable.
---

Since **v1.4.0**, Flagpost ships an optional **AI assistants** module: an
**organiser assistant** for operational questions over a competition, and
a **guard-railed competitor assistant** organisers can offer as a
controlled hint channel. Nothing runs anywhere until an administrator
configures a provider and flips the **site-wide master switch** (off by
default). Once it's on, the organiser assistant is live in competitions
that haven't toggled the module off (per-competition module toggles
default enabled, like every optional module) — while the competitor
assistant stays **off per competition** until explicitly enabled. The
design is recorded in
[ADR-0023](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0023-ai-assistant-provider-and-execution-model.md).

## Bring your own model

Flagpost ships **no model, no API key, and no vendor SDK**. You point it
at any **OpenAI-compatible** chat-completions endpoint
(`POST {base_url}/chat/completions`): OpenAI, Azure OpenAI, OpenRouter,
Anthropic's compatibility endpoint — or a **self-hosted** server like
Ollama, vLLM, LM Studio, or LiteLLM, in which case **nothing leaves your
infrastructure**. The one hard requirement: the model must support **tool
calling**, because that's how the assistants read competition data.

## Provider setup

Configuration lives at **Admin → Settings → AI**, gated on the dedicated
global permission `manage_ai` — separate from `manage_site_settings`,
because this surface holds an API key and enables outbound calls to an
operator-chosen endpoint.

| Field | Meaning |
| --- | --- |
| **Base URL** | The endpoint's API root; deliberately exempt from the [webhook SSRF blocklist](/deploy/security/) — it's operator-configured, never competitor-controlled, and a loopback/private inference server is the intended self-hosted setup |
| **Model** | The model name your endpoint serves |
| **API key** | Write-only, **encrypted at rest** ([ADR-0020](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0020-secret-storage-encrypt-vs-hash.md)), excluded from [platform exports](/admin/backup/); may be blank for keyless local endpoints |
| **Max output tokens** | Server-enforced reply caps (defaults 1024 organiser / 512 competitor) |
| **Request timeout** | Default 60 s, with a whole-turn wall-clock deadline on top |
| **Admin prompt override** | Optional **replacement** for the organiser assistant's shipped system prompt — setting it discards the default operating instructions entirely, so start from the shipped text if you only want to add to it |

Enabling is **refused until the base URL and model are set** — "enabled
but unconfigured" is unreachable. A **Test connection** button probes the
saved config with two separately-reported checks: a trivial completion,
and a **forced tool call** — so you learn *before* an event whether the
model can tool-call at all.

## The organiser assistant

A docked chat for staff — anyone holding at least one staff permission in
the competition (analytics, ticket assignment, feedback, or
announcements) — that answers operational questions in plain language:
standings, ticket load, which challenges are hurting. It reads through
**seven read-only tools**: competition overview, scoreboard, per-challenge
stats, ticket search and detail, feedback summaries, and announcements.
Answers stream live.

Every tool call **executes as the asking user under their own RBAC
permissions** — no service account. The assistant can never fetch what
that user couldn't read themselves, and it can mutate nothing.

## The competitor assistant

A separate, opt-in channel competitors can ask for help — **off by
default**, enabled per competition under **Competition Settings →
Assistant** (gated `edit_competition`; the tab only appears while the AI
module is enabled for that competition), and available only **while the
competition is running**.

- **Guidance level** — `platform only` (the default: how-do-I-use-the-site
  help), `conceptual` (nudge with ideas, never steps), or `guided`
  (walkthrough-style coaching). A competition inherits the site-level
  default and may override it. This is a behavioural prompt control — the
  *data* guarantees below hold at every level.
- **Challenge metadata access** — a separate hard toggle (default off)
  deciding whether the challenge list/detail tools exist at all.
- **Structural guarantees** — competitor tools serialize through the same
  competitor-facing schemas the UI uses, so **flags, flag hashes, correct
  multiple-choice options, hidden hints, and unpublished challenges are
  structurally unreachable** — there is no field for them. The scoreboard
  tool respects a [freeze](/guides/scoreboard/) like every other read.
- **Belt and braces** — competitor replies are buffered (never
  token-streamed), stripped of any leaked tool-call JSON, and scanned to
  **redact flag-shaped strings** before delivery.
- **Disclosure** — before first use, each competitor accepts a one-time
  disclosure: messages go to the operator-configured model endpoint, and
  transcripts are staff-reviewable. Acceptance is enforced server-side and
  recorded (emits `ai.disclosure_accepted`).

## Oversight

Every competitor conversation is reviewable on the per-competition **AI
transcripts** page, gated on the new competition-scoped permission
`ai_view_transcripts` — held by Judge by default, and deliberately its own
grant: transcripts are competitor content of a different sensitivity than
analytics. A usage endpoint totals input/output tokens per competition,
and every exchange emits `ai.query` (token counts and tool names — **never
message content**) to the [event catalogue](/reference/events/) and
[audit log](/admin/audit-log/).

## Guard rails

Per-user message rates (60/hour organiser, 20/hour competitor), one
in-flight generation per user, a 20-exchange cap per conversation (then
the thread closes and a fresh one starts), at most 6 tool rounds per turn,
server-enforced output caps, and request plus whole-turn timeouts.

## What data leaves the install

Nothing, until an administrator configures a provider and enables the
module. After that: the content of assistant conversations (and the
competition data the tools read into context) goes to **the endpoint you
configured** — and only there. Point it at a local model and nothing
leaves the box. The platform's
[PRIVACY.md](https://github.com/tbcsec/flagpost/blob/main/PRIVACY.md)
carries the full statement. There are **no new environment variables** —
all AI configuration lives in the database.
