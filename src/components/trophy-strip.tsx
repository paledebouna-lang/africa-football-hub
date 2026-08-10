import type { Locale } from "@/i18n/routing";
import { groupHonours, type HonourRow } from "@/lib/honours";

const TYPE_ICON: Record<string, string> = {
  WINNER: "🏆",
  RUNNER_UP: "🥈",
  THIRD_PLACE: "🥉",
  PROMOTION: "⬆️",
  INDIVIDUAL_AWARD: "⭐",
};

/**
 * Compact trophy badges for a profile header — an original design (emoji +
 * count pill), not a copy of any reference site's icon set. Shows the most
 * significant honours first; the full breakdown lives in the honours
 * section further down the page.
 */
export function TrophyStrip({
  honours,
  locale,
  max = 6,
}: {
  honours: HonourRow[];
  locale: Locale;
  max?: number;
}) {
  if (honours.length === 0) return null;

  const groups = groupHonours(honours, locale).slice(0, max);

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <span
          key={`${group.label}-${group.type}`}
          title={`${group.label} (${group.years.join(", ")})`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium"
        >
          <span aria-hidden>{TYPE_ICON[group.type] ?? "🏅"}</span>
          <span className="max-w-32 truncate sm:max-w-44">{group.label}</span>
          {group.years.length > 1 && (
            <span className="shrink-0 rounded-full bg-accent/10 px-1.5 text-accent">
              ×{group.years.length}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
