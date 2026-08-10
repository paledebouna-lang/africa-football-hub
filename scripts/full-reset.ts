import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Full reset before real data entry begins: every player (and everything
 * that hangs off one — stats, values, transfers, videos, selections,
 * honours, appearances), every organisation/claim, and every Supabase Auth
 * login account created while testing. Clubs, competitions, countries and
 * seasons are left in place — they were not part of the request.
 */
async function main() {
  console.log("--- avant ---");
  console.log(`Joueurs       : ${await prisma.player.count()}`);
  console.log(`Organisations : ${await prisma.organisation.count()}`);
  console.log(`Profils       : ${await prisma.userProfile.count()}`);

  const players = await prisma.player.deleteMany({});
  const organisations = await prisma.organisation.deleteMany({});

  let authDeleted = 0;
  const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;
  for (const user of usersPage.users) {
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (delError) throw delError;
    authDeleted += 1;
  }

  const profiles = await prisma.userProfile.deleteMany({});

  console.log("--- supprimé ---");
  console.log(`Joueurs supprimés               : ${players.count}`);
  console.log(`Organisations supprimées        : ${organisations.count}`);
  console.log(`Comptes Supabase Auth supprimés : ${authDeleted}`);
  console.log(`Profils supprimés               : ${profiles.count}`);

  console.log("--- restant ---");
  console.log(`Joueurs       : ${await prisma.player.count()}`);
  console.log(`Organisations : ${await prisma.organisation.count()}`);
  console.log(`Profils       : ${await prisma.userProfile.count()}`);
  console.log(`Clubs         : ${await prisma.club.count()}`);
  console.log(`Compétitions  : ${await prisma.competition.count()}`);
  console.log(`Pays          : ${await prisma.country.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
