import type { QuarterlyPoint } from "@/lib/quarterly";

const UP = "#22c55e";
const DOWN = "#ef4444";
const FLAT = "var(--color-muted)";

/**
 * One bar per quarter, coloured by movement versus the previous quarter —
 * green up, red down, grey flat — so "did this player's value move this
 * quarter" reads at a glance, distinct from the full ValueChart history line.
 */
export function QuarterlyValueChart({
  points,
  formatValue,
}: {
  points: QuarterlyPoint[];
  formatValue: (value: number) => string;
}) {
  if (points.length < 2) return null;

  const width = 480;
  const height = 140;
  const padding = { top: 10, right: 8, bottom: 22, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...points.map((p) => p.value));
  const minValue = Math.min(0, ...points.map((p) => p.value));
  const range = maxValue - minValue || maxValue || 1;

  const barWidth = innerWidth / points.length;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[20rem]"
        role="img"
        aria-label="Évolution trimestrielle de la valeur marchande"
      >
        {points.map((point, index) => {
          const previous = points[index - 1];
          const color = !previous
            ? FLAT
            : point.value > previous.value
              ? UP
              : point.value < previous.value
                ? DOWN
                : FLAT;

          const barHeight = (point.value / range) * innerHeight;
          const x = padding.left + index * barWidth;
          const y = padding.top + innerHeight - barHeight;

          return (
            <g key={point.key}>
              <rect
                x={x + barWidth * 0.15}
                y={y}
                width={barWidth * 0.7}
                height={Math.max(barHeight, 2)}
                rx="2"
                fill={color}
              >
                <title>{`${point.label} — ${formatValue(point.value)}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={height - 6}
                fill="var(--color-muted)"
                fontSize="10"
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
