import { Link } from "@/i18n/navigation";
import { Crest } from "@/components/ui/media";

export type FixtureEntry = {
  id: string;
  dateLabel: string;
  matchdayLabel: string | null;
  /** Round number, used to group a competition's matches by matchday. */
  matchday?: number | null;
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

/**
 * A competition's matches grouped by matchday ("Journée 1", "Journée 2"…), so
 * a round rescheduled weeks later still sits with its own matchday. The last
 * matchday with a result and the next one to play start open, the rest folded.
 */
export function MatchdayFixtures({
  fixtures,
  hrefPrefix,
  upcomingLabel,
  matchdayTitle,
  otherTitle,
}: {
  fixtures: FixtureEntry[];
  hrefPrefix: "/clubs" | "/national-teams";
  upcomingLabel: string;
  matchdayTitle: (matchday: number) => string;
  otherTitle: string;
}) {
  const byMatchday = new Map<number | null, FixtureEntry[]>();
  for (const fixture of fixtures) {
    const key = fixture.matchday ?? null;
    byMatchday.set(key, [...(byMatchday.get(key) ?? []), { ...fixture, matchdayLabel: null }]);
  }
  const groups = [...byMatchday.entries()].sort(([a], [b]) =>
    a === null ? 1 : b === null ? -1 : a - b,
  );

  const played = (entries: FixtureEntry[]) =>
    entries.some((f) => f.homeScore !== null && f.awayScore !== null);
  const done = (entries: FixtureEntry[]) =>
    entries.every((f) => f.homeScore !== null && f.awayScore !== null);
  const lastPlayed = groups.findLast(([key, entries]) => key !== null && played(entries))?.[0];
  const next = groups.find(([key, entries]) => key !== null && !done(entries))?.[0];

  return (
    <div className="space-y-3">
      {groups.map(([key, entries]) => (
        <details
          key={key ?? "other"}
          open={groups.length === 1 || key === lastPlayed || key === next}
          className="group"
        >
          <summary className="mb-2 flex cursor-pointer list-none items-center justify-between rounded-md bg-brand/5 px-3 py-2 text-sm font-semibold">
            <span>{key === null ? otherTitle : matchdayTitle(key)}</span>
            <span className="text-xs font-normal text-muted">
              {entries.length} <span className="inline-block transition-transform group-open:rotate-180">▾</span>
            </span>
          </summary>
          <FixturesList fixtures={entries} hrefPrefix={hrefPrefix} upcomingLabel={upcomingLabel} />
        </details>
      ))}
    </div>
  );
}
