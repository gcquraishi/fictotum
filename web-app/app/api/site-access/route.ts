import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual, createHmac } from 'crypto';

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function generateAccessToken(): string {
  const secret = process.env.SITE_PASSWORD || '';
  return createHmac('sha256', secret).update('site_access_granted').digest('hex');
}

export function verifyAccessToken(token: string): boolean {
  const expected = generateAccessToken();
  return timingSafeCompare(token, expected);
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: 'Password protection not configured' }, { status: 500 });
  }

  if (typeof password !== 'string' || !timingSafeCompare(password, process.env.SITE_PASSWORD)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = generateAccessToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set('site_access', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
