import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductTable } from '@/components/pricebook/product-table'
import type { ProductRow } from '@/components/pricebook/product-table'

export default async function PricebookPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/bom')

  // Fetch products joined with cheapest supplier item per product
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      product_key,
      description,
      product,
      category,
      material,
      finish,
      colour,
      width_mm,
      height_mm,
      length_mm,
      diameter_mm,
      thickness_mm,
      unit,
      pack_qty,
      last_updated,
      supplier_items (
        cost_price,
        suppliers ( name )
      )
    `)
    .order('category', { ascending: true })
    .order('material', { ascending: true })

  // Fetch distinct categories and materials that actually exist in products
  const { data: usedCategories } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null)

  const { data: usedMaterials } = await supabase
    .from('products')
    .select('material')
    .not('material', 'is', null)

  const categories = [...new Set((usedCategories ?? []).map(r => r.category).filter(Boolean))].sort() as string[]
  const materials = [...new Set((usedMaterials ?? []).map(r => r.material).filter(Boolean))].sort() as string[]

  // Flatten to one row per product (cheapest supplier item for display)
  const rows: ProductRow[] = (products ?? []).map(p => {
    const items = (p.supplier_items ?? []) as unknown as Array<{
      cost_price: number
      suppliers: { name: string } | { name: string }[] | null
    }>
    const cheapest = items.sort((a, b) => a.cost_price - b.cost_price)[0] ?? null

    return {
      id: p.id,
      product_key: p.product_key,
      description: p.description,
      product: p.product,
      category: p.category,
      material: p.material,
      finish: p.finish,
      colour: p.colour,
      width_mm: p.width_mm,
      height_mm: p.height_mm,
      length_mm: p.length_mm,
      diameter_mm: p.diameter_mm,
      thickness_mm: p.thickness_mm,
      unit: p.unit,
      pack_qty: p.pack_qty,
      last_updated: p.last_updated,
      supplier_name: cheapest
        ? Array.isArray(cheapest.suppliers)
          ? (cheapest.suppliers[0]?.name ?? null)
          : (cheapest.suppliers?.name ?? null)
        : null,
      cost_price: cheapest?.cost_price ?? null,
    }
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Price Book</h2>
        <p className="text-sm text-gray-500 mt-1">
          {rows.length} {rows.length === 1 ? 'product' : 'products'} across all suppliers
        </p>
      </div>
      <ProductTable
        products={rows}
        categories={categories}
        materials={materials}
        role={profile.role}
      />
    </div>
  )
}
