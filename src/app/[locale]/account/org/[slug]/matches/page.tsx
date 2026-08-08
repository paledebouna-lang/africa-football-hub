import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrganisation } from "@/lib/org-access";
import { formatDate } from "@/lib/format";
import { localizedName } from "@/lib/localized";
import { DataTable, SectionTitle } from "@/components/data-table";
import { Crest } from "@/components/ui/media";

export default async function OrgMatchesPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const context = await requireOrganisation(slug);

  if (!context.clubId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-muted">{t("match.clubsOnly")}</p>
      </div>
    );
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeClubId: context.clubId }, { awayClubId: context.clubId }],
    },
    orderBy: { date: "desc" },
    include: {
      competition: true,
      homeClub: true,
      awayClub: true,
      _count: { select: { appearances: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            <Link href={`/account/org/${slug}`} className="hover:text-brand">
              {context.organisationName}
            </Link>
          </p>
          <h1 className="text-2xl font-bold">{t("match.title")}</h1>
        </div>
        <Link
          href={`/account/org/${slug}/matches/new`}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          {t("match.add")}
        </Link>
      </div>

      <section>
        <SectionTitle>{t("match.played")}</SectionTitle>

        {matches.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="font-medium">{t("match.none")}</p>
            <p className="mt-1 text-sm text-muted">{t("match.noneHint")}</p>
            <Link
              href={`/account/org/${slug}/matches/new`}
              className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              {t("match.add")}
            </Link>
          </div>
        ) : (
          <DataTable
            headers={[
              { label: t("transfers.date") },
              { label: t("match.fixture") },
              { label: t("transfers.competition") },
              { label: t("match.score"), align: "center" },
              { label: t("match.sheet"), align: "end" },
            ]}
          >
            {matches.map((match) => (
              <tr key={match.id} className="hover:bg-brand/5">
                <td className="whitespace-nowrap px-3 py-2 text-muted">
                  {formatDate(match.date, locale)}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <Crest
                      src={match.homeClub.logoUrl}
                      name={match.homeClub.nameFr}
                      size="sm"
                    />
                    {localizedName(match.homeClub, locale)}
                    <span className="text-muted">—</span>
                    <Crest
                      src={match.awayClub.logoUrl}
                      name={match.awayClub.nameFr}
                      size="sm"
                    />
                    {localizedName(match.awayClub, locale)}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">
                  {localizedName(match.competition, locale)}
                </td>
                <td className="px-3 py-2 text-center font-semibold tabular-nums">
                  {match.homeScore === null || match.awayScore === null
                    ? "—"
                    : `${match.homeScore} – ${match.awayScore}`}
                </td>
                <td className="px-3 py-2 text-end">
                  <Link
                    href={`/account/org/${slug}/matches/${match.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {match._count.appearances > 0
                      ? t("match.editSheet", { count: match._count.appearances })
                      : t("match.fillSheet")}
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
