'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const ACQUISITION_STORAGE_KEY = 'nofeego:first-case-attribution';

export type AcquisitionDraft = {
  sessionId: string;
  landingPath: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

const clean = (value: string | null, limit: number) => value?.trim().slice(0, limit) || null;

export function AcquisitionCapture() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const hasCampaign = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].some((key) => search.has(key));
    if (!hasCampaign && window.localStorage.getItem(ACQUISITION_STORAGE_KEY)) return;
    let referrerHost: string | null = null;
    try { referrerHost = document.referrer ? new URL(document.referrer).host.slice(0, 255) : null; } catch {}
    const prior = JSON.parse(window.localStorage.getItem(ACQUISITION_STORAGE_KEY) ?? 'null') as AcquisitionDraft | null;
    const draft: AcquisitionDraft = {
      sessionId: prior?.sessionId ?? crypto.randomUUID(),
      landingPath: pathname.slice(0, 300),
      referrerHost,
      utmSource: clean(search.get('utm_source'), 120),
      utmMedium: clean(search.get('utm_medium'), 120),
      utmCampaign: clean(search.get('utm_campaign'), 160),
      utmContent: clean(search.get('utm_content'), 160),
      utmTerm: clean(search.get('utm_term'), 160),
    };
    window.localStorage.setItem(ACQUISITION_STORAGE_KEY, JSON.stringify(draft));
  }, [pathname, search]);
  return null;
}
