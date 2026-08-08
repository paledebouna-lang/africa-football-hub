import { prisma } from "@/lib/prisma";
import { AdminForm, type Field, type FieldOption } from "@/components/admin-form";
import { DeleteButton } from "@/components/delete-button";
import { saveHonour, deleteHonour } from "@/app/admin/actions";
import { HONOUR_TYPES } from "@/app/admin/honours/honour-fields";

const TYPE_LABELS = Object.fromEntries(
  HONOUR_TYPES.map((type) => [type.value, type.label]),
);

export type HonourHolder =
  | { kind: "clubId"; id: string }
  | { kind: "playerId"; id: string }
  | { kind: "coachId"; id: string }
  | { kind: "countryId"; id: string };

/**
 * Honours are edited from the profile they belong to rather than a global list:
 * the holder is implied by the page, so it cannot be picked wrongly.
 */
export async function HonoursManager({ holder }: { holder: HonourHolder }) {
  const [honours, competitions] = await Promise.all([
    prisma.honour.findMany({
      where: { [holder.kind]: holder.id },
      orderBy: { year: "desc" },
      include: { competition: true },
    }),
    prisma.competition.findMany({
      orderBy: { nameFr: "asc" },
      include: { country: true },
    }),
  ]);

  const competitionOptions: FieldOption[] = competitions.map((competition) => ({
    value: competition.id,
    label: competition.country
      ? `${competition.nameFr} (${competition.country.nameFr})`
      : competition.nameFr,
  }));

  const fields: Field[] = [
    {
      kind: "select",
      name: "type",
      label: "Nature du titre",
      required: true,
      placeholder: "Vainqueur",
      options: HONOUR_TYPES,
      defaultValue: "WINNER",
    },
    {
      kind: "number",
      name: "year",
      label: "Année",
      required: true,
      defaultValue: String(new Date().getFullYear()),
    },
    {
      kind: "select",
      name: "competitionId",
      label: "Compétition",
      placeholder: "Aucune (intitulé libre)",
      options: competitionOptions,
      hint: "Choisis la compétition, ou laisse vide et saisis un intitulé ci-dessous.",
    },
    {
      kind: "text",
      name: "seasonLabel",
      label: "Saison",
      hint: "Facultatif, ex. « 2024/2025 ».",
    },
    {
      kind: "text",
      name: "titleFr",
      label: "Intitulé libre (français)",
      hint: "Pour une distinction sans compétition, ex. « Ballon d'Or africain ».",
    },
    { kind: "text", name: "titleEn", label: "Intitulé libre (anglais)" },
    { kind: "text", name: "titleAr", label: "Intitulé libre (arabe)" },
    { kind: "hidden", name: holder.kind, label: "", defaultValue: holder.id },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-4 font-semibold">Palmarès</h2>

      {honours.length === 0 ? (
        <p className="mb-6 text-sm text-muted">Aucun titre enregistré.</p>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Année</th>
                <th className="px-4 py-3 text-left font-medium">Titre</th>
                <th className="px-4 py-3 text-left font-medium">Nature</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {honours.map((honour) => (
                <tr key={honour.id}>
                  <td className="px-4 py-3 tabular-nums">{honour.year}</td>
                  <td className="px-4 py-3 font-medium">
                    {honour.competition?.nameFr ?? honour.titleFr ?? "—"}
                    {honour.seasonLabel && (
                      <span className="block text-xs text-muted">
                        {honour.seasonLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {TYPE_LABELS[honour.type] ?? honour.type}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <DeleteButton
                        action={deleteHonour}
                        id={honour.id}
                        confirmLabel={`Supprimer ce titre de ${honour.year} ?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Ajouter un titre
      </h3>
      <AdminForm
        action={saveHonour}
        cancelHref="/admin"
        submitLabel="Ajouter le titre"
        fields={fields}
      />
    </section>
  );
}
