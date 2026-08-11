import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * import-caf-domestic-leagues.ts set every club's primaryCompetitionId, which
 * drives its profile page, valuation and the transfer dropdowns — but a club
 * only shows as "engagé" on its competition's own page via a ClubCompetition
 * row for the current season. This backfills that row for any club missing
 * one, so newly imported clubs appear in their league's standings/club list
 * the same way the original 45 already did.
 */
async function main() {
  const season = await prisma.season.findFirstOrThrow({ where: { isCurrent: true } });

  const clubs = await prisma.club.findMany({
    where: { primaryCompetitionId: { not: null } },
    select: { id: true, primaryCompetitionId: true },
  });

  let created = 0;
  for (const club of clubs) {
    const existing = await prisma.clubCompetition.findUnique({
      where: {
        clubId_competitionId_seasonId: {
          clubId: club.id,
          competitionId: club.primaryCompetitionId!,
          seasonId: season.id,
        },
      },
    });
    if (existing) continue;

    await prisma.clubCompetition.create({
      data: { clubId: club.id, competitionId: club.primaryCompetitionId!, seasonId: season.id },
    });
    created += 1;
  }

  console.log(`--- Terminé : ${created} engagements créés ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
