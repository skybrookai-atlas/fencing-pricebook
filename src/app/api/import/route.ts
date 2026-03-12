import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { processRow, type RawRow, type PipelineContext } from '@/lib/extraction/pipeline'
import type { Material, Category, PurchaseUnit } from '@/lib/types'

function makeSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  // Use anon key + cookies for auth checks (getUser, profile read)
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
  // Service role key — bypasses RLS for trusted server-side writes
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

function parseFileToRows(buffer: Buffer, filename: string): RawRow[] {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'csv' || ext === 'txt') {
    const text = buffer.toString('utf-8')
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    })
    return result.data.map(row => normaliseRow(row))
  }

  // Excel (xlsx/xls)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return data.map(row => {
    const normalised: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      normalised[k.toString().trim().toLowerCase().replace(/\s+/g, '_')] = v
    }
    return normaliseRow(normalised as Record<string, string>)
  })
}

// Best-effort column normalisation — maps common supplier column names to our fields
function normaliseRow(row: Record<string, unknown>): RawRow {
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const v = row[k] ?? row[k.replace(/_/g, ' ')] ?? row[k.replace(/_/g, '')]
      if (v != null && String(v).trim()) return String(v).trim()
    }
    return ''
  }

  const description =
    get('description', 'product_description', 'item_description', 'name', 'product', 'product_/_group_name', 'desc') ||
    Object.values(row).find(v => v && String(v).length > 5)?.toString() || ''

  const costRaw = get('cost_price', 'cost', 'price', 'unit_price', 'buy_price', 'nett', 'net_price', 'ex_gst', 'excl_gst', 'amount_in_transaction_currency')
  const cost_price = costRaw ? parseFloat(costRaw.replace(/[$,]/g, '')) : null

  const colour = get('colour_name', 'color_name', 'colour', 'color') || undefined

  return {
    ...row,
    description,
    supplier_sku: get('sku', 'supplier_sku', 'code', 'item_code', 'product_code', 'part_no', 'part_number', 'item') || null,
    cost_price: isNaN(cost_price as number) ? null : cost_price,
    unit: get('unit', 'uom', 'unit_of_measure', 'sell_unit') || null,
    ...(colour ? { colour } : {}),
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const authClient = makeSupabaseClient(cookieStore)   // for auth only
  const db = makeServiceClient()                        // for all DB writes/reads

  // Auth check
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await db
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const supplierId = formData.get('supplier_id') as string | null
  const supplierName = formData.get('supplier_name') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!supplierId && !supplierName) return NextResponse.json({ error: 'Supplier required' }, { status: 400 })

  // Resolve or create supplier
  let resolvedSupplierId = supplierId
  if (!resolvedSupplierId && supplierName) {
    const { data: newSupplier, error } = await db
      .from('suppliers')
      .insert({ name: supplierName.trim() })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
    resolvedSupplierId = newSupplier.id
  }

  // Load reference data for pipeline
  const [materialsRes, categoriesRes, unitsRes, supplierRes] = await Promise.all([
    db.from('materials').select('*').order('sort_order'),
    db.from('categories').select('*').order('sort_order'),
    db.from('purchase_units').select('*').order('sort_order'),
    db.from('suppliers').select('primary_material').eq('id', resolvedSupplierId!).single(),
  ])

  const materials = (materialsRes.data ?? []) as Material[]
  const categories = (categoriesRes.data ?? []) as Category[]
  const purchaseUnits = (unitsRes.data ?? []) as PurchaseUnit[]
  const supplierPrimaryMaterial = supplierRes.data?.primary_material ?? null

  // Parse file
  const buffer = Buffer.from(await file.arrayBuffer())
  let rawRows: RawRow[]
  try {
    rawRows = parseFileToRows(buffer, file.name)
  } catch {
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 400 })
  }

  if (rawRows.length === 0) return NextResponse.json({ error: 'File appears empty' }, { status: 400 })

  // Create import session
  const { data: importSession, error: importError } = await db
    .from('imports')
    .insert({
      supplier_id: resolvedSupplierId,
      filename: file.name,
      status: 'reviewing',
      imported_by: user.id,
      total_rows: rawRows.length,
    })
    .select('id')
    .single()

  if (importError || !importSession) {
    return NextResponse.json({ error: 'Failed to create import session' }, { status: 500 })
  }

  // Run pipeline
  const ctx: PipelineContext = {
    materials,
    categories,
    purchaseUnits,
    supplierPrimaryMaterial,
    importId: importSession.id,
    deliveryRowsSeen: new Map(),
  }

  const processedRows = rawRows.map(raw => processRow(raw, ctx))

  // Deduplicate within import: same description+sku → ignore subsequent
  const seen = new Set<string>()
  const deduped = processedRows.map(row => {
    if (row.row_status === 'ignored') return row
    const key = `${row.description}|${row.supplier_sku ?? ''}`
    if (seen.has(key)) return { ...row, row_status: 'ignored' as const }
    seen.add(key)
    return row
  })

  const ready = deduped.filter(r => r.row_status === 'ready').length
  const needs_review = deduped.filter(r => r.row_status === 'needs_review').length
  const ignored = deduped.filter(r => r.row_status === 'ignored').length

  // Insert rows in batches of 200
  const BATCH = 200
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH)
    const { error } = await db.from('import_rows').insert(batch)
    if (error) {
      await db.from('imports').delete().eq('id', importSession.id)
      return NextResponse.json({ error: 'Failed to save rows' }, { status: 500 })
    }
  }

  // Update import summary counts
  await db.from('imports').update({
    total_rows: deduped.length,
    ready_count: ready,
    needs_review_count: needs_review,
    ignored_count: ignored,
  }).eq('id', importSession.id)

  return NextResponse.json({
    import_id: importSession.id,
    total: deduped.length,
    ready,
    needs_review,
    ignored,
  })
}
