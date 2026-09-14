# The shell

The part of WonderPlay that isn't any one game: the theme (see [`theme/README.md`](./theme/README.md)),
the backdrop it paints, and the sidebar every screen lives inside. A game only ever adds to this -
it never owns the backdrop or the sidebar itself, so a new game gets a consistent look for free and
a change made here (a new theme, a redesigned sidebar) reaches every game without touching them.

## `GameShell`

Every route - the landing page and every game - mounts its screen inside one `<GameShell>`:

```tsx
<GameShell>
  <PuzzlerGame />
</GameShell>
```

`GameShell` renders the themed backdrop, the sidebar, and a slot that fills the rest of the window
with whatever it's given. `App.tsx` wraps the whole app in one `ThemeProvider` above the router, so
the look picked on the landing page carries into whichever game is opened next, and survives
navigating back out.

## Adding to the sidebar

A game contributes buttons to the sidebar with `useSidebarAction`, called from any component
rendered inside its `GameShell` - it doesn't matter how deep. The button appears for as long as
that component stays mounted, and its own screen doesn't need to know anything about the sidebar's
layout:

```tsx
import { useSidebarAction } from '../../../shell'

useSidebarAction({ id: 'puzzler-hint', label: 'Hint', pressed: hint, onClick: onToggleHint })
```

Pass `null` instead of an action to withdraw a button without unmounting the component that owns
it (an action that only makes sense on some screens of a game, say). Actions appear in the order
they were first registered; updating one (e.g. `pressed` flipping) doesn't reorder it.

The sidebar itself always shows a way home and the theme picker - a game can't remove either.

## Adding a game

1. Build the game in its own folder under `Games/` (e.g. `Games/MemoryMatch/src/...`) - same shape
   as `Games/Puzzler/src/`: a top-level component plus whatever `components/`, `lib/`, `state/` it
   needs. It's plain source, not a separate npm package - there's one `package.json` and one
   `node_modules` for the whole repo, at the root.
2. Add an entry to `GAMES` in `src/games/registry.ts` (id, name, tagline, icon, URL path, and an
   import of the game's top-level component). `App.tsx` and the landing page both read from that
   list, so this is the only wiring a new game needs.
