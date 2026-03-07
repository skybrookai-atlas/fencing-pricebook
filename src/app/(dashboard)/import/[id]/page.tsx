import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ReviewTable } from '@/components/import/review-table'
import type { ReviewRow } from '@/components/import/review-table'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ImportDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch import session + all lookup tables in parallel
  const [
    { data: importSession },
    { data: rows },
    { data: materials },
    { data: categories },
    { data: purchaseUnits },
    { data: quoteUnits },
  ] = await Promise.all([
    supabase
      .from('imports')
      .select('*, suppliers(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('import_rows')
      .select('id, row_status, description, product, material, material_uncertain, category, unit, quote_unit, finish, colour, supplier_sku, cost_price, width_mm, height_mm, length_mm, diameter_mm, thickness_mm, notes')
      .eq('import_id', id)
      .neq('row_status', 'ignored')
      .order('row_status')
      .limit(500),
    supabase.from('materials').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('purchase_units').select('id, name, label').order('sort_order'),
    supabase.from('quote_units').select('id, name, label').order('sort_order'),
  ])

  if (!importSession) notFound()

  const supplier = importSession.suppliers as { name: string } | { name: string }[] | null
  const supplierName = Array.isArray(supplier) ? supplier[0]?.name : supplier?.name

  const ready = importSession.ready_count ?? 0
  const needsReview = importSession.needs_review_count ?? 0
  const ignored = importSession.ignored_count ?? 0
  const total = importSession.total_rows ?? 0

  const createdAt = importSession.created_at
    ? new Date(importSession.created_at).toLocaleDateString()
    : '—'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/import"
            className="text-sm transition-colors"
            style={{ color: '#6B6B6B' }}
          >
            Imports
          </Link>
          <span style={{ color: '#9E9E9E' }}>/</span>
          <span className="text-sm" style={{ color: '#1A1A1A' }}>
            {importSession.filename ?? 'Import'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold" style={{ color: '#1A1A1A' }}>
            {importSession.filename ?? 'Import'}
          </h2>
          <StatusBadge status={importSession.status} />
        </div>
        <p className="text-sm mt-0.5" style={{ color: '#6B6B6B' }}>
          {supplierName} · {createdAt}
        </p>
      </div>

      {/* Interactive review table (client component) */}
      <ReviewTable
        importId={id}
        importStatus={importSession.status ?? 'pending'}
        initialRows={(rows ?? []) as ReviewRow[]}
        initialCounts={{ ready, needs_review: needsReview, ignored, total }}
        materials={materials ?? []}
        categories={categories ?? []}
        purchaseUnits={(purchaseUnits ?? []) as { id: string; name: string; label: string }[]}
        quoteUnits={(quoteUnits ?? []) as { id: string; name: string; label: string }[]}
      />

      {total > 500 && (
        <p className="text-xs" style={{ color: '#9E9E9E' }}>
          Showing first 500 non-ignored rows of {total.toLocaleString()} total.
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:   { label: 'Pending',   color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)', border: '#9E9E9E' },
    reviewing: { label: 'Reviewing', color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: '#B45309' },
    complete:  { label: 'Complete',  color: '#1D4ED8', bg: 'rgba(29,78,216,0.15)',   border: '#1D4ED8' },
  }
  const cfg = map[status ?? ''] ?? { label: status ?? 'Unknown', color: '#9E9E9E', bg: 'rgba(158,158,158,0.15)', border: '#9E9E9E' }
  return (
    <span
      className="inline-flex items-center px-2 rounded-full text-xs font-medium"
      style={{ height: 22, color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}
