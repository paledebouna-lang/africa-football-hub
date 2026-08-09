import type { Field, FieldOption } from "@/components/admin-form";

type ClubDefaults = {
  id?: string;
  nameFr?: string;
  nameEn?: string;
  nameAr?: string;
  shortName?: string | null;
  type?: string;
  city?: string | null;
  stadium?: string | null;
  founded?: number | null;
  logoUrl?: string | null;
  teamPhotoUrl?: string | null;
  websiteUrl?: string | null;
  fifaCategory?: number | null;
  primaryCompetitionId?: string | null;
  parentClubId?: string | null;
};

const CLUB_TYPES: FieldOption[] = [
  { value: "CLUB", label: "Club" },
  { value: "ACADEMY", label: "Centre de formation" },
];

const FIFA_CATEGORIES: FieldOption[] = [
  { value: "1", label: "Catégorie I — plus gros investissements" },
  { value: "2", label: "Catégorie II" },
  { value: "3", label: "Catégorie III" },
  { value: "4", label: "Catégorie IV — niveau de base" },
];

export function clubFields(
  competitions: FieldOption[],
  clubs: FieldOption[],
  defaults: ClubDefaults = {},
): Field[] {
  return [
    { kind: "text", name: "nameFr", label: "Nom (français)", required: true, defaultValue: defaults.nameFr },
    { kind: "text", name: "nameEn", label: "Nom (anglais)", required: true, defaultValue: defaults.nameEn },
    { kind: "text", name: "nameAr", label: "Nom (arabe)", required: true, defaultValue: defaults.nameAr },
    {
      kind: "text",
      name: "shortName",
      label: "Nom court",
      defaultValue: defaults.shortName ?? "",
      hint: "Abréviation affichée dans les tableaux, ex. « Raja CA ».",
    },
    {
      kind: "select",
      name: "type",
      label: "Nature",
      placeholder: "Club",
      options: CLUB_TYPES,
      defaultValue: defaults.type ?? "CLUB",
    },
    {
      kind: "select",
      name: "primaryCompetitionId",
      label: "Championnat principal",
      placeholder: "Aucun",
      options: competitions,
      defaultValue: defaults.primaryCompetitionId ?? "",
      hint: "Laisse vide pour un centre de formation sans équipe senior.",
    },
    {
      kind: "select",
      name: "parentClubId",
      label: "Club parent",
      placeholder: "Aucun",
      options: clubs.filter((club) => club.value !== defaults.id),
      defaultValue: defaults.parentClubId ?? "",
      hint: "À renseigner pour un centre de formation rattaché à un club.",
    },
    { kind: "text", name: "city", label: "Ville", defaultValue: defaults.city ?? "" },
    { kind: "text", name: "stadium", label: "Stade", defaultValue: defaults.stadium ?? "" },
    {
      kind: "number",
      name: "founded",
      label: "Année de fondation",
      defaultValue: defaults.founded ? String(defaults.founded) : "",
    },
    {
      kind: "select",
      name: "fifaCategory",
      label: "Catégorie FIFA",
      placeholder: "Non classé",
      options: FIFA_CATEGORIES,
      defaultValue: defaults.fifaCategory ? String(defaults.fifaCategory) : "",
      hint: "Fixée par la fédération nationale. Sert au calcul de l'indemnité de formation.",
    },
    {
      kind: "image",
      name: "logoUrl",
      label: "Écusson du club",
      folder: "clubs",
      defaultValue: defaults.logoUrl,
      hint: "Depuis ton téléphone ou ton ordinateur. L'image est réduite automatiquement.",
    },
    {
      kind: "image",
      name: "teamPhotoUrl",
      label: "Photo d'équipe",
      folder: "clubs",
      defaultValue: defaults.teamPhotoUrl,
    },
    {
      kind: "url",
      name: "websiteUrl",
      label: "Site officiel",
      defaultValue: defaults.websiteUrl ?? "",
    },
  ];
}
