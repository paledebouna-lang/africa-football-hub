import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

/**
 * The 44 CAF member associations not already registered, from the FIFA
 * training-cost circular's CAF table (Tableau 2 — CAF). Codes follow
 * ISO 3166-1 alpha-3, matching the ten countries already seeded — except the
 * Central African Republic, where ISO's "CAF" would collide on screen with
 * the confederation name, so "CTA" is used instead.
 */
const COUNTRIES: { fr: string; en: string; ar: string; code: string }[] = [
  { fr: "Angola", en: "Angola", ar: "أنغولا", code: "AGO" },
  { fr: "Bénin", en: "Benin", ar: "بنن", code: "BEN" },
  { fr: "Botswana", en: "Botswana", ar: "بوتسوانا", code: "BWA" },
  { fr: "Burundi", en: "Burundi", ar: "بوروندي", code: "BDI" },
  { fr: "Cameroun", en: "Cameroon", ar: "الكاميرون", code: "CMR" },
  { fr: "Cap-Vert", en: "Cape Verde", ar: "الرأس الأخضر", code: "CPV" },
  { fr: "Comores", en: "Comoros", ar: "جزر القمر", code: "COM" },
  { fr: "Congo", en: "Congo", ar: "الكونغو", code: "COG" },
  { fr: "Djibouti", en: "Djibouti", ar: "جيبوتي", code: "DJI" },
  { fr: "Érythrée", en: "Eritrea", ar: "إريتريا", code: "ERI" },
  { fr: "Eswatini", en: "Eswatini", ar: "إسواتيني", code: "SWZ" },
  { fr: "Éthiopie", en: "Ethiopia", ar: "إثيوبيا", code: "ETH" },
  { fr: "Gabon", en: "Gabon", ar: "الغابون", code: "GAB" },
  { fr: "Gambie", en: "Gambia", ar: "غامبيا", code: "GMB" },
  { fr: "Guinée", en: "Guinea", ar: "غينيا", code: "GIN" },
  { fr: "Guinée équatoriale", en: "Equatorial Guinea", ar: "غينيا الاستوائية", code: "GNQ" },
  { fr: "Guinée-Bissau", en: "Guinea-Bissau", ar: "غينيا بيساو", code: "GNB" },
  { fr: "Kenya", en: "Kenya", ar: "كينيا", code: "KEN" },
  { fr: "Lesotho", en: "Lesotho", ar: "ليسوتو", code: "LSO" },
  { fr: "Liberia", en: "Liberia", ar: "ليبيريا", code: "LBR" },
  { fr: "Libye", en: "Libya", ar: "ليبيا", code: "LBY" },
  { fr: "Madagascar", en: "Madagascar", ar: "مدغشقر", code: "MDG" },
  { fr: "Malawi", en: "Malawi", ar: "مالاوي", code: "MWI" },
  { fr: "Mali", en: "Mali", ar: "مالي", code: "MLI" },
  { fr: "Maurice", en: "Mauritius", ar: "موريشيوس", code: "MUS" },
  { fr: "Mauritanie", en: "Mauritania", ar: "موريتانيا", code: "MRT" },
  { fr: "Mozambique", en: "Mozambique", ar: "موزمبيق", code: "MOZ" },
  { fr: "Namibie", en: "Namibia", ar: "ناميبيا", code: "NAM" },
  { fr: "Niger", en: "Niger", ar: "النيجر", code: "NER" },
  { fr: "Ouganda", en: "Uganda", ar: "أوغندا", code: "UGA" },
  { fr: "RD Congo", en: "DR Congo", ar: "جمهورية الكونغو الديمقراطية", code: "COD" },
  {
    fr: "République centrafricaine",
    en: "Central African Republic",
    ar: "جمهورية أفريقيا الوسطى",
    code: "CTA",
  },
  { fr: "Rwanda", en: "Rwanda", ar: "رواندا", code: "RWA" },
  {
    fr: "São Tomé-et-Príncipe",
    en: "Sao Tome and Principe",
    ar: "ساو تومي وبرينسيبي",
    code: "STP",
  },
  { fr: "Seychelles", en: "Seychelles", ar: "سيشل", code: "SYC" },
  { fr: "Sierra Leone", en: "Sierra Leone", ar: "سيراليون", code: "SLE" },
  { fr: "Somalie", en: "Somalia", ar: "الصومال", code: "SOM" },
  { fr: "Soudan", en: "Sudan", ar: "السودان", code: "SDN" },
  { fr: "Soudan du Sud", en: "South Sudan", ar: "جنوب السودان", code: "SSD" },
  { fr: "Tanzanie", en: "Tanzania", ar: "تنزانيا", code: "TZA" },
  { fr: "Tchad", en: "Chad", ar: "تشاد", code: "TCD" },
  { fr: "Togo", en: "Togo", ar: "توغو", code: "TGO" },
  { fr: "Zambie", en: "Zambia", ar: "زامبيا", code: "ZMB" },
  { fr: "Zimbabwe", en: "Zimbabwe", ar: "زيمبابوي", code: "ZWE" },
];

async function main() {
  const season = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (!season) throw new Error("Aucune saison courante définie.");

  const can = await prisma.competition.findUnique({
    where: { slug: "africa-cup-of-nations-caf" },
  });
  if (!can) throw new Error("La CAN est introuvable — créez-la avant ce script.");

  let created = 0;
  let entered = 0;

  for (const country of COUNTRIES) {
    const existing = await prisma.country.findUnique({ where: { code: country.code } });
    if (existing) {
      console.log(`Déjà présent : ${country.fr}`);
      continue;
    }

    const record = await prisma.country.create({
      data: {
        slug: slugify(country.en),
        nameFr: country.fr,
        nameEn: country.en,
        nameAr: country.ar,
        code: country.code,
      },
    });
    created += 1;

    await prisma.nationalTeamEntry.upsert({
      where: {
        countryId_competitionId_seasonId: {
          countryId: record.id,
          competitionId: can.id,
          seasonId: season.id,
        },
      },
      update: {},
      create: { countryId: record.id, competitionId: can.id, seasonId: season.id },
    });
    entered += 1;

    console.log(`Créé : ${country.fr} (${country.code}) — engagé en CAN ${season.label}`);
  }

  console.log(`--- Terminé : ${created} pays créés, ${entered} engagements CAN ---`);
  console.log(`Total pays en base : ${await prisma.country.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
