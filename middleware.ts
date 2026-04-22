import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

/**
 * Edge-layer guard for admin and submit routes.
 * Fine-grained role checks are still performed in layouts/server actions —
 * this just rejects unauthenticated requests early and sends them to login.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // Block submitter role from admin area at the edge. The layout also checks,
  // but catching it here avoids rendering admin shell HTML for no reason.
  if (pathname.startsWith('/admin')) {
    const role = (token as { role?: string }).role
    if (role !== 'super_admin' && role !== 'editor') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/submit'],
}
