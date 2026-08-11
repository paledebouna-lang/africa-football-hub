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
        <h2 className="font-semibold">Guide d&apos;utilisation de la plateforme</h2>
        <p className="mt-1 text-sm text-muted">
          Un rappel de chaque écran, classé par thème. Déplie une section pour la
          consulter.
        </p>

        <div className="mt-4 divide-y divide-border">
          <GuideSection title="Compétitions et clubs">
            <p>
              Les 9 championnats, 45 clubs et toutes les compétitions organisées par
              la CAF (CAN, CHAN, coupes continentales, WAFCON, catégories jeunes...)
              sont déjà enregistrés.
            </p>
            <p>
              Pour engager un club ou une sélection dans une compétition avec une
              poule (« Groupe A », « Groupe B »...), ouvre la compétition depuis{" "}
              <strong>Compétitions</strong>, puis <strong>Clubs</strong> ou{" "}
              <strong>Sélections</strong> selon le type — la poule se saisit à côté
              de chaque engagement.
            </p>
          </GuideSection>

          <GuideSection title="Joueurs">
            <p>
              Ajoute un joueur depuis <strong>Joueurs</strong>. Le poste principal et
              les postes secondaires choisis s&apos;affichent automatiquement sur le
              terrain de sa fiche (étoile verte / étoiles orange).
            </p>
            <p>
              La valeur marchande se calcule automatiquement, sauf si tu en saisis
              une toi-même (elle prime alors définitivement). Pour un joueur de moins
              de 20 ans, le calcul part du barème officiel des coûts de formation
              FIFA/CAF, selon la <strong>catégorie FIFA</strong> renseignée sur la
              fiche de son club (Catégorie II = 30 000 $, III = 10 000 $, IV = 2 000
              $). Pour 20 ans et plus, la valeur de départ suit le niveau du
              championnat du club.
            </p>
            <p>
              Un joueur qui évolue hors d&apos;Afrique (diaspora) peut quand même
              être sélectionné en équipe nationale : crée simplement son vrai club
              (même étranger) avec une compétition et un coefficient de niveau
              adaptés, pour que sa valorisation reste juste.
            </p>
          </GuideSection>

          <GuideSection title="Matchs et statistiques">
            <p>
              Enregistre un match depuis la fiche du club (onglet{" "}
              <strong>Matchs</strong>), puis remplis la feuille de match : les
              statistiques et la valeur des joueurs se mettent à jour
              automatiquement. Pour une sélection nationale, c&apos;est depuis la
              fiche du pays, bouton <strong>Matchs de la sélection</strong>.
            </p>
            <p>
              Les classements, le calendrier et le bloc « Matchs du jour » de
              l&apos;accueil se recalculent seuls à partir de ces feuilles de match.
            </p>
          </GuideSection>

          <GuideSection title="Sélections nationales">
            <p>
              Les 54 pays membres de la CAF sont déjà enregistrés. Pour composer une
              sélection, ouvre la fiche du pays depuis <strong>Sélections</strong> :
              le bloc « Sélections nationales » propose tous les joueurs
              enregistrés, quel que soit leur club.
            </p>
          </GuideSection>

          <GuideSection title="Palmarès et trophées">
            <p>
              Les palmarès se saisissent directement depuis la fiche concernée :
              celle d&apos;un club, d&apos;un joueur, d&apos;un entraîneur, ou
              d&apos;un pays. Ils apparaissent en résumé dans l&apos;en-tête de la
              fiche, et en détail plus bas sur la page.
            </p>
          </GuideSection>

          <GuideSection title="Comptes clubs et agences">
            <p>
              Les demandes d&apos;inscription (club, centre de formation, agence)
              apparaissent dans <strong>Comptes</strong>, à valider ou refuser
              manuellement — rien n&apos;est publié avant ta validation. Un email
              part automatiquement vers toi à l&apos;arrivée d&apos;une demande, et
              vers le demandeur dès que tu l&apos;acceptes ou la refuses.
            </p>
          </GuideSection>

          <GuideSection title="Images et connexion">
            <p>
              Les images (logos, photos, écussons) s&apos;envoient directement
              depuis ton téléphone ou ton ordinateur — pas besoin de lien externe.
            </p>
            <p>
              La connexion administrateur se fait depuis le même écran que les
              comptes clubs/agences (<strong>Mon compte</strong> sur le site), via un
              lien discret pour basculer vers le mot de passe administrateur.
            </p>
          </GuideSection>
        </div>
      </section>
    </AdminShell>
  );
}

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group py-3 first:pt-0 last:pb-0">
      <summary className="cursor-pointer list-none font-medium marker:content-none">
        <span className="inline-flex items-center gap-2">
          <span className="text-muted transition-transform group-open:rotate-90">
            ▶
          </span>
          {title}
        </span>
      </summary>
      <div className="mt-2 space-y-2 ps-6 text-sm text-muted">{children}</div>
    </details>
  );
}
