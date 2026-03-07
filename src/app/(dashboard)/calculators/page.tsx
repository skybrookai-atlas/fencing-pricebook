import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'
import { DeleteFenceTypeButton } from '@/components/calculators/delete-fence-type-button'

export default async function CalculatorsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/bom')

  const { data: fenceTypes } = await supabase
    .from('fence_types')
    .select('id, name, labour_rate_per_unit, margin_percent, materials, created_at')
    .order('name')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#1A1A1A' }}>Fence Type Calculators</h2>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B6B' }}>
            Configure material rules and labour rates for each fence type.
          </p>
        </div>
        <Link
          href="/calculators/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#1B4332' }}
        >
          <Plus size={16} />
          New fence type
        </Link>
      </div>

      {/* Table */}
      {fenceTypes && fenceTypes.length > 0 ? (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E2D9CC' }}>
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#FAF7F2', borderBottom: '1px solid #E2D9CC' }}>
                <th className="px-4 py-3 text-left" style={{ color: '#9E9E9E', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Name
                </th>
                <th className="px-4 py-3 text-left" style={{ color: '#9E9E9E', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Materials
                </th>
                <th className="px-4 py-3 text-right" style={{ color: '#9E9E9E', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Labour ($/lm)
                </th>
                <th className="px-4 py-3 text-right" style={{ color: '#9E9E9E', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Margin
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {fenceTypes.map((ft, idx) => {
                const materialCount = Array.isArray(ft.materials) ? ft.materials.length : 0
                const isLast = idx === fenceTypes.length - 1
                return (
                  <tr
                    key={ft.id}
                    style={{ borderBottom: isLast ? 'none' : '1px solid #E2D9CC' }}
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium" style={{ color: '#1A1A1A' }}>{ft.name}</p>
                    </td>
                    <td className="px-4 py-4" style={{ color: '#6B6B6B' }}>
                      {materialCount > 0
                        ? `${materialCount} item${materialCount !== 1 ? 's' : ''}`
                        : <span style={{ color: '#9E9E9E' }}>None configured</span>}
                    </td>
                    <td className="px-4 py-4 text-right" style={{ color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
                      {ft.labour_rate_per_unit != null ? `$${Number(ft.labour_rate_per_unit).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right" style={{ color: '#1A1A1A' }}>
                      {ft.margin_percent != null ? `${ft.margin_percent}%` : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/calculators/${ft.id}/edit`}
                          className="text-sm transition-colors"
                          style={{ color: '#2D6A4F' }}
                        >
                          Edit
                        </Link>
                        <DeleteFenceTypeButton fenceTypeId={ft.id} fenceTypeName={ft.name} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="rounded-lg p-12 text-center"
          style={{ border: '1px dashed #E2D9CC', backgroundColor: '#FFFFFF' }}
        >
          <p className="text-sm" style={{ color: '#6B6B6B' }}>No fence types yet.</p>
          <p className="text-sm mt-1" style={{ color: '#9E9E9E' }}>
            Create your first fence type to start building calculators.
          </p>
          <Link
            href="/calculators/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: '#1B4332' }}
          >
            <Plus size={16} />
            New fence type
          </Link>
        </div>
      )}
    </div>
  )
}
