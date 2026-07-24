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
- **The audio cue** — the *only* sound in the platform: a new ticket cues
  staff; a reply cues whichever side didn't just post. Everything else is
  visual-only via the bell.

Ticket events (`ticket.created`, `.assigned`, `.resolved`,
`.message_posted`) are all [automation triggers](/guides/automations/) — a
webhook rule can mirror the queue into your team chat.

## Announcements

Staff with `announcement_create` publish announcements that land as a live
banner for everyone in the competition, and emit `announcement.published`.
Announcements can also be posted by the `create_announcement` automation
action — hint-wave notices and first-blood celebrations without a human
typing.

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
- **Staff ticket notes** — the internal notes pad on each ticket.

## Notifications

The bell in the top bar collects in-app notifications (ticket activity,
automation `notify` actions) with per-user read state, delivered live over a
per-user WebSocket room.

Each user can tune delivery under **Profile → Notification preferences**:
mute the ticket or automation categories entirely, and toggle two delivery
hints — browser (OS) notifications and the ticket sound. Email is not a
per-user channel; it exists as the
[`send_email` automation action](/guides/automations/) driven by rules.
