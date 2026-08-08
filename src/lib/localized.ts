import type { Locale } from "@/i18n/routing";

type Translatable = {
  nameFr: string;
  nameEn: string;
  nameAr: string;
};

/** Picks the name matching the active locale, falling back to French then English. */
export function localizedName(entity: Translatable, locale: Locale): string {
  const byLocale: Record<Locale, string> = {
    fr: entity.nameFr,
    en: entity.nameEn,
    ar: entity.nameAr,
  };
  return byLocale[locale] || entity.nameFr || entity.nameEn;
}

/** Player names are stored once in Latin script, with an optional Arabic spelling. */
export function playerName(
  player: { name: string; nameAr: string | null },
  locale: Locale,
): string {
  if (locale === "ar" && player.nameAr) return player.nameAr;
  return player.name;
}
