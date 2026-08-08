import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'nofeego_site_access';

async function accessToken(username: string, password: string) {
  const bytes = new TextEncoder().encode(`nofeego:${username}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeDestination(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/buildings';
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  const destination = safeDestination(form.get('next'));
  const expectedUsername = process.env.SITE_PROTECTION_USERNAME;
  const expectedPassword = process.env.SITE_PROTECTION_PASSWORD;

  if (!expectedUsername || !expectedPassword || username !== expectedUsername || password !== expectedPassword) {
    const loginUrl = new URL('/site-access', request.url);
    loginUrl.searchParams.set('error', '1');
    loginUrl.searchParams.set('next', destination);
    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(ACCESS_COOKIE, await accessToken(expectedUsername, expectedPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
