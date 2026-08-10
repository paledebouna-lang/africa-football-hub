import { Link } from "@/i18n/navigation";
import { Crest } from "@/components/ui/media";

export type FixtureEntry = {
  id: string;
  dateLabel: string;
  matchdayLabel: string | null;
  homeSlug: string;
  homeName: string;
  homeLogoUrl: string | null;
  awaySlug: string;
  awayName: string;
  awayLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

/** Shared match list for club and national-team fixtures — score or "—" when unplayed. */
export function FixturesList({
  fixtures,
  hrefPrefix,
  upcomingLabel,
}: {
  fixtures: FixtureEntry[];
  hrefPrefix: "/clubs" | "/national-teams";
  upcomingLabel: string;
}) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-surface">
      {fixtures.map((fixture) => (
        <div
          key={fixture.id}
          className="flex flex-wrap items-center gap-3 p-3 text-sm"
        >
          <span className="w-24 shrink-0 text-xs text-muted">
            {fixture.dateLabel}
            {fixture.matchdayLabel && (
              <span className="block">{fixture.matchdayLabel}</span>
            )}
          </span>
          <Link
            href={`${hrefPrefix}/${fixture.homeSlug}`}
            className="flex min-w-0 flex-1 items-center justify-end gap-2 text-end font-medium hover:text-brand"
          >
            <span className="truncate">{fixture.homeName}</span>
            <Crest src={fixture.homeLogoUrl} name={fixture.homeName} size="sm" />
          </Link>
          <span className="shrink-0 rounded-md bg-brand/5 px-2.5 py-1 text-center font-bold tabular-nums">
            {fixture.homeScore === null || fixture.awayScore === null
              ? upcomingLabel
              : `${fixture.homeScore} – ${fixture.awayScore}`}
          </span>
          <Link
            href={`${hrefPrefix}/${fixture.awaySlug}`}
            className="flex min-w-0 flex-1 items-center gap-2 font-medium hover:text-brand"
          >
            <Crest src={fixture.awayLogoUrl} name={fixture.awayName} size="sm" />
            <span className="truncate">{fixture.awayName}</span>
          </Link>
        </div>
      ))}
    </div>
  );
}
