'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { ZH_PLACEHOLDERS, translateUiText } from '@/lib/i18n/messages';

type Locale = 'en' | 'zh-Hans';
const LocaleContext = createContext<Locale>('en');

function localizeHref(href: string, locale: Locale) {
  if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/') || href.startsWith('/_next/')) return href;
  const [path, suffix = ''] = href.split(/(?=[?#])/);
  if (locale === 'zh-Hans') return `${path === '/' ? '/zh-hans' : `/zh-hans${path}`}${suffix}`;
  return `${path.replace(/^\/zh-hans(?=\/|$)/, '') || '/'}${suffix}`;
}

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale === 'zh-Hans' ? 'zh-Hans' : 'en';
    document.cookie = `nofeego_locale=${locale};path=/;max-age=31536000;samesite=lax`;
    if (locale !== 'zh-Hans') return;
    const originalConfirm = window.confirm.bind(window);
    const originalAlert = window.alert.bind(window);
    window.confirm = (message) => originalConfirm(typeof message === 'string' ? translateUiText(message) : message);
    window.alert = (message) => originalAlert(typeof message === 'string' ? translateUiText(message) : message);

    const translateElement = (root: ParentNode) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      for (const node of nodes) {
        if (node.parentElement?.closest('script,style,[data-no-translate]')) continue;
        const translated = translateUiText(node.data);
        if (translated !== node.data) node.data = translated;
      }
      for (const element of root.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]')) {
        for (const attribute of ['placeholder', 'aria-label', 'title']) {
          const value = element.getAttribute(attribute);
          if (!value) continue;
          const translated = ZH_PLACEHOLDERS[value] ?? translateUiText(value);
          if (translated !== value) element.setAttribute(attribute, translated);
        }
      }
      for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) anchor.setAttribute('href', localizeHref(anchor.getAttribute('href') ?? '', locale));
    };

    translateElement(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') {
          const text = record.target as Text;
          const translated = translateUiText(text.data);
          if (translated !== text.data) text.data = translated;
        }
        if (record.type === 'attributes' && record.target instanceof HTMLElement) translateElement(record.target);
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node as Text;
            const translated = translateUiText(text.data);
            if (translated !== text.data) text.data = translated;
          } else if (node instanceof HTMLElement) translateElement(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'href'], subtree: true });
    return () => { observer.disconnect(); window.confirm = originalConfirm; window.alert = originalAlert; };
  }, [locale]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useLocalizedPath() {
  const locale = useLocale();
  return useMemo(() => (href: string) => localizeHref(href, locale), [locale]);
}
