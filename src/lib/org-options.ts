import { AGE_CATEGORIES } from "@/lib/categories";

type Translator = (key: string) => string;

/** Option lists for the delegated player form, translated in the member's locale. */
export function playerFormOptions(t: Translator) {
  const positions = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];
  const feet = ["RIGHT", "LEFT", "BOTH"];
  const squadLevels = ["FIRST_TEAM", "RESERVE", "YOUTH"];

  return {
    positions: positions.map((value) => ({
      value,
      label: t(`position.${value}`),
    })),
    feet: feet.map((value) => ({ value, label: t(`foot.${value}`) })),
    ageCategories: AGE_CATEGORIES.map((value) => ({
      value,
      label: t(`ageCategory.${value}`),
    })),
    squadLevels: squadLevels.map((value) => ({
      value,
      label: t(`squadLevel.${value}`),
    })),
  };
}

export function playerFormLabels(t: Translator) {
  return {
    name: t("org.fieldName"),
    nameAr: t("org.fieldNameAr"),
    nationality: t("player.nationality"),
    dateOfBirth: t("player.dateOfBirth"),
    position: t("player.position"),
    foot: t("player.foot"),
    ageCategory: t("player.category"),
    squadLevel: t("player.squadLevel"),
    squadLevelHint: t("org.squadLevelHint"),
    shirtNumber: t("player.shirtNumber"),
    height: t("player.height"),
    contractUntil: t("player.contractUntil"),
    photo: t("org.fieldPhoto"),
    photoHint: t("org.fieldPhotoHint"),
    valuationNote: t("org.valuationNote"),
    none: t("org.none"),
    submit: t("org.save"),
    cancel: t("common.back"),
    pending: t("common.loading"),
  };
}
