import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrganisation } from "@/lib/org-access";
import { formatDate } from "@/lib/format";
import { localizedName, playerName } from "@/lib/localized";
import { TeamSheetForm, type SheetRow } from "@/components/team-sheet-form";
import { saveTeamSheet } from "@/app/[locale]/account/org/match-actions";

export default async function TeamSheetPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string; id: string }>;
}) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const context = await requireOrganisation(slug);
  if (!context.clubId) notFound();

  // The club must be one of the two sides, or the match is simply not found.
  const match = await prisma.match.findFirst({
    where: {
      id,
      OR: [{ homeClubId: context.clubId }, { awayClubId: context.clubId }],
    },
    include: {
      competition: true,
      season: true,
      homeClub: true,
      awayClub: true,
      appearances: { where: { clubId: context.clubId } },
    },
  });
  if (!match) notFound();

  const squad = await prisma.player.findMany({
    where: { clubId: context.clubId },
    orderBy: [{ squadLevel: "asc" }, { position: "asc" }, { name: "asc" }],
  });

  const existing = new Map(
    match.appearances.map((appearance) => [appearance.playerId, appearance]),
  );

  const rows: SheetRow[] = squad.map((player) => {
    const appearance = existing.get(player.id);
    return {
      playerId: player.id,
      name: playerName(player, locale),
      position: player.position ? t(`position.${player.position}`) : "—",
      isGoalkeeper: player.position === "GK",
      played: appearance !== undefined,
      isStarter: appearance?.isStarter ?? true,
      minutesPlayed: appearance?.minutesPlayed ?? 90,
      goals: appearance?.goals ?? 0,
      assists: appearance?.assists ?? 0,
      yellowCards: appearance?.yellowCards ?? 0,
      redCards: appearance?.redCards ?? 0,
      cleanSheet: appearance?.cleanSheet ?? false,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted">
          <Link href={`/account/org/${slug}/matches`} className="hover:text-brand">
            {t("match.title")}
          </Link>
        </p>
        <h1 className="text-2xl font-bold">
          {localizedName(match.homeClub, locale)}
          {match.homeScore !== null && match.awayScore !== null
            ? ` ${match.homeScore} – ${match.awayScore} `
            : " — "}
          {localizedName(match.awayClub, locale)}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {localizedName(match.competition, locale)} · {match.season.label} ·{" "}
          {formatDate(match.date, locale)}
        </p>
      </div>

      {squad.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">{t("match.noSquad")}</p>
          <Link
            href={`/account/org/${slug}/players/new`}
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            {t("org.addPlayer")}
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold">{t("match.sheet")}</h2>
          <TeamSheetForm
            action={saveTeamSheet}
            orgSlug={slug}
            matchId={match.id}
            rows={rows}
            labels={{
              played: t("match.played"),
              player: t("transfers.player"),
              starter: t("match.starter"),
              minutes: t("match.minutes"),
              goals: t("match.goals"),
              assists: t("match.assists"),
              cleanSheet: t("match.cleanSheet"),
              cleanSheetHint: t("match.cleanSheetHint"),
              selectedCount: t.raw("match.selectedCount") as string,
              valuationNote: t("match.valuationNote"),
              submit: t("match.saveSheet"),
              cancel: t("common.back"),
              pending: t("common.loading"),
            }}
          />
        </div>
      )}
    </div>
  );
}
