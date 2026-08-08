import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveClub } from "../../actions";
import { clubFields } from "../club-fields";

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const [club, leagues] = await Promise.all([
    prisma.club.findUnique({ where: { id } }),
    prisma.league.findMany({
      orderBy: { nameFr: "asc" },
      include: { country: true },
    }),
  ]);

  if (!club) notFound();

  return (
    <AdminShell title={`Modifier — ${club.nameFr}`}>
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveClub}
          id={club.id}
          cancelHref="/admin/clubs"
          submitLabel="Enregistrer"
          fields={clubFields(
            leagues.map((league) => ({
              value: league.id,
              label: `${league.nameFr} (${league.country.nameFr})`,
            })),
            club,
          )}
        />
      </div>
    </AdminShell>
  );
}
