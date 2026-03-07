'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserRole } from '@/lib/types'

export interface ProductRow {
  id: string
  product_key: string
  description: string
  product: string | null
  category: string | null
  material: string | null
  finish: string | null
  colour: string | null
  width_mm: number | null
  height_mm: number | null
  length_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
  unit: string | null
  pack_qty: number | null
  last_updated: string
  // joined from supplier_items
  supplier_name: string | null
  cost_price: number | null
}

interface ProductTableProps {
  products: ProductRow[]
  categories: string[]
  materials: string[]
  role: UserRole
}

function formatDimensions(p: ProductRow): string {
  const parts: string[] = []
  if (p.diameter_mm) parts.push(`Ø${p.diameter_mm}mm`)
  else {
    if (p.width_mm) parts.push(`${p.width_mm}`)
    if (p.height_mm) parts.push(`${p.height_mm}`)
    if (parts.length) parts[parts.length - 1] += 'mm'
  }
  if (p.thickness_mm) parts.push(`t${p.thickness_mm}mm`)
  if (p.length_mm) parts.push(`${(p.length_mm / 1000).toFixed(2)}m`)
  return parts.join(' × ') || '—'
}

export function ProductTable({ products, categories, materials, role }: ProductTableProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [materialFilter, setMaterialFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      if (q && !p.description?.toLowerCase().includes(q) && !p.product?.toLowerCase().includes(q)) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (materialFilter !== 'all' && p.material !== materialFilter) return false
      return true
    })
  }, [products, search, categoryFilter, materialFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All materials</SelectItem>
            {materials.map(m => (
              <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="self-center text-sm text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Material</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Dimensions</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Unit</th>
                {role === 'owner' && (
                  <>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Supplier</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Cost</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-xs">
                      {p.product || p.description}
                    </div>
                    {p.product && (
                      <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>
                    )}
                    {p.finish || p.colour ? (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {p.finish && (
                          <span className="inline-flex items-center px-2 rounded-full text-xs font-medium" style={{ height: 20, color: '#6B6B6B', backgroundColor: 'rgba(107,107,107,0.1)', border: '1px solid #E2D9CC' }}>{p.finish}</span>
                        )}
                        {p.colour && (
                          <span className="inline-flex items-center px-2 rounded-full text-xs font-medium" style={{ height: 20, color: '#6B6B6B', backgroundColor: 'rgba(107,107,107,0.1)', border: '1px solid #E2D9CC' }}>{p.colour}</span>
                        )}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {p.category?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {p.material?.replace(/_/g, ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                    {formatDimensions(p)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {p.pack_qty ? `${p.unit ?? 'ea'} (×${p.pack_qty})` : (p.unit ?? '—')}
                  </td>
                  {role === 'owner' && (
                    <>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {p.supplier_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900 whitespace-nowrap">
                        {p.cost_price != null
                          ? `$${p.cost_price.toFixed(2)}`
                          : '—'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={role === 'owner' ? 7 : 5}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    {products.length === 0
                      ? 'No products yet — import a supplier price list to get started.'
                      : 'No products match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
