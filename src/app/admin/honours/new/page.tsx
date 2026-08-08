import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { saveHonour } from "../../actions";
import { honourFields } from "../honour-fields";

export default async function NewHonourPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const [clubs, players, coaches, countries, competitions] = await Promise.all([
    prisma.club.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.player.findMany({ orderBy: { name: "asc" } }),
    prisma.coach.findMany({ orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.competition.findMany({
      orderBy: { nameFr: "asc" },
      include: { country: true },
    }),
  ]);

  return (
    <AdminShell title="Ajouter un titre">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={saveHonour}
          cancelHref="/admin/honours"
          submitLabel="Enregistrer le titre"
          fields={honourFields(
            clubs.map((club) => ({ value: club.id, label: club.nameFr })),
            players.map((player) => ({ value: player.id, label: player.name })),
            coaches.map((coach) => ({ value: coach.id, label: coach.name })),
            countries.map((country) => ({
              value: country.id,
              label: country.nameFr,
            })),
            competitions.map((competition) => ({
              value: competition.id,
              label: competition.country
                ? `${competition.nameFr} (${competition.country.nameFr})`
                : competition.nameFr,
            })),
          )}
        />
      </div>
    </AdminShell>
  );
}
