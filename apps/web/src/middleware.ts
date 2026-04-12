import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Use a cookie named "access_token" or whatever our framework eventually settles on.
  // Next-intl might also have its own routing logic if we wrap it, but for now this is a standalone route protection.
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/register', '/', '/health']
  const isPublic = publicPaths.some(p => pathname.startsWith(p)) || pathname.match(/\.(.*)$/)

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
