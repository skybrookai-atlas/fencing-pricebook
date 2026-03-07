/**
 * Colour detection (spec §12)
 * Tier 1: named Colorbond colours. Tier 2: generic colour fallback.
 * Free text, normalised to Title Case.
 */

// Tier 1 — named Colorbond/brand colours
const COLORBOND_COLOURS = [
  'Monument', 'Woodland Grey', 'Surfmist', 'Dune', 'Basalt',
  'Ironstone', 'Pale Eucalypt', 'Manor Red', 'Night Sky', 'Paperbark',
  'Jasper', 'Cove', 'Terrain',
]

// Tier 2 — generic colours (only if no Tier 1 match)
const GENERIC_COLOURS = [
  'Sky Blue', 'Forest Green', 'Slate Grey', 'Gun Metal',
  'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple',
  'Pink', 'Brown', 'Gold', 'Silver', 'Grey', 'Black', 'White',
]

export function detectColour(description: string): string | null {
  const upper = description.toUpperCase()

  for (const colour of COLORBOND_COLOURS) {
    if (upper.includes(colour.toUpperCase())) {
      return colour
    }
  }

  for (const colour of GENERIC_COLOURS) {
    if (upper.includes(colour.toUpperCase())) {
      return colour
    }
  }

  return null
}
