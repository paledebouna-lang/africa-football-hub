import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatUsd, formatDate } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import {
  getCompetitions,
  getLatestTransfers,
  getTopValuedPlayers,
  getLatestNews,
} from "@/lib/queries";
import { todaysMatches } from "@/lib/fixtures";
import { SectionTitle } from "@/components/data-table";
import { Crest, PlayerPhoto, Flag } from "@/components/ui/media";
import { TodayMatchesList, type TodayMatchEntry } from "@/components/today-matches-list";
import { AdSlotInline } from "@/components/ad-slot";
import { NewsCard } from "@/components/news-card";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [allCompetitions, transfers, topPlayers, { clubMatches, nationalMatches }, news] =
    await Promise.all([
      getCompetitions(),
      getLatestTransfers(8),
      getTopValuedPlayers(8),
      todaysMatches(),
      getLatestNews(4),
    ]);

  const todayMatches: TodayMatchEntry[] = [
    ...clubMatches.map((match) => ({
      id: match.id,
      competitionName: localizedName(match.competition, locale),
      hrefPrefix: "/clubs" as const,
      homeSlug: match.homeClub.slug,
      homeName: localizedName(match.homeClub, locale),
      homeLogoUrl: match.homeClub.logoUrl,
      awaySlug: match.awayClub.slug,
      awayName: localizedName(match.awayClub, locale),
      awayLogoUrl: match.awayClub.logoUrl,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    })),
    ...nationalMatches.map((match) => ({
      id: match.id,
      competitionName: localizedName(match.competition, locale),
      hrefPrefix: "/national-teams" as const,
      homeSlug: match.homeCountry.slug,
      homeName: localizedName(match.homeCountry, locale),
      homeLogoUrl: match.homeCountry.flagUrl,
      awaySlug: match.awayCountry.slug,
      awayName: localizedName(match.awayCountry, locale),
      awayLogoUrl: match.awayCountry.flagUrl,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    })),
  ];

  // The home page showcases the domestic leagues; cups and continental
  // competitions are one click away on /competitions.
  const leagues = allCompetitions.filter(
    (competition) => competition.type === "LEAGUE",
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <section className="overflow-hidden rounded-lg bg-brand-strong text-white">
        <div className="px-6 py-10 sm:px-10 sm:py-14">
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-white/85">{t("home.heroSubtitle")}</p>
          <Link
            href="/competitions"
            className="mt-6 inline-block rounded bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110"
          >
            {t("home.browseLeagues")}
          </Link>
        </div>
        <div className="h-1.5 bg-accent" />
      </section>

      <section>
        <SectionTitle>{t("home.matchesToday")}</SectionTitle>
        {todayMatches.length === 0 ? (
          <p className="text-sm text-muted">{t("home.noMatchesToday")}</p>
        ) : (
          <TodayMatchesList
            matches={todayMatches}
            upcomingLabel={t("match.upcoming")}
          />
        )}
      </section>

      {news.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <SectionTitle>{t("home.news")}</SectionTitle>
            <Link href="/news" className="text-sm font-medium text-brand hover:underline">
              {t("home.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {news.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                locale={locale}
                readMoreLabel={t("home.readMore")}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <SectionTitle>{t("home.leagues")}</SectionTitle>
          <Link
            href="/competitions"
            className="text-sm font-medium text-brand hover:underline"
          >
            {t("home.viewAll")}
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <li key={league.id}>
              <Link
                href={`/competitions/${league.slug}`}
                className="flex h-full items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-brand"
              >
                <Crest src={league.logoUrl} name={league.nameFr} size="lg" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    {league.country && (
                      <Flag
                        src={league.country.flagUrl}
                        label={localizedName(league.country, locale)}
                      />
                    )}
                    {league.country
                      ? localizedName(league.country, locale)
                      : t("competition.continental")}
                  </span>
                  <span className="mt-0.5 block font-semibold">
                    {localizedName(league, locale)}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {t("league.clubCount", { count: league._count.primaryClubs })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <AdSlotInline />

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle>{t("home.latestTransfers")}</SectionTitle>
          {transfers.length === 0 ? (
            <p className="text-sm text-muted">{t("home.emptyState")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {transfers.map((transfer) => (
                <li key={transfer.id} className="flex items-center gap-3 p-3 text-sm">
                  <PlayerPhoto
                    src={transfer.player.photoUrl}
                    name={playerName(transfer.player, locale)}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/players/${transfer.player.slug}`}
                      className="font-medium hover:text-brand"
                    >
                      {playerName(transfer.player, locale)}
                    </Link>
                    <span className="block text-muted">
                      {transfer.fromClub
                        ? localizedName(transfer.fromClub, locale)
                        : "—"}
                      {" → "}
                      {transfer.toClub ? localizedName(transfer.toClub, locale) : "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block font-semibold tabular-nums">
                      {transfer.isFeeUndisclosed
                        ? t("transfers.undisclosed")
                        : formatUsd(transfer.feeUsd, locale)}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatDate(transfer.date, locale)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>{t("home.topValues")}</SectionTitle>
          {topPlayers.length === 0 ? (
            <p className="text-sm text-muted">{t("home.emptyState")}</p>
          ) : (
            <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
              {topPlayers.map(({ player, value }, index) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 p-3 text-sm hover:bg-brand/5"
                >
                  <span className="w-5 shrink-0 text-center font-bold tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <PlayerPhoto
                    src={player.photoUrl}
                    name={playerName(player, locale)}
                    size="md"
                  />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/players/${player.slug}`}
                      className="block truncate font-medium hover:text-brand"
                    >
                      {playerName(player, locale)}
                    </Link>
                    {player.club && (
                      <span className="block truncate text-muted">
                        {localizedName(player.club, locale)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-brand">
                    {formatUsd(value, locale)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
