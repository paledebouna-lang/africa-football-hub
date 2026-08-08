import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { DeleteButton } from "@/components/delete-button";
import { deleteCompetition } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  LEAGUE: "Championnat",
  CUP: "Coupe nationale",
  SUPER_CUP: "Supercoupe",
  CONTINENTAL: "Continentale",
  INTERNATIONAL: "Internationale",
  YOUTH: "Jeunes",
};

export default async function AdminCompetitionsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const season = await prisma.season.findFirst({ where: { isCurrent: true } });

  const competitions = await prisma.competition.findMany({
    orderBy: [{ type: "asc" }, { nameFr: "asc" }],
    include: {
      country: true,
      _count: {
        select: { entries: season ? { where: { seasonId: season.id } } : true },
      },
    },
  });

  return (
    <AdminShell
      title="Compétitions"
      action={
        <Link
          href="/admin/competitions/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
        >
          Ajouter une compétition
        </Link>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Compétition</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Pays</th>
              <th className="px-4 py-3 text-center font-medium">Niveau</th>
              <th className="px-4 py-3 text-right font-medium">Clubs engagés</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {competitions.map((competition) => (
              <tr key={competition.id}>
                <td className="px-4 py-3 font-medium">{competition.nameFr}</td>
                <td className="px-4 py-3 text-muted">
                  {TYPE_LABELS[competition.type] ?? competition.type}
                </td>
                <td className="px-4 py-3 text-muted">
                  {competition.country?.nameFr ?? "—"}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-muted">
                  {competition.strengthCoefficient.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {competition._count.entries}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/admin/competitions/${competition.id}/clubs`}
                      className="text-brand hover:underline"
                    >
                      Clubs
                    </Link>
                    <Link
                      href={`/admin/competitions/${competition.id}`}
                      className="text-brand hover:underline"
                    >
                      Modifier
                    </Link>
                    <DeleteButton
                      action={deleteCompetition}
                      id={competition.id}
                      confirmLabel={`Supprimer « ${competition.nameFr} » ? Les engagements des clubs seront également supprimés.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
