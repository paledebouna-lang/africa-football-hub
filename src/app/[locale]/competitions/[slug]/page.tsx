import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatUsd } from "@/lib/format";
import { localizedName } from "@/lib/localized";
import { getCompetitionBySlug, squadValue } from "@/lib/queries";
import { ProfileHeader, Badge } from "@/components/profile-header";
import { DataTable, SectionTitle } from "@/components/data-table";
import { Crest, Flag } from "@/components/ui/media";

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
  const clubs = competition.entries
    .map((entry) => entry.club)
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr));

  const totalValue = clubs.reduce((sum, club) => sum + squadValue(club.players), 0);

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

      <section>
        <SectionTitle>{t("competition.clubsEngaged")}</SectionTitle>

        {clubs.length === 0 ? (
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
