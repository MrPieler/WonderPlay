# The theme module

Lets a child change how any WonderPlay game looks, on the fly: a **world** (race cars, unicorns, dinosaurs…)
painted in a **colour** (any of ten). Every world works in every colour, so there are 180 looks.
The pick is instant, survives a reload, and never disturbs a puzzle in progress.

## How it fits together

| File                | What it owns                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- |
| `colors.ts`         | The ten colour families and the recipe that turns one hue into every colour the app uses |
| `themes.ts`         | The worlds: name, card icon, scenery, and the colour each looks best in           |
| `preference.ts`     | The current pick, remembering it, and the rules for changing it (including "Surprise me!") |
| `apply.ts`          | Writing the pick onto `<html>` as `--pz-*` custom properties                        |
| `ThemeProvider.tsx` | Holds the pick, applies it, saves it                                                |
| `ThemedBackdrop.tsx`| The world behind the app: colour wash, a shared horizon, and that world's hand-composed illustration |
| `ThemePicker.tsx`   | The 🎨 button and the picking sheet                                                 |

A swap is only a rewrite of the `--pz-*` properties on `<html>`. Nothing remounts, so a half-solved
board keeps every piece exactly where it was — [`ThemePicker.test.tsx`](./ThemePicker.test.tsx) and
the browser check both cover that.

## Using the colours

Screens never name a colour. They use the token utilities that [`theme.css`](./theme.css) maps to the custom
properties — `bg-pz-surface`, `text-pz-ink`, `ring-pz-ring`, `bg-pz-accent` + `text-pz-accent-ink`,
`bg-pz-tray`, `bg-pz-board`, `bg-pz-overlay` and so on. Anything hard-coded (a `bg-sky-100`) stops
following the theme, which is the one rule worth guarding.

The recipe pins the perceptual lightness of each role and lets only the hue travel, which is why
text stays readable in all ten colours. `colors.test.ts` asserts those gaps, so a new colour that
would be unreadable fails the suite rather than shipping.

## Adding a world

A world is two things: an entry in `THEMES` (`themes.ts`) and a hand-composed illustration keyed
to its id in `THEME_ILLUSTRATIONS` (`ThemedBackdrop.tsx`).

```ts
{
  id: 'volcano',
  name: 'Volcano Island',
  icon: '🌋',
  scenery: 'peaks',      // one of SCENERY_KINDS — the shared horizon this world sits on
  defaultColor: 'fire',  // a COLOR_FAMILIES id
}
```

`scenery` picks the shared horizon (several worlds can share one — `princess` and `dragons` both
sit on `peaks`); the illustration is what makes them read as different places. Compose it as fixed,
deliberate shapes — no seeded scatter, no emoji — built from `soft` / `ring` / `glow` (the same
`var(--pz-accent-soft)` / `--pz-ring` / `--pz-bg-glow` tokens the shared scenery uses) so it
recolours with everything else. Keep decoration off the centre, where the puzzle and its title
live, and reach for the small `Sparkles` helper for twinkling points of light. A theme with no
`THEME_ILLUSTRATIONS` entry still renders — just its bare shared horizon, no illustration layer —
so a world can land before its scene is drawn.

For a new kind of horizon, add a `SceneryKind` and its drawing to `SCENERY` in `ThemedBackdrop.tsx`,
painted the same way, and add it to `STRETCHED` (`true` for a horizon that should span the window,
`false` for round things like stars and sweets, which must not stretch into ovals).

A few motion primitives are shared across illustrations, all defined once in `ThemedBackdrop.tsx`'s
`<style>` block: `pz-twinkle` (a point of light fading in and out — reach for `Sparkles`),
`pz-flutter` (a flag or wing, or anything else caught in a breeze), `pz-flicker` (fire), `pz-bob`
(something floating — smoke, bubbles), and `pz-spin` (something turning — a gear, a lollipop). Put
the animation on an inner element with no `transform` attribute of its own, inside a static
positioning `<g>` — an SVG element can't carry both a presentation `transform` attribute and a
CSS-animated `transform` at once; the CSS one silently wins and the position is lost.

## Adding a colour

Append to `COLOR_FAMILIES` in `colors.ts` with a hue (OKLCH degrees), a `chroma` dial and a scheme.
Use `accentLightness` only when a hue needs to be light to be itself — a sunshine yellow does — and
the label on the accent flips to dark ink automatically.
