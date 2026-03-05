import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'site_access';

async function verifyAccessToken(token: string): Promise<boolean> {
  const secret = process.env.SITE_PASSWORD || '';
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('site_access_granted'));
  const expected = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

// Routes that bypass password protection (exact match or segment-bounded prefix)
const PUBLIC_PATHS = ['/password', '/api/site-access', '/api/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function isValidRedirectPath(path: string): boolean {
  // Only allow relative paths starting with / and no protocol-relative URLs
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export async function middleware(request: NextRequest) {
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

  // Check for access cookie (HMAC-signed token)
  const accessCookie = request.cookies.get(COOKIE_NAME);
  if (accessCookie?.value && await verifyAccessToken(accessCookie.value)) {
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
