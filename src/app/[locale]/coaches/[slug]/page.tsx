import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, ageFrom } from "@/lib/format";
import { localizedName } from "@/lib/localized";
import { getCoachBySlug } from "@/lib/queries";
import { ProfileHeader, Badge, DataGrid, DataPoint } from "@/components/profile-header";
import { DataTable, SectionTitle } from "@/components/data-table";
import { PlayerPhoto, Crest, Flag } from "@/components/ui/media";
import { HonoursList } from "@/components/honours-list";

export default async function CoachPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const coach = await getCoachBySlug(slug);
  if (!coach) notFound();

  const displayName = locale === "ar" && coach.nameAr ? coach.nameAr : coach.name;
  const age = ageFrom(coach.dateOfBirth);
  const currentSpell = coach.spells.find((spell) => spell.endDate === null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <ProfileHeader
        media={<PlayerPhoto src={coach.photoUrl} name={displayName} size="xl" />}
        breadcrumb={
          currentSpell && (
            <span className="inline-flex items-center gap-2">
              <Crest
                src={currentSpell.club.logoUrl}
                name={currentSpell.club.nameFr}
                size="sm"
              />
              <Link
                href={`/clubs/${currentSpell.club.slug}`}
                className="hover:text-brand"
              >
                {localizedName(currentSpell.club, locale)}
              </Link>
            </span>
          )
        }
        title={displayName}
        subtitle={
          coach.nationality && (
            <span className="inline-flex items-center gap-1.5">
              <Flag
                src={coach.nationality.flagUrl}
                label={localizedName(coach.nationality, locale)}
              />
              {localizedName(coach.nationality, locale)}
            </span>
          )
        }
        badges={
          <>
            {currentSpell && (
              <Badge tone="brand">{t(`coachRole.${currentSpell.role}`)}</Badge>
            )}
            {coach.licence && <Badge>{coach.licence}</Badge>}
          </>
        }
      />

      <DataGrid>
        <DataPoint label={t("player.dateOfBirth")}>
          {formatDate(coach.dateOfBirth, locale)}
        </DataPoint>
        <DataPoint label={t("player.age")}>
          {age === null ? "—" : t("player.years", { count: age })}
        </DataPoint>
        <DataPoint label={t("player.nationality")}>
          {coach.nationality ? localizedName(coach.nationality, locale) : "—"}
        </DataPoint>
        <DataPoint label={t("coach.licence")}>{coach.licence ?? "—"}</DataPoint>
      </DataGrid>

      {coach.honours.length > 0 && (
        <section>
          <SectionTitle>{t("honours.title")}</SectionTitle>
          <HonoursList
            honours={coach.honours}
            locale={locale}
            typeLabel={(type) => t(`honourType.${type}`)}
            emptyLabel={t("honours.none")}
          />
        </section>
      )}

      <section>
        <SectionTitle>{t("coach.career")}</SectionTitle>
        {coach.spells.length === 0 ? (
          <p className="text-sm text-muted">{t("coach.noSpells")}</p>
        ) : (
          <DataTable
            headers={[
              { label: t("coach.club") },
              { label: t("coach.role") },
              { label: t("coach.from") },
              { label: t("coach.until") },
            ]}
          >
            {coach.spells.map((spell) => (
              <tr key={spell.id} className="hover:bg-brand/5">
                <td className="px-3 py-2">
                  <Link
                    href={`/clubs/${spell.club.slug}`}
                    className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                  >
                    <Crest
                      src={spell.club.logoUrl}
                      name={spell.club.nameFr}
                      size="md"
                    />
                    {localizedName(spell.club, locale)}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{t(`coachRole.${spell.role}`)}</td>
                <td className="px-3 py-2 text-muted">
                  {formatDate(spell.startDate, locale)}
                </td>
                <td className="px-3 py-2">
                  {spell.endDate ? (
                    <span className="text-muted">
                      {formatDate(spell.endDate, locale)}
                    </span>
                  ) : (
                    <Badge tone="brand">{t("coach.current")}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
