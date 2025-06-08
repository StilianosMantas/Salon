import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Only check auth on the main dashboard route, let client-side handle sub-routes
  const pathname = request.nextUrl.pathname
  const isMainDashboard = pathname === '/dashboard'
  const isDashboardSubroute = pathname.startsWith('/dashboard/') && pathname !== '/dashboard'
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Middleware:', { pathname, isMainDashboard, isDashboardSubroute })
  }

  // For dashboard sub-routes, just ensure cookies are properly set but don't redirect
  if (isDashboardSubroute) {
    return supabaseResponse
  }

  // Only check authentication for the main dashboard route
  if (isMainDashboard) {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (!user || error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No user on main dashboard, redirecting to login')
      }
      const redirectUrl = new URL('/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}