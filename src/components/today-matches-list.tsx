import { Link } from "@/i18n/navigation";
import { Crest } from "@/components/ui/media";

export type TodayMatchEntry = {
  id: string;
  competitionName: string;
  hrefPrefix: "/clubs" | "/national-teams";
  homeSlug: string;
  homeName: string;
  homeLogoUrl: string | null;
  awaySlug: string;
  awayName: string;
  awayLogoUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

/** Every match kicking off today, clubs and national teams mixed together. */
export function TodayMatchesList({
  matches,
  upcomingLabel,
}: {
  matches: TodayMatchEntry[];
  upcomingLabel: string;
}) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-surface">
      {matches.map((match) => (
        <div key={match.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
          <span className="w-28 shrink-0 truncate text-xs text-muted">
            {match.competitionName}
          </span>
          <Link
            href={`${match.hrefPrefix}/${match.homeSlug}`}
            className="flex min-w-0 flex-1 items-center justify-end gap-2 text-end font-medium hover:text-brand"
          >
            <span className="truncate">{match.homeName}</span>
            <Crest src={match.homeLogoUrl} name={match.homeName} size="sm" />
          </Link>
          <span className="shrink-0 rounded-md bg-brand/5 px-2.5 py-1 text-center font-bold tabular-nums">
            {match.homeScore === null || match.awayScore === null
              ? upcomingLabel
              : `${match.homeScore} – ${match.awayScore}`}
          </span>
          <Link
            href={`${match.hrefPrefix}/${match.awaySlug}`}
            className="flex min-w-0 flex-1 items-center gap-2 font-medium hover:text-brand"
          >
            <Crest src={match.awayLogoUrl} name={match.awayName} size="sm" />
            <span className="truncate">{match.awayName}</span>
          </Link>
        </div>
      ))}
    </div>
  );
}
