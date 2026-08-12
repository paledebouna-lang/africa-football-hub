import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * TheSportsDB's free public test key. Rate-limited but usable for a one-off
 * bulk pass — DELAY_MS below keeps us well under its documented free-tier
 * ceiling.
 */
const API_KEY = "3";
const DELAY_MS = 1200;

/**
 * Country-name spellings TheSportsDB uses that differ from this project's
 * Country.nameEn, keyed by the DB's nameEn. Substring matching alone would
 * risk "Congo" wrongly matching "DR Congo", so this stays an explicit list.
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  "DR Congo": ["dr congo", "congo dr", "democratic republic of the congo", "congo-kinshasa"],
  Congo: ["congo", "republic of the congo", "congo-brazzaville"],
  "Ivory Coast": ["ivory coast", "cote d ivoire", "côte d'ivoire"],
  "Cape Verde": ["cape verde", "cabo verde"],
  Eswatini: ["eswatini", "swaziland"],
  "Sao Tome and Principe": ["sao tome and principe", "sao tome"],
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function acceptableCountryStrings(countryNameEn: string): string[] {
  return COUNTRY_ALIASES[countryNameEn] ?? [normalize(countryNameEn)];
}

/** Strips the generic suffixes/prefixes that make an exact-name search fail. */
function simplifiedName(name: string): string {
  return name
    .replace(/\s*\([^()]*\)\s*/g, " ")
    .replace(/\b(FC|SC|AC|AS|CS|US|RC|CD|UD)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type TsdbTeam = { strTeam: string; strCountry: string | null; strBadge: string | null };

async function searchTeams(query: string): Promise<TsdbTeam[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { teams: TsdbTeam[] | null };
  return data.teams ?? [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Only accepts a candidate when the country matches AND the club name is a
 * close match once normalized — a single wrong crest (e.g. a same-named
 * club from another continent) is worse than leaving the slot empty.
 */
function bestMatch(
  candidates: TsdbTeam[],
  clubName: string,
  countryNameEn: string,
): TsdbTeam | null {
  const acceptableCountries = acceptableCountryStrings(countryNameEn);
  const normalizedClub = normalize(clubName);

  const inCountry = candidates.filter(
    (t) => t.strCountry && acceptableCountries.includes(normalize(t.strCountry)),
  );
  if (inCountry.length === 0) return null;

  for (const team of inCountry) {
    if (!team.strBadge) continue;
    const normalizedTeam = normalize(team.strTeam);
    const isClose =
      normalizedTeam === normalizedClub ||
      normalizedTeam.includes(normalizedClub) ||
      normalizedClub.includes(normalizedTeam);
    if (isClose && Math.min(normalizedTeam.length, normalizedClub.length) >= 4) {
      return team;
    }
  }
  return null;
}

async function main() {
  const clubs = await prisma.club.findMany({
    where: { logoUrl: null },
    select: {
      id: true,
      nameFr: true,
      primaryCompetition: { select: { country: { select: { nameEn: true } } } },
    },
    orderBy: { nameFr: "asc" },
    take: process.argv[2] ? Number(process.argv[2]) : undefined,
  });

  let found = 0;
  let checked = 0;

  for (const club of clubs) {
    checked += 1;
    const countryNameEn = club.primaryCompetition?.country?.nameEn;
    if (!countryNameEn) continue;

    let candidates = await searchTeams(club.nameFr);
    await sleep(DELAY_MS);

    let match = bestMatch(candidates, club.nameFr, countryNameEn);

    if (!match) {
      const simplified = simplifiedName(club.nameFr);
      if (simplified && simplified !== club.nameFr) {
        candidates = await searchTeams(simplified);
        await sleep(DELAY_MS);
        match = bestMatch(candidates, club.nameFr, countryNameEn);
      }
    }

    if (match?.strBadge) {
      await prisma.club.update({ where: { id: club.id }, data: { logoUrl: match.strBadge } });
      found += 1;
      console.log(`Trouvé (${checked}/${clubs.length}) : ${club.nameFr} -> ${match.strTeam}`);
    }
  }

  console.log(`--- Terminé : ${found}/${checked} écussons trouvés ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
