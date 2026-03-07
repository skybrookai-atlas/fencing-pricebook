import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UploadForm } from '@/components/import/upload-form'

export default async function ImportPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/bom')

  const [{ data: suppliers }, { data: imports }] = await Promise.all([
    supabase.from('suppliers').select('id, name').order('name'),
    supabase
      .from('imports')
      .select('id, filename, status, total_rows, ready_count, needs_review_count, ignored_count, created_at, suppliers(name)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Import Price List</h2>
        <p className="text-gray-500">Upload a supplier CSV or Excel file to extract and review products.</p>
      </div>

      <UploadForm suppliers={suppliers ?? []} />

      {imports && imports.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Imports</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {imports.map((imp) => {
                  const supplier = imp.suppliers as { name: string } | { name: string }[] | null
                  const supplierName = Array.isArray(supplier) ? supplier[0]?.name : supplier?.name
                  return (
                    <tr key={imp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{imp.filename ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{supplierName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={imp.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {imp.total_rows != null ? imp.total_rows.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(imp.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a href={`/import/${imp.id}`} className="text-sm text-blue-600 hover:underline">
                          View
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
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
    <span className="inline-flex items-center px-2 rounded-full text-xs font-medium" style={{ height: 22, color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}
