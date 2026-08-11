import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Maps this project's Country.code (ISO 3166-1 alpha-3, chosen to match the
 * ten countries seeded originally) to the alpha-2 code flagcdn.com expects.
 * flagcdn.com is a free, no-attribution flag CDN built for hotlinking.
 */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  ZAF: "za",
  DZA: "dz",
  BFA: "bf",
  CIV: "ci",
  EGY: "eg",
  GHA: "gh",
  MAR: "ma",
  NGA: "ng",
  SEN: "sn",
  TUN: "tn",
  AGO: "ao",
  BEN: "bj",
  BWA: "bw",
  BDI: "bi",
  CMR: "cm",
  CPV: "cv",
  COM: "km",
  COG: "cg",
  DJI: "dj",
  ERI: "er",
  SWZ: "sz",
  ETH: "et",
  GAB: "ga",
  GMB: "gm",
  GIN: "gn",
  GNQ: "gq",
  GNB: "gw",
  KEN: "ke",
  LSO: "ls",
  LBR: "lr",
  LBY: "ly",
  MDG: "mg",
  MWI: "mw",
  MLI: "ml",
  MUS: "mu",
  MRT: "mr",
  MOZ: "mz",
  NAM: "na",
  NER: "ne",
  UGA: "ug",
  COD: "cd",
  CTA: "cf",
  RWA: "rw",
  STP: "st",
  SYC: "sc",
  SLE: "sl",
  SOM: "so",
  SDN: "sd",
  SSD: "ss",
  TZA: "tz",
  TCD: "td",
  TGO: "tg",
  ZMB: "zm",
  ZWE: "zw",
};

async function main() {
  const countries = await prisma.country.findMany({ orderBy: { nameFr: "asc" } });

  let updated = 0;
  let skipped = 0;

  for (const country of countries) {
    const alpha2 = ALPHA3_TO_ALPHA2[country.code];
    if (!alpha2) {
      console.log(`Pas de correspondance pour ${country.nameFr} (${country.code})`);
      skipped += 1;
      continue;
    }

    const flagUrl = `https://flagcdn.com/${alpha2}.svg`;
    if (country.flagUrl === flagUrl) {
      skipped += 1;
      continue;
    }

    await prisma.country.update({ where: { id: country.id }, data: { flagUrl } });
    updated += 1;
    console.log(`Drapeau mis à jour : ${country.nameFr} (${country.code}) → ${flagUrl}`);
  }

  console.log(`--- Terminé : ${updated} drapeaux mis à jour, ${skipped} déjà à jour/ignorés ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
