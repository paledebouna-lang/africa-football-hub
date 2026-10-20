import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { MatchStatus } from "@/generated/prisma/client";
import {
  DAY_MS,
  OutOfTimeError,
  Run,
  bestMatch,
  olderThan,
  unlinkedClubsOf,
  type CountryReport,
  type LeagueReport,
  type Progress,
} from "@/lib/api-football-sync";
import { fetchCountryLeagues, fetchLeague, fetchRound, fetchTeam, type TsdbEvent } from "@/lib/thesportsdb";

/**
 * The TheSportsDB half of the football sync (see football-sync.ts): fixtures
 * and results of the season in progress, which API-Football's free plan does
 * not publish. Leagues are found country by country, then read round by round
 * — the only complete listing the public key allows — and each run resumes
 * from the last round whose matches were all settled, with a sweep of every
 * round once a week to pick up rescheduled games.
 *
 * Teams are tied to the site's clubs by name, then through their API-Football
 * id when TheSportsDB knows it, so a club already linked by the other source
 * is recognised; nothing is deleted and no club is duplicated.
 */

const COUNTRY_RECHECK_MS = 30 * DAY_MS;
const SEASON_RECHECK_MS = 7 * DAY_MS;
const SWEEP_EVERY_MS = 7 * DAY_MS;
/** A postponed match older than this no longer holds its round open. */
const SETTLED_AFTER_MS = 14 * DAY_MS;
const MAX_ROUNDS = 40;

/** TheSportsDB names a few countries differently from the site. */
const TSDB_COUNTRY: Record<string, string> = { Eswatini: "Swaziland" };

function statusOfEvent(event: TsdbEvent): MatchStatus {
  const status = (event.strStatus ?? "").trim();
  if (event.strPostponed === "yes" || /^(PST|Postp)/i.test(status)) return "POSTPONED";
  if (/^(CANC|ABD|Canc|Aband)/i.test(status)) return "CANCELLED";
  if (/^(FT|AET|PEN|AWD|WO)$|Finish|After Pen|After ET/i.test(status)) return "PLAYED";
  return "SCHEDULED";
}

function kickoffOf(event: TsdbEvent): Date | null {
  const iso = event.strTimestamp ?? (event.dateEvent ? `${event.dateEvent}T${event.strTime ?? "12:00:00"}` : null);
  if (!iso) return null;
  const date = new Date(iso.endsWith("Z") || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const score = (value: string | null) => (value === null || value === "" ? null : Number(value));

/** First year of a season label: 2026 for "2026-2027" or "2026". */
const firstYear = (label: string) => Number(label.match(/\d{4}/)?.[0] ?? 0);

type CompetitionToSync = {
  id: string;
  nameFr: string;
  countryId: string | null;
  theSportsDbLeagueId: number;
};

/** Ties the country's championships to TheSportsDB leagues (one request). */
async function discoverCountryLeagues(run: Run, country: { id: string; nameEn: string }, report: CountryReport) {
  const competitions = await prisma.competition.findMany({
    where: { countryId: country.id, theSportsDbLeagueId: null, type: "LEAGUE", gender: "MALE", ageCategory: "SENIOR" },
    orderBy: { tier: "asc" },
  });
  if (competitions.length === 0) return;

  run.check();
  const leagues = (await fetchCountryLeagues(TSDB_COUNTRY[country.nameEn] ?? country.nameEn)).filter(
    (league) => league.idCup !== "1" && (league.strGender ?? "Male") === "Male",
  );
  const taken = new Set(
    (
      await prisma.competition.findMany({
        where: { theSportsDbLeagueId: { in: leagues.map((league) => Number(league.idLeague)) } },
        select: { theSportsDbLeagueId: true },
      })
    ).map((competition) => competition.theSportsDbLeagueId),
  );
  const available = leagues.filter((league) => !taken.has(Number(league.idLeague)));

  for (const competition of competitions) {
    // The same league on API-Football, else the only league of that division, else the name.
    const byApi = available.find(
      (league) => competition.apiFootballLeagueId && Number(league.idAPIfootballv3) === competition.apiFootballLeagueId,
    );
    const ofDivision = available.filter((league) => Number(league.intDivision) === competition.tier);
    const match =
      byApi ??
      (ofDivision.length === 1 ? ofDivision[0] : null) ??
      bestMatch(competition.nameEn, available, (league) => [league.strLeague, league.strLeagueAlternate]) ??
      bestMatch(competition.nameFr, available, (league) => [league.strLeague, league.strLeagueAlternate]);
    if (!match) continue;

    const apiId = Number(match.idAPIfootballv3) || null;
    const apiFree =
      apiId && !competition.apiFootballLeagueId
        ? !(await prisma.competition.findUnique({ where: { apiFootballLeagueId: apiId }, select: { id: true } }))
        : false;
    await prisma.competition.update({
      where: { id: competition.id },
      data: { theSportsDbLeagueId: Number(match.idLeague), ...(apiFree ? { apiFootballLeagueId: apiId } : {}) },
    });
    available.splice(available.indexOf(match), 1);
    (report.leaguesLinked ??= []).push(`${competition.nameFr} → ${match.strLeague} (TheSportsDB ${match.idLeague})`);
  }
  if (available.length > 0 && competitions.length > (report.leaguesLinked?.length ?? 0)) {
    report.leaguesAvailable = available.map((league) => `${league.strLeague} (TheSportsDB ${league.idLeague})`);
  }
}

type Team = { id: number; name: string; badge: string | null };

/** Site club for every team of the rounds read, attaching or creating clubs as needed. */
async function resolveClubs(
  run: Run,
  progress: Progress,
  competition: CompetitionToSync,
  events: TsdbEvent[],
  seasonIds: string[],
  report: LeagueReport,
) {
  const teams = new Map<number, Team>();
  for (const event of events) {
    teams.set(Number(event.idHomeTeam), { id: Number(event.idHomeTeam), name: event.strHomeTeam, badge: event.strHomeTeamBadge });
    teams.set(Number(event.idAwayTeam), { id: Number(event.idAwayTeam), name: event.strAwayTeam, badge: event.strAwayTeamBadge });
  }

  const clubByTeam = new Map<number, string>();
  const linked = await prisma.club.findMany({
    where: { theSportsDbTeamId: { in: [...teams.keys()] } },
    select: { id: true, theSportsDbTeamId: true },
  });
  for (const club of linked) clubByTeam.set(club.theSportsDbTeamId!, club.id);

  const pending = [...teams.values()].filter((team) => !clubByTeam.has(team.id));
  if (pending.length === 0) return clubByTeam;

  const candidates = competition.countryId ? await unlinkedClubsOf(competition.countryId, "theSportsDb") : [];
  // Clubs the admin entered for this competition this season: a small, known
  // pool, so a looser name match is safe there ("SOA" for "SOA (Armée)").
  const engagedIds = new Set(
    (
      await prisma.clubCompetition.findMany({
        where: { competitionId: competition.id, seasonId: { in: seasonIds } },
        select: { clubId: true },
      })
    ).map((entry) => entry.clubId),
  );
  const alreadySetUp = engagedIds.size > 0;
  const namesOf = (club: (typeof candidates)[number]) => [club.nameFr, club.nameEn, club.shortName];

  const attach = async (clubId: string, team: Team, logoUrl: string | null) => {
    await prisma.club.update({
      where: { id: clubId },
      data: { theSportsDbTeamId: team.id, ...(logoUrl === null && team.badge ? { logoUrl: team.badge } : {}) },
    });
    clubByTeam.set(team.id, clubId);
  };

  for (const team of pending) {
    const match =
      bestMatch(team.name, candidates, namesOf) ??
      bestMatch(team.name, candidates.filter((club) => engagedIds.has(club.id)), namesOf, 0.5);
    if (match) {
      const club = await prisma.club.findUnique({ where: { id: match.id }, select: { logoUrl: true } });
      await attach(match.id, team, club?.logoUrl ?? null);
      candidates.splice(candidates.indexOf(match), 1);
      continue;
    }

    // The same team on API-Football may already be a club on the site.
    let apiTeamId = progress.tsdbTeamApi?.[team.id] ?? null;
    if (apiTeamId === null) {
      run.check();
      const [detail] = await fetchTeam(team.id);
      apiTeamId = Number(detail?.idAPIfootball) || 0;
      (progress.tsdbTeamApi ??= {})[team.id] = apiTeamId;
    }
    const viaApi = apiTeamId
      ? await prisma.club.findUnique({ where: { apiFootballTeamId: apiTeamId }, select: { id: true, logoUrl: true, theSportsDbTeamId: true } })
      : null;
    if (viaApi && !viaApi.theSportsDbTeamId) {
      await attach(viaApi.id, team, viaApi.logoUrl);
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
        logoUrl: team.badge,
        primaryCompetitionId: competition.id,
        theSportsDbTeamId: team.id,
        ...(apiTeamId && !viaApi ? { apiFootballTeamId: apiTeamId } : {}),
      },
    });
    (report.clubsCreated ??= []).push(team.name);
    clubByTeam.set(team.id, club.id);
  }

  return clubByTeam;
}

/** Writes the rounds read into matches and entries; returns whether every match is settled. */
async function storeEvents(
  competition: CompetitionToSync,
  events: TsdbEvent[],
  clubByTeam: Map<number, string>,
  seasonOf: (date: Date) => { id: string } | undefined,
  report: LeagueReport,
) {
  const existing = await prisma.match.findMany({ where: { competitionId: competition.id } });
  const byEvent = new Map(existing.filter((m) => m.theSportsDbEventId).map((m) => [m.theSportsDbEventId!, m]));
  const byFixture = new Map(existing.filter((m) => m.apiFootballFixtureId).map((m) => [m.apiFootballFixtureId!, m]));
  // Matches entered by hand, by a script or by API-Football, not yet tied to an event.
  const unlinked = existing.filter((m) => !m.theSportsDbEventId);
  const entered = new Set<string>();

  for (const event of events) {
    const homeClubId = clubByTeam.get(Number(event.idHomeTeam));
    const awayClubId = clubByTeam.get(Number(event.idAwayTeam));
    const date = kickoffOf(event);
    const season = date ? seasonOf(date) : undefined;
    if (!homeClubId || !awayClubId || !date || !season) continue;

    const status = statusOfEvent(event);
    const homeScore = score(event.intHomeScore);
    const awayScore = score(event.intAwayScore);
    const played = status === "PLAYED" && homeScore !== null && awayScore !== null;
    const eventId = Number(event.idEvent);
    const fixtureId = Number(event.idAPIfootball) || null;
    const data = {
      date,
      status: played ? status : status === "PLAYED" ? "SCHEDULED" : status,
      homeScore: played ? homeScore : null,
      awayScore: played ? awayScore : null,
      matchday: Number(event.intRound) || null,
      theSportsDbEventId: eventId,
    } as const;
    if (played) report.played = (report.played ?? 0) + 1;

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

    let match = byEvent.get(eventId) ?? (fixtureId ? byFixture.get(fixtureId) : undefined);
    if (!match) {
      const index = unlinked.findIndex(
        (m) => m.seasonId === season.id && m.homeClubId === homeClubId && m.awayClubId === awayClubId,
      );
      if (index >= 0) match = unlinked.splice(index, 1)[0];
    }
    // The API-Football fixture id is kept when free, so the other source links the same match.
    const fixtureFree = fixtureId !== null && !byFixture.has(fixtureId);

    if (!match) {
      const created = await prisma.match.create({
        data: {
          ...data,
          ...(fixtureFree ? { apiFootballFixtureId: fixtureId } : {}),
          competitionId: competition.id,
          seasonId: season.id,
          homeClubId,
          awayClubId,
          venue: event.strVenue || null,
        },
      });
      if (fixtureFree) byFixture.set(fixtureId, created);
      report.created = (report.created ?? 0) + 1;
      continue;
    }

    const unchanged =
      match.date.getTime() === date.getTime() &&
      match.status === data.status &&
      match.homeScore === data.homeScore &&
      match.awayScore === data.awayScore &&
      match.matchday === data.matchday &&
      match.theSportsDbEventId === eventId;
    if (unchanged) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        ...data,
        ...(fixtureFree && !match.apiFootballFixtureId ? { apiFootballFixtureId: fixtureId } : {}),
        venue: match.venue ?? (event.strVenue || null),
      },
    });
    report.updated = (report.updated ?? 0) + 1;
  }
}

function settled(event: TsdbEvent): boolean {
  const status = statusOfEvent(event);
  if (status === "PLAYED" || status === "CANCELLED") return true;
  const date = kickoffOf(event);
  return date !== null && Date.now() - date.getTime() > SETTLED_AFTER_MS;
}

async function syncLeague(run: Run, competition: CompetitionToSync, progress: Progress): Promise<LeagueReport> {
  const report: LeagueReport = { competition: competition.nameFr, source: "TheSportsDB", status: "ok" };
  const leagueId = competition.theSportsDbLeagueId;

  let season = progress.tsdbSeason?.[leagueId];
  if (!season || olderThan(season.checkedAt, SEASON_RECHECK_MS)) {
    run.check();
    const [league] = await fetchLeague(leagueId);
    if (!league?.strCurrentSeason) {
      return { ...report, status: "skipped", message: "Aucune saison en cours sur TheSportsDB." };
    }
    season = { label: league.strCurrentSeason, checkedAt: new Date().toISOString() };
    (progress.tsdbSeason ??= {})[leagueId] = season;
  }

  const current = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (current && firstYear(season.label) < current.startDate.getFullYear()) {
    return { ...report, status: "skipped", message: `Saison ${season.label} sur TheSportsDB : la nouvelle n'y est pas encore ouverte.` };
  }

  const seasons = await prisma.season.findMany({ select: { id: true, startDate: true, endDate: true } });
  const seasonOf = (date: Date) => seasons.find((s) => s.startDate <= date && date <= s.endDate);

  const sweep = olderThan(progress.tsdbSweptAt?.[leagueId], SWEEP_EVERY_MS);
  const from = sweep ? 1 : (progress.tsdbRound?.[leagueId] ?? 0) + 1;
  let lastSettled = sweep ? 0 : (progress.tsdbRound?.[leagueId] ?? 0);
  let empties = 0;
  let rounds = 0;
  const events: TsdbEvent[] = [];

  for (let round = from; round <= MAX_ROUNDS && empties < 2; round += 1) {
    run.check();
    const batch = await fetchRound(leagueId, season.label, round);
    rounds += 1;
    if (batch.length === 0) {
      empties += 1;
      continue;
    }
    empties = 0;
    events.push(...batch);
    if (lastSettled === round - 1 && batch.every(settled)) lastSettled = round;
  }

  if (events.length === 0) {
    (progress.tsdbSweptAt ??= {})[leagueId] = new Date().toISOString();
    return { ...report, status: "skipped", message: `Aucun match publié pour ${season.label}.` };
  }

  const seasonIds = [...new Set(events.map((e) => kickoffOf(e)).map((d) => (d ? seasonOf(d)?.id : undefined)).filter(Boolean))] as string[];
  const clubByTeam = await resolveClubs(run, progress, competition, events, seasonIds, report);
  report.created = 0;
  report.updated = 0;
  report.played = 0;
  await storeEvents(competition, events, clubByTeam, seasonOf, report);

  (progress.tsdbRound ??= {})[leagueId] = lastSettled;
  if (sweep) (progress.tsdbSweptAt ??= {})[leagueId] = new Date().toISOString();
  report.message = `${rounds} journée(s) lue(s)`;
  return report;
}

/** The TheSportsDB part of a sync: links leagues country by country, then reads their rounds. */
export async function runTheSportsDbSteps(run: Run, progress: Progress) {
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
    if (!olderThan(progress.tsdbCountryCheckedAt?.[country.id], COUNTRY_RECHECK_MS)) continue;
    const report: CountryReport = { country: country.nameFr };
    try {
      await discoverCountryLeagues(run, country, report);
      (progress.tsdbCountryCheckedAt ??= {})[country.id] = new Date().toISOString();
    } catch (error) {
      if (error instanceof OutOfTimeError) throw error;
      report.error = String(error);
    } finally {
      if (Object.keys(report).length > 1) run.report.countries.push(report);
    }
  }

  const competitions = await prisma.competition.findMany({
    where: { theSportsDbLeagueId: { not: null } },
    select: {
      id: true,
      nameFr: true,
      countryId: true,
      theSportsDbLeagueId: true,
      tier: true,
      _count: { select: { entries: { where: { season: { isCurrent: true } } } } },
    },
  });
  competitions.sort((a, b) => a.tier - b.tier || b._count.entries - a._count.entries);

  for (const competition of competitions) {
    try {
      run.report.leagues.push(await syncLeague(run, competition as typeof competition & CompetitionToSync, progress));
    } catch (error) {
      if (error instanceof OutOfTimeError) throw error;
      run.report.leagues.push({
        competition: competition.nameFr,
        source: "TheSportsDB",
        status: "error",
        message: String(error),
      });
    }
  }
}
