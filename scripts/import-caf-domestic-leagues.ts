import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

type CountryRow = {
  country: string;
  zone: string;
  d1: string | null;
  d2: string | null;
  clubs: string[];
};

const DATA: CountryRow[] = JSON.parse(
  readFileSync(join(__dirname, "data/caf-domestic-leagues.json"), "utf-8"),
);

/**
 * Provisional strength for every newly created domestic league: below the
 * continent's established top tier (0.68-1.0 in the original seed data),
 * since the source spreadsheet carries no strength signal of its own.
 * Meant to be refined per league from /admin/competitions over time.
 */
const NEW_LEAGUE_STRENGTH = 0.5;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The spreadsheet abbreviates a handful of clubs already on the site under a
 * different name (e.g. "Raja CA" vs. the registered "Raja Club Athletic").
 * Confirmed by hand so a real club is never duplicated under two names.
 */
const CLUB_ALIASES: [string, string][] = [
  ["Ismaily", "Ismaily SC"],
  ["Raja CA", "Raja Club Athletic"],
  ["Wydad AC", "Wydad Athletic Club"],
  ["MAS Fès", "Maghreb de Fès"],
  ["Enugu Rangers", "Rangers International"],
  ["Enyimba", "Enyimba FC"],
  ["Racing Club Abidjan", "Racing Club d'Abidjan"],
];
const ALIAS_MAP = new Map(CLUB_ALIASES.map(([from, to]) => [normalize(from), normalize(to)]));

async function uniqueCompetitionSlug(base: string): Promise<string> {
  let candidate = base;
  let counter = 2;
  for (;;) {
    const existing = await prisma.competition.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

async function uniqueClubSlug(base: string): Promise<string> {
  let candidate = base;
  let counter = 2;
  for (;;) {
    const existing = await prisma.club.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

async function main() {
  let leaguesCreated = 0;
  let clubsCreated = 0;

  for (const row of DATA) {
    const country = await prisma.country.findFirst({ where: { nameFr: row.country } });
    if (!country) {
      console.log(`Pays introuvable, ignoré : ${row.country}`);
      continue;
    }

    let d1 = await prisma.competition.findFirst({
      where: { countryId: country.id, type: "LEAGUE", tier: 1 },
    });

    if (!d1 && row.d1) {
      const slug = await uniqueCompetitionSlug(slugify(`${row.d1} ${country.code}`));
      d1 = await prisma.competition.create({
        data: {
          slug,
          nameFr: row.d1,
          nameEn: row.d1,
          nameAr: row.d1,
          type: "LEAGUE",
          tier: 1,
          countryId: country.id,
          strengthCoefficient: NEW_LEAGUE_STRENGTH,
        },
      });
      leaguesCreated += 1;
      console.log(`D1 créée : ${row.country} — ${row.d1}`);
    }

    if (row.d2) {
      const existingD2 = await prisma.competition.findFirst({
        where: { countryId: country.id, type: "LEAGUE", tier: 2 },
      });
      if (!existingD2) {
        const slug = await uniqueCompetitionSlug(slugify(`${row.d2} ${country.code}`));
        await prisma.competition.create({
          data: {
            slug,
            nameFr: row.d2,
            nameEn: row.d2,
            nameAr: row.d2,
            type: "LEAGUE",
            tier: 2,
            countryId: country.id,
            strengthCoefficient: (d1?.strengthCoefficient ?? NEW_LEAGUE_STRENGTH) * 0.5,
          },
        });
        leaguesCreated += 1;
        console.log(`D2 créée : ${row.country} — ${row.d2}`);
      }
    }

    if (!d1 || row.clubs.length === 0) continue;

    const existingClubs = await prisma.club.findMany({
      where: { primaryCompetition: { countryId: country.id } },
      select: { nameFr: true },
    });
    const existingNormalized = new Set(existingClubs.map((c) => normalize(c.nameFr)));

    for (const rawName of row.clubs) {
      const key = ALIAS_MAP.get(normalize(rawName)) ?? normalize(rawName);
      if (existingNormalized.has(key)) continue;

      const slug = await uniqueClubSlug(slugify(`${rawName} ${country.code}`));
      await prisma.club.create({
        data: {
          slug,
          nameFr: rawName,
          nameEn: rawName,
          nameAr: rawName,
          primaryCompetitionId: d1.id,
        },
      });
      existingNormalized.add(key);
      clubsCreated += 1;
    }
  }

  console.log(`--- Terminé : ${leaguesCreated} compétitions créées, ${clubsCreated} clubs créés ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
