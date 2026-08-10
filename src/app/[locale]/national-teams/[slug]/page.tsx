import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatUsd, ageFrom } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { getCountryBySlug, currentValueOf } from "@/lib/queries";
import { ProfileHeader, Badge } from "@/components/profile-header";
import { DataTable, SectionTitle } from "@/components/data-table";
import { HonoursList } from "@/components/honours-list";
import { TrophyStrip } from "@/components/trophy-strip";
import { Crest, PlayerPhoto, Flag } from "@/components/ui/media";

export default async function NationalTeamPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const country = await getCountryBySlug(slug);
  if (!country) notFound();

  const name = localizedName(country, locale);

  // Group current internationals by the level they are called up to.
  const byLevel = new Map<string, typeof country.selections>();
  for (const selection of country.selections) {
    const bucket = byLevel.get(selection.level) ?? [];
    bucket.push(selection);
    byLevel.set(selection.level, bucket);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <ProfileHeader
        media={<Crest src={country.flagUrl} name={name} size="xl" />}
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <Flag src={country.flagUrl} label={name} />
            {t("nationalTeam.title")}
          </span>
        }
        title={name}
        badges={<Badge tone="brand">{country.code}</Badge>}
        trophies={<TrophyStrip honours={country.honours} locale={locale} />}
      />

      <section>
        <SectionTitle>{t("honours.title")}</SectionTitle>
        <HonoursList
          honours={country.honours}
          locale={locale}
          typeLabel={(type) => t(`honourType.${type}`)}
          emptyLabel={t("honours.none")}
        />
      </section>

      <section>
        <SectionTitle>{t("nationalTeam.squad")}</SectionTitle>
        {country.selections.length === 0 ? (
          <p className="text-sm text-muted">{t("nationalTeam.noSquad")}</p>
        ) : (
          <div className="space-y-5">
            {[...byLevel.entries()].map(([level, selections]) => (
              <div key={level}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                  {t(`ageCategory.${level}`)}
                  <span className="ms-2 font-normal normal-case">
                    ({selections.length})
                  </span>
                </h3>
                <DataTable
                  headers={[
                    { label: t("transfers.player") },
                    { label: t("player.club") },
                    { label: t("player.age"), align: "end" },
                    { label: t("player.caps"), align: "end" },
                    { label: t("player.goals"), align: "end" },
                    { label: t("player.marketValue"), align: "end" },
                  ]}
                >
                  {selections.map((selection) => (
                    <tr key={selection.id} className="hover:bg-brand/5">
                      <td className="px-3 py-2">
                        <Link
                          href={`/players/${selection.player.slug}`}
                          className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                        >
                          <PlayerPhoto
                            src={selection.player.photoUrl}
                            name={playerName(selection.player, locale)}
                            size="sm"
                          />
                          {playerName(selection.player, locale)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {selection.player.club
                          ? localizedName(selection.player.club, locale)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {ageFrom(selection.player.dateOfBirth) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {selection.caps}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {selection.goals}
                      </td>
                      <td className="px-3 py-2 text-end font-semibold tabular-nums text-brand">
                        {formatUsd(currentValueOf(selection.player), locale)}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            ))}
          </div>
        )}
      </section>

      {country.competitions.length > 0 && (
        <section>
          <SectionTitle>{t("competition.title")}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {country.competitions.map((competition) => (
              <li key={competition.id}>
                <Link
                  href={`/competitions/${competition.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-brand"
                >
                  {localizedName(competition, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
