import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatUsd, formatDate } from "@/lib/format";
import { localizedName } from "@/lib/localized";
import { getCompetitionBySlug, getCurrentSeason, squadValue } from "@/lib/queries";
import { clubStandings, nationalTeamStandings } from "@/lib/standings";
import { clubFixtures, nationalTeamFixtures, clubTopScorers, nationalTeamTopScorers } from "@/lib/fixtures";
import { ProfileHeader, Badge } from "@/components/profile-header";
import { DataTable, SectionTitle } from "@/components/data-table";
import { Crest, Flag } from "@/components/ui/media";
import { StandingsTable, type StandingsTableEntry } from "@/components/standings-table";
import { FixturesList, type FixtureEntry } from "@/components/fixtures-list";
import { TopScorersTable } from "@/components/top-scorers-table";

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const competition = await getCompetitionBySlug(slug);
  if (!competition) notFound();

  const name = localizedName(competition, locale);
  const isInternational = competition.type === "INTERNATIONAL";

  const clubs = competition.entries
    .map((entry) => entry.club)
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr));
  const countries = competition.nationalTeamEntries
    .map((entry) => entry.country)
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr));

  const totalValue = clubs.reduce((sum, club) => sum + squadValue(club.players), 0);

  const season = await getCurrentSeason();

  const standingsLabels = {
    team: t("standings.team"),
    played: t("standings.played"),
    won: t("standings.won"),
    drawn: t("standings.drawn"),
    lost: t("standings.lost"),
    goalsFor: t("standings.goalsFor"),
    goalsAgainst: t("standings.goalsAgainst"),
    goalDifference: t("standings.goalDifference"),
    points: t("standings.points"),
  };

  let standingsGroups: {
    group: string | null;
    rows: StandingsTableEntry[];
  }[] = [];
  let fixtures: FixtureEntry[] = [];
  let topScorers: Awaited<ReturnType<typeof clubTopScorers>> = [];

  if (season) {
    if (isInternational) {
      const [groups, matches, scorers] = await Promise.all([
        nationalTeamStandings(competition.id, season.id),
        nationalTeamFixtures(competition.id, season.id),
        nationalTeamTopScorers(competition.id, season.id),
      ]);

      standingsGroups = groups.map((g) => ({
        group: g.group ? t("standings.group", { group: g.group }) : null,
        rows: g.rows.map((row) => ({
          ...row,
          slug: row.competitor.slug,
          name: localizedName(row.competitor, locale),
          logoUrl: row.competitor.flagUrl,
        })),
      }));
      fixtures = matches.map((match) => ({
        id: match.id,
        dateLabel: formatDate(match.date, locale),
        matchdayLabel: match.matchday
          ? t("match.matchdayShort", { matchday: match.matchday })
          : null,
        homeSlug: match.homeCountry.slug,
        homeName: localizedName(match.homeCountry, locale),
        homeLogoUrl: match.homeCountry.flagUrl,
        awaySlug: match.awayCountry.slug,
        awayName: localizedName(match.awayCountry, locale),
        awayLogoUrl: match.awayCountry.flagUrl,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      }));
      topScorers = scorers;
    } else {
      const [groups, matches, scorers] = await Promise.all([
        clubStandings(competition.id, season.id),
        clubFixtures(competition.id, season.id),
        clubTopScorers(competition.id, season.id),
      ]);

      standingsGroups = groups.map((g) => ({
        group: g.group ? t("standings.group", { group: g.group }) : null,
        rows: g.rows.map((row) => ({
          ...row,
          slug: row.competitor.slug,
          name: localizedName(row.competitor, locale),
          logoUrl: row.competitor.logoUrl,
        })),
      }));
      fixtures = matches.map((match) => ({
        id: match.id,
        dateLabel: formatDate(match.date, locale),
        matchdayLabel: match.matchday
          ? t("match.matchdayShort", { matchday: match.matchday })
          : null,
        homeSlug: match.homeClub.slug,
        homeName: localizedName(match.homeClub, locale),
        homeLogoUrl: match.homeClub.logoUrl,
        awaySlug: match.awayClub.slug,
        awayName: localizedName(match.awayClub, locale),
        awayLogoUrl: match.awayClub.logoUrl,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      }));
      topScorers = scorers;
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <ProfileHeader
        media={<Crest src={competition.logoUrl} name={name} size="xl" />}
        breadcrumb={
          competition.country ? (
            <span className="inline-flex items-center gap-1.5">
              <Flag
                src={competition.country.flagUrl}
                label={localizedName(competition.country, locale)}
              />
              {localizedName(competition.country, locale)}
            </span>
          ) : (
            t("competition.continental")
          )
        }
        title={name}
        badges={
          <>
            <Badge tone="brand">{t(`competitionType.${competition.type}`)}</Badge>
            {competition.ageCategory !== "SENIOR" && (
              <Badge tone="accent">{t(`ageCategory.${competition.ageCategory}`)}</Badge>
            )}
            <Badge>
              {t("competition.strength")} {competition.strengthCoefficient.toFixed(2)}
            </Badge>
          </>
        }
        figureLabel={t("league.totalValue")}
        figure={totalValue > 0 ? formatUsd(totalValue, locale) : "—"}
      />

      {season && standingsGroups.length > 0 && (
        <section>
          <SectionTitle>{t("standings.title")}</SectionTitle>
          <div className="space-y-4">
            {standingsGroups.map((g, index) => (
              <StandingsTable
                key={g.group ?? index}
                group={g.group}
                rows={g.rows}
                hrefPrefix={isInternational ? "/national-teams" : "/clubs"}
                labels={standingsLabels}
              />
            ))}
          </div>
        </section>
      )}

      {season && topScorers.length > 0 && (
        <section>
          <SectionTitle>{t("topScorers.title")}</SectionTitle>
          <TopScorersTable
            rows={topScorers}
            labels={{
              player: t("transfers.player"),
              club: isInternational ? t("nationalTeam.title") : t("league.clubs"),
              goals: t("statistics.goals"),
              assists: t("statistics.assists"),
            }}
          />
        </section>
      )}

      {season && fixtures.length > 0 && (
        <section>
          <SectionTitle>{t("match.title")}</SectionTitle>
          <FixturesList
            fixtures={fixtures}
            hrefPrefix={isInternational ? "/national-teams" : "/clubs"}
            upcomingLabel={t("match.upcoming")}
          />
        </section>
      )}

      <section>
        <SectionTitle>
          {isInternational ? t("competition.selectionsEngaged") : t("competition.clubsEngaged")}
        </SectionTitle>

        {isInternational ? (
          countries.length === 0 ? (
            <p className="text-sm text-muted">{t("competition.noSelections")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {countries.map((country) => (
                <li key={country.id}>
                  <Link
                    href={`/national-teams/${country.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-brand"
                  >
                    <Flag src={country.flagUrl} label={localizedName(country, locale)} />
                    {localizedName(country, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : clubs.length === 0 ? (
          <p className="text-sm text-muted">{t("competition.noClubs")}</p>
        ) : (
          <DataTable
            headers={[
              { label: t("league.clubs") },
              { label: t("club.city") },
              { label: t("league.squadSize"), align: "end" },
              { label: t("league.totalValue"), align: "end" },
            ]}
          >
            {clubs.map((club) => {
              const total = squadValue(club.players);
              return (
                <tr key={club.id} className="hover:bg-brand/5">
                  <td className="px-3 py-2">
                    <Link
                      href={`/clubs/${club.slug}`}
                      className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                    >
                      <Crest src={club.logoUrl} name={club.nameFr} size="md" />
                      {localizedName(club, locale)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">{club.city ?? "—"}</td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {club._count.players}
                  </td>
                  <td className="px-3 py-2 text-end font-semibold tabular-nums text-brand">
                    {total > 0 ? formatUsd(total, locale) : "—"}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </section>
    </div>
  );
}
