import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { DeleteButton } from "@/components/delete-button";
import { deletePlayer } from "../actions";

export default async function AdminPlayersPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
    include: {
      club: true,
      marketValues: { orderBy: { effectiveAt: "desc" }, take: 1 },
    },
  });

  const euro = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  return (
    <AdminShell
      title="Joueurs"
      action={
        <Link
          href="/admin/players/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
        >
          Ajouter un joueur
        </Link>
      }
    >
      {players.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">Aucun joueur enregistré.</p>
          <p className="mt-1 text-sm text-muted">
            Commence par ajouter un joueur : il apparaîtra aussitôt sur le site
            public.
          </p>
          <Link
            href="/admin/players/new"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            Ajouter un joueur
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Joueur</th>
                <th className="px-4 py-3 text-left font-medium">Club</th>
                <th className="px-4 py-3 text-left font-medium">Poste</th>
                <th className="px-4 py-3 text-right font-medium">Valeur</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="px-4 py-3 font-medium">{player.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {player.club?.nameFr ?? "Sans club"}
                  </td>
                  <td className="px-4 py-3 text-muted">{player.position ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {player.marketValues[0]
                      ? euro.format(player.marketValues[0].valueEur)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/players/${player.id}`}
                        className="text-brand hover:underline"
                      >
                        Modifier
                      </Link>
                      <DeleteButton
                        action={deletePlayer}
                        id={player.id}
                        confirmLabel={`Supprimer « ${player.name} » ? Ses transferts et valeurs seront également supprimés.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
