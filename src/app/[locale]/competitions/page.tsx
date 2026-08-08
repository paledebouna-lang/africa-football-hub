import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { localizedName } from "@/lib/localized";
import { getCompetitions } from "@/lib/queries";
import { CompetitionFiltersForm } from "@/components/competition-filters-form";
import { COMPETITION_TYPES } from "@/lib/categories";

export default async function CompetitionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ country?: string; type?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [competitions, countries] = await Promise.all([
    getCompetitions({ countrySlug: filters.country, type: filters.type }),
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">{t("competition.title")}</h1>

      <CompetitionFiltersForm
        labels={{
          country: t("competition.filterCountry"),
          type: t("competition.filterType"),
          allCountries: t("competition.allCountries"),
          allTypes: t("competition.allTypes"),
        }}
        countries={countries.map((country) => ({
          slug: country.slug,
          label: localizedName(country, locale),
        }))}
        types={COMPETITION_TYPES.map((type) => ({
          value: type,
          label: t(`competitionType.${type}`),
        }))}
        selected={{ country: filters.country ?? "", type: filters.type ?? "" }}
      />

      {competitions.length === 0 ? (
        <p className="text-sm text-muted">{t("home.emptyState")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <li key={competition.id}>
              <Link
                href={`/competitions/${competition.slug}`}
                className="block h-full rounded-lg border border-border bg-surface p-4 hover:border-brand transition-colors"
              >
                <p className="text-sm text-muted">
                  {competition.country
                    ? localizedName(competition.country, locale)
                    : t("competition.continental")}
                </p>
                <p className="font-medium">{localizedName(competition, locale)}</p>
                <p className="mt-1 text-sm text-muted">
                  {t(`competitionType.${competition.type}`)}
                  {competition.ageCategory !== "SENIOR" &&
                    ` · ${t(`ageCategory.${competition.ageCategory}`)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
