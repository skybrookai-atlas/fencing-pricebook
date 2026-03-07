import { createClient } from '@/lib/supabase/server'
import { evaluate } from 'mathjs'

interface StoredMaterialItem {
  product_key: string
  qty_formula: string
  notes?: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fenceTypeId = searchParams.get('fence_type_id')
  const lmStr = searchParams.get('lm')

  if (!fenceTypeId || !lmStr) {
    return Response.json({ error: 'fence_type_id and lm are required' }, { status: 400 })
  }

  const lm = parseFloat(lmStr)
  if (isNaN(lm) || lm <= 0) {
    return Response.json({ error: 'lm must be a positive number' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: fenceType, error: ftError } = await supabase
    .from('fence_types')
    .select('id, name, margin_percent, labour_rate_per_unit, measurement_unit, materials')
    .eq('id', fenceTypeId)
    .single()

  if (ftError || !fenceType) {
    return Response.json({ error: 'Fence type not found' }, { status: 404 })
  }

  const materials = (fenceType.materials ?? []) as StoredMaterialItem[]

  const lineItems = await Promise.all(
    materials.map(async (mat) => {
      const { data: product } = await supabase
        .from('products')
        .select('id, product, description, unit')
        .eq('product_key', mat.product_key)
        .single()

      if (!product) return null

      const { data: pricing } = await supabase
        .from('supplier_items')
        .select('cost_price')
        .eq('product_id', product.id)
        .order('cost_price', { ascending: true })

      if (!pricing || pricing.length === 0) return null

      const cost_price = pricing[0].cost_price
      const supplier_count = pricing.length

      let qty: number
      try {
        const result = evaluate(mat.qty_formula, { lm })
        qty = Number(result)
      } catch {
        qty = 1
      }

      return {
        product_key: mat.product_key,
        product_name: product.product ?? product.description,
        unit: product.unit,
        qty,
        cost_price,
        supplier_count,
        notes: mat.notes ?? null,
      }
    })
  )

  return Response.json({
    fence_type: {
      id: fenceType.id,
      name: fenceType.name,
      margin_percent: fenceType.margin_percent ?? 42,
      labour_rate_per_unit: fenceType.labour_rate_per_unit,
      measurement_unit: fenceType.measurement_unit ?? 'lm',
    },
    line_items: lineItems.filter(Boolean),
    lm,
  })
}
