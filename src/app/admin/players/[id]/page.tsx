import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AdminForm } from "@/components/admin-form";
import { savePlayer } from "../../actions";
import { playerFields } from "../player-fields";
import { HonoursManager } from "@/components/honours-manager";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const [player, clubs, countries] = await Promise.all([
    prisma.player.findUnique({
      where: { id },
      include: { marketValues: { orderBy: { effectiveAt: "desc" }, take: 1 } },
    }),
    prisma.club.findMany({
      orderBy: { nameFr: "asc" },
      include: { primaryCompetition: { include: { country: true } } },
    }),
    prisma.country.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  if (!player) notFound();

  return (
    <AdminShell title={`Modifier — ${player.name}`}>
      <div className="space-y-8">
      <div className="rounded-lg border border-border bg-surface p-6">
        <AdminForm
          action={savePlayer}
          id={player.id}
          cancelHref="/admin/players"
          submitLabel="Enregistrer"
          fields={playerFields(
            clubs.map((club) => ({
              value: club.id,
              label: club.primaryCompetition?.country
                ? `${club.nameFr} (${club.primaryCompetition.country.nameFr})`
                : club.nameFr,
            })),
            countries.map((country) => ({
              value: country.id,
              label: country.nameFr,
            })),
            player.marketValues[0]?.valueUsd ?? null,
            player,
          )}
        />
      </div>

        <HonoursManager holder={{ kind: "playerId", id: player.id }} />
      </div>
    </AdminShell>
  );
}
