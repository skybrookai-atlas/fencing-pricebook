'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ReviewRow {
  id: string
  row_status: string
  description: string
  product: string | null
  material: string | null
  material_uncertain: boolean
  category: string | null
  unit: string | null
  quote_unit: string | null
  finish: string | null
  colour: string | null
  supplier_sku: string | null
  cost_price: number | null
  width_mm: number | null
  height_mm: number | null
  length_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
  notes: string | null
}

interface Option { value: string; label: string }

interface Props {
  importId: string
  importStatus: string
  initialRows: ReviewRow[]
  initialCounts: { ready: number; needs_review: number; ignored: number; total: number }
  materials: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  purchaseUnits: { id: string; name: string; label: string }[]
  quoteUnits: { id: string; name: string; label: string }[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDims(row: ReviewRow): string {
  const parts: string[] = []
  if (row.width_mm != null && row.height_mm != null) parts.push(`${row.width_mm}×${row.height_mm}`)
  else if (row.diameter_mm != null) parts.push(`Ø${row.diameter_mm}`)
  if (row.thickness_mm != null) parts.push(`T${row.thickness_mm}`)
  if (row.length_mm != null) parts.push(`L${row.length_mm}`)
  return parts.join(' ') || '—'
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, style, active, onClick,
}: {
  label: string
  value: number
  style?: React.CSSProperties
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="border rounded-lg p-4 text-left w-full transition-colors"
      style={{
        backgroundColor: active ? 'rgba(27,67,50,0.06)' : '#FFFFFF',
        borderColor: active ? '#1B4332' : '#E2D9CC',
        outline: 'none',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: active ? 'inset 0 0 0 1px #1B4332' : 'none',
      }}
    >
      <p className="text-xs uppercase tracking-wider" style={{ color: active ? '#1B4332' : '#9E9E9E' }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={style ?? { color: '#1A1A1A' }}>{value.toLocaleString()}</p>
    </button>
  )
}

function RowStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    ready:        { label: 'Ready',        color: '#2D6A4F', bg: 'rgba(45,106,79,0.15)',   border: '#2D6A4F' },
    needs_review: { label: 'Needs Review', color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: '#B45309' },
    promoted:     { label: 'Promoted',     color: '#1D4ED8', bg: 'rgba(29,78,216,0.15)',   border: '#1D4ED8' },
    ignored:      { label: 'Ignored',      color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)', border: '#9E9E9E' },
  }
  const cfg = map[status] ?? { label: status, color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)', border: '#9E9E9E' }
  return (
    <span
      className="inline-flex items-center px-2 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ height: 22, color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

function EditableSelect({
  value, options, onSave, uncertain = false,
}: {
  value: string | null
  options: Option[]
  onSave: (v: string | null) => void
  uncertain?: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value ?? ''}
        onChange={e => { onSave(e.target.value || null); setEditing(false) }}
        onBlur={() => setEditing(false)}
        className="text-sm rounded px-1 py-0.5 w-full bg-white"
        style={{ border: '1px solid #E2D9CC', color: '#1A1A1A', outline: '2px solid #2D6A4F' }}
      >
        <option value="">—</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-sm rounded px-1 py-0.5 w-full transition-colors hover:bg-amber-50"
      style={{ color: value ? '#1A1A1A' : '#B45309' }}
    >
      {value ? (
        <>{value.replace(/_/g, ' ')}{uncertain && <span className="ml-1" style={{ color: '#B45309' }}>?</span>}</>
      ) : (
        <span className="italic text-xs">Set...</span>
      )}
    </button>
  )
}

function EditableText({
  value, onSave, placeholder = 'Add...',
}: {
  value: string | null
  onSave: (v: string | null) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value ?? '')

  useEffect(() => {
    if (!editing) setLocal(value ?? '')
  }, [value, editing])

  if (editing) {
    return (
      <input
        autoFocus
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { setEditing(false); onSave(local || null) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { setEditing(false); onSave(local || null) }
          if (e.key === 'Escape') { setEditing(false); setLocal(value ?? '') }
        }}
        className="text-sm rounded px-1 py-0.5 w-full bg-white"
        style={{ border: '1px solid #E2D9CC', color: '#1A1A1A', outline: '2px solid #2D6A4F' }}
        placeholder={placeholder}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-sm rounded px-1 py-0.5 w-full transition-colors hover:bg-amber-50"
      style={{ color: value ? '#1A1A1A' : '#9E9E9E' }}
    >
      {value ?? <span className="italic text-xs">{placeholder}</span>}
    </button>
  )
}

function DimsCell({ row, onSave }: { row: ReviewRow; onSave: (v: Record<string, number | null>) => void }) {
  const [editing, setEditing] = useState(false)
  const [vals, setVals] = useState({
    width_mm: row.width_mm?.toString() ?? '',
    height_mm: row.height_mm?.toString() ?? '',
    length_mm: row.length_mm?.toString() ?? '',
    diameter_mm: row.diameter_mm?.toString() ?? '',
    thickness_mm: row.thickness_mm?.toString() ?? '',
  })

  useEffect(() => {
    if (!editing) {
      setVals({
        width_mm: row.width_mm?.toString() ?? '',
        height_mm: row.height_mm?.toString() ?? '',
        length_mm: row.length_mm?.toString() ?? '',
        diameter_mm: row.diameter_mm?.toString() ?? '',
        thickness_mm: row.thickness_mm?.toString() ?? '',
      })
    }
  }, [row.width_mm, row.height_mm, row.length_mm, row.diameter_mm, row.thickness_mm, editing])

  function handleSave() {
    setEditing(false)
    onSave({
      width_mm: vals.width_mm ? Number(vals.width_mm) : null,
      height_mm: vals.height_mm ? Number(vals.height_mm) : null,
      length_mm: vals.length_mm ? Number(vals.length_mm) : null,
      diameter_mm: vals.diameter_mm ? Number(vals.diameter_mm) : null,
      thickness_mm: vals.thickness_mm ? Number(vals.thickness_mm) : null,
    })
  }

  if (editing) {
    const dimInputs: Array<{ key: keyof typeof vals; placeholder: string }> = [
      { key: 'width_mm', placeholder: 'W' },
      { key: 'height_mm', placeholder: 'H' },
      { key: 'diameter_mm', placeholder: 'Dia' },
      { key: 'length_mm', placeholder: 'L' },
      { key: 'thickness_mm', placeholder: 'T' },
    ]
    return (
      <div className="space-y-1 p-1">
        <div className="flex gap-1 flex-wrap">
          {dimInputs.map(({ key, placeholder }) => (
            <input
              key={key}
              value={vals[key]}
              onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder={placeholder}
              type="number"
              className="w-12 text-xs rounded px-1 py-0.5 bg-white"
              style={{ border: '1px solid #E2D9CC' }}
            />
          ))}
        </div>
        <button
          onClick={handleSave}
          className="text-xs px-2 py-0.5 rounded text-white"
          style={{ backgroundColor: '#2D6A4F' }}
        >
          Save
        </button>
      </div>
    )
  }

  const dimsStr = formatDims(row)
  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-sm rounded px-1 py-0.5 w-full transition-colors hover:bg-amber-50"
      style={{ color: dimsStr === '—' ? '#B45309' : '#1A1A1A' }}
    >
      {dimsStr}
    </button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ReviewTable({
  importId,
  importStatus,
  initialRows,
  initialCounts,
  materials,
  categories,
  purchaseUnits,
  quoteUnits,
}: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<ReviewRow[]>(initialRows)
  const [counts, setCounts] = useState(initialCounts)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [flashGreen, setFlashGreen] = useState<Set<string>>(new Set())
  const [promoting, setPromoting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Sort: needs_review → ready → promoted, then apply status filter
  const sortedRows = [...rows]
    .sort((a, b) => {
      const order: Record<string, number> = { needs_review: 0, ready: 1, promoted: 2 }
      return (order[a.row_status] ?? 3) - (order[b.row_status] ?? 3)
    })
    .filter(r => !statusFilter || statusFilter === 'ignored' ? !statusFilter : r.row_status === statusFilter)

  const materialOptions: Option[] = materials.map(m => ({ value: m.name, label: m.name.replace(/_/g, ' ') }))
  const categoryOptions: Option[] = categories.map(c => ({ value: c.name, label: c.name.replace(/_/g, ' ') }))
  const unitOptions: Option[] = purchaseUnits.map(u => ({ value: u.name, label: u.label }))
  const quoteUnitOptions: Option[] = quoteUnits.map(u => ({ value: u.name, label: u.label }))

  const saveField = useCallback(async (rowId: string, update: Record<string, unknown>) => {
    setSaving(prev => new Set(prev).add(rowId))
    try {
      const res = await fetch(`/api/import/${importId}/row/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!res.ok) return

      const { row, autoPromotedIds, importCounts } = await res.json()

      setRows(prev => prev.map(r => {
        if (r.id === row.id) return { ...r, ...row }
        if ((autoPromotedIds as string[]).includes(r.id)) return { ...r, row_status: 'ready', material_uncertain: false }
        return r
      }))

      setCounts(prev => ({ ...prev, ready: importCounts.ready, needs_review: importCounts.needs_review }))

      if ((autoPromotedIds as string[]).length > 0) {
        setFlashGreen(new Set(autoPromotedIds))
        setTimeout(() => setFlashGreen(new Set()), 2000)
      }
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(rowId); return s })
    }
  }, [importId])

  async function handlePromote() {
    setPromoting(true)
    try {
      const res = await fetch(`/api/import/${importId}/promote`, { method: 'POST' })
      if (res.ok) {
        router.push('/import')
      } else {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Promotion failed — please try again.')
      }
    } catch {
      alert('Promotion failed — please try again.')
    } finally {
      setPromoting(false)
    }
  }

  const thStyle: React.CSSProperties = {
    color: '#9E9E9E',
    fontSize: 11,
    letterSpacing: '0.05em',
    fontWeight: 600,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total rows" value={counts.total}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)} />
        <StatCard label="Ready" value={counts.ready} style={{ color: '#2D6A4F' }}
          active={statusFilter === 'ready'}
          onClick={() => setStatusFilter(prev => prev === 'ready' ? null : 'ready')} />
        <StatCard label="Needs review" value={counts.needs_review} style={{ color: '#B45309' }}
          active={statusFilter === 'needs_review'}
          onClick={() => setStatusFilter(prev => prev === 'needs_review' ? null : 'needs_review')} />
        <StatCard label="Ignored" value={counts.ignored} style={{ color: '#9E9E9E' }}
          active={statusFilter === 'ignored'}
          onClick={() => setStatusFilter(prev => prev === 'ignored' ? null : 'ignored')} />
      </div>
      {statusFilter === 'ignored' && (
        <p className="text-sm" style={{ color: '#9E9E9E' }}>
          Ignored rows are not loaded in the review view.
        </p>
      )}

      {/* Promote action */}
      {importStatus !== 'complete' && counts.ready > 0 && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePromote}
            disabled={counts.needs_review > 0 || promoting}
            style={{ backgroundColor: '#1B4332', color: '#FFFFFF' }}
          >
            {promoting
              ? 'Promoting…'
              : `Promote ${counts.ready} ready row${counts.ready !== 1 ? 's' : ''} to price book`}
          </Button>
          {counts.needs_review > 0 && (
            <p className="text-sm" style={{ color: '#B45309' }}>
              Resolve {counts.needs_review} row{counts.needs_review !== 1 ? 's' : ''} needing review first.
            </p>
          )}
        </div>
      )}

      {/* Row table */}
      {sortedRows.length > 0 && (
        <div className="border rounded-lg overflow-x-auto" style={{ borderColor: '#E2D9CC' }}>
          <table className="min-w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#FAF7F2', borderBottom: '1px solid #E2D9CC' }}>
                <th className="px-3 py-2 text-left" style={thStyle}>Status</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 240 }}>Description</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 120 }}>Material</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 120 }}>Category</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 130 }}>Dimensions</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 80 }}>Unit</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 80 }}>Q.Unit</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 90 }}>Finish</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 90 }}>Colour</th>
                <th className="px-3 py-2 text-left" style={{ ...thStyle, minWidth: 90 }}>SKU</th>
                <th className="px-3 py-2 text-right" style={{ ...thStyle, minWidth: 70 }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => {
                const isEditable = row.row_status === 'needs_review'
                const isPromoted = row.row_status === 'promoted'
                const isFlashing = flashGreen.has(row.id)
                const isSaving = saving.has(row.id)
                const isLast = idx === sortedRows.length - 1

                const save = (update: Record<string, unknown>) => saveField(row.id, update)

                let rowBg = 'transparent'
                let leftBorder = '3px solid transparent'
                if (isEditable) { rowBg = 'rgba(180,83,9,0.04)'; leftBorder = '3px solid #B45309' }
                else if (isFlashing) { rowBg = 'rgba(45,106,79,0.06)'; leftBorder = '3px solid #2D6A4F' }

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderLeft: leftBorder,
                      backgroundColor: rowBg,
                      opacity: isSaving ? 0.65 : 1,
                      transition: 'background-color 0.3s, opacity 0.15s',
                      borderBottom: isLast ? 'none' : '1px solid #E2D9CC',
                    }}
                  >
                    {/* Status */}
                    <td className="px-3" style={{ paddingTop: 14, paddingBottom: 14, verticalAlign: 'middle' }}>
                      <RowStatusBadge status={row.row_status} />
                    </td>

                    {/* Description */}
                    <td className="px-3" style={{ paddingTop: 14, paddingBottom: 14, verticalAlign: 'middle', maxWidth: 280 }}>
                      <div className="flex items-start gap-1">
                        {isPromoted && <Lock size={12} className="mt-0.5 shrink-0" style={{ color: '#9E9E9E' }} />}
                        <div className="min-w-0">
                          <p className="truncate text-sm" style={{ color: isPromoted ? '#9E9E9E' : '#1A1A1A' }}>
                            {row.description}
                          </p>
                          {row.product && row.product !== row.description && (
                            <p className="truncate text-xs" style={{ color: '#9E9E9E' }}>{row.product}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Material */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <EditableSelect
                          value={row.material}
                          options={materialOptions}
                          onSave={v => save({ material: v })}
                          uncertain={row.material_uncertain}
                        />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#4B5563' }}>
                          {row.material?.replace(/_/g, ' ') ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <EditableSelect
                          value={row.category}
                          options={categoryOptions}
                          onSave={v => save({ category: v })}
                        />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#4B5563' }}>
                          {row.category?.replace(/_/g, ' ') ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* Dimensions */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <DimsCell row={row} onSave={v => save(v as Record<string, unknown>)} />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#4B5563' }}>
                          {formatDims(row)}
                        </span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <EditableSelect
                          value={row.unit}
                          options={unitOptions}
                          onSave={v => save({ unit: v })}
                        />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#4B5563' }}>
                          {row.unit ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* Quote unit */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <EditableSelect
                          value={row.quote_unit}
                          options={quoteUnitOptions}
                          onSave={v => save({ quote_unit: v })}
                        />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#4B5563' }}>
                          {row.quote_unit ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* Finish */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <EditableText value={row.finish} onSave={v => save({ finish: v })} />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#4B5563' }}>
                          {row.finish ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* Colour */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <EditableText value={row.colour} onSave={v => save({ colour: v })} />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#4B5563' }}>
                          {row.colour ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* SKU */}
                    <td className="px-3" style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: 'middle' }}>
                      {isEditable ? (
                        <EditableText value={row.supplier_sku} onSave={v => save({ supplier_sku: v })} placeholder="SKU" />
                      ) : (
                        <span className="text-sm px-1" style={{ color: isPromoted ? '#9E9E9E' : '#6B6B6B' }}>
                          {row.supplier_sku ?? '—'}
                        </span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-3 text-right" style={{ paddingTop: 14, paddingBottom: 14, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className="text-sm" style={{ color: isPromoted ? '#9E9E9E' : '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
                        {row.cost_price != null ? `$${Number(row.cost_price).toFixed(2)}` : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {sortedRows.length === 0 && (
        <p className="text-sm" style={{ color: '#9E9E9E' }}>No rows to display.</p>
      )}
    </div>
  )
}
