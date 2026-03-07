/**
 * Product naming convention (spec §14)
 * Three rules generate a clean, consistent canonical product name.
 */

import type { CanonicalProduct } from '@/lib/types'

const SECTION_CATEGORIES = new Set([
  'Posts', 'Rails', 'Frames', 'Angles', 'RHS_SHS_Tube',
  'Flat_Bar', 'Channel', 'Gate_Frames', 'Structural',
])

const SHEET_CATEGORIES = new Set([
  'Glass_Panels', 'Sheet_Cladding', 'Mesh', 'Fence_Panels',
])

/**
 * Rule 1 — SECTION items: posts, rails, tubes, structural profiles
 * Format: {Material} {ProfileType} {WxH}[xT] {L}m {Finish}
 */
function nameSection(p: Partial<CanonicalProduct>): string {
  const parts: string[] = []
  if (p.material && p.material !== 'NA') parts.push(p.material.replace('_', ' '))
  if (p.category) parts.push(p.category.replace('_', ' '))

  const dims: string[] = []
  if (p.width_mm != null && p.height_mm != null) {
    dims.push(`${p.width_mm}x${p.height_mm}`)
    if (p.thickness_mm != null) dims.push(`x${p.thickness_mm}`)
  } else if (p.diameter_mm != null) {
    dims.push(`DN${p.diameter_mm}`)
  }
  if (dims.length) parts.push(dims.join(''))

  if (p.length_mm != null) parts.push(`${(p.length_mm / 1000).toFixed(1)}m`)
  if (p.finish) parts.push(p.finish)

  return parts.join(' ')
}

/**
 * Rule 2 — SHEET / PANEL / GLASS items
 * Format: {Material} {LxW} {T}mm {Finish/Colour}
 */
function nameSheet(p: Partial<CanonicalProduct>): string {
  const parts: string[] = []
  if (p.material && p.material !== 'NA') parts.push(p.material.replace('_', ' '))
  if (p.length_mm != null && p.width_mm != null) parts.push(`${p.length_mm}x${p.width_mm}`)
  if (p.thickness_mm != null) parts.push(`${p.thickness_mm}mm`)
  if (p.finish) parts.push(p.finish)
  else if (p.colour) parts.push(p.colour)

  return parts.join(' ')
}

/**
 * Rule 3 — Everything else
 * Falls back to first 100 chars of raw description.
 */
function nameGeneric(description: string): string {
  return description.slice(0, 100).trim()
}

export function buildProductName(
  p: Partial<CanonicalProduct> & { description: string }
): string {
  if (p.category && SECTION_CATEGORIES.has(p.category)) return nameSection(p)
  if (p.category && SHEET_CATEGORIES.has(p.category)) return nameSheet(p)
  return nameGeneric(p.description)
}
