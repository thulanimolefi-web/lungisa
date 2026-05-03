import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/home', '/post', '/dashboard', '/admin']

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const token = req.cookies.get('sb-mqosleyebcwwhlhcgdqh-auth-token')

  // If accessing protected page without session → redirect to auth
  if (PROTECTED.some(p => path.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/home/:path*', '/post/:path*', '/dashboard/:path*', '/admin/:path*'],
}