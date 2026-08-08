import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

type ClubSeed = {
  nameFr: string;
  nameEn: string;
  nameAr: string;
  shortName?: string;
  city?: string;
  stadium?: string;
  founded?: number;
};

type LeagueSeed = {
  nameFr: string;
  nameEn: string;
  nameAr: string;
  clubs: ClubSeed[];
};

type CountrySeed = {
  code: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  league: LeagueSeed;
};

const COUNTRIES: CountrySeed[] = [
  {
    code: "MAR",
    nameFr: "Maroc",
    nameEn: "Morocco",
    nameAr: "المغرب",
    league: {
      nameFr: "Botola Pro",
      nameEn: "Botola Pro",
      nameAr: "البطولة الاحترافية",
      clubs: [
        { nameFr: "Raja Club Athletic", nameEn: "Raja Club Athletic", nameAr: "الرجاء الرياضي", shortName: "Raja CA", city: "Casablanca", stadium: "Stade Mohammed V", founded: 1949 },
        { nameFr: "Wydad Athletic Club", nameEn: "Wydad Athletic Club", nameAr: "الوداد الرياضي", shortName: "Wydad AC", city: "Casablanca", stadium: "Stade Mohammed V", founded: 1937 },
        { nameFr: "AS FAR", nameEn: "AS FAR", nameAr: "الجيش الملكي", shortName: "AS FAR", city: "Rabat", stadium: "Complexe Prince Moulay Abdellah", founded: 1958 },
        { nameFr: "RS Berkane", nameEn: "RS Berkane", nameAr: "نهضة بركان", shortName: "RSB", city: "Berkane", stadium: "Stade Municipal de Berkane", founded: 1938 },
        { nameFr: "Maghreb de Fès", nameEn: "Maghreb of Fez", nameAr: "المغرب الفاسي", shortName: "MAS", city: "Fès", stadium: "Complexe Sportif de Fès", founded: 1946 },
      ],
    },
  },
  {
    code: "EGY",
    nameFr: "Égypte",
    nameEn: "Egypt",
    nameAr: "مصر",
    league: {
      nameFr: "Premier League égyptienne",
      nameEn: "Egyptian Premier League",
      nameAr: "الدوري المصري الممتاز",
      clubs: [
        { nameFr: "Al Ahly", nameEn: "Al Ahly", nameAr: "الأهلي", shortName: "Al Ahly", city: "Le Caire", stadium: "Stade international du Caire", founded: 1907 },
        { nameFr: "Zamalek", nameEn: "Zamalek", nameAr: "الزمالك", shortName: "Zamalek", city: "Le Caire", stadium: "Stade international du Caire", founded: 1911 },
        { nameFr: "Pyramids FC", nameEn: "Pyramids FC", nameAr: "بيراميدز", shortName: "Pyramids", city: "Le Caire", stadium: "Stade du 30 Juin", founded: 2008 },
        { nameFr: "Ismaily SC", nameEn: "Ismaily SC", nameAr: "الإسماعيلي", shortName: "Ismaily", city: "Ismaïlia", stadium: "Stade d'Ismailia", founded: 1924 },
        { nameFr: "Al Masry", nameEn: "Al Masry", nameAr: "المصري البورسعيدي", shortName: "Al Masry", city: "Port-Saïd", stadium: "Stade de Port-Saïd", founded: 1920 },
      ],
    },
  },
  {
    code: "DZA",
    nameFr: "Algérie",
    nameEn: "Algeria",
    nameAr: "الجزائر",
    league: {
      nameFr: "Ligue 1 algérienne",
      nameEn: "Algerian Ligue 1",
      nameAr: "الرابطة المحترفة الأولى",
      clubs: [
        { nameFr: "CR Belouizdad", nameEn: "CR Belouizdad", nameAr: "شباب بلوزداد", shortName: "CRB", city: "Alger", stadium: "Stade du 20-Août-1955", founded: 1962 },
        { nameFr: "JS Kabylie", nameEn: "JS Kabylie", nameAr: "شبيبة القبائل", shortName: "JSK", city: "Tizi Ouzou", stadium: "Stade Hocine-Aït-Ahmed", founded: 1946 },
        { nameFr: "MC Alger", nameEn: "MC Alger", nameAr: "مولودية الجزائر", shortName: "MCA", city: "Alger", stadium: "Stade du 5-Juillet-1962", founded: 1921 },
        { nameFr: "ES Sétif", nameEn: "ES Setif", nameAr: "وفاق سطيف", shortName: "ESS", city: "Sétif", stadium: "Stade du 8-Mai-1945", founded: 1958 },
        { nameFr: "USM Alger", nameEn: "USM Alger", nameAr: "اتحاد الجزائر", shortName: "USMA", city: "Alger", stadium: "Stade Omar-Hamadi", founded: 1937 },
      ],
    },
  },
  {
    code: "TUN",
    nameFr: "Tunisie",
    nameEn: "Tunisia",
    nameAr: "تونس",
    league: {
      nameFr: "Ligue Professionnelle 1",
      nameEn: "Tunisian Ligue Professionnelle 1",
      nameAr: "الرابطة التونسية المحترفة الأولى",
      clubs: [
        { nameFr: "Espérance de Tunis", nameEn: "Esperance de Tunis", nameAr: "الترجي الرياضي التونسي", shortName: "EST", city: "Tunis", stadium: "Stade Hammadi-Agrebi", founded: 1919 },
        { nameFr: "Club Africain", nameEn: "Club Africain", nameAr: "النادي الأفريقي", shortName: "CA", city: "Tunis", stadium: "Stade Hammadi-Agrebi", founded: 1920 },
        { nameFr: "Étoile du Sahel", nameEn: "Etoile du Sahel", nameAr: "النجم الرياضي الساحلي", shortName: "ESS", city: "Sousse", stadium: "Stade olympique de Sousse", founded: 1925 },
        { nameFr: "CS Sfaxien", nameEn: "CS Sfaxien", nameAr: "النادي الرياضي الصفاقسي", shortName: "CSS", city: "Sfax", stadium: "Stade Taïeb-Mhiri", founded: 1928 },
        { nameFr: "Stade Tunisien", nameEn: "Stade Tunisien", nameAr: "الملعب التونسي", shortName: "ST", city: "Tunis", stadium: "Stade Chedly-Zouiten", founded: 1948 },
      ],
    },
  },
  {
    code: "ZAF",
    nameFr: "Afrique du Sud",
    nameEn: "South Africa",
    nameAr: "جنوب أفريقيا",
    league: {
      nameFr: "Betway Premiership",
      nameEn: "Betway Premiership",
      nameAr: "الدوري الجنوب أفريقي الممتاز",
      clubs: [
        { nameFr: "Mamelodi Sundowns", nameEn: "Mamelodi Sundowns", nameAr: "ماميلودي صنداونز", shortName: "Sundowns", city: "Pretoria", stadium: "Loftus Versfeld", founded: 1970 },
        { nameFr: "Orlando Pirates", nameEn: "Orlando Pirates", nameAr: "أورلاندو بايريتس", shortName: "Pirates", city: "Johannesbourg", stadium: "Orlando Stadium", founded: 1937 },
        { nameFr: "Kaizer Chiefs", nameEn: "Kaizer Chiefs", nameAr: "كايزر تشيفز", shortName: "Chiefs", city: "Johannesbourg", stadium: "FNB Stadium", founded: 1970 },
        { nameFr: "SuperSport United", nameEn: "SuperSport United", nameAr: "سوبرسبورت يونايتد", shortName: "SuperSport", city: "Pretoria", stadium: "Lucas Moripe Stadium", founded: 1994 },
        { nameFr: "Stellenbosch FC", nameEn: "Stellenbosch FC", nameAr: "ستيلينبوش", shortName: "Stellenbosch", city: "Stellenbosch", stadium: "Danie Craven Stadium", founded: 2016 },
      ],
    },
  },
  {
    code: "SEN",
    nameFr: "Sénégal",
    nameEn: "Senegal",
    nameAr: "السنغال",
    league: {
      nameFr: "Ligue 1 sénégalaise",
      nameEn: "Senegal Ligue 1",
      nameAr: "الدوري السنغالي الممتاز",
      clubs: [
        { nameFr: "ASC Jaraaf", nameEn: "ASC Jaraaf", nameAr: "أ.س.ك جاراف", shortName: "Jaraaf", city: "Dakar", stadium: "Stade Iba Mar Diop", founded: 1969 },
        { nameFr: "Génération Foot", nameEn: "Generation Foot", nameAr: "جينيراسيون فوت", shortName: "GF", city: "Déni Birame Ndao", stadium: "Stade Déni Birame Ndao", founded: 2000 },
        { nameFr: "Casa Sports", nameEn: "Casa Sports", nameAr: "كازا سبورتس", shortName: "Casa", city: "Ziguinchor", stadium: "Stade Aline Sitoé Diatta", founded: 1961 },
        { nameFr: "Teungueth FC", nameEn: "Teungueth FC", nameAr: "تونغويث", shortName: "TFC", city: "Rufisque", stadium: "Stade Ngalandou Diouf", founded: 1954 },
        { nameFr: "AS Pikine", nameEn: "AS Pikine", nameAr: "أ.س بيكين", shortName: "ASP", city: "Pikine", stadium: "Stade Alassane Djigo", founded: 1962 },
      ],
    },
  },
  {
    code: "CIV",
    nameFr: "Côte d'Ivoire",
    nameEn: "Ivory Coast",
    nameAr: "ساحل العاج",
    league: {
      nameFr: "Ligue 1 ivoirienne",
      nameEn: "Ivory Coast Ligue 1",
      nameAr: "الدوري الإيفواري الممتاز",
      clubs: [
        { nameFr: "ASEC Mimosas", nameEn: "ASEC Mimosas", nameAr: "أسيك ميموزا", shortName: "ASEC", city: "Abidjan", stadium: "Stade Félix Houphouët-Boigny", founded: 1948 },
        { nameFr: "Africa Sports", nameEn: "Africa Sports", nameAr: "أفريكا سبورتس", shortName: "Africa", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1947 },
        { nameFr: "Stade d'Abidjan", nameEn: "Stade d'Abidjan", nameAr: "ستاد أبيدجان", shortName: "SDA", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1936 },
        { nameFr: "SOL FC", nameEn: "SOL FC", nameAr: "سول", shortName: "SOL", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1976 },
        { nameFr: "Racing Club d'Abidjan", nameEn: "Racing Club d'Abidjan", nameAr: "راسينغ أبيدجان", shortName: "RCA", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1935 },
      ],
    },
  },
  {
    code: "GHA",
    nameFr: "Ghana",
    nameEn: "Ghana",
    nameAr: "غانا",
    league: {
      nameFr: "Premier League ghanéenne",
      nameEn: "Ghana Premier League",
      nameAr: "الدوري الغاني الممتاز",
      clubs: [
        { nameFr: "Asante Kotoko", nameEn: "Asante Kotoko", nameAr: "أسانتي كوتوكو", shortName: "Kotoko", city: "Kumasi", stadium: "Baba Yara Stadium", founded: 1935 },
        { nameFr: "Hearts of Oak", nameEn: "Hearts of Oak", nameAr: "هارتس أوف أوك", shortName: "Hearts", city: "Accra", stadium: "Accra Sports Stadium", founded: 1911 },
        { nameFr: "Aduana Stars", nameEn: "Aduana Stars", nameAr: "أدوانا ستارز", shortName: "Aduana", city: "Dormaa Ahenkro", stadium: "Nana Agyemang Badu I Park", founded: 1985 },
        { nameFr: "Medeama SC", nameEn: "Medeama SC", nameAr: "ميدياما", shortName: "Medeama", city: "Tarkwa", stadium: "Akoon Community Park", founded: 1996 },
        { nameFr: "Bechem United", nameEn: "Bechem United", nameAr: "بيتشيم يونايتد", shortName: "Bechem", city: "Bechem", stadium: "Nana Fosu Gyeabour Park", founded: 1976 },
      ],
    },
  },
  {
    code: "NGA",
    nameFr: "Nigeria",
    nameEn: "Nigeria",
    nameAr: "نيجيريا",
    league: {
      nameFr: "Nigeria Premier Football League",
      nameEn: "Nigeria Premier Football League",
      nameAr: "الدوري النيجيري الممتاز",
      clubs: [
        { nameFr: "Enyimba FC", nameEn: "Enyimba FC", nameAr: "إنييمبا", shortName: "Enyimba", city: "Aba", stadium: "Enyimba International Stadium", founded: 1976 },
        { nameFr: "Rivers United", nameEn: "Rivers United", nameAr: "ريفرز يونايتد", shortName: "Rivers", city: "Port Harcourt", stadium: "Adokiye Amiesimaka Stadium", founded: 2016 },
        { nameFr: "Rangers International", nameEn: "Rangers International", nameAr: "رينجرز إنترناشونال", shortName: "Rangers", city: "Enugu", stadium: "Nnamdi Azikiwe Stadium", founded: 1970 },
        { nameFr: "Remo Stars", nameEn: "Remo Stars", nameAr: "ريمو ستارز", shortName: "Remo", city: "Ikenne", stadium: "Remo Stars Stadium", founded: 2015 },
        { nameFr: "Plateau United", nameEn: "Plateau United", nameAr: "بلاتو يونايتد", shortName: "Plateau", city: "Jos", stadium: "Rwang Pam Stadium", founded: 1975 },
      ],
    },
  },
];

const SEASONS = [
  { label: "2024/2025", startDate: new Date("2024-07-01"), endDate: new Date("2025-06-30"), isCurrent: false },
  { label: "2025/2026", startDate: new Date("2025-07-01"), endDate: new Date("2026-06-30"), isCurrent: false },
  { label: "2026/2027", startDate: new Date("2026-07-01"), endDate: new Date("2027-06-30"), isCurrent: true },
];

async function main() {
  for (const season of SEASONS) {
    await prisma.season.upsert({
      where: { label: season.label },
      update: { startDate: season.startDate, endDate: season.endDate, isCurrent: season.isCurrent },
      create: season,
    });
  }
  console.log(`Seasons: ${SEASONS.length}`);

  let leagueCount = 0;
  let clubCount = 0;

  for (const country of COUNTRIES) {
    const countryRecord = await prisma.country.upsert({
      where: { code: country.code },
      update: { nameFr: country.nameFr, nameEn: country.nameEn, nameAr: country.nameAr },
      create: {
        code: country.code,
        slug: slugify(country.nameEn),
        nameFr: country.nameFr,
        nameEn: country.nameEn,
        nameAr: country.nameAr,
      },
    });

    const leagueSlug = slugify(`${country.league.nameEn} ${country.code}`);
    const leagueRecord = await prisma.league.upsert({
      where: { slug: leagueSlug },
      update: {
        nameFr: country.league.nameFr,
        nameEn: country.league.nameEn,
        nameAr: country.league.nameAr,
        countryId: countryRecord.id,
      },
      create: {
        slug: leagueSlug,
        nameFr: country.league.nameFr,
        nameEn: country.league.nameEn,
        nameAr: country.league.nameAr,
        tier: 1,
        countryId: countryRecord.id,
      },
    });
    leagueCount++;

    for (const club of country.league.clubs) {
      const clubSlug = slugify(`${club.nameEn} ${country.code}`);
      await prisma.club.upsert({
        where: { slug: clubSlug },
        update: {
          nameFr: club.nameFr,
          nameEn: club.nameEn,
          nameAr: club.nameAr,
          shortName: club.shortName,
          city: club.city,
          stadium: club.stadium,
          founded: club.founded,
          leagueId: leagueRecord.id,
        },
        create: {
          slug: clubSlug,
          nameFr: club.nameFr,
          nameEn: club.nameEn,
          nameAr: club.nameAr,
          shortName: club.shortName,
          city: club.city,
          stadium: club.stadium,
          founded: club.founded,
          leagueId: leagueRecord.id,
        },
      });
      clubCount++;
    }
  }

  console.log(`Countries: ${COUNTRIES.length}`);
  console.log(`Leagues: ${leagueCount}`);
  console.log(`Clubs: ${clubCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
