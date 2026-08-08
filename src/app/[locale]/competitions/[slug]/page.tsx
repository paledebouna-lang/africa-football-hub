import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatUsd } from "@/lib/format";
import { localizedName } from "@/lib/localized";
import { getCompetitionBySlug, squadValue } from "@/lib/queries";

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

  const clubs = competition.entries
    .map((entry) => entry.club)
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted">
        {/* Without a country the type already says "continental" — don't repeat it. */}
        {competition.country
          ? `${localizedName(competition.country, locale)} · ${t(`competitionType.${competition.type}`)}`
          : t(`competitionType.${competition.type}`)}
      </p>
      <h1 className="text-2xl font-bold">{localizedName(competition, locale)}</h1>

      <h2 className="mt-8 text-xl font-semibold">{t("competition.clubsEngaged")}</h2>

      {clubs.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t("competition.noClubs")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">
                  {t("league.clubs")}
                </th>
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
              {clubs.map((club) => {
                const total = squadValue(club.players);
                return (
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
                      {total > 0 ? formatUsd(total, locale) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
