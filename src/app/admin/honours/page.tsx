import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { DeleteButton } from "@/components/delete-button";
import { deleteHonour } from "../actions";
import { HONOUR_TYPES } from "./honour-fields";

const TYPE_LABELS = Object.fromEntries(
  HONOUR_TYPES.map((type) => [type.value, type.label]),
);

export default async function AdminHonoursPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const honours = await prisma.honour.findMany({
    orderBy: [{ year: "desc" }],
    include: {
      competition: true,
      club: true,
      player: true,
      coach: true,
      country: true,
    },
  });

  return (
    <AdminShell
      title="Palmarès"
      action={
        <Link
          href="/admin/honours/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
        >
          Ajouter un titre
        </Link>
      }
    >
      {honours.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">Aucun titre enregistré.</p>
          <p className="mt-1 text-sm text-muted">
            Les titres apparaissent sur la fiche de leur bénéficiaire : club,
            joueur, entraîneur ou sélection nationale.
          </p>
          <Link
            href="/admin/honours/new"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Ajouter un titre
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Année</th>
                <th className="px-4 py-3 text-left font-medium">Titre</th>
                <th className="px-4 py-3 text-left font-medium">Nature</th>
                <th className="px-4 py-3 text-left font-medium">Bénéficiaire</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {honours.map((honour) => {
                const holder =
                  honour.club?.nameFr ??
                  honour.player?.name ??
                  honour.coach?.name ??
                  honour.country?.nameFr ??
                  "—";

                return (
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
                      {holder}
                      {honour.country && !honour.club && (
                        <span className="block text-xs text-muted">
                          Sélection nationale
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DeleteButton
                          action={deleteHonour}
                          id={honour.id}
                          confirmLabel={`Supprimer ce titre de ${holder} ?`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
