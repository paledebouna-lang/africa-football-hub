import type { CriterionScore, ValuationCriterion } from "@/lib/valuation";
import { VALUATION_WEIGHTS } from "@/lib/valuation";

const AXES = Object.keys(VALUATION_WEIGHTS) as ValuationCriterion[];

/**
 * Six-axis radar of the criteria behind a player's valuation. Rendered
 * server-side as inline SVG, same approach as ValueChart: no charting
 * library, no client JS.
 *
 * Every axis is always drawn, in a fixed order, so the same shape means the
 * same thing across every player page. Only criteria with real data are
 * plotted and connected — an axis with nothing on it keeps its spoke and
 * label but no vertex, which is the honest way to show "not available"
 * rather than faking a neutral score.
 */
export function PerformanceRadar({
  criteria,
  axisLabel,
  title,
}: {
  criteria: CriterionScore[];
  /** Short label for the chart itself — table-style criterion names are too long to fit along an axis. */
  axisLabel: (criterion: string) => string;
  title: string;
}) {
  if (criteria.length === 0) return null;

  const byCriterion = new Map(criteria.map((item) => [item.criterion, item]));

  const width = 440;
  const height = 300;
  const center = { x: width / 2, y: height / 2 };
  const maxRadius = 85;
  const labelRadius = maxRadius + 34;
  const ringFractions = [0.25, 0.5, 0.75, 1];

  const angleFor = (index: number) => (Math.PI * 2 * index) / AXES.length - Math.PI / 2;

  const pointAt = (index: number, radius: number) => {
    const angle = angleFor(index);
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  };

  const ringPath = (fraction: number) =>
    AXES.map((_, index) => {
      const { x, y } = pointAt(index, maxRadius * fraction);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ") + " Z";

  const dataPoints = AXES.map((criterion, index) => {
    const score = byCriterion.get(criterion);
    if (!score) return null;
    const radius = ((score.score + 1) / 2) * maxRadius;
    return { criterion, score, index, ...pointAt(index, radius) };
  });

  const available = dataPoints.filter((p): p is NonNullable<typeof p> => p !== null);
  const dataPath =
    available.length >= 3
      ? available.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
      : null;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full max-w-md"
        role="img"
        aria-label={title}
      >
        {ringFractions.map((fraction) => (
          <path
            key={fraction}
            d={ringPath(fraction)}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}

        {AXES.map((_, index) => {
          const outer = pointAt(index, maxRadius);
          return (
            <line
              key={index}
              x1={center.x}
              y1={center.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
          );
        })}

        {dataPath && (
          <path
            d={dataPath}
            fill="var(--color-brand)"
            fillOpacity="0.18"
            stroke="var(--color-brand)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {available.map((p) => (
          <circle key={p.criterion} cx={p.x} cy={p.y} r="3.5" fill="var(--color-brand)">
            <title>{`${axisLabel(p.criterion)} — ${p.score.label}`}</title>
          </circle>
        ))}

        {AXES.map((criterion, index) => {
          const { x, y } = pointAt(index, labelRadius);
          const anchor = x < center.x - 4 ? "end" : x > center.x + 4 ? "start" : "middle";
          const hasData = byCriterion.has(criterion);
          return (
            <text
              key={criterion}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="12"
              fill={hasData ? "var(--color-foreground)" : "var(--color-muted)"}
            >
              {axisLabel(criterion)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
