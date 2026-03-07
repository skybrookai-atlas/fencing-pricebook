import { createClient } from '@/lib/supabase/server'
import { BomClient } from '@/components/bom/bom-client'

export default async function BomPage() {
  const supabase = await createClient()
  const { data: fenceTypes } = await supabase
    .from('fence_types')
    .select('id, name')
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: '#1A1A1A' }}>New Quote</h2>
      </div>
      <BomClient fenceTypes={fenceTypes ?? []} />
    </div>
  )
}
