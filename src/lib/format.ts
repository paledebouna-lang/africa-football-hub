import type { Locale } from "@/i18n/routing";

const INTL_LOCALES: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-EG",
};

/** Formats a value in euros as a compact market value, e.g. "1,2 M €" / "450 k €". */
export function formatEur(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "—";

  const intlLocale = INTL_LOCALES[locale];
  const formatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return formatter.format(value);
}

/** Formats a value in euros in full, e.g. "1 200 000 €". Used in admin and detail rows. */
export function formatEurFull(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date | null | undefined, locale: Locale): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ageFrom(dateOfBirth: Date | null | undefined): number | null {
  if (!dateOfBirth) return null;

  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}
