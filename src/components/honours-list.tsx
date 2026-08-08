import type { Locale } from "@/i18n/routing";
import { localizedName } from "@/lib/localized";

type HonourRow = {
  id: string;
  type: string;
  year: number;
  seasonLabel: string | null;
  titleFr: string | null;
  titleEn: string | null;
  titleAr: string | null;
  competition: { nameFr: string; nameEn: string; nameAr: string } | null;
};

/**
 * Groups identical titles so a club that won its league eight times shows one
 * line with a count, the way any honours board does — rather than eight rows.
 */
export function HonoursList({
  honours,
  locale,
  typeLabel,
  emptyLabel,
}: {
  honours: HonourRow[];
  locale: Locale;
  typeLabel: (type: string) => string;
  emptyLabel: string;
}) {
  if (honours.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  const labelOf = (honour: HonourRow): string => {
    if (honour.competition) return localizedName(honour.competition, locale);

    const byLocale: Record<Locale, string | null> = {
      fr: honour.titleFr,
      en: honour.titleEn,
      ar: honour.titleAr,
    };
    return byLocale[locale] || honour.titleFr || honour.titleEn || "—";
  };

  const groups = new Map<
    string,
    { label: string; type: string; years: number[] }
  >();

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

  const rows = [...groups.values()]
    .map((group) => ({ ...group, years: group.years.sort((a, b) => b - a) }))
    .sort((a, b) => b.years.length - a.years.length || b.years[0] - a.years[0]);

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {rows.map((row) => (
        <li key={`${row.label}-${row.type}`} className="p-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">
              {row.label}
              <span className="ms-2 text-xs font-normal text-muted">
                {typeLabel(row.type)}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
              ×{row.years.length}
            </span>
          </div>
          <p className="mt-1 text-xs tabular-nums text-muted">
            {row.years.join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
