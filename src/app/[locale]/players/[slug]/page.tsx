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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header>
        {player.club ? (
          <p className="text-sm text-muted">
            <Link href={`/clubs/${player.club.slug}`} className="hover:text-brand">
              {localizedName(player.club, locale)}
            </Link>
            {player.club.primaryCompetition &&
              ` · ${localizedName(player.club.primaryCompetition, locale)}`}
          </p>
        ) : (
          <p className="text-sm text-muted">{t("player.freeAgent")}</p>
        )}

        <h1 className="text-2xl font-bold">{playerName(player, locale)}</h1>

        <p className="mt-2 text-lg font-semibold text-brand">
          {latest === null ? t("player.noValue") : formatUsdFull(latest.valueUsd, locale)}
        </p>

        {latest?.source === "ALGORITHM" && (
          <p className="mt-1 text-xs text-muted">
            {t("player.estimated")} ·{" "}
            {t("player.confidence", {
              percent: Math.round((latest.confidence ?? 0) * 100),
            })}
          </p>
        )}
        {latest?.source === "MANUAL" && (
          <p className="mt-1 text-xs text-muted">{t("valuation.manual")}</p>
        )}
      </header>

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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          label={t("player.dateOfBirth")}
          value={formatDate(player.dateOfBirth, locale)}
        />
        <InfoCard
          label={t("player.age")}
          value={age === null ? "—" : t("player.years", { count: age })}
        />
        <InfoCard
          label={t("player.category")}
          value={t(`ageCategory.${player.ageCategory}`)}
        />
        <InfoCard
          label={t("player.squadLevel")}
          value={t(`squadLevel.${player.squadLevel}`)}
        />
        <InfoCard
          label={t("player.nationality")}
          value={player.nationality ? localizedName(player.nationality, locale) : "—"}
        />
        <InfoCard
          label={t("player.position")}
          value={player.position ? t(`position.${player.position}`) : "—"}
        />
        <InfoCard
          label={t("player.foot")}
          value={player.foot ? t(`foot.${player.foot}`) : "—"}
        />
        <InfoCard
          label={t("player.height")}
          value={player.heightCm ? `${player.heightCm} cm` : "—"}
        />
        <InfoCard
          label={t("player.contractUntil")}
          value={formatDate(player.contractUntil, locale)}
        />
      </section>

      {player.selections.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">{t("player.nationalTeam")}</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("player.nationality")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("player.level")}
                  </th>
                  <th className="px-4 py-3 text-end font-medium">{t("player.caps")}</th>
                  <th className="px-4 py-3 text-end font-medium">{t("player.goals")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {player.selections.map((selection) => (
                  <tr key={selection.id}>
                    <td className="px-4 py-3">
                      {localizedName(selection.country, locale)}
                      {selection.isCurrent && (
                        <span className="ms-2 rounded bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                          {t("player.currentlySelected")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {t(`ageCategory.${selection.level}`)}
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums">
                      {selection.caps}
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums">
                      {selection.goals}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {competitions.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">{t("player.competitions")}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {competitions.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/competitions/${entry.competition.slug}`}
                  className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-sm hover:border-brand transition-colors"
                >
                  {localizedName(entry.competition, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {player.videos.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">{t("player.videos")}</h2>
          <div className="mt-4">
            <VideoGallery
              videos={player.videos}
              typeLabel={(type) => t(`videoType.${type}`)}
              fallbackLinkLabel={t("player.watchOnYoutube")}
            />
          </div>
        </section>
      )}

      {player.marketValues.length >= 2 && (
        <section>
          <h2 className="text-xl font-semibold">{t("player.valueHistory")}</h2>
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
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

      <section>
        <h2 className="text-xl font-semibold">{t("player.transferHistory")}</h2>
        {player.transfers.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("player.noTransfers")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("transfers.date")}
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
                {player.transfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(transfer.date, locale)}
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
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
