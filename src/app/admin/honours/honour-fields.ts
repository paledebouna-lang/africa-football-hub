import type { Field, FieldOption } from "@/components/admin-form";

export const HONOUR_TYPES: FieldOption[] = [
  { value: "WINNER", label: "Vainqueur" },
  { value: "RUNNER_UP", label: "Finaliste" },
  { value: "THIRD_PLACE", label: "Troisième place" },
  { value: "PROMOTION", label: "Montée" },
  { value: "INDIVIDUAL_AWARD", label: "Distinction individuelle" },
];

export function honourFields(
  clubs: FieldOption[],
  players: FieldOption[],
  coaches: FieldOption[],
  countries: FieldOption[],
  competitions: FieldOption[],
): Field[] {
  return [
    {
      kind: "select",
      name: "type",
      label: "Nature du titre",
      required: true,
      placeholder: "Vainqueur",
      options: HONOUR_TYPES,
      defaultValue: "WINNER",
    },
    {
      kind: "number",
      name: "year",
      label: "Année",
      required: true,
      defaultValue: String(new Date().getFullYear()),
    },
    {
      kind: "select",
      name: "competitionId",
      label: "Compétition",
      placeholder: "Aucune (distinction libre)",
      options: competitions,
      hint: "Si le titre correspond à une compétition enregistrée, choisis-la ici.",
    },
    {
      kind: "text",
      name: "seasonLabel",
      label: "Saison",
      hint: "Facultatif, ex. « 2024/2025 ».",
    },
    {
      kind: "text",
      name: "titleFr",
      label: "Intitulé libre (français)",
      hint: "À remplir uniquement si le titre ne correspond à aucune compétition, ex. « Ballon d'Or africain ».",
    },
    { kind: "text", name: "titleEn", label: "Intitulé libre (anglais)" },
    { kind: "text", name: "titleAr", label: "Intitulé libre (arabe)" },
    {
      kind: "select",
      name: "clubId",
      label: "Attribué à un club",
      placeholder: "Aucun",
      options: clubs,
      hint: "Ne remplis qu'un seul des quatre bénéficiaires ci-dessous.",
    },
    {
      kind: "select",
      name: "playerId",
      label: "Attribué à un joueur",
      placeholder: "Aucun",
      options: players,
    },
    {
      kind: "select",
      name: "coachId",
      label: "Attribué à un entraîneur",
      placeholder: "Aucun",
      options: coaches,
    },
    {
      kind: "select",
      name: "countryId",
      label: "Attribué à une sélection nationale",
      placeholder: "Aucune",
      options: countries,
    },
    { kind: "text", name: "note", label: "Note" },
  ];
}
