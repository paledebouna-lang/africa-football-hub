import type { Field } from "@/components/admin-form";

type CountryDefaults = {
  nameFr?: string;
  nameEn?: string;
  nameAr?: string;
  code?: string;
  flagUrl?: string | null;
};

export function countryFields(defaults: CountryDefaults = {}): Field[] {
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
      name: "code",
      label: "Code du pays",
      required: true,
      defaultValue: defaults.code,
      hint: "Court identifiant unique, ex. CIV, SEN, MAR (3 à 5 caractères).",
    },
    {
      kind: "url",
      name: "flagUrl",
      label: "Adresse du drapeau",
      defaultValue: defaults.flagUrl ?? "",
      hint: "Lien direct vers une image du drapeau.",
    },
  ];
}
