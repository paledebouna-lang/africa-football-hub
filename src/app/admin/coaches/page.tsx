import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { DeleteButton } from "@/components/delete-button";
import { deleteCoach } from "../actions";
import { COACH_ROLES } from "./coach-fields";

const ROLE_LABELS = Object.fromEntries(
  COACH_ROLES.map((role) => [role.value, role.label]),
);

export default async function AdminCoachesPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const coaches = await prisma.coach.findMany({
    orderBy: { name: "asc" },
    include: {
      nationality: true,
      spells: {
        where: { endDate: null },
        include: { club: true },
        take: 1,
      },
    },
  });

  return (
    <AdminShell
      title="Entraîneurs"
      action={
        <Link
          href="/admin/coaches/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
        >
          Ajouter un entraîneur
        </Link>
      }
    >
      {coaches.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">Aucun entraîneur enregistré.</p>
          <p className="mt-1 text-sm text-muted">
            Ajoute un entraîneur, puis renseigne ses passages en club.
          </p>
          <Link
            href="/admin/coaches/new"
            className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            Ajouter un entraîneur
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Entraîneur</th>
                <th className="px-4 py-3 text-left font-medium">Nationalité</th>
                <th className="px-4 py-3 text-left font-medium">Club actuel</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coaches.map((coach) => (
                <tr key={coach.id}>
                  <td className="px-4 py-3 font-medium">{coach.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {coach.nationality?.nameFr ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {coach.spells[0] ? (
                      <>
                        {coach.spells[0].club.nameFr}
                        <span className="block text-xs">
                          {ROLE_LABELS[coach.spells[0].role] ?? coach.spells[0].role}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/coaches/${coach.id}`}
                        className="text-brand hover:underline"
                      >
                        Modifier
                      </Link>
                      <DeleteButton
                        action={deleteCoach}
                        id={coach.id}
                        confirmLabel={`Supprimer « ${coach.name} » ? Son parcours sera également supprimé.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
