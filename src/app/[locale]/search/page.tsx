import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEur } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { searchPlayersAndClubs, currentValueOf } from "@/lib/queries";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const query = q?.trim() ?? "";

  if (query.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">{t("search.title")}</h1>
        <p className="mt-4 text-sm text-muted">{t("search.typeToSearch")}</p>
      </div>
    );
  }

  const { players, clubs } = await searchPlayersAndClubs(query);
  const hasResults = players.length > 0 || clubs.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">{t("search.resultsFor", { query })}</h1>

      {!hasResults && <p className="text-sm text-muted">{t("search.noResults")}</p>}

      {players.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">{t("search.players")}</h2>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <span className="min-w-0">
                  <Link
                    href={`/players/${player.slug}`}
                    className="font-medium hover:text-brand"
                  >
                    {playerName(player, locale)}
                  </Link>
                  {player.club && (
                    <span className="block text-muted">
                      {localizedName(player.club, locale)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-medium text-brand">
                  {formatEur(currentValueOf(player), locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {clubs.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">{t("search.clubs")}</h2>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
            {clubs.map((club) => (
              <li key={club.id} className="p-3 text-sm">
                <Link
                  href={`/clubs/${club.slug}`}
                  className="font-medium hover:text-brand"
                >
                  {localizedName(club, locale)}
                </Link>
                <span className="block text-muted">
                  {localizedName(club.league, locale)} ·{" "}
                  {localizedName(club.league.country, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
