import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireOrganisation, playersInScope } from "@/lib/org-access";
import { formatUsd, ageFrom } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { currentValueOf } from "@/lib/queries";
import { DataTable, SectionTitle } from "@/components/data-table";
import { Badge } from "@/components/profile-header";
import { PlayerPhoto, Flag } from "@/components/ui/media";

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const context = await requireOrganisation(slug);
  const players = await playersInScope(context);

  const totalValue = players.reduce(
    (sum, player) => sum + (currentValueOf(player) ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {t(`organisationType.${context.type}`)}
          </p>
          <h1 className="text-2xl font-bold">{context.organisationName}</h1>
        </div>
        <Link
          href={`/account/org/${slug}/players/new`}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
        >
          {t("org.addPlayer")}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("org.playerCount")} value={String(players.length)} />
        <Stat
          label={t("club.totalValue")}
          value={totalValue > 0 ? formatUsd(totalValue, locale) : "—"}
        />
        <Stat label={t("account.title")} value={t(`memberRole.${context.role}`)} />
      </div>

      <section>
        <SectionTitle>{t("org.myPlayers")}</SectionTitle>

        {players.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="font-medium">{t("org.noPlayers")}</p>
            <p className="mt-1 text-sm text-muted">{t("org.noPlayersHint")}</p>
            <Link
              href={`/account/org/${slug}/players/new`}
              className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              {t("org.addPlayer")}
            </Link>
          </div>
        ) : (
          <DataTable
            headers={[
              { label: "#", align: "center" },
              { label: t("transfers.player") },
              { label: t("player.position") },
              { label: t("player.squadLevel") },
              { label: t("player.age"), align: "end" },
              { label: t("player.marketValue"), align: "end" },
            ]}
          >
            {players.map((player) => (
              <tr key={player.id} className="hover:bg-brand/5">
                <td className="px-3 py-2 text-center tabular-nums text-muted">
                  {player.shirtNumber ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/account/org/${slug}/players/${player.id}`}
                    className="inline-flex items-center gap-2.5 font-medium hover:text-brand"
                  >
                    <PlayerPhoto
                      src={player.photoUrl}
                      name={playerName(player, locale)}
                      size="sm"
                    />
                    <span>
                      {playerName(player, locale)}
                      {player.nationality && (
                        <span className="ms-2 inline-flex align-middle">
                          <Flag
                            src={player.nationality.flagUrl}
                            label={localizedName(player.nationality, locale)}
                          />
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">
                  {player.position ? t(`position.${player.position}`) : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge>{t(`squadLevel.${player.squadLevel}`)}</Badge>
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
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
