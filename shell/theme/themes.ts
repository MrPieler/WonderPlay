/**
 * The themes a kid can pick. A theme is the *world* (what floats past, what the horizon looks
 * like); a colour family is the paint. They're deliberately independent, so unicorns can be
 * midnight blue and race cars can be bubblegum pink.
 */

import { DEFAULT_COLOR_ID } from './colors'

/** Each scenery kind has a matching renderer in ThemedBackdrop. */
export const SCENERY_KINDS = ['road', 'peaks', 'clouds', 'hills', 'stars', 'waves', 'city', 'dots', 'snow'] as const
export type SceneryKind = (typeof SCENERY_KINDS)[number]

export interface Theme {
  id: string
  /** Kid-facing name, shown on the picker card. */
  name: string
  /** The big emoji on the picker card. */
  icon: string
  scenery: SceneryKind
  /** The colour this theme looks best in — used the first time it's picked. */
  defaultColor: string
}

export const THEMES: Theme[] = [
  {
    id: 'cars',
    name: 'Race Cars',
    icon: '🏎️',
    scenery: 'road',
    defaultColor: 'fire',
  },
  {
    id: 'princess',
    name: 'Princess Castle',
    icon: '👑',
    scenery: 'peaks',
    defaultColor: 'bubblegum',
  },
  {
    id: 'unicorns',
    name: 'Unicorns',
    icon: '🦄',
    scenery: 'clouds',
    defaultColor: 'grape',
  },
  {
    id: 'dinos',
    name: 'Dinosaurs',
    icon: '🦕',
    scenery: 'hills',
    defaultColor: 'grass',
  },
  {
    id: 'space',
    name: 'Outer Space',
    icon: '🚀',
    scenery: 'stars',
    defaultColor: 'midnight',
  },
  {
    id: 'ocean',
    name: 'Under the Sea',
    icon: '🐠',
    scenery: 'waves',
    defaultColor: 'mint',
  },
  {
    id: 'pirates',
    name: 'Pirates',
    icon: '🏴‍☠️',
    scenery: 'waves',
    defaultColor: 'sandy',
  },
  {
    id: 'jungle',
    name: 'Jungle Safari',
    icon: '🐒',
    scenery: 'hills',
    defaultColor: 'grass',
  },
  {
    id: 'robots',
    name: 'Robots',
    icon: '🤖',
    scenery: 'city',
    defaultColor: 'sky',
  },
  {
    id: 'candy',
    name: 'Candy Land',
    icon: '🍭',
    scenery: 'dots',
    defaultColor: 'bubblegum',
  },
  {
    id: 'dragons',
    name: 'Dragons',
    icon: '🐉',
    scenery: 'peaks',
    defaultColor: 'fire',
  },
  {
    id: 'superheroes',
    name: 'Super Heroes',
    icon: '🦸',
    scenery: 'city',
    defaultColor: 'sky',
  },
  {
    id: 'farm',
    name: 'Farm Friends',
    icon: '🚜',
    scenery: 'hills',
    defaultColor: 'sunshine',
  },
  {
    id: 'sports',
    name: 'Sports Day',
    icon: '⚽',
    scenery: 'hills',
    defaultColor: 'grass',
  },
  {
    id: 'fairies',
    name: 'Fairy Garden',
    icon: '🧚',
    scenery: 'clouds',
    defaultColor: 'grape',
  },
  {
    id: 'pets',
    name: 'Puppies & Kittens',
    icon: '🐶',
    scenery: 'clouds',
    defaultColor: 'sunset',
  },
  {
    id: 'trains',
    name: 'Trains',
    icon: '🚂',
    scenery: 'road',
    defaultColor: 'sunset',
  },
  {
    id: 'winter',
    name: 'Winter Wonderland',
    icon: '⛄',
    scenery: 'snow',
    defaultColor: 'sky',
  },
]

export const DEFAULT_THEME_ID = 'unicorns'

export function findTheme(id: string): Theme | undefined {
  return THEMES.find((theme) => theme.id === id)
}

export { DEFAULT_COLOR_ID }
