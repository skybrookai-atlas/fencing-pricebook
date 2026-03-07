/**
 * PUT  /api/fence-types/[id] — Update a fence type. Owner-only.
 * DELETE /api/fence-types/[id] — Delete a fence type. Owner-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function makeAuthClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* server component */ }
        },
      },
    }
  )
}

function makeServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

async function ownerCheck(authClient: ReturnType<typeof makeAuthClient>, db: ReturnType<typeof makeServiceClient>) {
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorised' } as const
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return { ok: false, status: 403, error: 'Forbidden' } as const
  return { ok: true } as const
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const authClient = makeAuthClient(cookieStore)
  const db = makeServiceClient()

  const check = await ownerCheck(authClient, db)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await request.json()
  const { name, labour_rate_per_unit, margin_percent, materials } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const { data: fenceType, error } = await db
    .from('fence_types')
    .update({
      name: name.trim(),
      labour_rate_per_unit: labour_rate_per_unit ?? null,
      margin_percent: margin_percent ?? 42,
      materials: materials ?? [],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!fenceType) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ fenceType })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const authClient = makeAuthClient(cookieStore)
  const db = makeServiceClient()

  const check = await ownerCheck(authClient, db)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { error } = await db.from('fence_types').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
