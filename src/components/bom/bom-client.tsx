'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FenceTypeOption {
  id: string
  name: string
}

interface BomLineItem {
  product_key: string
  product_name: string
  unit: string | null
  qty: number
  cost_price: number
  supplier_count: number
  notes: string | null
}

interface BomFenceType {
  id: string
  name: string
  margin_percent: number
  labour_rate_per_unit: number | null
  measurement_unit: string
}

interface BomResult {
  fence_type: BomFenceType
  line_items: BomLineItem[]
  lm: number
}

interface Props {
  fenceTypes: FenceTypeOption[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`
}

function formatQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: '1px solid #E2D9CC',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 14,
  color: '#1A1A1A',
  backgroundColor: '#FFFFFF',
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

const thStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#9E9E9E',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '12px 16px',
  textAlign: 'left',
  borderBottom: '1px solid #E2D9CC',
  backgroundColor: '#FAFAFA',
}

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  color: '#1A1A1A',
  borderBottom: '1px solid #E2D9CC',
}

const qtyInputStyle: React.CSSProperties = {
  border: '1px solid #E2D9CC',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 14,
  color: '#1A1A1A',
  backgroundColor: '#FFFFFF',
  width: 80,
  outline: 'none',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BomClient({ fenceTypes }: Props) {
  const [fenceTypeId, setFenceTypeId] = useState(fenceTypes[0]?.id ?? '')
  const [lmInput, setLmInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [result, setResult] = useState<BomResult | null>(null)

  // Editable quantities stored as strings so user can clear/retype freely
  const [qtyStrs, setQtyStrs] = useState<string[]>([])
  const [labourQtyStr, setLabourQtyStr] = useState<string>('0')
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    const lm = parseFloat(lmInput)
    if (!fenceTypeId) { setGenerateError('Select a fence type'); return }
    if (isNaN(lm) || lm <= 0) { setGenerateError('Enter a valid length'); return }
    setGenerateError(null)
    setGenerating(true)
    try {
      const res = await fetch(`/api/bom?fence_type_id=${encodeURIComponent(fenceTypeId)}&lm=${lm}`)
      if (!res.ok) {
        const data = await res.json()
        setGenerateError(data.error ?? 'Failed to generate BOM')
        return
      }
      const data: BomResult = await res.json()
      setResult(data)
      setQtyStrs(data.line_items.map(item => formatQty(item.qty)))
      setLabourQtyStr(String(lm))
    } catch {
      setGenerateError('Failed to generate BOM — check your connection')
    } finally {
      setGenerating(false)
    }
  }

  // Derived totals
  const qtys = qtyStrs.map(s => parseFloat(s) || 0)
  const materialSubtotal = result
    ? result.line_items.reduce((sum, item, i) => sum + qtys[i] * item.cost_price, 0)
    : 0
  const labourQty = parseFloat(labourQtyStr) || 0
  const labourTotal = result?.fence_type.labour_rate_per_unit
    ? labourQty * result.fence_type.labour_rate_per_unit
    : 0
  const subtotal = materialSubtotal + labourTotal
  const marginPct = result?.fence_type.margin_percent ?? 42
  const sellPrice = marginPct < 100 ? subtotal / (1 - marginPct / 100) : subtotal

  function buildClipboardText(): string {
    if (!result) return ''
    const ft = result.fence_type
    const lines: string[] = []
    lines.push(`Fence Magic — ${ft.name} (${result.lm} lm)`)
    lines.push('')
    lines.push('Materials:')
    result.line_items.forEach((item, i) => {
      const qty = qtys[i]
      const total = qty * item.cost_price
      lines.push(`  • ${item.product_name} — ${formatQty(qty)} ${item.unit ?? ''} @ ${formatMoney(item.cost_price)} = ${formatMoney(total)}`)
    })
    if (ft.labour_rate_per_unit) {
      lines.push('')
      lines.push('Labour:')
      lines.push(`  • Labour — ${formatQty(labourQty)} lm @ ${formatMoney(ft.labour_rate_per_unit)}/lm = ${formatMoney(labourTotal)}`)
    }
    lines.push('')
    lines.push(`Subtotal: ${formatMoney(subtotal)}`)
    lines.push(`Margin (${marginPct}%): ${formatMoney(sellPrice - subtotal)}`)
    lines.push(`Sell Price: ${formatMoney(sellPrice)}`)
    return lines.join('\n')
  }

  async function handleCopyClipboard() {
    try {
      await navigator.clipboard.writeText(buildClipboardText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — silently fail
    }
  }

  function handleExportExcel() {
    if (!result) return
    const ft = result.fence_type
    const rows: (string | number)[][] = []

    rows.push([`Fence Magic — ${ft.name}`, '', '', '', ''])
    rows.push([`Length: ${result.lm} lm`, '', '', '', ''])
    rows.push([])
    rows.push(['Product', 'Qty', 'Unit', 'Cost Price', 'Line Total'])

    result.line_items.forEach((item, i) => {
      const qty = qtys[i]
      rows.push([item.product_name, qty, item.unit ?? '', item.cost_price, qty * item.cost_price])
    })

    if (ft.labour_rate_per_unit) {
      rows.push(['Labour', labourQty, 'lm', ft.labour_rate_per_unit, labourTotal])
    }

    rows.push([])
    rows.push(['Subtotal', '', '', '', subtotal])
    rows.push([`Margin (${marginPct}%)`, '', '', '', sellPrice - subtotal])
    rows.push(['Sell Price', '', '', '', sellPrice])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BOM')
    XLSX.writeFile(wb, `bom-${ft.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`)
  }

  return (
    <div>
      {/* Setup form */}
      <div
        className="rounded-lg mb-6 p-5 flex items-end gap-4 flex-wrap"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC' }}
      >
        <div>
          <label style={labelStyle}>Fence type</label>
          <select
            value={fenceTypeId}
            onChange={e => setFenceTypeId(e.target.value)}
            style={{ ...inputStyle, width: 240, cursor: 'pointer' }}
          >
            {fenceTypes.length === 0 && <option value="">No fence types configured</option>}
            {fenceTypes.map(ft => (
              <option key={ft.id} value={ft.id}>{ft.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Length (lm)</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="e.g. 50"
            value={lmInput}
            onChange={e => setLmInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
            style={{ ...inputStyle, width: 120 }}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || fenceTypes.length === 0}
          className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
          style={{
            backgroundColor: generating || fenceTypes.length === 0 ? '#9E9E9E' : '#1B4332',
            cursor: generating || fenceTypes.length === 0 ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => {
            if (!generating && fenceTypes.length > 0)
              (e.currentTarget as HTMLElement).style.backgroundColor = '#2D6A4F'
          }}
          onMouseLeave={e => {
            if (!generating && fenceTypes.length > 0)
              (e.currentTarget as HTMLElement).style.backgroundColor = '#1B4332'
          }}
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>

        {generateError && (
          <p className="text-sm self-center" style={{ color: '#DC2626' }}>{generateError}</p>
        )}
      </div>

      {/* No fence types state */}
      {fenceTypes.length === 0 && (
        <div
          className="rounded-lg p-12 text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC' }}
        >
          <p className="text-sm" style={{ color: '#6B6B6B' }}>No fence types have been configured yet.</p>
          <p className="text-sm mt-1" style={{ color: '#9E9E9E' }}>Ask your owner to set up fence types in Calculators.</p>
        </div>
      )}

      {/* BOM table */}
      {result && (
        <>
          <div
            className="rounded-lg overflow-hidden mb-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC' }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '40%' }}>Product</th>
                  <th style={{ ...thStyle, width: '12%' }}>Qty</th>
                  <th style={{ ...thStyle, width: '10%' }}>Unit</th>
                  <th style={{ ...thStyle, width: '16%', textAlign: 'right' }}>Cost</th>
                  <th style={{ ...thStyle, width: '16%', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.line_items.map((item, i) => {
                  const lineTotal = qtys[i] * item.cost_price
                  return (
                    <tr
                      key={item.product_key}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(45,106,79,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                    >
                      <td style={tdStyle}>
                        <div className="flex items-center gap-2">
                          <span>{item.product_name}</span>
                          {item.supplier_count > 1 && (
                            <span
                              className="rounded px-1.5 py-0.5"
                              style={{
                                fontSize: 11,
                                color: '#2D6A4F',
                                backgroundColor: 'rgba(45,106,79,0.15)',
                              }}
                            >
                              {item.supplier_count} suppliers
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>{item.notes}</p>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={qtyStrs[i]}
                          onChange={e => {
                            const next = [...qtyStrs]
                            next[i] = e.target.value
                            setQtyStrs(next)
                          }}
                          style={qtyInputStyle}
                        />
                      </td>
                      <td style={{ ...tdStyle, color: '#6B6B6B' }}>{item.unit ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(item.cost_price)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                        {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  )
                })}

                {/* Labour row */}
                {result.fence_type.labour_rate_per_unit && (
                  <tr
                    style={{ backgroundColor: 'rgba(45,106,79,0.03)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(45,106,79,0.07)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(45,106,79,0.03)' }}
                  >
                    <td style={{ ...tdStyle, fontStyle: 'italic', color: '#6B6B6B' }}>Labour</td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={labourQtyStr}
                        onChange={e => setLabourQtyStr(e.target.value)}
                        style={qtyInputStyle}
                      />
                    </td>
                    <td style={{ ...tdStyle, color: '#6B6B6B' }}>lm</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6B6B6B' }}>
                      {formatMoney(result.fence_type.labour_rate_per_unit)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                      {formatMoney(labourTotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary card */}
          <div className="flex justify-end mb-6">
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC', minWidth: 280 }}
            >
              <div
                className="flex justify-between py-2"
                style={{ borderBottom: '1px solid #E2D9CC' }}
              >
                <span className="text-sm" style={{ color: '#6B6B6B' }}>Subtotal</span>
                <span className="text-sm font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(subtotal)}
                </span>
              </div>
              <div
                className="flex justify-between py-2"
                style={{ borderBottom: '1px solid #E2D9CC' }}
              >
                <span className="text-sm" style={{ color: '#6B6B6B' }}>Margin ({marginPct}%)</span>
                <span className="text-sm" style={{ color: '#6B6B6B', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(sellPrice - subtotal)}
                </span>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-base font-semibold">Sell Price</span>
                <span
                  className="text-base font-semibold"
                  style={{ color: '#1B4332', fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMoney(sellPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopyClipboard}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                border: `1px solid ${copied ? '#1B4332' : '#1B4332'}`,
                color: copied ? '#FFFFFF' : '#1B4332',
                backgroundColor: copied ? '#1B4332' : 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(27,67,50,0.06)'
              }}
              onMouseLeave={e => {
                if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                border: '1px solid #E2D9CC',
                color: '#1A1A1A',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            >
              Export to Excel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
