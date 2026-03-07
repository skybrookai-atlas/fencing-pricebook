/**
 * Product key generation (spec §8)
 * Deterministic fingerprint: CATEGORY|MATERIAL|FINISH|LENGTH_MM|WIDTH_MM|HEIGHT_MM|DIAMETER_MM|THICKNESS_MM
 * Never includes price, supplier, SKU, or colour.
 */

export interface ProductKeyInput {
  category: string | null
  material: string | null
  finish: string | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
}

export function buildProductKey(input: ProductKeyInput): string {
  const parts = [
    input.category ?? '',
    input.material ?? '',
    input.finish ?? '',
    input.length_mm?.toString() ?? '',
    input.width_mm?.toString() ?? '',
    input.height_mm?.toString() ?? '',
    input.diameter_mm?.toString() ?? '',
    input.thickness_mm?.toString() ?? '',
  ]
  return parts.join('|').toUpperCase()
}
