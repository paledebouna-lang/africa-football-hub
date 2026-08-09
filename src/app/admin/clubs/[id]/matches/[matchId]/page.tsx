import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminTeamSheetForm } from "@/components/admin-team-sheet-form";
import { saveAdminTeamSheet } from "../../../../actions";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const POSITION_LABELS: Record<string, string> = {
  GK: "Gardien",
  CB: "Défenseur central",
  LB: "Arrière gauche",
  RB: "Arrière droit",
  DM: "Milieu défensif",
  CM: "Milieu central",
  AM: "Milieu offensif",
  LW: "Ailier gauche",
  RW: "Ailier droit",
  ST: "Attaquant",
};

export default async function AdminTeamSheetPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id, matchId } = await params;

  // The club must be one of the two sides, otherwise this sheet is meaningless.
  const match = await prisma.match.findFirst({
    where: { id: matchId, OR: [{ homeClubId: id }, { awayClubId: id }] },
    include: {
      competition: true,
      season: true,
      homeClub: true,
      awayClub: true,
      appearances: { where: { clubId: id } },
    },
  });
  if (!match) notFound();

  const [club, squad] = await Promise.all([
    prisma.club.findUnique({ where: { id } }),
    prisma.player.findMany({
      where: { clubId: id },
      orderBy: [{ squadLevel: "asc" }, { position: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!club) notFound();

  const existing = new Map(
    match.appearances.map((appearance) => [appearance.playerId, appearance]),
  );

  const rows = squad.map((player) => {
    const appearance = existing.get(player.id);
    return {
      playerId: player.id,
      name: player.name,
      position: player.position ? POSITION_LABELS[player.position] ?? "—" : "—",
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
    <AdminShell
      title={`${match.homeClub.nameFr} ${match.homeScore ?? "—"} – ${match.awayScore ?? "—"} ${match.awayClub.nameFr}`}
      action={
        <Link
          href={`/admin/clubs/${id}/matches`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          Retour aux matchs
        </Link>
      }
    >
      <p className="mb-6 text-sm text-muted">
        {match.competition.nameFr} · {match.season.label} ·{" "}
        {dateFormat.format(match.date)} — feuille de {club.nameFr}
      </p>

      {squad.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">Ce club n&apos;a aucun joueur enregistré.</p>
          <p className="mt-1 text-sm text-muted">
            Ajoute des joueurs pour pouvoir remplir la feuille de match.
          </p>
          <Link
            href="/admin/players/new"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            Ajouter un joueur
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6">
          <AdminTeamSheetForm
            action={saveAdminTeamSheet}
            matchId={match.id}
            clubId={club.id}
            rows={rows}
          />
        </div>
      )}
    </AdminShell>
  );
}
