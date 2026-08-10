import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminNationalTeamSheetForm } from "@/components/admin-national-team-sheet-form";
import { saveNationalTeamSheet } from "../../../../actions";

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

export default async function AdminNationalTeamSheetPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id, matchId } = await params;

  const match = await prisma.nationalTeamMatch.findFirst({
    where: { id: matchId, OR: [{ homeCountryId: id }, { awayCountryId: id }] },
    include: {
      competition: true,
      season: true,
      homeCountry: true,
      awayCountry: true,
      appearances: { where: { countryId: id } },
    },
  });
  if (!match) notFound();

  const [country, selections] = await Promise.all([
    prisma.country.findUnique({ where: { id } }),
    prisma.nationalTeamSelection.findMany({
      where: { countryId: id, level: match.ageCategory, isCurrent: true },
      include: { player: true },
      orderBy: [{ player: { position: "asc" } }, { player: { name: "asc" } }],
    }),
  ]);
  if (!country) notFound();

  const existing = new Map(
    match.appearances.map((appearance) => [appearance.playerId, appearance]),
  );

  const rows = selections.map(({ player }) => {
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
      title={`${match.homeCountry.nameFr} ${match.homeScore ?? "—"} – ${match.awayScore ?? "—"} ${match.awayCountry.nameFr}`}
      action={
        <Link
          href={`/admin/countries/${id}/matches`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          Retour aux matchs
        </Link>
      }
    >
      <p className="mb-6 text-sm text-muted">
        {match.competition.nameFr} · {match.season.label} ·{" "}
        {dateFormat.format(match.date)} — feuille de {country.nameFr}
      </p>

      {selections.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">
            Aucun joueur sélectionné actuellement pour cette catégorie.
          </p>
          <p className="mt-1 text-sm text-muted">
            Ajoute des sélections depuis la fiche du joueur avant de remplir
            cette feuille.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6">
          <AdminNationalTeamSheetForm
            action={saveNationalTeamSheet}
            matchId={match.id}
            countryId={country.id}
            rows={rows}
          />
        </div>
      )}
    </AdminShell>
  );
}
