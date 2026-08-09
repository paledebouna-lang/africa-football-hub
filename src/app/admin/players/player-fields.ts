import type { Field, FieldOption } from "@/components/admin-form";

const POSITIONS: FieldOption[] = [
  { value: "GK", label: "Gardien" },
  { value: "CB", label: "Défenseur central" },
  { value: "LB", label: "Arrière gauche" },
  { value: "RB", label: "Arrière droit" },
  { value: "DM", label: "Milieu défensif" },
  { value: "CM", label: "Milieu central" },
  { value: "AM", label: "Milieu offensif" },
  { value: "LW", label: "Ailier gauche" },
  { value: "RW", label: "Ailier droit" },
  { value: "ST", label: "Attaquant" },
];

const FEET: FieldOption[] = [
  { value: "RIGHT", label: "Droit" },
  { value: "LEFT", label: "Gauche" },
  { value: "BOTH", label: "Les deux" },
];

const SQUAD_LEVELS: FieldOption[] = [
  { value: "FIRST_TEAM", label: "Équipe première" },
  { value: "RESERVE", label: "Équipe réserve" },
  { value: "YOUTH", label: "Équipe de jeunes" },
];

const AGE_CATEGORIES: FieldOption[] = [
  { value: "SENIOR", label: "Seniors" },
  { value: "U23", label: "Moins de 23 ans" },
  { value: "U20", label: "Moins de 20 ans" },
  { value: "U19", label: "Moins de 19 ans" },
  { value: "U17", label: "Moins de 17 ans" },
  { value: "U15", label: "Moins de 15 ans" },
];

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

type PlayerDefaults = {
  name?: string;
  nameAr?: string | null;
  dateOfBirth?: Date | null;
  position?: string | null;
  foot?: string | null;
  heightCm?: number | null;
  shirtNumber?: number | null;
  contractUntil?: Date | null;
  agent?: string | null;
  photoUrl?: string | null;
  clubId?: string | null;
  nationalityId?: string | null;
  ageCategory?: string;
  squadLevel?: string;
};

export function playerFields(
  clubs: FieldOption[],
  countries: FieldOption[],
  currentValueUsd: number | null,
  defaults: PlayerDefaults = {},
): Field[] {
  return [
    {
      kind: "text",
      name: "name",
      label: "Nom complet",
      required: true,
      defaultValue: defaults.name,
    },
    {
      kind: "text",
      name: "nameAr",
      label: "Nom en arabe",
      defaultValue: defaults.nameAr ?? "",
      hint: "Facultatif — utilisé sur la version arabe du site.",
    },
    {
      kind: "select",
      name: "clubId",
      label: "Club",
      placeholder: "Sans club",
      options: clubs,
      defaultValue: defaults.clubId ?? "",
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
      kind: "select",
      name: "ageCategory",
      label: "Catégorie",
      placeholder: "Seniors",
      options: AGE_CATEGORIES,
      defaultValue: defaults.ageCategory ?? "SENIOR",
      hint: "Détermine le groupe dans lequel le joueur apparaît sur la fiche du club.",
    },
    {
      kind: "select",
      name: "squadLevel",
      label: "Niveau d'équipe",
      placeholder: "Équipe première",
      options: SQUAD_LEVELS,
      defaultValue: defaults.squadLevel ?? "FIRST_TEAM",
      hint: "Indépendant de l'âge. C'est ce champ qui fixe la valeur de départ du joueur.",
    },
    {
      kind: "date",
      name: "dateOfBirth",
      label: "Date de naissance",
      defaultValue: toDateInput(defaults.dateOfBirth),
    },
    {
      kind: "select",
      name: "position",
      label: "Poste",
      placeholder: "Non renseigné",
      options: POSITIONS,
      defaultValue: defaults.position ?? "",
    },
    {
      kind: "select",
      name: "foot",
      label: "Pied fort",
      placeholder: "Non renseigné",
      options: FEET,
      defaultValue: defaults.foot ?? "",
    },
    {
      kind: "number",
      name: "heightCm",
      label: "Taille (cm)",
      defaultValue: defaults.heightCm ? String(defaults.heightCm) : "",
    },
    {
      kind: "number",
      name: "shirtNumber",
      label: "Numéro de maillot",
      defaultValue: defaults.shirtNumber ? String(defaults.shirtNumber) : "",
    },
    {
      kind: "date",
      name: "contractUntil",
      label: "Fin de contrat",
      defaultValue: toDateInput(defaults.contractUntil),
    },
    {
      kind: "text",
      name: "agent",
      label: "Agent",
      defaultValue: defaults.agent ?? "",
    },
    {
      kind: "image",
      name: "photoUrl",
      label: "Photo du joueur",
      folder: "players",
      defaultValue: defaults.photoUrl,
      rounded: true,
      hint: "Depuis ton téléphone ou ton ordinateur. L'image est réduite automatiquement.",
    },
    {
      kind: "number",
      name: "marketValueUsd",
      label: "Valeur marchande ($)",
      defaultValue: currentValueUsd === null ? "" : String(currentValueUsd),
      hint: "Laisse vide pour que la plateforme calcule la valeur automatiquement. Une valeur saisie ici prime sur le calcul.",
    },
  ];
}
