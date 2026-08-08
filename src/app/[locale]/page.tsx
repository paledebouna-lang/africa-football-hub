import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { site } from "@/lib/site";
import { formatEur, formatDate } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import {
  getLeaguesWithCounts,
  getLatestTransfers,
  getTopValuedPlayers,
} from "@/lib/queries";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [leagues, transfers, topPlayers] = await Promise.all([
    getLeaguesWithCounts(),
    getLatestTransfers(8),
    getTopValuedPlayers(8),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <section className="rounded-xl bg-brand text-white px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("home.heroTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-white/90">{t("home.heroSubtitle")}</p>
        <Link
          href="/leagues"
          className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-brand-strong hover:bg-white/90 transition-colors"
        >
          {t("home.browseLeagues")}
        </Link>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">{t("home.leagues")}</h2>
          <Link href="/leagues" className="text-sm text-brand hover:underline">
            {t("home.viewAll")}
          </Link>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <li key={league.id}>
              <Link
                href={`/leagues/${league.slug}`}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-brand transition-colors"
              >
                <p className="text-sm text-muted">
                  {localizedName(league.country, locale)}
                </p>
                <p className="font-medium">{localizedName(league, locale)}</p>
                <p className="mt-1 text-sm text-muted">
                  {t("league.clubCount", { count: league._count.clubs })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">{t("home.latestTransfers")}</h2>
          {transfers.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("home.emptyState")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
              {transfers.map((transfer) => (
                <li key={transfer.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/players/${transfer.player.slug}`}
                      className="font-medium hover:text-brand"
                    >
                      {playerName(transfer.player, locale)}
                    </Link>
                    <span className="text-muted shrink-0">
                      {transfer.isFeeUndisclosed
                        ? t("transfers.undisclosed")
                        : formatEur(transfer.feeEur, locale)}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    {transfer.fromClub
                      ? localizedName(transfer.fromClub, locale)
                      : "—"}
                    {" → "}
                    {transfer.toClub ? localizedName(transfer.toClub, locale) : "—"}
                    {" · "}
                    {formatDate(transfer.date, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t("home.topValues")}</h2>
          {topPlayers.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("home.emptyState")}</p>
          ) : (
            <ol className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
              {topPlayers.map(({ player, value }, index) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="text-muted tabular-nums w-4">{index + 1}</span>
                    <Link
                      href={`/players/${player.slug}`}
                      className="font-medium truncate hover:text-brand"
                    >
                      {playerName(player, locale)}
                    </Link>
                  </span>
                  <span className="shrink-0 font-medium text-brand">
                    {formatEur(value, locale)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="text-xs text-muted">{site.tagline[locale]}</p>
    </div>
  );
}
