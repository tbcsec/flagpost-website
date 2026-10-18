---
title: Programming challenges
description: Author ICPC-style programming problems judged by running competitors' code — test cases, limits, reference checks, problem packages, the Judging page, rejudges and clarifications.
---

Since **v1.8.0** a challenge can be a **programming problem**: instead of a
flag, competitors submit a program that reads standard input and prints the
answer, and the built-in **code judge** runs it against your test cases under
time and memory limits. Programming problems sit on the **same scoreboard**
as flag challenges — an accepted program scores exactly like a solved flag,
so dynamic scoring, first blood, the freeze and the skills web all just work.

:::note[Before you start]
An administrator sets the judge up once — see [Code judge](/deploy/code-judge/).
After that, the competition's **Code Judge** module (on by default, under
**Settings → Modules**) is all an organiser needs. Authoring uses the normal
challenge permissions (`challenge_create` / `challenge_edit`).
:::

## Authoring a problem

1. On **Manage challenges**, create a challenge and choose the type
   **Programming (solved by submitting code)**. Write the statement in the
   description and **Create challenge**.
2. The **Test cases** section appears. **Add test case** — *Type or paste* an
   input and its expected output, or *Upload files* for large data. Tick
   **Show to competitors as an example** on the ones that illustrate the
   problem, and keep at least one hidden, or a program could just print the
   answers.
3. Run a **reference check** (below), then publish. A programming problem
   can't be published without a test case.

The defaults are sensible, so most problems need nothing else. **Advanced**
holds the per-problem overrides:

- **Time, memory and output limits** — blank uses the site default (2 s,
  256 MB and 8 MB unless your administrator changed them).
- **How output is checked** — *Ignore extra spaces and blank lines* (the
  default), *Must match exactly*, or *Numbers may differ slightly* for
  floating-point answers.
- **Ignore upper/lower case** — off by default.
- **Languages** — restrict which of the site's languages this problem accepts.

The time limit competitors see is **per language**: the administrator sets a
multiplier for each, so Python gets proportionally longer than C++.

Test data is capped at 10,000 cases, 16 MB a file and 64 MB a problem.

### Check with a reference solution

Paste a solution you know is right and run it against **every** test —
examples and hidden — through the real judge. It reports each test, never
scores, never blocks publishing, and is marked out of date when you change the
tests or limits afterwards. Make it a habit: it catches a wrong expected output
or a too-tight limit before competitors do.

## What competitors see

Programming problems carry a **Code** badge on the board and open on their own
page: the statement beside its examples, the limits for the chosen language,
and any attached files. Competitors **Upload a file** (the default) or
**Write code** in the browser, then **Run examples** (never scored) or
**Submit** to be judged on every test. Source files are limited to 128 KB, and
each competitor or team can have three submissions waiting at once.

Verdicts arrive live:

| Verdict | Meaning |
| --- | --- |
| **Accepted** | Passed every test — scores like a solved flag. |
| **Wrong answer** | The output didn't match on some test. |
| **Time / Memory / Output limit exceeded** | The program used more than the limit allows. |
| **Runtime error** | It crashed or exited with an error. |
| **Compilation error** | It didn't compile; the compiler's messages are shown. |
| **Couldn't be judged** | A problem on the platform's side — retried automatically, never scored. |

A failing example shows its input, the expected output and the program's; a
failing **hidden** test is named only by its number. An accepted solve is
credited at the moment the code was **submitted**, so waiting in the queue
never costs anyone first blood or a freeze cutoff.

## The Judging page

Staff with `judging_view` (a Judge holds it) get **Judging** in the sidebar
once the competition has a programming problem: the queue, every submission
with its per-test results, compiler messages, **Submitted code** and
**History**. Filter by **Problem** and **Result**, and tick **Include example
runs** to see competitors' unscored trial runs.

With `judging_rejudge` (a Judge holds that too):

- **Rejudge** one submission, or pick a problem and **Rejudge this problem…** —
  *Every submission*, *Only accepted submissions* (to check a fix broke
  nothing) or *Only submissions that weren't accepted* (after fixing a wrong
  test). Verdicts a judge set by hand are left alone.
- **Override verdict…** with a **Reason (shown to staff)**. It takes effect
  immediately and is recorded with your name in the audit log.

**The newest verdict counts.** Points, the scoreboard and the activity feed
follow it: a revoked solve takes its points back (emitting
`challenge.solve_revoked`), and a late acceptance scores from the original
submission time. Automation actions that already ran on the original solve —
a sent webhook or email — aren't undone. Competitors see *Rejudged* or
*Judge's decision* on the entry, never the reason.

## Clarifications

Clarifications are part of core support, so they work whether or not a
problem is programming:

- On a programming problem, a competitor can **Ask the judges**. The question
  lands in [Support](/guides/support/) tagged **Question** — one message; to
  follow up, they ask again. Answer with **Send answer** or a quick answer
  (*No comment*, *Read the problem statement*).
- If the answer helps everyone, tick **Also send to everyone as a
  clarification**, edit *The question, as everyone will see it* to strip
  anything that gives away who asked, and **Send to everyone**. It's published
  as an announcement with no record of who asked, listed on the problem under
  *Clarifications from the judges*, and delivered as a notification. This
  needs `ticket_assign` and `announcement_create`; the same checkbox works on
  any ticket about a challenge.
- **Post a clarification** straight from any challenge, with no question
  behind it, and **Withdraw** one later — it stays listed, marked withdrawn,
  with its answer removed everywhere.

## Problem packages

Programming problems import and export in the open **ICPC problem package
format**, so public problem sets are usable as they are.

- **Import problem package…** on Manage challenges takes one problem or a
  contest zip and creates each problem as a **draft**, with a list of things to
  check. Flagpost imports what it can judge faithfully — pass/fail problems with
  the standard output check — and **refuses the rest with the reason** (custom
  checkers, interactive or scored problems). Statements are converted from
  Markdown or LaTeX as well as they can be, with the original attached. Most
  packages don't state a time limit, so the dialog asks for one, and the
  package's accepted solution is pre-filled into the reference check so you can
  confirm it in one click.
- **Export problem packages** writes every problem back out in the same
  format; a single problem's **Export package** sits in its Test cases section.

Programming problems and their test data also travel with
[competition clones and platform backups](/guides/import-export/). The ctfcli
challenge export skips them, since that format can't represent them.
