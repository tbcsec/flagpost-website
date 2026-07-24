---
title: Users & roles
description: The user directory, bans and lifecycle, username-first identity, and the data-driven role editor with custom roles and per-competition assignment.
---

## Identity: username first, email optional

The **username is the primary identifier** — required and case-insensitively
unique. **Email is optional** (unique when present). Login accepts either.
This keeps sign-up frictionless and lets accounts exist without an email;
role assignment still works for email-less accounts because Admin → Roles
resolves people by username or email.

Self-service **password reset** is available from the login screen when
[SMTP is configured](/admin/site-settings/#operational-settings): the request
endpoint never discloses whether an account exists, reset tokens are stored
hashed and expire after an hour, and a successful reset revokes every active
session.

## The user directory (Admin → Users)

- **Browse and search** the directory (`view_all_users`).
- **Create and edit** accounts, including setting passwords
  (`manage_users`) — the workflow for closed-registration installs.
- **Ban / unban** — a soft ban: the account stays (with its history), but
  live tokens stop working immediately, login is refused, and active
  sessions are revoked. Unban restores access.
- **Delete** — permanent removal.

Two guards protect every install: you cannot ban or delete **yourself**, or
the **last active Administrator**.

All of it is evented (`user.created`, `.updated`, `.banned`, `.unbanned`,
`.deleted`) into the [audit log](/admin/audit-log/).

## Roles

Roles are data — rows holding a list of permission keys from the
[permission catalogue](/reference/permissions/) — not code.

### The three built-in roles

| Role | Scope | Summary |
| --- | --- | --- |
| **Administrator** | Global | Every permission; manages users, roles, and all competitions |
| **Judge** | Per competition | Full operational control inside an assigned competition — challenges, scoring, tickets, announcements, analytics, automations |
| **Participant** | Per competition | Competitor-facing: view challenges, submit flags, own tickets, answer surveys |

System roles are **read-only**: they can't be edited or deleted, so "a Judge
can run their competition" stays a safe assumption. They also **re-sync from
the permission catalogue on every startup**, so permissions added by an
upgrade reach existing installs automatically.

### Custom roles

Create roles from scratch or **clone** any existing role, then check
permissions off the categorized matrix. Typical examples: a *Challenge
Author* (challenge permissions only), a *Read-only Observer*, or a *Judge
who can't override scores*. Competition-scoped role editors only offer
competition-scoped permissions — a global permission can't be granted
through a per-competition role.

### Assignment

Assignments bind a user to a role either **globally** (global-scoped roles
like Administrator) or **within one competition** — the same account can be
a Judge in one event and a Participant in another.

Operational invariants the platform enforces:

- An assignment's scope must match its role's scope.
- A role still assigned to anyone can't be deleted — unassign first.
- The **last Administrator can never be unassigned** (or banned/deleted), so
  an install can't lock itself out.
