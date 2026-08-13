---
title: Staff dashboard
description: The per-competition dashboard of live widgets — and the drag-and-resize grid layout staff can rearrange, persisted per user.
---

Each competition opens onto a dashboard of **live widgets**. What you see
depends on who you are: staff get the manager view — competition stats,
recent activity, announcements, challenge health, and the support queue —
while participants get their own standing and solves. Everything updates
live over the same [WebSocket layer](/dev/architecture/#the-real-time-layer)
as the rest of the app.

## Rearranging it

Staff holding `customize_dashboard` (Judge and Administrator by default)
get an **edit mode**. Since **v1.4.0** it's a fluid **12-column grid**:

- **Drag to move, grab a corner to resize** — snapped to whole cells,
  with each widget keeping a sensible minimum size.
- **Keyboard controls** per widget (move / resize / hide) as an
  accessible fallback.
- **Show/hide** per widget, with explicit **Save / Cancel / Reset to
  default**.

Layouts persist **per user** — your arrangement is yours, not the
competition's. On mobile the grid stacks to a single column.

:::note[Upgrading from before v1.4.0]
Layouts saved before v1.4.0 can't be mapped onto the new 2D grid — they
reset to the default arrangement once, and your next save sticks.
:::

The widget set itself is fixed by the platform (the related
`manage_dashboard_widgets` grant is reserved for a future
widget-catalogue surface and enforced nowhere today); see the
[permissions reference](/reference/permissions/).
