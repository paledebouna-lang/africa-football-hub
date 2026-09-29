import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { Position, MatchStatus } from "@/generated/prisma/client";
import {
  QuotaExhaustedError,
  fetchCountries,
  fetchCountryLeagues,
  fetchCountryTeams,
  fetchFixtures,
  fetchLeague,
  fetchSquad,
  requestsRemainingToday,
  type ApiCountry,
  type ApiFixture,
} from "@/lib/api-football";

/**
 * Keeps the site in step with API-Football: links each national championship
 * and each club to its API counterpart, then pulls fixtures, results (which
 * feed the standings) and squads. Runs twice a day from /api/cron/sync-football
 * and on demand from /admin/sync.
 *
 * The API quota is small (100 requests a day on the free plan), so a run works
 * until the quota or its time budget is spent and the next run picks up where
 * it stopped: already-linked leagues are refreshed first, then countries are
 * set up one at a time, those with the most clubs first, then the oldest
 * squads are refreshed.
 *
 * Nothing is ever deleted, and a club already on the site is never duplicated:
 * an API team is attached to an existing club when the names clearly match, a
 * club is only created for a league the admin has not set up yet, and every
 * team left unrecognised is listed in the report so it can be linked by hand.
 */

export type LeagueReport = {
  competition: string;
  status: "ok" | "skipped" | "error";
  message?: string;
  created?: number;
  updated?: number;
  played?: number;
  clubsCreated?: string[];
  unmatchedTeams?: { id: number; name: string }[];
};

export type CountryReport = {
  country: string;
  leaguesLinked?: string[];
  leaguesAvailable?: string[];
  clubsLinked?: number;
  clubsUnmatched?: string[];
  error?: string;
};

export type SyncReport = {
  leagues: LeagueReport[];
  countries: CountryReport[];
  squads: { club: string; created: number; updated: number; error?: string }[];
  /** Why the run ended before everything was up to date. */
  stopped?: "quota" | "time";
  requestsRemaining?: number | null;
  /** Clubs taking part this season whose squad has never been imported. */
  squadsPending?: number;
};

/** Where the setup of each country stands between runs. */
type Progress = {
  apiCountries?: ApiCountry[];
  /** countryId -> ISO date of the last league lookup / team lookup. */
  leaguesCheckedAt?: Record<string, string>;
  teamsCheckedAt?: Record<string, string>;
  /** Clubs whose squad was entered by hand before their first sync: the API only links their players. */
  handEnteredClubs?: string[];
  /** Linked leagues whose current season the API plan cannot read, until the date. */
  blockedUntil?: Record<number, string>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LEAGUE_RECHECK_MS = 30 * DAY_MS;
const TEAM_RECHECK_MS = 7 * DAY_MS;
const SQUAD_REFRESH_MS = 30 * DAY_MS;
/** Players entered by hand from which a club's squad counts as the official list. */
const HAND_ENTERED_SQUAD = 11;
/** Stay clear of the 300 s function limit, database writes included. */
const RUN_BUDGET_MS = 250_000;

const STOPWORDS = new Set(["fc", "sc", "afc", "club", "football", "de", "d", "du", "des", "la", "le", "les", "l", "the"]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((token) => token && !STOPWORDS.has(token)));
}

/**
 * 1 for the same name, 0 for nothing in common. Averages how much of the
 * shorter name is found in the longer one ("Adiake" in "Olympique Football
 * Club d'Adiaké") with how alike both are overall, so the closest of two
 * containing names wins. A lone initial matches a word starting with it
 * ("M. Doumbia" and "Mory Doumbia").
 */
function similarity(a: string, b: string): number {
  const [shorter, longer] = [tokens(a), tokens(b)].sort((x, y) => x.size - y.size);
  if (shorter.size === 0) return 0;
  let shared = 0;
  for (const token of shorter) {
    const found =
      longer.has(token) || (token.length === 1 && [...longer].some((other) => other.startsWith(token)));
    if (found) shared += 1;
  }
  const containment = shared / shorter.size;
  const dice = (2 * shared) / (shorter.size + longer.size);
  return (containment + dice) / 2;
}

/** The single candidate that clearly matches `name`, or null when none or several do. */
function bestMatch<T>(name: string, candidates: T[], namesOf: (candidate: T) => (string | null)[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  let tied = false;
  for (const candidate of candidates) {
    const score = Math.max(...namesOf(candidate).map((other) => (other ? similarity(name, other) : 0)));
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
      tied = false;
    } else if (score === bestScore) {
      tied = true;
    }
  }
  return bestScore >= 0.6 && !tied ? best : null;
}

function statusOf(short: string): MatchStatus {
  if (["FT", "AET", "PEN", "AWD", "WO"].includes(short)) return "PLAYED";
  if (short === "PST") return "POSTPONED";
  if (["CANC", "ABD"].includes(short)) return "CANCELLED";
  return "SCHEDULED";
}

/** "Regular Season - 7" -> 7. */
function matchdayOf(round: string | null): number | null {
  const found = round?.match(/(\d+)\s*$/);
  return found ? Number(found[1]) : null;
}

function positionOf(position: string | null): Position | null {
  switch (position) {
    case "Goalkeeper":
      return "GK";
    case "Defender":
      return "CB";
    case "Midfielder":
      return "CM";
    case "Attacker":
      return "ST";
    default:
      return null;
  }
}


/** Teams API-Football lists that are not a senior men's first team. */
const NOT_FIRST_TEAM = /\b(w|u\d{2}|ii|b|reserves?|women|ladies|fem|feminin[ae]?|dames|youth|juniors?)\b/i;

class OutOfTimeError extends Error {}

class Run {
  private readonly deadline = Date.now() + RUN_BUDGET_MS;
  readonly report: SyncReport = { leagues: [], countries: [], squads: [] };
  /** Competitions already synced during this run. */
  readonly leaguesDone = new Set<string>();

  /** Throws once the time budget is spent, so no API request is started too late. */
  check() {
    if (Date.now() > this.deadline) throw new OutOfTimeError();
  }
}

type CompetitionToSync = {
  id: string;
  nameFr: string;
  countryId: string | null;
  apiFootballLeagueId: number;
};

async function loadProgress(): Promise<Progress> {
  const row = await prisma.apiFootballSync.findUnique({ where: { id: "progress" } });
  return (row?.report as Progress | undefined) ?? {};
}

async function saveProgress(progress: Progress) {
  const report = progress as object;
  await prisma.apiFootballSync.upsert({
    where: { id: "progress" },
    update: { ranAt: new Date(), report },
    create: { id: "progress", ranAt: new Date(), report },
  });
}

const olderThan = (iso: string | undefined, ms: number) => !iso || Date.now() - new Date(iso).getTime() > ms;

/** Clubs of a country — through their main league or any entry — not yet tied to an API team. */
function unlinkedClubsOf(countryId: string) {
  return prisma.club.findMany({
    where: {
      apiFootballTeamId: null,
      type: "CLUB",
      OR: [
        { primaryCompetition: { countryId } },
        { entries: { some: { competition: { countryId } } } },
      ],
    },
    select: {
      id: true,
      nameFr: true,
      nameEn: true,
      shortName: true,
      _count: { select: { entries: { where: { season: { isCurrent: true } } } } },
    },
  });
}

function bestForClub<T>(club: { nameFr: string; nameEn: string; shortName: string | null }, pool: T[], nameOf: (item: T) => string) {
  for (const name of [club.nameFr, club.nameEn, club.shortName]) {
    if (!name) continue;
    const match = bestMatch(name, pool, (item) => [nameOf(item)]);
    if (match) return match;
  }
  return null;
}

/** Ties the country's championships to API-Football leagues by name (one request). */
async function discoverCountryLeagues(run: Run, countryId: string, apiName: string, report: CountryReport) {
  const competitions = await prisma.competition.findMany({
    where: { countryId, apiFootballLeagueId: null, type: "LEAGUE", gender: "MALE", ageCategory: "SENIOR" },
    orderBy: { tier: "asc" },
  });
  if (competitions.length === 0) return;

  run.check();
  const leagues = await fetchCountryLeagues(apiName);
  const taken = new Set(
    (await prisma.competition.findMany({
      where: { apiFootballLeagueId: { in: leagues.map((l) => l.league.id) } },
      select: { apiFootballLeagueId: true },
    })).map((c) => c.apiFootballLeagueId),
  );
  const available = leagues.filter((league) => !taken.has(league.league.id));

  for (const competition of competitions) {
    const match =
      bestMatch(competition.nameEn, available, (league) => [league.league.name]) ??
      bestMatch(competition.nameFr, available, (league) => [league.league.name]);
    if (!match) continue;
    await prisma.competition.update({
      where: { id: competition.id },
      data: { apiFootballLeagueId: match.league.id },
    });
    available.splice(available.indexOf(match), 1);
    (report.leaguesLinked ??= []).push(`${competition.nameFr} → ${match.league.name} (id ${match.league.id})`);
  }
  if (available.length > 0 && competitions.length > (report.leaguesLinked?.length ?? 0)) {
    report.leaguesAvailable = available.map((league) => `${league.league.name} (id ${league.league.id})`);
  }
}

/** Ties the country's clubs to API-Football teams by name (one request, whatever the plan). */
async function linkCountryTeams(run: Run, countryId: string, apiName: string, report: CountryReport) {
  const clubs = await unlinkedClubsOf(countryId);
  if (clubs.length === 0) return;

  run.check();
  const teams = (await fetchCountryTeams(apiName))
    .map((row) => row.team)
    .filter((team) => !team.national && !NOT_FIRST_TEAM.test(team.name));
  const used = new Set(
    (await prisma.club.findMany({
      where: { apiFootballTeamId: { in: teams.map((team) => team.id) } },
      select: { apiFootballTeamId: true },
    })).map((club) => club.apiFootballTeamId),
  );
  const pool = teams.filter((team) => !used.has(team.id));

  // Clubs playing this season pick first.
  clubs.sort((a, b) => b._count.entries - a._count.entries);
  report.clubsLinked = 0;
  for (const club of clubs) {
    const team = bestForClub(club, pool, (item) => item.name);
    if (!team) {
      if (club._count.entries > 0) (report.clubsUnmatched ??= []).push(club.nameFr);
      continue;
    }
    await prisma.club.update({ where: { id: club.id }, data: { apiFootballTeamId: team.id } });
    pool.splice(pool.indexOf(team), 1);
    report.clubsLinked += 1;
  }
}

/** Site club for every API team of the league, attaching or creating clubs as needed. */
async function resolveClubs(
  competition: CompetitionToSync,
  fixtures: ApiFixture[],
  seasonIds: string[],
  report: LeagueReport,
) {
  const teams = new Map<number, { id: number; name: string; logo: string | null }>();
  for (const fixture of fixtures) {
    teams.set(fixture.teams.home.id, fixture.teams.home);
    teams.set(fixture.teams.away.id, fixture.teams.away);
  }

  const clubByTeam = new Map<number, string>();
  const linked = await prisma.club.findMany({
    where: { apiFootballTeamId: { in: [...teams.keys()] } },
    select: { id: true, apiFootballTeamId: true },
  });
  for (const club of linked) clubByTeam.set(club.apiFootballTeamId!, club.id);

  const pending = [...teams.values()].filter((team) => !clubByTeam.has(team.id));
  if (pending.length === 0) return clubByTeam;

  const candidates = competition.countryId ? await unlinkedClubsOf(competition.countryId) : [];

  // Once the admin has registered this season's clubs, a team the sync does
  // not recognise is more likely a spelling difference than a new club.
  const alreadySetUp =
    (await prisma.clubCompetition.count({
      where: { competitionId: competition.id, seasonId: { in: seasonIds } },
    })) > 0;

  for (const team of pending) {
    const match = bestMatch(team.name, candidates, (club) => [club.nameFr, club.nameEn, club.shortName]);
    if (match) {
      await prisma.club.update({ where: { id: match.id }, data: { apiFootballTeamId: team.id } });
      candidates.splice(candidates.indexOf(match), 1);
      clubByTeam.set(team.id, match.id);
      continue;
    }

    if (alreadySetUp) {
      (report.unmatchedTeams ??= []).push({ id: team.id, name: team.name });
      continue;
    }

    const base = slugify(team.name) || "club";
    let slug = base;
    for (let n = 2; await prisma.club.findUnique({ where: { slug }, select: { id: true } }); n += 1) {
      slug = `${base}-${n}`;
    }
    const club = await prisma.club.create({
      data: {
        slug,
        nameFr: team.name,
        nameEn: team.name,
        nameAr: team.name,
        logoUrl: team.logo,
        primaryCompetitionId: competition.id,
        apiFootballTeamId: team.id,
      },
    });
    (report.clubsCreated ??= []).push(team.name);
    clubByTeam.set(team.id, club.id);
  }

  return clubByTeam;
}

async function syncLeague(run: Run, competition: CompetitionToSync, progress: Progress): Promise<LeagueReport> {
  const report: LeagueReport = { competition: competition.nameFr, status: "ok" };
  const blocked = progress.blockedUntil?.[competition.apiFootballLeagueId];
  if (blocked && new Date(blocked) > new Date()) {
    return { ...report, status: "skipped", message: "Saison en cours non incluse dans l'abonnement API-Football." };
  }

  run.check();
  const [league] = await fetchLeague(competition.apiFootballLeagueId);
  const current = league?.seasons.find((season) => season.current);
  if (!current) return { ...report, status: "skipped", message: "Aucune saison en cours sur API-Football." };
  if (new Date(current.start) > new Date()) {
    return { ...report, status: "skipped", message: `Saison ${current.year} pas encore commencée.` };
  }

  run.check();
  let fixtures: ApiFixture[];
  try {
    fixtures = await fetchFixtures(competition.apiFootballLeagueId, current.year);
  } catch (error) {
    // Free plans only read past seasons: stop asking for a week.
    if (/plan/i.test(String(error))) {
      (progress.blockedUntil ??= {})[competition.apiFootballLeagueId] = new Date(Date.now() + 7 * DAY_MS).toISOString();
      return { ...report, status: "skipped", message: "Saison en cours non incluse dans l'abonnement API-Football." };
    }
    throw error;
  }
  if (fixtures.length === 0) return { ...report, status: "skipped", message: "Aucun match publié." };

  // A fixture belongs to the site season whose dates contain its kick-off.
  const seasons = await prisma.season.findMany({ select: { id: true, startDate: true, endDate: true } });
  const seasonOf = (date: Date) => seasons.find((season) => season.startDate <= date && date <= season.endDate);
  const seasonIds = [...new Set(fixtures.map((f) => seasonOf(new Date(f.fixture.date))?.id).filter(Boolean))] as string[];

  const clubByTeam = await resolveClubs(competition, fixtures, seasonIds, report);

  const existing = await prisma.match.findMany({ where: { competitionId: competition.id } });
  const byFixture = new Map(existing.filter((m) => m.apiFootballFixtureId).map((m) => [m.apiFootballFixtureId!, m]));
  // Matches entered by hand or by an import script, not yet tied to a fixture.
  const unlinked = existing.filter((m) => !m.apiFootballFixtureId);

  const entered = new Set<string>();
  report.created = 0;
  report.updated = 0;
  report.played = 0;

  for (const fixture of fixtures) {
    const homeClubId = clubByTeam.get(fixture.teams.home.id);
    const awayClubId = clubByTeam.get(fixture.teams.away.id);
    const date = new Date(fixture.fixture.date);
    const season = seasonOf(date);
    if (!homeClubId || !awayClubId || !season) continue;

    const status = statusOf(fixture.fixture.status.short);
    const played = status === "PLAYED" && fixture.goals.home !== null && fixture.goals.away !== null;
    const data = {
      date,
      status: played ? status : status === "PLAYED" ? "SCHEDULED" : status,
      homeScore: played ? fixture.goals.home : null,
      awayScore: played ? fixture.goals.away : null,
      matchday: matchdayOf(fixture.league.round),
      apiFootballFixtureId: fixture.fixture.id,
    } as const;
    if (played) report.played += 1;

    for (const clubId of [homeClubId, awayClubId]) {
      const key = `${clubId}:${season.id}`;
      if (entered.has(key)) continue;
      entered.add(key);
      await prisma.clubCompetition.upsert({
        where: { clubId_competitionId_seasonId: { clubId, competitionId: competition.id, seasonId: season.id } },
        update: {},
        create: { clubId, competitionId: competition.id, seasonId: season.id },
      });
    }

    let match = byFixture.get(fixture.fixture.id);
    if (!match) {
      const index = unlinked.findIndex(
        (m) => m.seasonId === season.id && m.homeClubId === homeClubId && m.awayClubId === awayClubId,
      );
      if (index >= 0) match = unlinked.splice(index, 1)[0];
    }

    if (!match) {
      await prisma.match.create({
        data: {
          ...data,
          competitionId: competition.id,
          seasonId: season.id,
          homeClubId,
          awayClubId,
          venue: fixture.fixture.venue?.name ?? null,
        },
      });
      report.created += 1;
      continue;
    }

    const unchanged =
      match.date.getTime() === date.getTime() &&
      match.status === data.status &&
      match.homeScore === data.homeScore &&
      match.awayScore === data.awayScore &&
      match.matchday === data.matchday &&
      match.apiFootballFixtureId === data.apiFootballFixtureId;
    if (unchanged) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: { ...data, venue: match.venue ?? fixture.fixture.venue?.name ?? null },
    });
    report.updated += 1;
  }

  return report;
}

async function syncSquad(
  run: Run,
  progress: Progress,
  club: { id: string; nameFr: string; apiFootballTeamId: number; squadSyncedAt: Date | null },
) {
  run.check();
  const squad = await fetchSquad(club.apiFootballTeamId);

  const [known, ownPlayers] = await Promise.all([
    prisma.player.findMany({
      where: { apiFootballPlayerId: { in: squad.map((player) => player.id) } },
      select: { id: true, apiFootballPlayerId: true, clubId: true, shirtNumber: true },
    }),
    prisma.player.findMany({
      where: { clubId: club.id, apiFootballPlayerId: null },
      select: { id: true, name: true },
    }),
  ]);
  const knownById = new Map(known.map((player) => [player.apiFootballPlayerId!, player]));
  // A full squad entered by hand before the first sync (e.g. from the club's
  // official list) is more current than the API's: the API then only links
  // those players, it never adds any, moves any in, nor overwrites numbers.
  if (!club.squadSyncedAt && ownPlayers.length >= HAND_ENTERED_SQUAD) {
    (progress.handEnteredClubs ??= []).push(club.id);
  }
  const handEntered = progress.handEnteredClubs?.includes(club.id) ?? false;

  let updated = 0;
  const fresh: typeof squad = [];
  for (const player of squad) {
    const linked = knownById.get(player.id);
    if (linked) {
      if (handEntered) continue;
      const number = player.number ?? linked.shirtNumber;
      if (linked.clubId !== club.id || linked.shirtNumber !== number) {
        await prisma.player.update({ where: { id: linked.id }, data: { clubId: club.id, shirtNumber: number } });
        updated += 1;
      }
      continue;
    }

    // A player already entered by hand for this club, e.g. "M. Doumbia" for "Mory Doumbia".
    const own = bestMatch(player.name, ownPlayers, (p) => [p.name]);
    if (own) {
      await prisma.player.update({
        where: { id: own.id },
        data: {
          apiFootballPlayerId: player.id,
          shirtNumber: handEntered ? undefined : (player.number ?? undefined),
        },
      });
      ownPlayers.splice(ownPlayers.indexOf(own), 1);
      updated += 1;
      continue;
    }
    if (!handEntered) fresh.push(player);
  }

  // Plain name slug when free, otherwise suffixed with the stable API id.
  const bases = fresh.map((player) => slugify(player.name) || "joueur");
  const taken = new Set(
    (await prisma.player.findMany({ where: { slug: { in: bases } }, select: { slug: true } })).map((p) => p.slug),
  );
  const data = fresh.map((player, index) => {
    const base = bases[index];
    const slug = taken.has(base) ? `${base}-${player.id}` : base;
    taken.add(slug);
    return {
      slug,
      name: player.name,
      position: positionOf(player.position),
      shirtNumber: player.number,
      // API-Football's placeholder when it has no picture.
      photoUrl: player.photo && !player.photo.endsWith("/0.png") ? player.photo : null,
      clubId: club.id,
      apiFootballPlayerId: player.id,
    };
  });
  if (data.length > 0) await prisma.player.createMany({ data, skipDuplicates: true });

  await prisma.club.update({ where: { id: club.id }, data: { squadSyncedAt: new Date() } });
  return { created: data.length, updated };
}

/** Squads of clubs playing this season not yet imported (or stale), oldest first. */
function squadsToSync(take: number, countryId?: string) {
  return prisma.club.findMany({
    where: {
      apiFootballTeamId: { not: null },
      entries: { some: { season: { isCurrent: true }, ...(countryId ? { competition: { countryId } } : {}) } },
      OR: [{ squadSyncedAt: null }, { squadSyncedAt: { lt: new Date(Date.now() - SQUAD_REFRESH_MS) } }],
    },
    select: { id: true, nameFr: true, apiFootballTeamId: true, squadSyncedAt: true },
    orderBy: { squadSyncedAt: { sort: "asc", nulls: "first" } },
    take,
  });
}

async function syncSquads(run: Run, progress: Progress, clubs: Awaited<ReturnType<typeof squadsToSync>>) {
  for (const club of clubs) {
    try {
      run.report.squads.push({
        club: club.nameFr,
        ...(await syncSquad(run, progress, club as typeof club & { apiFootballTeamId: number })),
      });
    } catch (error) {
      if (error instanceof QuotaExhaustedError || error instanceof OutOfTimeError) throw error;
      run.report.squads.push({ club: club.nameFr, created: 0, updated: 0, error: String(error) });
    }
  }
}

async function syncLeagues(run: Run, progress: Progress, where: { countryId?: string } = {}) {
  const competitions = await prisma.competition.findMany({
    where: { apiFootballLeagueId: { not: null }, ...where },
    select: { id: true, nameFr: true, countryId: true, apiFootballLeagueId: true },
    orderBy: [{ tier: "asc" }, { nameFr: "asc" }],
  });
  for (const competition of competitions) {
    if (run.leaguesDone.has(competition.id)) continue;
    run.leaguesDone.add(competition.id);
    try {
      run.report.leagues.push(await syncLeague(run, competition as CompetitionToSync, progress));
    } catch (error) {
      if (error instanceof QuotaExhaustedError || error instanceof OutOfTimeError) throw error;
      run.report.leagues.push({ competition: competition.nameFr, status: "error", message: String(error) });
    }
  }
}

/** Sets up one country: its leagues, its clubs, then its fixtures and squads. */
async function setUpCountry(
  run: Run,
  progress: Progress,
  country: { id: string; nameFr: string; nameEn: string },
) {
  const report: CountryReport = { country: country.nameFr };
  const apiCountry = bestMatch(
    country.nameEn === "Eswatini" ? "Swaziland" : country.nameEn,
    progress.apiCountries ?? [],
    (item) => [item.name],
  );
  if (!apiCountry) {
    run.report.countries.push({ ...report, error: "Pays absent d'API-Football." });
    (progress.leaguesCheckedAt ??= {})[country.id] = new Date().toISOString();
    (progress.teamsCheckedAt ??= {})[country.id] = new Date().toISOString();
    return;
  }

  try {
    if (olderThan(progress.leaguesCheckedAt?.[country.id], LEAGUE_RECHECK_MS)) {
      await discoverCountryLeagues(run, country.id, apiCountry.name, report);
      (progress.leaguesCheckedAt ??= {})[country.id] = new Date().toISOString();
    }
    if (olderThan(progress.teamsCheckedAt?.[country.id], TEAM_RECHECK_MS)) {
      await linkCountryTeams(run, country.id, apiCountry.name, report);
      (progress.teamsCheckedAt ??= {})[country.id] = new Date().toISOString();
    }
  } finally {
    if (Object.keys(report).length > 1) run.report.countries.push(report);
  }

  await syncLeagues(run, progress, { countryId: country.id });
  await syncSquads(run, progress, await squadsToSync(100, country.id));
}

async function runSteps(run: Run, progress: Progress) {
  if (!progress.apiCountries || progress.apiCountries.length === 0) {
    run.check();
    progress.apiCountries = await fetchCountries();
  }

  // 1. Results of leagues already linked: the most visible data, cheapest to keep fresh.
  await syncLeagues(run, progress);

  // 2. Countries still to set up, the ones with the most clubs this season first.
  const countries = await prisma.country.findMany({
    where: { competitions: { some: { type: "LEAGUE", entries: { some: { season: { isCurrent: true } } } } } },
    select: {
      id: true,
      nameFr: true,
      nameEn: true,
      competitions: { select: { _count: { select: { entries: { where: { season: { isCurrent: true } } } } } } },
    },
  });
  const size = (country: (typeof countries)[number]) =>
    country.competitions.reduce((sum, competition) => sum + competition._count.entries, 0);
  countries.sort((a, b) => size(b) - size(a));

  for (const country of countries) {
    const due =
      olderThan(progress.leaguesCheckedAt?.[country.id], LEAGUE_RECHECK_MS) ||
      olderThan(progress.teamsCheckedAt?.[country.id], TEAM_RECHECK_MS);
    if (due) await setUpCountry(run, progress, country);
  }

  // 3. Remaining squads: never imported first, then those older than a month.
  await syncSquads(run, progress, await squadsToSync(500));
}

/** Runs as much of the sync as the API quota and the time budget allow, then stores the report. */
export async function runApiFootballSync(): Promise<SyncReport> {
  const run = new Run();
  const progress = await loadProgress();

  try {
    await runSteps(run, progress);
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
