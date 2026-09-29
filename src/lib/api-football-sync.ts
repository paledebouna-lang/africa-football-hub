import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { Position, MatchStatus } from "@/generated/prisma/client";
import {
  fetchCountryLeagues,
  fetchFixtures,
  fetchLeague,
  fetchSquad,
  type ApiFixture,
} from "@/lib/api-football";

/**
 * Keeps every linked league up to date from API-Football: fixtures, results
 * (which feed the standings) and squads. Runs daily from
 * /api/cron/sync-football and on demand from /admin/sync.
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

export type SyncReport = {
  leagues: LeagueReport[];
  squads: { club: string; created: number; updated: number; error?: string }[];
};

/** Squads refreshed per run, stalest first: each costs one API request. */
const SQUADS_PER_RUN = Number(process.env.API_FOOTBALL_SQUADS_PER_RUN ?? 20);

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

async function uniqueSlug(base: string, taken: (slug: string) => Promise<unknown>): Promise<string> {
  const seed = base || "sans-nom";
  let slug = seed;
  for (let n = 2; await taken(slug); n += 1) slug = `${seed}-${n}`;
  return slug;
}

type CompetitionToSync = {
  id: string;
  nameFr: string;
  countryId: string | null;
  apiFootballLeagueId: number;
};

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

  // Clubs of the same country not yet linked to any API team.
  const candidates = competition.countryId
    ? await prisma.club.findMany({
        where: {
          apiFootballTeamId: null,
          OR: [
            { primaryCompetition: { countryId: competition.countryId } },
            { entries: { some: { competition: { countryId: competition.countryId } } } },
          ],
        },
        select: { id: true, nameFr: true, nameEn: true, shortName: true },
      })
    : [];

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

    const slug = await uniqueSlug(slugify(team.name), (candidate) =>
      prisma.club.findUnique({ where: { slug: candidate }, select: { id: true } }),
    );
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

async function syncLeague(competition: CompetitionToSync): Promise<LeagueReport> {
  const report: LeagueReport = { competition: competition.nameFr, status: "ok" };

  const [league] = await fetchLeague(competition.apiFootballLeagueId);
  const current = league?.seasons.find((season) => season.current);
  if (!current) return { ...report, status: "skipped", message: "Aucune saison en cours sur API-Football." };
  if (new Date(current.start) > new Date()) {
    return { ...report, status: "skipped", message: `Saison ${current.year} pas encore commencée.` };
  }

  const fixtures = await fetchFixtures(competition.apiFootballLeagueId, current.year);
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

async function syncSquad(club: { id: string; nameFr: string; apiFootballTeamId: number }) {
  const squad = await fetchSquad(club.apiFootballTeamId);
  const ownPlayers = await prisma.player.findMany({
    where: { clubId: club.id, apiFootballPlayerId: null },
    select: { id: true, name: true },
  });

  let created = 0;
  let updated = 0;
  for (const player of squad) {
    const linked =
      (await prisma.player.findUnique({ where: { apiFootballPlayerId: player.id } })) ??
      bestMatch(player.name, ownPlayers, (own) => [own.name]);

    if (linked) {
      await prisma.player.update({
        where: { id: linked.id },
        data: { apiFootballPlayerId: player.id, clubId: club.id, shirtNumber: player.number ?? undefined },
      });
      const own = ownPlayers.findIndex((p) => p.id === linked.id);
      if (own >= 0) ownPlayers.splice(own, 1);
      updated += 1;
      continue;
    }

    const slug = await uniqueSlug(slugify(player.name), (candidate) =>
      prisma.player.findUnique({ where: { slug: candidate }, select: { id: true } }),
    );
    await prisma.player.create({
      data: {
        slug,
        name: player.name,
        position: positionOf(player.position),
        shirtNumber: player.number,
        // API-Football's placeholder when it has no picture.
        photoUrl: player.photo && !player.photo.endsWith("/0.png") ? player.photo : null,
        clubId: club.id,
        apiFootballPlayerId: player.id,
      },
    });
    created += 1;
  }

  await prisma.club.update({ where: { id: club.id }, data: { squadSyncedAt: new Date() } });
  return { created, updated };
}

/** Pulls fixtures, results and the stalest squads for every linked league, then stores the report. */
export async function runApiFootballSync(): Promise<SyncReport> {
  const report: SyncReport = { leagues: [], squads: [] };

  const competitions = await prisma.competition.findMany({
    where: { apiFootballLeagueId: { not: null } },
    select: { id: true, nameFr: true, countryId: true, apiFootballLeagueId: true },
    orderBy: [{ tier: "asc" }, { nameFr: "asc" }],
  });

  for (const competition of competitions) {
    try {
      report.leagues.push(await syncLeague(competition as CompetitionToSync));
    } catch (error) {
      report.leagues.push({ competition: competition.nameFr, status: "error", message: String(error) });
    }
  }

  const clubs = await prisma.club.findMany({
    where: { apiFootballTeamId: { not: null } },
    select: { id: true, nameFr: true, apiFootballTeamId: true },
    orderBy: { squadSyncedAt: { sort: "asc", nulls: "first" } },
    take: SQUADS_PER_RUN,
  });
  for (const club of clubs) {
    try {
      report.squads.push({ club: club.nameFr, ...(await syncSquad(club as typeof club & { apiFootballTeamId: number })) });
    } catch (error) {
      report.squads.push({ club: club.nameFr, created: 0, updated: 0, error: String(error) });
    }
  }

  await prisma.apiFootballSync.upsert({
    where: { id: "main" },
    update: { ranAt: new Date(), report },
    create: { id: "main", ranAt: new Date(), report },
  });
  return report;
}

export type DiscoveryResult = { competition: string; linkedTo?: string; candidates?: string[] };

/**
 * Finds the API-Football league of every national championship not yet linked,
 * by matching names within the country (one request per country). Leagues with
 * no clear match are returned with the country's leagues, to be set by hand.
 */
export async function discoverLeagues(): Promise<DiscoveryResult[]> {
  const competitions = await prisma.competition.findMany({
    where: {
      apiFootballLeagueId: null,
      type: "LEAGUE",
      countryId: { not: null },
      gender: "MALE",
      ageCategory: "SENIOR",
    },
    include: { country: true },
    orderBy: [{ tier: "asc" }],
  });
  const taken = new Set(
    (await prisma.competition.findMany({ where: { apiFootballLeagueId: { not: null } } })).map(
      (c) => c.apiFootballLeagueId,
    ),
  );

  const byCountry = new Map<string, typeof competitions>();
  for (const competition of competitions) {
    const list = byCountry.get(competition.countryId!) ?? [];
    list.push(competition);
    byCountry.set(competition.countryId!, list);
  }

  const results: DiscoveryResult[] = [];
  for (const list of byCountry.values()) {
    const country = list[0].country!;
    let leagues;
    try {
      // API-Football spells multi-word countries with hyphens: "Ivory-Coast".
      leagues = await fetchCountryLeagues(country.nameEn.replace(/\s+/g, "-"));
    } catch (error) {
      for (const competition of list) results.push({ competition: competition.nameFr, candidates: [String(error)] });
      continue;
    }
    const available = leagues.filter((league) => !taken.has(league.league.id));

    for (const competition of list) {
      const match = bestMatch(
        competition.nameEn,
        available,
        (league) => [league.league.name],
      ) ?? bestMatch(competition.nameFr, available, (league) => [league.league.name]);

      if (!match) {
        results.push({
          competition: `${competition.nameFr} (${country.nameFr})`,
          candidates: leagues.map((league) => `${league.league.name} — id ${league.league.id}`),
        });
        continue;
      }

      await prisma.competition.update({
        where: { id: competition.id },
        data: { apiFootballLeagueId: match.league.id },
      });
      taken.add(match.league.id);
      available.splice(available.indexOf(match), 1);
      results.push({
        competition: `${competition.nameFr} (${country.nameFr})`,
        linkedTo: `${match.league.name} — id ${match.league.id}`,
      });
    }
  }

  await prisma.apiFootballSync.upsert({
    where: { id: "discovery" },
    update: { ranAt: new Date(), report: results },
    create: { id: "discovery", ranAt: new Date(), report: results },
  });
  return results;
}
