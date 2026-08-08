import type { Field, FieldOption } from "@/components/admin-form";

type ClubDefaults = {
  nameFr?: string;
  nameEn?: string;
  nameAr?: string;
  shortName?: string | null;
  city?: string | null;
  stadium?: string | null;
  founded?: number | null;
  logoUrl?: string | null;
  leagueId?: string;
};

export function clubFields(
  leagues: FieldOption[],
  defaults: ClubDefaults = {},
): Field[] {
  return [
    {
      kind: "text",
      name: "nameFr",
      label: "Nom (français)",
      required: true,
      defaultValue: defaults.nameFr,
    },
    {
      kind: "text",
      name: "nameEn",
      label: "Nom (anglais)",
      required: true,
      defaultValue: defaults.nameEn,
    },
    {
      kind: "text",
      name: "nameAr",
      label: "Nom (arabe)",
      required: true,
      defaultValue: defaults.nameAr,
    },
    {
      kind: "text",
      name: "shortName",
      label: "Nom court",
      defaultValue: defaults.shortName ?? "",
      hint: "Abréviation affichée dans les tableaux, ex. « Raja CA ».",
    },
    {
      kind: "select",
      name: "leagueId",
      label: "Championnat",
      required: true,
      placeholder: "Choisir un championnat",
      options: leagues,
      defaultValue: defaults.leagueId,
    },
    { kind: "text", name: "city", label: "Ville", defaultValue: defaults.city ?? "" },
    {
      kind: "text",
      name: "stadium",
      label: "Stade",
      defaultValue: defaults.stadium ?? "",
    },
    {
      kind: "number",
      name: "founded",
      label: "Année de fondation",
      defaultValue: defaults.founded ? String(defaults.founded) : "",
    },
    {
      kind: "url",
      name: "logoUrl",
      label: "Adresse du logo",
      defaultValue: defaults.logoUrl ?? "",
      hint: "Colle ici le lien direct vers une image (https://...).",
    },
  ];
}
