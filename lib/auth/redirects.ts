const DEFAULT_AFTER_SIGN_IN = '/dashboard';

export function safeAuthNext(candidate: string | null | undefined) {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  try {
    const parsed = new URL(candidate, 'https://auth-redirect.invalid');
    return parsed.origin === 'https://auth-redirect.invalid'
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : DEFAULT_AFTER_SIGN_IN;
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
}

export function authCallbackUrl(origin: string, next?: string | null) {
  const trustedOrigin = new URL(origin);
  if (trustedOrigin.protocol !== 'https:' && trustedOrigin.hostname !== 'localhost' && trustedOrigin.hostname !== '127.0.0.1') {
    throw new Error('AUTH_CALLBACK_ORIGIN_NOT_ALLOWED');
  }
  return next
    ? `${trustedOrigin.origin}/auth/callback?next=${encodeURIComponent(safeAuthNext(next))}`
    : `${trustedOrigin.origin}/auth/callback`;
}
