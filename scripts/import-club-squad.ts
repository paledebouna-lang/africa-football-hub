import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Position } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Importe l'effectif officiel d'un club depuis un fichier de
 * scripts/data/squads/ (liste publiée par le club lui-même), avec les
 * portraits servis depuis public/players/<photoFolder>/<slug>.jpg.
 *
 *   npx tsx scripts/import-club-squad.ts scripts/data/squads/asec-mimosas-2026.json
 *
 * Crée les joueurs absents et met à jour ceux déjà présents (même slug, ou
 * même nom dans le club). Taille et date de naissance sont reprises quand
 * la liste les donne ; la nationalité reste vide. Un effectif ainsi saisi n'est plus
 * complété par API-Football, qui se contente d'y relier ses joueurs.
 */
type Squad = {
  club: string;
  photoFolder: string;
  source: string;
  players: {
    number: number;
    name: string;
    role: string | null;
    position: Position | null;
    heightCm?: number;
    /** ISO date, e.g. "2005-10-07". */
    dateOfBirth?: string;
  }[];
};

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage : npx tsx scripts/import-club-squad.ts <fichier.json>");
  const squad: Squad = JSON.parse(readFileSync(file, "utf-8"));
  const club = await prisma.club.findFirstOrThrow({ where: { nameFr: squad.club } });

  let created = 0;
  let updated = 0;
  for (const row of squad.players) {
    const slug = slugify(row.name);
    const data = {
      name: row.name,
      position: row.position,
      // Clubs list wingers without a side: either flank.
      secondaryPositions: row.position === "RW" ? (["LW"] as Position[]) : [],
      shirtNumber: row.number,
      heightCm: row.heightCm ?? null,
      dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
      photoUrl: `/players/${squad.photoFolder}/${slug}.jpg`,
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

  console.log(`--- ${squad.club} : ${created} joueurs créés, ${updated} mis à jour ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
