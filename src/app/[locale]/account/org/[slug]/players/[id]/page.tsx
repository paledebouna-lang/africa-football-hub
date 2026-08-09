import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrganisation, organisationScope } from "@/lib/org-access";
import { localizedName } from "@/lib/localized";
import { playerFormOptions, playerFormLabels } from "@/lib/org-options";
import { OrgPlayerForm } from "@/components/org-player-form";
import { OrgVideoForm } from "@/components/org-video-form";
import { VIDEO_TYPES } from "@/lib/categories";
import {
  saveOrgPlayer,
  addOrgPlayerVideo,
  saveOrgTransfer,
  deleteOrgTransfer,
} from "@/app/[locale]/account/org/actions";
import { OrgTransferForm } from "@/components/org-transfer-form";
import { StatisticsTable } from "@/components/statistics-table";
import { playerStatistics } from "@/lib/statistics";
import { formatDate, formatUsd } from "@/lib/format";

const TRANSFER_TYPES = [
  "PERMANENT",
  "LOAN",
  "LOAN_RETURN",
  "FREE",
  "END_OF_CONTRACT",
  "YOUTH_PROMOTION",
  "RETIRED",
] as const;

function toDateInput(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EditOrgPlayerPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; id: string }>;
}) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const context = await requireOrganisation(slug);

  // Scope is applied in the query itself: a player outside the organisation is
  // simply not found, rather than fetched and then checked.
  const player = await prisma.player.findFirst({
    where: { AND: [{ id }, organisationScope(context)] },
    include: {
      videos: { orderBy: { createdAt: "desc" } },
      transfers: {
        orderBy: { date: "desc" },
        include: { fromClub: true, toClub: true },
      },
    },
  });
  if (!player) notFound();

  const [countries, clubs, seasons, statistics] = await Promise.all([
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.club.findMany({
      where: context.clubId ? { id: { not: context.clubId } } : undefined,
      orderBy: { nameFr: "asc" },
    }),
    prisma.season.findMany({ orderBy: { startDate: "desc" } }),
    playerStatistics(player.id),
  ]);
  const options = playerFormOptions(t);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <p className="text-sm text-muted">
          <Link href={`/account/org/${slug}`} className="hover:text-brand">
            {context.organisationName}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">{player.name}</h1>
        <Link
          href={`/players/${player.slug}`}
          className="mt-1 inline-block text-sm text-brand hover:underline"
        >
          {t("org.viewPublicProfile")}
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 font-semibold">{t("player.profile")}</h2>
        <OrgPlayerForm
          action={saveOrgPlayer}
          orgSlug={slug}
          countries={countries.map((country) => ({
            value: country.id,
            label: localizedName(country, locale),
          }))}
          {...options}
          defaults={{
            id: player.id,
            name: player.name,
            nameAr: player.nameAr,
            dateOfBirth: toDateInput(player.dateOfBirth),
            position: player.position,
            foot: player.foot,
            ageCategory: player.ageCategory,
            squadLevel: player.squadLevel,
            heightCm: player.heightCm,
            shirtNumber: player.shirtNumber,
            contractUntil: toDateInput(player.contractUntil),
            nationalityId: player.nationalityId,
            photoUrl: player.photoUrl,
          }}
          labels={playerFormLabels(t)}
        />
      </section>

      {statistics.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-1 font-semibold">{t("statistics.title")}</h2>
          <p className="mb-4 text-sm text-muted">{t("org.statsFromSheets")}</p>
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
        </section>
      )}

      {context.clubId && (
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold">{t("player.transferHistory")}</h2>

          {player.transfers.length === 0 ? (
            <p className="mb-6 text-sm text-muted">{t("player.noTransfers")}</p>
          ) : (
            <ul className="mb-6 divide-y divide-border rounded-lg border border-border">
              {player.transfers.map((transfer) => (
                <li
                  key={transfer.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <span>
                    <span className="font-medium">
                      {transfer.fromClub
                        ? localizedName(transfer.fromClub, locale)
                        : "—"}
                      {" → "}
                      {transfer.toClub ? localizedName(transfer.toClub, locale) : "—"}
                    </span>
                    <span className="block text-muted">
                      {formatDate(transfer.date, locale)} ·{" "}
                      {t(`transferType.${transfer.type}`)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4">
                    <span className="font-semibold tabular-nums">
                      {transfer.isFeeUndisclosed
                        ? t("transfers.undisclosed")
                        : formatUsd(transfer.feeUsd, locale)}
                    </span>
                    <form action={deleteOrgTransfer}>
                      <input type="hidden" name="orgSlug" value={slug} />
                      <input type="hidden" name="id" value={transfer.id} />
                      <button
                        type="submit"
                        className="text-sm text-danger hover:underline"
                      >
                        {t("org.removeTransfer")}
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("org.addTransfer")}
          </h3>
          <OrgTransferForm
            action={saveOrgTransfer}
            orgSlug={slug}
            playerId={player.id}
            clubs={clubs.map((club) => ({
              value: club.id,
              label: localizedName(club, locale),
            }))}
            seasons={seasons.map((season) => ({
              value: season.id,
              label: season.label,
            }))}
            types={TRANSFER_TYPES.map((type) => ({
              value: type,
              label: t(`transferType.${type}`),
            }))}
            labels={{
              direction: t("org.transferDirection"),
              arrival: t("club.arrivals"),
              departure: t("club.departures"),
              fromClub: t("transfers.from"),
              toClub: t("transfers.to"),
              noClub: t("player.freeAgent"),
              date: t("transfers.date"),
              type: t("transfers.type"),
              season: t("transfers.season"),
              fee: t("org.transferFee"),
              undisclosed: t("transfers.undisclosed"),
              choose: t("org.none"),
              submit: t("org.saveTransfer"),
              pending: t("common.loading"),
            }}
          />
        </section>
      )}

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 font-semibold">{t("player.videos")}</h2>

        {player.videos.length === 0 ? (
          <p className="mb-6 text-sm text-muted">{t("player.noVideos")}</p>
        ) : (
          <ul className="mb-6 divide-y divide-border rounded-lg border border-border">
            {player.videos.map((video) => (
              <li key={video.id} className="p-3 text-sm">
                <p className="font-medium">
                  {video.title ?? t(`videoType.${video.type}`)}
                </p>
                <p className="break-all text-xs text-muted">{video.url}</p>
              </li>
            ))}
          </ul>
        )}

        <OrgVideoForm
          action={addOrgPlayerVideo}
          orgSlug={slug}
          playerId={player.id}
          types={VIDEO_TYPES.map((type) => ({
            value: type,
            label: t(`videoType.${type}`),
          }))}
          labels={{
            url: t("org.videoUrl"),
            urlHint: t("org.videoUrlHint"),
            title: t("org.videoTitle"),
            type: t("transfers.type"),
            submit: t("org.addVideo"),
            pending: t("common.loading"),
          }}
        />
      </section>
    </div>
  );
}
