import { prisma } from "@/lib/prisma";
import { currentValueOf, getCurrentSeason } from "@/lib/queries";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Everything on the home page's "highlights" band is computed on read from
 * team sheets and market values — never stored — so it moves the moment a
 * sheet is saved or corrected.
 */

export async function playerOfTheWeek(now = new Date()) {
  const appearances = await prisma.matchAppearance.findMany({
    where: {
      match: { status: "PLAYED", date: { gte: new Date(now.getTime() - WEEK_MS), lte: now } },
    },
    include: { player: { include: { club: true } } },
  });

  const byPlayer = new Map<
    string,
    { player: (typeof appearances)[number]["player"]; goals: number; assists: number; cleanSheets: number; matches: number; score: number }
  >();

  for (const appearance of appearances) {
    const entry = byPlayer.get(appearance.playerId) ?? {
      player: appearance.player,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      matches: 0,
      score: 0,
    };
    entry.goals += appearance.goals;
    entry.assists += appearance.assists;
    entry.cleanSheets += appearance.cleanSheet ? 1 : 0;
    entry.matches += 1;
    // A goal outweighs an assist; a clean sheet gives goalkeepers and
    // defenders a route to the spotlight too.
    entry.score += appearance.goals * 3 + appearance.assists * 2 + (appearance.cleanSheet ? 2 : 0);
    byPlayer.set(appearance.playerId, entry);
  }

  const ranked = [...byPlayer.values()].filter((entry) => entry.score > 0);
  ranked.sort((a, b) => b.score - a.score || b.goals - a.goals || a.player.name.localeCompare(b.player.name));
  return ranked[0] ?? null;
}

/** The leading scorer of each top-flight league that has seen a goal this season. */
export async function topScorersByLeague(limit = 3) {
  const season = await getCurrentSeason();
  if (!season) return [];

  const appearances = await prisma.matchAppearance.findMany({
    where: {
      goals: { gt: 0 },
      match: {
        seasonId: season.id,
        status: "PLAYED",
        competition: { type: "LEAGUE", tier: 1 },
      },
    },
    include: { player: true, club: true, match: { include: { competition: true } } },
  });

  type Row = { player: (typeof appearances)[number]["player"]; club: (typeof appearances)[number]["club"]; goals: number };
  const byCompetition = new Map<
    string,
    { competition: (typeof appearances)[number]["match"]["competition"]; total: number; players: Map<string, Row> }
  >();

  for (const appearance of appearances) {
    const competition = appearance.match.competition;
    const group = byCompetition.get(competition.id) ?? { competition, total: 0, players: new Map<string, Row>() };
    const row = group.players.get(appearance.playerId) ?? { player: appearance.player, club: appearance.club, goals: 0 };
    row.goals += appearance.goals;
    group.players.set(appearance.playerId, row);
    group.total += appearance.goals;
    byCompetition.set(competition.id, group);
  }

  return [...byCompetition.values()]
    .map((group) => {
      const [top] = [...group.players.values()].sort((a, b) => b.goals - a.goals);
      return { competition: group.competition, total: group.total, ...top };
    })
    .sort((a, b) => b.goals - a.goals || b.total - a.total)
    .slice(0, limit);
}

/** The most valuable player of each nationality, richest countries first. */
export async function bestPlayerByCountry(limit = 6) {
  const players = await prisma.player.findMany({
    where: { nationalityId: { not: null }, marketValues: { some: {} } },
    include: {
      nationality: true,
      club: true,
      marketValues: { orderBy: { effectiveAt: "desc" }, take: 1 },
    },
  });

  const best = new Map<string, { player: (typeof players)[number]; value: number }>();
  for (const player of players) {
    const value = currentValueOf(player) ?? 0;
    const current = best.get(player.nationalityId!);
    if (value > 0 && (!current || value > current.value)) {
      best.set(player.nationalityId!, { player, value });
    }
  }

  return [...best.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}
