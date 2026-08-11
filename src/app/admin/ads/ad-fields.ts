import type { Field } from "@/components/admin-form";

type AdBannerDefaults = {
  placement: "RAIL" | "INLINE";
  imageUrl?: string | null;
  linkUrl?: string | null;
  isActive?: boolean;
};

export function adBannerFields(defaults: AdBannerDefaults): Field[] {
  return [
    {
      kind: "hidden",
      name: "placement",
      label: "Emplacement",
      defaultValue: defaults.placement,
    },
    {
      kind: "image",
      name: "imageUrl",
      label: "Image",
      folder: "ads",
      defaultValue: defaults.imageUrl,
      hint:
        defaults.placement === "RAIL"
          ? "Format vertical recommandé, environ 160 × 600."
          : "Format bandeau recommandé, large et peu haut (environ 970 × 96).",
    },
    {
      kind: "url",
      name: "linkUrl",
      label: "Lien de destination (facultatif)",
      defaultValue: defaults.linkUrl ?? "",
      hint: "Où le visiteur arrive en cliquant sur l'image.",
    },
    {
      kind: "checkbox",
      name: "isActive",
      label: "Afficher cette publicité sur le site",
      defaultChecked: defaults.isActive ?? true,
    },
  ];
}
