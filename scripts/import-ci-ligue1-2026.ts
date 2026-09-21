import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Côte d'Ivoire Ligue 1, saison 2026/2027 — engagés et calendrier tels que
 * publiés sur la page Calendrier de Flashscore (seule la journée 1 était
 * annoncée à la date de l'import). Les heures affichées sont en GMT, soit
 * l'heure d'Abidjan.
 */
const SEASON_LABEL = "2026/2027";
const COMPETITION_SLUG = "ivory-coast-ligue-1-civ";

/** Nom Flashscore -> nom du club sur le site ; les absents sont créés. */
const CLUB_NAMES: Record<string, string> = {
  "ASEC Mimosas": "ASEC Mimosas",
  "Stade d'Abidjan": "Stade d'Abidjan",
  Mouna: "Mouna FC",
  SOL: "SOL FC",
  "Academie de FAD": "AFAD Djékanou",
  Zoman: "Zoman FC",
  Agboville: "ES Agboville",
  "SO Armee": "SOA (Armée)",
  "Stella Adjame": "Stella Club d'Adjamé",
  Tchologo: "US Tchologo",
  Korhogo: "CO Korhogo",
  Bouake: "Bouaké FC",
  "San Pedro": "FC San Pédro",
  Yamoussoukro: "Yamoussoukro FC",
  Adiake: "Olympique Football Club d'Adiaké (OFCA)",
  ISCA: "Inova Sporting Club Association (ISCA)",
};

const NEW_CLUB_CITIES: Record<string, string> = {
  Yamoussoukro: "Yamoussoukro",
  Adiake: "Adiaké",
};

const MATCHES: { matchday: number; kickoff: string; home: string; away: string }[] = [
  { matchday: 1, kickoff: "2026-09-26T15:30:00Z", home: "Yamoussoukro", away: "ASEC Mimosas" },
  { matchday: 1, kickoff: "2026-09-26T18:00:00Z", home: "Stade d'Abidjan", away: "Mouna" },
  { matchday: 1, kickoff: "2026-09-27T15:30:00Z", home: "Adiake", away: "SOL" },
  { matchday: 1, kickoff: "2026-09-27T15:30:00Z", home: "Bouake", away: "Academie de FAD" },
  { matchday: 1, kickoff: "2026-09-27T15:30:00Z", home: "San Pedro", away: "Zoman" },
  { matchday: 1, kickoff: "2026-09-27T15:30:00Z", home: "Tchologo", away: "ISCA" },
  { matchday: 1, kickoff: "2026-09-27T18:00:00Z", home: "Korhogo", away: "Agboville" },
  { matchday: 1, kickoff: "2026-09-27T18:00:00Z", home: "SO Armee", away: "Stella Adjame" },
];

async function clubFor(flashName: string, competitionId: string) {
  const siteName = CLUB_NAMES[flashName];
  const existing = await prisma.club.findFirst({
    where: { nameFr: siteName, primaryCompetition: { country: { code: "CIV" } } },
  });
  if (existing) return existing;

  const base = slugify(`${siteName} CIV`);
  let slug = base;
  for (let n = 2; await prisma.club.findUnique({ where: { slug } }); n += 1) slug = `${base}-${n}`;

  console.log(`Club créé : ${siteName}`);
  return prisma.club.create({
    data: {
      slug,
      nameFr: siteName,
      nameEn: siteName,
      nameAr: siteName,
      city: NEW_CLUB_CITIES[flashName] ?? null,
      primaryCompetitionId: competitionId,
    },
  });
}

async function main() {
  const season = await prisma.season.findUniqueOrThrow({ where: { label: SEASON_LABEL } });
  const league = await prisma.competition.findUniqueOrThrow({ where: { slug: COMPETITION_SLUG } });
  const ligue2 = await prisma.competition.findFirst({
    where: { country: { code: "CIV" }, type: "LEAGUE", tier: 2 },
  });

  const engaged = [];
  for (const flashName of Object.keys(CLUB_NAMES)) engaged.push(await clubFor(flashName, league.id));
  const engagedIds = new Set(engaged.map((club) => club.id));

  // Clubs of the previous list that are not in this season's Ligue 1 leave it.
  const previous = await prisma.club.findMany({
    where: { primaryCompetitionId: league.id, id: { notIn: [...engagedIds] } },
  });
  for (const club of previous) {
    await prisma.clubCompetition.deleteMany({
      where: { clubId: club.id, competitionId: league.id, seasonId: season.id },
    });
    if (ligue2) {
      await prisma.club.update({ where: { id: club.id }, data: { primaryCompetitionId: ligue2.id } });
    }
    console.log(`Sorti de la Ligue 1 : ${club.nameFr}`);
  }

  for (const club of engaged) {
    await prisma.club.update({ where: { id: club.id }, data: { primaryCompetitionId: league.id } });
    await prisma.clubCompetition.upsert({
      where: {
        clubId_competitionId_seasonId: { clubId: club.id, competitionId: league.id, seasonId: season.id },
      },
      update: {},
      create: { clubId: club.id, competitionId: league.id, seasonId: season.id },
    });
  }

  let created = 0;
  for (const match of MATCHES) {
    const home = engaged.find((club) => club.nameFr === CLUB_NAMES[match.home])!;
    const away = engaged.find((club) => club.nameFr === CLUB_NAMES[match.away])!;
    const exists = await prisma.match.findFirst({
      where: { competitionId: league.id, seasonId: season.id, homeClubId: home.id, awayClubId: away.id },
    });
    if (exists) continue;

    await prisma.match.create({
      data: {
        competitionId: league.id,
        seasonId: season.id,
        homeClubId: home.id,
        awayClubId: away.id,
        date: new Date(match.kickoff),
        status: "SCHEDULED",
        matchday: match.matchday,
      },
    });
    created += 1;
  }

  console.log(`--- Terminé : ${engaged.length} équipes engagées, ${created} matchs créés ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
