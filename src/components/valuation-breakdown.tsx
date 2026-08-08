import type { CriterionScore } from "@/lib/valuation";
import { VALUATION_WEIGHTS } from "@/lib/valuation";

export type Breakdown = {
  baseUsd: number;
  criteria: CriterionScore[];
};

/**
 * Shows how an estimate was reached. An unexplained number invites suspicion;
 * a number you can audit invites trust — which is the whole point for a platform
 * that wants recruiters to take its valuations seriously.
 */
export function ValuationBreakdown({
  breakdown,
  confidence,
  labels,
  formatValue,
  criterionLabel,
}: {
  breakdown: Breakdown;
  confidence: number;
  labels: {
    title: string;
    base: string;
    criterion: string;
    weight: string;
    effect: string;
    missing: string;
    confidence: string;
  };
  formatValue: (value: number) => string;
  criterionLabel: (criterion: string) => string;
}) {
  const used = new Set(breakdown.criteria.map((item) => item.criterion));
  const missing = (Object.keys(VALUATION_WEIGHTS) as (keyof typeof VALUATION_WEIGHTS)[])
    .filter((criterion) => !used.has(criterion));

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        {labels.title}
      </summary>

      <div className="border-t border-border px-4 py-4 space-y-4">
        <p className="text-sm">
          {labels.base} <strong>{formatValue(breakdown.baseUsd)}</strong>
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 text-start font-medium">{labels.criterion}</th>
                <th className="py-2 text-end font-medium">{labels.weight}</th>
                <th className="py-2 text-end font-medium">{labels.effect}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breakdown.criteria.map((item) => (
                <tr key={item.criterion}>
                  <td className="py-2">
                    {criterionLabel(item.criterion)}
                    <span className="block text-xs text-muted">{item.label}</span>
                  </td>
                  <td className="py-2 text-end tabular-nums text-muted">
                    {item.weight} %
                  </td>
                  <td
                    className={`py-2 text-end tabular-nums font-medium ${
                      item.score > 0
                        ? "text-brand"
                        : item.score < 0
                          ? "text-danger"
                          : "text-muted"
                    }`}
                  >
                    {item.score > 0 ? "+" : ""}
                    {Math.round(item.score * 100)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {missing.length > 0 && (
          <p className="text-xs text-muted">
            {labels.missing} {missing.map(criterionLabel).join(", ")}
          </p>
        )}

        <p className="text-xs text-muted">
          {labels.confidence.replace("{percent}", String(Math.round(confidence * 100)))}
        </p>
      </div>
    </details>
  );
}
