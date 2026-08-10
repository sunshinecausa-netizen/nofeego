import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'nofeego_site_access';

async function accessToken(username: string, password: string) {
  const bytes = new TextEncoder().encode(`nofeego:${username}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function proxy(request: NextRequest) {
  const requestedChinese = request.nextUrl.pathname === '/zh-hans' || request.nextUrl.pathname.startsWith('/zh-hans/');
  const prefersChinese = request.cookies.get('nofeego_locale')?.value === 'zh-Hans';
  if (!requestedChinese && prefersChinese && request.nextUrl.pathname !== '/site-access' && !request.nextUrl.pathname.startsWith('/api/')) {
    const localizedUrl = request.nextUrl.clone();
    localizedUrl.pathname = request.nextUrl.pathname === '/' ? '/zh-hans' : `/zh-hans${request.nextUrl.pathname}`;
    return NextResponse.redirect(localizedUrl);
  }
  const isChinese = requestedChinese;
  const targetUrl = request.nextUrl.clone();
  if (isChinese) targetUrl.pathname = request.nextUrl.pathname.replace(/^\/zh-hans(?=\/|$)/, '') || '/';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nofeego-locale', isChinese ? 'zh-Hans' : 'en');
  const localizedResponse = () => isChinese
    ? NextResponse.rewrite(targetUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });

  if (targetUrl.pathname === '/site-access' || process.env.SITE_PROTECTION_ENABLED !== 'true') return localizedResponse();

  const expectedUsername = process.env.SITE_PROTECTION_USERNAME;
  const expectedPassword = process.env.SITE_PROTECTION_PASSWORD;

  const loginUrl = new URL(isChinese ? '/zh-hans/site-access' : '/site-access', request.url);
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (requestedPath !== '/') loginUrl.searchParams.set('next', requestedPath);

  // Fail closed when protection is enabled but credentials are incomplete.
  if (!expectedUsername || !expectedPassword) {
    return NextResponse.redirect(loginUrl);
  }

  const expectedToken = await accessToken(expectedUsername, expectedPassword);
  if (request.cookies.get(ACCESS_COOKIE)?.value === expectedToken) {
    const response = localizedResponse();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api/site-access|_next/static|_next/image|favicon.ico).*)'],
};
