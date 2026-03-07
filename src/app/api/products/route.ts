/**
 * GET /api/products?q=search_term
 * Returns up to 15 products matching the query (name, description, or product_key).
 * Used by the fence type calculator builder for product search.
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

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const authClient = makeAuthClient(cookieStore)

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ products: [] })

  const db = makeServiceClient()

  const { data: products } = await db
    .from('products')
    .select('product_key, product, description, category, material')
    .or(`product.ilike.%${q}%,description.ilike.%${q}%,product_key.ilike.%${q}%`)
    .order('product')
    .limit(15)

  return NextResponse.json({ products: products ?? [] })
}
