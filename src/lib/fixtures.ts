import { prisma } from "@/lib/prisma";

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export async function clubFixtures(competitionId: string, seasonId: string) {
  return prisma.match.findMany({
    where: { competitionId, seasonId },
    orderBy: { date: "asc" },
    include: { homeClub: true, awayClub: true },
  });
}

export async function nationalTeamFixtures(competitionId: string, seasonId: string) {
  return prisma.nationalTeamMatch.findMany({
    where: { competitionId, seasonId },
    orderBy: { date: "asc" },
    include: { homeCountry: true, awayCountry: true },
  });
}

/** Every match kicking off today, across every competition — clubs and countries alike. */
export async function todaysMatches(now = new Date()) {
  const where = { date: { gte: startOfDay(now), lte: endOfDay(now) } };

  const [clubMatches, nationalMatches] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy: { date: "asc" },
      include: { competition: true, homeClub: true, awayClub: true },
    }),
    prisma.nationalTeamMatch.findMany({
      where,
      orderBy: { date: "asc" },
      include: { competition: true, homeCountry: true, awayCountry: true },
    }),
  ]);

  return { clubMatches, nationalMatches };
}

export type TopScorerRow = {
  playerId: string;
  playerName: string;
  playerSlug: string;
  photoUrl: string | null;
  clubOrCountryName: string | null;
  goals: number;
  assists: number;
  appearances: number;
};

/**
 * Goal and assist totals for a competition + season, aggregated from team
 * sheets rather than kept as a running counter — the same principle as
 * player statistics: a corrected sheet corrects the ranking immediately.
 */
export async function clubTopScorers(
  competitionId: string,
  seasonId: string,
  limit = 15,
): Promise<TopScorerRow[]> {
  const appearances = await prisma.matchAppearance.findMany({
    where: { match: { competitionId, seasonId, status: "PLAYED" } },
    include: { player: true, club: true },
  });

  return aggregateTopScorers(
    appearances.map((appearance) => ({
      playerId: appearance.playerId,
      playerName: appearance.player.name,
      playerSlug: appearance.player.slug,
      photoUrl: appearance.player.photoUrl,
      groupName: appearance.club.nameFr,
      goals: appearance.goals,
      assists: appearance.assists,
    })),
    limit,
  );
}

export async function nationalTeamTopScorers(
  competitionId: string,
  seasonId: string,
  limit = 15,
): Promise<TopScorerRow[]> {
  const appearances = await prisma.nationalTeamMatchAppearance.findMany({
    where: { match: { competitionId, seasonId, status: "PLAYED" } },
    include: { player: true, country: true },
  });

  return aggregateTopScorers(
    appearances.map((appearance) => ({
      playerId: appearance.playerId,
      playerName: appearance.player.name,
      playerSlug: appearance.player.slug,
      photoUrl: appearance.player.photoUrl,
      groupName: appearance.country.nameFr,
      goals: appearance.goals,
      assists: appearance.assists,
    })),
    limit,
  );
}

function aggregateTopScorers(
  rows: {
    playerId: string;
    playerName: string;
    playerSlug: string;
    photoUrl: string | null;
    groupName: string;
    goals: number;
    assists: number;
  }[],
  limit: number,
): TopScorerRow[] {
  const totals = new Map<string, TopScorerRow>();

  for (const row of rows) {
    const existing = totals.get(row.playerId);
    if (existing) {
      existing.goals += row.goals;
      existing.assists += row.assists;
      existing.appearances += 1;
    } else {
      totals.set(row.playerId, {
        playerId: row.playerId,
        playerName: row.playerName,
        playerSlug: row.playerSlug,
        photoUrl: row.photoUrl,
        clubOrCountryName: row.groupName,
        goals: row.goals,
        assists: row.assists,
        appearances: 1,
      });
    }
  }

  return [...totals.values()]
    .filter((row) => row.goals > 0 || row.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, limit);
}
