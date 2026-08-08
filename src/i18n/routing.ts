import { defineRouting } from "next-intl/routing";

export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "fr",
});

export const rtlLocales: Locale[] = ["ar"];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale as Locale);
}

export const localeLabels: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};
