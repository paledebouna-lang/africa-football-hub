import { prisma } from "@/lib/prisma";
import {
  OutOfTimeError,
  QuotaExhaustedError,
  Run,
  loadProgress,
  requestsRemainingToday,
  runApiFootballSteps,
  saveProgress,
  type SyncReport,
} from "@/lib/api-football-sync";
import { runTheSportsDbSteps } from "@/lib/thesportsdb-sync";

export type { SyncReport, LeagueReport, CountryReport } from "@/lib/api-football-sync";

/**
 * One pass of the football sync, run twice a day from /api/cron/sync-football
 * and on demand from /admin/sync. Fixtures and results come from TheSportsDB
 * first (it publishes the season in progress), squads from API-Football next;
 * each source resumes where its previous pass stopped, and the pass ends when
 * its time budget or a quota is spent. The report is stored for /admin/sync.
 */
export async function runFootballSync(): Promise<SyncReport> {
  const run = new Run();
  const progress = await loadProgress();

  try {
    await runTheSportsDbSteps(run, progress);
    await runApiFootballSteps(run, progress);
  } catch (error) {
    if (error instanceof QuotaExhaustedError) run.report.stopped = "quota";
    else if (error instanceof OutOfTimeError) run.report.stopped = "time";
    else throw error;
  } finally {
    await saveProgress(progress);
  }

  run.report.requestsRemaining = requestsRemainingToday();
  run.report.squadsPending = await prisma.club.count({
    where: { squadSyncedAt: null, entries: { some: { season: { isCurrent: true } } } },
  });

  const report = run.report as object;
  await prisma.apiFootballSync.upsert({
    where: { id: "main" },
    update: { ranAt: new Date(), report },
    create: { id: "main", ranAt: new Date(), report },
  });
  return run.report;
}
