/**
 * Purchase unit auto-detection (spec §12 — DB-driven)
 * Reads valid units from the purchase_units table — never hardcoded.
 */

import type { PurchaseUnit } from '@/lib/types'

const UNIT_KEYWORDS: Array<{ keywords: string[]; unit: string }> = [
  { keywords: ['SECTION'], unit: 'length' },
  { keywords: ['SHEET', 'PANEL', 'CLADDING'], unit: 'sheet' },
  { keywords: ['PACK', '/PK', 'PK '], unit: 'pack' },
  { keywords: ['BOX', '/BX', 'BX '], unit: 'box' },
  { keywords: ['BAG'], unit: 'bag' },
  { keywords: ['ROLL'], unit: 'roll' },
  { keywords: ['BUNDLE'], unit: 'bundle' },
  { keywords: ['KIT'], unit: 'kit' },
  { keywords: ['TUBE'], unit: 'tube' },
  { keywords: ['CAN'], unit: 'can' },
]

export function detectUnit(
  description: string,
  purchaseUnits: PurchaseUnit[]
): string {
  const upper = description.toUpperCase()
  const validUnits = new Set(purchaseUnits.map(u => u.name))

  // MESH special case
  if (upper.includes('MESH')) {
    const unit = upper.includes('ROLL') ? 'roll' : 'sheet'
    if (validUnits.has(unit)) return unit
  }

  for (const { keywords, unit } of UNIT_KEYWORDS) {
    if (keywords.some(kw => upper.includes(kw)) && validUnits.has(unit)) {
      return unit
    }
  }

  return 'ea'
}
