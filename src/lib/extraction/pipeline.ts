/**
 * Import pipeline orchestrator (spec §10)
 * Steps: pre-clean → junk detection → learning rules → regex extraction
 *        → second-pass heuristic → AI fallback → confidence threshold
 */

import { preclean } from './pre-clean'
import { classifyRow } from './junk-detection'
import { detectMaterial } from './material-detection'
import { detectFinish } from './finish-detection'
import { detectColour } from './colour-detection'
import { detectUnit } from './unit-detection'
import { mapCategory } from './category-mapping'
import { buildProductKey } from './product-key'
import { buildProductName } from './product-naming'
import { extractPackQty } from './pack-qty'
import { extractDimensions } from './regex-extraction'
import type { Material, Category, PurchaseUnit, ImportRow } from '@/lib/types'

export interface RawRow {
  description: string
  supplier_sku?: string | null
  cost_price?: number | null
  unit?: string | null
  colour?: string | null
  [key: string]: unknown
}

export interface PipelineContext {
  materials: Material[]
  categories: Category[]
  purchaseUnits: PurchaseUnit[]
  supplierPrimaryMaterial?: string | null
  importId: string
  deliveryRowsSeen: Map<string, number>  // description → cost_price (for delivery dedup)
}

export interface ProcessedRow {
  row_status: ImportRow['row_status']
  description: string
  product: string | null
  material: string | null
  material_uncertain: boolean
  finish: string | null
  colour: string | null
  width_mm: number | null
  height_mm: number | null
  length_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
  inferred_dims: boolean
  unit: string | null
  quote_unit: string | null
  pack_qty: number | null
  cost_price: number | null
  supplier_sku: string | null
  category: string | null
  notes: string | null
  ai_confidence: number | null
  raw_data: Record<string, unknown>
  import_id: string
}

// Structural materials that require dimensions for Ready status
const STRUCTURAL_MATERIALS = new Set([
  'Hardwood', 'Treated_Pine', 'Timber', 'Steel', 'Aluminium',
])

// SERVICE categories exempt from dimension requirements
const SERVICE_CATEGORIES = new Set(['Services'])

export function processRow(raw: RawRow, ctx: PipelineContext): ProcessedRow {
  const base: ProcessedRow = {
    row_status: 'ignored',
    description: '',
    product: null,
    material: null,
    material_uncertain: false,
    finish: null,
    colour: null,
    width_mm: null as number | null,
    height_mm: null as number | null,
    length_mm: null as number | null,
    diameter_mm: null as number | null,
    thickness_mm: null as number | null,
    inferred_dims: false,
    unit: null,
    quote_unit: null as string | null,
    pack_qty: null,
    cost_price: raw.cost_price ?? null,
    supplier_sku: raw.supplier_sku ?? null,
    category: null,
    notes: null,
    ai_confidence: null,
    raw_data: raw as Record<string, unknown>,
    import_id: ctx.importId,
  }

  // Step 1 — pre-clean
  const cleaned = preclean(raw.description ?? '')
  base.description = raw.description ?? ''

  // Step 2 — junk / row classification
  const classification = classifyRow(cleaned)

  if (classification === 'JUNK' || classification === 'SECTION_HEADER') {
    base.row_status = 'ignored'
    return base
  }

  if (classification === 'DELIVERY') {
    // Keep most expensive delivery row per import, ignore rest
    const existing = ctx.deliveryRowsSeen.get('delivery')
    const cost = raw.cost_price ?? 0
    if (existing == null || cost > existing) {
      ctx.deliveryRowsSeen.set('delivery', cost)
      base.row_status = 'ready'
      base.category = 'Services'
      base.material = 'NA'
      base.unit = 'ea'
      return base
    } else {
      base.row_status = 'ignored'
      return base
    }
  }

  // Step 3 — learning rules (TODO: query mapping_rules table)

  // Step 4 — field extraction
  const { material, material_uncertain } = detectMaterial(
    cleaned, ctx.materials, ctx.supplierPrimaryMaterial
  )
  const finish = detectFinish(cleaned)
  const colour = raw.colour?.trim() || detectColour(cleaned)
  const unit = detectUnit(cleaned, ctx.purchaseUnits)
  const pack_qty = extractPackQty(cleaned)
  const category = mapCategory(cleaned, null, ctx.categories)
  const dims = extractDimensions(cleaned)

  base.material = material
  base.material_uncertain = material_uncertain
  base.finish = finish
  base.colour = colour
  base.unit = unit
  base.pack_qty = pack_qty
  base.category = category
  base.width_mm = dims.width_mm
  base.height_mm = dims.height_mm
  base.length_mm = dims.length_mm
  base.diameter_mm = dims.diameter_mm
  base.thickness_mm = dims.thickness_mm
  base.inferred_dims = dims.inferred_dims

  // Cost price required
  if (!raw.cost_price || raw.cost_price <= 0) {
    base.row_status = 'ignored'
    return base
  }

  // Determine row status
  // Needs Review: material uncertain, OR structural material missing dimensions
  const isStructural = material && STRUCTURAL_MATERIALS.has(material)
  const isService = category && SERVICE_CATEGORIES.has(category)
  const missingDims = !base.width_mm && !base.height_mm && !base.length_mm && !base.diameter_mm

  if (material_uncertain) {
    base.row_status = 'needs_review'
    return base
  }

  if (isStructural && !isService && missingDims) {
    base.row_status = 'needs_review'
    return base
  }

  // Build canonical product name + key
  const productData = {
    description: base.description,
    category: base.category,
    material: base.material,
    finish: base.finish,
    colour: base.colour,
    width_mm: base.width_mm,
    height_mm: base.height_mm,
    length_mm: base.length_mm,
    diameter_mm: base.diameter_mm,
    thickness_mm: base.thickness_mm,
  }

  base.product = buildProductName(productData)

  base.row_status = 'ready'
  return base
}

export function buildKey(row: ProcessedRow): string {
  return buildProductKey({
    category: row.category,
    material: row.material,
    finish: row.finish,
    length_mm: row.length_mm,
    width_mm: row.width_mm,
    height_mm: row.height_mm,
    diameter_mm: row.diameter_mm,
    thickness_mm: row.thickness_mm,
  })
}
