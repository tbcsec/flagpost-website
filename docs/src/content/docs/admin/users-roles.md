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

Accounts can also arrive via **[external identity](/admin/sso/)** — OIDC,
OAuth2, SAML, or LDAP. On first contact the identity links to an existing local
account only when its email claim is trusted (a verified email from an
open provider, or the admin's *email is authoritative* opt-in on a closed
directory); otherwise a user is created just-in-time holding **no role** —
Participant, like every role, is earned per-competition on join. However a
user signed up, RBAC alone decides what they can do.

Self-service account management, from **/profile** and the login screen:

- **Password reset** (needs [SMTP](/admin/site-settings/#operational-settings)):
  the request endpoint never discloses whether an account exists, reset
  tokens are stored hashed and expire after an hour, and a successful reset
  revokes every active session. Since v1.8.0 reset and verification links are
  tied to the address they were sent to, so changing an account's email
  cancels any still outstanding.
- **Email add / change / clear** — users manage their own address; if
  [email verification](/admin/site-settings/#registration) is enabled, a
  changed address must be re-verified (emits `user.email_verified`).
- **Username change** — since the username is the primary login handle
  ([ADR-0015](https://github.com/tbcsec/flagpost/blob/main/docs/adr/0015-username-primary-optional-email.md)),
  a self-service change asks for the current password and is **rate-limited
  with a 30-day cooldown** (a fixing of case — `alice` → `Alice` — is
  allowed). Sessions are **not** revoked: identity keys on the immutable
  user id, so a rename invalidates nothing and login simply follows the new
  handle. Emits `user.renamed`.
- **Profile picture** — a self-service avatar upload (see the
  [directory](#the-user-directory-admin--users) for the hardening and admin
  removal).
- **Personal API tokens** — self-minted, `flp_`-prefixed tokens for
  programmatic access; see the [API reference](/reference/api/#personal-api-tokens).
  Administrators holding `manage_api_tokens` can list **every** token on the
  install and revoke any of them — an oversight grant for killing leaked
  credentials, deliberately not an issuance one (minting is self-only by
  construction, so no permission can create a token for someone else).

## The user directory (Admin → Users)

- **Browse and search** the directory (`view_all_users`).
- **Create and edit** accounts, including setting passwords
  (`manage_users`) — the workflow for closed-registration installs. An email
  address a full Administrator sets — on create, CSV import or edit — counts
  as **verified**, since you're vouching for it; one set by a delegate holding
  `manage_users` but not the whole Administrator role stays unverified.
  Changing an address cancels links sent to the old one; changing only its
  capitalisation changes nothing.
- **Ban / unban** — a soft ban: the account stays (with its history), but
  live tokens stop working immediately, login is refused, and active
  sessions are revoked. Unban restores access.
- **Rename** — an admin can change any user's username; the rename stamps
  the same 30-day cooldown (so a moderation rename can't immediately be
  reverted by the user) while bypassing the check itself.
- **Remove a profile picture** — moderation for an inappropriate avatar,
  under the existing `manage_users` grant (no separate permission).
- **Delete** — permanent removal.

Two guards protect every install: you cannot ban or delete **yourself**, or
the **last active Administrator**.

All of it is evented (`user.created`, `.updated`, `.banned`, `.unbanned`,
`.deleted`, `.renamed`, `.avatar_updated`, `.avatar_removed`) into the
[audit log](/admin/audit-log/) — `actor_user_id` distinguishes a
self-service change from an admin action.

Avatars are hardened at upload: they're **magic-byte sniffed** (PNG / JPEG /
WebP only — never SVG or GIF), bounded by a byte cap and a pixel budget,
then **re-encoded server-side to a 256 px square WebP** with EXIF (including
GPS) stripped — the stored image is never the uploaded bytes. The public
read is under an unguessable id with defensive headers.

### Mass CSV import

Since **v1.4.0**, **Admin → Users → Import CSV** (`manage_users`)
bulk-creates a roster — up to **200 accounts per import** (5 MB file cap;
split larger rosters into batches), with a downloadable template.

- **Columns**: `display_name` (`name` accepted as a CTFd-style alias) and
  `password` required; `email`, `role`, `competition` optional. Header
  order doesn't matter, the file is BOM-tolerant, and unknown columns are
  ignored but reported.
- **Preview, then atomic commit** — every import dry-runs first, showing
  each row as create / skip / error (with role warnings), writing
  nothing; the commit is all-or-nothing, so there are no half-imported
  rosters.
- **Create-only and non-destructive** — an existing account
  (case-insensitive name or email match) is a skip, never an update, so
  re-running a corrected file is safe.
- **Roles and competitions resolve by name** (a default-competition
  selector covers roster-into-one-event imports; unknown or ambiguous
  names are row errors). Role grants are bounded exactly like single-user
  assignment: a role the importer couldn't grant by hand still creates
  the account but skips the role, with a per-row warning — never
  silently, never beyond the importer's own permissions.
- **One summary event** — the import emits `users.imported` (created /
  skipped / roles-assigned counts) rather than flooding `user.created`
  per row, though each role grant still emits its own `role.assigned`
  for the audit trail.

## Roles

Roles are data — rows holding a list of permission keys from the
[permission catalogue](/reference/permissions/) — not code.

### The three built-in roles

| Role | Scope | Summary |
| --- | --- | --- |
| **Administrator** | Global | Every permission; manages users, roles, and all competitions |
| **Judge** | Per competition | Full operational control inside an assigned competition — challenges, scoring, tickets, announcements, analytics, automations, instances, code judging |
| **Participant** | Per competition | Competitor-facing: view challenges, submit flags and code, own tickets, answer surveys |

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
- You can't grant — or take away — permissions you don't hold yourself.

## Delegating administration

You don't have to make everyone an Administrator. Custom **global** roles can
carry just the grants a job needs, and since v1.8.0 the rules are:

- **The Admin section opens per page.** Each Admin page appears for the global
  grant that governs it — the audit log for `view_audit_log`, custom pages for
  `manage_pages`, the token panel for `manage_api_tokens`, and so on — and
  offers only the actions the viewer holds. Competition-scoped grants never
  open it.
- **Account management is contained.** A delegate with `manage_users` can
  edit, reset, ban, delete or remove the picture of only those accounts holding
  no permission the delegate lacks (the ordinary Participant permissions
  aside). A help desk looks after players in any competition, but not Judges
  or Administrators. Acting on your own account is unaffected.
- **Some things need the full Administrator permission set:** changing the
  [mail server settings](/admin/site-settings/#operational-settings) or From
  address, exporting user accounts and importing an audit log in a
  [backup](/admin/backup/#who-can-move-which-section), and vouching for an
  email address.
- **Seeing every competition.** A site-wide role sees every competition,
  private ones included, only if it carries at least one competition-scope
  permission. One holding only global permissions sees public competitions
  and its own, like anyone else.

Treat `manage_users`, `manage_roles` and `manage_auth_providers` as
administrator-level grants all the same, and start people on the narrowest
role that covers their job.
