/**
 * Where on the pitch a player lines up, as a vertical diagram (attacking
 * goal at the top). A green star marks the main position, orange stars mark
 * every secondary one — deliberately simple shapes rather than photo-real
 * icons, since this is original artwork, not a copy of any reference site.
 */
const COORDS: Record<string, { x: number; y: number }> = {
  GK: { x: 50, y: 92 },
  CB: { x: 50, y: 76 },
  LB: { x: 14, y: 72 },
  RB: { x: 86, y: 72 },
  DM: { x: 50, y: 58 },
  CM: { x: 50, y: 44 },
  AM: { x: 50, y: 30 },
  LW: { x: 16, y: 18 },
  RW: { x: 84, y: 18 },
  ST: { x: 50, y: 8 },
};

function Star({
  x,
  y,
  color,
  size,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
}) {
  // A 5-point star path, centered at the origin, then translated into place.
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? size : size * 0.42;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
  }).join(" ");

  return (
    <polygon
      points={points}
      fill={color}
      stroke="var(--color-surface)"
      strokeWidth="1"
    />
  );
}

export function PositionPitch({
  position,
  secondaryPositions = [],
  positionLabel,
  legend,
}: {
  position: string | null;
  secondaryPositions?: string[];
  positionLabel: (code: string) => string;
  legend: { main: string; secondary: string };
}) {
  const width = 200;
  const height = 280;
  const toPx = (pt: { x: number; y: number }) => ({
    x: (pt.x / 100) * width,
    y: (pt.y / 100) * height,
  });

  const mainCoord = position ? COORDS[position] : null;
  const secondaryCoords = secondaryPositions
    .filter((code) => code !== position && COORDS[code])
    .map((code) => ({ code, ...COORDS[code] }));

  if (!mainCoord && secondaryCoords.length === 0) return null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full max-w-[220px]"
        role="img"
        aria-label={position ? positionLabel(position) : ""}
      >
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="6"
          fill="var(--color-brand-strong)"
        />
        <rect
          x="4"
          y="4"
          width={width - 8}
          height={height - 8}
          fill="none"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <line
          x1="4"
          y1={height / 2}
          x2={width - 4}
          y2={height / 2}
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <circle
          cx={width / 2}
          cy={height / 2}
          r="26"
          fill="none"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        {/* Attacking box, top */}
        <rect
          x={width / 2 - 55}
          y="4"
          width="110"
          height="46"
          fill="none"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        {/* Defensive box, bottom */}
        <rect
          x={width / 2 - 55}
          y={height - 50}
          width="110"
          height="46"
          fill="none"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />

        {secondaryCoords.map(({ code, ...pt }) => {
          const p = toPx(pt);
          return <Star key={code} x={p.x} y={p.y} color="#f97316" size={9} />;
        })}
        {mainCoord && (
          <Star x={toPx(mainCoord).x} y={toPx(mainCoord).y} color="#22c55e" size={12} />
        )}
      </svg>

      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        {mainCoord && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="text-sm text-[#22c55e]">
              ★
            </span>
            {legend.main} — {positionLabel(position!)}
          </span>
        )}
        {secondaryCoords.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="text-sm text-[#f97316]">
              ★
            </span>
            {legend.secondary} —{" "}
            {secondaryCoords.map(({ code }) => positionLabel(code)).join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
