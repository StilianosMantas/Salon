import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const sub  = host.split('.')[0]
  if (sub && sub !== 'www' && sub !== 'salon') {
    const url = request.nextUrl.clone()
    url.pathname = `/_tenant/${sub}${url.pathname}`
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}