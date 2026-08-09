import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Removes the accounts and organisations created while testing the delegated
 * space. Test data left in place would block a real club from claiming itself.
 */
async function main() {
  // Matches go first: deleting them cascades their appearances, so no statistic
  // survives its match.
  const matches = await prisma.match.deleteMany({});

  // Deleting a player cascades their proposals, appearances and market values.
  const players = await prisma.player.deleteMany({
    where: {
      OR: [
        { name: { contains: "Test" } },
        { name: { contains: "Stats" } },
        { name: { contains: "Demo" } },
      ],
    },
  });

  const organisations = await prisma.organisation.deleteMany({
    where: { email: { contains: ".test@" } },
  });

  const profiles = await prisma.userProfile.deleteMany({
    where: { email: { contains: ".afh" } },
  });

  console.log(`Matchs supprimés         : ${matches.count}`);
  console.log(`Joueurs supprimés        : ${players.count}`);
  console.log(`Organisations supprimées : ${organisations.count}`);
  console.log(`Profils supprimés        : ${profiles.count}`);
  console.log(`--- restant ---`);
  console.log(`Organisations : ${await prisma.organisation.count()}`);
  console.log(`Joueurs       : ${await prisma.player.count()}`);
  console.log(`Matchs        : ${await prisma.match.count()}`);
  console.log(`Propositions  : ${await prisma.valueProposal.count()}`);
  console.log(`Clubs         : ${await prisma.club.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
