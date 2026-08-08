import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { DeleteButton } from "@/components/delete-button";
import { deleteClub } from "../actions";

export default async function AdminClubsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const clubs = await prisma.club.findMany({
    orderBy: [{ league: { nameFr: "asc" } }, { nameFr: "asc" }],
    include: {
      league: { include: { country: true } },
      _count: { select: { players: true } },
    },
  });

  return (
    <AdminShell
      title="Clubs"
      action={
        <Link
          href="/admin/clubs/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
        >
          Ajouter un club
        </Link>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Club</th>
              <th className="px-4 py-3 text-left font-medium">Championnat</th>
              <th className="px-4 py-3 text-left font-medium">Ville</th>
              <th className="px-4 py-3 text-right font-medium">Joueurs</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clubs.map((club) => (
              <tr key={club.id}>
                <td className="px-4 py-3 font-medium">{club.nameFr}</td>
                <td className="px-4 py-3 text-muted">
                  {club.league.nameFr}
                  <span className="block text-xs">{club.league.country.nameFr}</span>
                </td>
                <td className="px-4 py-3 text-muted">{club.city ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {club._count.players}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/admin/clubs/${club.id}`}
                      className="text-brand hover:underline"
                    >
                      Modifier
                    </Link>
                    <DeleteButton
                      action={deleteClub}
                      id={club.id}
                      confirmLabel={`Supprimer « ${club.nameFr} » ? Cette action est définitive.`}
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
