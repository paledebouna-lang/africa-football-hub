import { prisma } from "@/lib/prisma";

export type StatLine = {
  competitionId: string;
  competitionNameFr: string;
  competitionNameEn: string;
  competitionNameAr: string;
  seasonLabel: string;
  appearances: number;
  starts: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
};

/**
 * Per-competition, per-season totals for a player.
 *
 * Statistics are derived from appearances on every read rather than kept in a
 * counter column: a corrected team sheet immediately corrects every figure, and
 * there is no second source of truth to drift.
 */
export async function playerStatistics(playerId: string): Promise<StatLine[]> {
  const appearances = await prisma.matchAppearance.findMany({
    where: { playerId, match: { status: "PLAYED" } },
    include: {
      match: {
        include: { competition: true, season: true },
      },
    },
  });

  const lines = new Map<string, StatLine>();

  for (const appearance of appearances) {
    const { competition, season } = appearance.match;
    const key = `${competition.id}::${season.id}`;

    const line =
      lines.get(key) ??
      ({
        competitionId: competition.id,
        competitionNameFr: competition.nameFr,
        competitionNameEn: competition.nameEn,
        competitionNameAr: competition.nameAr,
        seasonLabel: season.label,
        appearances: 0,
        starts: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
      } satisfies StatLine);

    line.appearances += 1;
    if (appearance.isStarter) line.starts += 1;
    line.minutesPlayed += appearance.minutesPlayed;
    line.goals += appearance.goals;
    line.assists += appearance.assists;
    line.yellowCards += appearance.yellowCards;
    line.redCards += appearance.redCards;
    if (appearance.cleanSheet) line.cleanSheets += 1;

    lines.set(key, line);
  }

  return [...lines.values()].sort(
    (a, b) =>
      b.seasonLabel.localeCompare(a.seasonLabel) ||
      b.appearances - a.appearances,
  );
}

export function totalOf(lines: StatLine[]): Omit<StatLine, "competitionId" | "competitionNameFr" | "competitionNameEn" | "competitionNameAr" | "seasonLabel"> {
  return lines.reduce(
    (total, line) => ({
      appearances: total.appearances + line.appearances,
      starts: total.starts + line.starts,
      minutesPlayed: total.minutesPlayed + line.minutesPlayed,
      goals: total.goals + line.goals,
      assists: total.assists + line.assists,
      yellowCards: total.yellowCards + line.yellowCards,
      redCards: total.redCards + line.redCards,
      cleanSheets: total.cleanSheets + line.cleanSheets,
    }),
    {
      appearances: 0,
      starts: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
    },
  );
}

export type PerformanceInput = {
  minutesPlayed: number;
  goals: number;
  assists: number;
  /** Matches the club played in the same season, to judge how much was available. */
  clubMatches: number;
};

/**
 * The season a valuation should judge: the current one if the player has already
 * featured in it, otherwise the most recent season they actually played.
 * A player between seasons is judged on their last real body of work rather than
 * on an empty record.
 */
export async function performanceInputFor(
  playerId: string,
  clubId: string | null,
): Promise<PerformanceInput | null> {
  const latest = await prisma.matchAppearance.findFirst({
    where: { playerId, match: { status: "PLAYED" } },
    orderBy: { match: { date: "desc" } },
    include: { match: true },
  });

  if (!latest) return null;

  const seasonId = latest.match.seasonId;

  const totals = await prisma.matchAppearance.aggregate({
    where: { playerId, match: { seasonId, status: "PLAYED" } },
    _sum: { minutesPlayed: true, goals: true, assists: true },
  });

  const clubMatches = clubId
    ? await prisma.match.count({
        where: {
          seasonId,
          status: "PLAYED",
          OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
        },
      })
    : 0;

  return {
    minutesPlayed: totals._sum.minutesPlayed ?? 0,
    goals: totals._sum.goals ?? 0,
    assists: totals._sum.assists ?? 0,
    clubMatches,
  };
}
