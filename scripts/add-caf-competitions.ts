import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

type NewCompetition = {
  nameFr: string;
  nameEn: string;
  nameAr: string;
  type: "INTERNATIONAL" | "CONTINENTAL" | "YOUTH";
  gender: "MALE" | "FEMALE";
  ageCategory: "SENIOR" | "U23" | "U20" | "U19" | "U17";
  strengthCoefficient: number;
};

/**
 * Every CAF competition the men's senior calendar (CAN, CHAN, CAF Champions
 * League, Confederation Cup, Super Cup) already has, minus what's missing:
 * women's football and the age-restricted youth CANs plus the school
 * championship.
 */
const COMPETITIONS: NewCompetition[] = [
  {
    nameFr: "Coupe d'Afrique des Nations Féminine (WAFCON)",
    nameEn: "Women's Africa Cup of Nations (WAFCON)",
    nameAr: "كأس الأمم الأفريقية للسيدات",
    type: "INTERNATIONAL",
    gender: "FEMALE",
    ageCategory: "SENIOR",
    strengthCoefficient: 1.4,
  },
  {
    nameFr: "Ligue des Champions Féminine de la CAF",
    nameEn: "CAF Women's Champions League",
    nameAr: "دوري أبطال أفريقيا للسيدات",
    type: "CONTINENTAL",
    gender: "FEMALE",
    ageCategory: "SENIOR",
    strengthCoefficient: 1.3,
  },
  {
    nameFr: "Coupe d'Afrique des Nations U-23",
    nameEn: "Africa Cup of Nations U-23",
    nameAr: "كأس الأمم الأفريقية تحت 23 سنة",
    type: "YOUTH",
    gender: "MALE",
    ageCategory: "U23",
    strengthCoefficient: 1.05,
  },
  {
    nameFr: "Coupe d'Afrique des Nations U-20",
    nameEn: "Africa Cup of Nations U-20",
    nameAr: "كأس الأمم الأفريقية تحت 20 سنة",
    type: "YOUTH",
    gender: "MALE",
    ageCategory: "U20",
    strengthCoefficient: 0.95,
  },
  {
    nameFr: "Coupe d'Afrique des Nations U-17",
    nameEn: "Africa Cup of Nations U-17",
    nameAr: "كأس الأمم الأفريقية تحت 17 سنة",
    type: "YOUTH",
    gender: "MALE",
    ageCategory: "U17",
    strengthCoefficient: 0.8,
  },
  {
    nameFr: "Championnat d'Afrique Scolaire de Football",
    nameEn: "African School Football Championship",
    nameAr: "بطولة أفريقيا المدرسية لكرة القدم",
    type: "YOUTH",
    gender: "MALE",
    ageCategory: "U19",
    strengthCoefficient: 0.45,
  },
];

async function main() {
  let created = 0;

  for (const comp of COMPETITIONS) {
    const slug = `${slugify(comp.nameEn)}-caf`;
    const existing = await prisma.competition.findUnique({ where: { slug } });
    if (existing) {
      console.log(`Déjà présente : ${comp.nameFr}`);
      continue;
    }

    await prisma.competition.create({
      data: {
        slug,
        nameFr: comp.nameFr,
        nameEn: comp.nameEn,
        nameAr: comp.nameAr,
        type: comp.type,
        gender: comp.gender,
        ageCategory: comp.ageCategory,
        strengthCoefficient: comp.strengthCoefficient,
      },
    });
    created += 1;
    console.log(`Créée : ${comp.nameFr}`);
  }

  console.log(`--- Terminé : ${created} compétitions créées ---`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
