import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { DeleteButton } from "@/components/delete-button";
import { saveCoach, saveCoachSpell, deleteCoachSpell } from "../../actions";
import { coachFields, coachSpellFields, COACH_ROLES } from "../coach-fields";

const ROLE_LABELS = Object.fromEntries(
  COACH_ROLES.map((role) => [role.value, role.label]),
);

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function EditCoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const [coach, countries, clubs] = await Promise.all([
    prisma.coach.findUnique({
      where: { id },
      include: {
        spells: { orderBy: { startDate: "desc" }, include: { club: true } },
      },
    }),
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.club.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  if (!coach) notFound();

  return (
    <AdminShell title={`Modifier — ${coach.name}`}>
      <div className="space-y-8">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold">Fiche</h2>
          <AdminForm
            action={saveCoach}
            id={coach.id}
            cancelHref="/admin/coaches"
            submitLabel="Enregistrer"
            fields={coachFields(
              countries.map((country) => ({
                value: country.id,
                label: country.nameFr,
              })),
              coach,
            )}
          />
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 font-semibold">Parcours</h2>

          {coach.spells.length === 0 ? (
            <p className="text-sm text-muted">Aucun passage enregistré.</p>
          ) : (
            <div className="mb-6 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Club</th>
                    <th className="px-4 py-3 text-left font-medium">Fonction</th>
                    <th className="px-4 py-3 text-left font-medium">Début</th>
                    <th className="px-4 py-3 text-left font-medium">Fin</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {coach.spells.map((spell) => (
                    <tr key={spell.id}>
                      <td className="px-4 py-3 font-medium">{spell.club.nameFr}</td>
                      <td className="px-4 py-3 text-muted">
                        {ROLE_LABELS[spell.role] ?? spell.role}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {dateFormat.format(spell.startDate)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {spell.endDate ? dateFormat.format(spell.endDate) : "En poste"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DeleteButton
                            action={deleteCoachSpell}
                            id={spell.id}
                            confirmLabel={`Supprimer le passage à ${spell.club.nameFr} ?`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wide">
            Ajouter un passage
          </h3>
          <AdminForm
            action={saveCoachSpell}
            cancelHref="/admin/coaches"
            submitLabel="Ajouter le passage"
            fields={coachSpellFields(
              coach.id,
              clubs.map((club) => ({ value: club.id, label: club.nameFr })),
            )}
          />
        </section>
      </div>
    </AdminShell>
  );
}
