import { prisma } from "@/lib/prisma";
import { AGE_CATEGORIES } from "@/lib/categories";
import { AdminForm, type Field } from "@/components/admin-form";
import { DeleteButton } from "@/components/delete-button";
import { saveSelection, deleteSelection } from "@/app/admin/actions";

const LEVEL_LABELS: Record<string, string> = {
  SENIOR: "Équipe A",
  U23: "Moins de 23 ans",
  U21: "Moins de 21 ans",
  U20: "Moins de 20 ans",
  U19: "Moins de 19 ans",
  U18: "Moins de 18 ans",
  U17: "Moins de 17 ans",
  U15: "Moins de 15 ans",
};

/**
 * The national teams of one country, one block per age group.
 *
 * A player belongs to a level rather than to a separate "team" record: a country
 * always has the same ladder of age groups, so modelling each as a row would add
 * bookkeeping without adding meaning.
 */
export async function NationalSquadsManager({
  countryId,
  countryName,
}: {
  countryId: string;
  countryName: string;
}) {
  const [selections, players] = await Promise.all([
    prisma.nationalTeamSelection.findMany({
      where: { countryId },
      orderBy: [{ level: "asc" }, { caps: "desc" }],
      include: { player: { include: { club: true } } },
    }),
    prisma.player.findMany({
      orderBy: { name: "asc" },
      include: { club: true },
    }),
  ]);

  const byLevel = new Map<string, typeof selections>();
  for (const selection of selections) {
    byLevel.set(selection.level, [
      ...(byLevel.get(selection.level) ?? []),
      selection,
    ]);
  }

  const fields: Field[] = [
    {
      kind: "select",
      name: "playerId",
      label: "Joueur",
      required: true,
      placeholder: "Choisir un joueur",
      options: players.map((player) => ({
        value: player.id,
        label: player.club ? `${player.name} (${player.club.nameFr})` : player.name,
      })),
    },
    {
      kind: "select",
      name: "level",
      label: "Sélection",
      required: true,
      placeholder: "Équipe A",
      options: AGE_CATEGORIES.map((level) => ({
        value: level,
        label: LEVEL_LABELS[level] ?? level,
      })),
      defaultValue: "SENIOR",
    },
    { kind: "number", name: "caps", label: "Sélections", defaultValue: "0" },
    { kind: "number", name: "goals", label: "Buts", defaultValue: "0" },
    { kind: "date", name: "firstCallUp", label: "Première convocation" },
    {
      kind: "checkbox",
      name: "isCurrent",
      label: "Actuellement sélectionné",
      defaultChecked: true,
    },
    { kind: "hidden", name: "countryId", label: "", defaultValue: countryId },
  ];

  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-1 font-semibold">Sélections nationales</h2>
      <p className="mb-4 text-sm text-muted">
        Compose chaque catégorie du {countryName}. Un même joueur peut figurer dans
        plusieurs catégories au fil de son parcours.
      </p>

      {selections.length === 0 ? (
        <p className="mb-6 text-sm text-muted">
          Aucun joueur sélectionné pour le moment.
        </p>
      ) : (
        <div className="mb-6 space-y-5">
          {AGE_CATEGORIES.filter((level) => byLevel.has(level)).map((level) => (
            <div key={level}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                {LEVEL_LABELS[level] ?? level}
                <span className="ms-2 font-normal normal-case">
                  ({byLevel.get(level)!.length})
                </span>
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-muted">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Joueur</th>
                      <th className="px-4 py-2.5 text-left font-medium">Club</th>
                      <th className="px-4 py-2.5 text-right font-medium">Sél.</th>
                      <th className="px-4 py-2.5 text-right font-medium">Buts</th>
                      <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                      <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {byLevel.get(level)!.map((selection) => (
                      <tr key={selection.id}>
                        <td className="px-4 py-2.5 font-medium">
                          {selection.player.name}
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {selection.player.club?.nameFr ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {selection.caps}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {selection.goals}
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          {selection.isCurrent ? "Sélectionné" : "Ancien"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end">
                            <DeleteButton
                              action={deleteSelection}
                              id={selection.id}
                              confirmLabel={`Retirer ${selection.player.name} de cette sélection ?`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Ajouter un joueur à une sélection
      </h3>

      {players.length === 0 ? (
        <p className="text-sm text-muted">
          Enregistre d&apos;abord des joueurs pour pouvoir composer les sélections.
        </p>
      ) : (
        <AdminForm
          action={saveSelection}
          cancelHref="/admin/countries"
          submitLabel="Ajouter à la sélection"
          fields={fields}
        />
      )}
    </section>
  );
}
