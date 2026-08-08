import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEur } from "@/lib/format";
import { localizedName } from "@/lib/localized";
import { getLeagueBySlug, squadValue } from "@/lib/queries";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const league = await getLeagueBySlug(slug);
  if (!league) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted">{localizedName(league.country, locale)}</p>
      <h1 className="text-2xl font-bold">{localizedName(league, locale)}</h1>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t("league.clubs")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("club.city")}</th>
              <th className="px-4 py-3 text-end font-medium">
                {t("league.squadSize")}
              </th>
              <th className="px-4 py-3 text-end font-medium">
                {t("league.totalValue")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {league.clubs.map((club) => (
              <tr key={club.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/clubs/${club.slug}`}
                    className="font-medium hover:text-brand"
                  >
                    {localizedName(club, locale)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{club.city ?? "—"}</td>
                <td className="px-4 py-3 text-end tabular-nums">
                  {club._count.players}
                </td>
                <td className="px-4 py-3 text-end tabular-nums font-medium">
                  {squadValue(club.players) > 0
                    ? formatEur(squadValue(club.players), locale)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
