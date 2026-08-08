import type { Field, FieldOption } from "@/components/admin-form";

export const COACH_ROLES: FieldOption[] = [
  { value: "HEAD_COACH", label: "Entraîneur principal" },
  { value: "ASSISTANT", label: "Entraîneur adjoint" },
  { value: "GOALKEEPING", label: "Entraîneur des gardiens" },
  { value: "FITNESS", label: "Préparateur physique" },
  { value: "ANALYST", label: "Analyste vidéo" },
  { value: "ACADEMY_DIRECTOR", label: "Directeur du centre de formation" },
  { value: "SCOUT", label: "Recruteur" },
];

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

type CoachDefaults = {
  name?: string;
  nameAr?: string | null;
  dateOfBirth?: Date | null;
  photoUrl?: string | null;
  licence?: string | null;
  nationalityId?: string | null;
};

export function coachFields(
  countries: FieldOption[],
  defaults: CoachDefaults = {},
): Field[] {
  return [
    { kind: "text", name: "name", label: "Nom complet", required: true, defaultValue: defaults.name },
    {
      kind: "text",
      name: "nameAr",
      label: "Nom en arabe",
      defaultValue: defaults.nameAr ?? "",
      hint: "Facultatif — utilisé sur la version arabe du site.",
    },
    {
      kind: "select",
      name: "nationalityId",
      label: "Nationalité",
      placeholder: "Non renseignée",
      options: countries,
      defaultValue: defaults.nationalityId ?? "",
    },
    {
      kind: "date",
      name: "dateOfBirth",
      label: "Date de naissance",
      defaultValue: toDateInput(defaults.dateOfBirth),
    },
    {
      kind: "text",
      name: "licence",
      label: "Licence",
      defaultValue: defaults.licence ?? "",
      hint: "Ex. « CAF A », « UEFA Pro ».",
    },
    {
      kind: "url",
      name: "photoUrl",
      label: "Adresse de la photo",
      defaultValue: defaults.photoUrl ?? "",
    },
  ];
}

export function coachSpellFields(
  coachId: string,
  clubs: FieldOption[],
): Field[] {
  return [
    {
      kind: "select",
      name: "clubId",
      label: "Club",
      required: true,
      placeholder: "Choisir un club",
      options: clubs,
    },
    {
      kind: "select",
      name: "role",
      label: "Fonction",
      required: true,
      placeholder: "Entraîneur principal",
      options: COACH_ROLES,
      defaultValue: "HEAD_COACH",
    },
    { kind: "date", name: "startDate", label: "Date de début", required: true },
    {
      kind: "date",
      name: "endDate",
      label: "Date de fin",
      hint: "Laisse vide si l'entraîneur est toujours en poste.",
    },
    { kind: "hidden", name: "coachId", label: "", defaultValue: coachId },
  ];
}
