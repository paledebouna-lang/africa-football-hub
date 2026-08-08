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
  type?: "CLUB" | "ACADEMY";
  /** English name of the parent club, for academies attached to one. */
  parentClubEn?: string;
};

type CompetitionSeed = {
  nameFr: string;
  nameEn: string;
  nameAr: string;
  type: "LEAGUE" | "CUP" | "SUPER_CUP" | "CONTINENTAL" | "INTERNATIONAL" | "YOUTH";
  /** Relative level of opposition faced, used later to weight performances. */
  strength: number;
};

type CountrySeed = {
  code: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  league: CompetitionSeed;
  cup: CompetitionSeed;
  clubs: ClubSeed[];
};

/**
 * Strength coefficients are ordinal, not absolute: they rank the level of
 * opposition a player actually faces, so a goal in a stronger league counts for
 * more. Egypt, Morocco, South Africa, Tunisia and Algeria consistently top CAF's
 * own club rankings, which is what these values reflect.
 */
const COUNTRIES: CountrySeed[] = [
  {
    code: "MAR",
    nameFr: "Maroc",
    nameEn: "Morocco",
    nameAr: "المغرب",
    league: { nameFr: "Botola Pro", nameEn: "Botola Pro", nameAr: "البطولة الاحترافية", type: "LEAGUE", strength: 0.95 },
    cup: { nameFr: "Coupe du Trône", nameEn: "Throne Cup", nameAr: "كأس العرش", type: "CUP", strength: 0.8 },
    clubs: [
      { nameFr: "Raja Club Athletic", nameEn: "Raja Club Athletic", nameAr: "الرجاء الرياضي", shortName: "Raja CA", city: "Casablanca", stadium: "Stade Mohammed V", founded: 1949 },
      { nameFr: "Wydad Athletic Club", nameEn: "Wydad Athletic Club", nameAr: "الوداد الرياضي", shortName: "Wydad AC", city: "Casablanca", stadium: "Stade Mohammed V", founded: 1937 },
      { nameFr: "AS FAR", nameEn: "AS FAR", nameAr: "الجيش الملكي", shortName: "AS FAR", city: "Rabat", stadium: "Complexe Prince Moulay Abdellah", founded: 1958 },
      { nameFr: "RS Berkane", nameEn: "RS Berkane", nameAr: "نهضة بركان", shortName: "RSB", city: "Berkane", stadium: "Stade Municipal de Berkane", founded: 1938 },
      { nameFr: "Maghreb de Fès", nameEn: "Maghreb of Fez", nameAr: "المغرب الفاسي", shortName: "MAS", city: "Fès", stadium: "Complexe Sportif de Fès", founded: 1946 },
      { nameFr: "Académie Mohammed VI de football", nameEn: "Mohammed VI Football Academy", nameAr: "أكاديمية محمد السادس لكرة القدم", shortName: "Académie Mohammed VI", city: "Salé", founded: 2009, type: "ACADEMY" },
    ],
  },
  {
    code: "EGY",
    nameFr: "Égypte",
    nameEn: "Egypt",
    nameAr: "مصر",
    league: { nameFr: "Premier League égyptienne", nameEn: "Egyptian Premier League", nameAr: "الدوري المصري الممتاز", type: "LEAGUE", strength: 1.0 },
    cup: { nameFr: "Coupe d'Égypte", nameEn: "Egypt Cup", nameAr: "كأس مصر", type: "CUP", strength: 0.85 },
    clubs: [
      { nameFr: "Al Ahly", nameEn: "Al Ahly", nameAr: "الأهلي", shortName: "Al Ahly", city: "Le Caire", stadium: "Stade international du Caire", founded: 1907 },
      { nameFr: "Zamalek", nameEn: "Zamalek", nameAr: "الزمالك", shortName: "Zamalek", city: "Le Caire", stadium: "Stade international du Caire", founded: 1911 },
      { nameFr: "Pyramids FC", nameEn: "Pyramids FC", nameAr: "بيراميدز", shortName: "Pyramids", city: "Le Caire", stadium: "Stade du 30 Juin", founded: 2008 },
      { nameFr: "Ismaily SC", nameEn: "Ismaily SC", nameAr: "الإسماعيلي", shortName: "Ismaily", city: "Ismaïlia", stadium: "Stade d'Ismailia", founded: 1924 },
      { nameFr: "Al Masry", nameEn: "Al Masry", nameAr: "المصري البورسعيدي", shortName: "Al Masry", city: "Port-Saïd", stadium: "Stade de Port-Saïd", founded: 1920 },
    ],
  },
  {
    code: "DZA",
    nameFr: "Algérie",
    nameEn: "Algeria",
    nameAr: "الجزائر",
    league: { nameFr: "Ligue 1 algérienne", nameEn: "Algerian Ligue 1", nameAr: "الرابطة المحترفة الأولى", type: "LEAGUE", strength: 0.85 },
    cup: { nameFr: "Coupe d'Algérie", nameEn: "Algerian Cup", nameAr: "كأس الجزائر", type: "CUP", strength: 0.7 },
    clubs: [
      { nameFr: "CR Belouizdad", nameEn: "CR Belouizdad", nameAr: "شباب بلوزداد", shortName: "CRB", city: "Alger", stadium: "Stade du 20-Août-1955", founded: 1962 },
      { nameFr: "JS Kabylie", nameEn: "JS Kabylie", nameAr: "شبيبة القبائل", shortName: "JSK", city: "Tizi Ouzou", stadium: "Stade Hocine-Aït-Ahmed", founded: 1946 },
      { nameFr: "MC Alger", nameEn: "MC Alger", nameAr: "مولودية الجزائر", shortName: "MCA", city: "Alger", stadium: "Stade du 5-Juillet-1962", founded: 1921 },
      { nameFr: "ES Sétif", nameEn: "ES Setif", nameAr: "وفاق سطيف", shortName: "ESS", city: "Sétif", stadium: "Stade du 8-Mai-1945", founded: 1958 },
      { nameFr: "USM Alger", nameEn: "USM Alger", nameAr: "اتحاد الجزائر", shortName: "USMA", city: "Alger", stadium: "Stade Omar-Hamadi", founded: 1937 },
    ],
  },
  {
    code: "TUN",
    nameFr: "Tunisie",
    nameEn: "Tunisia",
    nameAr: "تونس",
    league: { nameFr: "Ligue Professionnelle 1", nameEn: "Tunisian Ligue Professionnelle 1", nameAr: "الرابطة التونسية المحترفة الأولى", type: "LEAGUE", strength: 0.9 },
    cup: { nameFr: "Coupe de Tunisie", nameEn: "Tunisian Cup", nameAr: "كأس تونس", type: "CUP", strength: 0.75 },
    clubs: [
      { nameFr: "Espérance de Tunis", nameEn: "Esperance de Tunis", nameAr: "الترجي الرياضي التونسي", shortName: "EST", city: "Tunis", stadium: "Stade Hammadi-Agrebi", founded: 1919 },
      { nameFr: "Club Africain", nameEn: "Club Africain", nameAr: "النادي الأفريقي", shortName: "CA", city: "Tunis", stadium: "Stade Hammadi-Agrebi", founded: 1920 },
      { nameFr: "Étoile du Sahel", nameEn: "Etoile du Sahel", nameAr: "النجم الرياضي الساحلي", shortName: "ESS", city: "Sousse", stadium: "Stade olympique de Sousse", founded: 1925 },
      { nameFr: "CS Sfaxien", nameEn: "CS Sfaxien", nameAr: "النادي الرياضي الصفاقسي", shortName: "CSS", city: "Sfax", stadium: "Stade Taïeb-Mhiri", founded: 1928 },
      { nameFr: "Stade Tunisien", nameEn: "Stade Tunisien", nameAr: "الملعب التونسي", shortName: "ST", city: "Tunis", stadium: "Stade Chedly-Zouiten", founded: 1948 },
    ],
  },
  {
    code: "ZAF",
    nameFr: "Afrique du Sud",
    nameEn: "South Africa",
    nameAr: "جنوب أفريقيا",
    league: { nameFr: "Betway Premiership", nameEn: "Betway Premiership", nameAr: "الدوري الجنوب أفريقي الممتاز", type: "LEAGUE", strength: 0.92 },
    cup: { nameFr: "Nedbank Cup", nameEn: "Nedbank Cup", nameAr: "كأس نيدبنك", type: "CUP", strength: 0.78 },
    clubs: [
      { nameFr: "Mamelodi Sundowns", nameEn: "Mamelodi Sundowns", nameAr: "ماميلودي صنداونز", shortName: "Sundowns", city: "Pretoria", stadium: "Loftus Versfeld", founded: 1970 },
      { nameFr: "Orlando Pirates", nameEn: "Orlando Pirates", nameAr: "أورلاندو بايريتس", shortName: "Pirates", city: "Johannesbourg", stadium: "Orlando Stadium", founded: 1937 },
      { nameFr: "Kaizer Chiefs", nameEn: "Kaizer Chiefs", nameAr: "كايزر تشيفز", shortName: "Chiefs", city: "Johannesbourg", stadium: "FNB Stadium", founded: 1970 },
      { nameFr: "SuperSport United", nameEn: "SuperSport United", nameAr: "سوبرسبورت يونايتد", shortName: "SuperSport", city: "Pretoria", stadium: "Lucas Moripe Stadium", founded: 1994 },
      { nameFr: "Stellenbosch FC", nameEn: "Stellenbosch FC", nameAr: "ستيلينبوش", shortName: "Stellenbosch", city: "Stellenbosch", stadium: "Danie Craven Stadium", founded: 2016 },
    ],
  },
  {
    code: "SEN",
    nameFr: "Sénégal",
    nameEn: "Senegal",
    nameAr: "السنغال",
    league: { nameFr: "Ligue 1 sénégalaise", nameEn: "Senegal Ligue 1", nameAr: "الدوري السنغالي الممتاز", type: "LEAGUE", strength: 0.7 },
    cup: { nameFr: "Coupe du Sénégal", nameEn: "Senegal Cup", nameAr: "كأس السنغال", type: "CUP", strength: 0.58 },
    clubs: [
      { nameFr: "ASC Jaraaf", nameEn: "ASC Jaraaf", nameAr: "أ.س.ك جاراف", shortName: "Jaraaf", city: "Dakar", stadium: "Stade Iba Mar Diop", founded: 1969 },
      { nameFr: "Génération Foot", nameEn: "Generation Foot", nameAr: "جينيراسيون فوت", shortName: "GF", city: "Déni Birame Ndao", stadium: "Stade Déni Birame Ndao", founded: 2000 },
      { nameFr: "Casa Sports", nameEn: "Casa Sports", nameAr: "كازا سبورتس", shortName: "Casa", city: "Ziguinchor", stadium: "Stade Aline Sitoé Diatta", founded: 1961 },
      { nameFr: "Teungueth FC", nameEn: "Teungueth FC", nameAr: "تونغويث", shortName: "TFC", city: "Rufisque", stadium: "Stade Ngalandou Diouf", founded: 1954 },
      { nameFr: "AS Pikine", nameEn: "AS Pikine", nameAr: "أ.س بيكين", shortName: "ASP", city: "Pikine", stadium: "Stade Alassane Djigo", founded: 1962 },
      { nameFr: "Institut Diambars", nameEn: "Diambars Institute", nameAr: "معهد ديامبارس", shortName: "Diambars", city: "Saly", founded: 2000, type: "ACADEMY" },
    ],
  },
  {
    code: "CIV",
    nameFr: "Côte d'Ivoire",
    nameEn: "Ivory Coast",
    nameAr: "ساحل العاج",
    league: { nameFr: "Ligue 1 ivoirienne", nameEn: "Ivory Coast Ligue 1", nameAr: "الدوري الإيفواري الممتاز", type: "LEAGUE", strength: 0.72 },
    cup: { nameFr: "Coupe de Côte d'Ivoire", nameEn: "Ivory Coast Cup", nameAr: "كأس ساحل العاج", type: "CUP", strength: 0.6 },
    clubs: [
      { nameFr: "ASEC Mimosas", nameEn: "ASEC Mimosas", nameAr: "أسيك ميموزا", shortName: "ASEC", city: "Abidjan", stadium: "Stade Félix Houphouët-Boigny", founded: 1948 },
      { nameFr: "Africa Sports", nameEn: "Africa Sports", nameAr: "أفريكا سبورتس", shortName: "Africa", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1947 },
      { nameFr: "Stade d'Abidjan", nameEn: "Stade d'Abidjan", nameAr: "ستاد أبيدجان", shortName: "SDA", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1936 },
      { nameFr: "SOL FC", nameEn: "SOL FC", nameAr: "سول", shortName: "SOL", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1976 },
      { nameFr: "Racing Club d'Abidjan", nameEn: "Racing Club d'Abidjan", nameAr: "راسينغ أبيدجان", shortName: "RCA", city: "Abidjan", stadium: "Stade Robert Champroux", founded: 1935 },
      { nameFr: "Académie MimoSifcom", nameEn: "MimoSifcom Academy", nameAr: "أكاديمية ميموسيفكوم", shortName: "MimoSifcom", city: "Abidjan", founded: 1994, type: "ACADEMY", parentClubEn: "ASEC Mimosas" },
    ],
  },
  {
    code: "GHA",
    nameFr: "Ghana",
    nameEn: "Ghana",
    nameAr: "غانا",
    league: { nameFr: "Premier League ghanéenne", nameEn: "Ghana Premier League", nameAr: "الدوري الغاني الممتاز", type: "LEAGUE", strength: 0.68 },
    cup: { nameFr: "Coupe du Ghana", nameEn: "Ghana FA Cup", nameAr: "كأس غانا", type: "CUP", strength: 0.56 },
    clubs: [
      { nameFr: "Asante Kotoko", nameEn: "Asante Kotoko", nameAr: "أسانتي كوتوكو", shortName: "Kotoko", city: "Kumasi", stadium: "Baba Yara Stadium", founded: 1935 },
      { nameFr: "Hearts of Oak", nameEn: "Hearts of Oak", nameAr: "هارتس أوف أوك", shortName: "Hearts", city: "Accra", stadium: "Accra Sports Stadium", founded: 1911 },
      { nameFr: "Aduana Stars", nameEn: "Aduana Stars", nameAr: "أدوانا ستارز", shortName: "Aduana", city: "Dormaa Ahenkro", stadium: "Nana Agyemang Badu I Park", founded: 1985 },
      { nameFr: "Medeama SC", nameEn: "Medeama SC", nameAr: "ميدياما", shortName: "Medeama", city: "Tarkwa", stadium: "Akoon Community Park", founded: 1996 },
      { nameFr: "Bechem United", nameEn: "Bechem United", nameAr: "بيتشيم يونايتد", shortName: "Bechem", city: "Bechem", stadium: "Nana Fosu Gyeabour Park", founded: 1976 },
      { nameFr: "Right to Dream Academy", nameEn: "Right to Dream Academy", nameAr: "أكاديمية رايت تو دريم", shortName: "Right to Dream", city: "Old Akrade", founded: 1999, type: "ACADEMY" },
    ],
  },
  {
    code: "NGA",
    nameFr: "Nigeria",
    nameEn: "Nigeria",
    nameAr: "نيجيريا",
    league: { nameFr: "Nigeria Premier Football League", nameEn: "Nigeria Premier Football League", nameAr: "الدوري النيجيري الممتاز", type: "LEAGUE", strength: 0.7 },
    cup: { nameFr: "Coupe du Nigeria", nameEn: "Nigeria Federation Cup", nameAr: "كأس نيجيريا", type: "CUP", strength: 0.58 },
    clubs: [
      { nameFr: "Enyimba FC", nameEn: "Enyimba FC", nameAr: "إنييمبا", shortName: "Enyimba", city: "Aba", stadium: "Enyimba International Stadium", founded: 1976 },
      { nameFr: "Rivers United", nameEn: "Rivers United", nameAr: "ريفرز يونايتد", shortName: "Rivers", city: "Port Harcourt", stadium: "Adokiye Amiesimaka Stadium", founded: 2016 },
      { nameFr: "Rangers International", nameEn: "Rangers International", nameAr: "رينجرز إنترناشونال", shortName: "Rangers", city: "Enugu", stadium: "Nnamdi Azikiwe Stadium", founded: 1970 },
      { nameFr: "Remo Stars", nameEn: "Remo Stars", nameAr: "ريمو ستارز", shortName: "Remo", city: "Ikenne", stadium: "Remo Stars Stadium", founded: 2015 },
      { nameFr: "Plateau United", nameEn: "Plateau United", nameAr: "بلاتو يونايتد", shortName: "Plateau", city: "Jos", stadium: "Rwang Pam Stadium", founded: 1975 },
    ],
  },
];

/** Competitions that span several countries, so they belong to none. */
const CONTINENTAL: CompetitionSeed[] = [
  { nameFr: "Ligue des Champions de la CAF", nameEn: "CAF Champions League", nameAr: "دوري أبطال أفريقيا", type: "CONTINENTAL", strength: 1.3 },
  { nameFr: "Coupe de la Confédération CAF", nameEn: "CAF Confederation Cup", nameAr: "كأس الكونفدرالية الأفريقية", type: "CONTINENTAL", strength: 1.1 },
  { nameFr: "Supercoupe de la CAF", nameEn: "CAF Super Cup", nameAr: "كأس السوبر الأفريقي", type: "SUPER_CUP", strength: 1.15 },
  { nameFr: "Coupe d'Afrique des Nations", nameEn: "Africa Cup of Nations", nameAr: "كأس الأمم الأفريقية", type: "INTERNATIONAL", strength: 1.4 },
  { nameFr: "Championnat d'Afrique des Nations", nameEn: "African Nations Championship", nameAr: "بطولة أفريقيا للاعبين المحليين", type: "INTERNATIONAL", strength: 1.0 },
];

const SEASONS = [
  { label: "2024/2025", startDate: new Date("2024-07-01"), endDate: new Date("2025-06-30"), isCurrent: false },
  { label: "2025/2026", startDate: new Date("2025-07-01"), endDate: new Date("2026-06-30"), isCurrent: false },
  { label: "2026/2027", startDate: new Date("2026-07-01"), endDate: new Date("2027-06-30"), isCurrent: true },
];

async function upsertCompetition(
  competition: CompetitionSeed,
  slugSuffix: string,
  countryId: string | null,
) {
  const slug = slugify(`${competition.nameEn} ${slugSuffix}`);
  return prisma.competition.upsert({
    where: { slug },
    update: {
      nameFr: competition.nameFr,
      nameEn: competition.nameEn,
      nameAr: competition.nameAr,
      type: competition.type,
      strengthCoefficient: competition.strength,
      countryId,
    },
    create: {
      slug,
      nameFr: competition.nameFr,
      nameEn: competition.nameEn,
      nameAr: competition.nameAr,
      type: competition.type,
      strengthCoefficient: competition.strength,
      countryId,
    },
  });
}

async function main() {
  for (const season of SEASONS) {
    await prisma.season.upsert({
      where: { label: season.label },
      update: { startDate: season.startDate, endDate: season.endDate, isCurrent: season.isCurrent },
      create: season,
    });
  }

  const currentSeason = await prisma.season.findFirstOrThrow({ where: { isCurrent: true } });

  for (const continental of CONTINENTAL) {
    await upsertCompetition(continental, "caf", null);
  }

  const championsLeague = await prisma.competition.findUniqueOrThrow({
    where: { slug: slugify("CAF Champions League caf") },
  });

  let clubCount = 0;
  let academyCount = 0;
  let entryCount = 0;

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

    const league = await upsertCompetition(country.league, country.code, countryRecord.id);
    const cup = await upsertCompetition(country.cup, country.code, countryRecord.id);

    // Clubs first, academies second: an academy may point at a club created above.
    const ordered = [...country.clubs].sort((a, b) =>
      (a.type === "ACADEMY" ? 1 : 0) - (b.type === "ACADEMY" ? 1 : 0),
    );

    for (const club of ordered) {
      const clubSlug = slugify(`${club.nameEn} ${country.code}`);
      const isAcademy = club.type === "ACADEMY";

      const parentClub = club.parentClubEn
        ? await prisma.club.findUnique({
            where: { slug: slugify(`${club.parentClubEn} ${country.code}`) },
          })
        : null;

      const data = {
        nameFr: club.nameFr,
        nameEn: club.nameEn,
        nameAr: club.nameAr,
        shortName: club.shortName,
        city: club.city,
        stadium: club.stadium,
        founded: club.founded,
        type: isAcademy ? ("ACADEMY" as const) : ("CLUB" as const),
        parentClubId: parentClub?.id ?? null,
        // Academies do not compete in the senior league.
        primaryCompetitionId: isAcademy ? null : league.id,
      };

      const clubRecord = await prisma.club.upsert({
        where: { slug: clubSlug },
        update: data,
        create: { ...data, slug: clubSlug },
      });

      if (isAcademy) {
        academyCount++;
        continue;
      }
      clubCount++;

      // Every senior club enters its league and its national cup this season.
      for (const competition of [league, cup]) {
        await prisma.clubCompetition.upsert({
          where: {
            clubId_competitionId_seasonId: {
              clubId: clubRecord.id,
              competitionId: competition.id,
              seasonId: currentSeason.id,
            },
          },
          update: {},
          create: {
            clubId: clubRecord.id,
            competitionId: competition.id,
            seasonId: currentSeason.id,
          },
        });
        entryCount++;
      }
    }
  }

  // Reigning domestic champions are the usual Champions League entrants. Only the
  // clubs whose qualification is not in doubt are seeded; the rest is admin work.
  const championsLeagueEntrants = ["Al Ahly EGY", "Mamelodi Sundowns ZAF", "Esperance de Tunis TUN"];
  for (const label of championsLeagueEntrants) {
    const club = await prisma.club.findUnique({ where: { slug: slugify(label) } });
    if (!club) continue;

    await prisma.clubCompetition.upsert({
      where: {
        clubId_competitionId_seasonId: {
          clubId: club.id,
          competitionId: championsLeague.id,
          seasonId: currentSeason.id,
        },
      },
      update: {},
      create: {
        clubId: club.id,
        competitionId: championsLeague.id,
        seasonId: currentSeason.id,
      },
    });
    entryCount++;
  }

  const competitionTotal = await prisma.competition.count();

  console.log(`Seasons:      ${SEASONS.length}`);
  console.log(`Countries:    ${COUNTRIES.length}`);
  console.log(`Competitions: ${competitionTotal}`);
  console.log(`Clubs:        ${clubCount}`);
  console.log(`Academies:    ${academyCount}`);
  console.log(`Entries:      ${entryCount}`);
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
