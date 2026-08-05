export const supportedLocales = ["en", "zh", "es"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

export const localeMetadata: Record<Locale, { label: string; htmlLang: string }> = {
  en: { label: "English", htmlLang: "en" },
  zh: { label: "Chinese", htmlLang: "zh" },
  es: { label: "Spanish", htmlLang: "es" },
};

export function isSupportedLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}
