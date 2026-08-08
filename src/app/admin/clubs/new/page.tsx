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

  const [competitions, clubs] = await Promise.all([
    prisma.competition.findMany({
      orderBy: { nameFr: "asc" },
      include: { country: true },
    }),
    prisma.club.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  return (
    <AdminShell title="Ajouter un club">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveClub}
          cancelHref="/admin/clubs"
          submitLabel="Créer le club"
          fields={clubFields(
            competitions.map((competition) => ({
              value: competition.id,
              label: competition.country
                ? `${competition.nameFr} (${competition.country.nameFr})`
                : competition.nameFr,
            })),
            clubs.map((club) => ({ value: club.id, label: club.nameFr })),
          )}
        />
      </div>
    </AdminShell>
  );
}
