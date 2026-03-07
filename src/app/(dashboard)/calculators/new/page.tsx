import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FenceTypeForm } from '@/components/calculators/fence-type-form'

export default async function NewCalculatorPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/bom')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/calculators" className="text-sm transition-colors" style={{ color: '#6B6B6B' }}>
            Calculators
          </Link>
          <span style={{ color: '#9E9E9E' }}>/</span>
          <span className="text-sm" style={{ color: '#1A1A1A' }}>New fence type</span>
        </div>
        <h2 className="text-2xl font-semibold" style={{ color: '#1A1A1A' }}>New fence type</h2>
      </div>

      <FenceTypeForm />
    </div>
  )
}
