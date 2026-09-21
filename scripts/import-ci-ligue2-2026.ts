import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Côte d'Ivoire Ligue 2, saison 2026/2027 : poules A et B, telles que
 * communiquées par l'administrateur.
 */
const SEASON_LABEL = "2026/2027";

const GROUPS: Record<"A" | "B", string[]> = {
  A: [
    "FC OSA",
    "AS Athletic d'Adjamé",
    "Leader Foot Académie",
    "AS Denguélé",
    "Africa Sport d'Abidjan",
    "Sporting Club de Gagnoa",
    "AS Tanda",
    "AS Divo",
    "CO Bouaflé",
    "Leader Sporting Club de Marcory",
    "JAC d'Angré",
    "Lanfiara Sport",
    "Sirocco FC",
    "Don Koff FC",
  ],
  B: [
    "Racing Club d'Abidjan",
    "JAC de Zuénoula",
    "Siguilolo FC",
    "ES Bingerville",
    "Séwé Sport San Pedro",
    "Williamsville AC",
    "Issia Wazy",
    "Lys Sassandra FC",
    "Agir FC de Guibéroua",
    "Atlantis FC Dimbokro",
    "Deux Plateaux FC",
    "Espérance Sportive Issia",
    "RFC Aboisso",
    "Nour FC",
  ],
};

/** Noms de la liste -> nom du club déjà enregistré sur le site. */
const EXISTING: Record<string, string> = {
  "FC OSA": "FC OSA (Olympique Sport d'Abobo)",
  "Africa Sport d'Abidjan": "Africa Sports",
  "Sporting Club de Gagnoa": "Sporting Club Gagnoa",
  "Leader Sporting Club de Marcory": "LEADER SC MARCORY",
};

async function findOrCreateClub(listName: string, competitionId: string) {
  const siteName = EXISTING[listName] ?? listName;
  const existing = await prisma.club.findFirst({
    where: { nameFr: { equals: siteName, mode: "insensitive" } },
  });
  if (existing) return existing;

  const base = slugify(`${siteName} CIV`);
  let slug = base;
  for (let n = 2; await prisma.club.findUnique({ where: { slug } }); n += 1) slug = `${base}-${n}`;

  console.log(`Club créé : ${siteName}`);
  return prisma.club.create({
    data: { slug, nameFr: siteName, nameEn: siteName, nameAr: siteName, primaryCompetitionId: competitionId },
  });
}

async function main() {
  const season = await prisma.season.findUniqueOrThrow({ where: { label: SEASON_LABEL } });
  const ligue2 = await prisma.competition.findFirstOrThrow({
    where: { country: { code: "CIV" }, type: "LEAGUE", tier: 2 },
  });

  for (const [group, names] of Object.entries(GROUPS)) {
    for (const listName of names) {
      const club = await findOrCreateClub(listName, ligue2.id);
      await prisma.club.update({ where: { id: club.id }, data: { primaryCompetitionId: ligue2.id } });
      await prisma.clubCompetition.upsert({
        where: {
          clubId_competitionId_seasonId: { clubId: club.id, competitionId: ligue2.id, seasonId: season.id },
        },
        update: { group },
        create: { clubId: club.id, competitionId: ligue2.id, seasonId: season.id, group },
      });
    }
  }

  const total = await prisma.clubCompetition.count({
    where: { competitionId: ligue2.id, seasonId: season.id },
  });
  console.log(`--- Terminé : ${total} équipes engagées en Ligue 2 ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
