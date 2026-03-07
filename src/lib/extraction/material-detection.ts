/**
 * Material detection (spec §12 — DB-driven)
 * Reads material aliases from the materials table — never hardcoded.
 * Phase 5 — to be fully implemented.
 */

import type { Material } from '@/lib/types'

export interface MaterialResult {
  material: string | null
  material_uncertain: boolean
}

/**
 * Detect material from description using DB-loaded material list.
 * Priority order defined by materials.sort_order.
 */
export function detectMaterial(
  description: string,
  materials: Material[],
  supplierPrimaryMaterial?: string | null
): MaterialResult {
  const upper = description.toUpperCase()

  // Sort by sort_order ascending (lower = higher priority)
  const sorted = [...materials].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))

  for (const mat of sorted) {
    if (mat.name === 'NA') continue
    for (const alias of mat.aliases) {
      if (upper.includes(alias.toUpperCase())) {
        return { material: mat.name, material_uncertain: false }
      }
    }
  }

  // Supplier-level fallback
  if (supplierPrimaryMaterial) {
    return { material: supplierPrimaryMaterial, material_uncertain: false }
  }

  return { material: 'NA', material_uncertain: true }
}
