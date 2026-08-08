import { NextRequest, NextResponse } from 'next/server';

const PROTECTION_REALM = 'NoFeeGo Private Preview';

function unauthorized() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'Cache-Control': 'no-store',
      'WWW-Authenticate': `Basic realm="${PROTECTION_REALM}", charset="UTF-8"`,
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

export function proxy(request: NextRequest) {
  if (process.env.SITE_PROTECTION_ENABLED !== 'true') {
    return NextResponse.next();
  }

  const expectedUsername = process.env.SITE_PROTECTION_USERNAME;
  const expectedPassword = process.env.SITE_PROTECTION_PASSWORD;

  // Fail closed when protection is enabled but credentials are incomplete.
  if (!expectedUsername || !expectedPassword) {
    return unauthorized();
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const credentials = atob(authorization.slice(6));
    const separator = credentials.indexOf(':');
    const username = separator >= 0 ? credentials.slice(0, separator) : '';
    const password = separator >= 0 ? credentials.slice(separator + 1) : '';

    if (username === expectedUsername && password === expectedPassword) {
      const response = NextResponse.next();
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return response;
    }
  } catch {
    // Invalid Base64 credentials are handled as an unauthorized request.
  }

  return unauthorized();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
