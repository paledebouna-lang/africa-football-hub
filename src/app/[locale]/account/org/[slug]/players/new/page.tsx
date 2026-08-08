import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrganisation } from "@/lib/org-access";
import { localizedName } from "@/lib/localized";
import { playerFormOptions, playerFormLabels } from "@/lib/org-options";
import { OrgPlayerForm } from "@/components/org-player-form";
import { saveOrgPlayer } from "@/app/[locale]/account/org/actions";

export default async function NewOrgPlayerPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const context = await requireOrganisation(slug);
  const countries = await prisma.country.findMany({ orderBy: { nameFr: "asc" } });
  const options = playerFormOptions(t);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-muted">{context.organisationName}</p>
      <h1 className="text-2xl font-bold">{t("org.addPlayer")}</h1>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <OrgPlayerForm
          action={saveOrgPlayer}
          orgSlug={slug}
          countries={countries.map((country) => ({
            value: country.id,
            label: localizedName(country, locale),
          }))}
          {...options}
          labels={playerFormLabels(t)}
        />
      </div>
    </div>
  );
}
