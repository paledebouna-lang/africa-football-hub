import type { Field, FieldOption } from "@/components/admin-form";

const TRANSFER_TYPES: FieldOption[] = [
  { value: "PERMANENT", label: "Transfert définitif" },
  { value: "LOAN", label: "Prêt" },
  { value: "LOAN_RETURN", label: "Retour de prêt" },
  { value: "FREE", label: "Transfert libre" },
  { value: "END_OF_CONTRACT", label: "Fin de contrat" },
  { value: "YOUTH_PROMOTION", label: "Promu du centre de formation" },
  { value: "RETIRED", label: "Fin de carrière" },
];

function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

type TransferDefaults = {
  playerId?: string;
  fromClubId?: string | null;
  toClubId?: string | null;
  seasonId?: string | null;
  date?: Date | null;
  type?: string;
  feeEur?: number | null;
  isFeeUndisclosed?: boolean;
};

export function transferFields(
  players: FieldOption[],
  clubs: FieldOption[],
  seasons: FieldOption[],
  defaults: TransferDefaults = {},
): Field[] {
  return [
    {
      kind: "select",
      name: "playerId",
      label: "Joueur",
      required: true,
      placeholder: "Choisir un joueur",
      options: players,
      defaultValue: defaults.playerId ?? "",
    },
    {
      kind: "date",
      name: "date",
      label: "Date du transfert",
      required: true,
      defaultValue: toDateInput(defaults.date),
    },
    {
      kind: "select",
      name: "fromClubId",
      label: "Club de départ",
      placeholder: "Aucun / inconnu",
      options: clubs,
      defaultValue: defaults.fromClubId ?? "",
    },
    {
      kind: "select",
      name: "toClubId",
      label: "Club d'arrivée",
      placeholder: "Aucun / sans club",
      options: clubs,
      defaultValue: defaults.toClubId ?? "",
      hint: "Le joueur sera automatiquement rattaché à ce club.",
    },
    {
      kind: "select",
      name: "type",
      label: "Type de transfert",
      required: true,
      placeholder: "Choisir un type",
      options: TRANSFER_TYPES,
      defaultValue: defaults.type ?? "PERMANENT",
    },
    {
      kind: "select",
      name: "seasonId",
      label: "Saison",
      placeholder: "Non renseignée",
      options: seasons,
      defaultValue: defaults.seasonId ?? "",
    },
    {
      kind: "number",
      name: "feeEur",
      label: "Montant (€)",
      defaultValue: defaults.feeEur === null || defaults.feeEur === undefined ? "" : String(defaults.feeEur),
      hint: "En euros, sans espaces ni symbole. Laisse vide pour un transfert gratuit.",
    },
    {
      kind: "checkbox",
      name: "isFeeUndisclosed",
      label: "Montant non communiqué",
      defaultChecked: defaults.isFeeUndisclosed ?? false,
    },
  ];
}
