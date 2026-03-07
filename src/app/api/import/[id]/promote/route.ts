/**
 * POST /api/import/[id]/promote
 * Promotes all 'ready' import_rows to the products + supplier_items tables.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildProductKey } from '@/lib/extraction/product-key'
import { buildProductName } from '@/lib/extraction/product-naming'

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const authClient = makeAuthClient(cookieStore)
  const db = makeServiceClient()

  // Auth + role check
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify import exists and belongs to a valid session
  const { data: importSession } = await db
    .from('imports')
    .select('id, status, supplier_id, needs_review_count')
    .eq('id', id)
    .single()

  if (!importSession) return NextResponse.json({ error: 'Import not found' }, { status: 404 })
  if (importSession.status === 'complete') return NextResponse.json({ error: 'Already promoted' }, { status: 409 })
  if ((importSession.needs_review_count ?? 0) > 0) {
    return NextResponse.json({ error: 'Resolve all needs_review rows first' }, { status: 422 })
  }

  // Fetch all ready rows
  const { data: readyRows } = await db
    .from('import_rows')
    .select('*')
    .eq('import_id', id)
    .eq('row_status', 'ready')

  if (!readyRows || readyRows.length === 0) {
    return NextResponse.json({ error: 'No ready rows to promote' }, { status: 422 })
  }

  const now = new Date().toISOString()
  const promotedIds: string[] = []
  const skippedCount = { value: 0 }

  for (const row of readyRows) {
    if (!row.cost_price || row.cost_price <= 0) { skippedCount.value++; continue }

    const productKey = buildProductKey({
      category: row.category,
      material: row.material,
      finish: row.finish,
      length_mm: row.length_mm,
      width_mm: row.width_mm,
      height_mm: row.height_mm,
      diameter_mm: row.diameter_mm,
      thickness_mm: row.thickness_mm,
    })

    const productName = buildProductName({
      description: row.description ?? '',
      category: row.category,
      material: row.material,
      finish: row.finish,
      colour: row.colour,
      width_mm: row.width_mm,
      height_mm: row.height_mm,
      length_mm: row.length_mm,
      diameter_mm: row.diameter_mm,
      thickness_mm: row.thickness_mm,
    })

    // Upsert product — on conflict (product_key) update all fields + last_updated
    const { data: product, error: productError } = await db
      .from('products')
      .upsert({
        product_key: productKey,
        description: row.description,
        product: productName,
        category: row.category,
        material: row.material,
        finish: row.finish,
        colour: row.colour,
        width_mm: row.width_mm,
        height_mm: row.height_mm,
        length_mm: row.length_mm,
        diameter_mm: row.diameter_mm,
        thickness_mm: row.thickness_mm,
        unit: row.unit,
        quote_unit: row.quote_unit,
        pack_qty: row.pack_qty,
        notes: row.notes,
        last_updated: now,
      }, { onConflict: 'product_key' })
      .select('id')
      .single()

    if (productError || !product) { skippedCount.value++; continue }

    // Upsert supplier item — on conflict (product_id, supplier_id) update price + last_updated
    await db
      .from('supplier_items')
      .upsert({
        product_id: product.id,
        supplier_id: importSession.supplier_id,
        supplier_sku: row.supplier_sku,
        cost_price: row.cost_price,
        supplier_unit_original: row.unit,
        last_updated: now,
      }, { onConflict: 'product_id,supplier_id' })

    promotedIds.push(row.id as string)
  }

  // Mark rows as promoted
  if (promotedIds.length > 0) {
    await db
      .from('import_rows')
      .update({ row_status: 'promoted' })
      .in('id', promotedIds)
  }

  // Mark import complete
  await db.from('imports').update({
    status: 'complete',
    ready_count: 0,
    needs_review_count: 0,
  }).eq('id', id)

  return NextResponse.json({ promoted: promotedIds.length, skipped: skippedCount.value })
}
