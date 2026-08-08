import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminDashboard() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const [countries, competitions, clubs, academies, players, coaches, transfers] =
    await Promise.all([
      prisma.country.count(),
      prisma.competition.count(),
      prisma.club.count({ where: { type: "CLUB" } }),
      prisma.club.count({ where: { type: "ACADEMY" } }),
      prisma.player.count(),
      prisma.coach.count(),
      prisma.transfer.count(),
    ]);

  const stats = [
    { label: "Pays", value: countries, href: null },
    { label: "Compétitions", value: competitions, href: "/admin/competitions" },
    { label: "Clubs", value: clubs, href: "/admin/clubs" },
    { label: "Centres de formation", value: academies, href: "/admin/clubs" },
    { label: "Joueurs", value: players, href: "/admin/players" },
    { label: "Entraîneurs", value: coaches, href: "/admin/coaches" },
    { label: "Transferts", value: transfers, href: "/admin/transfers" },
  ];

  return (
    <AdminShell title="Tableau de bord">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const card = (
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{stat.value}</p>
            </div>
          );

          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="block hover:opacity-80 transition-opacity"
            >
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      <section className="mt-8 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-semibold">Par où commencer</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted list-decimal list-inside">
          <li>
            Les 9 championnats et 45 clubs sont déjà enregistrés. Complète-les si
            besoin dans <strong>Clubs</strong>.
          </li>
          <li>
            Ajoute des joueurs dans <strong>Joueurs</strong> : c&apos;est là que tu
            saisis aussi leur valeur marchande.
          </li>
          <li>
            Enregistre les mouvements dans <strong>Transferts</strong> : le club du
            joueur est mis à jour automatiquement.
          </li>
          <li>
            Les <strong>palmarès</strong> se saisissent directement depuis la fiche
            concernée : celle d&apos;un club, d&apos;un joueur, d&apos;un entraîneur,
            ou d&apos;un pays pour une sélection nationale.
          </li>
        </ol>
      </section>
    </AdminShell>
  );
}
