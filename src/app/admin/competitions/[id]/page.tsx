import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveCompetition } from "../../actions";
import { competitionFields } from "../competition-fields";

export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const [competition, countries] = await Promise.all([
    prisma.competition.findUnique({ where: { id } }),
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  if (!competition) notFound();

  return (
    <AdminShell title={`Modifier — ${competition.nameFr}`}>
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveCompetition}
          id={competition.id}
          cancelHref="/admin/competitions"
          submitLabel="Enregistrer"
          fields={competitionFields(
            countries.map((country) => ({
              value: country.id,
              label: country.nameFr,
            })),
            competition,
          )}
        />
      </div>
    </AdminShell>
  );
}
