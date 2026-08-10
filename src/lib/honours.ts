import type { Locale } from "@/i18n/routing";
import { localizedName } from "@/lib/localized";

export type HonourRow = {
  id: string;
  type: string;
  year: number;
  seasonLabel: string | null;
  titleFr: string | null;
  titleEn: string | null;
  titleAr: string | null;
  competition: { nameFr: string; nameEn: string; nameAr: string } | null;
};

export type HonourGroup = { label: string; type: string; years: number[] };

/**
 * Groups identical titles so a club that won its league eight times shows one
 * line with a count, the way any honours board does — rather than eight rows.
 * Shared by the full honours list and the compact header trophy strip.
 */
export function groupHonours(honours: HonourRow[], locale: Locale): HonourGroup[] {
  const labelOf = (honour: HonourRow): string => {
    if (honour.competition) return localizedName(honour.competition, locale);

    const byLocale: Record<Locale, string | null> = {
      fr: honour.titleFr,
      en: honour.titleEn,
      ar: honour.titleAr,
    };
    return byLocale[locale] || honour.titleFr || honour.titleEn || "—";
  };

  const groups = new Map<string, HonourGroup>();

  for (const honour of honours) {
    const label = labelOf(honour);
    const key = `${label}::${honour.type}`;
    const existing = groups.get(key);

    if (existing) {
      existing.years.push(honour.year);
    } else {
      groups.set(key, { label, type: honour.type, years: [honour.year] });
    }
  }

  return [...groups.values()]
    .map((group) => ({ ...group, years: group.years.sort((a, b) => b - a) }))
    .sort((a, b) => b.years.length - a.years.length || b.years[0] - a.years[0]);
}
