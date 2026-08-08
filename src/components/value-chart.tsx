type Point = { date: Date; value: number };

/**
 * Market value history as an inline SVG line chart.
 * Rendered server-side: no charting library, no client JS.
 */
export function ValueChart({
  points,
  formatValue,
  formatDate,
}: {
  points: Point[];
  formatValue: (value: number) => string;
  formatDate: (date: Date) => string;
}) {
  if (points.length < 2) return null;

  const width = 640;
  const height = 200;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };

  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || maxValue || 1;

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const coords = points.map((point, index) => {
    const x = padding.left + (index / (points.length - 1)) * innerWidth;
    const y =
      padding.top + innerHeight - ((point.value - minValue) / valueRange) * innerHeight;
    return { x, y, point };
  });

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${
    padding.top + innerHeight
  } L ${coords[0].x} ${padding.top + innerHeight} Z`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[20rem]"
        role="img"
        aria-label={`${formatValue(minValue)} – ${formatValue(maxValue)}`}
      >
        <path d={areaPath} fill="var(--color-brand)" opacity="0.12" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((coord) => (
          <circle
            key={coord.point.date.toISOString()}
            cx={coord.x}
            cy={coord.y}
            r="3.5"
            fill="var(--color-surface)"
            stroke="var(--color-brand)"
            strokeWidth="2"
          >
            <title>{`${formatDate(coord.point.date)} — ${formatValue(
              coord.point.value,
            )}`}</title>
          </circle>
        ))}
        <text
          x={coords[0].x}
          y={height - 8}
          fill="var(--color-muted)"
          fontSize="12"
          textAnchor="start"
        >
          {formatDate(points[0].date)}
        </text>
        <text
          x={coords[coords.length - 1].x}
          y={height - 8}
          fill="var(--color-muted)"
          fontSize="12"
          textAnchor="end"
        >
          {formatDate(points[points.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}
