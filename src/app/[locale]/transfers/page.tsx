import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { formatUsd, formatDate } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { getFilteredTransfers } from "@/lib/queries";
import { TransferFiltersForm } from "@/components/transfer-filters-form";

const TRANSFER_TYPES = [
  "PERMANENT",
  "LOAN",
  "LOAN_RETURN",
  "FREE",
  "END_OF_CONTRACT",
  "YOUTH_PROMOTION",
  "RETIRED",
] as const;

export default async function TransfersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ league?: string; season?: string; type?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [leagues, seasons, transfers] = await Promise.all([
    prisma.competition.findMany({
      where: { type: "LEAGUE" },
      orderBy: { nameFr: "asc" },
    }),
    prisma.season.findMany({ orderBy: { startDate: "desc" } }),
    getFilteredTransfers({
      competitionSlug: filters.league,
      seasonId: filters.season,
      type: filters.type,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">{t("transfers.title")}</h1>

      <TransferFiltersForm
        labels={{
          league: t("transfers.filterLeague"),
          season: t("transfers.filterSeason"),
          type: t("transfers.filterType"),
          allLeagues: t("transfers.allLeagues"),
          allSeasons: t("transfers.allSeasons"),
          allTypes: t("transfers.allTypes"),
        }}
        leagues={leagues.map((league) => ({
          slug: league.slug,
          label: localizedName(league, locale),
        }))}
        seasons={seasons.map((season) => ({
          id: season.id,
          label: season.label,
        }))}
        types={TRANSFER_TYPES.map((type) => ({
          value: type,
          label: t(`transferType.${type}`),
        }))}
        selected={{
          league: filters.league ?? "",
          season: filters.season ?? "",
          type: filters.type ?? "",
        }}
      />

      {transfers.length === 0 ? (
        <p className="text-sm text-muted">{t("transfers.noResults")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">
                  {t("transfers.date")}
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {t("transfers.player")}
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {t("transfers.from")}
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {t("transfers.to")}
                </th>
                <th className="px-4 py-3 text-start font-medium">
                  {t("transfers.type")}
                </th>
                <th className="px-4 py-3 text-end font-medium">
                  {t("transfers.fee")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {formatDate(transfer.date, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${transfer.player.slug}`}
                      className="font-medium hover:text-brand"
                    >
                      {playerName(transfer.player, locale)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {transfer.fromClub
                      ? localizedName(transfer.fromClub, locale)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {transfer.toClub ? localizedName(transfer.toClub, locale) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {t(`transferType.${transfer.type}`)}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums font-medium">
                    {transfer.isFeeUndisclosed
                      ? t("transfers.undisclosed")
                      : formatUsd(transfer.feeUsd, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
