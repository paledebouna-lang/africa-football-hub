import { computeValuation } from "../src/lib/valuation";

const now = new Date("2026-08-08");

function birthdayFor(age: number): Date {
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate());
}

function contractIn(months: number): Date {
  const date = new Date(now);
  date.setMonth(date.getMonth() + months);
  return date;
}

const profiles = [
  {
    label: "Espoir 19 ans, Al Ahly (1.00), titulaire, contrat 4 ans, U20",
    input: {
      dateOfBirth: birthdayFor(19),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(48),
      competitionStrength: 1.0,
      nationalTeam: { level: "U20", caps: 6 },
    },
  },
  {
    label: "Cadre 25 ans, Botola (0.95), titulaire, contrat 2 ans, 15 sél. A",
    input: {
      dateOfBirth: birthdayFor(25),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(24),
      competitionStrength: 0.95,
      nationalTeam: { level: "SENIOR", caps: 15 },
    },
  },
  {
    label: "Vétéran 33 ans, Ligue 1 SEN (0.70), titulaire, contrat 4 mois",
    input: {
      dateOfBirth: birthdayFor(33),
      squadLevel: "FIRST_TEAM",
      contractUntil: contractIn(4),
      competitionStrength: 0.7,
      nationalTeam: null,
    },
  },
  {
    label: "Jeune 17 ans, académie (0.30), équipe jeunes, aucun contrat",
    input: {
      dateOfBirth: birthdayFor(17),
      squadLevel: "YOUTH",
      contractUntil: null,
      competitionStrength: 0.3,
      nationalTeam: null,
    },
  },
  {
    label: "Réserviste 22 ans, NPFL (0.70), réserve, contrat 3 ans",
    input: {
      dateOfBirth: birthdayFor(22),
      squadLevel: "RESERVE",
      contractUntil: contractIn(36),
      competitionStrength: 0.7,
      nationalTeam: null,
    },
  },
  {
    label: "Inconnu total : aucune donnée hors club amateur (0.10)",
    input: {
      dateOfBirth: null,
      squadLevel: "FIRST_TEAM",
      contractUntil: null,
      competitionStrength: 0.1,
      nationalTeam: null,
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
