import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const counts = {
    marketValues: await prisma.marketValue.count(),
    transfers: await prisma.transfer.count(),
    valueProposals: await prisma.valueProposal.count(),
    trainingCostRates: await prisma.trainingCostRate.count(),
    players: await prisma.player.count(),
    clubs: await prisma.club.count(),
    competitions: await prisma.competition.count(),
  };

  console.log(JSON.stringify(counts, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
