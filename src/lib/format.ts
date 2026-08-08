import type { Locale } from "@/i18n/routing";

const INTL_LOCALES: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ar: "ar-EG",
};

/** Compact market value, e.g. "1,2 M $" / "450 k $". Used in dense tables. */
export function formatUsd(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Full value, e.g. "1 200 000 $". Used on profile headers and in the admin. */
export function formatUsdFull(
  value: number | null | undefined,
  locale: Locale,
): string {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency: "USD",
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

/**
 * Calendar age, not an average-days approximation — over 25 years the leap-day
 * drift is enough to report someone as a year younger on their birthday.
 */
export function ageFrom(
  dateOfBirth: Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;

  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

/** Whole calendar months between two dates, floored at the day of month. */
export function monthsUntil(target: Date, now: Date = new Date()): number {
  let months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  if (target.getDate() < now.getDate()) months -= 1;
  return months;
}
