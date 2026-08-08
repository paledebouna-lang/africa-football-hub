import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { DeleteButton } from "@/components/delete-button";
import { deleteTransfer } from "../actions";

export default async function AdminTransfersPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const [transfers, playerCount] = await Promise.all([
    prisma.transfer.findMany({
      orderBy: { date: "desc" },
      include: { player: true, fromClub: true, toClub: true, season: true },
    }),
    prisma.player.count(),
  ]);

  const euro = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

  return (
    <AdminShell
      title="Transferts"
      action={
        playerCount > 0 ? (
          <Link
            href="/admin/transfers/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            Enregistrer un transfert
          </Link>
        ) : null
      }
    >
      {playerCount === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">Ajoute d&apos;abord des joueurs.</p>
          <p className="mt-1 text-sm text-muted">
            Un transfert doit être rattaché à un joueur existant.
          </p>
          <Link
            href="/admin/players/new"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            Ajouter un joueur
          </Link>
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">Aucun transfert enregistré.</p>
          <Link
            href="/admin/transfers/new"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            Enregistrer un transfert
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Joueur</th>
                <th className="px-4 py-3 text-left font-medium">De</th>
                <th className="px-4 py-3 text-left font-medium">Vers</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {dateFormat.format(transfer.date)}
                  </td>
                  <td className="px-4 py-3 font-medium">{transfer.player.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {transfer.fromClub?.nameFr ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {transfer.toClub?.nameFr ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {transfer.isFeeUndisclosed
                      ? "Non communiqué"
                      : transfer.feeEur !== null
                        ? euro.format(transfer.feeEur)
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/transfers/${transfer.id}`}
                        className="text-brand hover:underline"
                      >
                        Modifier
                      </Link>
                      <DeleteButton
                        action={deleteTransfer}
                        id={transfer.id}
                        confirmLabel={`Supprimer ce transfert de « ${transfer.player.name} » ?`}
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
