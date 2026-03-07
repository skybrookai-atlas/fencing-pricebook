import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      <Sidebar role={profile.role} fullName={profile.full_name} />
      <main className="flex-1 overflow-auto p-8 max-w-[1400px]">
        {children}
      </main>
    </div>
  )
}
