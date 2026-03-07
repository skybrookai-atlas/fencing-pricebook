/**
 * PATCH /api/import/[id]/row/[rowId]
 * Corrects a field on a needs_review import row.
 * Re-evaluates status, creates a learning rule, applies retroactively to matching rows.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function makeAuthClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* server component */ }
        },
      },
    }
  )
}

function makeServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

// Fields the owner can correct
const EDITABLE_FIELDS = new Set([
  'material', 'category', 'unit', 'quote_unit', 'finish', 'colour',
  'supplier_sku', 'width_mm', 'height_mm', 'length_mm', 'diameter_mm', 'thickness_mm',
])

// Fields that generate learning rules when corrected
const RULE_FIELDS = new Set(['material', 'category', 'unit', 'quote_unit'])

const STRUCTURAL_MATERIALS = new Set(['Hardwood', 'Treated_Pine', 'Timber', 'Steel', 'Aluminium'])
const SERVICE_CATEGORIES = new Set(['Services'])

type RowLike = {
  cost_price: number | null
  material_uncertain: boolean
  material: string | null
  category: string | null
  width_mm: number | null
  height_mm: number | null
  length_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
}

function evaluateStatus(row: RowLike): 'ready' | 'needs_review' {
  if (!row.cost_price || row.cost_price <= 0) return 'needs_review'
  if (row.material_uncertain) return 'needs_review'
  const isStructural = row.material != null && STRUCTURAL_MATERIALS.has(row.material)
  const isService = row.category != null && SERVICE_CATEGORIES.has(row.category)
  const missingDims = !row.width_mm && !row.height_mm && !row.length_mm && !row.diameter_mm
  if (isStructural && !isService && missingDims) return 'needs_review'
  return 'ready'
}

// Extract alphabetic tokens ≥3 chars as trigger terms for learning rules
function extractTriggerTerms(description: string): string[] {
  const stopwords = new Set(['THE', 'AND', 'FOR', 'PER', 'BOX', 'BAG', 'WITH'])
  const tokens = description.toUpperCase().match(/[A-Z]{3,}/g) ?? []
  return [...new Set(tokens.filter(t => !stopwords.has(t)))].slice(0, 4)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const { id, rowId } = await params
  const cookieStore = await cookies()
  const authClient = makeAuthClient(cookieStore)
  const db = makeServiceClient()

  // Auth + role check
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch the row to update
  const { data: existingRow } = await db
    .from('import_rows')
    .select('*')
    .eq('id', rowId)
    .eq('import_id', id)
    .single()

  if (!existingRow) return NextResponse.json({ error: 'Row not found' }, { status: 404 })
  if (existingRow.row_status === 'promoted') {
    return NextResponse.json({ error: 'Cannot edit a promoted row' }, { status: 409 })
  }

  // Parse body — accept only known editable fields
  const body = await request.json()
  const update: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(body)) {
    if (EDITABLE_FIELDS.has(field)) update[field] = value
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Correcting material always clears the uncertain flag
  if ('material' in update) update.material_uncertain = false

  // Re-evaluate row status against the merged data
  const mergedRow = { ...existingRow, ...update } as RowLike
  update.row_status = evaluateStatus(mergedRow)

  // Persist the update
  const { data: updatedRow, error: updateError } = await db
    .from('import_rows')
    .update(update)
    .eq('id', rowId)
    .select()
    .single()

  if (updateError || !updatedRow) {
    return NextResponse.json({ error: updateError?.message ?? 'Update failed' }, { status: 500 })
  }

  // Fetch supplier_id for rule scoping
  const { data: importSession } = await db
    .from('imports')
    .select('supplier_id')
    .eq('id', id)
    .single()
  const supplierId = importSession?.supplier_id ?? 'global'

  const triggerTerms = extractTriggerTerms(existingRow.description ?? '')
  const autoPromotedIds: string[] = []

  // Create learning rules and apply retroactively for canonical field corrections
  for (const [field, value] of Object.entries(update)) {
    if (!RULE_FIELDS.has(field) || value == null || value === '') continue

    await db.from('mapping_rules').insert({
      scope: supplierId,
      trigger_terms: triggerTerms,
      field,
      output_value: String(value),
      priority: 100,
      source: 'user_approved',
    })

    // Retroactive rule application — material corrections only (primary needs_review cause)
    // Applies to rows with material_uncertain=true whose description shares trigger terms
    if (field !== 'material' || !triggerTerms.length) continue

    const { data: reviewRows } = await db
      .from('import_rows')
      .select('id, description, cost_price, material, material_uncertain, category, width_mm, height_mm, length_mm, diameter_mm, thickness_mm')
      .eq('import_id', id)
      .eq('row_status', 'needs_review')
      .eq('material_uncertain', true)
      .neq('id', rowId)

    for (const reviewRow of reviewRows ?? []) {
      const upper = (reviewRow.description ?? '').toUpperCase()
      const matches = triggerTerms.every(term => upper.includes(term))
      if (!matches) continue

      const rowUpdate: Record<string, unknown> = { material: value, material_uncertain: false }
      const retroRow = { ...reviewRow, ...rowUpdate } as RowLike
      const retroStatus = evaluateStatus(retroRow)
      rowUpdate.row_status = retroStatus

      await db.from('import_rows').update(rowUpdate).eq('id', reviewRow.id)
      if (retroStatus === 'ready') autoPromotedIds.push(reviewRow.id as string)
    }
  }

  // Recalculate import counts
  const [{ count: readyCount }, { count: reviewCount }] = await Promise.all([
    db.from('import_rows').select('*', { count: 'exact', head: true }).eq('import_id', id).eq('row_status', 'ready'),
    db.from('import_rows').select('*', { count: 'exact', head: true }).eq('import_id', id).eq('row_status', 'needs_review'),
  ])

  await db.from('imports').update({
    ready_count: readyCount ?? 0,
    needs_review_count: reviewCount ?? 0,
    status: 'reviewing',
  }).eq('id', id)

  return NextResponse.json({
    row: updatedRow,
    autoPromotedIds,
    importCounts: { ready: readyCount ?? 0, needs_review: reviewCount ?? 0 },
  })
}
