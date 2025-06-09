import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip middleware auth check entirely - let layout handle it
  // This reduces the double auth check bottleneck

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}