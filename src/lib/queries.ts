import { prisma } from "@/lib/prisma";

/** Latest market value per player is always the first row of this include. */
const withLatestValue = {
  marketValues: {
    orderBy: { effectiveAt: "desc" },
    take: 1,
  },
} as const;

export function currentValueOf(player: {
  marketValues: { valueEur: number }[];
}): number | null {
  return player.marketValues[0]?.valueEur ?? null;
}

export async function getLeaguesWithCounts() {
  return prisma.league.findMany({
    include: {
      country: true,
      _count: { select: { clubs: true } },
    },
    orderBy: [{ country: { nameFr: "asc" } }],
  });
}

export async function getLeagueBySlug(slug: string) {
  return prisma.league.findUnique({
    where: { slug },
    include: {
      country: true,
      clubs: {
        orderBy: { nameFr: "asc" },
        include: {
          players: { include: withLatestValue },
          _count: { select: { players: true } },
        },
      },
    },
  });
}

export async function getClubBySlug(slug: string) {
  return prisma.club.findUnique({
    where: { slug },
    include: {
      league: { include: { country: true } },
      players: {
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: { ...withLatestValue, nationality: true },
      },
      transfersIn: {
        orderBy: { date: "desc" },
        take: 15,
        include: { player: true, fromClub: true, season: true },
      },
      transfersOut: {
        orderBy: { date: "desc" },
        take: 15,
        include: { player: true, toClub: true, season: true },
      },
    },
  });
}

export async function getPlayerBySlug(slug: string) {
  return prisma.player.findUnique({
    where: { slug },
    include: {
      club: { include: { league: { include: { country: true } } } },
      nationality: true,
      marketValues: { orderBy: { effectiveAt: "asc" } },
      transfers: {
        orderBy: { date: "desc" },
        include: { fromClub: true, toClub: true, season: true },
      },
    },
  });
}

export async function getLatestTransfers(limit = 10) {
  return prisma.transfer.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      player: true,
      fromClub: true,
      toClub: true,
      season: true,
    },
  });
}

export async function getTopValuedPlayers(limit = 10) {
  const players = await prisma.player.findMany({
    where: { marketValues: { some: {} } },
    include: { ...withLatestValue, club: true },
  });

  return players
    .map((player) => ({ player, value: currentValueOf(player) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export type TransferFilters = {
  leagueSlug?: string;
  seasonId?: string;
  type?: string;
};

export async function getFilteredTransfers(filters: TransferFilters, limit = 100) {
  return prisma.transfer.findMany({
    where: {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(filters.type ? { type: filters.type as never } : {}),
      ...(filters.leagueSlug
        ? {
            OR: [
              { toClub: { league: { slug: filters.leagueSlug } } },
              { fromClub: { league: { slug: filters.leagueSlug } } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      player: true,
      fromClub: true,
      toClub: true,
      season: true,
    },
  });
}

export async function searchPlayersAndClubs(query: string) {
  const [players, clubs] = await Promise.all([
    prisma.player.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nameAr: { contains: query } },
        ],
      },
      take: 25,
      include: { ...withLatestValue, club: true },
      orderBy: { name: "asc" },
    }),
    prisma.club.findMany({
      where: {
        OR: [
          { nameFr: { contains: query, mode: "insensitive" } },
          { nameEn: { contains: query, mode: "insensitive" } },
          { nameAr: { contains: query } },
          { shortName: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 25,
      include: { league: { include: { country: true } } },
      orderBy: { nameFr: "asc" },
    }),
  ]);

  return { players, clubs };
}

export function squadValue(players: { marketValues: { valueEur: number }[] }[]): number {
  return players.reduce((total, player) => total + (currentValueOf(player) ?? 0), 0);
}
