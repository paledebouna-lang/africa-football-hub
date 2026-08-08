import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveCompetition } from "../../actions";
import { competitionFields } from "../competition-fields";

export default async function NewCompetitionPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const countries = await prisma.country.findMany({ orderBy: { nameFr: "asc" } });

  return (
    <AdminShell title="Ajouter une compétition">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveCompetition}
          cancelHref="/admin/competitions"
          submitLabel="Créer la compétition"
          fields={competitionFields(
            countries.map((country) => ({
              value: country.id,
              label: country.nameFr,
            })),
          )}
        />
      </div>
    </AdminShell>
  );
}
