'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

interface SidebarProps {
  role: UserRole
  fullName: string | null
}

const OWNER_NAV = [
  { href: '/pricebook', label: 'Price Book' },
  { href: '/import', label: 'Import' },
  { href: '/calculators', label: 'Calculators' },
  { href: '/bom', label: 'New Quote' },
]

const EMPLOYEE_NAV = [
  { href: '/bom', label: 'New Quote' },
]

export function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = role === 'owner' ? OWNER_NAV : EMPLOYEE_NAV

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-screen px-4 py-6"
      style={{ backgroundColor: '#1B4332' }}
    >
      <div className="mb-8 px-3">
        <h1 className="text-base font-semibold leading-tight" style={{ color: '#F0F0F0' }}>
          Fence Magic
        </h1>
      </div>

      <nav className="flex-1 space-y-0.5">
        {nav.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                color: '#F0F0F0',
                backgroundColor: active ? 'rgba(45,106,79,0.5)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="pt-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <p className="px-3 text-xs truncate" style={{ color: 'rgba(240,240,240,0.5)' }}>{fullName ?? 'Account'}</p>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors"
          style={{ color: 'rgba(240,240,240,0.7)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
