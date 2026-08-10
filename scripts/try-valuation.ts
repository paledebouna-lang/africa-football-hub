import { computeValuation, type ValuationInput } from "../src/lib/valuation";

const now = new Date("2026-08-08");

function birthdayFor(age: number): Date {
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
}

function contractIn(months: number): Date {
  const date = new Date(now);
  date.setMonth(date.getMonth() + months);
  return date;
}

/** A settled first-team striker, used as the reference profile for comparisons. */
const striker: Omit<ValuationInput, "now" | "community"> = {
  dateOfBirth: birthdayFor(24),
  squadLevel: "FIRST_TEAM",
  contractUntil: contractIn(30),
  competitionStrength: 1.0,
  clubFifaCategory: null,
  nationalTeam: { level: "SENIOR", caps: 12 },
  position: "ST",
  performance: {
    minutesPlayed: 2450,
    goals: 18,
    assists: 6,
    clubMatches: 30,
  },
};

const profiles: { label: string; input: Omit<ValuationInput, "now"> }[] = [
  {
    label: "Buteur 24 ans, Al Ahly, 18 buts — sans vote communautaire",
    input: { ...striker, community: null },
  },
  {
    label: "Même buteur — la communauté le voit bien plus haut (600 k, 8 votes)",
    input: { ...striker, community: { consensusUsd: 600_000, voteCount: 8 } },
  },
  {
    label: "Même buteur — la communauté le voit plus bas (150 k, 8 votes)",
    input: { ...striker, community: { consensusUsd: 150_000, voteCount: 8 } },
  },
  {
    label: "Même buteur — un seul vote très haut : ignoré (seuil de 3)",
    input: { ...striker, community: { consensusUsd: 5_000_000, voteCount: 1 } },
  },
  {
    label: "Défenseur central 26 ans, Botola, saison pleine",
    input: {
      dateOfBirth: birthdayFor(26),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(24),
      competitionStrength: 0.95,
      clubFifaCategory: null,
      nationalTeam: null,
      position: "CB",
      performance: { minutesPlayed: 2400, goals: 2, assists: 1, clubMatches: 28 },
      community: null,
    },
  },
  {
    label: "Jeune 17 ans en académie, aucune donnée",
    input: {
      dateOfBirth: birthdayFor(17),
      squadLevel: "YOUTH",
      contractUntil: null,
      competitionStrength: 0.3,
      clubFifaCategory: null,
      nationalTeam: null,
      position: null,
      performance: null,
      community: null,
    },
  },
  {
    label: "Jeune 19 ans, club Catégorie II CAF — base = coût de formation FIFA",
    input: {
      dateOfBirth: birthdayFor(19),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(18),
      competitionStrength: 0.5,
      clubFifaCategory: 2,
      nationalTeam: null,
      position: "CM",
      performance: { minutesPlayed: 1200, goals: 3, assists: 2, clubMatches: 18 },
      community: null,
    },
  },
  {
    label: "Jeune 19 ans, club Catégorie IV CAF — base = coût de formation FIFA",
    input: {
      dateOfBirth: birthdayFor(19),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(18),
      competitionStrength: 0.4,
      clubFifaCategory: 4,
      nationalTeam: null,
      position: "CM",
      performance: { minutesPlayed: 1200, goals: 3, assists: 2, clubMatches: 18 },
      community: null,
    },
  },
];

const usd = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

for (const profile of profiles) {
  const result = computeValuation({ ...profile.input, now });
  console.log(`\n${profile.label}`);
  console.log(
    `  base ${usd.format(result.baseUsd)} [${result.baseSource}]  →  valeur ${usd.format(result.valueUsd)}` +
      `  (fiabilité ${Math.round(result.confidence * 100)} %)`,
  );
  for (const criterion of result.criteria) {
    const sign = criterion.score >= 0 ? "+" : "";
    console.log(
      `    ${criterion.criterion.padEnd(13)} ${sign}${criterion.score.toFixed(2)}` +
        ` (poids ${criterion.weight}) — ${criterion.label}`,
    );
  }
}
