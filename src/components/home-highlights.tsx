import { Link } from "@/i18n/navigation";
import { PlayerPhoto, Crest, Flag } from "@/components/ui/media";
import { SectionTitle } from "@/components/data-table";

export type PlayerOfWeekData = {
  slug: string;
  name: string;
  photoUrl: string | null;
  clubName: string | null;
  clubLogoUrl: string | null;
  stats: string;
};

export type ScorerData = {
  competitionSlug: string;
  competitionName: string;
  playerSlug: string;
  playerName: string;
  photoUrl: string | null;
  clubName: string;
  goals: number;
};

export type CountryBestData = {
  playerSlug: string;
  playerName: string;
  photoUrl: string | null;
  countryName: string;
  flagUrl: string | null;
  valueLabel: string;
};

/**
 * The home page's live "what's happening" band. Every block hides itself when
 * there is nothing to show, so an empty database never renders hollow cards.
 */
export function HomeHighlights({
  playerOfWeek,
  scorers,
  labels,
}: {
  playerOfWeek: PlayerOfWeekData | null;
  scorers: ScorerData[];
  labels: { playerOfWeek: string; topScorers: string; goals: string };
}) {
  if (!playerOfWeek && scorers.length === 0) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {playerOfWeek && (
        <section>
          <SectionTitle>{labels.playerOfWeek}</SectionTitle>
          <Link
            href={`/players/${playerOfWeek.slug}`}
            className="flex items-center gap-5 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-brand"
          >
            <PlayerPhoto src={playerOfWeek.photoUrl} name={playerOfWeek.name} size="xl" />
            <span className="min-w-0">
              <span className="block truncate text-xl font-bold">{playerOfWeek.name}</span>
              {playerOfWeek.clubName && (
                <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <Crest src={playerOfWeek.clubLogoUrl} name={playerOfWeek.clubName} size="sm" />
                  {playerOfWeek.clubName}
                </span>
              )}
              <span className="mt-2 inline-block rounded bg-brand/10 px-2.5 py-1 text-sm font-semibold text-brand">
                {playerOfWeek.stats}
              </span>
            </span>
          </Link>
        </section>
      )}

      {scorers.length > 0 && (
        <section>
          <SectionTitle>{labels.topScorers}</SectionTitle>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {scorers.map((scorer) => (
              <li key={scorer.competitionSlug} className="flex items-center gap-3 p-3 text-sm">
                <PlayerPhoto src={scorer.photoUrl} name={scorer.playerName} size="md" />
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/players/${scorer.playerSlug}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {scorer.playerName}
                  </Link>
                  <Link
                    href={`/competitions/${scorer.competitionSlug}`}
                    className="block truncate text-muted hover:text-brand"
                  >
                    {scorer.competitionName} · {scorer.clubName}
                  </Link>
                </span>
                <span className="shrink-0 text-end font-bold tabular-nums text-brand">
                  {scorer.goals} <span className="text-xs font-normal text-muted">{labels.goals}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function BestByCountry({
  rows,
  title,
}: {
  rows: CountryBestData[];
  title: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <li key={row.playerSlug}>
            <Link
              href={`/players/${row.playerSlug}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-brand"
            >
              <PlayerPhoto src={row.photoUrl} name={row.playerName} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <Flag src={row.flagUrl} label={row.countryName} />
                  {row.countryName}
                </span>
                <span className="block truncate font-semibold">{row.playerName}</span>
                <span className="block text-sm font-bold tabular-nums text-brand">{row.valueLabel}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
