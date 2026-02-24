import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'site_access';

// Routes that bypass password protection (exact match or segment-bounded prefix)
const PUBLIC_PATHS = ['/password', '/api/site-access', '/api/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function isValidRedirectPath(path: string): boolean {
  // Only allow relative paths starting with / and no protocol-relative URLs
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip password check if no SITE_PASSWORD is configured (dev mode / disabled)
  if (!process.env.SITE_PASSWORD) {
    return NextResponse.next();
  }

  // Allow public paths and static assets
  if (
    isPublicPath(pathname) ||
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

  // Redirect to password page with validated next path
  const passwordUrl = new URL('/password', request.url);
  if (isValidRedirectPath(pathname)) {
    passwordUrl.searchParams.set('next', pathname);
  }
  return NextResponse.redirect(passwordUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
