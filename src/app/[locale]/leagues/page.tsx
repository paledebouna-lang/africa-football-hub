import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedName } from "@/lib/localized";
import { getLeaguesWithCounts } from "@/lib/queries";

export default async function LeaguesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const leagues = await getLeaguesWithCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t("nav.leagues")}</h1>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                {" · "}
                {t("league.tier", { tier: league.tier })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
