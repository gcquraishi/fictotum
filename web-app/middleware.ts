import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'site_access';

// Routes that bypass password protection
const PUBLIC_PATHS = ['/password', '/api/site-access'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip password check if no SITE_PASSWORD is configured (dev mode / disabled)
  if (!process.env.SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Check for access cookie
  const accessCookie = request.cookies.get(COOKIE_NAME);
  if (accessCookie?.value === 'granted') {
    return NextResponse.next();
  }

  // Redirect to password page
  const passwordUrl = new URL('/password', request.url);
  passwordUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(passwordUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
