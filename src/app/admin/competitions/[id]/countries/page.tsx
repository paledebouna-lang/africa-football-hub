import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { toggleNationalTeamEntry, setNationalTeamEntryGroup } from "../../../actions";

export default async function CompetitionCountriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const [competition, season, countries] = await Promise.all([
    prisma.competition.findUnique({ where: { id } }),
    prisma.season.findFirst({ where: { isCurrent: true } }),
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  if (!competition) notFound();

  if (!season) {
    return (
      <AdminShell title={competition.nameFr}>
        <p className="text-sm text-muted">
          Aucune saison courante n&apos;est définie. Impossible d&apos;engager des
          sélections.
        </p>
      </AdminShell>
    );
  }

  const entries = await prisma.nationalTeamEntry.findMany({
    where: { competitionId: id, seasonId: season.id },
    select: { countryId: true, group: true },
  });
  const enteredMap = new Map(entries.map((entry) => [entry.countryId, entry.group]));
  const groupsInUse = [...new Set(entries.map((e) => e.group).filter(Boolean))].sort();

  return (
    <AdminShell
      title={`Sélections engagées — ${competition.nameFr}`}
      action={
        <Link
          href="/admin/competitions"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Retour
        </Link>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Saison <strong>{season.label}</strong> · {enteredMap.size} sélection
        {enteredMap.size > 1 ? "s" : ""} engagée{enteredMap.size > 1 ? "s" : ""}
        {groupsInUse.length > 0 && (
          <>
            {" "}
            · poules en cours d&apos;usage : {groupsInUse.join(", ")}
          </>
        )}
      </p>
      <p className="mb-4 text-xs text-muted">
        Ex. pour la CAN : Groupe A, Groupe B... Les matchs se saisissent ensuite
        depuis la fiche du pays.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Pays</th>
              <th className="px-4 py-3 text-left font-medium">Poule</th>
              <th className="px-4 py-3 text-right font-medium">Engagement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {countries.map((country) => {
              const isEntered = enteredMap.has(country.id);
              const group = enteredMap.get(country.id) ?? "";

              return (
                <tr key={country.id} className={isEntered ? "bg-brand/5" : undefined}>
                  <td className="px-4 py-3 font-medium">{country.nameFr}</td>
                  <td className="px-4 py-3">
                    {isEntered ? (
                      <form
                        action={setNationalTeamEntryGroup}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="competitionId" value={competition.id} />
                        <input type="hidden" name="countryId" value={country.id} />
                        <input type="hidden" name="seasonId" value={season.id} />
                        <input
                          name="group"
                          defaultValue={group}
                          placeholder="Aucune"
                          className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm"
                        />
                        <button
                          type="submit"
                          className="text-sm text-brand hover:underline"
                        >
                          Enregistrer
                        </button>
                      </form>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleNationalTeamEntry} className="flex justify-end">
                      <input type="hidden" name="competitionId" value={competition.id} />
                      <input type="hidden" name="countryId" value={country.id} />
                      <input type="hidden" name="seasonId" value={season.id} />
                      <input type="hidden" name="enter" value={isEntered ? "0" : "1"} />
                      <button
                        type="submit"
                        className={
                          isEntered
                            ? "rounded-md border border-border px-3 py-1 text-sm text-muted hover:text-foreground transition-colors"
                            : "rounded-md bg-brand px-3 py-1 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
                        }
                      >
                        {isEntered ? "Retirer" : "Engager"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
