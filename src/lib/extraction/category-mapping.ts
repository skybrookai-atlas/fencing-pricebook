/**
 * Category mapping (spec §12 — DB-driven, three-tier priority)
 * Tier 1: direct map from supplier category strings
 * Tier 2: keyword rules against description
 * Tier 3: fallback to 'Unclassified'
 * Phase 5 — keyword rules to be fully implemented.
 */

import type { Category } from '@/lib/types'

export function mapCategory(
  description: string,
  supplierCategory: string | null,
  categories: Category[]
): string {
  const validCategories = new Set(categories.map(c => c.name))

  // Tier 1 — direct map from supplier category header
  if (supplierCategory && validCategories.has(supplierCategory)) {
    return supplierCategory
  }

  // Tier 2 — keyword rules against description (Phase 5)
  // TODO: implement 30+ regex patterns

  // Tier 3 — fallback
  return 'Unclassified'
}
