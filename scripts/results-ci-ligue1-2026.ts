import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Côte d'Ivoire Ligue 1, saison 2026/2027 — scores des matchs joués, relevés
 * dans la presse ivoirienne (AIP, L'Infodrome, Supersport CI). Les matchs ont
 * été créés par import-ci-ligue1-2026.ts ; ce script les passe en « joué » avec
 * leur score, ce qui alimente aussi le classement. Il peut être relancé sans
 * risque : ajouter les journées suivantes à RESULTS au fil de la saison.
 */
const SEASON_LABEL = "2026/2027";
const COMPETITION_SLUG = "ivory-coast-ligue-1-civ";

/** Noms tels qu'ils figurent sur le site (Club.nameFr). */
const RESULTS: { matchday: number; home: string; homeScore: number; awayScore: number; away: string }[] = [
  { matchday: 1, home: "Yamoussoukro FC", homeScore: 1, awayScore: 0, away: "ASEC Mimosas" },
  { matchday: 1, home: "Stade d'Abidjan", homeScore: 0, awayScore: 0, away: "Mouna FC" },
  { matchday: 1, home: "Olympique Football Club d'Adiaké (OFCA)", homeScore: 0, awayScore: 1, away: "SOL FC" },
  { matchday: 1, home: "Bouaké FC", homeScore: 2, awayScore: 1, away: "AFAD Djékanou" },
  { matchday: 1, home: "FC San Pédro", homeScore: 0, awayScore: 1, away: "Zoman FC" },
  { matchday: 1, home: "US Tchologo", homeScore: 0, awayScore: 0, away: "Inova Sporting Club Association (ISCA)" },
  { matchday: 1, home: "CO Korhogo", homeScore: 0, awayScore: 1, away: "ES Agboville" },
  { matchday: 1, home: "SOA (Armée)", homeScore: 2, awayScore: 1, away: "Stella Club d'Adjamé" },
];

async function main() {
  const season = await prisma.season.findUniqueOrThrow({ where: { label: SEASON_LABEL } });
  const league = await prisma.competition.findUniqueOrThrow({ where: { slug: COMPETITION_SLUG } });

  let updated = 0;
  const missing: string[] = [];
  for (const result of RESULTS) {
    const match = await prisma.match.findFirst({
      where: {
        competitionId: league.id,
        seasonId: season.id,
        matchday: result.matchday,
        homeClub: { nameFr: result.home },
        awayClub: { nameFr: result.away },
      },
    });
    if (!match) {
      missing.push(`J${result.matchday} ${result.home} - ${result.away}`);
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { status: "PLAYED", homeScore: result.homeScore, awayScore: result.awayScore },
    });
    updated += 1;
    console.log(`J${result.matchday} ${result.home} ${result.homeScore}-${result.awayScore} ${result.away}`);
  }

  for (const label of missing) console.warn(`Match introuvable : ${label}`);
  console.log(`--- Terminé : ${updated} scores enregistrés, ${missing.length} introuvables ---`);
  if (missing.length > 0) process.exitCode = 1;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
