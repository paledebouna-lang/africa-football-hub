import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveTransfer } from "../../actions";
import { transferFields } from "../transfer-fields";

export default async function EditTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const [transfer, players, clubs, seasons] = await Promise.all([
    prisma.transfer.findUnique({ where: { id }, include: { player: true } }),
    prisma.player.findMany({ orderBy: { name: "asc" }, include: { club: true } }),
    prisma.club.findMany({
      orderBy: { nameFr: "asc" },
      include: { primaryCompetition: { include: { country: true } } },
    }),
    prisma.season.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  if (!transfer) notFound();

  return (
    <AdminShell title={`Modifier — transfert de ${transfer.player.name}`}>
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveTransfer}
          id={transfer.id}
          cancelHref="/admin/transfers"
          submitLabel="Enregistrer"
          fields={transferFields(
            players.map((player) => ({
              value: player.id,
              label: player.club
                ? `${player.name} (${player.club.nameFr})`
                : player.name,
            })),
            clubs.map((club) => ({
              value: club.id,
              label: club.primaryCompetition?.country
                ? `${club.nameFr} (${club.primaryCompetition.country.nameFr})`
                : club.nameFr,
            })),
            seasons.map((season) => ({
              value: season.id,
              label: season.label,
            })),
            transfer,
          )}
        />
      </div>
    </AdminShell>
  );
}
