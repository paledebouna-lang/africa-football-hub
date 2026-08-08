import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatUsd, formatDate, ageFrom } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { getClubBySlug, currentValueOf, squadValue } from "@/lib/queries";
import { groupByAgeCategory } from "@/lib/categories";
import { ProfileHeader, Badge, DataGrid, DataPoint } from "@/components/profile-header";
import { DataTable, SectionTitle } from "@/components/data-table";
import { Crest, PlayerPhoto, Flag } from "@/components/ui/media";

export default async function ClubPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const club = await getClubBySlug(slug);
  if (!club) notFound();

  const clubName = localizedName(club, locale);
  const total = squadValue(club.players);
  const squadGroups = groupByAgeCategory(club.players);
  const isAcademy = club.type === "ACADEMY";
  const country = club.primaryCompetition?.country ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <ProfileHeader
        media={<Crest src={club.logoUrl} name={clubName} size="xl" />}
        breadcrumb={
          club.primaryCompetition ? (
            <span className="inline-flex items-center gap-1.5">
              {country && (
                <Flag
                  src={country.flagUrl}
                  label={localizedName(country, locale)}
                />
              )}
              <Link
                href={`/competitions/${club.primaryCompetition.slug}`}
                className="hover:text-brand"
              >
                {localizedName(club.primaryCompetition, locale)}
              </Link>
            </span>
          ) : club.parentClub ? (
            <Link href={`/clubs/${club.parentClub.slug}`} className="hover:text-brand">
              {t("club.parentClub")} : {localizedName(club.parentClub, locale)}
            </Link>
          ) : null
        }
        title={clubName}
        subtitle={club.city ?? undefined}
        badges={
          <>
            {isAcademy && <Badge tone="accent">{t("club.academy")}</Badge>}
            {club.fifaCategory !== null && (
              <Badge>FIFA {"I".repeat(club.fifaCategory)}</Badge>
            )}
            {club.founded !== null && <Badge>{club.founded}</Badge>}
          </>
        }
        figureLabel={t("club.totalValue")}
        figure={total > 0 ? formatUsd(total, locale) : "—"}
      />

      <DataGrid>
        <DataPoint label={t("club.city")}>{club.city ?? "—"}</DataPoint>
        <DataPoint label={t("club.stadium")}>{club.stadium ?? "—"}</DataPoint>
        <DataPoint label={t("club.founded")}>{club.founded ?? "—"}</DataPoint>
        <DataPoint label={t("league.squadSize")}>{club.players.length}</DataPoint>
      </DataGrid>

      {club.entries.length > 0 && (
        <section>
          <SectionTitle>{t("club.competitions", { season: "" }).trim()}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {club.entries.map((entry) => (
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

      {club.academies.length > 0 && (
        <section>
          <SectionTitle>{t("club.academies")}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {club.academies.map((academy) => (
              <li key={academy.id}>
                <Link
                  href={`/clubs/${academy.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-brand"
                >
                  <Crest src={academy.logoUrl} name={academy.nameFr} size="sm" />
                  {localizedName(academy, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>{t("club.squad")}</SectionTitle>
        {squadGroups.length === 0 ? (
          <p className="text-sm text-muted">{t("club.noPlayers")}</p>
        ) : (
          <div className="space-y-5">
            {squadGroups.map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                  {t(`ageCategory.${group.category}`)}
                  <span className="ms-2 font-normal normal-case">
                    ({group.players.length})
                  </span>
                </h3>
                <DataTable
                  headers={[
                    { label: "#", align: "center" },
                    { label: t("transfers.player") },
                    { label: t("player.position") },
                    { label: t("player.nationality") },
                    { label: t("player.age"), align: "end" },
                    { label: t("player.marketValue"), align: "end" },
                  ]}
                >
                  {group.players.map((player) => (
                    <tr key={player.id} className="hover:bg-brand/5">
                      <td className="px-3 py-2 text-center tabular-nums text-muted">
                        {player.shirtNumber ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/players/${player.slug}`}
                          className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                        >
                          <PlayerPhoto
                            src={player.photoUrl}
                            name={playerName(player, locale)}
                            size="sm"
                          />
                          {playerName(player, locale)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {player.position ? t(`position.${player.position}`) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {player.nationality ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Flag
                              src={player.nationality.flagUrl}
                              label={localizedName(player.nationality, locale)}
                            />
                            <span className="text-muted">
                              {localizedName(player.nationality, locale)}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {ageFrom(player.dateOfBirth) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-end font-semibold tabular-nums text-brand">
                        {formatUsd(currentValueOf(player), locale)}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>{t("coach.staff")}</SectionTitle>
        {club.coachSpells.length === 0 ? (
          <p className="text-sm text-muted">{t("coach.noStaff")}</p>
        ) : (
          <DataTable
            headers={[{ label: t("coach.title") }, { label: t("coach.role") }]}
          >
            {club.coachSpells.map((spell) => (
              <tr key={spell.id} className="hover:bg-brand/5">
                <td className="px-3 py-2">
                  <Link
                    href={`/coaches/${spell.coach.slug}`}
                    className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                  >
                    <PlayerPhoto
                      src={spell.coach.photoUrl}
                      name={spell.coach.name}
                      size="sm"
                    />
                    {spell.coach.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{t(`coachRole.${spell.role}`)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TransferList
          title={t("club.arrivals")}
          empty={t("player.noTransfers")}
          rows={club.transfersIn.map((transfer) => ({
            id: transfer.id,
            playerSlug: transfer.player.slug,
            playerLabel: playerName(transfer.player, locale),
            photoUrl: transfer.player.photoUrl,
            otherClub: transfer.fromClub
              ? localizedName(transfer.fromClub, locale)
              : "—",
            date: formatDate(transfer.date, locale),
            fee: transfer.isFeeUndisclosed
              ? t("transfers.undisclosed")
              : formatUsd(transfer.feeUsd, locale),
          }))}
        />
        <TransferList
          title={t("club.departures")}
          empty={t("player.noTransfers")}
          rows={club.transfersOut.map((transfer) => ({
            id: transfer.id,
            playerSlug: transfer.player.slug,
            playerLabel: playerName(transfer.player, locale),
            photoUrl: transfer.player.photoUrl,
            otherClub: transfer.toClub ? localizedName(transfer.toClub, locale) : "—",
            date: formatDate(transfer.date, locale),
            fee: transfer.isFeeUndisclosed
              ? t("transfers.undisclosed")
              : formatUsd(transfer.feeUsd, locale),
          }))}
        />
      </div>
    </div>
  );
}

type TransferRow = {
  id: string;
  playerSlug: string;
  playerLabel: string;
  photoUrl: string | null;
  otherClub: string;
  date: string;
  fee: string;
};

function TransferList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: TransferRow[];
}) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 p-3 text-sm">
              <PlayerPhoto src={row.photoUrl} name={row.playerLabel} size="md" />
              <span className="min-w-0 flex-1">
                <Link
                  href={`/players/${row.playerSlug}`}
                  className="font-medium hover:text-brand"
                >
                  {row.playerLabel}
                </Link>
                <span className="block text-muted">
                  {row.otherClub} · {row.date}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{row.fee}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
