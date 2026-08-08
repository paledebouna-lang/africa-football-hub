import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveCoach } from "../../actions";
import { coachFields } from "../coach-fields";

export default async function NewCoachPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const countries = await prisma.country.findMany({ orderBy: { nameFr: "asc" } });

  return (
    <AdminShell title="Ajouter un entraîneur">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveCoach}
          cancelHref="/admin/coaches"
          submitLabel="Créer l'entraîneur"
          fields={coachFields(
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
