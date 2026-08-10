const ALLOWED_HOSTS = new Set(['streeteasy.com', 'www.streeteasy.com']);

export function validateStreetEasyUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || !url.pathname.startsWith('/building/')) {
    throw new Error('Only public https://streeteasy.com/building/... URLs are supported.');
  }
  url.hash = '';
  return url;
}

export async function fetchPublicBuildingPage(value: string, timeoutMs = 15_000): Promise<{ url: string; html: string }> {
  const url = validateStreetEasyUrl(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'NoFeeGo-Facts-Review/0.1 (+single-page manual import; contact: data-review@nofeego.com)',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`StreetEasy returned HTTP ${response.status}; extraction stopped.`);
    const html = await response.text();
    const lowered = html.toLowerCase();
    if (html.length < 500 || /captcha|verify you are human|access denied|unusual traffic|temporarily blocked/.test(lowered)) {
      throw new Error('StreetEasy presented an access restriction or verification page; extraction stopped without bypassing it.');
    }
    return { url: response.url, html };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error(`StreetEasy request timed out after ${timeoutMs}ms; extraction stopped.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
