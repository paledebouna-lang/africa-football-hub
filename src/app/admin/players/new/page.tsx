import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { savePlayer } from "../../actions";
import { playerFields } from "../player-fields";

export default async function NewPlayerPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const [clubs, countries] = await Promise.all([
    prisma.club.findMany({
      orderBy: { nameFr: "asc" },
      include: { league: { include: { country: true } } },
    }),
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  return (
    <AdminShell title="Ajouter un joueur">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={savePlayer}
          cancelHref="/admin/players"
          submitLabel="Créer le joueur"
          fields={playerFields(
            clubs.map((club) => ({
              value: club.id,
              label: `${club.nameFr} (${club.league.country.nameFr})`,
            })),
            countries.map((country) => ({
              value: country.id,
              label: country.nameFr,
            })),
            null,
          )}
        />
      </div>
    </AdminShell>
  );
}
