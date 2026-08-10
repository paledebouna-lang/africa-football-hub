import { prisma } from "@/lib/prisma";

export type StandingRow = {
  competitorId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type StandingsGroup<Competitor> = {
  group: string | null;
  rows: (StandingRow & { competitor: Competitor })[];
};

const POINTS = { win: 3, draw: 1, loss: 0 } as const;

/** Standard football sort: points, then goal difference, then goals scored. */
function sortStandings<T extends StandingRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor,
  );
}

/**
 * Builds a blank row per entrant and folds played matches into it.
 *
 * Shared by clubs and national teams because the arithmetic is identical —
 * only the source of "who is entered" and "which matches count" differs
 * between the two, and those are passed in already resolved.
 */
function buildStandings(
  competitorIds: string[],
  matches: { homeId: string; awayId: string; homeScore: number; awayScore: number }[],
): Map<string, StandingRow> {
  const rows = new Map<string, StandingRow>(
    competitorIds.map((id) => [
      id,
      {
        competitorId: id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ]),
  );

  for (const match of matches) {
    const home = rows.get(match.homeId);
    const away = rows.get(match.awayId);
    // A match against a club outside this group/season slice is not counted —
    // this keeps a cup run from polluting a league table, for instance.
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += POINTS.win;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += POINTS.win;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += POINTS.draw;
      away.points += POINTS.draw;
    }
  }

  for (const row of rows.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return rows;
}

export async function clubStandings(competitionId: string, seasonId: string) {
  const entries = await prisma.clubCompetition.findMany({
    where: { competitionId, seasonId },
    include: { club: true },
  });

  if (entries.length === 0) return [];

  const matches = await prisma.match.findMany({
    where: { competitionId, seasonId, status: "PLAYED" },
    select: { homeClubId: true, awayClubId: true, homeScore: true, awayScore: true },
  });
  const played = matches.filter(
    (m): m is typeof m & { homeScore: number; awayScore: number } =>
      m.homeScore !== null && m.awayScore !== null,
  );

  const groups = new Map<string | null, typeof entries>();
  for (const entry of entries) {
    const key = entry.group;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const result: StandingsGroup<(typeof entries)[number]["club"]>[] = [];
  for (const [group, groupEntries] of groups) {
    const ids = groupEntries.map((entry) => entry.clubId);
    const rows = buildStandings(
      ids,
      played
        .filter((m) => ids.includes(m.homeClubId) && ids.includes(m.awayClubId))
        .map((m) => ({
          homeId: m.homeClubId,
          awayId: m.awayClubId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })),
    );

    result.push({
      group,
      rows: sortStandings(
        groupEntries.map((entry) => ({
          ...rows.get(entry.clubId)!,
          competitor: entry.club,
        })),
      ),
    });
  }

  // Groups sort alphabetically, with the ungrouped table (single-table
  // competitions) always shown first.
  return result.sort((a, b) => (a.group ?? "").localeCompare(b.group ?? ""));
}

export async function nationalTeamStandings(competitionId: string, seasonId: string) {
  const entries = await prisma.nationalTeamEntry.findMany({
    where: { competitionId, seasonId },
    include: { country: true },
  });

  if (entries.length === 0) return [];

  const matches = await prisma.nationalTeamMatch.findMany({
    where: { competitionId, seasonId, status: "PLAYED" },
    select: {
      homeCountryId: true,
      awayCountryId: true,
      homeScore: true,
      awayScore: true,
    },
  });
  const played = matches.filter(
    (m): m is typeof m & { homeScore: number; awayScore: number } =>
      m.homeScore !== null && m.awayScore !== null,
  );

  const groups = new Map<string | null, typeof entries>();
  for (const entry of entries) {
    const key = entry.group;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const result: StandingsGroup<(typeof entries)[number]["country"]>[] = [];
  for (const [group, groupEntries] of groups) {
    const ids = groupEntries.map((entry) => entry.countryId);
    const rows = buildStandings(
      ids,
      played
        .filter((m) => ids.includes(m.homeCountryId) && ids.includes(m.awayCountryId))
        .map((m) => ({
          homeId: m.homeCountryId,
          awayId: m.awayCountryId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })),
    );

    result.push({
      group,
      rows: sortStandings(
        groupEntries.map((entry) => ({
          ...rows.get(entry.countryId)!,
          competitor: entry.country,
        })),
      ),
    });
  }

  return result.sort((a, b) => (a.group ?? "").localeCompare(b.group ?? ""));
}
