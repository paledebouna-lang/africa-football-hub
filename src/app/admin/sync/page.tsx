import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { apiFootballConfigured } from "@/lib/api-football";
import type { DiscoveryResult, SyncReport } from "@/lib/api-football-sync";
import { AdminShell } from "@/components/admin-shell";
import { discoverLeaguesNow, syncFootballNow } from "../actions";

// "Synchroniser maintenant" runs the whole sweep inside this page's action.
export const maxDuration = 300;

const BUTTON =
  "rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-brand transition-colors";

export default async function AdminSyncPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const [linked, unlinked, runs] = await Promise.all([
    prisma.competition.findMany({
      where: { apiFootballLeagueId: { not: null } },
      include: { country: true },
      orderBy: [{ tier: "asc" }, { nameFr: "asc" }],
    }),
    prisma.competition.count({
      where: { apiFootballLeagueId: null, type: "LEAGUE", countryId: { not: null } },
    }),
    prisma.apiFootballSync.findMany(),
  ]);
  const lastSync = runs.find((run) => run.id === "main");
  const lastDiscovery = runs.find((run) => run.id === "discovery");
  const report = lastSync?.report as SyncReport | undefined;
  const discovery = lastDiscovery?.report as DiscoveryResult[] | undefined;
  const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  const configured = apiFootballConfigured();

  return (
    <AdminShell
      title="Synchronisation"
      action={
        configured && (
          <div className="flex items-center gap-3">
            <form action={discoverLeaguesNow}>
              <button type="submit" className={BUTTON}>
                Détecter les championnats
              </button>
            </form>
            <form action={syncFootballNow}>
              <button
                type="submit"
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
              >
                Synchroniser maintenant
              </button>
            </form>
          </div>
        )
      }
    >
      <p className="mb-4 text-sm text-muted">
        Le calendrier, les résultats (et donc les classements) et les effectifs des
        championnats liés à API-Football sont mis à jour automatiquement chaque soir.
        Un club déjà présent sur le site est reconnu par son nom ; une équipe qui
        n&apos;est pas reconnue est listée ci-dessous : renseigne son ID API-Football
        sur la fiche du club concerné. Les effectifs sont actualisés par lots, les
        plus anciens d&apos;abord.
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

      <section className="mb-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-3 font-semibold">
          Championnats liés ({linked.length}) — {unlinked} championnat(s) national(aux) non lié(s)
        </h2>
        {linked.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun championnat lié. Utilise « Détecter les championnats », ou saisis
            l&apos;ID API-Football sur la fiche d&apos;une compétition.
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

      {report && lastSync && (
        <section className="mb-6 rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-3 font-semibold">
            Dernière synchronisation — {dateFormat.format(lastSync.ranAt)}
          </h2>
          <ul className="space-y-3 text-sm">
            {report.leagues.map((league) => (
              <li key={league.competition}>
                <p className="font-medium">
                  {league.competition}{" "}
                  <span className="font-normal text-muted">
                    {league.status === "ok"
                      ? `— ${league.played} matchs joués, ${league.created} créés, ${league.updated} mis à jour`
                      : `— ${league.status === "error" ? "erreur : " : ""}${league.message}`}
                  </span>
                </p>
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
          {report.squads.length > 0 && (
            <>
              <h3 className="mt-5 mb-2 font-medium">Effectifs actualisés</h3>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {report.squads.map((squad) => (
                  <li key={squad.club} className={squad.error ? "text-red-600" : undefined}>
                    {squad.club} —{" "}
                    {squad.error ?? `${squad.created} joueurs ajoutés, ${squad.updated} mis à jour`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {discovery && lastDiscovery && (
        <section className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-3 font-semibold">
            Dernière détection — {dateFormat.format(lastDiscovery.ranAt)}
          </h2>
          <ul className="space-y-2 text-sm">
            {discovery.map((result) => (
              <li key={result.competition}>
                <span className="font-medium">{result.competition}</span>{" "}
                {result.linkedTo ? (
                  <span className="text-muted">→ lié à {result.linkedTo}</span>
                ) : (
                  <span className="text-muted">
                    → pas de correspondance évidente
                    {result.candidates && result.candidates.length > 0
                      ? ` ; championnats disponibles : ${result.candidates.join(" · ")}`
                      : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminShell>
  );
}
