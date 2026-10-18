---
title: Support & communication
description: Support tickets with a live staff queue, announcements, presence indicators, collaborative notes, and the notification bell.
---

Flagpost is built to replace the Discord back-channel: tickets, announcements,
presence, and team notes all live in the platform, next to the competition
they belong to.

## Support tickets

Competitors open tickets (optionally linked to a challenge) and reply in a
live thread; staff work a real-time queue.

- **For competitors** — create a ticket, watch the thread update live, reply.
  You see your own tickets only.
- **For staff** (`ticket_view`, `ticket_respond`, `ticket_assign`) — a live
  queue with assignment and resolution, plus **internal notes** on each
  ticket: a private, collaboratively-edited pad visible only to staff holding
  `ticket_view_internal_notes` — never to the ticket's opener.
- **Attachments** — screenshots attach to ticket messages (up to 5 per
  ticket, 2.5 MB each). Uploads are content-sniffed as images — the declared
  filename is never trusted — and served sandboxed, because ticket content
  is competitor-controlled input. Attachment activity emits
  `ticket.attachment_added` / `.attachment_deleted`.
- **The audio cue** — the *only* sound in the platform: a new ticket cues
  staff; a reply cues whichever side didn't just post. Everything else is
  visual-only via the bell.

Ticket events (`ticket.created`, `.assigned`, `.resolved`,
`.message_posted`) are all [automation triggers](/guides/automations/) — a
webhook rule can mirror the queue into your team chat.

### Questions and clarifications

Since **v1.8.0** a competitor can **Ask the judges** privately from a
[programming problem](/guides/programming/)'s page. The question arrives as a
ticket tagged **Question** — one message, answered with **Send answer** or a
quick answer (*No comment*, *Read the problem statement*); the asker follows up
by asking again, and the question is marked answered when a judge replies.

When an answer helps everyone, tick **Also send to everyone as a
clarification** (it needs `ticket_assign` and `announcement_create`; the
checkbox works on any ticket about a challenge). Edit *The question, as
everyone will see it* to strip anything that identifies the asker, then
**Send to everyone**: it's published as an announcement of kind
`clarification` — with no record of who asked — and listed on the challenge.
Staff can also **Post a clarification** straight from a challenge and
**Withdraw** one later; it stays listed, marked withdrawn, with its answer
removed everywhere.

## Announcements

Staff with `announcement_create` publish announcements that land as a live
banner and emit `announcement.published`. Announcements can also be posted
by the `create_announcement` automation action — hint-wave notices and
first-blood celebrations without a human typing.

- **Severity** — `info`, `warning`, or `critical`. Severity drives the
  banner's visual treatment, and `critical` is the one sanctioned override
  of a user's announcement mute: it always produces a bell notification,
  because the operator is saying something the competition can't afford to
  miss (browser/sound delivery stays opt-in regardless).
- **Audience** — the whole competition, or a targeted set of teams or
  users. Targeting is privacy-correct by construction: recipients outside
  the audience never receive the broadcast *and* never see the announcement
  in their list, while posting staff see their full sent history.
- **The banner auto-dismisses** after a short dwell, so every announcement
  also lands as a bell notification per recipient — looking away doesn't
  mean missing it.

### Scheduled announcements

Since **v1.6.0**, an organiser with `announcement_create` can pre-write a post
and give it a **future publish time** instead of sending it now.

- **It stays hidden until it fires** — a scheduled post is a staff-only draft:
  invisible to competitors and unnotified, absent from the live feed (and from
  the reconnect snapshot) whether or not it has fired. When its time arrives it
  auto-publishes exactly like an immediate post — the same banner, the same bell
  notification, the same audience.
- **Manage the pending ones** — scheduled drafts have their own list where you
  can **edit** or **cancel** them before they fire. Editing changes the text,
  severity, or timing; it does **not** change the audience — to retarget, cancel
  the draft and repost it. A cancelled draft never reaches a competitor.
- **A past or empty time posts immediately** — scheduling is opt-in; leave the
  time blank (or set one already in the past) and the announcement goes out at
  once, as before.
- **Release is scheduler-driven** — a released draft publishes on the platform
  scheduler's tick (roughly every 60 seconds), so it lands **within about a
  minute** of the set time, not to the second.

## Presence

Shared resources show who's looking: "N others viewing" on a challenge, "a
judge is looking at this ticket" on a thread. Presence is ephemeral WebSocket
state with a short grace period so a brief reconnect doesn't flicker the
list.

## Collaborative notes

Two surfaces use true CRDT (Y.js) co-editing — everyone types at once,
conflict-free, with changes syncing live:

- **Team scratchpad** — every challenge gives the team a shared notes pad,
  strictly scoped to that team. It's the team's own thinking space; other
  teams (and the platform) never surface it anywhere else.
- **Personal scratchpad** — a competitor with no team (individual-mode
  play) gets the same per-challenge pad, private to them alone. It keeps
  the CRDT transport so a solo player's own tabs and devices stay in sync.
- **Staff ticket notes** — the internal notes pad on each ticket.

## Notifications

The bell in the top bar collects in-app notifications (ticket activity,
automation `notify` actions) with per-user read state, delivered live over a
per-user WebSocket room.

Each user can tune delivery under **Profile → Notifications**
(`/profile?tab=notifications`):
mute the ticket, automation, or announcement categories entirely
(`critical` announcements override the announcement mute — see above), and
toggle two delivery hints — browser (OS) notifications and the ticket
sound. Email is not a per-user channel; it exists as the
[`send_email` automation action](/guides/automations/) driven by rules.
