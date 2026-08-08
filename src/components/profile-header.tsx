/**
 * The banner that opens a player, club or coach profile: identity on the left,
 * headline figure on the right. Familiar from every football database, which is
 * the point — visitors should not have to learn a new layout.
 */
export function ProfileHeader({
  media,
  breadcrumb,
  title,
  subtitle,
  figureLabel,
  figure,
  figureNote,
  badges,
}: {
  media: React.ReactNode;
  breadcrumb?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  figureLabel?: string;
  figure?: string;
  figureNote?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="h-1.5 bg-brand" />

      <div className="flex flex-wrap items-start gap-5 p-5">
        <div className="shrink-0">{media}</div>

        <div className="min-w-0 flex-1">
          {breadcrumb && <div className="text-sm text-muted">{breadcrumb}</div>}

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>

          {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
          {badges && <div className="mt-3 flex flex-wrap gap-2">{badges}</div>}
        </div>

        {figure && (
          <div className="w-full shrink-0 rounded-md bg-brand/5 p-4 text-center sm:w-auto sm:min-w-44 sm:text-end">
            {figureLabel && (
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {figureLabel}
              </p>
            )}
            <p className="mt-1 text-2xl font-bold text-brand">{figure}</p>
            {figureNote && (
              <div className="mt-1 text-xs text-muted">{figureNote}</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "accent";
}) {
  const tones = {
    neutral: "border-border bg-background text-muted",
    brand: "border-brand/30 bg-brand/10 text-brand",
    accent: "border-accent/30 bg-accent/10 text-accent",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Label/value pair used in the fact grids under a profile header. */
export function DataPoint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border px-4 py-2.5 last:border-b-0 sm:border-b-0 sm:border-e sm:last:border-e-0">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

export function DataGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </dl>
  );
}
