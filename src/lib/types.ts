// ============================================================
// Lookup table types (DB-driven — never hardcoded per spec §3)
// ============================================================

export interface Material {
  id: string
  name: string          // e.g. 'Treated_Pine', 'Steel', 'Aluminium'
  aliases: string[]     // e.g. ['H3', 'H4', 'CCA', 'TREATED']
  is_structural: boolean // drives Needs Review dimension logic
  sort_order: number | null
  created_at: string
}

export interface Category {
  id: string
  name: string          // e.g. 'Posts', 'Rails', 'Fasteners', 'Unclassified'
  description: string | null
  sort_order: number | null
  created_at: string
}

export interface PurchaseUnit {
  id: string
  name: string          // e.g. 'ea', 'length', 'sheet'
  label: string         // human display label
  sort_order: number | null
}

export interface QuoteUnit {
  id: string
  name: string          // e.g. 'ea', 'lm', 'm2', 'kg', 'hr', 'job'
  label: string
  sort_order: number | null
}

// ============================================================
// User & auth
// ============================================================

export type UserRole = 'owner' | 'employee'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
}

// ============================================================
// Canonical product schema (spec §7)
// ============================================================

export interface CanonicalProduct {
  id: string
  product_key: string         // CATEGORY|MATERIAL|FINISH|L|W|H|DIA|T
  description: string         // raw supplier text — never modified
  product: string | null      // canonical name per §14 naming rules
  category: string | null     // from categories.name
  material: string | null     // from materials.name
  finish: string | null       // free text, Title Case — NOT an enum
  colour: string | null       // free text, Title Case — NOT an enum
  width_mm: number | null
  length_mm: number | null
  height_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
  unit: string | null         // from purchase_units.name
  quote_unit: string | null   // from quote_units.name
  pack_qty: number | null
  notes: string | null
  last_updated: string
}

export interface Supplier {
  id: string
  name: string
  primary_material: string | null  // AI-detected fallback for NA items
  created_at: string
}

export interface SupplierItem {
  id: string
  product_id: string
  supplier_id: string
  supplier_sku: string | null
  cost_price: number
  supplier_unit_original: string | null  // raw unit string — audit trail
  last_updated: string
}

// ============================================================
// Import pipeline (spec §10–11)
// ============================================================

export type ImportStatus = 'pending' | 'reviewing' | 'complete'
export type ImportRowStatus = 'ready' | 'needs_review' | 'ignored' | 'promoted'

export interface Import {
  id: string
  supplier_id: string
  filename: string | null
  status: ImportStatus
  total_rows: number | null
  ready_count: number | null
  needs_review_count: number | null
  ignored_count: number | null
  imported_by: string
  created_at: string
}

export interface ImportRow {
  id: string
  import_id: string
  row_status: ImportRowStatus
  description: string | null
  product: string | null
  material: string | null
  material_uncertain: boolean
  finish: string | null       // free text, Title Case
  colour: string | null       // free text, Title Case
  width_mm: number | null
  length_mm: number | null
  height_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
  inferred_dims: boolean      // tagged by second-pass heuristic
  unit: string | null
  quote_unit: string | null
  pack_qty: number | null
  cost_price: number | null
  supplier_sku: string | null
  category: string | null
  notes: string | null
  ai_confidence: number | null
  raw_data: Record<string, unknown> | null
  created_at: string
}

// ============================================================
// Learning system (spec §13)
// ============================================================

export type RuleSource = 'user_approved' | 'ai_generated'

export interface MappingRule {
  id: string
  supplier_id: string | null  // NULL = global rule, UUID = supplier-specific
  trigger_terms: string[]
  field: string               // which canonical field this affects
  output_value: string
  priority: number            // lower = higher priority
  source: RuleSource
  created_at: string
}

// ============================================================
// Fence type calculators (spec §15)
// ============================================================

export interface FenceTypeMaterial {
  product_key: string
  qty_formula: string  // e.g. 'length / 2.4' — evaluated at BOM time
  notes: string | null
}

export interface FenceType {
  id: string
  name: string
  measurement_unit: string    // from quote_units.name, default 'lm'
  labour_rate_per_unit: number | null
  margin_percent: number      // default 42
  materials: FenceTypeMaterial[]
  created_at: string
}

// ============================================================
// Bill of Materials (spec §15)
// ============================================================

export interface BOMLineItem {
  product_key: string
  product_name: string | null
  description: string
  quantity: number
  unit: string | null
  cost_price: number
  line_total: number
}

export interface BOMSession {
  id: string
  fence_type_id: string | null
  job_description: string | null
  job_dimensions: Record<string, number> | null
  line_items: BOMLineItem[]
  total_cost: number | null
  created_by: string
  status: 'draft' | 'approved'
  created_at: string
}
