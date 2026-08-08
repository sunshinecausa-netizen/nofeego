import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'nofeego_site_access';

async function accessToken(username: string, password: string) {
  const bytes = new TextEncoder().encode(`nofeego:${username}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function proxy(request: NextRequest) {
  if (process.env.SITE_PROTECTION_ENABLED !== 'true') {
    return NextResponse.next();
  }

  const expectedUsername = process.env.SITE_PROTECTION_USERNAME;
  const expectedPassword = process.env.SITE_PROTECTION_PASSWORD;

  const loginUrl = new URL('/site-access', request.url);
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (requestedPath !== '/') loginUrl.searchParams.set('next', requestedPath);

  // Fail closed when protection is enabled but credentials are incomplete.
  if (!expectedUsername || !expectedPassword) {
    return NextResponse.redirect(loginUrl);
  }

  const expectedToken = await accessToken(expectedUsername, expectedPassword);
  if (request.cookies.get(ACCESS_COOKIE)?.value === expectedToken) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api/site-access|site-access|_next/static|_next/image|favicon.ico).*)'],
};
