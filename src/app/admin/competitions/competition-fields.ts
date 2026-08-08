import type { Field, FieldOption } from "@/components/admin-form";

const COMPETITION_TYPES: FieldOption[] = [
  { value: "LEAGUE", label: "Championnat" },
  { value: "CUP", label: "Coupe nationale" },
  { value: "SUPER_CUP", label: "Supercoupe" },
  { value: "CONTINENTAL", label: "Compétition continentale" },
  { value: "INTERNATIONAL", label: "Compétition internationale" },
  { value: "YOUTH", label: "Compétition de jeunes" },
];

const AGE_CATEGORIES: FieldOption[] = [
  { value: "SENIOR", label: "Seniors" },
  { value: "U23", label: "Moins de 23 ans" },
  { value: "U20", label: "Moins de 20 ans" },
  { value: "U19", label: "Moins de 19 ans" },
  { value: "U17", label: "Moins de 17 ans" },
  { value: "U15", label: "Moins de 15 ans" },
];

type CompetitionDefaults = {
  nameFr?: string;
  nameEn?: string;
  nameAr?: string;
  type?: string;
  ageCategory?: string;
  tier?: number;
  logoUrl?: string | null;
  countryId?: string | null;
  strengthCoefficient?: number;
};

export function competitionFields(
  countries: FieldOption[],
  defaults: CompetitionDefaults = {},
): Field[] {
  return [
    { kind: "text", name: "nameFr", label: "Nom (français)", required: true, defaultValue: defaults.nameFr },
    { kind: "text", name: "nameEn", label: "Nom (anglais)", required: true, defaultValue: defaults.nameEn },
    { kind: "text", name: "nameAr", label: "Nom (arabe)", required: true, defaultValue: defaults.nameAr },
    {
      kind: "select",
      name: "type",
      label: "Type",
      required: true,
      placeholder: "Choisir un type",
      options: COMPETITION_TYPES,
      defaultValue: defaults.type ?? "LEAGUE",
    },
    {
      kind: "select",
      name: "countryId",
      label: "Pays",
      placeholder: "Aucun (compétition continentale)",
      options: countries,
      defaultValue: defaults.countryId ?? "",
      hint: "Laisse vide pour une compétition qui dépasse un seul pays (CAF, CAN).",
    },
    {
      kind: "select",
      name: "ageCategory",
      label: "Catégorie",
      placeholder: "Seniors",
      options: AGE_CATEGORIES,
      defaultValue: defaults.ageCategory ?? "SENIOR",
    },
    {
      kind: "number",
      name: "tier",
      label: "Division",
      defaultValue: String(defaults.tier ?? 1),
      hint: "1 pour l'élite, 2 pour la deuxième division, etc.",
    },
    {
      kind: "text",
      name: "strengthCoefficient",
      label: "Coefficient de niveau",
      defaultValue: String(defaults.strengthCoefficient ?? 1),
      hint: "Sert à pondérer les performances. 1,00 = meilleur championnat national africain ; 1,30 pour la Ligue des Champions CAF ; 0,40 pour une deuxième division.",
    },
    {
      kind: "url",
      name: "logoUrl",
      label: "Adresse du logo",
      defaultValue: defaults.logoUrl ?? "",
    },
  ];
}
