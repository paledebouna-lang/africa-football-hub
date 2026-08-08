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
  const organisations = await prisma.organisation.deleteMany({
    where: { email: { contains: ".test@" } },
  });

  const profiles = await prisma.userProfile.deleteMany({
    where: { email: { in: ["verification.afh@gmail.com"] } },
  });

  console.log(`Organisations supprimées : ${organisations.count}`);
  console.log(`Profils supprimés       : ${profiles.count}`);
  console.log(`Organisations restantes : ${await prisma.organisation.count()}`);
  console.log(`Joueurs restants        : ${await prisma.player.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
