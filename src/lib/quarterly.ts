export type QuarterlyPoint = {
  key: string;
  label: string;
  value: number;
};

function quarterKey(date: Date): { key: string; year: number; quarter: number } {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return { key: `${date.getFullYear()}-Q${quarter}`, year: date.getFullYear(), quarter };
}

/**
 * Collapses a player's value history into one point per calendar quarter —
 * whichever value was in effect at the end of that quarter — so the trend
 * reads as "up, down, or flat each quarter" rather than a noisy raw history.
 * Requires values ordered oldest first: later entries overwrite earlier ones
 * within the same quarter, leaving the quarter's closing value.
 */
export function quarterlySeries(
  marketValues: { valueUsd: number; effectiveAt: Date }[],
): QuarterlyPoint[] {
  const byQuarter = new Map<string, QuarterlyPoint>();

  for (const { valueUsd, effectiveAt } of marketValues) {
    const { key, quarter } = quarterKey(effectiveAt);
    byQuarter.set(key, { key, label: `${effectiveAt.getFullYear()} T${quarter}`, value: valueUsd });
  }

  return [...byQuarter.values()].sort((a, b) => a.key.localeCompare(b.key));
}
