import { prisma } from "@/lib/prisma";

/** Latest market value per player is always the first row of this include. */
const withLatestValue = {
  marketValues: {
    orderBy: { effectiveAt: "desc" },
    take: 1,
  },
} as const;

/** Honours always need their competition to render a name. */
const withHonours = {
  honours: {
    orderBy: { year: "desc" },
    include: { competition: true },
  },
} as const;

export function currentValueOf(player: {
  marketValues: { valueUsd: number }[];
}): number | null {
  return player.marketValues[0]?.valueUsd ?? null;
}

export function squadValue(players: { marketValues: { valueUsd: number }[] }[]): number {
  return players.reduce((total, player) => total + (currentValueOf(player) ?? 0), 0);
}

export async function getCurrentSeason() {
  return prisma.season.findFirst({ where: { isCurrent: true } });
}

// ---------------------------------------------------------------- competitions

export type CompetitionFilters = {
  countrySlug?: string;
  type?: string;
};

export async function getCompetitions(filters: CompetitionFilters = {}) {
  return prisma.competition.findMany({
    where: {
      ...(filters.countrySlug ? { country: { slug: filters.countrySlug } } : {}),
      ...(filters.type ? { type: filters.type as never } : {}),
    },
    include: {
      country: true,
      _count: { select: { primaryClubs: true } },
    },
    orderBy: [{ type: "asc" }, { nameFr: "asc" }],
  });
}

export async function getCompetitionBySlug(slug: string) {
  const season = await getCurrentSeason();

  return prisma.competition.findUnique({
    where: { slug },
    include: {
      country: true,
      entries: {
        where: season ? { seasonId: season.id } : undefined,
        include: {
          club: {
            include: {
              players: { include: withLatestValue },
              _count: { select: { players: true } },
            },
          },
        },
      },
    },
  });
}

// ---------------------------------------------------------------- clubs

export async function getClubBySlug(slug: string) {
  const season = await getCurrentSeason();

  return prisma.club.findUnique({
    where: { slug },
    include: {
      primaryCompetition: { include: { country: true } },
      parentClub: true,
      academies: true,
      ...withHonours,
      entries: {
        where: season ? { seasonId: season.id } : undefined,
        include: { competition: { include: { country: true } } },
      },
      players: {
        orderBy: [{ ageCategory: "asc" }, { position: "asc" }, { name: "asc" }],
        include: { ...withLatestValue, nationality: true },
      },
      coachSpells: {
        where: { endDate: null },
        include: { coach: { include: { nationality: true } } },
        orderBy: { role: "asc" },
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

// ---------------------------------------------------------------- players

export async function getPlayerBySlug(slug: string) {
  const season = await getCurrentSeason();

  return prisma.player.findUnique({
    where: { slug },
    include: {
      club: {
        include: {
          primaryCompetition: { include: { country: true } },
          entries: {
            where: season ? { seasonId: season.id } : undefined,
            include: { competition: { include: { country: true } } },
          },
        },
      },
      nationality: true,
      selections: { include: { country: true }, orderBy: { level: "asc" } },
      videos: { orderBy: { createdAt: "desc" } },
      ...withHonours,
      marketValues: { orderBy: { effectiveAt: "asc" } },
      transfers: {
        orderBy: { date: "desc" },
        include: { fromClub: true, toClub: true, season: true },
      },
    },
  });
}

// ---------------------------------------------------------------- coaches

export async function getCoachBySlug(slug: string) {
  return prisma.coach.findUnique({
    where: { slug },
    include: {
      nationality: true,
      ...withHonours,
      spells: {
        orderBy: { startDate: "desc" },
        include: {
          club: { include: { primaryCompetition: { include: { country: true } } } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------- transfers

export async function getLatestTransfers(limit = 10) {
  return prisma.transfer.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: { player: true, fromClub: true, toClub: true, season: true },
  });
}

export type TransferFilters = {
  competitionSlug?: string;
  seasonId?: string;
  type?: string;
};

export async function getFilteredTransfers(filters: TransferFilters, limit = 100) {
  return prisma.transfer.findMany({
    where: {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(filters.type ? { type: filters.type as never } : {}),
      ...(filters.competitionSlug
        ? {
            OR: [
              { toClub: { primaryCompetition: { slug: filters.competitionSlug } } },
              { fromClub: { primaryCompetition: { slug: filters.competitionSlug } } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
    include: { player: true, fromClub: true, toClub: true, season: true },
  });
}

// ---------------------------------------------------------------- discovery

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

export async function searchAll(query: string) {
  const [players, clubs, coaches, competitions] = await Promise.all([
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
      include: { primaryCompetition: { include: { country: true } } },
      orderBy: { nameFr: "asc" },
    }),
    prisma.coach.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { nameAr: { contains: query } },
        ],
      },
      take: 15,
      include: {
        nationality: true,
        spells: { where: { endDate: null }, include: { club: true }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.competition.findMany({
      where: {
        OR: [
          { nameFr: { contains: query, mode: "insensitive" } },
          { nameEn: { contains: query, mode: "insensitive" } },
          { nameAr: { contains: query } },
        ],
      },
      take: 15,
      include: { country: true },
      orderBy: { nameFr: "asc" },
    }),
  ]);

  return { players, clubs, coaches, competitions };
}
