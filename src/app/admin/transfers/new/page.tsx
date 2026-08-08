import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveTransfer } from "../../actions";
import { transferFields } from "../transfer-fields";

export default async function NewTransferPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const [players, clubs, seasons] = await Promise.all([
    prisma.player.findMany({ orderBy: { name: "asc" }, include: { club: true } }),
    prisma.club.findMany({
      orderBy: { nameFr: "asc" },
      include: { primaryCompetition: { include: { country: true } } },
    }),
    prisma.season.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  return (
    <AdminShell title="Enregistrer un transfert">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveTransfer}
          cancelHref="/admin/transfers"
          submitLabel="Enregistrer le transfert"
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
            { seasonId: seasons.find((season) => season.isCurrent)?.id ?? null },
          )}
        />
      </div>
    </AdminShell>
  );
}
