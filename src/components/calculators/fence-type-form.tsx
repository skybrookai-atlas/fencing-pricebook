'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ────────────────────────────────────────────────────────────────────

type CalcType = 'every_x_metres' | 'per_lm' | 'fixed'

interface CalcParams {
  spacing?: number
  extra?: number
  multiplier?: number
  fixed_qty?: number
}

export interface MaterialItem {
  product_key: string
  product_name: string
  calc_type: CalcType
  calc_params: CalcParams
  qty_formula: string
  notes: string
}

interface ProductResult {
  product_key: string
  product: string | null
  description: string
  category: string | null
  material: string | null
}

interface Props {
  fenceTypeId?: string
  initialData?: {
    name: string
    labour_rate_per_unit: number | null
    margin_percent: number
    materials: MaterialItem[]
  }
}

// ── Formula helpers ───────────────────────────────────────────────────────────

function buildFormula(calcType: CalcType, params: { spacing: string; extra: string; multiplier: string; fixedQty: string }): string {
  if (calcType === 'every_x_metres') {
    const spacing = parseFloat(params.spacing) || 1
    const extra = parseInt(params.extra) || 0
    return extra > 0 ? `ceil(lm / ${spacing}) + ${extra}` : `ceil(lm / ${spacing})`
  }
  if (calcType === 'per_lm') {
    return `lm * ${parseFloat(params.multiplier) || 1}`
  }
  return String(parseInt(params.fixedQty) || 1)
}

function formulaDescription(item: MaterialItem): string {
  const { calc_type, calc_params } = item
  if (calc_type === 'every_x_metres') {
    const s = calc_params.spacing ?? 1
    const e = calc_params.extra ?? 0
    return e > 0 ? `One every ${s}m + ${e} extra` : `One every ${s}m`
  }
  if (calc_type === 'per_lm') {
    return `${calc_params.multiplier ?? 1}× per linear metre`
  }
  return `${calc_params.fixed_qty ?? 1} fixed per job`
}

const CALC_TYPE_LABELS: Record<CalcType, string> = {
  every_x_metres: 'Every X metres',
  per_lm: 'Per linear metre',
  fixed: 'Fixed per job',
}

// ── Input style ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: '1px solid #E2D9CC',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  color: '#1A1A1A',
  backgroundColor: '#FFFFFF',
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6B6B6B',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 4,
}

// ── Main component ────────────────────────────────────────────────────────────

export function FenceTypeForm({ fenceTypeId, initialData }: Props) {
  const router = useRouter()

  // Core form fields
  const [name, setName] = useState(initialData?.name ?? '')
  const [labourRate, setLabourRate] = useState(initialData?.labour_rate_per_unit?.toString() ?? '')
  const [margin, setMargin] = useState(initialData?.margin_percent?.toString() ?? '42')
  const [materials, setMaterials] = useState<MaterialItem[]>(initialData?.materials ?? [])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Add-material sub-form
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductResult[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [calcType, setCalcType] = useState<CalcType>('every_x_metres')
  const [spacing, setSpacing] = useState('')
  const [extra, setExtra] = useState('0')
  const [multiplier, setMultiplier] = useState('')
  const [fixedQty, setFixedQty] = useState('1')
  const [itemNotes, setItemNotes] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Debounced product search
  function handleSearchChange(q: string) {
    setSearchQuery(q)
    setSelectedProduct(null)
    setSearchError(null)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 2) { setSearchResults([]); setShowDropdown(false); setSearching(false); return }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`)
        if (res.ok) {
          const { products } = await res.json()
          setSearchResults(products)
          setShowDropdown(true)
        } else {
          setSearchError('Search failed — please try again.')
        }
      } catch {
        setSearchError('Search failed — please check your connection.')
      } finally {
        setSearching(false)
      }
    }, 250)
  }

  function selectProduct(p: ProductResult) {
    setSelectedProduct(p)
    setSearchQuery(p.product ?? p.description)
    setShowDropdown(false)
    setSearchResults([])
  }

  // Live formula preview — only shown once valid params are entered
  const paramsValid =
    (calcType === 'every_x_metres' && !!spacing && parseFloat(spacing) > 0) ||
    (calcType === 'per_lm' && !!multiplier && parseFloat(multiplier) > 0) ||
    (calcType === 'fixed' && !!fixedQty && parseInt(fixedQty) >= 1)
  const formulaPreview = selectedProduct && paramsValid
    ? buildFormula(calcType, { spacing, extra, multiplier, fixedQty })
    : null

  function validateAddItem(): string | null {
    if (!selectedProduct) return 'Select a product first'
    if (calcType === 'every_x_metres' && (!spacing || parseFloat(spacing) <= 0)) return 'Enter a valid spacing (metres)'
    if (calcType === 'per_lm' && (!multiplier || parseFloat(multiplier) <= 0)) return 'Enter a valid multiplier'
    if (calcType === 'fixed' && (!fixedQty || parseInt(fixedQty) < 1)) return 'Enter a valid quantity'
    return null
  }

  function handleAddMaterial() {
    const err = validateAddItem()
    if (err) { setAddError(err); return }
    setAddError(null)

    const params: CalcParams = {}
    if (calcType === 'every_x_metres') {
      params.spacing = parseFloat(spacing)
      params.extra = parseInt(extra) || 0
    } else if (calcType === 'per_lm') {
      params.multiplier = parseFloat(multiplier)
    } else {
      params.fixed_qty = parseInt(fixedQty)
    }

    setMaterials(prev => [...prev, {
      product_key: selectedProduct!.product_key,
      product_name: selectedProduct!.product ?? selectedProduct!.description,
      calc_type: calcType,
      calc_params: params,
      qty_formula: buildFormula(calcType, { spacing, extra, multiplier, fixedQty }),
      notes: itemNotes.trim(),
    }])

    // Reset sub-form
    setAdding(false)
    setSearchQuery('')
    setSelectedProduct(null)
    setCalcType('every_x_metres')
    setSpacing('')
    setExtra('0')
    setMultiplier('')
    setFixedQty('1')
    setItemNotes('')
  }

  function removeMaterial(idx: number) {
    setMaterials(prev => prev.filter((_, i) => i !== idx))
  }

  function moveMaterial(idx: number, dir: -1 | 1) {
    setMaterials(prev => {
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) { setFormError('Name is required'); return }
    setFormError(null)
    setSaving(true)
    try {
      const url = fenceTypeId ? `/api/fence-types/${fenceTypeId}` : '/api/fence-types'
      const method = fenceTypeId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          labour_rate_per_unit: labourRate ? parseFloat(labourRate) : null,
          margin_percent: parseFloat(margin) || 42,
          materials,
        }),
      })
      if (res.ok) {
        router.push('/calculators')
      } else {
        const body = await res.json().catch(() => ({}))
        setFormError(body.error ?? 'Save failed — please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── Basic fields ── */}
      <div className="rounded-lg p-6 space-y-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC' }}>
        <h3 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>Details</h3>

        <div>
          <label style={labelStyle}>Fence type name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Colorbond 1.8m"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Labour rate ($/lm)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={labourRate}
              onChange={e => setLabourRate(e.target.value)}
              placeholder="e.g. 45.00"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Margin %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={margin}
              onChange={e => setMargin(e.target.value)}
              placeholder="42"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── Materials list ── */}
      <div className="rounded-lg p-6 space-y-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: '#1A1A1A' }}>
            Materials
            {materials.length > 0 && (
              <span className="ml-2 text-sm font-normal" style={{ color: '#9E9E9E' }}>
                ({materials.length})
              </span>
            )}
          </h3>
        </div>

        {/* Material rows */}
        {materials.length > 0 && (
          <div className="space-y-2">
            {materials.map((item, idx) => (
              <div
                key={idx}
                className="rounded-md px-4 py-3"
                style={{ border: '1px solid #E2D9CC', backgroundColor: '#FAF7F2' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
                      {item.product_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B6B6B' }}>
                      {formulaDescription(item)}
                      <span className="ml-2 font-mono" style={{ color: '#9E9E9E' }}>
                        {item.qty_formula}
                      </span>
                    </p>
                    {item.notes && (
                      <p className="text-xs mt-0.5 italic" style={{ color: '#9E9E9E' }}>{item.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveMaterial(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded transition-colors"
                      style={{ color: idx === 0 ? '#D0C9BF' : '#9E9E9E' }}
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveMaterial(idx, 1)}
                      disabled={idx === materials.length - 1}
                      className="p-1 rounded transition-colors"
                      style={{ color: idx === materials.length - 1 ? '#D0C9BF' : '#9E9E9E' }}
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => removeMaterial(idx)}
                      className="p-1 rounded transition-colors"
                      style={{ color: '#9E9E9E' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9E9E9E' }}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add material sub-form */}
        {adding ? (
          <div className="rounded-md p-4 space-y-4" style={{ border: '1px dashed #B45309', backgroundColor: 'rgba(180,83,9,0.03)' }}>
            <p className="text-sm font-medium" style={{ color: '#B45309' }}>Add material line item</p>

            {/* Product search */}
            <div ref={searchRef} className="relative">
              <label style={labelStyle}>Product</label>
              <input
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search by name or product key…"
                style={inputStyle}
                autoFocus
              />
              {showDropdown && searchResults.length > 0 && (
                <div
                  className="absolute z-10 mt-1 w-full rounded-md shadow-lg"
                  style={{ border: '1px solid #E2D9CC', backgroundColor: '#FFFFFF', maxHeight: 240, overflowY: 'auto' }}
                >
                  {searchResults.map(p => (
                    <button
                      key={p.product_key}
                      onClick={() => selectProduct(p)}
                      className="w-full text-left px-3 py-2 transition-colors"
                      style={{ borderBottom: '1px solid #F5F0E8' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F5F0E8' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                    >
                      <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
                        {p.product ?? p.description}
                      </p>
                      <p className="text-xs" style={{ color: '#9E9E9E' }}>
                        {[p.category, p.material].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {searching && (
                <div
                  className="absolute z-10 mt-1 w-full rounded-md px-3 py-2 text-sm"
                  style={{ border: '1px solid #E2D9CC', backgroundColor: '#FFFFFF', color: '#9E9E9E' }}
                >
                  Searching…
                </div>
              )}
              {!searching && showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div
                  className="absolute z-10 mt-1 w-full rounded-md px-3 py-2 text-sm"
                  style={{ border: '1px solid #E2D9CC', backgroundColor: '#FFFFFF', color: '#9E9E9E' }}
                >
                  No products found
                </div>
              )}
              {searchError && (
                <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>{searchError}</p>
              )}
            </div>

            {/* Calc type */}
            <div>
              <label style={labelStyle}>Calculation type</label>
              <select
                value={calcType}
                onChange={e => setCalcType(e.target.value as CalcType)}
                style={inputStyle}
              >
                {(Object.entries(CALC_TYPE_LABELS) as [CalcType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Calc params — conditional on type */}
            {calcType === 'every_x_metres' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Spacing (metres)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={spacing}
                    onChange={e => setSpacing(e.target.value)}
                    placeholder="e.g. 3.0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Extra items</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={extra}
                    onChange={e => setExtra(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {calcType === 'per_lm' && (
              <div>
                <label style={labelStyle}>Items per linear metre</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={multiplier}
                  onChange={e => setMultiplier(e.target.value)}
                  placeholder="e.g. 3"
                  style={inputStyle}
                />
              </div>
            )}

            {calcType === 'fixed' && (
              <div>
                <label style={labelStyle}>Fixed quantity per job</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={fixedQty}
                  onChange={e => setFixedQty(e.target.value)}
                  placeholder="1"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Formula preview */}
            {formulaPreview && (
              <p className="text-xs" style={{ color: '#9E9E9E' }}>
                Formula: <span className="font-mono" style={{ color: '#6B6B6B' }}>{formulaPreview}</span>
              </p>
            )}

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <input
                value={itemNotes}
                onChange={e => setItemNotes(e.target.value)}
                placeholder="e.g. Posts at 3m centres + 1 end post"
                style={inputStyle}
              />
            </div>

            {addError && (
              <p className="text-sm" style={{ color: '#DC2626' }}>{addError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddMaterial}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#1B4332' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2D6A4F' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1B4332' }}
              >
                <Plus size={14} />
                Add to list
              </button>
              <button
                onClick={() => { setAdding(false); setAddError(null) }}
                className="px-3 py-2 rounded-md text-sm transition-colors"
                style={{ color: '#6B6B6B' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md transition-colors"
            style={{ color: '#2D6A4F', border: '1px dashed #2D6A4F' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(45,106,79,0.05)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
          >
            <Plus size={14} />
            Add material
          </button>
        )}
      </div>

      {/* ── Save / Cancel ── */}
      {formError && (
        <p className="text-sm" style={{ color: '#DC2626' }}>{formError}</p>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: '#1B4332', color: '#FFFFFF' }}
        >
          {saving ? 'Saving…' : fenceTypeId ? 'Save changes' : 'Create fence type'}
        </Button>
        <button
          onClick={() => router.push('/calculators')}
          className="px-4 py-2 rounded-md text-sm transition-colors"
          style={{ color: '#6B6B6B', border: '1px solid #E2D9CC' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.04)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
