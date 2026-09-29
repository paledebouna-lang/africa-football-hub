import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { apiFootballConfigured } from "@/lib/api-football";
import type { SyncReport } from "@/lib/api-football-sync";
import { AdminShell } from "@/components/admin-shell";
import { syncFootballNow } from "../actions";

// "Synchroniser maintenant" runs the whole sweep inside this page's action.
export const maxDuration = 300;

const inSeason = { entries: { some: { season: { isCurrent: true } } } };

export default async function AdminSyncPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const [linked, engaged, clubsLinked, squadsDone, players, lastSync] = await Promise.all([
    prisma.competition.findMany({
      where: { apiFootballLeagueId: { not: null } },
      include: { country: true },
      orderBy: [{ tier: "asc" }, { nameFr: "asc" }],
    }),
    prisma.club.count({ where: inSeason }),
    prisma.club.count({ where: { ...inSeason, apiFootballTeamId: { not: null } } }),
    prisma.club.count({ where: { ...inSeason, squadSyncedAt: { not: null } } }),
    prisma.player.count({ where: { apiFootballPlayerId: { not: null } } }),
    prisma.apiFootballSync.findUnique({ where: { id: "main" } }),
  ]);
  const report = lastSync?.report as Partial<SyncReport> | undefined;
  const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const configured = apiFootballConfigured();
  const squads = report?.squads ?? [];
  const playersAdded = squads.reduce((sum, squad) => sum + squad.created, 0);

  return (
    <AdminShell
      title="Synchronisation"
      action={
        configured && (
          <form action={syncFootballNow}>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
            >
              Synchroniser maintenant
            </button>
          </form>
        )
      }
    >
      <p className="mb-4 text-sm text-muted">
        Deux fois par jour, la synchronisation relie les championnats et les clubs à
        API-Football, puis met à jour le calendrier, les résultats (et donc les
        classements) et les effectifs. Elle avance pays par pays, en commençant par
        ceux qui comptent le plus de clubs, et s&apos;arrête quand le quota de requêtes
        du jour est atteint : la passe suivante reprend là où elle s&apos;est arrêtée.
        Un club déjà présent sur le site est reconnu par son nom ; pour un club non
        reconnu, renseigne son ID API-Football sur sa fiche.
      </p>

      {!configured && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-6 text-sm">
          <p className="font-medium">Clé API-Football manquante.</p>
          <p className="mt-2 text-muted">
            Crée un compte sur api-football.com, puis ajoute la variable
            d&apos;environnement <code>API_FOOTBALL_KEY</code> dans Vercel et redéploie.
          </p>
        </div>
      )}

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Championnats liés", value: linked.length },
          { label: "Clubs reconnus", value: `${clubsLinked} / ${engaged}` },
          { label: "Effectifs importés", value: `${squadsDone} / ${engaged}` },
          { label: "Joueurs importés", value: players },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </section>

      {report && lastSync && (
        <section className="mb-6 rounded-lg border border-border bg-surface p-6 text-sm">
          <h2 className="mb-1 font-semibold">
            Dernière synchronisation — {dateFormat.format(lastSync.ranAt)}
          </h2>
          <p className="mb-4 text-muted">
            {report.stopped === "quota"
              ? "Arrêtée : quota de requêtes du jour atteint, la suite à la prochaine passe."
              : report.stopped === "time"
                ? "Arrêtée : durée maximale atteinte, la suite à la prochaine passe."
                : "Terminée."}
            {typeof report.requestsRemaining === "number" &&
              ` Requêtes restantes aujourd'hui : ${report.requestsRemaining}.`}
            {` ${squads.length} effectif(s) importé(s), ${playersAdded} joueur(s) ajouté(s).`}
          </p>

          {report.countries && report.countries.length > 0 && (
            <>
              <h3 className="mb-2 font-medium">Pays traités</h3>
              <ul className="mb-4 space-y-2">
                {report.countries.map((country) => (
                  <li key={country.country}>
                    <span className="font-medium">{country.country}</span>
                    {country.error && <span className="text-red-600"> — {country.error}</span>}
                    {country.leaguesLinked && (
                      <span className="text-muted"> — championnats : {country.leaguesLinked.join(" · ")}</span>
                    )}
                    {country.clubsLinked !== undefined && (
                      <span className="text-muted"> — {country.clubsLinked} club(s) reconnu(s)</span>
                    )}
                    {country.clubsUnmatched && (
                      <p className="text-red-600">Non reconnus : {country.clubsUnmatched.join(", ")}</p>
                    )}
                    {country.leaguesAvailable && (
                      <p className="text-muted">
                        Championnats API-Football du pays : {country.leaguesAvailable.join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {report.leagues && report.leagues.length > 0 && (
            <>
              <h3 className="mb-2 font-medium">Calendriers et résultats</h3>
              <ul className="mb-4 space-y-2">
                {report.leagues.map((league, index) => (
                  <li key={index}>
                    <span className="font-medium">{league.competition}</span>{" "}
                    <span className="text-muted">
                      {league.status === "ok"
                        ? `— ${league.played} matchs joués, ${league.created} créés, ${league.updated} mis à jour`
                        : `— ${league.status === "error" ? "erreur : " : ""}${league.message}`}
                    </span>
                    {league.clubsCreated && (
                      <p className="text-muted">Clubs créés : {league.clubsCreated.join(", ")}</p>
                    )}
                    {league.unmatchedTeams && (
                      <p className="text-red-600">
                        Équipes non reconnues (leurs matchs sont ignorés) :{" "}
                        {league.unmatchedTeams.map((team) => `${team.name} (id ${team.id})`).join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {squads.length > 0 && (
            <>
              <h3 className="mb-2 font-medium">Effectifs</h3>
              <ul className="grid gap-1 sm:grid-cols-2">
                {squads.map((squad, index) => (
                  <li key={index} className={squad.error ? "text-red-600" : undefined}>
                    {squad.club} —{" "}
                    {squad.error ?? `${squad.created} joueurs ajoutés, ${squad.updated} mis à jour`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 font-semibold">Championnats liés ({linked.length})</h2>
        {linked.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun championnat lié pour l&apos;instant : la synchronisation les détecte
            pays par pays. Tu peux aussi saisir l&apos;ID API-Football sur la fiche
            d&apos;une compétition.
          </p>
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {linked.map((competition) => (
              <li key={competition.id}>
                <Link href={`/admin/competitions/${competition.id}`} className="hover:underline">
                  {competition.nameFr}
                  {competition.country && ` (${competition.country.nameFr})`}
                </Link>{" "}
                <span className="text-muted">— id {competition.apiFootballLeagueId}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
