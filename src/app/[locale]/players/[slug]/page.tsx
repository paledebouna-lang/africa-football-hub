import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatUsd, formatUsdFull, formatDate, ageFrom } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { getPlayerBySlug } from "@/lib/queries";
import { ValueChart } from "@/components/value-chart";
import { VideoGallery } from "@/components/video-gallery";
import { ValuationBreakdown, type Breakdown } from "@/components/valuation-breakdown";
import { ProfileHeader, Badge, DataGrid, DataPoint } from "@/components/profile-header";
import { DataTable, SectionTitle } from "@/components/data-table";
import { PlayerPhoto, Crest, Flag } from "@/components/ui/media";
import { HonoursList } from "@/components/honours-list";
import { StatisticsTable } from "@/components/statistics-table";
import { playerStatistics } from "@/lib/statistics";

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const player = await getPlayerBySlug(slug);
  if (!player) notFound();

  const displayName = playerName(player, locale);
  const age = ageFrom(player.dateOfBirth);
  const latest =
    player.marketValues.length > 0
      ? player.marketValues[player.marketValues.length - 1]
      : null;

  // `breakdown` is stored as JSON, so it is validated rather than trusted.
  const breakdown =
    latest?.source === "ALGORITHM" &&
    latest.breakdown !== null &&
    typeof latest.breakdown === "object" &&
    "criteria" in latest.breakdown
      ? (latest.breakdown as unknown as Breakdown)
      : null;

  const competitions = player.club?.entries ?? [];
  const statistics = await playerStatistics(player.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <ProfileHeader
        media={<PlayerPhoto src={player.photoUrl} name={displayName} size="xl" />}
        breadcrumb={
          player.club ? (
            <span className="inline-flex items-center gap-2">
              <Crest src={player.club.logoUrl} name={player.club.nameFr} size="sm" />
              <Link href={`/clubs/${player.club.slug}`} className="hover:text-brand">
                {localizedName(player.club, locale)}
              </Link>
              {player.club.primaryCompetition && (
                <>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/competitions/${player.club.primaryCompetition.slug}`}
                    className="hover:text-brand"
                  >
                    {localizedName(player.club.primaryCompetition, locale)}
                  </Link>
                </>
              )}
            </span>
          ) : (
            t("player.freeAgent")
          )
        }
        title={displayName}
        subtitle={
          player.nationality && (
            <span className="inline-flex items-center gap-1.5">
              <Flag
                src={player.nationality.flagUrl}
                label={localizedName(player.nationality, locale)}
              />
              {localizedName(player.nationality, locale)}
            </span>
          )
        }
        badges={
          <>
            {player.position && <Badge tone="brand">{t(`position.${player.position}`)}</Badge>}
            <Badge>{t(`squadLevel.${player.squadLevel}`)}</Badge>
            {player.ageCategory !== "SENIOR" && (
              <Badge tone="accent">{t(`ageCategory.${player.ageCategory}`)}</Badge>
            )}
            {player.shirtNumber !== null && <Badge>#{player.shirtNumber}</Badge>}
          </>
        }
        figureLabel={t("player.marketValue")}
        figure={
          latest === null ? t("player.noValue") : formatUsdFull(latest.valueUsd, locale)
        }
        figureNote={
          latest?.source === "ALGORITHM" ? (
            <>
              {t("player.estimated")} ·{" "}
              {t("player.confidence", {
                percent: Math.round((latest.confidence ?? 0) * 100),
              })}
            </>
          ) : latest?.source === "MANUAL" ? (
            t("valuation.manual")
          ) : null
        }
      />

      <DataGrid>
        <DataPoint label={t("player.dateOfBirth")}>
          {formatDate(player.dateOfBirth, locale)}
        </DataPoint>
        <DataPoint label={t("player.age")}>
          {age === null ? "—" : t("player.years", { count: age })}
        </DataPoint>
        <DataPoint label={t("player.height")}>
          {player.heightCm ? `${player.heightCm} cm` : "—"}
        </DataPoint>
        <DataPoint label={t("player.foot")}>
          {player.foot ? t(`foot.${player.foot}`) : "—"}
        </DataPoint>
        <DataPoint label={t("player.contractUntil")}>
          {formatDate(player.contractUntil, locale)}
        </DataPoint>
        <DataPoint label={t("player.agent")}>{player.agent ?? "—"}</DataPoint>
        <DataPoint label={t("player.category")}>
          {t(`ageCategory.${player.ageCategory}`)}
        </DataPoint>
        <DataPoint label={t("player.squadLevel")}>
          {t(`squadLevel.${player.squadLevel}`)}
        </DataPoint>
      </DataGrid>

      {breakdown && latest && (
        <ValuationBreakdown
          breakdown={breakdown}
          confidence={latest.confidence ?? 0}
          formatValue={(value) => formatUsdFull(value, locale)}
          criterionLabel={(criterion) => t(`valuationCriterion.${criterion}`)}
          labels={{
            title: t("valuation.title"),
            base: t("valuation.base"),
            criterion: t("valuation.criterion"),
            weight: t("valuation.weight"),
            effect: t("valuation.effect"),
            missing: t("valuation.missing"),
            confidence: t.raw("valuation.confidence") as string,
          }}
        />
      )}

      {statistics.length > 0 && (
        <section>
          <SectionTitle>{t("statistics.title")}</SectionTitle>
          <StatisticsTable
            lines={statistics}
            locale={locale}
            showCleanSheets={player.position === "GK"}
            labels={{
              season: t("transfers.season"),
              competition: t("transfers.competition"),
              appearances: t("statistics.appearances"),
              minutes: t("statistics.minutes"),
              goals: t("statistics.goals"),
              assists: t("statistics.assists"),
              cleanSheets: t("statistics.cleanSheets"),
              total: t("statistics.total"),
            }}
          />
          <p className="mt-2 text-xs text-muted">{t("statistics.source")}</p>
        </section>
      )}

      {player.marketValues.length >= 2 && (
        <section>
          <SectionTitle>{t("player.valueHistory")}</SectionTitle>
          <div className="rounded-lg border border-border bg-surface p-4">
            <ValueChart
              points={player.marketValues.map((entry) => ({
                date: entry.effectiveAt,
                value: entry.valueUsd,
              }))}
              formatValue={(value) => formatUsd(value, locale)}
              formatDate={(date) => formatDate(date, locale)}
            />
          </div>
        </section>
      )}

      {player.selections.length > 0 && (
        <section>
          <SectionTitle>{t("player.nationalTeam")}</SectionTitle>
          <DataTable
            headers={[
              { label: t("player.nationality") },
              { label: t("player.level") },
              { label: t("player.caps"), align: "end" },
              { label: t("player.goals"), align: "end" },
            ]}
          >
            {player.selections.map((selection) => (
              <tr key={selection.id}>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <Flag
                      src={selection.country.flagUrl}
                      label={localizedName(selection.country, locale)}
                    />
                    <Link
                      href={`/national-teams/${selection.country.slug}`}
                      className="font-medium hover:text-brand"
                    >
                      {localizedName(selection.country, locale)}
                    </Link>
                    {selection.isCurrent && (
                      <Badge tone="brand">{t("player.currentlySelected")}</Badge>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted">
                  {t(`ageCategory.${selection.level}`)}
                </td>
                <td className="px-3 py-2.5 text-end tabular-nums">{selection.caps}</td>
                <td className="px-3 py-2.5 text-end tabular-nums">{selection.goals}</td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}

      {player.honours.length > 0 && (
        <section>
          <SectionTitle>{t("honours.title")}</SectionTitle>
          <HonoursList
            honours={player.honours}
            locale={locale}
            typeLabel={(type) => t(`honourType.${type}`)}
            emptyLabel={t("honours.none")}
          />
        </section>
      )}

      {competitions.length > 0 && (
        <section>
          <SectionTitle>{t("player.competitions")}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {competitions.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/competitions/${entry.competition.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-brand"
                >
                  {entry.competition.country && (
                    <Flag
                      src={entry.competition.country.flagUrl}
                      label={localizedName(entry.competition.country, locale)}
                    />
                  )}
                  {localizedName(entry.competition, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {player.videos.length > 0 && (
        <section>
          <SectionTitle>{t("player.videos")}</SectionTitle>
          <VideoGallery
            videos={player.videos}
            typeLabel={(type) => t(`videoType.${type}`)}
            fallbackLinkLabel={t("player.watchOnYoutube")}
          />
        </section>
      )}

      <section>
        <SectionTitle>{t("player.transferHistory")}</SectionTitle>
        {player.transfers.length === 0 ? (
          <p className="text-sm text-muted">{t("player.noTransfers")}</p>
        ) : (
          <DataTable
            headers={[
              { label: t("transfers.date") },
              { label: t("transfers.from") },
              { label: t("transfers.to") },
              { label: t("transfers.type") },
              { label: t("transfers.fee"), align: "end" },
            ]}
          >
            {player.transfers.map((transfer) => (
              <tr key={transfer.id}>
                <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                  {formatDate(transfer.date, locale)}
                </td>
                <td className="px-3 py-2.5">
                  {transfer.fromClub ? localizedName(transfer.fromClub, locale) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  {transfer.toClub ? localizedName(transfer.toClub, locale) : "—"}
                </td>
                <td className="px-3 py-2.5 text-muted">
                  {t(`transferType.${transfer.type}`)}
                </td>
                <td className="px-3 py-2.5 text-end font-semibold tabular-nums">
                  {transfer.isFeeUndisclosed
                    ? t("transfers.undisclosed")
                    : formatUsd(transfer.feeUsd, locale)}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
