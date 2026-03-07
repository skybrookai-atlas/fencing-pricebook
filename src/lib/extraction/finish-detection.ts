/**
 * Finish detection (spec §12)
 * Free text, normalised to Title Case. Not an enum — stored as-is.
 */

const FINISH_PATTERNS: Array<{ keywords: string[]; value: string }> = [
  { keywords: ['GAL', 'GALV', 'GALVANISED', 'GALVANIZED', 'HDG', 'ZINCALUME', 'ZINC'], value: 'Galvanised' },
  { keywords: ['PTD', 'POWDERCOAT', 'P.COAT', 'POWDER COAT', 'POWDER COATED'], value: 'Powder Coat' },
  { keywords: ['ANODISED', 'ANODIZED'], value: 'Anodised' },
  { keywords: ['RAW', 'MILL', 'MILL FINISH'], value: 'Raw/Mill' },
]

export function detectFinish(description: string): string | null {
  const upper = description.toUpperCase()
  for (const { keywords, value } of FINISH_PATTERNS) {
    if (keywords.some(kw => upper.includes(kw))) {
      return value
    }
  }
  return null
}
