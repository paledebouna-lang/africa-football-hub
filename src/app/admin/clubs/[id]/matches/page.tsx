import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm, type Field } from "@/components/admin-form";
import { AGE_CATEGORIES } from "@/lib/categories";
import { saveAdminMatch, deleteAdminMatch } from "../../../actions";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

const CATEGORY_LABELS: Record<string, string> = {
  SENIOR: "Seniors",
  U23: "Moins de 23 ans",
  U21: "Moins de 21 ans",
  U20: "Moins de 20 ans",
  U19: "Moins de 19 ans",
  U18: "Moins de 18 ans",
  U17: "Moins de 17 ans",
  U15: "Moins de 15 ans",
};

export default async function AdminClubMatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const [club, matches, opponents, competitions, seasons] = await Promise.all([
    prisma.club.findUnique({ where: { id } }),
    prisma.match.findMany({
      where: { OR: [{ homeClubId: id }, { awayClubId: id }] },
      orderBy: { date: "desc" },
      include: {
        competition: true,
        homeClub: true,
        awayClub: true,
        _count: { select: { appearances: true } },
      },
    }),
    prisma.club.findMany({ where: { id: { not: id } }, orderBy: { nameFr: "asc" } }),
    prisma.competition.findMany({
      orderBy: { nameFr: "asc" },
      include: { country: true },
    }),
    prisma.season.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  if (!club) notFound();

  const fields: Field[] = [
    {
      kind: "select",
      name: "isHome",
      label: "Lieu du match",
      required: true,
      placeholder: "À domicile",
      options: [
        { value: "1", label: "À domicile" },
        { value: "0", label: "À l'extérieur" },
      ],
      defaultValue: "1",
    },
    {
      kind: "select",
      name: "opponentId",
      label: "Adversaire",
      required: true,
      placeholder: "Choisir un club",
      options: opponents.map((opponent) => ({
        value: opponent.id,
        label: opponent.nameFr,
      })),
    },
    { kind: "date", name: "date", label: "Date du match", required: true },
    {
      kind: "select",
      name: "competitionId",
      label: "Compétition",
      required: true,
      placeholder: "Choisir une compétition",
      options: competitions.map((competition) => ({
        value: competition.id,
        label: competition.country
          ? `${competition.nameFr} (${competition.country.nameFr})`
          : competition.nameFr,
      })),
    },
    {
      kind: "select",
      name: "seasonId",
      label: "Saison",
      required: true,
      placeholder: "Choisir une saison",
      options: seasons.map((season) => ({ value: season.id, label: season.label })),
      defaultValue: seasons.find((season) => season.isCurrent)?.id,
    },
    { kind: "number", name: "ownScore", label: `Buts de ${club.nameFr}` },
    { kind: "number", name: "opponentScore", label: "Buts de l'adversaire" },
    {
      kind: "select",
      name: "ageCategory",
      label: "Catégorie",
      placeholder: "Seniors",
      options: AGE_CATEGORIES.map((category) => ({
        value: category,
        label: CATEGORY_LABELS[category] ?? category,
      })),
      defaultValue: "SENIOR",
    },
    { kind: "number", name: "matchday", label: "Journée" },
    { kind: "text", name: "venue", label: "Stade" },
    { kind: "hidden", name: "clubId", label: "", defaultValue: club.id },
  ];

  return (
    <AdminShell
      title={`Matchs — ${club.nameFr}`}
      action={
        <Link
          href={`/admin/clubs/${club.id}`}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          Retour à la fiche
        </Link>
      }
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 font-semibold">Matchs enregistrés</h2>

          {matches.length === 0 ? (
            <p className="text-sm text-muted">
              Aucun match. Enregistre un match ci-dessous, puis remplis sa feuille
              pour alimenter les statistiques des joueurs.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Rencontre</th>
                    <th className="px-4 py-3 text-left font-medium">Compétition</th>
                    <th className="px-4 py-3 text-center font-medium">Score</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Feuille de match
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {matches.map((match) => (
                    <tr key={match.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {dateFormat.format(match.date)}
                      </td>
                      <td className="px-4 py-3">
                        {match.homeClub.nameFr} — {match.awayClub.nameFr}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {match.competition.nameFr}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums">
                        {match.homeScore === null || match.awayScore === null
                          ? "—"
                          : `${match.homeScore} – ${match.awayScore}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/admin/clubs/${club.id}/matches/${match.id}`}
                            className="font-medium text-brand hover:underline"
                          >
                            {match._count.appearances > 0
                              ? `${match._count.appearances} joueurs`
                              : "Remplir"}
                          </Link>
                          <form action={deleteAdminMatch}>
                            <input type="hidden" name="id" value={match.id} />
                            <input type="hidden" name="clubId" value={club.id} />
                            <button
                              type="submit"
                              className="text-sm text-danger hover:underline"
                            >
                              Supprimer
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold">Enregistrer un match</h2>
          <AdminForm
            action={saveAdminMatch}
            cancelHref={`/admin/clubs/${club.id}`}
            submitLabel="Enregistrer le match"
            fields={fields}
          />
        </section>
      </div>
    </AdminShell>
  );
}
