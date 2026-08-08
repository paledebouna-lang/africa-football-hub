import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatEur, formatDate, ageFrom } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { getClubBySlug, currentValueOf, squadValue } from "@/lib/queries";

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

  const total = squadValue(club.players);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header>
        <p className="text-sm text-muted">
          <Link
            href={`/leagues/${club.league.slug}`}
            className="hover:text-brand"
          >
            {localizedName(club.league, locale)}
          </Link>
          {" · "}
          {localizedName(club.league.country, locale)}
        </p>
        <h1 className="text-2xl font-bold">{localizedName(club, locale)}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label={t("club.city")} value={club.city ?? "—"} />
        <InfoCard label={t("club.stadium")} value={club.stadium ?? "—"} />
        <InfoCard
          label={t("club.founded")}
          value={club.founded ? String(club.founded) : "—"}
        />
        <InfoCard
          label={t("club.totalValue")}
          value={total > 0 ? formatEur(total, locale) : "—"}
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t("club.squad")}</h2>
        {club.players.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("club.noPlayers")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">#</th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("transfers.player")}
                  </th>
                  <th className="px-4 py-3 text-start font-medium">
                    {t("player.position")}
                  </th>
                  <th className="px-4 py-3 text-end font-medium">{t("player.age")}</th>
                  <th className="px-4 py-3 text-end font-medium">
                    {t("player.marketValue")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {club.players.map((player) => {
                  const age = ageFrom(player.dateOfBirth);
                  return (
                    <tr key={player.id}>
                      <td className="px-4 py-3 text-muted tabular-nums">
                        {player.shirtNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/players/${player.slug}`}
                          className="font-medium hover:text-brand"
                        >
                          {playerName(player, locale)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {player.position ? t(`position.${player.position}`) : "—"}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums">
                        {age ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums font-medium">
                        {formatEur(currentValueOf(player), locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <TransferList
          title={t("club.arrivals")}
          empty={t("player.noTransfers")}
          rows={club.transfersIn.map((transfer) => ({
            id: transfer.id,
            playerSlug: transfer.player.slug,
            playerLabel: playerName(transfer.player, locale),
            otherClub: transfer.fromClub
              ? localizedName(transfer.fromClub, locale)
              : "—",
            date: formatDate(transfer.date, locale),
            fee: transfer.isFeeUndisclosed
              ? t("transfers.undisclosed")
              : formatEur(transfer.feeEur, locale),
          }))}
        />
        <TransferList
          title={t("club.departures")}
          empty={t("player.noTransfers")}
          rows={club.transfersOut.map((transfer) => ({
            id: transfer.id,
            playerSlug: transfer.player.slug,
            playerLabel: playerName(transfer.player, locale),
            otherClub: transfer.toClub
              ? localizedName(transfer.toClub, locale)
              : "—",
            date: formatDate(transfer.date, locale),
            fee: transfer.isFeeUndisclosed
              ? t("transfers.undisclosed")
              : formatEur(transfer.feeEur, locale),
          }))}
        />
      </div>
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

type TransferRow = {
  id: string;
  playerSlug: string;
  playerLabel: string;
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
      <h2 className="text-xl font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((row) => (
            <li key={row.id} className="p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/players/${row.playerSlug}`}
                  className="font-medium hover:text-brand"
                >
                  {row.playerLabel}
                </Link>
                <span className="shrink-0 text-muted">{row.fee}</span>
              </div>
              <p className="mt-1 text-muted">
                {row.otherClub} · {row.date}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
