import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveClub } from "../../actions";
import { clubFields } from "../club-fields";

export default async function NewClubPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const leagues = await prisma.league.findMany({
    orderBy: { nameFr: "asc" },
    include: { country: true },
  });

  return (
    <AdminShell title="Ajouter un club">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveClub}
          cancelHref="/admin/clubs"
          submitLabel="Créer le club"
          fields={clubFields(
            leagues.map((league) => ({
              value: league.id,
              label: `${league.nameFr} (${league.country.nameFr})`,
            })),
          )}
        />
      </div>
    </AdminShell>
  );
}
