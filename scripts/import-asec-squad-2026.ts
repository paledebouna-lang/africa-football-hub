import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Position } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Effectif professionnel de l'ASEC Mimosas, saison 2026/2027, tel que publié
 * sur https://www.asec.ci/season/team (export PDF du 29/09/2026 fourni par
 * l'administrateur). Les portraits, recadrés depuis les visuels officiels du
 * club, sont servis depuis public/players/asec/. Le PDF ne donne ni date de
 * naissance ni nationalité : ces champs restent vides.
 */
type Row = { number: number; name: string; role: string; position: Position };

const ROWS: Row[] = JSON.parse(readFileSync(join(__dirname, "data/asec-squad-2026.json"), "utf-8"));

async function main() {
  const club = await prisma.club.findFirstOrThrow({ where: { nameFr: "ASEC Mimosas" } });

  let created = 0;
  let updated = 0;
  for (const row of ROWS) {
    const slug = slugify(row.name);
    const data = {
      name: row.name,
      position: row.position,
      // The club lists wingers without a side: either flank.
      secondaryPositions: row.position === "RW" ? (["LW"] as Position[]) : [],
      shirtNumber: row.number,
      photoUrl: `/players/asec/${slug}.jpg`,
      clubId: club.id,
    };

    const existing = await prisma.player.findFirst({
      where: { OR: [{ slug }, { clubId: club.id, name: { equals: row.name, mode: "insensitive" } }] },
    });
    if (existing) {
      await prisma.player.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.player.create({ data: { ...data, slug } });
      created += 1;
    }
  }

  console.log(`--- Terminé : ${created} joueurs créés, ${updated} mis à jour ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
