import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}

export const config = {
  // Empty matcher — middleware effectively disabled.
  // Admin routes gated via app/admin/layout.tsx (ADMIN_EMAILS allowlist).
  matcher: [],
};
