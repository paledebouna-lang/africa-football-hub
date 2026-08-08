import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { toggleClubEntry } from "../../../actions";

export default async function CompetitionClubsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const [competition, season, clubs] = await Promise.all([
    prisma.competition.findUnique({ where: { id }, include: { country: true } }),
    prisma.season.findFirst({ where: { isCurrent: true } }),
    prisma.club.findMany({
      where: { type: "CLUB" },
      orderBy: { nameFr: "asc" },
      include: { primaryCompetition: { include: { country: true } } },
    }),
  ]);

  if (!competition) notFound();

  if (!season) {
    return (
      <AdminShell title={competition.nameFr}>
        <p className="text-sm text-muted">
          Aucune saison courante n&apos;est définie. Impossible d&apos;engager des
          clubs.
        </p>
      </AdminShell>
    );
  }

  const entries = await prisma.clubCompetition.findMany({
    where: { competitionId: id, seasonId: season.id },
    select: { clubId: true },
  });
  const entered = new Set(entries.map((entry) => entry.clubId));

  return (
    <AdminShell
      title={`Clubs engagés — ${competition.nameFr}`}
      action={
        <Link
          href="/admin/competitions"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Retour
        </Link>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Saison <strong>{season.label}</strong> · {entered.size} club
        {entered.size > 1 ? "s" : ""} engagé{entered.size > 1 ? "s" : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Club</th>
              <th className="px-4 py-3 text-left font-medium">Championnat</th>
              <th className="px-4 py-3 text-right font-medium">Engagement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clubs.map((club) => {
              const isEntered = entered.has(club.id);

              return (
                <tr key={club.id} className={isEntered ? "bg-brand/5" : undefined}>
                  <td className="px-4 py-3 font-medium">{club.nameFr}</td>
                  <td className="px-4 py-3 text-muted">
                    {club.primaryCompetition?.nameFr ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleClubEntry} className="flex justify-end">
                      <input type="hidden" name="competitionId" value={competition.id} />
                      <input type="hidden" name="clubId" value={club.id} />
                      <input type="hidden" name="seasonId" value={season.id} />
                      <input type="hidden" name="enter" value={isEntered ? "0" : "1"} />
                      <button
                        type="submit"
                        className={
                          isEntered
                            ? "rounded-md border border-border px-3 py-1 text-sm text-muted hover:text-foreground transition-colors"
                            : "rounded-md bg-brand px-3 py-1 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
                        }
                      >
                        {isEntered ? "Retirer" : "Engager"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
