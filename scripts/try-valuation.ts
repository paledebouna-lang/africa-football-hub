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

const profiles: { label: string; input: Omit<ValuationInput, "now"> }[] = [
  {
    label: "Buteur 24 ans, Al Ahly (1.00), 28 matchs, 18 buts 6 passes",
    input: {
      dateOfBirth: birthdayFor(24),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(30),
      competitionStrength: 1.0,
      nationalTeam: { level: "SENIOR", caps: 12 },
      position: "ST",
      performance: {
        minutesPlayed: 2450,
        goals: 18,
        assists: 6,
        clubMatches: 30,
      },
    },
  },
  {
    label: "Même buteur, mais saison blanche (aucune statistique)",
    input: {
      dateOfBirth: birthdayFor(24),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(30),
      competitionStrength: 1.0,
      nationalTeam: { level: "SENIOR", caps: 12 },
      position: "ST",
      performance: null,
    },
  },
  {
    label: "Défenseur central 26 ans, Botola (0.95), 27 matchs, 2 buts",
    input: {
      dateOfBirth: birthdayFor(26),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(24),
      competitionStrength: 0.95,
      nationalTeam: null,
      position: "CB",
      performance: {
        minutesPlayed: 2400,
        goals: 2,
        assists: 1,
        clubMatches: 28,
      },
    },
  },
  {
    label: "Remplaçant 21 ans, NPFL (0.70), 400 min, 3 buts",
    input: {
      dateOfBirth: birthdayFor(21),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(36),
      competitionStrength: 0.7,
      nationalTeam: null,
      position: "LW",
      performance: {
        minutesPlayed: 400,
        goals: 3,
        assists: 2,
        clubMatches: 26,
      },
    },
  },
  {
    label: "Jeune 17 ans en académie (0.30), équipe jeunes, aucune donnée",
    input: {
      dateOfBirth: birthdayFor(17),
      squadLevel: "YOUTH",
      contractUntil: null,
      competitionStrength: 0.3,
      nationalTeam: null,
      position: null,
      performance: null,
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
    `  base ${usd.format(result.baseUsd)}  →  valeur ${usd.format(result.valueUsd)}` +
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
