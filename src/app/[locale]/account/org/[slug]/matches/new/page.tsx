import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrganisation } from "@/lib/org-access";
import { localizedName } from "@/lib/localized";
import { AGE_CATEGORIES } from "@/lib/categories";
import { MatchForm } from "@/components/match-form";
import { saveMatch } from "@/app/[locale]/account/org/match-actions";

export default async function NewMatchPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const context = await requireOrganisation(slug);
  if (!context.clubId) notFound();

  const [club, opponents, competitions, seasons] = await Promise.all([
    prisma.club.findUnique({ where: { id: context.clubId } }),
    prisma.club.findMany({
      where: { id: { not: context.clubId } },
      orderBy: { nameFr: "asc" },
    }),
    // The competitions this club is actually entered in come first; the rest
    // stay available for friendlies and one-off fixtures.
    prisma.competition.findMany({
      orderBy: { nameFr: "asc" },
      include: { country: true },
    }),
    prisma.season.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  if (!club) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-muted">{context.organisationName}</p>
      <h1 className="text-2xl font-bold">{t("match.add")}</h1>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <MatchForm
          action={saveMatch}
          orgSlug={slug}
          clubName={localizedName(club, locale)}
          opponents={opponents.map((opponent) => ({
            value: opponent.id,
            label: localizedName(opponent, locale),
          }))}
          competitions={competitions.map((competition) => ({
            value: competition.id,
            label: competition.country
              ? `${localizedName(competition, locale)} (${localizedName(competition.country, locale)})`
              : localizedName(competition, locale),
          }))}
          seasons={seasons.map((season) => ({
            value: season.id,
            label: season.label,
          }))}
          ageCategories={AGE_CATEGORIES.map((category) => ({
            value: category,
            label: t(`ageCategory.${category}`),
          }))}
          labels={{
            venueType: t("match.venueType"),
            home: t("match.home"),
            away: t("match.away"),
            yourClub: t("match.yourClub"),
            opponent: t("match.opponent"),
            date: t("transfers.date"),
            competition: t("transfers.competition"),
            season: t("transfers.season"),
            ownScore: t("match.ownScore"),
            opponentScore: t("match.opponentScore"),
            ageCategory: t("player.category"),
            matchday: t("match.matchday"),
            stadium: t("club.stadium"),
            senior: t("ageCategory.SENIOR"),
            choose: t("org.none"),
            submit: t("match.save"),
            cancel: t("common.back"),
            pending: t("common.loading"),
          }}
        />
      </div>
    </div>
  );
}
