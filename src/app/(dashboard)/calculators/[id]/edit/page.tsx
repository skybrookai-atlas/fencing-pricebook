import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FenceTypeForm } from '@/components/calculators/fence-type-form'
import type { MaterialItem } from '@/components/calculators/fence-type-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCalculatorPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/bom')

  const { data: fenceType } = await supabase
    .from('fence_types')
    .select('id, name, labour_rate_per_unit, margin_percent, materials')
    .eq('id', id)
    .single()

  if (!fenceType) notFound()

  const initialData = {
    name: fenceType.name,
    labour_rate_per_unit: fenceType.labour_rate_per_unit ?? null,
    margin_percent: fenceType.margin_percent ?? 42,
    materials: (fenceType.materials as MaterialItem[]) ?? [],
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/calculators" className="text-sm transition-colors" style={{ color: '#6B6B6B' }}>
            Calculators
          </Link>
          <span style={{ color: '#9E9E9E' }}>/</span>
          <span className="text-sm" style={{ color: '#1A1A1A' }}>{fenceType.name}</span>
        </div>
        <h2 className="text-2xl font-semibold" style={{ color: '#1A1A1A' }}>Edit: {fenceType.name}</h2>
      </div>

      <FenceTypeForm fenceTypeId={id} initialData={initialData} />
    </div>
  )
}
